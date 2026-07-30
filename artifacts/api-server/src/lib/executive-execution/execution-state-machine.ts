// ─── Execution State Machine (Build 010) ─────────────────────────────────────
//
// Deterministic state machine for execution lifecycle.
// Illegal transitions are rejected with an explicit reason.
// No I/O — pure computation only.

import type { ExecutionStatus, ExecutionStepStatus, ExecutionTransitionResult } from "./types";

// ── Valid execution transitions ───────────────────────────────────────────────
//
//  pending   → approved, cancelled
//  approved  → running, cancelled
//  running   → waiting, paused, blocked, retrying, completed, failed, cancelled
//  waiting   → running, cancelled, failed
//  paused    → running, cancelled
//  blocked   → running, cancelled, failed
//  retrying  → running, failed, cancelled
//  completed → (terminal)
//  failed    → retrying, cancelled
//  cancelled → (terminal)

const VALID_EXECUTION_TRANSITIONS: Record<ExecutionStatus, ExecutionStatus[]> = {
  pending:   ["approved", "cancelled"],
  approved:  ["running", "cancelled"],
  running:   ["waiting", "paused", "blocked", "retrying", "completed", "failed", "cancelled"],
  waiting:   ["running", "cancelled", "failed"],
  paused:    ["running", "cancelled"],
  blocked:   ["running", "cancelled", "failed"],
  retrying:  ["running", "failed", "cancelled"],
  completed: [],
  failed:    ["retrying", "cancelled"],
  cancelled: [],
};

// ── Valid step transitions ─────────────────────────────────────────────────────

const VALID_STEP_TRANSITIONS: Record<ExecutionStepStatus, ExecutionStepStatus[]> = {
  pending:   ["running", "skipped", "cancelled"],
  running:   ["paused", "completed", "failed", "retrying", "cancelled"],
  paused:    ["running", "cancelled"],
  completed: [],
  failed:    ["retrying", "cancelled"],
  skipped:   [],
  retrying:  ["running", "failed", "cancelled"],
  cancelled: [],
};

const TERMINAL_EXECUTION_STATUSES: ExecutionStatus[] = ["completed", "failed", "cancelled"];
const TERMINAL_STEP_STATUSES: ExecutionStepStatus[] = ["completed", "failed", "skipped", "cancelled"];

// ── Execution transition ───────────────────────────────────────────────────────

export function canTransitionExecution(
  from: ExecutionStatus,
  to: ExecutionStatus,
): ExecutionTransitionResult {
  if (from === to) {
    return { ok: false, rejectedReason: `Execution is already in status '${from}'` };
  }
  const allowed = VALID_EXECUTION_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    return {
      ok: false,
      rejectedReason: `Illegal execution transition: ${from} → ${to}. Allowed: [${allowed.join(", ") || "none (terminal)"}]`,
    };
  }
  return { ok: true, newStatus: to };
}

export function isTerminalExecutionStatus(status: ExecutionStatus): boolean {
  return TERMINAL_EXECUTION_STATUSES.includes(status);
}

export function getValidExecutionTransitions(from: ExecutionStatus): ExecutionStatus[] {
  return [...(VALID_EXECUTION_TRANSITIONS[from] ?? [])];
}

// ── Step transition ────────────────────────────────────────────────────────────

export function canTransitionStep(
  from: ExecutionStepStatus,
  to: ExecutionStepStatus,
): { ok: boolean; rejectedReason?: string } {
  if (from === to) {
    return { ok: false, rejectedReason: `Step is already in status '${from}'` };
  }
  const allowed = VALID_STEP_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    return {
      ok: false,
      rejectedReason: `Illegal step transition: ${from} → ${to}. Allowed: [${allowed.join(", ") || "none (terminal)"}]`,
    };
  }
  return { ok: true };
}

export function isTerminalStepStatus(status: ExecutionStepStatus): boolean {
  return TERMINAL_STEP_STATUSES.includes(status);
}

export function getValidStepTransitions(from: ExecutionStepStatus): ExecutionStepStatus[] {
  return [...(VALID_STEP_TRANSITIONS[from] ?? [])];
}

// ── Derived state helpers ──────────────────────────────────────────────────────

/** Returns true if the execution is active (progressing or waiting) */
export function isExecutionActive(status: ExecutionStatus): boolean {
  return ["running", "waiting", "retrying"].includes(status);
}

/** Returns true if the execution can be resumed from its current state */
export function canResumeExecution(status: ExecutionStatus): boolean {
  return ["paused", "blocked", "waiting"].includes(status);
}

/** Returns true if the execution may be retried */
export function canRetryExecution(status: ExecutionStatus, retryCount: number, maxRetries: number): boolean {
  return status === "failed" && retryCount < maxRetries;
}

/** Computes the progress % from step counts */
export function computeProgressPct(completedSteps: number, skippedSteps: number, totalSteps: number): number {
  if (totalSteps === 0) return 0;
  const done = completedSteps + skippedSteps;
  return Math.min(100, Math.round((done / totalSteps) * 100));
}
