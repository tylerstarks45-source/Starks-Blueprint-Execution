// ─── Executive Planning Engine — REST API (Build 009) ────────────────────────
//
// All routes under /api/executive-plan/
// Auth: requireAuthActive on all routes.

import { Router } from "express";
import { requireAuthActive } from "../lib/auth";
import {
  createPlan,
  getPlan,
  listPlans,
  listActivePlans,
  updatePlan,
  archivePlan,
  getPlanMilestones,
  getChildMilestones,
  updateMilestoneStatus,
  getMilestoneSteps,
  getPlanSteps,
  addPlanDependency,
  getPlanDependencies,
  removePlanDependency,
  addPlanMetric,
  getPlanMetrics,
  generateAndPersistPlan,
  generateAlternativePlans,
  comparePlans,
  buildPlanDiagnostics,
  analyzePlanDependencies,
  getPlanHistory,
  getRecentPlanHistory,
} from "../lib/executive-plan/plan-services";
import type { GeneratePlanInput } from "../lib/executive-plan/types";

const router = Router();

// ─── Plan CRUD ────────────────────────────────────────────────────────────────

/** POST /api/executive-plan — Create a bare plan */
router.post("/executive-plan", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  try {
    const plan = await createPlan({ ...req.body, userId });
    res.json({ success: true, plan });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** GET /api/executive-plan — List plans (status/goalId/isAlternative/limit filters) */
router.get("/executive-plan", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  try {
    const { status, goalId, isAlternative, limit } = req.query;
    const plans = await listPlans(userId, {
      status: typeof status === "string" ? status : undefined,
      goalId: typeof goalId === "string" ? goalId : undefined,
      isAlternative: isAlternative === "true" ? true : isAlternative === "false" ? false : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json({ success: true, plans });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** GET /api/executive-plan/active — Active plans only */
router.get("/executive-plan/active", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  try {
    const plans = await listActivePlans(userId);
    res.json({ success: true, plans });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** GET /api/executive-plan/diagnostics — Aggregate diagnostics */
router.get("/executive-plan/diagnostics", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  try {
    const diagnostics = await buildPlanDiagnostics(userId);
    res.json({ success: true, diagnostics });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** POST /api/executive-plan/generate — Generate a plan from a goal */
router.post("/executive-plan/generate", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  try {
    const {
      goalId, goalName, goalDescription, successCriteria, constraintsData,
      estimatedComplexity, estimatedRisk, contextSnapshotId, judgmentId,
      goalPriorityScore, strategy,
    } = req.body;

    if (!goalId || !goalName) {
      res.status(400).json({ success: false, error: "goalId and goalName are required" });
      return;
    }

    const input: GeneratePlanInput = {
      userId,
      goalId,
      goalName,
      goalDescription: goalDescription ?? null,
      successCriteria: successCriteria ?? [],
      constraintsData: constraintsData ?? [],
      estimatedComplexity: estimatedComplexity ?? 50,
      estimatedRisk: estimatedRisk ?? 50,
      contextSnapshotId,
      judgmentId,
      goalPriorityScore,
    };

    const result = await generateAndPersistPlan(input, strategy ?? "top_down");
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** POST /api/executive-plan/generate-alternatives — Generate multiple alternative plans */
router.post("/executive-plan/generate-alternatives", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  try {
    const {
      goalId, goalName, goalDescription, successCriteria, constraintsData,
      estimatedComplexity, estimatedRisk, contextSnapshotId, judgmentId,
      goalPriorityScore, strategies,
    } = req.body;

    if (!goalId || !goalName) {
      res.status(400).json({ success: false, error: "goalId and goalName are required" });
      return;
    }

    const input: GeneratePlanInput = {
      userId,
      goalId,
      goalName,
      goalDescription: goalDescription ?? null,
      successCriteria: successCriteria ?? [],
      constraintsData: constraintsData ?? [],
      estimatedComplexity: estimatedComplexity ?? 50,
      estimatedRisk: estimatedRisk ?? 50,
      contextSnapshotId,
      judgmentId,
      goalPriorityScore,
      strategies: strategies ?? ["top_down", "bottom_up", "agile"],
    };

    const results = await generateAlternativePlans(input);
    res.json({ success: true, plans: results, count: results.length });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** POST /api/executive-plan/compare — Compare plans by ID */
router.post("/executive-plan/compare", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  try {
    const { planIds } = req.body;
    if (!Array.isArray(planIds) || planIds.length < 2) {
      res.status(400).json({ success: false, error: "planIds must be an array of at least 2 plan IDs" });
      return;
    }
    const result = await comparePlans(planIds);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── Plan by ID (must come after all static sub-paths) ───────────────────────

/** GET /api/executive-plan/:id — Retrieve one plan */
router.get("/executive-plan/:id", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  try {
    const plan = await getPlan(req.params.id);
    if (!plan) { res.status(404).json({ success: false, error: "Plan not found" }); return; }
    if (plan.userId !== null && plan.userId !== userId) { res.status(403).json({ success: false, error: "Forbidden" }); return; }
    res.json({ success: true, plan });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** PUT /api/executive-plan/:id — Update a plan */
router.put("/executive-plan/:id", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  try {
    const existing = await getPlan(req.params.id);
    if (!existing) { res.status(404).json({ success: false, error: "Plan not found" }); return; }
    if (existing.userId !== null && existing.userId !== userId) { res.status(403).json({ success: false, error: "Forbidden" }); return; }
    const updated = await updatePlan(req.params.id, req.body);
    res.json({ success: true, plan: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** DELETE /api/executive-plan/:id — Archive a plan */
router.delete("/executive-plan/:id", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  try {
    const existing = await getPlan(req.params.id);
    if (!existing) { res.status(404).json({ success: false, error: "Plan not found" }); return; }
    if (existing.userId !== null && existing.userId !== userId) { res.status(403).json({ success: false, error: "Forbidden" }); return; }
    const archived = await archivePlan(req.params.id, req.body?.reason);
    res.json({ success: true, plan: archived });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** GET /api/executive-plan/:id/milestones — Milestones for a plan */
router.get("/executive-plan/:id/milestones", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  try {
    const plan = await getPlan(req.params.id);
    if (!plan) { res.status(404).json({ success: false, error: "Plan not found" }); return; }
    if (plan.userId !== null && plan.userId !== userId) { res.status(403).json({ success: false, error: "Forbidden" }); return; }
    const milestones = await getPlanMilestones(req.params.id);
    res.json({ success: true, milestones });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** GET /api/executive-plan/:id/steps — All steps for a plan */
router.get("/executive-plan/:id/steps", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  try {
    const plan = await getPlan(req.params.id);
    if (!plan) { res.status(404).json({ success: false, error: "Plan not found" }); return; }
    if (plan.userId !== null && plan.userId !== userId) { res.status(403).json({ success: false, error: "Forbidden" }); return; }
    const steps = await getPlanSteps(req.params.id);
    res.json({ success: true, steps });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** GET /api/executive-plan/:id/history — Immutable plan history */
router.get("/executive-plan/:id/history", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  try {
    const plan = await getPlan(req.params.id);
    if (!plan) { res.status(404).json({ success: false, error: "Plan not found" }); return; }
    if (plan.userId !== null && plan.userId !== userId) { res.status(403).json({ success: false, error: "Forbidden" }); return; }
    const { recent, limit } = req.query;
    const history = recent === "true"
      ? await getRecentPlanHistory(req.params.id, limit ? Number(limit) : 20)
      : await getPlanHistory(req.params.id);
    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** POST /api/executive-plan/:id/dependencies — Add a dependency */
router.post("/executive-plan/:id/dependencies", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  try {
    const dep = await addPlanDependency({ sourceId: req.params.id, ...req.body });
    res.json({ success: true, dependency: dep });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** GET /api/executive-plan/:id/dependencies — Get dependencies */
router.get("/executive-plan/:id/dependencies", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  try {
    const deps = await getPlanDependencies(req.params.id);
    res.json({ success: true, dependencies: deps });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** GET /api/executive-plan/:id/dependency-analysis — Run dependency analysis */
router.get("/executive-plan/:id/dependency-analysis", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  try {
    const plan = await getPlan(req.params.id);
    if (!plan) { res.status(404).json({ success: false, error: "Plan not found" }); return; }
    if (plan.userId !== null && plan.userId !== userId) { res.status(403).json({ success: false, error: "Forbidden" }); return; }
    const [milestones, steps, deps] = await Promise.all([
      getPlanMilestones(req.params.id),
      getPlanSteps(req.params.id),
      getPlanDependencies(req.params.id),
    ]);
    const report = analyzePlanDependencies({ planId: req.params.id, milestones, steps, planDependencies: deps });
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** POST /api/executive-plan/:id/metrics — Record a metric */
router.post("/executive-plan/:id/metrics", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  try {
    const metric = await addPlanMetric({ planId: req.params.id, ...req.body });
    res.json({ success: true, metric });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** GET /api/executive-plan/:id/metrics — Retrieve metrics */
router.get("/executive-plan/:id/metrics", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  try {
    const metrics = await getPlanMetrics(req.params.id);
    res.json({ success: true, metrics });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── Milestone sub-routes (separate paths, not under /:id) ───────────────────

/** GET /api/executive-plan/milestones/:milestoneId/children — Child milestones */
router.get("/executive-plan/milestones/:milestoneId/children", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  try {
    const children = await getChildMilestones(req.params.milestoneId);
    res.json({ success: true, milestones: children });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** PATCH /api/executive-plan/milestones/:milestoneId — Update milestone status */
router.patch("/executive-plan/milestones/:milestoneId", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  try {
    const { status, progressPct } = req.body;
    if (!status) { res.status(400).json({ success: false, error: "status is required" }); return; }
    const ms = await updateMilestoneStatus(req.params.milestoneId, status, progressPct);
    if (!ms) { res.status(404).json({ success: false, error: "Milestone not found" }); return; }
    res.json({ success: true, milestone: ms });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** GET /api/executive-plan/milestones/:milestoneId/steps — Steps for a milestone */
router.get("/executive-plan/milestones/:milestoneId/steps", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  try {
    const steps = await getMilestoneSteps(req.params.milestoneId);
    res.json({ success: true, steps });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** DELETE /api/executive-plan/dependencies/:depId — Remove a dependency */
router.delete("/executive-plan/dependencies/:depId", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  try {
    const removed = await removePlanDependency(req.params.depId);
    res.json({ success: true, removed });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
