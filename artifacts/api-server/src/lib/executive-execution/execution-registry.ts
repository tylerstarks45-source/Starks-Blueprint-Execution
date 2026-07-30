// ─── Execution Registry (Build 010) ──────────────────────────────────────────
//
// All persistence for the Execution Engine.
// CRUD + state transitions + step management + recovery points + metrics.
// Every write fires the appropriate extension point hook.

import { randomUUID } from "crypto";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import {
  db,
  executiveExecutionsTable,
  executionStepsTable,
  executionHistoryTable,
  executionMetricsTable,
  executionRecoveryPointsTable,
  executionRelationshipsTable,
} from "@workspace/db";
import { logger } from "../logger";
import { canTransitionExecution, canTransitionStep, computeProgressPct } from "./execution-state-machine";
import {
  sortStepsByOrder,
  summarizeStepProgress,
  buildStepTransitionUpdate,
} from "./execution-step-engine";
import {
  recordExecutionCreated,
  recordExecutionEvent,
  recordStepStarted,
  recordStepCompleted,
  recordStepFailed,
  recordStepSkipped,
  recordStepRetried,
  recordRecoveryPointCreated,
} from "./execution-history";
import {
  fireExecutionHooks,
  EXECUTION_EXTENSION_POINT_IDS,
} from "./execution-extension-points";
import {
  buildRecoveryPointSnapshot,
  buildExecutionPlan,
} from "./execution-coordinator";
import type {
  ExecutiveExecution,
  ExecutionStep,
  ExecutionMetric,
  ExecutionRecoveryPoint,
  ExecutionRelationship,
  ExecutionStatus,
  ExecutionStepStatus,
  ExecutionDiagnostics,
  CreateExecutionInput,
  CreateExecutionStepInput,
  TransitionExecutionInput,
  TransitionStepInput,
} from "./types";

// ── Row mappers ────────────────────────────────────────────────────────────────

function mapExecutionRow(row: typeof executiveExecutionsTable.$inferSelect): ExecutiveExecution {
  return {
    id: row.id,
    userId: row.userId ?? null,
    planId: row.planId ?? null,
    goalId: row.goalId ?? null,
    judgmentId: row.judgmentId ?? null,
    contextSnapshotId: row.contextSnapshotId ?? null,
    parentExecutionId: row.parentExecutionId ?? null,
    currentMilestoneId: row.currentMilestoneId ?? null,
    currentStepId: row.currentStepId ?? null,
    status: row.status as ExecutionStatus,
    previousStatus: row.previousStatus ?? null,
    progressPct: row.progressPct,
    totalSteps: row.totalSteps,
    completedSteps: row.completedSteps,
    failedSteps: row.failedSteps,
    skippedSteps: row.skippedSteps,
    retryCount: row.retryCount,
    maxRetries: row.maxRetries,
    success: row.success ?? null,
    failureReason: row.failureReason ?? null,
    cancellationReason: row.cancellationReason ?? null,
    startedAt: row.startedAt ?? null,
    completedAt: row.completedAt ?? null,
    pausedAt: row.pausedAt ?? null,
    resumedAt: row.resumedAt ?? null,
    relatedMemoryIds: (row.relatedMemoryIds as string[]) ?? [],
    relatedContextIds: (row.relatedContextIds as string[]) ?? [],
    relatedJudgmentIds: (row.relatedJudgmentIds as string[]) ?? [],
    relatedPlanIds: (row.relatedPlanIds as string[]) ?? [],
    relatedGoalIds: (row.relatedGoalIds as string[]) ?? [],
    adapterType: row.adapterType ?? null,
    adapterPayload: (row.adapterPayload as Record<string, unknown>) ?? {},
    adapterResult: (row.adapterResult as Record<string, unknown>) ?? {},
    version: row.version,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapStepRow(row: typeof executionStepsTable.$inferSelect): ExecutionStep {
  return {
    id: row.id,
    executionId: row.executionId,
    planStepId: row.planStepId ?? null,
    milestoneId: row.milestoneId ?? null,
    name: row.name,
    description: row.description ?? null,
    status: row.status as ExecutionStepStatus,
    orderIndex: row.orderIndex,
    retryCount: row.retryCount,
    maxRetries: row.maxRetries,
    success: row.success ?? null,
    failureReason: row.failureReason ?? null,
    skippedReason: row.skippedReason ?? null,
    adapterType: row.adapterType ?? null,
    adapterPayload: (row.adapterPayload as Record<string, unknown>) ?? {},
    adapterResult: (row.adapterResult as Record<string, unknown>) ?? {},
    startedAt: row.startedAt ?? null,
    completedAt: row.completedAt ?? null,
    pausedAt: row.pausedAt ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapMetricRow(row: typeof executionMetricsTable.$inferSelect): ExecutionMetric {
  return {
    id: row.id,
    executionId: row.executionId,
    stepId: row.stepId ?? null,
    metricKey: row.metricKey,
    metricValue: row.metricValue ?? null,
    unit: row.unit ?? null,
    targetValue: row.targetValue ?? null,
    recordedAt: row.recordedAt,
  };
}

function mapRecoveryRow(row: typeof executionRecoveryPointsTable.$inferSelect): ExecutionRecoveryPoint {
  return {
    id: row.id,
    executionId: row.executionId,
    label: row.label,
    description: row.description ?? null,
    stateSnapshot: (row.stateSnapshot as Record<string, unknown>) ?? {},
    completedStepIds: (row.completedStepIds as string[]) ?? [],
    isActive: row.isActive,
    createdAt: row.createdAt,
  };
}

function mapRelationshipRow(row: typeof executionRelationshipsTable.$inferSelect): ExecutionRelationship {
  return {
    id: row.id,
    sourceExecutionId: row.sourceExecutionId,
    targetId: row.targetId,
    targetType: row.targetType,
    relationshipType: row.relationshipType,
    note: row.note ?? null,
    createdAt: row.createdAt,
  };
}

// ── Execution CRUD ─────────────────────────────────────────────────────────────

export async function createExecution(input: CreateExecutionInput): Promise<ExecutiveExecution> {
  const id = randomUUID();
  const row = await db
    .insert(executiveExecutionsTable)
    .values({
      id,
      userId: input.userId,
      planId: input.planId ?? null,
      goalId: input.goalId ?? null,
      judgmentId: input.judgmentId ?? null,
      contextSnapshotId: input.contextSnapshotId ?? null,
      parentExecutionId: input.parentExecutionId ?? null,
      maxRetries: input.maxRetries ?? 3,
      adapterType: input.adapterType ?? null,
      adapterPayload: input.adapterPayload ?? {},
      relatedMemoryIds: input.relatedMemoryIds ?? [],
      relatedContextIds: input.relatedContextIds ?? [],
      relatedJudgmentIds: input.relatedJudgmentIds ?? [],
      relatedPlanIds: input.relatedPlanIds ?? [],
      relatedGoalIds: input.relatedGoalIds ?? [],
      metadata: input.metadata ?? {},
    })
    .returning()
    .then((rows) => rows[0]!);

  const execution = mapExecutionRow(row);

  // Record creation event in history (fire-and-forget — non-blocking)
  void recordExecutionCreated(id, { planId: input.planId, goalId: input.goalId }).catch((err) => {
    logger.warn({ err, executionId: id }, "Failed to record execution created event (non-fatal)");
  });

  return execution;
}

export async function getExecution(id: string): Promise<ExecutiveExecution | null> {
  const row = await db
    .select()
    .from(executiveExecutionsTable)
    .where(eq(executiveExecutionsTable.id, id))
    .limit(1)
    .then((rows) => rows[0] ?? null);
  return row ? mapExecutionRow(row) : null;
}

export async function listExecutions(opts: {
  userId?: number;
  planId?: string;
  goalId?: string;
  status?: ExecutionStatus;
  parentExecutionId?: string;
  limit?: number;
}): Promise<ExecutiveExecution[]> {
  const { and: drizzleAnd, eq: drizzleEq } = await import("drizzle-orm");
  const conditions = [];
  if (opts.userId != null) conditions.push(drizzleEq(executiveExecutionsTable.userId, opts.userId));
  if (opts.planId) conditions.push(drizzleEq(executiveExecutionsTable.planId, opts.planId));
  if (opts.goalId) conditions.push(drizzleEq(executiveExecutionsTable.goalId, opts.goalId));
  if (opts.status) conditions.push(drizzleEq(executiveExecutionsTable.status, opts.status));
  if (opts.parentExecutionId) conditions.push(drizzleEq(executiveExecutionsTable.parentExecutionId, opts.parentExecutionId));

  const rows = await db
    .select()
    .from(executiveExecutionsTable)
    .where(conditions.length > 0 ? drizzleAnd(...conditions) : undefined)
    .orderBy(desc(executiveExecutionsTable.createdAt))
    .limit(opts.limit ?? 50);
  return rows.map(mapExecutionRow);
}

export async function listActiveExecutions(userId: number): Promise<ExecutiveExecution[]> {
  const activeStatuses = ["pending", "approved", "running", "waiting", "paused", "blocked", "retrying"] as const;
  const rows = await db
    .select()
    .from(executiveExecutionsTable)
    .where(
      and(
        eq(executiveExecutionsTable.userId, userId),
        inArray(executiveExecutionsTable.status, [...activeStatuses]),
      ),
    )
    .orderBy(desc(executiveExecutionsTable.createdAt))
    .limit(20);
  return rows.map(mapExecutionRow);
}

// ── State transitions ──────────────────────────────────────────────────────────

export async function transitionExecution(input: TransitionExecutionInput): Promise<ExecutiveExecution> {
  const execution = await getExecution(input.executionId);
  if (!execution) throw new Error(`Execution not found: ${input.executionId}`);

  const check = canTransitionExecution(execution.status, input.toStatus);
  if (!check.ok) throw new Error(check.rejectedReason ?? "Invalid transition");

  const now = new Date();
  const updates: Partial<typeof executiveExecutionsTable.$inferInsert> = {
    status: input.toStatus,
    previousStatus: execution.status,
    updatedAt: now,
    version: execution.version + 1,
  };

  // Apply status-specific field updates
  switch (input.toStatus) {
    case "running":
      if (!execution.startedAt) updates.startedAt = now;
      if (execution.status === "paused") updates.resumedAt = now;
      break;
    case "paused":
      updates.pausedAt = now;
      break;
    case "completed":
      updates.completedAt = now;
      updates.success = true;
      updates.progressPct = 100;
      break;
    case "failed":
      updates.completedAt = now;
      updates.success = false;
      if (input.note) updates.failureReason = input.note;
      break;
    case "cancelled":
      updates.completedAt = now;
      updates.success = false;
      if (input.note) updates.cancellationReason = input.note;
      break;
    case "retrying":
      updates.retryCount = execution.retryCount + 1;
      break;
  }

  const updated = await db
    .update(executiveExecutionsTable)
    .set(updates)
    .where(eq(executiveExecutionsTable.id, input.executionId))
    .returning()
    .then((rows) => rows[0]!);

  const result = mapExecutionRow(updated);

  // Record history (non-blocking)
  void recordExecutionEvent({
    executionId: input.executionId,
    eventType: input.toStatus as any,
    fromStatus: execution.status,
    toStatus: input.toStatus,
    note: input.note,
    triggeredBy: input.triggeredBy ?? "system",
    snapshot: input.snapshot,
  }).catch((err) => {
    logger.warn({ err, executionId: input.executionId }, "History record failed (non-fatal)");
  });

  // Fire extension point hooks (non-blocking)
  const epId =
    input.toStatus === "running" && execution.status === "approved" ? EXECUTION_EXTENSION_POINT_IDS.EXECUTION_STARTED :
    input.toStatus === "running" && execution.status !== "approved" ? EXECUTION_EXTENSION_POINT_IDS.EXECUTION_RESUMED :
    input.toStatus === "completed"  ? EXECUTION_EXTENSION_POINT_IDS.EXECUTION_COMPLETED :
    input.toStatus === "failed"     ? EXECUTION_EXTENSION_POINT_IDS.EXECUTION_FAILED :
    input.toStatus === "paused"     ? EXECUTION_EXTENSION_POINT_IDS.EXECUTION_PAUSED :
    input.toStatus === "cancelled"  ? EXECUTION_EXTENSION_POINT_IDS.EXECUTION_CANCELLED :
    input.toStatus === "retrying"   ? EXECUTION_EXTENSION_POINT_IDS.EXECUTION_RETRY_TRIGGERED :
    null;

  if (epId) {
    void fireExecutionHooks(epId, result).catch((err) => {
      logger.warn({ err, epId }, "Execution hook failed (non-fatal)");
    });
  }

  return result;
}

// ── Step CRUD ──────────────────────────────────────────────────────────────────

export async function createExecutionStep(input: CreateExecutionStepInput): Promise<ExecutionStep> {
  const id = randomUUID();
  const row = await db
    .insert(executionStepsTable)
    .values({
      id,
      executionId: input.executionId,
      planStepId: input.planStepId ?? null,
      milestoneId: input.milestoneId ?? null,
      name: input.name,
      description: input.description ?? null,
      orderIndex: input.orderIndex ?? 0,
      maxRetries: input.maxRetries ?? 3,
      adapterType: input.adapterType ?? null,
      adapterPayload: input.adapterPayload ?? {},
      metadata: input.metadata ?? {},
    })
    .returning()
    .then((rows) => rows[0]!);

  // Update totalSteps count on the parent execution
  await db
    .update(executiveExecutionsTable)
    .set({ totalSteps: sql`${executiveExecutionsTable.totalSteps} + 1` })
    .where(eq(executiveExecutionsTable.id, input.executionId));

  return mapStepRow(row);
}

export async function getExecutionStep(stepId: string): Promise<ExecutionStep | null> {
  const row = await db
    .select()
    .from(executionStepsTable)
    .where(eq(executionStepsTable.id, stepId))
    .limit(1)
    .then((rows) => rows[0] ?? null);
  return row ? mapStepRow(row) : null;
}

export async function getExecutionSteps(executionId: string): Promise<ExecutionStep[]> {
  const rows = await db
    .select()
    .from(executionStepsTable)
    .where(eq(executionStepsTable.executionId, executionId))
    .orderBy(executionStepsTable.orderIndex);
  return rows.map(mapStepRow);
}

export async function transitionStep(input: TransitionStepInput): Promise<ExecutionStep> {
  const step = await getExecutionStep(input.stepId);
  if (!step) throw new Error(`Execution step not found: ${input.stepId}`);

  const check = canTransitionStep(step.status, input.toStatus);
  if (!check.ok) throw new Error(check.rejectedReason ?? "Invalid step transition");

  const now = new Date();
  const delta = buildStepTransitionUpdate(step, input.toStatus, {
    failureReason: input.failureReason,
    skippedReason: input.skippedReason,
    result: input.result,
    now,
  });

  const updated = await db
    .update(executionStepsTable)
    .set({ ...delta, updatedAt: now })
    .where(eq(executionStepsTable.id, input.stepId))
    .returning()
    .then((rows) => rows[0]!);

  const result = mapStepRow(updated);

  // Update parent execution counts
  await refreshExecutionProgress(step.executionId);

  // Record history (non-blocking)
  const histRecorder =
    input.toStatus === "running"   ? () => recordStepStarted(step.executionId, input.stepId, input.triggeredBy) :
    input.toStatus === "completed" ? () => recordStepCompleted(step.executionId, input.stepId, input.triggeredBy) :
    input.toStatus === "failed"    ? () => recordStepFailed(step.executionId, input.stepId, input.failureReason ?? "unknown", input.triggeredBy) :
    input.toStatus === "skipped"   ? () => recordStepSkipped(step.executionId, input.stepId, input.skippedReason ?? "manual skip", input.triggeredBy) :
    input.toStatus === "retrying"  ? () => recordStepRetried(step.executionId, input.stepId, result.retryCount, input.triggeredBy) :
    null;

  if (histRecorder) {
    void histRecorder().catch((err) => {
      logger.warn({ err, stepId: input.stepId }, "Step history record failed (non-fatal)");
    });
  }

  // Fire extension points (non-blocking)
  const epId =
    input.toStatus === "running"   ? EXECUTION_EXTENSION_POINT_IDS.EXECUTION_STEP_STARTED :
    input.toStatus === "completed" ? EXECUTION_EXTENSION_POINT_IDS.EXECUTION_STEP_COMPLETED :
    input.toStatus === "failed"    ? EXECUTION_EXTENSION_POINT_IDS.EXECUTION_STEP_FAILED :
    input.toStatus === "retrying"  ? EXECUTION_EXTENSION_POINT_IDS.EXECUTION_RETRY_TRIGGERED :
    null;

  if (epId) {
    void fireExecutionHooks(epId, { executionId: step.executionId, step: result, failureReason: input.failureReason }).catch((err) => {
      logger.warn({ err, epId }, "Step hook failed (non-fatal)");
    });
  }

  return result;
}

/** Recompute completedSteps / failedSteps / skippedSteps / progressPct from actual step rows. */
async function refreshExecutionProgress(executionId: string): Promise<void> {
  const steps = await getExecutionSteps(executionId);
  const summary = summarizeStepProgress(steps);
  await db
    .update(executiveExecutionsTable)
    .set({
      completedSteps: summary.completed,
      failedSteps: summary.failed,
      skippedSteps: summary.skipped,
      totalSteps: summary.total,
      progressPct: summary.progressPct,
    })
    .where(eq(executiveExecutionsTable.id, executionId));
}

// ── Metrics ────────────────────────────────────────────────────────────────────

export async function addExecutionMetric(input: {
  executionId: string;
  stepId?: string;
  metricKey: string;
  metricValue?: number;
  unit?: string;
  targetValue?: number;
}): Promise<ExecutionMetric> {
  const row = await db
    .insert(executionMetricsTable)
    .values({ id: randomUUID(), ...input, stepId: input.stepId ?? null })
    .returning()
    .then((rows) => rows[0]!);
  return mapMetricRow(row);
}

export async function getExecutionMetrics(executionId: string): Promise<ExecutionMetric[]> {
  const rows = await db
    .select()
    .from(executionMetricsTable)
    .where(eq(executionMetricsTable.executionId, executionId))
    .orderBy(desc(executionMetricsTable.recordedAt));
  return rows.map(mapMetricRow);
}

// ── Recovery points ────────────────────────────────────────────────────────────

export async function createRecoveryPoint(input: {
  executionId: string;
  label: string;
  description?: string;
  execution: ExecutiveExecution;
  steps: ExecutionStep[];
}): Promise<ExecutionRecoveryPoint> {
  const stateSnapshot = buildRecoveryPointSnapshot(input.execution, input.steps);
  const completedStepIds = input.steps
    .filter((s) => s.status === "completed")
    .map((s) => s.id);

  const row = await db
    .insert(executionRecoveryPointsTable)
    .values({
      id: randomUUID(),
      executionId: input.executionId,
      label: input.label,
      description: input.description ?? null,
      stateSnapshot,
      completedStepIds,
    })
    .returning()
    .then((rows) => rows[0]!);

  void recordRecoveryPointCreated(input.executionId, input.label).catch(() => {});

  return mapRecoveryRow(row);
}

export async function getRecoveryPoints(executionId: string): Promise<ExecutionRecoveryPoint[]> {
  const rows = await db
    .select()
    .from(executionRecoveryPointsTable)
    .where(eq(executionRecoveryPointsTable.executionId, executionId))
    .orderBy(desc(executionRecoveryPointsTable.createdAt));
  return rows.map(mapRecoveryRow);
}

export async function getLatestRecoveryPoint(executionId: string): Promise<ExecutionRecoveryPoint | null> {
  const rows = await db
    .select()
    .from(executionRecoveryPointsTable)
    .where(
      and(
        eq(executionRecoveryPointsTable.executionId, executionId),
        eq(executionRecoveryPointsTable.isActive, true),
      ),
    )
    .orderBy(desc(executionRecoveryPointsTable.createdAt))
    .limit(1);
  return rows[0] ? mapRecoveryRow(rows[0]) : null;
}

// ── Relationships ──────────────────────────────────────────────────────────────

export async function addExecutionRelationship(input: {
  sourceExecutionId: string;
  targetId: string;
  targetType: string;
  relationshipType?: string;
  note?: string;
}): Promise<ExecutionRelationship> {
  const row = await db
    .insert(executionRelationshipsTable)
    .values({
      id: randomUUID(),
      sourceExecutionId: input.sourceExecutionId,
      targetId: input.targetId,
      targetType: input.targetType,
      relationshipType: input.relationshipType ?? "related",
      note: input.note ?? null,
    })
    .returning()
    .then((rows) => rows[0]!);
  return mapRelationshipRow(row);
}

export async function getExecutionRelationships(executionId: string): Promise<ExecutionRelationship[]> {
  const rows = await db
    .select()
    .from(executionRelationshipsTable)
    .where(eq(executionRelationshipsTable.sourceExecutionId, executionId))
    .orderBy(desc(executionRelationshipsTable.createdAt));
  return rows.map(mapRelationshipRow);
}

// ── Diagnostics ────────────────────────────────────────────────────────────────

export async function getExecutionDiagnostics(userId?: number): Promise<ExecutionDiagnostics> {
  const whereClause = userId != null ? eq(executiveExecutionsTable.userId, userId) : undefined;
  const rows = await db.select().from(executiveExecutionsTable).where(whereClause);
  const byStatus: Record<string, number> = {};
  let totalProgress = 0;
  let retriedCount = 0;

  for (const row of rows) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
    totalProgress += row.progressPct;
    if (row.retryCount > 0) retriedCount++;
  }

  const total = rows.length;
  const activeStatuses = ["pending", "approved", "running", "waiting", "paused", "blocked", "retrying"];
  const activeCount = activeStatuses.reduce((sum, s) => sum + (byStatus[s] ?? 0), 0);

  return {
    total,
    byStatus,
    activeCount,
    completedCount: byStatus["completed"] ?? 0,
    failedCount: byStatus["failed"] ?? 0,
    cancelledCount: byStatus["cancelled"] ?? 0,
    averageProgressPct: total > 0 ? Math.round(totalProgress / total) : 0,
    retriedCount,
  };
}
