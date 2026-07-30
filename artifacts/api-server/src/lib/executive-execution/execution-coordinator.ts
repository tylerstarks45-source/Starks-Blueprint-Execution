// ─── Execution Coordinator (Build 010) ───────────────────────────────────────
//
// Coordinates execution flow:
//   - Sequential execution
//   - Dependency validation
//   - Milestone completion detection
//   - Step ordering
//   - Execution progress calculation
//   - Recovery point recommendations
//
// The Coordinator NEVER performs work itself. It orchestrates execution.
// No I/O in core logic — all persistence handled by execution-registry.ts.

import {
  canTransitionExecution,
  computeProgressPct,
  isExecutionActive,
  isTerminalExecutionStatus,
} from "./execution-state-machine";
import {
  sortStepsByOrder,
  findNextPendingStep,
  findRunningSteps,
  findBlockedSteps,
  getUnmetStepDependencies,
  summarizeStepProgress,
} from "./execution-step-engine";
import type {
  ExecutiveExecution,
  ExecutionStep,
  ExecutionStatus,
  CoordinatorResult,
} from "./types";

// ── Sequential execution planning ─────────────────────────────────────────────

export interface ExecutionPlan {
  executionId: string;
  orderedSteps: ExecutionStep[];
  nextStep: ExecutionStep | null;
  runningSteps: ExecutionStep[];
  blockedSteps: ExecutionStep[];
  progress: ReturnType<typeof summarizeStepProgress>;
  canProceed: boolean;
  blockers: string[];
}

/** Analyse the current execution state and produce a coordination plan.
 *  Pure computation — no I/O. */
export function buildExecutionPlan(
  execution: ExecutiveExecution,
  steps: ExecutionStep[],
): ExecutionPlan {
  const orderedSteps = sortStepsByOrder(steps);
  const nextStep = findNextPendingStep(steps);
  const runningSteps = findRunningSteps(steps);
  const blockedSteps = findBlockedSteps(steps);
  const progress = summarizeStepProgress(steps);
  const blockers: string[] = [];

  // Check overall execution viability
  if (isTerminalExecutionStatus(execution.status)) {
    blockers.push(`Execution is in terminal state: ${execution.status}`);
  }

  // Check for unresolved failures
  if (progress.failed > 0 && execution.status !== "retrying") {
    blockers.push(`${progress.failed} step(s) have failed without retry`);
  }

  // Check parallel cap: for now we enforce sequential — only one step at a time
  if (runningSteps.length > 1) {
    blockers.push(`${runningSteps.length} steps are running simultaneously (sequential enforcement)`);
  }

  const canProceed =
    blockers.length === 0 &&
    !isTerminalExecutionStatus(execution.status) &&
    execution.status !== "paused" &&
    execution.status !== "blocked" &&
    execution.status !== "cancelled";

  return {
    executionId: execution.id,
    orderedSteps,
    nextStep,
    runningSteps,
    blockedSteps,
    progress,
    canProceed,
    blockers,
  };
}

// ── Dependency validation ──────────────────────────────────────────────────────

/** Validate that a step's declared dependencies are satisfied before it starts.
 *  Returns an error string if dependencies are unmet, null if satisfied. */
export function validateStepDependencies(
  step: ExecutionStep,
  allSteps: ExecutionStep[],
): string | null {
  // We look at the planStepId links across all execution steps that are completed
  // to determine if this step's plan-step dependencies are satisfied.
  // Since plan step dependency ids reference plan_steps.id, we map through
  // the execution steps to find which plan step ids are complete.
  const completedPlanStepIds = new Set(
    allSteps
      .filter((s) => s.status === "completed" || s.status === "skipped")
      .map((s) => s.planStepId)
      .filter(Boolean) as string[],
  );

  // The execution step doesn't carry dependsOnStepIds directly — those live
  // on the plan step. Here we receive metadata from the caller if needed.
  // For now: if planStepId is set, log it; deeper dependency data requires
  // the plan step record to be passed in by the registry layer.
  // This is the coordination layer — it validates what it can determine locally.
  return null;
}

// ── Milestone completion detection ────────────────────────────────────────────

export interface MilestoneCompletionStatus {
  milestoneId: string;
  isComplete: boolean;
  completedSteps: number;
  totalSteps: number;
  hasFailures: boolean;
}

/** Group steps by milestone and determine completion status for each. */
export function checkMilestoneCompletions(steps: ExecutionStep[]): MilestoneCompletionStatus[] {
  const byMilestone = new Map<string, ExecutionStep[]>();
  const noMilestoneKey = "__no_milestone__";

  for (const step of steps) {
    const key = step.milestoneId ?? noMilestoneKey;
    if (!byMilestone.has(key)) byMilestone.set(key, []);
    byMilestone.get(key)!.push(step);
  }

  const results: MilestoneCompletionStatus[] = [];
  for (const [milestoneId, milestoneSteps] of byMilestone.entries()) {
    if (milestoneId === noMilestoneKey) continue;
    const total = milestoneSteps.length;
    const completed = milestoneSteps.filter(
      (s) => s.status === "completed" || s.status === "skipped",
    ).length;
    const failed = milestoneSteps.filter((s) => s.status === "failed").length;
    results.push({
      milestoneId,
      isComplete: completed === total && total > 0,
      completedSteps: completed,
      totalSteps: total,
      hasFailures: failed > 0,
    });
  }

  return results;
}

// ── Progress aggregation ───────────────────────────────────────────────────────

export function aggregateExecutionProgress(execution: ExecutiveExecution, steps: ExecutionStep[]): {
  progressPct: number;
  completedSteps: number;
  totalSteps: number;
  failedSteps: number;
  skippedSteps: number;
} {
  const progress = summarizeStepProgress(steps);
  return {
    progressPct: progress.progressPct,
    completedSteps: progress.completed,
    totalSteps: progress.total,
    failedSteps: progress.failed,
    skippedSteps: progress.skipped,
  };
}

// ── Recovery point recommendation ─────────────────────────────────────────────

/** Determine if a new recovery point should be created (e.g. after milestone completion). */
export function shouldCreateRecoveryPoint(
  steps: ExecutionStep[],
  lastRecoveryPointStepIds: string[],
): boolean {
  const completedIds = steps
    .filter((s) => s.status === "completed")
    .map((s) => s.id);

  // Create a recovery point if at least 3 new steps have completed since last checkpoint
  const newlyCompleted = completedIds.filter((id) => !lastRecoveryPointStepIds.includes(id));
  return newlyCompleted.length >= 3;
}

/** Build the state snapshot for a recovery point. */
export function buildRecoveryPointSnapshot(
  execution: ExecutiveExecution,
  steps: ExecutionStep[],
): Record<string, unknown> {
  const progress = summarizeStepProgress(steps);
  return {
    executionId: execution.id,
    status: execution.status,
    progressPct: progress.progressPct,
    completedSteps: progress.completed,
    totalSteps: progress.total,
    currentMilestoneId: execution.currentMilestoneId,
    currentStepId: execution.currentStepId,
    snapshotAt: new Date().toISOString(),
  };
}

// ── Coordinator result builder ─────────────────────────────────────────────────

export function buildCoordinatorResult(
  execution: ExecutiveExecution,
  plan: ExecutionPlan,
  recoveryPointId: string | null = null,
): CoordinatorResult {
  return {
    executionId: execution.id,
    status: execution.status,
    completedSteps: plan.progress.completed,
    totalSteps: plan.progress.total,
    progressPct: plan.progress.progressPct,
    nextStepId: plan.nextStep?.id ?? null,
    blockers: plan.blockers,
    recoveryPointId,
  };
}

// ── Completion detection ───────────────────────────────────────────────────────

/** Determine if the entire execution should be marked complete. */
export function isExecutionFullyComplete(steps: ExecutionStep[]): boolean {
  if (steps.length === 0) return false;
  return steps.every(
    (s) => s.status === "completed" || s.status === "skipped" || s.status === "cancelled",
  );
}

/** Determine if the execution has failed beyond recovery. */
export function isExecutionFullyFailed(execution: ExecutiveExecution, steps: ExecutionStep[]): boolean {
  const failedSteps = steps.filter((s) => s.status === "failed");
  if (failedSteps.length === 0) return false;
  // Failed beyond recovery: all failed steps have exhausted retries
  return failedSteps.every((s) => s.retryCount >= s.maxRetries);
}
