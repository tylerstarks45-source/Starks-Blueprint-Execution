import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, and, sql, desc } from "drizzle-orm";
import { db, userAffiliateLinksTable } from "@workspace/db";
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
});

const UpdateUserAffiliateLinkBody = z.object({
  name: z.string().min(1).max(200).optional(),
  url: z.string().url().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
});

// ── GET /api/user-affiliate-links ────────────────────────────────────────────
router.get("/user-affiliate-links", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const rows = await db.select().from(userAffiliateLinksTable)
    .where(eq(userAffiliateLinksTable.userId, userId))
    .orderBy(desc(userAffiliateLinksTable.createdAt));
  res.json(serialize(rows));
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

export default router;
