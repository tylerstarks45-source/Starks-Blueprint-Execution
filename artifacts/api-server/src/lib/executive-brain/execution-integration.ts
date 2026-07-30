// ─── Executive Brain ↔ Execution Integration (Build 010) ─────────────────────
//
// Bridges the Executive Brain's planning output to the Execution Engine.
// Three functions:
//   fetchActiveExecutions   — reads active executions for a user
//   ensureExecutionForPlan  — idempotent: creates an execution for an approved plan
//                             if one doesn't already exist
//   buildExecutionAdvisory  — assembles a one-line advisory string for the
//                             Executive Brain context note
//
// Execution NEVER creates plans, judges, or changes goals.
// This integration layer only reads Planning output and ensures the
// Execution layer is aware of it.

import { logger } from "../logger";
import { listActiveExecutions, createExecution } from "../executive-execution/execution-registry";
import type { ExecutiveExecution } from "../executive-execution/types";
import type { ExecutivePlan } from "../executive-plan/types";

// ── Fetch ──────────────────────────────────────────────────────────────────────

export async function fetchActiveExecutions(userId: number): Promise<ExecutiveExecution[]> {
  return listActiveExecutions(userId);
}

// ── Ensure execution for an approved/active plan ───────────────────────────────

/**
 * Idempotent.  If the planId already has an active execution, returns its id.
 * If not, creates a pending execution for it.
 * A plan must be in "approved" or "active" status to receive an execution.
 * This function never generates plans, never modifies plans, never changes goals.
 */
export async function ensureExecutionForActivePlan(
  userId: number,
  activePlans: ExecutivePlan[],
  activeExecutions: ExecutiveExecution[],
  opts: { contextSnapshotId?: string; judgmentId?: string } = {},
): Promise<string | null> {
  // Find the highest-priority approved or active plan
  const eligiblePlan = activePlans.find(
    (p) => p.status === "approved" || p.status === "active",
  );
  if (!eligiblePlan) return null;

  // Check if there's already an active execution for this plan
  const existing = activeExecutions.find((e) => e.planId === eligiblePlan.id);
  if (existing) return existing.id;

  // Create a new pending execution for the plan
  try {
    const execution = await createExecution({
      userId,
      planId: eligiblePlan.id,
      goalId: eligiblePlan.goalId ?? undefined,
      judgmentId: opts.judgmentId,
      contextSnapshotId: opts.contextSnapshotId,
      relatedPlanIds: [eligiblePlan.id],
      relatedGoalIds: eligiblePlan.goalId ? [eligiblePlan.goalId] : [],
      relatedJudgmentIds: opts.judgmentId ? [opts.judgmentId] : [],
      relatedContextIds: opts.contextSnapshotId ? [opts.contextSnapshotId] : [],
      metadata: {
        createdBy: "executive-brain-auto",
        planName: eligiblePlan.name,
        planStrategy: eligiblePlan.planningStrategy,
      },
    });
    return execution.id;
  } catch (err) {
    logger.warn({ err, planId: eligiblePlan.id }, "Execution: auto-create for plan failed (non-fatal)");
    return null;
  }
}

// ── Advisory ───────────────────────────────────────────────────────────────────

export function buildExecutionAdvisory(
  activeExecutions: ExecutiveExecution[],
  activeExecutionId: string | null,
): string | null {
  if (activeExecutions.length === 0 && !activeExecutionId) return null;

  const parts: string[] = [];

  if (activeExecutions.length > 0) {
    const running = activeExecutions.filter((e) => e.status === "running");
    const paused = activeExecutions.filter((e) => e.status === "paused");
    const pending = activeExecutions.filter((e) => ["pending", "approved"].includes(e.status));

    if (running.length > 0) {
      const ex = running[0]!;
      parts.push(
        `Execution in progress: ${ex.id.slice(0, 8)} ` +
        `[progress: ${ex.progressPct}%, steps: ${ex.completedSteps}/${ex.totalSteps}]`,
      );
    }
    if (paused.length > 0) parts.push(`${paused.length} execution(s) paused`);
    if (pending.length > 0) parts.push(`${pending.length} execution(s) awaiting start`);
  }

  if (activeExecutionId && !activeExecutions.find((e) => e.id === activeExecutionId)) {
    parts.push(`New execution prepared: ${activeExecutionId.slice(0, 8)} (pending approval)`);
  }

  if (parts.length === 0) return null;
  return `Executive execution: ${parts.join(" | ")}`;
}
