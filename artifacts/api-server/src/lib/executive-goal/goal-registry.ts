// ─── Goal Registry (Build 008) ────────────────────────────────────────────────
//
// CRUD operations for Executive Goals. The registry is the single source of
// truth for all goal persistence. Every goal-mutating operation goes through
// here so extension hooks fire consistently.

import {
  db,
  executiveGoalsTable,
  goalDependenciesTable,
  goalMetricsTable,
} from "@workspace/db";
import { and, asc, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { logger } from "../logger";
import { computePriorityScore } from "./goal-priority";
import { recordProgressSnapshot } from "./goal-progress";
import {
  GOAL_EXTENSION_POINT_IDS,
  fireGoalHooks,
} from "./goal-extension-points";
import type {
  ExecutiveGoal,
  GoalDependency,
  GoalMetric,
  CreateGoalInput,
  UpdateGoalInput,
  UpdateProgressInput,
  AddDependencyInput,
} from "./types";

// ─── Row mapper ───────────────────────────────────────────────────────────────

function rowToGoal(row: typeof executiveGoalsTable.$inferSelect): ExecutiveGoal {
  return {
    ...row,
    successCriteria: (row.successCriteria as string[]) ?? [],
    failureCriteria: (row.failureCriteria as string[]) ?? [],
    constraintsData: (row.constraintsData as string[]) ?? [],
    metricsDefinition: (row.metricsDefinition as Record<string, { unit?: string; target?: number; current?: number }>) ?? {},
    relatedContextIds: (row.relatedContextIds as string[]) ?? [],
    relatedJudgmentIds: (row.relatedJudgmentIds as string[]) ?? [],
    relatedArtifactIds: (row.relatedArtifactIds as string[]) ?? [],
    relatedClusterIds: (row.relatedClusterIds as string[]) ?? [],
    relatedGoalIds: (row.relatedGoalIds as string[]) ?? [],
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

function depRowToGoalDep(row: typeof goalDependenciesTable.$inferSelect): GoalDependency {
  return {
    id: row.id,
    goalId: row.goalId,
    dependsOnGoalId: row.dependsOnGoalId,
    dependencyType: row.dependencyType,
    note: row.note,
    createdAt: row.createdAt,
  };
}

function metricRowToGoalMetric(row: typeof goalMetricsTable.$inferSelect): GoalMetric {
  return {
    id: row.id,
    goalId: row.goalId,
    metricKey: row.metricKey,
    metricValue: row.metricValue,
    unit: row.unit,
    targetValue: row.targetValue,
    recordedAt: row.recordedAt,
  };
}

// ─── Priority helpers ─────────────────────────────────────────────────────────

function resolveTargetDate(input: Date | string | null | undefined): Date | null {
  if (!input) return null;
  if (input instanceof Date) return input;
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

function recalcPriority(
  dims: {
    importance: number; urgency: number; strategicValue: number;
    risk: number; opportunity: number; confidence: number;
  },
  targetDate: Date | null | undefined,
) {
  return computePriorityScore(dims, targetDate).priorityScore;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createGoal(input: CreateGoalInput): Promise<ExecutiveGoal> {
  const id = crypto.randomUUID();
  const targetDate = resolveTargetDate(input.targetDate);

  const dims = {
    importance:     Math.max(0, Math.min(100, input.importance     ?? 50)),
    urgency:        Math.max(0, Math.min(100, input.urgency        ?? 50)),
    strategicValue: Math.max(0, Math.min(100, input.strategicValue ?? 50)),
    risk:           Math.max(0, Math.min(100, input.risk           ?? 50)),
    opportunity:    Math.max(0, Math.min(100, input.opportunity    ?? 50)),
    confidence:     Math.max(0, Math.min(100, input.confidence     ?? 50)),
  };
  const priorityScore = recalcPriority(dims, targetDate);

  const [row] = await db
    .insert(executiveGoalsTable)
    .values({
      id,
      userId: input.userId,
      parentGoalId: input.parentGoalId ?? null,
      name: input.name,
      description: input.description ?? null,
      goalType: input.goalType ?? "operational",
      category: input.category ?? "custom",
      status: "not_started",
      version: 1,
      ...dims,
      priorityScore,
      progressPct: 0,
      ownerBrain: input.ownerBrain ?? null,
      successCriteria: input.successCriteria ?? [],
      failureCriteria: input.failureCriteria ?? [],
      constraintsData: input.constraints ?? [],
      metricsDefinition: input.metricsDefinition ?? {},
      relatedContextIds: input.relatedContextIds ?? [],
      relatedJudgmentIds: input.relatedJudgmentIds ?? [],
      relatedArtifactIds: input.relatedArtifactIds ?? [],
      relatedClusterIds: input.relatedClusterIds ?? [],
      relatedGoalIds: input.relatedGoalIds ?? [],
      targetDate,
      completionDate: null,
      metadata: input.metadata ?? {},
    })
    .returning();

  if (!row) throw new Error("Failed to create goal");
  const goal = rowToGoal(row);

  void fireGoalHooks(GOAL_EXTENSION_POINT_IDS.GOAL_CREATED, goal).catch(
    (err) => logger.warn({ err }, "Goal: GOAL_CREATED hook failed (non-fatal)"),
  );

  void fireGoalHooks(GOAL_EXTENSION_POINT_IDS.GOAL_PRIORITY_COMPUTED, {
    goalId: goal.id,
    priorityScore: goal.priorityScore,
    dimensions: dims,
  }).catch((err) => logger.warn({ err }, "Goal: GOAL_PRIORITY_COMPUTED hook failed (non-fatal)"));

  logger.debug({ goalId: id, name: input.name, priorityScore }, "Goal created");
  return goal;
}

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getGoal(id: string): Promise<ExecutiveGoal | null> {
  const rows = await db
    .select()
    .from(executiveGoalsTable)
    .where(eq(executiveGoalsTable.id, id))
    .limit(1);
  return rows[0] ? rowToGoal(rows[0]) : null;
}

export async function listGoals(
  userId: number,
  filters: { status?: string; category?: string; type?: string; limit?: number } = {},
): Promise<ExecutiveGoal[]> {
  const conditions = [eq(executiveGoalsTable.userId, userId)];
  if (filters.status) conditions.push(eq(executiveGoalsTable.status, filters.status));
  if (filters.category) conditions.push(eq(executiveGoalsTable.category, filters.category));
  if (filters.type) conditions.push(eq(executiveGoalsTable.goalType, filters.type));

  const rows = await db
    .select()
    .from(executiveGoalsTable)
    .where(and(...conditions))
    .orderBy(desc(executiveGoalsTable.priorityScore))
    .limit(filters.limit ?? 100);
  return rows.map(rowToGoal);
}

export async function listActiveGoals(userId: number): Promise<ExecutiveGoal[]> {
  return listGoals(userId, { status: "active", limit: 50 });
}

/** Return all root goals (no parent) for a user, ordered by priority. */
export async function listRootGoals(userId: number): Promise<ExecutiveGoal[]> {
  const rows = await db
    .select()
    .from(executiveGoalsTable)
    .where(
      and(
        eq(executiveGoalsTable.userId, userId),
        isNull(executiveGoalsTable.parentGoalId),
        ne(executiveGoalsTable.status, "cancelled"),
        ne(executiveGoalsTable.status, "completed"),
      ),
    )
    .orderBy(desc(executiveGoalsTable.priorityScore));
  return rows.map(rowToGoal);
}

/** Return direct children of a parent goal. */
export async function listChildGoals(parentGoalId: string): Promise<ExecutiveGoal[]> {
  const rows = await db
    .select()
    .from(executiveGoalsTable)
    .where(eq(executiveGoalsTable.parentGoalId, parentGoalId))
    .orderBy(desc(executiveGoalsTable.priorityScore));
  return rows.map(rowToGoal);
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateGoal(id: string, input: UpdateGoalInput): Promise<ExecutiveGoal | null> {
  const existing = await getGoal(id);
  if (!existing) return null;

  const previousStatus = existing.status;
  const previousParentId = existing.parentGoalId;

  const targetDate = input.targetDate !== undefined
    ? resolveTargetDate(input.targetDate)
    : existing.targetDate;

  // Merge dimensions — only recalculate if any dimension changed
  const dims = {
    importance:     input.importance     ?? existing.importance,
    urgency:        input.urgency        ?? existing.urgency,
    strategicValue: input.strategicValue ?? existing.strategicValue,
    risk:           input.risk           ?? existing.risk,
    opportunity:    input.opportunity    ?? existing.opportunity,
    confidence:     input.confidence     ?? existing.confidence,
  };
  const priorityScore = recalcPriority(dims, targetDate);

  // completionDate: set when transitioning to "completed"
  const newStatus = input.status ?? existing.status;
  const completionDate =
    newStatus === "completed" && existing.status !== "completed"
      ? new Date()
      : existing.completionDate;

  const [row] = await db
    .update(executiveGoalsTable)
    .set({
      ...(input.name !== undefined         && { name: input.name }),
      ...(input.description !== undefined  && { description: input.description }),
      ...(input.goalType !== undefined     && { goalType: input.goalType }),
      ...(input.category !== undefined     && { category: input.category }),
      ...(input.parentGoalId !== undefined && { parentGoalId: input.parentGoalId }),
      ...(input.status !== undefined       && { status: input.status }),
      ...(input.ownerBrain !== undefined   && { ownerBrain: input.ownerBrain }),
      ...(input.successCriteria !== undefined && { successCriteria: input.successCriteria }),
      ...(input.failureCriteria !== undefined && { failureCriteria: input.failureCriteria }),
      ...(input.constraints !== undefined  && { constraintsData: input.constraints }),
      ...(input.metricsDefinition !== undefined && { metricsDefinition: input.metricsDefinition }),
      ...(input.relatedContextIds !== undefined && { relatedContextIds: input.relatedContextIds }),
      ...(input.relatedJudgmentIds !== undefined && { relatedJudgmentIds: input.relatedJudgmentIds }),
      ...(input.relatedArtifactIds !== undefined && { relatedArtifactIds: input.relatedArtifactIds }),
      ...(input.relatedClusterIds !== undefined && { relatedClusterIds: input.relatedClusterIds }),
      ...(input.relatedGoalIds !== undefined && { relatedGoalIds: input.relatedGoalIds }),
      ...(input.metadata !== undefined     && { metadata: input.metadata }),
      ...dims,
      priorityScore,
      completionDate,
      targetDate,
      version: existing.version + 1,
    })
    .where(eq(executiveGoalsTable.id, id))
    .returning();

  if (!row) return null;
  const updated = rowToGoal(row);

  // Status change hook
  if (newStatus !== previousStatus) {
    void fireGoalHooks(GOAL_EXTENSION_POINT_IDS.GOAL_STATUS_CHANGED, {
      goal: updated,
      previousStatus,
      newStatus,
    }).catch((err) => logger.warn({ err }, "Goal: GOAL_STATUS_CHANGED hook failed (non-fatal)"));
  }

  // Hierarchy change hook
  if (input.parentGoalId !== undefined && input.parentGoalId !== previousParentId) {
    void fireGoalHooks(GOAL_EXTENSION_POINT_IDS.GOAL_HIERARCHY_CHANGED, {
      goalId: id,
      previousParentId,
      newParentId: input.parentGoalId ?? null,
    }).catch((err) => logger.warn({ err }, "Goal: GOAL_HIERARCHY_CHANGED hook failed (non-fatal)"));
  }

  void fireGoalHooks(GOAL_EXTENSION_POINT_IDS.GOAL_PRIORITY_COMPUTED, {
    goalId: id,
    priorityScore,
    dimensions: dims,
  }).catch((err) => logger.warn({ err }, "Goal: GOAL_PRIORITY_COMPUTED hook failed (non-fatal)"));

  logger.debug({ goalId: id, newStatus, priorityScore }, "Goal updated");
  return updated;
}

// ─── Progress update ──────────────────────────────────────────────────────────

export async function updateGoalProgress(
  id: string,
  input: UpdateProgressInput,
): Promise<ExecutiveGoal | null> {
  const existing = await getGoal(id);
  if (!existing) return null;

  const previousProgressPct = existing.progressPct;
  const newProgressPct = Math.max(0, Math.min(100, input.progressPct));
  const newStatus = input.status ?? existing.status;
  const completionDate =
    newProgressPct >= 100 && existing.progressPct < 100 ? new Date() : existing.completionDate;

  const [row] = await db
    .update(executiveGoalsTable)
    .set({
      progressPct: newProgressPct,
      status: newStatus,
      completionDate,
      version: existing.version + 1,
    })
    .where(eq(executiveGoalsTable.id, id))
    .returning();

  if (!row) return null;
  const updated = rowToGoal(row);

  // Record immutable history snapshot
  await recordProgressSnapshot(id, newProgressPct, newStatus, input.note).catch(
    (err) => logger.warn({ err }, "Goal: progress snapshot failed (non-fatal)"),
  );

  void fireGoalHooks(GOAL_EXTENSION_POINT_IDS.GOAL_PROGRESS_UPDATED, {
    goal: updated,
    previousProgressPct,
    newProgressPct,
  }).catch((err) => logger.warn({ err }, "Goal: GOAL_PROGRESS_UPDATED hook failed (non-fatal)"));

  if (newStatus !== existing.status) {
    void fireGoalHooks(GOAL_EXTENSION_POINT_IDS.GOAL_STATUS_CHANGED, {
      goal: updated,
      previousStatus: existing.status,
      newStatus,
    }).catch((err) => logger.warn({ err }, "Goal: GOAL_STATUS_CHANGED hook failed (non-fatal)"));
  }

  return updated;
}

// ─── Archive ──────────────────────────────────────────────────────────────────

/** Archive a goal — sets status to "cancelled" (soft delete). */
export async function archiveGoal(id: string): Promise<ExecutiveGoal | null> {
  return updateGoal(id, { status: "cancelled" });
}

// ─── Link goals ───────────────────────────────────────────────────────────────

/** Link goal A to goal B as a soft relational link (adds to relatedGoalIds). */
export async function linkGoals(goalAId: string, goalBId: string): Promise<void> {
  const [goalA, goalB] = await Promise.all([getGoal(goalAId), getGoal(goalBId)]);
  if (!goalA || !goalB) throw new Error("One or both goals not found");

  const updatedA = [...new Set([...goalA.relatedGoalIds, goalBId])];
  const updatedB = [...new Set([...goalB.relatedGoalIds, goalAId])];

  await Promise.all([
    db.update(executiveGoalsTable)
      .set({ relatedGoalIds: updatedA })
      .where(eq(executiveGoalsTable.id, goalAId)),
    db.update(executiveGoalsTable)
      .set({ relatedGoalIds: updatedB })
      .where(eq(executiveGoalsTable.id, goalBId)),
  ]);
}

// ─── Dependencies ─────────────────────────────────────────────────────────────

export async function addDependency(
  goalId: string,
  input: AddDependencyInput,
): Promise<GoalDependency> {
  const id = crypto.randomUUID();
  const [row] = await db
    .insert(goalDependenciesTable)
    .values({
      id,
      goalId,
      dependsOnGoalId: input.dependsOnGoalId,
      dependencyType: input.dependencyType ?? "requires",
      note: input.note ?? null,
    })
    .returning();
  if (!row) throw new Error("Failed to add dependency");
  return depRowToGoalDep(row);
}

export async function getDependencies(goalId: string): Promise<GoalDependency[]> {
  const rows = await db
    .select()
    .from(goalDependenciesTable)
    .where(eq(goalDependenciesTable.goalId, goalId));
  return rows.map(depRowToGoalDep);
}

export async function getAllDependencies(userGoalIds: string[]): Promise<GoalDependency[]> {
  if (userGoalIds.length === 0) return [];
  const rows = await db
    .select()
    .from(goalDependenciesTable)
    .where(inArray(goalDependenciesTable.goalId, userGoalIds));
  return rows.map(depRowToGoalDep);
}

export async function removeDependency(dependencyId: string): Promise<void> {
  await db
    .delete(goalDependenciesTable)
    .where(eq(goalDependenciesTable.id, dependencyId));
}

// ─── Hierarchy traversal ─────────────────────────────────────────────────────

/** Build the full goal tree for a user. Returns an array of root GoalTreeNodes. */
export async function getGoalHierarchy(userId: number) {
  const all = await db
    .select()
    .from(executiveGoalsTable)
    .where(
      and(
        eq(executiveGoalsTable.userId, userId),
        ne(executiveGoalsTable.status, "cancelled"),
      ),
    )
    .orderBy(asc(executiveGoalsTable.createdAt));

  const goals = all.map(rowToGoal);
  const byId = new Map(goals.map((g) => [g.id, g]));

  // Build children map
  const children = new Map<string | null, ExecutiveGoal[]>();
  for (const g of goals) {
    const parentKey = g.parentGoalId ?? null;
    const list = children.get(parentKey) ?? [];
    list.push(g);
    children.set(parentKey, list);
  }

  type TreeNode = { goal: ExecutiveGoal; children: TreeNode[]; depth: number };

  function buildTree(parentId: string | null, depth: number): TreeNode[] {
    return (children.get(parentId) ?? []).map((goal) => ({
      goal,
      children: buildTree(goal.id, depth + 1),
      depth,
    }));
  }

  return buildTree(null, 0);
}

/** Return ancestry chain for a goal (parent → grandparent → …). */
export async function getGoalAncestry(goalId: string): Promise<ExecutiveGoal[]> {
  const ancestry: ExecutiveGoal[] = [];
  let currentId: string | null = goalId;
  const visited = new Set<string>();

  while (currentId) {
    if (visited.has(currentId)) break; // guard against circular refs
    visited.add(currentId);
    const goal = await getGoal(currentId);
    if (!goal) break;
    if (goal.id !== goalId) ancestry.push(goal); // skip self
    currentId = goal.parentGoalId;
  }

  return ancestry;
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

export async function addMetric(
  goalId: string,
  metricKey: string,
  metricValue: number | null,
  unit?: string,
  targetValue?: number,
): Promise<GoalMetric> {
  const id = crypto.randomUUID();
  const [row] = await db
    .insert(goalMetricsTable)
    .values({ id, goalId, metricKey, metricValue: metricValue ?? null, unit: unit ?? null, targetValue: targetValue ?? null })
    .returning();
  if (!row) throw new Error("Failed to add metric");
  return metricRowToGoalMetric(row);
}

export async function getMetrics(goalId: string): Promise<GoalMetric[]> {
  const rows = await db
    .select()
    .from(goalMetricsTable)
    .where(eq(goalMetricsTable.goalId, goalId));
  return rows.map(metricRowToGoalMetric);
}

// ─── Diagnostics ─────────────────────────────────────────────────────────────

export async function buildGoalDiagnostics(userId: number) {
  const goals = await listGoals(userId);
  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};
  let totalPriority = 0;
  let totalProgress = 0;
  const now = Date.now();
  let overdueCount = 0;

  for (const g of goals) {
    byStatus[g.status] = (byStatus[g.status] ?? 0) + 1;
    byType[g.goalType] = (byType[g.goalType] ?? 0) + 1;
    totalPriority += g.priorityScore;
    totalProgress += g.progressPct;
    if (g.targetDate && g.targetDate.getTime() < now && g.status !== "completed" && g.status !== "cancelled") {
      overdueCount++;
    }
  }

  const topPriorityGoals = goals
    .filter((g) => g.status === "active" || g.status === "not_started")
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 5)
    .map((g) => ({ id: g.id, name: g.name, priorityScore: g.priorityScore }));

  return {
    userId,
    totalGoals: goals.length,
    byStatus,
    byType,
    averagePriorityScore: goals.length > 0 ? Math.round(totalPriority / goals.length) : 0,
    averageProgress: goals.length > 0 ? Math.round(totalProgress / goals.length) : 0,
    blockedCount: byStatus["blocked"] ?? 0,
    overdueCount,
    topPriorityGoals,
    assessedAt: new Date(),
  };
}
