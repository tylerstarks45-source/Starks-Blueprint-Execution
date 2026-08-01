import { Router } from "express";
import { requireAuthActive } from "../lib/auth";
import { db } from "@workspace/db";
import {
  tradeoffScenarios,
  decisionFrontiers,
  tradeoffMatrices,
  sensitivityAnalyses,
  executivePreferences,
  tradeoffRegistry,
  tradeoffSnapshots,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { usersTable } from "@workspace/db/schema";
import { evaluateTradeoff, runTradeoffPlatformRebuild } from "../lib/tradeoff-intelligence/eti-orchestrator";
import type { TradeoffEvaluationRequest } from "../lib/tradeoff-intelligence/types";

export const tradeoffIntelligenceRouter = Router();

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

// POST /api/tradeoffs/evaluate ─────────────────────────────────────────────
// Evaluate a trade-off scenario. Auth required (any user).
tradeoffIntelligenceRouter.post("/evaluate", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const { scenarioKey, title, description, decisionType, contextDomain, options, constraints, objectives } = req.body as Partial<TradeoffEvaluationRequest>;

  if (!scenarioKey || !title || !description || !decisionType || !contextDomain || !options || !constraints || !objectives) {
    res.status(400).json({ error: "Missing required fields: scenarioKey, title, description, decisionType, contextDomain, options, constraints, objectives" });
    return;
  }

  if (!Array.isArray(options) || options.length < 2) {
    res.status(400).json({ error: "Must provide at least 2 options to evaluate" });
    return;
  }

  if (!Array.isArray(objectives) || objectives.length < 1) {
    res.status(400).json({ error: "Must provide at least 1 objective" });
    return;
  }

  try {
    const result = await evaluateTradeoff({
      scenarioKey,
      title,
      description,
      decisionType,
      contextDomain,
      options,
      constraints: Array.isArray(constraints) ? constraints : [],
      objectives,
      userId,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Trade-off evaluation failed" });
  }
});

// POST /api/tradeoffs/compare ──────────────────────────────────────────────
// Direct head-to-head comparison of exactly 2 options. Auth required.
tradeoffIntelligenceRouter.post("/compare", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const { scenarioKey, title, description, decisionType, contextDomain, options, constraints, objectives } = req.body as Partial<TradeoffEvaluationRequest>;

  if (!scenarioKey || !title || !description || !decisionType || !contextDomain || !options || !objectives) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  if (!Array.isArray(options) || options.length !== 2) {
    res.status(400).json({ error: "Compare requires exactly 2 options" });
    return;
  }

  try {
    const result = await evaluateTradeoff({
      scenarioKey: `compare-${scenarioKey}`,
      title,
      description,
      decisionType,
      contextDomain,
      options,
      constraints: Array.isArray(constraints) ? constraints : [],
      objectives,
      userId,
    });

    // Return comparison-focused response
    const [a, b] = result.matrix.sort((x, y) => x.dominanceRank - y.dominanceRank);
    res.json({
      winner:       result.recommendation.recommendedOption,
      loser:        result.recommendation.rejectedOptions[0]?.key ?? null,
      explanation:  result.recommendation.tradeoffExplanation,
      whyWon:       result.recommendation.whyWon,
      whyLost:      result.recommendation.whyLost,
      sensitive:    result.recommendation.sensitivityFlag,
      confidence:   result.recommendation.confidenceScore,
      matrixA:      a,
      matrixB:      b,
      frontier:     result.frontier,
      sensitivities:result.sensitivities,
    });
  } catch (err) {
    res.status(500).json({ error: "Trade-off comparison failed" });
  }
});

// GET /api/tradeoffs/scenarios ─────────────────────────────────────────────
// List evaluated scenarios. Admin only. Optional ?decisionType=X
tradeoffIntelligenceRouter.get("/scenarios", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rawType = req.query["decisionType"];
    const type = typeof rawType === "string" ? rawType : null;

    const rows = type
      ? await db.select().from(tradeoffScenarios).where(eq(tradeoffScenarios.decisionType, type)).orderBy(desc(tradeoffScenarios.capturedAt)).limit(100)
      : await db.select().from(tradeoffScenarios).orderBy(desc(tradeoffScenarios.capturedAt)).limit(100);

    res.json({ scenarios: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch scenarios" });
  }
});

// GET /api/tradeoffs/frontiers ─────────────────────────────────────────────
// List decision frontiers. Admin only. Optional ?scenarioId=N
tradeoffIntelligenceRouter.get("/frontiers", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rawId = req.query["scenarioId"];
    const sid = typeof rawId === "string" ? parseInt(rawId, 10) : null;

    const rows = (sid && !isNaN(sid))
      ? await db.select().from(decisionFrontiers).where(eq(decisionFrontiers.scenarioId, sid)).orderBy(desc(decisionFrontiers.capturedAt)).limit(20)
      : await db.select().from(decisionFrontiers).orderBy(desc(decisionFrontiers.capturedAt)).limit(50);

    res.json({ frontiers: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch decision frontiers" });
  }
});

// GET /api/tradeoffs/matrices ──────────────────────────────────────────────
// List trade-off matrix rows. Admin only. Optional ?scenarioId=N
tradeoffIntelligenceRouter.get("/matrices", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rawId = req.query["scenarioId"];
    const sid = typeof rawId === "string" ? parseInt(rawId, 10) : null;

    const rows = (sid && !isNaN(sid))
      ? await db.select().from(tradeoffMatrices).where(eq(tradeoffMatrices.scenarioId, sid)).orderBy(tradeoffMatrices.dominanceRank).limit(20)
      : await db.select().from(tradeoffMatrices).orderBy(desc(tradeoffMatrices.capturedAt)).limit(100);

    res.json({ matrices: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch trade-off matrices" });
  }
});

// GET /api/tradeoffs/sensitivity ───────────────────────────────────────────
// List sensitivity analyses. Admin only. Optional ?scenarioId=N
tradeoffIntelligenceRouter.get("/sensitivity", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rawId = req.query["scenarioId"];
    const sid = typeof rawId === "string" ? parseInt(rawId, 10) : null;

    const rows = (sid && !isNaN(sid))
      ? await db.select().from(sensitivityAnalyses).where(eq(sensitivityAnalyses.scenarioId, sid)).orderBy(desc(sensitivityAnalyses.capturedAt)).limit(30)
      : await db.select().from(sensitivityAnalyses).orderBy(desc(sensitivityAnalyses.capturedAt)).limit(100);

    res.json({ sensitivities: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch sensitivity analyses" });
  }
});

// GET /api/tradeoffs/preferences ───────────────────────────────────────────
// Executive preference profiles. Admin only.
tradeoffIntelligenceRouter.get("/preferences", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rows = await db.select().from(executivePreferences)
      .orderBy(desc(executivePreferences.capturedAt))
      .limit(50);
    res.json({ preferences: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch executive preferences" });
  }
});

// GET /api/tradeoffs/registry ──────────────────────────────────────────────
// Trade-off registry (one row per scenario key). Admin only.
tradeoffIntelligenceRouter.get("/registry", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rows = await db.select().from(tradeoffRegistry)
      .orderBy(desc(tradeoffRegistry.lastEvaluatedAt))
      .limit(100);
    res.json({ registry: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch trade-off registry" });
  }
});

// GET /api/tradeoffs/snapshots ─────────────────────────────────────────────
// Historical platform snapshots. Admin only. Optional ?limit=N
tradeoffIntelligenceRouter.get("/snapshots", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rawLimit = parseInt(String(req.query["limit"] ?? "10"), 10);
    const limit = isNaN(rawLimit) ? 10 : Math.min(rawLimit, 50);
    const rows = await db.select().from(tradeoffSnapshots)
      .orderBy(desc(tradeoffSnapshots.capturedAt))
      .limit(limit);
    res.json({ snapshots: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch trade-off snapshots" });
  }
});
