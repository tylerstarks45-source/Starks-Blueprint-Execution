// ─────────────────────────────────────────────────────────────────────────────
// Build 028: Intelligent Workflow Execution Engine — REST Routes (9 endpoints)
// All under /api/workflow-execution
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from "express";
import { db } from "@workspace/db";
import {
  executionWorkflows,
  workflowNodes,
  workflowEdges,
  workflowCheckpoints,
  workflowBranches,
  workflowRollbacks,
  workflowRegistry,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuthActive } from "../lib/auth";
import { buildExecutionWorkflow } from "../lib/workflow-execution/workflow-orchestrator";

const router = Router();
const p = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? "") : (v ?? "");

// POST /api/workflow-execution/build-workflow/:businessId
router.post("/api/workflow-execution/build-workflow/:businessId", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const businessId = parseInt(p(req.params["businessId"]), 10);
  if (isNaN(businessId)) {
    res.status(400).json({ error: "Invalid businessId" });
    return;
  }

  try {
    const summary = await buildExecutionWorkflow({ userId, businessId });
    if (!summary) {
      res.status(422).json({ error: "No execution orchestration plan found. Run /orchestrate first." });
      return;
    }
    res.json({ summary });
  } catch (err) {
    res.status(500).json({ error: "Workflow build failed" });
  }
});

// GET /api/workflow-execution/businesses/:businessId/workflows
router.get("/api/workflow-execution/businesses/:businessId/workflows", async (req, res) => {
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
      .from(executionWorkflows)
      .where(eq(executionWorkflows.businessId, businessId))
      .orderBy(desc(executionWorkflows.createdAt))
      .limit(20);
    res.json({ workflows: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch workflows" });
  }
});

// GET /api/workflow-execution/workflows/:workflowId
router.get("/api/workflow-execution/workflows/:workflowId", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const rows = await db
      .select()
      .from(executionWorkflows)
      .where(eq(executionWorkflows.id, p(req.params["workflowId"])))
      .limit(1);
    if (!rows[0]) {
      res.status(404).json({ error: "Workflow not found" });
      return;
    }
    res.json({ workflow: rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch workflow" });
  }
});

// GET /api/workflow-execution/workflows/:workflowId/nodes
router.get("/api/workflow-execution/workflows/:workflowId/nodes", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const rows = await db
      .select()
      .from(workflowNodes)
      .where(eq(workflowNodes.workflowId, p(req.params["workflowId"])))
      .orderBy(workflowNodes.sequencePosition);
    res.json({ nodes: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch workflow nodes" });
  }
});

// GET /api/workflow-execution/workflows/:workflowId/edges
router.get("/api/workflow-execution/workflows/:workflowId/edges", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const rows = await db
      .select()
      .from(workflowEdges)
      .where(eq(workflowEdges.workflowId, p(req.params["workflowId"])));
    res.json({ edges: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch workflow edges" });
  }
});

// GET /api/workflow-execution/workflows/:workflowId/checkpoints
router.get("/api/workflow-execution/workflows/:workflowId/checkpoints", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const rows = await db
      .select()
      .from(workflowCheckpoints)
      .where(eq(workflowCheckpoints.workflowId, p(req.params["workflowId"])));
    res.json({ checkpoints: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch checkpoints" });
  }
});

// GET /api/workflow-execution/workflows/:workflowId/branches
router.get("/api/workflow-execution/workflows/:workflowId/branches", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const rows = await db
      .select()
      .from(workflowBranches)
      .where(eq(workflowBranches.workflowId, p(req.params["workflowId"])));
    res.json({ branches: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch branches" });
  }
});

// GET /api/workflow-execution/workflows/:workflowId/rollback
router.get("/api/workflow-execution/workflows/:workflowId/rollback", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const rows = await db
      .select()
      .from(workflowRollbacks)
      .where(eq(workflowRollbacks.workflowId, p(req.params["workflowId"])));
    res.json({ rollbackPaths: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch rollback paths" });
  }
});

// GET /api/workflow-execution/businesses/:businessId/registry
router.get("/api/workflow-execution/businesses/:businessId/registry", async (req, res) => {
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
      .from(workflowRegistry)
      .where(eq(workflowRegistry.businessId, businessId))
      .limit(1);
    if (!rows[0]) {
      res.status(404).json({ error: "No workflow registry entry found for this business" });
      return;
    }
    res.json({ registry: rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch registry" });
  }
});

export default router;
