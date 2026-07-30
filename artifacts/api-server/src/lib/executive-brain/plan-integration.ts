// ─── Executive Brain — Planning Integration (Build 009) ──────────────────────
//
// Thin adapter that connects the Executive Brain to the Executive Planning
// Engine.  The Executive Brain calls these functions after Judgment evaluation
// to optionally generate a plan recommendation.
//
// Planning NEVER executes.
// Planning NEVER changes goals or judgments.
// Fail-open: a planning failure must never block the request path.

import { logger } from "../logger";
import { listActivePlans, generateAndPersistPlan } from "../executive-plan/plan-services";
import type { ExecutivePlan } from "../executive-plan/types";
import type { ExecutiveGoal } from "../executive-goal/types";

// ─── Fetch ────────────────────────────────────────────────────────────────────

/** Retrieve active plans for the user.
 *  Returns an empty array on failure (fail-open). */
export async function fetchActivePlans(userId: number): Promise<ExecutivePlan[]> {
  return listActivePlans(userId);
}

// ─── On-demand plan generation from goal ─────────────────────────────────────

/** Generate a quick plan for the highest-priority active goal.
 *  Only generates if no active plans exist for that goal already.
 *  Returns the planId on success, null on failure or skip (fail-open). */
export async function ensurePlanForPrimaryGoal(
  userId: number,
  activeGoals: ExecutiveGoal[],
  existingPlans: ExecutivePlan[],
  opts: {
    contextSnapshotId?: string;
    judgmentId?: string;
  } = {},
): Promise<string | null> {
  try {
    if (activeGoals.length === 0) return null;

    // Pick the highest-priority active goal
    const primaryGoal = [...activeGoals].sort((a, b) => b.priorityScore - a.priorityScore)[0];

    // Skip if a plan already covers this goal
    const alreadyPlanned = existingPlans.some(
      (p) => p.goalId === primaryGoal.id,
    );
    if (alreadyPlanned) return null;

    const result = await generateAndPersistPlan(
      {
        userId,
        goalId: primaryGoal.id,
        goalName: primaryGoal.name,
        goalDescription: primaryGoal.description,
        successCriteria: (primaryGoal.successCriteria as string[]) ?? [],
        constraintsData: (primaryGoal.constraintsData as string[]) ?? [],
        estimatedComplexity: 50,
        estimatedRisk: primaryGoal.risk,
        contextSnapshotId: opts.contextSnapshotId,
        judgmentId: opts.judgmentId,
        goalPriorityScore: primaryGoal.priorityScore,
      },
      "top_down",
    );

    return result.plan.id;
  } catch (err) {
    logger.warn({ err, userId }, "Executive Brain: plan generation for primary goal failed (ignored)");
    return null;
  }
}

// ─── Context note advisory ────────────────────────────────────────────────────

/** Build a one-line planning advisory for the Executive Brain's context note.
 *  Zero-I/O: all data passed in as plain values. */
export function buildPlanAdvisory(
  activePlans: ExecutivePlan[],
  newPlanId: string | null,
): string {
  if (activePlans.length === 0 && !newPlanId) return "";

  const parts: string[] = [];

  if (newPlanId) {
    parts.push(`New plan generated (id: ${newPlanId})`);
  }

  if (activePlans.length > 0) {
    const top = [...activePlans].sort((a, b) => b.overallScore - a.overallScore)[0];
    const others = activePlans.length > 1 ? ` (+${activePlans.length - 1} more)` : "";
    parts.push(
      `Active plan: "${top.name}" [score: ${top.overallScore}, strategy: ${top.planningStrategy}, status: ${top.status}]${others}`,
    );
  }

  return `Executive planning: ${parts.join(" | ")}. Consult /api/executive-plan for full plan detail.`;
}
