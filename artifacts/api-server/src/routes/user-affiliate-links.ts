import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, and, sql, desc, count } from "drizzle-orm";
import { db, userAffiliateLinksTable, affiliateConversionsTable, systemActivityEventsTable, systemInstancesTable } from "@workspace/db";
import { requireAuthActive } from "../lib/auth";
import { z } from "zod";
import { randomBytes } from "crypto";

const router: IRouter = Router();

const CreateUserAffiliateLinkBody = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url("Must be a valid URL"),
  cloakedSlug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, hyphens").optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  systemInstanceId: z.number().int().positive().optional(),
});

const UpdateUserAffiliateLinkBody = z.object({
  name: z.string().min(1).max(200).optional(),
  url: z.string().url().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
  systemInstanceId: z.number().int().positive().nullable().optional(),
});

const ConversionBody = z.object({
  amount: z.coerce.number().min(0).optional(),
  currency: z.string().min(1).max(10).optional(),
  orderId: z.string().max(200).optional(),
});

// 1x1 transparent GIF — returned for GET image pixel requests
const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

async function handleConversion(
  req: import("express").Request,
  res: import("express").Response,
  linkId: number,
  isGet: boolean,
): Promise<void> {
  if (isNaN(linkId)) {
    if (isGet) { res.set("Content-Type", "image/gif").send(TRANSPARENT_GIF); return; }
    res.status(400).json({ error: "Invalid linkId" }); return;
  }

  // Parse from query params first (GET pixel / postback URLs), then body
  const rawData = {
    amount: req.query["amount"] ?? req.body?.amount,
    currency: req.query["currency"] ?? req.body?.currency,
    orderId: req.query["orderId"] ?? req.query["order_id"] ?? req.body?.orderId,
  };
  const parsed = ConversionBody.safeParse(rawData);
  if (!parsed.success) {
    if (isGet) { res.set("Content-Type", "image/gif").send(TRANSPARENT_GIF); return; }
    res.status(400).json({ error: parsed.error.message }); return;
  }

  const [link] = await db
    .select({
      id: userAffiliateLinksTable.id,
      userId: userAffiliateLinksTable.userId,
      systemInstanceId: userAffiliateLinksTable.systemInstanceId,
      isActive: userAffiliateLinksTable.isActive,
    })
    .from(userAffiliateLinksTable)
    .where(eq(userAffiliateLinksTable.id, linkId));

  if (!link || !link.isActive) {
    if (isGet) { res.set("Content-Type", "image/gif").send(TRANSPARENT_GIF); return; }
    res.status(404).json({ error: "Link not found" }); return;
  }

  const amountCents = Math.round((parsed.data.amount ?? 0) * 100);
  const currency = (parsed.data.currency ?? "usd").toLowerCase();
  const orderId = parsed.data.orderId ?? undefined;
  const referringUrl = (req.headers["referer"] || req.headers["referrer"] || null) as string | null;

  const [conversion] = await db.insert(affiliateConversionsTable).values({
    linkId: link.id,
    userId: link.userId,
    systemInstanceId: link.systemInstanceId ?? undefined,
    amountCents,
    currency,
    orderId,
    referringUrl: referringUrl ?? undefined,
  }).returning();

  // If linked to a system instance, log a revenue activity event
  if (link.systemInstanceId && amountCents > 0) {
    await db.insert(systemActivityEventsTable).values({
      systemInstanceId: link.systemInstanceId,
      eventType: "revenue",
      amountCents,
      description: `Affiliate conversion — ${currency.toUpperCase()} ${(amountCents / 100).toFixed(2)} via link #${link.id}${orderId ? ` (order ${orderId})` : ""}`,
      metadata: JSON.stringify({ conversionId: conversion.id, linkId: link.id, orderId, currency }),
    }).catch(() => {});
  }

  if (isGet) {
    res.set("Content-Type", "image/gif").send(TRANSPARENT_GIF);
    return;
  }
  res.status(201).json({ ok: true, conversionId: conversion.id });
}

// ── PUBLIC: GET /api/affiliate/:linkId/conversion (image pixel) ───────────────
router.get("/affiliate/:linkId/conversion", (req, res) => {
  const linkId = parseInt(String(req.params.linkId), 10);
  handleConversion(req, res, linkId, true).catch(() => {
    res.set("Content-Type", "image/gif").send(TRANSPARENT_GIF);
  });
});

// ── PUBLIC: POST /api/affiliate/:linkId/conversion (JSON / postback) ──────────
router.post("/affiliate/:linkId/conversion", (req, res) => {
  const linkId = parseInt(String(req.params.linkId), 10);
  handleConversion(req, res, linkId, false).catch((err: unknown) => {
    res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  });
});

// ── GET /api/user-affiliate-links ────────────────────────────────────────────
router.get("/user-affiliate-links", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const rows = await db.select().from(userAffiliateLinksTable)
    .where(eq(userAffiliateLinksTable.userId, userId))
    .orderBy(desc(userAffiliateLinksTable.createdAt));

  if (rows.length === 0) { res.json([]); return; }

  // Aggregate conversion stats for all links in one query
  const linkIds = rows.map(r => r.id);
  const convStats = await db
    .select({
      linkId: affiliateConversionsTable.linkId,
      conversions: count(affiliateConversionsTable.id),
      earnedCents: sql<number>`coalesce(sum(${affiliateConversionsTable.amountCents}), 0)`,
    })
    .from(affiliateConversionsTable)
    .where(sql`${affiliateConversionsTable.linkId} = any(array[${sql.join(linkIds.map(id => sql`${id}`), sql`, `)}])`)
    .groupBy(affiliateConversionsTable.linkId);

  const statsMap = new Map(convStats.map(s => [s.linkId, { conversions: Number(s.conversions), earnedCents: Number(s.earnedCents) }]));

  const serialized = serialize(rows);
  const result = (serialized as typeof rows).map((row) => ({
    ...row,
    conversionCount: statsMap.get(row.id)?.conversions ?? 0,
    earnedCents: statsMap.get(row.id)?.earnedCents ?? 0,
  }));

  res.json(result);
});

// ── POST /api/user-affiliate-links ───────────────────────────────────────────
router.post("/user-affiliate-links", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const parsed = CreateUserAffiliateLinkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Ownership check: systemInstanceId must belong to the authenticated user
  if (parsed.data.systemInstanceId) {
    const [sys] = await db.select({ id: systemInstancesTable.id })
      .from(systemInstancesTable)
      .where(and(eq(systemInstancesTable.id, parsed.data.systemInstanceId), eq(systemInstancesTable.userId, userId)));
    if (!sys) { res.status(403).json({ error: "System instance not found or access denied" }); return; }
  }

  const slug = parsed.data.cloakedSlug ?? randomBytes(5).toString("hex");
  const existing = await db.select({ id: userAffiliateLinksTable.id })
    .from(userAffiliateLinksTable).where(eq(userAffiliateLinksTable.cloakedSlug, slug));
  if (existing.length > 0) {
    res.status(409).json({ error: "That slug is already taken. Choose another." });
    return;
  }
  const [row] = await db.insert(userAffiliateLinksTable).values({
    userId,
    name: parsed.data.name,
    url: parsed.data.url,
    cloakedSlug: slug,
    description: parsed.data.description,
    category: parsed.data.category,
    systemInstanceId: parsed.data.systemInstanceId ?? undefined,
  }).returning();
  res.status(201).json(serialize(row));
});

// ── PATCH /api/user-affiliate-links/:id ──────────────────────────────────────
router.patch("/user-affiliate-links/:id", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const parsed = UpdateUserAffiliateLinkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Ownership check: systemInstanceId must belong to the authenticated user
  if (parsed.data.systemInstanceId) {
    const [sys] = await db.select({ id: systemInstancesTable.id })
      .from(systemInstancesTable)
      .where(and(eq(systemInstancesTable.id, parsed.data.systemInstanceId), eq(systemInstancesTable.userId, userId)));
    if (!sys) { res.status(403).json({ error: "System instance not found or access denied" }); return; }
  }

  const [row] = await db.update(userAffiliateLinksTable).set(parsed.data)
    .where(and(eq(userAffiliateLinksTable.id, id), eq(userAffiliateLinksTable.userId, userId)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Affiliate link not found" });
    return;
  }
  res.json(serialize(row));
});

// ── DELETE /api/user-affiliate-links/:id ─────────────────────────────────────
router.delete("/user-affiliate-links/:id", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [row] = await db.delete(userAffiliateLinksTable)
    .where(and(eq(userAffiliateLinksTable.id, id), eq(userAffiliateLinksTable.userId, userId)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Affiliate link not found" });
    return;
  }
  res.sendStatus(204);
});

// ── GET /api/user-affiliate-links/:id/conversions ────────────────────────────
router.get("/user-affiliate-links/:id/conversions", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);

  const [link] = await db.select({ id: userAffiliateLinksTable.id })
    .from(userAffiliateLinksTable)
    .where(and(eq(userAffiliateLinksTable.id, id), eq(userAffiliateLinksTable.userId, userId)));
  if (!link) { res.status(404).json({ error: "Affiliate link not found" }); return; }

  const rows = await db.select().from(affiliateConversionsTable)
    .where(eq(affiliateConversionsTable.linkId, id))
    .orderBy(desc(affiliateConversionsTable.createdAt))
    .limit(50);

  res.json(serialize(rows));
});

export default router;
