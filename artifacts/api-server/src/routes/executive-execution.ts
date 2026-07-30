// ─── Executive Execution Routes (Build 010) ──────────────────────────────────
//
// REST API for the Executive Execution Engine.
// All routes require authentication.

import { Router } from "express";
import { requireAuthActive } from "../lib/auth";
import {
  createExecution,
  getExecution,
  listExecutions,
  listActiveExecutions,
  transitionExecution,
  createExecutionStep,
  getExecutionStep,
  getExecutionSteps,
  transitionStep,
  addExecutionMetric,
  getExecutionMetrics,
  createRecoveryPoint,
  getRecoveryPoints,
  getLatestRecoveryPoint,
  addExecutionRelationship,
  getExecutionRelationships,
  getExecutionDiagnostics,
} from "../lib/executive-execution/execution-registry";
import {
  getExecutionHistory,
  getRecentExecutionHistory,
  getStepHistory,
} from "../lib/executive-execution/execution-history";
import {
  buildExecutionPlan,
} from "../lib/executive-execution/execution-coordinator";
import {
  getValidExecutionTransitions,
} from "../lib/executive-execution/execution-state-machine";
import { logger } from "../lib/logger";

const router = Router();

// ── POST /api/executive-execution — create a new execution ────────────────────

router.post("/", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const execution = await createExecution({ userId, ...req.body });
    res.status(201).json({ execution });
  } catch (err) {
    logger.error({ err }, "POST /api/executive-execution failed");
    res.status(500).json({ error: "Failed to create execution" });
  }
});

// ── GET /api/executive-execution — list executions ────────────────────────────

router.get("/", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const { planId, goalId, status, parentExecutionId, limit } = req.query as Record<string, string | undefined>;
    const executions = await listExecutions({
      userId,
      planId,
      goalId,
      status: status as any,
      parentExecutionId,
      limit: limit ? parseInt(limit) : 50,
    });
    res.json({ executions });
  } catch (err) {
    logger.error({ err }, "GET /api/executive-execution failed");
    res.status(500).json({ error: "Failed to list executions" });
  }
});

// ── GET /api/executive-execution/active — active executions only ──────────────

router.get("/active", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const executions = await listActiveExecutions(userId);
    res.json({ executions });
  } catch (err) {
    logger.error({ err }, "GET /api/executive-execution/active failed");
    res.status(500).json({ error: "Failed to list active executions" });
  }
});

// ── GET /api/executive-execution/diagnostics ──────────────────────────────────

router.get("/diagnostics", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const diagnostics = await getExecutionDiagnostics(userId);
    res.json({ diagnostics });
  } catch (err) {
    logger.error({ err }, "GET /api/executive-execution/diagnostics failed");
    res.status(500).json({ error: "Failed to get execution diagnostics" });
  }
});

// ── GET /api/executive-execution/:id ─────────────────────────────────────────

router.get("/:id", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const execution = await getExecution(req.params.id!);
    if (!execution || execution.userId !== userId) {
      res.status(404).json({ error: "Execution not found" });
      return;
    }
    res.json({ execution });
  } catch (err) {
    logger.error({ err }, "GET /api/executive-execution/:id failed");
    res.status(500).json({ error: "Failed to get execution" });
  }
});

// ── POST /api/executive-execution/:id/approve ────────────────────────────────

router.post("/:id/approve", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const execution = await getExecution(req.params.id!);
    if (!execution || execution.userId !== userId) {
      res.status(404).json({ error: "Execution not found" });
      return;
    }
    const updated = await transitionExecution({
      executionId: req.params.id!,
      toStatus: "approved",
      triggeredBy: `user:${userId}`,
      note: req.body.note,
    });
    res.json({ execution: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? "Failed to approve execution" });
  }
});

// ── POST /api/executive-execution/:id/start ──────────────────────────────────

router.post("/:id/start", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const execution = await getExecution(req.params.id!);
    if (!execution || execution.userId !== userId) {
      res.status(404).json({ error: "Execution not found" });
      return;
    }
    const updated = await transitionExecution({
      executionId: req.params.id!,
      toStatus: "running",
      triggeredBy: `user:${userId}`,
    });
    res.json({ execution: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? "Failed to start execution" });
  }
});

// ── POST /api/executive-execution/:id/pause ──────────────────────────────────

router.post("/:id/pause", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const execution = await getExecution(req.params.id!);
    if (!execution || execution.userId !== userId) {
      res.status(404).json({ error: "Execution not found" });
      return;
    }
    const updated = await transitionExecution({
      executionId: req.params.id!,
      toStatus: "paused",
      triggeredBy: `user:${userId}`,
      note: req.body.note,
    });
    res.json({ execution: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? "Failed to pause execution" });
  }
});

// ── POST /api/executive-execution/:id/resume ─────────────────────────────────

router.post("/:id/resume", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const execution = await getExecution(req.params.id!);
    if (!execution || execution.userId !== userId) {
      res.status(404).json({ error: "Execution not found" });
      return;
    }
    const updated = await transitionExecution({
      executionId: req.params.id!,
      toStatus: "running",
      triggeredBy: `user:${userId}`,
    });
    res.json({ execution: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? "Failed to resume execution" });
  }
});

// ── POST /api/executive-execution/:id/retry ──────────────────────────────────

router.post("/:id/retry", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const execution = await getExecution(req.params.id!);
    if (!execution || execution.userId !== userId) {
      res.status(404).json({ error: "Execution not found" });
      return;
    }
    if (execution.retryCount >= execution.maxRetries) {
      res.status(400).json({ error: `Max retries (${execution.maxRetries}) exceeded` });
      return;
    }
    const updated = await transitionExecution({
      executionId: req.params.id!,
      toStatus: "retrying",
      triggeredBy: `user:${userId}`,
    });
    res.json({ execution: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? "Failed to retry execution" });
  }
});

// ── POST /api/executive-execution/:id/cancel ─────────────────────────────────

router.post("/:id/cancel", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const execution = await getExecution(req.params.id!);
    if (!execution || execution.userId !== userId) {
      res.status(404).json({ error: "Execution not found" });
      return;
    }
    const updated = await transitionExecution({
      executionId: req.params.id!,
      toStatus: "cancelled",
      triggeredBy: `user:${userId}`,
      note: req.body.reason,
    });
    res.json({ execution: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? "Failed to cancel execution" });
  }
});

// ── GET /api/executive-execution/:id/transitions ─────────────────────────────
// Returns valid next transitions for the current status.

router.get("/:id/transitions", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const execution = await getExecution(req.params.id!);
    if (!execution || execution.userId !== userId) {
      res.status(404).json({ error: "Execution not found" });
      return;
    }
    const validTransitions = getValidExecutionTransitions(execution.status);
    res.json({ currentStatus: execution.status, validTransitions });
  } catch (err) {
    res.status(500).json({ error: "Failed to get transitions" });
  }
});

// ── GET /api/executive-execution/:id/history ─────────────────────────────────

router.get("/:id/history", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const execution = await getExecution(req.params.id!);
    if (!execution || execution.userId !== userId) {
      res.status(404).json({ error: "Execution not found" });
      return;
    }
    const { recent, limit } = req.query as Record<string, string | undefined>;
    const history = recent === "true"
      ? await getRecentExecutionHistory(req.params.id!, limit ? parseInt(limit) : 10)
      : await getExecutionHistory(req.params.id!, limit ? parseInt(limit) : 100);
    res.json({ history });
  } catch (err) {
    logger.error({ err }, "GET /api/executive-execution/:id/history failed");
    res.status(500).json({ error: "Failed to get execution history" });
  }
});

// ── GET /api/executive-execution/:id/steps ───────────────────────────────────

router.get("/:id/steps", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const execution = await getExecution(req.params.id!);
    if (!execution || execution.userId !== userId) {
      res.status(404).json({ error: "Execution not found" });
      return;
    }
    const steps = await getExecutionSteps(req.params.id!);
    res.json({ steps });
  } catch (err) {
    logger.error({ err }, "GET /api/executive-execution/:id/steps failed");
    res.status(500).json({ error: "Failed to get execution steps" });
  }
});

// ── POST /api/executive-execution/:id/steps ──────────────────────────────────

router.post("/:id/steps", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const execution = await getExecution(req.params.id!);
    if (!execution || execution.userId !== userId) {
      res.status(404).json({ error: "Execution not found" });
      return;
    }
    const step = await createExecutionStep({ executionId: req.params.id!, ...req.body });
    res.status(201).json({ step });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? "Failed to create step" });
  }
});

// ── GET /api/executive-execution/:id/coordinator ─────────────────────────────
// Returns the coordinator's execution plan for the current state.

router.get("/:id/coordinator", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const execution = await getExecution(req.params.id!);
    if (!execution || execution.userId !== userId) {
      res.status(404).json({ error: "Execution not found" });
      return;
    }
    const steps = await getExecutionSteps(req.params.id!);
    const plan = buildExecutionPlan(execution, steps);
    res.json({ coordinatorPlan: plan });
  } catch (err) {
    logger.error({ err }, "GET /api/executive-execution/:id/coordinator failed");
    res.status(500).json({ error: "Failed to build coordinator plan" });
  }
});

// ── PATCH /api/executive-execution/steps/:stepId ─────────────────────────────
// Transition a step to a new status.

router.patch("/steps/:stepId", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const step = await getExecutionStep(req.params.stepId!);
    if (!step) {
      res.status(404).json({ error: "Step not found" });
      return;
    }
    // Ownership: verify via parent execution
    const execution = await getExecution(step.executionId);
    if (!execution || execution.userId !== userId) {
      res.status(404).json({ error: "Step not found" });
      return;
    }
    const updated = await transitionStep({
      stepId: req.params.stepId!,
      ...req.body,
    });
    res.json({ step: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? "Failed to transition step" });
  }
});

// ── GET /api/executive-execution/steps/:stepId/history ───────────────────────

router.get("/steps/:stepId/history", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const step = await getExecutionStep(req.params.stepId!);
    if (!step) {
      res.status(404).json({ error: "Step not found" });
      return;
    }
    const execution = await getExecution(step.executionId);
    if (!execution || execution.userId !== userId) {
      res.status(404).json({ error: "Step not found" });
      return;
    }
    const history = await getStepHistory(step.executionId, req.params.stepId!);
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: "Failed to get step history" });
  }
});

// ── POST /api/executive-execution/:id/metrics ────────────────────────────────

router.post("/:id/metrics", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const execution = await getExecution(req.params.id!);
    if (!execution || execution.userId !== userId) {
      res.status(404).json({ error: "Execution not found" });
      return;
    }
    const metric = await addExecutionMetric({ executionId: req.params.id!, ...req.body });
    res.status(201).json({ metric });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? "Failed to add metric" });
  }
});

// ── GET /api/executive-execution/:id/metrics ─────────────────────────────────

router.get("/:id/metrics", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const execution = await getExecution(req.params.id!);
    if (!execution || execution.userId !== userId) {
      res.status(404).json({ error: "Execution not found" });
      return;
    }
    const metrics = await getExecutionMetrics(req.params.id!);
    res.json({ metrics });
  } catch (err) {
    res.status(500).json({ error: "Failed to get metrics" });
  }
});

// ── POST /api/executive-execution/:id/recovery-points ────────────────────────

router.post("/:id/recovery-points", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const execution = await getExecution(req.params.id!);
    if (!execution || execution.userId !== userId) {
      res.status(404).json({ error: "Execution not found" });
      return;
    }
    const steps = await getExecutionSteps(req.params.id!);
    const rp = await createRecoveryPoint({
      executionId: req.params.id!,
      label: req.body.label ?? `checkpoint-${Date.now()}`,
      description: req.body.description,
      execution,
      steps,
    });
    res.status(201).json({ recoveryPoint: rp });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? "Failed to create recovery point" });
  }
});

// ── GET /api/executive-execution/:id/recovery-points ─────────────────────────

router.get("/:id/recovery-points", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const execution = await getExecution(req.params.id!);
    if (!execution || execution.userId !== userId) {
      res.status(404).json({ error: "Execution not found" });
      return;
    }
    const { latest } = req.query as { latest?: string };
    const recoveryPoints = latest === "true"
      ? [await getLatestRecoveryPoint(req.params.id!)].filter(Boolean)
      : await getRecoveryPoints(req.params.id!);
    res.json({ recoveryPoints });
  } catch (err) {
    res.status(500).json({ error: "Failed to get recovery points" });
  }
});

// ── POST /api/executive-execution/:id/relationships ──────────────────────────

router.post("/:id/relationships", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const execution = await getExecution(req.params.id!);
    if (!execution || execution.userId !== userId) {
      res.status(404).json({ error: "Execution not found" });
      return;
    }
    const rel = await addExecutionRelationship({ sourceExecutionId: req.params.id!, ...req.body });
    res.status(201).json({ relationship: rel });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? "Failed to add relationship" });
  }
});

// ── GET /api/executive-execution/:id/relationships ───────────────────────────

router.get("/:id/relationships", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const execution = await getExecution(req.params.id!);
    if (!execution || execution.userId !== userId) {
      res.status(404).json({ error: "Execution not found" });
      return;
    }
    const relationships = await getExecutionRelationships(req.params.id!);
    res.json({ relationships });
  } catch (err) {
    res.status(500).json({ error: "Failed to get relationships" });
  }
});

export default router;
