import { Router } from "express";
import { requireAuthActive } from "../lib/auth";
import { db } from "@workspace/db";
import {
  technologyRelationships,
  relationshipGraph,
  relationshipClusters,
  technologyEcosystems,
  dependencyGraph,
  conflictGraph,
  replacementGraph,
  relationshipRegistry,
  relationshipSnapshots,
} from "@workspace/db/schema";
import { eq, or } from "drizzle-orm";
import { usersTable } from "@workspace/db/schema";
import { runGraphRebuild } from "../lib/technology-relationships/tri-orchestrator";

export const technologyRelationshipsRouter = Router();

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

// POST /api/technology-relationships/relationships/rebuild ─────────────────
// Trigger a full relationship graph rebuild. Admin only.
technologyRelationshipsRouter.post("/relationships/rebuild", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  runGraphRebuild("admin_manual").catch(() => {});
  res.status(202).json({ status: "accepted", message: "Relationship graph rebuild started in background." });
});

// GET /api/technology-relationships/relationships ──────────────────────────
// All relationship edges. Admin only.
technologyRelationshipsRouter.get("/relationships", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rawType = req.query["type"];
    const type = typeof rawType === "string" ? rawType : null;
    const rows = type
      ? await db.select().from(technologyRelationships).where(eq(technologyRelationships.relationshipType, type)).limit(200)
      : await db.select().from(technologyRelationships).limit(200);
    res.json({ relationships: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch relationships" });
  }
});

// GET /api/technology-relationships/relationships/:technologyKey ───────────
// Relationships for a specific technology (outgoing + incoming). Admin only.
technologyRelationshipsRouter.get("/relationships/:technologyKey", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const key = req.params["technologyKey"];
    const rows = await db.select().from(technologyRelationships)
      .where(or(
        eq(technologyRelationships.sourceTechnologyKey, key),
        eq(technologyRelationships.targetTechnologyKey, key),
      ))
      .limit(100);
    res.json({ technologyKey: key, relationships: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch technology relationships" });
  }
});

// GET /api/technology-relationships/ecosystems ────────────────────────────
// Named ecosystems. Admin only.
technologyRelationshipsRouter.get("/ecosystems", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rows = await db.select().from(technologyEcosystems).limit(20);
    res.json({ ecosystems: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch ecosystems" });
  }
});

// GET /api/technology-relationships/clusters ──────────────────────────────
// Relationship clusters. Admin only.
technologyRelationshipsRouter.get("/clusters", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rows = await db.select().from(relationshipClusters).limit(50);
    res.json({ clusters: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch clusters" });
  }
});

// GET /api/technology-relationships/dependencies ──────────────────────────
// Dependency graph. Admin only. Optional ?dependentKey=X or ?dependencyType=hard
technologyRelationshipsRouter.get("/dependencies", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rawKey  = req.query["dependentKey"];
    const rawType = req.query["dependencyType"];
    const key  = typeof rawKey  === "string" ? rawKey  : null;
    const type = typeof rawType === "string" ? rawType : null;

    let rows;
    if (key) {
      rows = await db.select().from(dependencyGraph).where(eq(dependencyGraph.dependentKey, key)).limit(50);
    } else if (type) {
      rows = await db.select().from(dependencyGraph).where(eq(dependencyGraph.dependencyType, type)).limit(100);
    } else {
      rows = await db.select().from(dependencyGraph).limit(200);
    }
    res.json({ dependencies: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch dependency graph" });
  }
});

// GET /api/technology-relationships/conflicts ─────────────────────────────
// Conflict graph. Admin only. Optional ?activeOnly=true (default)
technologyRelationshipsRouter.get("/conflicts", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const includeInactive = req.query["includeInactive"] === "true";
    const rows = includeInactive
      ? await db.select().from(conflictGraph).limit(100)
      : await db.select().from(conflictGraph).where(eq(conflictGraph.isActive, true)).limit(100);
    res.json({ conflicts: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch conflict graph" });
  }
});

// GET /api/technology-relationships/replacements ──────────────────────────
// Replacement / migration paths. Admin only. Optional ?sourceTechnologyKey=X
technologyRelationshipsRouter.get("/replacements", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rawKey = req.query["sourceTechnologyKey"];
    const key = typeof rawKey === "string" ? rawKey : null;
    const rows = key
      ? await db.select().from(replacementGraph).where(eq(replacementGraph.sourceTechnologyKey, key)).limit(20)
      : await db.select().from(replacementGraph).limit(100);
    res.json({ replacements: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch replacement graph" });
  }
});

// GET /api/technology-relationships/synergies ─────────────────────────────
// Synergy data from relationship registry (highest scores). Admin only.
technologyRelationshipsRouter.get("/synergies", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rows = await db.select().from(relationshipRegistry)
      .limit(100);
    const sorted = rows
      .filter(r => r.synergyScore !== null)
      .sort((a, b) => (b.synergyScore ?? 0) - (a.synergyScore ?? 0))
      .slice(0, 50);
    res.json({ synergies: sorted, total: sorted.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch synergies" });
  }
});

// GET /api/technology-relationships/recommendations ───────────────────────
// Relationship-level recommendations. Derived inline from live graph state. Admin only.
technologyRelationshipsRouter.get("/recommendations", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    // Return conflict-based recommendations from live conflict graph
    const conflicts = await db.select().from(conflictGraph)
      .where(eq(conflictGraph.isActive, true))
      .limit(50);
    const highConflicts = conflicts.filter(c => c.severity === "critical" || c.severity === "high");
    const replacements  = await db.select().from(replacementGraph).limit(50);
    const topMigrations = replacements.filter(r => r.benefitScore >= 0.75).slice(0, 5);

    const recs = [
      ...highConflicts.map(c => ({
        type:      "conflict_resolution",
        priority:  c.severity,
        source:    c.technologyKeyA,
        target:    c.technologyKeyB,
        title:     `Resolve ${c.conflictType} conflict: ${c.technologyKeyA.split(":")[0]} ↔ ${c.technologyKeyB.split(":")[0]}`,
        evidence:  c.description,
        resolution:c.resolution ?? "Review conflict details and choose remediation path.",
      })),
      ...topMigrations.map(m => ({
        type:     "migration_opportunity",
        priority: m.benefitScore >= 0.85 ? "high" : "medium",
        source:   m.sourceTechnologyKey,
        target:   m.targetTechnologyKey,
        title:    `Migration opportunity: ${m.sourceTechnologyKey.split(":")[0]} → ${m.targetTechnologyKey.split(":")[0]}`,
        evidence: m.description ?? "High benefit migration path identified.",
        effort:   m.estimatedEffort ?? "unknown",
        benefitScore: m.benefitScore,
      })),
    ];

    res.json({ recommendations: recs, total: recs.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch recommendations" });
  }
});

// GET /api/technology-relationships/registry ──────────────────────────────
// Relationship registry (current state per technology). Admin only.
technologyRelationshipsRouter.get("/registry", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rows = await db.select().from(relationshipRegistry)
      .orderBy(relationshipRegistry.totalRelationships)
      .limit(200);
    res.json({ registry: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch relationship registry" });
  }
});

// GET /api/technology-relationships/snapshots ─────────────────────────────
// Historical graph snapshots. Admin only. Optional ?limit=N (default 10, max 50)
technologyRelationshipsRouter.get("/snapshots", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rawLimit = parseInt(String(req.query["limit"] ?? "10"), 10);
    const limit = isNaN(rawLimit) ? 10 : Math.min(rawLimit, 50);
    const rows = await db.select().from(relationshipSnapshots)
      .orderBy(relationshipSnapshots.capturedAt)
      .limit(limit);
    res.json({ snapshots: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch relationship snapshots" });
  }
});
