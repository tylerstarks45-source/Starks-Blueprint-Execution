import { Router } from "express";
import { requireAuthActive } from "../lib/auth";
import { db } from "@workspace/db";
import {
  priorityProfiles,
  priorityScores,
  priorityAttention,
  priorityEscalations,
  priorityHistory,
  priorityRegistry,
  prioritySnapshots,
  priorityRecommendations,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { usersTable } from "@workspace/db/schema";
import { evaluatePriority, runPriorityPlatformRebuild } from "../lib/priority-intelligence/epri-orchestrator";
import type { PriorityEvaluationRequest } from "../lib/priority-intelligence/types";

export const priorityIntelligenceRouter = Router();

// ── Admin check ────────────────────────────────────────────────────────────
async function isAdmin(userId: number): Promise<boolean> {
  try {
    const rows = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId));
    const role = rows[0]?.role ?? "";
    return role === "admin" || role === "FOUNDER_ADMIN" || role === "SUPER_ADMIN";
  } catch {
    return false;
  }
}

// POST /api/priority/evaluate ─────────────────────────────────────────────
// Evaluate a set of items and rank them by executive priority. Any user.
priorityIntelligenceRouter.post("/evaluate", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const { profileKey, title, description, domain, items } =
    req.body as Partial<PriorityEvaluationRequest>;

  if (!profileKey || !title || !description || !domain || !items) {
    res.status(400).json({
      error: "Missing required fields: profileKey, title, description, domain, items",
    });
    return;
  }

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "Must provide at least 1 item to evaluate priority." });
    return;
  }

  try {
    const result = await evaluatePriority({ profileKey, title, description, domain, items, userId });
    res.json({ success: true, result });
    return;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Priority evaluation failed", detail: msg });
    return;
  }
});

// POST /api/priority/recalculate ──────────────────────────────────────────
// Re-evaluate with updated constraints (same interface, different profileKey semantics).
// Returns a focused recalculation report. Any user.
priorityIntelligenceRouter.post("/recalculate", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const { profileKey, title, description, domain, items } =
    req.body as Partial<PriorityEvaluationRequest>;

  if (!profileKey || !title || !description || !domain || !items) {
    res.status(400).json({
      error: "Missing required fields: profileKey, title, description, domain, items",
    });
    return;
  }

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "Must provide at least 1 item to recalculate priority." });
    return;
  }

  try {
    const result = await evaluatePriority({ profileKey, title, description, domain, items, userId });
    // Return recalculation-focused response
    res.json({
      success:            true,
      profileKey:         result.profileKey,
      topPriorityKey:     result.topPriorityKey,
      topPriorityTitle:   result.topPriorityTitle,
      rankedItems:        result.rankedItems.map(s => ({
        rank:            s.rank,
        itemKey:         s.itemKey,
        itemTitle:       s.itemTitle,
        compositeScore:  s.compositeScore,
        escalationLevel: s.escalationLevel,
        isBlocked:       s.isBlocked,
        agingStatus:     s.agingStatus,
      })),
      blockedItems:       result.blockedItems,
      criticalEscalations:result.criticalEscalations,
      attention:          result.attention,
      recommendations:    result.recommendations,
      overallHealth:      result.overallHealth,
    });
    return;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Priority recalculation failed", detail: msg });
    return;
  }
});

// GET /api/priority ───────────────────────────────────────────────────────
// List priority profiles. Admin only.
priorityIntelligenceRouter.get("/", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  try {
    const domainFilter = typeof req.query.domain === "string" ? req.query.domain : undefined;
    const query = db
      .select()
      .from(priorityProfiles)
      .orderBy(desc(priorityProfiles.id))
      .limit(50);
    const rows = await query;
    const result = domainFilter ? rows.filter(r => r.domain === domainFilter) : rows;
    res.json({ success: true, profiles: result });
    return;
  } catch (err) {
    res.status(500).json({ error: "Failed to list priority profiles", detail: String(err) });
    return;
  }
});

// GET /api/priority/scores ────────────────────────────────────────────────
// List priority scores. Admin only. Optional ?profileId=N filter.
priorityIntelligenceRouter.get("/scores", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  try {
    const profileIdRaw = req.query.profileId;
    const profileId    = typeof profileIdRaw === "string" ? parseInt(profileIdRaw, 10) : NaN;

    const rows = isNaN(profileId)
      ? await db.select().from(priorityScores).orderBy(desc(priorityScores.id)).limit(100)
      : await db.select().from(priorityScores).where(eq(priorityScores.profileId, profileId)).orderBy(priorityScores.rank);

    res.json({ success: true, scores: rows });
    return;
  } catch (err) {
    res.status(500).json({ error: "Failed to list priority scores", detail: String(err) });
    return;
  }
});

// GET /api/priority/attention ─────────────────────────────────────────────
// List attention allocation records. Admin only.
priorityIntelligenceRouter.get("/attention", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  try {
    const profileIdRaw = req.query.profileId;
    const profileId    = typeof profileIdRaw === "string" ? parseInt(profileIdRaw, 10) : NaN;

    const rows = isNaN(profileId)
      ? await db.select().from(priorityAttention).orderBy(desc(priorityAttention.id)).limit(50)
      : await db.select().from(priorityAttention).where(eq(priorityAttention.profileId, profileId));

    res.json({ success: true, attention: rows });
    return;
  } catch (err) {
    res.status(500).json({ error: "Failed to list attention records", detail: String(err) });
    return;
  }
});

// GET /api/priority/escalations ────────────────────────────────────────────
// List escalation records. Admin only.
priorityIntelligenceRouter.get("/escalations", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  try {
    const profileIdRaw = req.query.profileId;
    const profileId    = typeof profileIdRaw === "string" ? parseInt(profileIdRaw, 10) : NaN;

    const rows = isNaN(profileId)
      ? await db.select().from(priorityEscalations).orderBy(desc(priorityEscalations.id)).limit(100)
      : await db.select().from(priorityEscalations).where(eq(priorityEscalations.profileId, profileId));

    res.json({ success: true, escalations: rows });
    return;
  } catch (err) {
    res.status(500).json({ error: "Failed to list escalations", detail: String(err) });
    return;
  }
});

// GET /api/priority/history ───────────────────────────────────────────────
// Immutable priority history. Admin only.
priorityIntelligenceRouter.get("/history", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  try {
    const profileKeyFilter = typeof req.query.profileKey === "string" ? req.query.profileKey : undefined;
    const rows = profileKeyFilter
      ? await db.select().from(priorityHistory).where(eq(priorityHistory.profileKey, profileKeyFilter)).orderBy(desc(priorityHistory.id))
      : await db.select().from(priorityHistory).orderBy(desc(priorityHistory.id)).limit(100);

    res.json({ success: true, history: rows });
    return;
  } catch (err) {
    res.status(500).json({ error: "Failed to list priority history", detail: String(err) });
    return;
  }
});

// GET /api/priority/recommendations ───────────────────────────────────────
// List priority recommendations. Admin only.
priorityIntelligenceRouter.get("/recommendations", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  try {
    const profileIdRaw = req.query.profileId;
    const profileId    = typeof profileIdRaw === "string" ? parseInt(profileIdRaw, 10) : NaN;

    const rows = isNaN(profileId)
      ? await db.select().from(priorityRecommendations).orderBy(desc(priorityRecommendations.id)).limit(100)
      : await db.select().from(priorityRecommendations).where(eq(priorityRecommendations.profileId, profileId));

    res.json({ success: true, recommendations: rows });
    return;
  } catch (err) {
    res.status(500).json({ error: "Failed to list priority recommendations", detail: String(err) });
    return;
  }
});

// GET /api/priority/registry ──────────────────────────────────────────────
// Authoritative current state — one row per profileKey. Admin only.
priorityIntelligenceRouter.get("/registry", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  try {
    const rows = await db.select().from(priorityRegistry).orderBy(desc(priorityRegistry.lastEvaluatedAt));
    res.json({ success: true, registry: rows });
    return;
  } catch (err) {
    res.status(500).json({ error: "Failed to list priority registry", detail: String(err) });
    return;
  }
});

// GET /api/priority/snapshots ─────────────────────────────────────────────
// Platform-level history snapshots. Admin only.
priorityIntelligenceRouter.get("/snapshots", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  try {
    const limitRaw = req.query.limit;
    const limit    = typeof limitRaw === "string" ? Math.min(50, parseInt(limitRaw, 10) || 20) : 20;
    const rows     = await db.select().from(prioritySnapshots).orderBy(desc(prioritySnapshots.id)).limit(limit);
    res.json({ success: true, snapshots: rows });
    return;
  } catch (err) {
    res.status(500).json({ error: "Failed to list priority snapshots", detail: String(err) });
    return;
  }
});
