// ─── Executive Goal Engine — API Routes (Build 008) ──────────────────────────
//
// REST endpoints for Goal CRUD, hierarchy, progress, metrics, dependencies,
// conflicts, and history. All under /api/executive-goal.
//
// Endpoints:
//   POST   /api/executive-goal                       Create goal
//   GET    /api/executive-goal                       List goals (with filters)
//   GET    /api/executive-goal/hierarchy             Full goal tree
//   GET    /api/executive-goal/conflicts             Detect all conflicts
//   GET    /api/executive-goal/diagnostics           Goal diagnostics
//   GET    /api/executive-goal/active                Active goals
//   GET    /api/executive-goal/:id                   Get goal
//   PUT    /api/executive-goal/:id                   Update goal
//   DELETE /api/executive-goal/:id                   Archive goal
//   GET    /api/executive-goal/:id/children          Direct children
//   GET    /api/executive-goal/:id/ancestry          Ancestor chain
//   PUT    /api/executive-goal/:id/progress          Update progress
//   GET    /api/executive-goal/:id/history           Progress history
//   GET    /api/executive-goal/:id/progress          Progress report
//   POST   /api/executive-goal/:id/dependencies      Add dependency
//   GET    /api/executive-goal/:id/dependencies      Get dependencies
//   DELETE /api/executive-goal/:id/dependencies/:depId  Remove dependency
//   POST   /api/executive-goal/:id/metrics           Add metric
//   GET    /api/executive-goal/:id/metrics           Get metrics
//   POST   /api/executive-goal/:id/link/:targetId    Link two goals

import { Router, type IRouter } from "express";
import type { Request, Response } from "express";
import { requireAuthActive } from "../lib/auth";
import {
  createGoal,
  getGoal,
  listGoals,
  listActiveGoals,
  updateGoal,
  updateGoalProgress,
  archiveGoal,
  linkGoals,
  addDependency,
  getDependencies,
  removeDependency,
  getGoalHierarchy,
  getGoalAncestry,
  listChildGoals,
  addMetric,
  getMetrics,
  buildGoalDiagnostics,
  getGoalConflictReport,
  buildProgressReport,
  getProgressHistory,
} from "../lib/executive-goal";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// ─── Create ───────────────────────────────────────────────────────────────────

router.post("/executive-goal", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const input = req.body;
    if (!input.name || typeof input.name !== "string") {
      return res.status(400).json({ error: "name is required" });
    }
    const goal = await createGoal({ ...input, userId });
    return res.status(201).json({ goal });
  } catch (err) {
    logger.warn({ err }, "POST /executive-goal failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// ─── List ────────────────────────────────────────────────────────────────────

router.get("/executive-goal", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const { status, category, type, limit } = req.query;
    const goals = await listGoals(userId, {
      status: status as string | undefined,
      category: category as string | undefined,
      type: type as string | undefined,
      limit: limit ? Number(limit) : undefined,
    });
    return res.json({ goals, count: goals.length });
  } catch (err) {
    logger.warn({ err }, "GET /executive-goal failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// ─── Active goals ─────────────────────────────────────────────────────────────

router.get("/executive-goal/active", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const goals = await listActiveGoals(userId);
    return res.json({ goals, count: goals.length });
  } catch (err) {
    logger.warn({ err }, "GET /executive-goal/active failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// ─── Hierarchy ────────────────────────────────────────────────────────────────

router.get("/executive-goal/hierarchy", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const tree = await getGoalHierarchy(userId);
    return res.json({ hierarchy: tree });
  } catch (err) {
    logger.warn({ err }, "GET /executive-goal/hierarchy failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// ─── Conflict detection ───────────────────────────────────────────────────────

router.get("/executive-goal/conflicts", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const report = await getGoalConflictReport(userId);
    return res.json({ report });
  } catch (err) {
    logger.warn({ err }, "GET /executive-goal/conflicts failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// ─── Diagnostics ──────────────────────────────────────────────────────────────

router.get("/executive-goal/diagnostics", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const diagnostics = await buildGoalDiagnostics(userId);
    return res.json({ diagnostics });
  } catch (err) {
    logger.warn({ err }, "GET /executive-goal/diagnostics failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// ─── Get one ─────────────────────────────────────────────────────────────────

router.get("/executive-goal/:id", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const id = String(req.params["id"] ?? "");
    const goal = await getGoal(id);
    if (!goal) return res.status(404).json({ error: "Goal not found" });
    if (goal.userId !== null && goal.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    return res.json({ goal });
  } catch (err) {
    logger.warn({ err }, "GET /executive-goal/:id failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// ─── Update ───────────────────────────────────────────────────────────────────

router.put("/executive-goal/:id", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const id = String(req.params["id"] ?? "");
    const existing = await getGoal(id);
    if (!existing) return res.status(404).json({ error: "Goal not found" });
    if (existing.userId !== null && existing.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    const goal = await updateGoal(id, req.body);
    return res.json({ goal });
  } catch (err) {
    logger.warn({ err }, "PUT /executive-goal/:id failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// ─── Archive ──────────────────────────────────────────────────────────────────

router.delete("/executive-goal/:id", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const id = String(req.params["id"] ?? "");
    const existing = await getGoal(id);
    if (!existing) return res.status(404).json({ error: "Goal not found" });
    if (existing.userId !== null && existing.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    const goal = await archiveGoal(id);
    return res.json({ goal, archived: true });
  } catch (err) {
    logger.warn({ err }, "DELETE /executive-goal/:id failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// ─── Children ────────────────────────────────────────────────────────────────

router.get("/executive-goal/:id/children", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const id = String(req.params["id"] ?? "");
    const children = await listChildGoals(id);
    return res.json({ children, count: children.length });
  } catch (err) {
    logger.warn({ err }, "GET /executive-goal/:id/children failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// ─── Ancestry ────────────────────────────────────────────────────────────────

router.get("/executive-goal/:id/ancestry", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const id = String(req.params["id"] ?? "");
    const ancestry = await getGoalAncestry(id);
    return res.json({ ancestry });
  } catch (err) {
    logger.warn({ err }, "GET /executive-goal/:id/ancestry failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// ─── Progress update ──────────────────────────────────────────────────────────

router.put("/executive-goal/:id/progress", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const id = String(req.params["id"] ?? "");
    const existing = await getGoal(id);
    if (!existing) return res.status(404).json({ error: "Goal not found" });
    if (existing.userId !== null && existing.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    const { progressPct, status, note } = req.body;
    if (progressPct === undefined || typeof progressPct !== "number") {
      return res.status(400).json({ error: "progressPct (number) is required" });
    }
    const goal = await updateGoalProgress(id, { progressPct, status, note });
    return res.json({ goal });
  } catch (err) {
    logger.warn({ err }, "PUT /executive-goal/:id/progress failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// ─── Progress report ─────────────────────────────────────────────────────────

router.get("/executive-goal/:id/progress", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const id = String(req.params["id"] ?? "");
    const goal = await getGoal(id);
    if (!goal) return res.status(404).json({ error: "Goal not found" });
    if (goal.userId !== null && goal.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    const report = await buildProgressReport(id, goal.progressPct, goal.status);
    return res.json({ report });
  } catch (err) {
    logger.warn({ err }, "GET /executive-goal/:id/progress failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// ─── Progress history ─────────────────────────────────────────────────────────

router.get("/executive-goal/:id/history", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const id = String(req.params["id"] ?? "");
    const goal = await getGoal(id);
    if (!goal) return res.status(404).json({ error: "Goal not found" });
    if (goal.userId !== null && goal.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    const limitRaw = Number(req.query["limit"]);
    const limit = isNaN(limitRaw) || limitRaw <= 0 ? 50 : Math.min(limitRaw, 200);
    const history = await getProgressHistory(id, limit);
    return res.json({ history, count: history.length });
  } catch (err) {
    logger.warn({ err }, "GET /executive-goal/:id/history failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// ─── Dependencies ─────────────────────────────────────────────────────────────

router.post("/executive-goal/:id/dependencies", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const id = String(req.params["id"] ?? "");
    const existing = await getGoal(id);
    if (!existing) return res.status(404).json({ error: "Goal not found" });
    if (existing.userId !== null && existing.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    const { dependsOnGoalId, dependencyType, note } = req.body;
    if (!dependsOnGoalId) {
      return res.status(400).json({ error: "dependsOnGoalId is required" });
    }
    const dependency = await addDependency(id, { dependsOnGoalId, dependencyType, note });
    return res.status(201).json({ dependency });
  } catch (err) {
    logger.warn({ err }, "POST /executive-goal/:id/dependencies failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

router.get("/executive-goal/:id/dependencies", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const id = String(req.params["id"] ?? "");
    const dependencies = await getDependencies(id);
    return res.json({ dependencies, count: dependencies.length });
  } catch (err) {
    logger.warn({ err }, "GET /executive-goal/:id/dependencies failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

router.delete("/executive-goal/:id/dependencies/:depId", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const depId = String(req.params["depId"] ?? "");
    await removeDependency(depId);
    return res.json({ removed: true });
  } catch (err) {
    logger.warn({ err }, "DELETE /executive-goal/:id/dependencies/:depId failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// ─── Metrics ──────────────────────────────────────────────────────────────────

router.post("/executive-goal/:id/metrics", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const id = String(req.params["id"] ?? "");
    const existing = await getGoal(id);
    if (!existing) return res.status(404).json({ error: "Goal not found" });
    if (existing.userId !== null && existing.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    const { metricKey, metricValue, unit, targetValue } = req.body;
    if (!metricKey) return res.status(400).json({ error: "metricKey is required" });
    const metric = await addMetric(id, metricKey, metricValue ?? null, unit, targetValue);
    return res.status(201).json({ metric });
  } catch (err) {
    logger.warn({ err }, "POST /executive-goal/:id/metrics failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

router.get("/executive-goal/:id/metrics", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const id = String(req.params["id"] ?? "");
    const metrics = await getMetrics(id);
    return res.json({ metrics, count: metrics.length });
  } catch (err) {
    logger.warn({ err }, "GET /executive-goal/:id/metrics failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// ─── Link goals ───────────────────────────────────────────────────────────────

router.post("/executive-goal/:id/link/:targetId", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const id = String(req.params["id"] ?? "");
    const targetId = String(req.params["targetId"] ?? "");
    await linkGoals(id, targetId);
    return res.json({ linked: true, goalIds: [id, targetId] });
  } catch (err) {
    logger.warn({ err }, "POST /executive-goal/:id/link/:targetId failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

export default router;
