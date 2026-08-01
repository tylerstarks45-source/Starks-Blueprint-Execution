// ─────────────────────────────────────────────────────────────────────────────
// Build 027: Execution Simulation Engine — REST Routes (8 endpoints)
// All under /api/execution-simulation
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from "express";
import { db } from "@workspace/db";
import {
  executionSimulationReports,
  executionSimulations,
  simulationScenarios,
  predictedOutcomes,
  predictedStateChanges,
  rollbackSimulations,
  simulationRegistry,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuthActive } from "../lib/auth";
import { runExecutionSimulation } from "../lib/execution-simulation/simulation-orchestrator";

const router = Router();
const p = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? "") : (v ?? "");

// POST /api/execution-simulation/simulate-execution/:businessId
router.post("/api/execution-simulation/simulate-execution/:businessId", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const businessId = parseInt(p(req.params["businessId"]), 10);
  if (isNaN(businessId)) {
    res.status(400).json({ error: "Invalid businessId" });
    return;
  }

  try {
    const summary = await runExecutionSimulation({ userId, businessId });
    if (!summary) {
      res.status(422).json({ error: "No execution orchestration plan found for this business. Run /orchestrate first." });
      return;
    }
    res.json({ summary });
  } catch (err) {
    res.status(500).json({ error: "Simulation run failed" });
  }
});

// GET /api/execution-simulation/businesses/:businessId/reports
router.get("/api/execution-simulation/businesses/:businessId/reports", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const businessId = parseInt(p(req.params["businessId"]), 10);
  if (isNaN(businessId)) {
    res.status(400).json({ error: "Invalid businessId" });
    return;
  }

  try {
    const rows = await db
      .select()
      .from(executionSimulationReports)
      .where(eq(executionSimulationReports.businessId, businessId))
      .orderBy(desc(executionSimulationReports.createdAt))
      .limit(20);
    res.json({ reports: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch simulation reports" });
  }
});

// GET /api/execution-simulation/reports/:reportId
router.get("/api/execution-simulation/reports/:reportId", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const rows = await db
      .select()
      .from(executionSimulationReports)
      .where(eq(executionSimulationReports.id, p(req.params["reportId"])))
      .limit(1);
    if (!rows[0]) {
      res.status(404).json({ error: "Report not found" });
      return;
    }
    res.json({ report: rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch report" });
  }
});

// GET /api/execution-simulation/reports/:reportId/scenarios
router.get("/api/execution-simulation/reports/:reportId/scenarios", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const rows = await db
      .select()
      .from(simulationScenarios)
      .where(eq(simulationScenarios.reportId, p(req.params["reportId"])));
    res.json({ scenarios: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch scenarios" });
  }
});

// GET /api/execution-simulation/reports/:reportId/outcomes
router.get("/api/execution-simulation/reports/:reportId/outcomes", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const rows = await db
      .select()
      .from(predictedOutcomes)
      .where(eq(predictedOutcomes.reportId, p(req.params["reportId"])));
    res.json({ outcomes: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch outcomes" });
  }
});

// GET /api/execution-simulation/reports/:reportId/state-changes
router.get("/api/execution-simulation/reports/:reportId/state-changes", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const rows = await db
      .select()
      .from(predictedStateChanges)
      .where(eq(predictedStateChanges.reportId, p(req.params["reportId"])));
    res.json({ stateChanges: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch state changes" });
  }
});

// GET /api/execution-simulation/reports/:reportId/rollback
router.get("/api/execution-simulation/reports/:reportId/rollback", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const rows = await db
      .select()
      .from(rollbackSimulations)
      .where(eq(rollbackSimulations.reportId, p(req.params["reportId"])));
    res.json({ rollbackSimulations: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch rollback simulations" });
  }
});

// GET /api/execution-simulation/businesses/:businessId/registry
router.get("/api/execution-simulation/businesses/:businessId/registry", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const businessId = parseInt(p(req.params["businessId"]), 10);
  if (isNaN(businessId)) {
    res.status(400).json({ error: "Invalid businessId" });
    return;
  }

  try {
    const rows = await db
      .select()
      .from(simulationRegistry)
      .where(eq(simulationRegistry.businessId, businessId))
      .limit(1);
    if (!rows[0]) {
      res.status(404).json({ error: "No simulation registry entry found for this business" });
      return;
    }
    res.json({ registry: rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch registry" });
  }
});

export default router;
