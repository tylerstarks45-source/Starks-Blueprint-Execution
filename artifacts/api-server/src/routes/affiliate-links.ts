import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, sql } from "drizzle-orm";
import { db, affiliateLinksTable } from "@workspace/db";
import { requireAdmin } from "../lib/auth";
import {
  ListAffiliateLinksResponse,
  UpdateAffiliateLinkResponse,
  TrackAffiliateLinkClickResponse,
  CreateAffiliateLinkBody,
  UpdateAffiliateLinkBody,
  UpdateAffiliateLinkParams,
  DeleteAffiliateLinkParams,
  TrackAffiliateLinkClickParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ── GET /api/affiliate-links ────────────────────────────────────────────────
// Public read — affiliate links are embedded in marketplace pages visible to all.
router.get("/affiliate-links", async (req, res): Promise<void> => {
  const rows = req.query.toolId
    ? await db.select().from(affiliateLinksTable).where(eq(affiliateLinksTable.toolId, Number(req.query.toolId))).orderBy(affiliateLinksTable.id)
    : await db.select().from(affiliateLinksTable).orderBy(affiliateLinksTable.id);
  res.json(ListAffiliateLinksResponse.parse(serialize(rows)));
});

// ── POST /api/affiliate-links — ADMIN ONLY ─────────────────────────────────
router.post("/affiliate-links", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const parsed = CreateAffiliateLinkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(affiliateLinksTable).values(parsed.data).returning();
  res.status(201).json(UpdateAffiliateLinkResponse.parse(serialize(row)));
});

// ── PATCH /api/affiliate-links/:id — ADMIN ONLY ────────────────────────────
router.patch("/affiliate-links/:id", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const params = UpdateAffiliateLinkParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateAffiliateLinkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.update(affiliateLinksTable).set(parsed.data).where(eq(affiliateLinksTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Affiliate link not found" });
    return;
  }
  res.json(UpdateAffiliateLinkResponse.parse(serialize(row)));
});

// ── DELETE /api/affiliate-links/:id — ADMIN ONLY ───────────────────────────
router.delete("/affiliate-links/:id", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const params = DeleteAffiliateLinkParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(affiliateLinksTable).where(eq(affiliateLinksTable.id, params.data.id));
  res.sendStatus(204);
});

// ── POST /api/affiliate-links/:id/click ────────────────────────────────────
// Public: click tracking is unauthenticated by design — it's an atomic counter
// increment triggered by user navigation, not a data mutation requiring auth.
router.post("/affiliate-links/:id/click", async (req, res): Promise<void> => {
  const params = TrackAffiliateLinkClickParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .update(affiliateLinksTable)
    .set({ clickCount: sql`${affiliateLinksTable.clickCount} + 1` })
    .where(eq(affiliateLinksTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Affiliate link not found" });
    return;
  }
  res.json(TrackAffiliateLinkClickResponse.parse(serialize(row)));
});

export default router;
