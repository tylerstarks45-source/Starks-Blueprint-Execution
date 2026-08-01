import { Router } from "express";
import { requireAuthActive } from "../lib/auth";
import { db } from "@workspace/db";
import {
  systems,
  subsystems,
  feedbackLoops,
  propagationPaths,
  systemConstraints,
  leveragePoints,
  systemResilience,
  systemsRegistry,
  systemsSnapshots,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { usersTable } from "@workspace/db/schema";
import { runSystemsDynamicsRebuild } from "../lib/systems-dynamics/sdi-orchestrator";

export const systemsDynamicsRouter = Router();

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

// POST /api/systems-dynamics/systems/rebuild ───────────────────────────────
// Trigger a full systems dynamics rebuild. Admin only.
systemsDynamicsRouter.post("/systems/rebuild", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  runSystemsDynamicsRebuild("admin_manual").catch(() => {});
  res.status(202).json({ status: "accepted", message: "Systems dynamics rebuild started in background." });
});

// GET /api/systems-dynamics/systems ───────────────────────────────────────
// Top-level system records. Admin only. Optional ?systemKey=X or ?systemType=X
systemsDynamicsRouter.get("/systems", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rawKey  = req.query["systemKey"];
    const rawType = req.query["systemType"];
    const key  = typeof rawKey  === "string" ? rawKey  : null;
    const type = typeof rawType === "string" ? rawType : null;

    let rows;
    if (key) {
      rows = await db.select().from(systems).where(eq(systems.systemKey, key)).orderBy(desc(systems.capturedAt)).limit(10);
    } else if (type) {
      rows = await db.select().from(systems).where(eq(systems.systemType, type)).orderBy(desc(systems.capturedAt)).limit(50);
    } else {
      rows = await db.select().from(systems).orderBy(desc(systems.capturedAt)).limit(100);
    }
    res.json({ systems: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch system records" });
  }
});

// GET /api/systems-dynamics/subsystems ────────────────────────────────────
// Subsystem records. Admin only. Optional ?parentSystemKey=X or ?isBottleneck=true
systemsDynamicsRouter.get("/subsystems", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rawParent      = req.query["parentSystemKey"];
    const rawBottleneck  = req.query["isBottleneck"];
    const parent     = typeof rawParent     === "string" ? rawParent : null;
    const bottleneck = rawBottleneck === "true";

    let rows;
    if (parent) {
      rows = await db.select().from(subsystems).where(eq(subsystems.parentSystemKey, parent)).orderBy(desc(subsystems.capturedAt)).limit(50);
    } else if (rawBottleneck === "true") {
      rows = await db.select().from(subsystems).where(eq(subsystems.isBottleneck, true)).orderBy(desc(subsystems.capturedAt)).limit(50);
    } else {
      rows = await db.select().from(subsystems).orderBy(desc(subsystems.capturedAt)).limit(200);
    }
    res.json({ subsystems: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch subsystem records" });
  }
});

// GET /api/systems-dynamics/feedback-loops ────────────────────────────────
// Feedback loop records. Admin only. Optional ?systemKey=X or ?loopType=X or ?desirability=X
systemsDynamicsRouter.get("/feedback-loops", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rawKey   = req.query["systemKey"];
    const rawType  = req.query["loopType"];
    const rawDesir = req.query["desirability"];
    const key   = typeof rawKey   === "string" ? rawKey   : null;
    const type  = typeof rawType  === "string" ? rawType  : null;
    const desir = typeof rawDesir === "string" ? rawDesir : null;

    let rows;
    if (key) {
      rows = await db.select().from(feedbackLoops).where(eq(feedbackLoops.systemKey, key)).orderBy(desc(feedbackLoops.capturedAt)).limit(30);
    } else if (type) {
      rows = await db.select().from(feedbackLoops).where(eq(feedbackLoops.loopType, type)).orderBy(desc(feedbackLoops.capturedAt)).limit(50);
    } else if (desir) {
      rows = await db.select().from(feedbackLoops).where(eq(feedbackLoops.desirability, desir)).orderBy(desc(feedbackLoops.capturedAt)).limit(50);
    } else {
      rows = await db.select().from(feedbackLoops).orderBy(desc(feedbackLoops.capturedAt)).limit(100);
    }
    res.json({ feedbackLoops: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch feedback loop records" });
  }
});

// GET /api/systems-dynamics/propagation ───────────────────────────────────
// Propagation path records. Admin only. Optional ?sourceSystem=X or ?propagationType=X
systemsDynamicsRouter.get("/propagation", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rawSource = req.query["sourceSystem"];
    const rawType   = req.query["propagationType"];
    const source = typeof rawSource === "string" ? rawSource : null;
    const type   = typeof rawType   === "string" ? rawType   : null;

    let rows;
    if (source) {
      rows = await db.select().from(propagationPaths).where(eq(propagationPaths.sourceSystemKey, source)).orderBy(desc(propagationPaths.capturedAt)).limit(30);
    } else if (type) {
      rows = await db.select().from(propagationPaths).where(eq(propagationPaths.propagationType, type)).orderBy(desc(propagationPaths.capturedAt)).limit(50);
    } else {
      rows = await db.select().from(propagationPaths).orderBy(desc(propagationPaths.capturedAt)).limit(100);
    }
    res.json({ propagationPaths: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch propagation path records" });
  }
});

// GET /api/systems-dynamics/constraints ───────────────────────────────────
// Constraint records. Admin only. Optional ?systemKey=X or ?severity=X or ?constraintType=X
systemsDynamicsRouter.get("/constraints", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rawKey      = req.query["systemKey"];
    const rawSeverity = req.query["severity"];
    const rawType     = req.query["constraintType"];
    const key      = typeof rawKey      === "string" ? rawKey      : null;
    const severity = typeof rawSeverity === "string" ? rawSeverity : null;
    const ctype    = typeof rawType     === "string" ? rawType     : null;

    let rows;
    if (key) {
      rows = await db.select().from(systemConstraints).where(eq(systemConstraints.systemKey, key)).orderBy(desc(systemConstraints.capturedAt)).limit(20);
    } else if (severity) {
      rows = await db.select().from(systemConstraints).where(eq(systemConstraints.severity, severity)).orderBy(desc(systemConstraints.capturedAt)).limit(50);
    } else if (ctype) {
      rows = await db.select().from(systemConstraints).where(eq(systemConstraints.constraintType, ctype)).orderBy(desc(systemConstraints.capturedAt)).limit(50);
    } else {
      rows = await db.select().from(systemConstraints).orderBy(desc(systemConstraints.capturedAt)).limit(100);
    }
    res.json({ constraints: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch constraint records" });
  }
});

// GET /api/systems-dynamics/leverage ──────────────────────────────────────
// Leverage point records. Admin only. Optional ?systemKey=X or ?leverageType=X
systemsDynamicsRouter.get("/leverage", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rawKey  = req.query["systemKey"];
    const rawType = req.query["leverageType"];
    const key  = typeof rawKey  === "string" ? rawKey  : null;
    const type = typeof rawType === "string" ? rawType : null;

    let rows;
    if (key) {
      rows = await db.select().from(leveragePoints).where(eq(leveragePoints.systemKey, key)).orderBy(desc(leveragePoints.capturedAt)).limit(20);
    } else if (type) {
      rows = await db.select().from(leveragePoints).where(eq(leveragePoints.leverageType, type)).orderBy(desc(leveragePoints.capturedAt)).limit(50);
    } else {
      rows = await db.select().from(leveragePoints).orderBy(desc(leveragePoints.capturedAt)).limit(100);
    }
    res.json({ leveragePoints: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch leverage point records" });
  }
});

// GET /api/systems-dynamics/resilience ────────────────────────────────────
// Resilience records. Admin only. Optional ?systemKey=X or ?resilienceLevel=X
systemsDynamicsRouter.get("/resilience", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rawKey   = req.query["systemKey"];
    const rawLevel = req.query["resilienceLevel"];
    const key   = typeof rawKey   === "string" ? rawKey   : null;
    const level = typeof rawLevel === "string" ? rawLevel : null;

    let rows;
    if (key) {
      rows = await db.select().from(systemResilience).where(eq(systemResilience.systemKey, key)).orderBy(desc(systemResilience.capturedAt)).limit(10);
    } else if (level) {
      rows = await db.select().from(systemResilience).where(eq(systemResilience.resilienceLevel, level)).orderBy(desc(systemResilience.capturedAt)).limit(50);
    } else {
      rows = await db.select().from(systemResilience).orderBy(desc(systemResilience.capturedAt)).limit(100);
    }
    res.json({ resilience: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch resilience records" });
  }
});

// GET /api/systems-dynamics/registry ──────────────────────────────────────
// Systems registry (current state per system). Admin only.
systemsDynamicsRouter.get("/registry", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rows = await db.select().from(systemsRegistry)
      .orderBy(desc(systemsRegistry.overallSystemScore))
      .limit(50);
    res.json({ registry: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch systems registry" });
  }
});

// GET /api/systems-dynamics/snapshots ─────────────────────────────────────
// Historical platform snapshots. Admin only. Optional ?limit=N
systemsDynamicsRouter.get("/snapshots", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rawLimit = parseInt(String(req.query["limit"] ?? "10"), 10);
    const limit = isNaN(rawLimit) ? 10 : Math.min(rawLimit, 50);
    const rows = await db.select().from(systemsSnapshots)
      .orderBy(desc(systemsSnapshots.capturedAt))
      .limit(limit);
    res.json({ snapshots: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch systems snapshots" });
  }
});
