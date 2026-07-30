// ─── Future State Simulation Routes (Build 018) ───────────────────────────────
//
// REST API for the Future State Simulation Engine.
// Reports and scenarios are immutable after POST /simulate.

import { Router } from "express";
import { requireAuthActive } from "../lib/auth";
import {
  listScenarios, listSimulationReports, getLatestSimulationReport,
  getScenarioById, getSimulationRegistry, listSimulationSnapshots,
} from "../lib/future-simulation/simulation-registry";
import {
  runFutureSimulation, fetchSimulationSummaryForEB,
} from "../lib/future-simulation/simulation-orchestrator";
import { getBusiness } from "../lib/business-graph/business-registry";

const router = Router();

// ── POST /api/future-simulation/businesses/:id/simulate ──────────────────────
// Run a full simulation for a business.

router.post("/businesses/:id/simulate", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const businessId = parseInt(req.params.id!);
    const business = await getBusiness(businessId);
    if (!business || business.ownerId !== userId) {
      res.status(404).json({ error: "Business not found" });
      return;
    }
    const report = await runFutureSimulation(businessId, userId);
    if (!report) {
      res.status(422).json({ error: "Simulation failed — run opportunity discovery first" });
      return;
    }
    res.status(201).json({ report });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Simulation failed" });
  }
});

// ── GET /api/future-simulation/businesses/:id/reports ────────────────────────

router.get("/businesses/:id/reports", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const limit = parseInt((req.query.limit as string) ?? "10");
    const reports = await listSimulationReports(parseInt(req.params.id!), limit);
    res.json({ reports });
  } catch (err) {
    res.status(500).json({ error: "Failed to list reports" });
  }
});

// ── GET /api/future-simulation/businesses/:id/reports/latest ─────────────────

router.get("/businesses/:id/reports/latest", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const report = await getLatestSimulationReport(parseInt(req.params.id!));
    if (!report) {
      res.status(404).json({ error: "No simulation report found. Run /simulate first." });
      return;
    }
    res.json({ report });
  } catch (err) {
    res.status(500).json({ error: "Failed to get latest report" });
  }
});

// ── GET /api/future-simulation/businesses/:id/scenarios ──────────────────────

router.get("/businesses/:id/scenarios", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const limit = parseInt((req.query.limit as string) ?? "20");
    const scenarios = await listScenarios(parseInt(req.params.id!), limit);
    res.json({ scenarios });
  } catch (err) {
    res.status(500).json({ error: "Failed to list scenarios" });
  }
});

// ── GET /api/future-simulation/scenarios/:id ─────────────────────────────────
// Full scenario detail with branches, assumptions, evidence, outcomes.

router.get("/scenarios/:id", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const scenario = await getScenarioById(req.params.id!);
    if (!scenario) {
      res.status(404).json({ error: "Scenario not found" });
      return;
    }
    res.json({ scenario });
  } catch (err) {
    res.status(500).json({ error: "Failed to get scenario" });
  }
});

// ── GET /api/future-simulation/businesses/:id/registry ───────────────────────

router.get("/businesses/:id/registry", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const registry = await getSimulationRegistry(parseInt(req.params.id!));
    res.json({ registry });
  } catch (err) {
    res.status(500).json({ error: "Failed to get registry" });
  }
});

// ── GET /api/future-simulation/businesses/:id/history ────────────────────────

router.get("/businesses/:id/history", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const snapshots = await listSimulationSnapshots(parseInt(req.params.id!), 10);
    res.json({ snapshots });
  } catch (err) {
    res.status(500).json({ error: "Failed to get history" });
  }
});

// ── GET /api/future-simulation/businesses/:id/summary ────────────────────────

router.get("/businesses/:id/summary", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const summary = await fetchSimulationSummaryForEB(userId);
    res.json({ summary });
  } catch (err) {
    res.status(500).json({ error: "Failed to get summary" });
  }
});

// ── GET /api/future-simulation/businesses/:id/diagnostics ────────────────────

router.get("/businesses/:id/diagnostics", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const [registry, snapshots] = await Promise.all([
      getSimulationRegistry(parseInt(req.params.id!)),
      listSimulationSnapshots(parseInt(req.params.id!), 5),
    ]);
    res.json({
      totalScenarios: registry?.totalScenarios ?? 0,
      totalReports: registry?.totalReports ?? 0,
      latestConfidence: registry?.latestConfidence ?? null,
      latestAvgRisk: registry?.latestAvgRisk ?? null,
      recentSnapshots: snapshots.length,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to get diagnostics" });
  }
});

// ── GET /api/future-simulation/businesses/:id/search ─────────────────────────
// Filter scenarios by type, status, or minScore.

router.get("/businesses/:id/search", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const { scenarioType, status, minScore } = req.query as Record<string, string>;
    let scenarios = await listScenarios(parseInt(req.params.id!), 100);
    if (scenarioType) scenarios = scenarios.filter((s) => s.scenarioType === scenarioType);
    if (status) scenarios = scenarios.filter((s) => s.status === status);
    if (minScore) scenarios = scenarios.filter((s) => s.expectedValueScore >= parseFloat(minScore));
    res.json({ scenarios });
  } catch (err) {
    res.status(500).json({ error: "Search failed" });
  }
});

// ── GET /api/future-simulation/businesses/:id/compare ────────────────────────
// Compare two scenarios by ID.

router.get("/businesses/:id/compare", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const { a, b } = req.query as Record<string, string>;
    if (!a || !b) {
      res.status(400).json({ error: "Query params ?a=<scenarioId>&b=<scenarioId> required" });
      return;
    }
    const [scenA, scenB] = await Promise.all([getScenarioById(a), getScenarioById(b)]);
    res.json({ scenarioA: scenA, scenarioB: scenB });
  } catch (err) {
    res.status(500).json({ error: "Comparison failed" });
  }
});

export default router;
