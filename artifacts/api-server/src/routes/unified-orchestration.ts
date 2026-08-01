import { Router } from "express";
import { requireAuthActive } from "../lib/auth";
import { db } from "@workspace/db";
import {
  cognitiveCycles,
  executionGraphs,
  orchestrationDependencies,
  executionWaves,
  executionDiagnostics,
  confidenceFlows,
  evidenceFlows,
  orchestrationRegistry,
  orchestrationSnapshots,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { usersTable } from "@workspace/db/schema";
import { runUnifiedCognitiveCycle } from "../lib/unified-orchestration/ucos-orchestrator";
import { getAllDependencyEdges } from "../lib/unified-orchestration/ucos-dependency-engine";
import { buildCycleSchedule } from "../lib/unified-orchestration/ucos-scheduler";

export const unifiedOrchestrationRouter = Router();

// ── Admin check ────────────────────────────────────────────────────────────
async function isAdmin(userId: number): Promise<boolean> {
  try {
    const rows = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId));
    const role = rows[0]?.role ?? "";
    return role === "admin" || role === "FOUNDER_ADMIN" || role === "SUPER_ADMIN";
  } catch { return false; }
}

// POST /api/orchestrator/run ───────────────────────────────────────────────
// Run a full unified cognitive cycle synchronously. Any authenticated user.
unifiedOrchestrationRouter.post("/run", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const cycleResult = await runUnifiedCognitiveCycle(userId);
    res.json({
      success:         true,
      cycleId:         cycleResult.cycleId,
      totalEngines:    cycleResult.totalEngines,
      wavesExecuted:   cycleResult.wavesExecuted,
      successCount:    cycleResult.successCount,
      failureCount:    cycleResult.failureCount,
      durationMs:      cycleResult.durationMs,
      confidenceScore: cycleResult.confidenceScore,
      evidenceItems:   cycleResult.evidenceItems,
      pipelineComplete:cycleResult.pipelineComplete,
    });
    return;
  } catch (err) {
    res.status(500).json({ error: "Unified cognitive cycle failed", detail: String(err) });
    return;
  }
});

// POST /api/orchestrator/replay ────────────────────────────────────────────
// Re-run the unified cycle (same as /run — idempotent by design). Any user.
unifiedOrchestrationRouter.post("/replay", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const cycleResult = await runUnifiedCognitiveCycle(userId);
    res.json({
      success:         true,
      replay:          true,
      cycleId:         cycleResult.cycleId,
      totalEngines:    cycleResult.totalEngines,
      wavesExecuted:   cycleResult.wavesExecuted,
      successCount:    cycleResult.successCount,
      failureCount:    cycleResult.failureCount,
      durationMs:      cycleResult.durationMs,
      confidenceScore: cycleResult.confidenceScore,
      pipelineComplete:cycleResult.pipelineComplete,
    });
    return;
  } catch (err) {
    res.status(500).json({ error: "Cognitive cycle replay failed", detail: String(err) });
    return;
  }
});

// GET /api/orchestrator/cycles ────────────────────────────────────────────
// List cognitive cycle records. Admin only.
unifiedOrchestrationRouter.get("/cycles", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Admin access required" }); return; }

  try {
    const limitRaw = req.query.limit;
    const limit    = typeof limitRaw === "string" ? Math.min(50, parseInt(limitRaw, 10) || 20) : 20;
    const rows     = await db.select().from(cognitiveCycles).orderBy(desc(cognitiveCycles.id)).limit(limit);
    res.json({ success: true, cycles: rows });
    return;
  } catch (err) {
    res.status(500).json({ error: "Failed to list cycles", detail: String(err) });
    return;
  }
});

// GET /api/orchestrator/graph ──────────────────────────────────────────────
// Engine execution graph for a given cycle. Admin only.
unifiedOrchestrationRouter.get("/graph", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Admin access required" }); return; }

  try {
    const cycleIdRaw = req.query.cycleId;
    const cycleId    = typeof cycleIdRaw === "string" ? parseInt(cycleIdRaw, 10) : NaN;
    const rows = isNaN(cycleId)
      ? await db.select().from(executionGraphs).orderBy(desc(executionGraphs.id)).limit(100)
      : await db.select().from(executionGraphs).where(eq(executionGraphs.cycleId, cycleId));
    res.json({ success: true, graph: rows });
    return;
  } catch (err) {
    res.status(500).json({ error: "Failed to list execution graph", detail: String(err) });
    return;
  }
});

// GET /api/orchestrator/dependencies ──────────────────────────────────────
// Static dependency edges between engines. Admin only.
unifiedOrchestrationRouter.get("/dependencies", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Admin access required" }); return; }

  try {
    // Prefer persisted rows; fall back to static computation
    const persisted = await db.select().from(orchestrationDependencies).orderBy(orchestrationDependencies.id);
    if (persisted.length > 0) {
      res.json({ success: true, dependencies: persisted });
      return;
    }
    // Return computed static edges
    const edges = getAllDependencyEdges();
    res.json({ success: true, dependencies: edges, source: "static" });
    return;
  } catch (err) {
    res.status(500).json({ error: "Failed to list dependencies", detail: String(err) });
    return;
  }
});

// GET /api/orchestrator/waves ──────────────────────────────────────────────
// Execution wave records. Admin only.
unifiedOrchestrationRouter.get("/waves", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Admin access required" }); return; }

  try {
    const cycleIdRaw = req.query.cycleId;
    const cycleId    = typeof cycleIdRaw === "string" ? parseInt(cycleIdRaw, 10) : NaN;
    if (isNaN(cycleId)) {
      // Return the static schedule when no cycleId supplied
      const schedule = buildCycleSchedule();
      res.json({ success: true, schedule, source: "static" });
      return;
    }
    const rows = await db.select().from(executionWaves).where(eq(executionWaves.cycleId, cycleId)).orderBy(executionWaves.waveNumber);
    res.json({ success: true, waves: rows });
    return;
  } catch (err) {
    res.status(500).json({ error: "Failed to list waves", detail: String(err) });
    return;
  }
});

// GET /api/orchestrator/diagnostics ───────────────────────────────────────
// Per-engine diagnostics. Admin only.
unifiedOrchestrationRouter.get("/diagnostics", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Admin access required" }); return; }

  try {
    const cycleIdRaw = req.query.cycleId;
    const cycleId    = typeof cycleIdRaw === "string" ? parseInt(cycleIdRaw, 10) : NaN;
    const rows = isNaN(cycleId)
      ? await db.select().from(executionDiagnostics).orderBy(desc(executionDiagnostics.id)).limit(100)
      : await db.select().from(executionDiagnostics).where(eq(executionDiagnostics.cycleId, cycleId));
    res.json({ success: true, diagnostics: rows });
    return;
  } catch (err) {
    res.status(500).json({ error: "Failed to list diagnostics", detail: String(err) });
    return;
  }
});

// GET /api/orchestrator/confidence ────────────────────────────────────────
// Confidence flow records. Admin only.
unifiedOrchestrationRouter.get("/confidence", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Admin access required" }); return; }

  try {
    const cycleIdRaw = req.query.cycleId;
    const cycleId    = typeof cycleIdRaw === "string" ? parseInt(cycleIdRaw, 10) : NaN;
    const rows = isNaN(cycleId)
      ? await db.select().from(confidenceFlows).orderBy(desc(confidenceFlows.id)).limit(100)
      : await db.select().from(confidenceFlows).where(eq(confidenceFlows.cycleId, cycleId));
    res.json({ success: true, confidenceFlows: rows });
    return;
  } catch (err) {
    res.status(500).json({ error: "Failed to list confidence flows", detail: String(err) });
    return;
  }
});

// GET /api/orchestrator/evidence ──────────────────────────────────────────
// Evidence flow records. Admin only.
unifiedOrchestrationRouter.get("/evidence", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Admin access required" }); return; }

  try {
    const cycleIdRaw = req.query.cycleId;
    const cycleId    = typeof cycleIdRaw === "string" ? parseInt(cycleIdRaw, 10) : NaN;
    const rows = isNaN(cycleId)
      ? await db.select().from(evidenceFlows).orderBy(desc(evidenceFlows.id)).limit(100)
      : await db.select().from(evidenceFlows).where(eq(evidenceFlows.cycleId, cycleId));
    res.json({ success: true, evidenceFlows: rows });
    return;
  } catch (err) {
    res.status(500).json({ error: "Failed to list evidence flows", detail: String(err) });
    return;
  }
});

// GET /api/orchestrator/registry ──────────────────────────────────────────
// Registered engines (authoritative). Admin only.
unifiedOrchestrationRouter.get("/registry", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Admin access required" }); return; }

  try {
    const rows = await db.select().from(orchestrationRegistry).orderBy(orchestrationRegistry.waveNumber);
    res.json({ success: true, registry: rows, totalEngines: rows.length });
    return;
  } catch (err) {
    res.status(500).json({ error: "Failed to list registry", detail: String(err) });
    return;
  }
});
