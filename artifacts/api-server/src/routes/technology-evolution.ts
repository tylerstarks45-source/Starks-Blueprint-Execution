import { Router } from "express";
import { requireAuthActive } from "../lib/auth";
import { db } from "@workspace/db";
import {
  technologyLifecycle,
  technologyTrends,
  technologyVelocity,
  technologyAdoption,
  technologyOutlook,
  technologyEvolutionRegistry,
  technologyEvolutionSnapshots,
  technologyRecommendationsHistory,
  technologyChangeEvents,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { usersTable } from "@workspace/db/schema";
import { runEvolutionRebuild } from "../lib/technology-evolution/tei-orchestrator";

export const technologyEvolutionRouter = Router();

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

// POST /api/technology-evolution/evolution/rebuild ─────────────────────────
// Trigger a full evolution rebuild. Admin only.
technologyEvolutionRouter.post("/evolution/rebuild", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  runEvolutionRebuild("admin_manual").catch(() => {});
  res.status(202).json({ status: "accepted", message: "Technology evolution rebuild started in background." });
});

// GET /api/technology-evolution/lifecycle ─────────────────────────────────
// Lifecycle records. Admin only. Optional ?technologyKey=X or ?stage=X
technologyEvolutionRouter.get("/lifecycle", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rawKey   = req.query["technologyKey"];
    const rawStage = req.query["stage"];
    const key   = typeof rawKey   === "string" ? rawKey   : null;
    const stage = typeof rawStage === "string" ? rawStage : null;

    let rows;
    if (key) {
      rows = await db.select().from(technologyLifecycle).where(eq(technologyLifecycle.technologyKey, key)).limit(10);
    } else if (stage) {
      rows = await db.select().from(technologyLifecycle).where(eq(technologyLifecycle.lifecycleStage, stage)).limit(100);
    } else {
      rows = await db.select().from(technologyLifecycle).limit(200);
    }
    res.json({ lifecycle: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch lifecycle records" });
  }
});

// GET /api/technology-evolution/trends ────────────────────────────────────
// Trend records. Admin only. Optional ?technologyKey=X or ?direction=X
technologyEvolutionRouter.get("/trends", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rawKey = req.query["technologyKey"];
    const rawDir = req.query["direction"];
    const key = typeof rawKey === "string" ? rawKey : null;
    const dir = typeof rawDir === "string" ? rawDir : null;

    let rows;
    if (key) {
      rows = await db.select().from(technologyTrends).where(eq(technologyTrends.technologyKey, key)).orderBy(desc(technologyTrends.capturedAt)).limit(10);
    } else if (dir) {
      rows = await db.select().from(technologyTrends).where(eq(technologyTrends.trendDirection, dir)).orderBy(desc(technologyTrends.capturedAt)).limit(100);
    } else {
      rows = await db.select().from(technologyTrends).orderBy(desc(technologyTrends.capturedAt)).limit(200);
    }
    res.json({ trends: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch trend records" });
  }
});

// GET /api/technology-evolution/velocity ──────────────────────────────────
// Velocity records. Admin only. Optional ?technologyKey=X
technologyEvolutionRouter.get("/velocity", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rawKey = req.query["technologyKey"];
    const key = typeof rawKey === "string" ? rawKey : null;
    const rows = key
      ? await db.select().from(technologyVelocity).where(eq(technologyVelocity.technologyKey, key)).orderBy(desc(technologyVelocity.capturedAt)).limit(10)
      : await db.select().from(technologyVelocity).orderBy(desc(technologyVelocity.capturedAt)).limit(200);
    res.json({ velocity: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch velocity records" });
  }
});

// GET /api/technology-evolution/adoption ──────────────────────────────────
// Adoption records. Admin only. Optional ?technologyKey=X or ?stage=X
technologyEvolutionRouter.get("/adoption", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rawKey   = req.query["technologyKey"];
    const rawStage = req.query["stage"];
    const key   = typeof rawKey   === "string" ? rawKey   : null;
    const stage = typeof rawStage === "string" ? rawStage : null;

    let rows;
    if (key) {
      rows = await db.select().from(technologyAdoption).where(eq(technologyAdoption.technologyKey, key)).orderBy(desc(technologyAdoption.capturedAt)).limit(10);
    } else if (stage) {
      rows = await db.select().from(technologyAdoption).where(eq(technologyAdoption.adoptionStage, stage)).orderBy(desc(technologyAdoption.capturedAt)).limit(100);
    } else {
      rows = await db.select().from(technologyAdoption).orderBy(desc(technologyAdoption.capturedAt)).limit(200);
    }
    res.json({ adoption: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch adoption records" });
  }
});

// GET /api/technology-evolution/outlook ───────────────────────────────────
// Outlook records. Admin only. Optional ?technologyKey=X or ?urgency=X
technologyEvolutionRouter.get("/outlook", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rawKey     = req.query["technologyKey"];
    const rawUrgency = req.query["urgency"];
    const key     = typeof rawKey     === "string" ? rawKey     : null;
    const urgency = typeof rawUrgency === "string" ? rawUrgency : null;

    let rows;
    if (key) {
      rows = await db.select().from(technologyOutlook).where(eq(technologyOutlook.technologyKey, key)).orderBy(desc(technologyOutlook.capturedAt)).limit(10);
    } else if (urgency) {
      rows = await db.select().from(technologyOutlook).where(eq(technologyOutlook.upgradeUrgency, urgency)).orderBy(desc(technologyOutlook.capturedAt)).limit(50);
    } else {
      rows = await db.select().from(technologyOutlook).orderBy(desc(technologyOutlook.capturedAt)).limit(200);
    }
    res.json({ outlook: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch outlook records" });
  }
});

// GET /api/technology-evolution/recommendations ───────────────────────────
// Evolution recommendations history. Admin only. Optional ?technologyKey=X
technologyEvolutionRouter.get("/recommendations", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rawKey = req.query["technologyKey"];
    const key = typeof rawKey === "string" ? rawKey : null;
    const rows = key
      ? await db.select().from(technologyRecommendationsHistory)
          .where(eq(technologyRecommendationsHistory.technologyKey, key))
          .orderBy(desc(technologyRecommendationsHistory.createdAt))
          .limit(20)
      : await db.select().from(technologyRecommendationsHistory)
          .where(eq(technologyRecommendationsHistory.isActive, true))
          .orderBy(desc(technologyRecommendationsHistory.createdAt))
          .limit(50);
    res.json({ recommendations: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch evolution recommendations" });
  }
});

// GET /api/technology-evolution/registry ──────────────────────────────────
// Evolution registry (current state per technology). Admin only.
technologyEvolutionRouter.get("/registry", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rows = await db.select().from(technologyEvolutionRegistry)
      .orderBy(desc(technologyEvolutionRegistry.overallEvolutionScore))
      .limit(200);
    res.json({ registry: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch evolution registry" });
  }
});

// GET /api/technology-evolution/snapshots ─────────────────────────────────
// Historical evolution snapshots. Admin only. Optional ?limit=N
technologyEvolutionRouter.get("/snapshots", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rawLimit = parseInt(String(req.query["limit"] ?? "10"), 10);
    const limit = isNaN(rawLimit) ? 10 : Math.min(rawLimit, 50);
    const rows = await db.select().from(technologyEvolutionSnapshots)
      .orderBy(desc(technologyEvolutionSnapshots.capturedAt))
      .limit(limit);
    res.json({ snapshots: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch evolution snapshots" });
  }
});

// GET /api/technology-evolution/changes ───────────────────────────────────
// Change event log. Admin only. Optional ?technologyKey=X or ?eventType=X
technologyEvolutionRouter.get("/changes", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rawKey  = req.query["technologyKey"];
    const rawType = req.query["eventType"];
    const key  = typeof rawKey  === "string" ? rawKey  : null;
    const type = typeof rawType === "string" ? rawType : null;

    let rows;
    if (key) {
      rows = await db.select().from(technologyChangeEvents)
        .where(eq(technologyChangeEvents.technologyKey, key))
        .orderBy(desc(technologyChangeEvents.detectedAt))
        .limit(50);
    } else if (type) {
      rows = await db.select().from(technologyChangeEvents)
        .where(eq(technologyChangeEvents.eventType, type))
        .orderBy(desc(technologyChangeEvents.detectedAt))
        .limit(100);
    } else {
      rows = await db.select().from(technologyChangeEvents)
        .orderBy(desc(technologyChangeEvents.detectedAt))
        .limit(200);
    }
    res.json({ changes: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch change events" });
  }
});
