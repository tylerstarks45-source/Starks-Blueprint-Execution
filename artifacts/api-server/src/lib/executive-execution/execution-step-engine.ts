// ─── Step Execution Engine (Build 010) ───────────────────────────────────────
//
// Manages execution of individual plan steps: start, complete, pause, resume,
// skip (manual only), retry, cancel.
// No I/O — delegates all persistence to execution-registry.ts.
// Pure orchestration: never performs the actual work, never calls adapters.

import { canTransitionStep, isTerminalStepStatus } from "./execution-state-machine";
import type {
  ExecutionStep,
  ExecutionStepStatus,
  TransitionStepInput,
} from "./types";

// ── Step transition helpers ────────────────────────────────────────────────────

/** Derive the field updates needed to transition a step to a new status. */
export function buildStepTransitionUpdate(
  step: ExecutionStep,
  toStatus: ExecutionStepStatus,
  opts: {
    failureReason?: string;
    skippedReason?: string;
    result?: Record<string, unknown>;
    now?: Date;
  } = {},
): Partial<ExecutionStep> & { status: ExecutionStepStatus } {
  const now = opts.now ?? new Date();

  const check = canTransitionStep(step.status, toStatus);
  if (!check.ok) {
    throw new Error(check.rejectedReason ?? `Invalid step transition ${step.status} → ${toStatus}`);
  }

  const update: Partial<ExecutionStep> & { status: ExecutionStepStatus } = { status: toStatus };

  switch (toStatus) {
    case "running":
      if (!step.startedAt) update.startedAt = now;
      break;

    case "paused":
      update.pausedAt = now;
      break;

    case "completed":
      update.completedAt = now;
      update.success = true;
      if (opts.result) update.adapterResult = opts.result;
      break;

    case "failed":
      update.completedAt = now;
      update.success = false;
      if (opts.failureReason) update.failureReason = opts.failureReason;
      if (opts.result) update.adapterResult = opts.result;
      break;

    case "skipped":
      update.completedAt = now;
      update.success = null;
      if (opts.skippedReason) update.skippedReason = opts.skippedReason;
      break;

    case "retrying":
      update.retryCount = (step.retryCount ?? 0) + 1;
      break;

    case "cancelled":
      update.completedAt = now;
      update.success = false;
      break;
  }

  return update;
}

// ── Step ordering ──────────────────────────────────────────────────────────────

/** Sort steps by orderIndex ascending (pure — returns new array). */
export function sortStepsByOrder(steps: ExecutionStep[]): ExecutionStep[] {
  return [...steps].sort((a, b) => a.orderIndex - b.orderIndex);
}

/** Return the next pending step in order, skipping terminal steps. */
export function findNextPendingStep(steps: ExecutionStep[]): ExecutionStep | null {
  const sorted = sortStepsByOrder(steps);
  return sorted.find((s) => s.status === "pending") ?? null;
}

/** Return all currently running steps. */
export function findRunningSteps(steps: ExecutionStep[]): ExecutionStep[] {
  return steps.filter((s) => s.status === "running");
}

/** Return all failed/retrying steps that need attention. */
export function findBlockedSteps(steps: ExecutionStep[]): ExecutionStep[] {
  return steps.filter((s) => s.status === "failed" || s.status === "retrying");
}

// ── Dependency validation ──────────────────────────────────────────────────────

/**
 * Check whether a step's declared plan-step dependencies are satisfied
 * by the set of already-completed step IDs.
 * Returns a list of unmet dependency step IDs (empty = all met).
 */
export function getUnmetStepDependencies(
  planStepDependsOnIds: string[],
  completedPlanStepIds: Set<string>,
): string[] {
  return planStepDependsOnIds.filter((id) => !completedPlanStepIds.has(id));
}

// ── Retry eligibility ─────────────────────────────────────────────────────────

export function canRetryStep(step: ExecutionStep): boolean {
  return step.status === "failed" && step.retryCount < step.maxRetries;
}

// ── Transition input builder ───────────────────────────────────────────────────

/** Convenience: build a TransitionStepInput for common operations. */
export function buildStartStepInput(stepId: string, triggeredBy = "coordinator"): TransitionStepInput {
  return { stepId, toStatus: "running", triggeredBy };
}

export function buildCompleteStepInput(
  stepId: string,
  result?: Record<string, unknown>,
  triggeredBy = "coordinator",
): TransitionStepInput {
  return { stepId, toStatus: "completed", triggeredBy, result };
}

export function buildFailStepInput(
  stepId: string,
  failureReason: string,
  triggeredBy = "coordinator",
): TransitionStepInput {
  return { stepId, toStatus: "failed", triggeredBy, failureReason };
}

export function buildSkipStepInput(stepId: string, skippedReason: string): TransitionStepInput {
  return { stepId, toStatus: "skipped", triggeredBy: "user", skippedReason };
}

export function buildRetryStepInput(stepId: string, triggeredBy = "coordinator"): TransitionStepInput {
  return { stepId, toStatus: "retrying", triggeredBy };
}

export function buildPauseStepInput(stepId: string, triggeredBy = "coordinator"): TransitionStepInput {
  return { stepId, toStatus: "paused", triggeredBy };
}

export function buildResumeStepInput(stepId: string, triggeredBy = "coordinator"): TransitionStepInput {
  return { stepId, toStatus: "running", triggeredBy };
}

export function buildCancelStepInput(stepId: string, triggeredBy = "user"): TransitionStepInput {
  return { stepId, toStatus: "cancelled", triggeredBy };
}

// ── Progress summary ───────────────────────────────────────────────────────────

export interface StepProgressSummary {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  skipped: number;
  cancelled: number;
  retrying: number;
  paused: number;
  progressPct: number;
}

export function summarizeStepProgress(steps: ExecutionStep[]): StepProgressSummary {
  const total = steps.length;
  const byStatus = {
    pending: 0, running: 0, completed: 0, failed: 0,
    skipped: 0, cancelled: 0, retrying: 0, paused: 0,
  };
  for (const s of steps) {
    if (s.status in byStatus) byStatus[s.status as keyof typeof byStatus]++;
  }
  const done = byStatus.completed + byStatus.skipped;
  const progressPct = total === 0 ? 0 : Math.min(100, Math.round((done / total) * 100));
  return { total, ...byStatus, progressPct };
}
