// ─── Executive Brain → Goal Engine integration (Build 008) ───────────────────
//
// Retrieves active goals for the current user and applies them to enrich the
// judgment options before evaluation. Dependency direction:
//
//   executive-brain → executive-goal (one direction only)
//
// Rules:
//   • Goals influence Judgment.
//   • Judgment never changes Goals.
//   • Goal integration is fail-open — any failure returns empty goals.

import { listActiveGoals } from "../executive-goal/goal-registry";
import type { ExecutiveGoal } from "../executive-goal/types";
import type { JudgmentOption } from "../executive-judgment/types";
import { logger } from "../logger";

// ─── Fetch active goals ───────────────────────────────────────────────────────

/** Retrieve active goals for a user. Returns [] on failure. */
export async function fetchActiveGoals(userId: number): Promise<ExecutiveGoal[]> {
  try {
    return await listActiveGoals(userId);
  } catch (err) {
    logger.warn({ err, userId }, "Executive Brain: failed to fetch active goals (ignored)");
    return [];
  }
}

// ─── Goal-informed option enrichment ─────────────────────────────────────────

/** Adjusts option scores based on active goal context.
 *
 *  Logic:
 *  - For "execute_primary_plan": count high-priority active goals (score ≥ 70).
 *    Each one adds +5 to strategicValue (capped at +20) — active goals confirm
 *    that executing is the right direction.
 *  - For "defer_for_clarification": if there are critical active goals
 *    (score ≥ 85), reduce urgency by 20 (can't defer when critical goals need
 *    action).
 *  - For "simplify_approach": if most active goals have high complexity (≥ 70),
 *    boost strategicValue by 10 — simplifying becomes more attractive.
 *
 *  All adjustments are clamped to 0–100 after application. */
export function enrichOptionsWithGoals(
  options: JudgmentOption[],
  activeGoals: ExecutiveGoal[],
): JudgmentOption[] {
  if (activeGoals.length === 0) return options;

  const highPriorityGoals = activeGoals.filter((g) => g.priorityScore >= 70);
  const criticalGoals     = activeGoals.filter((g) => g.priorityScore >= 85);
  const complexGoals      = activeGoals.filter((g) => g.strategicValue >= 70);

  return options.map((opt) => {
    const scores = { ...(opt.scores ?? {}) };

    if (opt.key === "execute_primary_plan") {
      // High-priority active goals confirm "execute" is aligned with goals
      const boost = Math.min(20, highPriorityGoals.length * 5);
      if (boost > 0) {
        scores.strategicValue = Math.min(100, (scores.strategicValue ?? 50) + boost);
      }
    }

    if (opt.key === "defer_for_clarification") {
      // Can't defer if critical goals are waiting
      if (criticalGoals.length >= 1) {
        scores.urgency = Math.max(0, (scores.urgency ?? 20) - 20);
        scores.strategicValue = Math.max(0, (scores.strategicValue ?? 20) - 15);
      }
    }

    if (opt.key === "simplify_approach") {
      // Simplifying helps when goals are ambitious/complex
      if (complexGoals.length >= 2) {
        scores.strategicValue = Math.min(100, (scores.strategicValue ?? 50) + 10);
      }
    }

    return { ...opt, scores };
  });
}

// ─── Goal context note builder ────────────────────────────────────────────────

/** Build a one-line goal advisory for the Executive Brain context note. */
export function buildGoalAdvisory(activeGoals: ExecutiveGoal[]): string | null {
  if (activeGoals.length === 0) return null;
  const top3 = activeGoals
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 3);
  const summary = top3
    .map((g) => `"${g.name}" (${g.priorityScore.toFixed(0)}pts, ${g.status})`)
    .join(", ");
  return `Active goals (${activeGoals.length} total): ${summary}${activeGoals.length > 3 ? `; +${activeGoals.length - 3} more` : ""}`;
}
