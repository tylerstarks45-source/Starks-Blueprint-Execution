// ─── Build 020: Executive Strategy REST Routes ────────────────────────────────

import { strategicPillarsTable } from "@workspace/db";
import { requireBusinessOwner, businessIdParam, businessIdOfRecord, requireSelfParam } from "../lib/route-ownership";
import { Router } from "express";
import { requireAuthActive } from "../lib/auth";
import {
  runStrategyEngine,
  fetchStrategySummaryForEB,
} from "../lib/executive-strategy/strategy-orchestrator";
import {
  getLatestStrategyReport,
  getStrategyByReport,
  getStrategyPillars,
  getPillarObjectives,
  getStrategyDependencies,
  getStrategyConstraints,
  getStrategyRegistry,
  listStrategyReports,
} from "../lib/executive-strategy/strategy-registry";

const router = Router();

// Tenant isolation: every business-scoped route is limited to the caller's own businesses.
router.param("businessId", (req, res, next) => requireBusinessOwner(businessIdParam("businessId"))(req, res, next));
router.use("/pillars/:businessId/:pillarId", requireBusinessOwner(businessIdOfRecord(strategicPillarsTable, "pillarId")));

// ── POST /strategise/:businessId — Full strategy run ──────────────────────

router.post("/strategise/:businessId", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const businessId = parseInt(req.params.businessId ?? "", 10);
  if (isNaN(businessId)) {
    res.status(400).json({ error: "Invalid businessId" });
    return;
  }

  try {
    const report = await runStrategyEngine(businessId, userId);
    const s = report.strategy;
    res.status(200).json({
      success: true,
      reportId: report.id,
      strategyName: s.strategyName,
      scenarioType: s.scenarioType,
      pillarCount: s.pillars.length,
      objectiveCount: s.pillars.reduce((sum, p) => sum + p.objectives.length, 0),
      overallConfidence: report.overallConfidence,
      overallAlignmentScore: report.overallAlignmentScore,
      businessValueScore: report.businessValueScore,
      executiveSummary: report.executiveSummary,
      durationMs: report.strategyDurationMs,
    });
  } catch (err: any) {
    const status = err.statusCode ?? 500;
    res.status(status).json({ error: err.message ?? "Strategy run failed" });
    return;
  }
});

// ── GET /reports/:businessId — List all strategy reports ──────────────────

router.get("/reports/:businessId", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const businessId = parseInt(req.params.businessId ?? "", 10);
  if (isNaN(businessId)) {
    res.status(400).json({ error: "Invalid businessId" });
    return;
  }

  try {
    const reports = await listStrategyReports(businessId);
    res.status(200).json({ reports });
  } catch {
    res.status(500).json({ error: "Failed to list strategy reports" });
    return;
  }
});

// ── GET /reports/:businessId/latest — Latest report + strategy detail ─────

router.get("/reports/:businessId/latest", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const businessId = parseInt(req.params.businessId ?? "", 10);
  if (isNaN(businessId)) {
    res.status(400).json({ error: "Invalid businessId" });
    return;
  }

  try {
    const report = await getLatestStrategyReport(businessId);
    if (!report) {
      res.status(404).json({ error: "No strategy report found. Run /strategise first." });
      return;
    }
    const strategy = await getStrategyByReport(report.id);
    res.status(200).json({ report, strategy });
  } catch {
    res.status(500).json({ error: "Failed to fetch latest strategy report" });
    return;
  }
});

// ── GET /pillars/:businessId — Pillars for latest strategy ────────────────

router.get("/pillars/:businessId", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const businessId = parseInt(req.params.businessId ?? "", 10);
  if (isNaN(businessId)) {
    res.status(400).json({ error: "Invalid businessId" });
    return;
  }

  try {
    const report = await getLatestStrategyReport(businessId);
    if (!report?.primaryStrategyId) {
      res.status(404).json({ error: "No strategy found." });
      return;
    }
    const pillars = await getStrategyPillars(report.primaryStrategyId);
    res.status(200).json({ pillars });
  } catch {
    res.status(500).json({ error: "Failed to fetch pillars" });
    return;
  }
});

// ── GET /pillars/:businessId/:pillarId/objectives ─────────────────────────

router.get("/pillars/:businessId/:pillarId/objectives", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const { pillarId } = req.params;
  if (!pillarId) {
    res.status(400).json({ error: "Invalid pillarId" });
    return;
  }

  try {
    const objectives = await getPillarObjectives(pillarId);
    res.status(200).json({ objectives });
  } catch {
    res.status(500).json({ error: "Failed to fetch objectives" });
    return;
  }
});

// ── GET /dependencies/:businessId ─────────────────────────────────────────

router.get("/dependencies/:businessId", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const businessId = parseInt(req.params.businessId ?? "", 10);
  if (isNaN(businessId)) {
    res.status(400).json({ error: "Invalid businessId" });
    return;
  }

  try {
    const report = await getLatestStrategyReport(businessId);
    if (!report?.primaryStrategyId) {
      res.status(404).json({ error: "No strategy found." });
      return;
    }
    const dependencies = await getStrategyDependencies(report.primaryStrategyId);
    res.status(200).json({ dependencies });
  } catch {
    res.status(500).json({ error: "Failed to fetch dependencies" });
    return;
  }
});

// ── GET /constraints/:businessId ──────────────────────────────────────────

router.get("/constraints/:businessId", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const businessId = parseInt(req.params.businessId ?? "", 10);
  if (isNaN(businessId)) {
    res.status(400).json({ error: "Invalid businessId" });
    return;
  }

  try {
    const report = await getLatestStrategyReport(businessId);
    if (!report?.primaryStrategyId) {
      res.status(404).json({ error: "No strategy found." });
      return;
    }
    const constraints = await getStrategyConstraints(report.primaryStrategyId);
    res.status(200).json({ constraints });
  } catch {
    res.status(500).json({ error: "Failed to fetch constraints" });
    return;
  }
});

// ── GET /registry/:businessId ─────────────────────────────────────────────

router.get("/registry/:businessId", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const businessId = parseInt(req.params.businessId ?? "", 10);
  if (isNaN(businessId)) {
    res.status(400).json({ error: "Invalid businessId" });
    return;
  }

  try {
    const registry = await getStrategyRegistry(businessId);
    if (!registry) {
      res.status(404).json({ error: "No strategy registry entry found." });
      return;
    }
    res.status(200).json({ registry });
  } catch {
    res.status(500).json({ error: "Failed to fetch registry" });
    return;
  }
});

// ── GET /summary/:businessId — EB-ready compact summary ───────────────────

router.get("/summary/:businessId", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const businessId = parseInt(req.params.businessId ?? "", 10);
  if (isNaN(businessId)) {
    res.status(400).json({ error: "Invalid businessId" });
    return;
  }

  try {
    const summary = await fetchStrategySummaryForEB(businessId);
    if (!summary) {
      res.status(404).json({ error: "No strategy summary available. Run /strategise first." });
      return;
    }
    res.status(200).json({ summary });
  } catch {
    res.status(500).json({ error: "Failed to fetch strategy summary" });
    return;
  }
});

export default router;
