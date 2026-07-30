// ─── Goal Priority Engine (Build 008) ────────────────────────────────────────
//
// Computes a deterministic priority score for a goal from its six priority
// dimensions. Formula:
//
//   priorityScore =
//     importance     × 0.30
//   + urgency        × 0.25
//   + strategicValue × 0.20
//   + opportunity    × 0.10
//   + (100 - risk)   × 0.10   ← risk is inverted: lower risk = better
//   + confidence     × 0.05
//
// All input dimensions are 0–100. Output is 0–100.
//
// Urgency is supplemented by target-date proximity if not explicitly provided.
// No AI calls. Fully auditable and replayable.

import { GOAL_PRIORITY_WEIGHTS } from "./types";

// ─── Date-based urgency ───────────────────────────────────────────────────────

/** Derive an urgency score from how close a target date is to today.
 *  Returns null when no target date is provided. */
function dateUrgency(targetDate: Date | null | undefined): number | null {
  if (!targetDate) return null;
  const now = Date.now();
  const target = targetDate instanceof Date ? targetDate.getTime() : new Date(targetDate).getTime();
  const daysRemaining = (target - now) / (1000 * 60 * 60 * 24);
  if (daysRemaining <= 0)  return 100; // overdue
  if (daysRemaining <= 7)  return 90;  // this week
  if (daysRemaining <= 14) return 75;  // next two weeks
  if (daysRemaining <= 30) return 60;  // this month
  if (daysRemaining <= 90) return 40;  // this quarter
  return 20;                            // longer-term
}

// ─── Core formula ─────────────────────────────────────────────────────────────

export interface PriorityDimensions {
  importance: number;
  urgency: number;
  strategicValue: number;
  risk: number;
  opportunity: number;
  confidence: number;
}

export interface PriorityResult {
  priorityScore: number;
  dimensions: PriorityDimensions;
  /** How the urgency was resolved ('provided' | 'date-derived' | 'default'). */
  urgencySource: "provided" | "date-derived" | "default";
}

/** Compute goal priority score.
 *  If urgency is not explicitly provided (undefined) AND a targetDate exists,
 *  urgency is derived from the target date. Otherwise the stored urgency is used. */
export function computePriorityScore(
  dims: PriorityDimensions,
  targetDate?: Date | null,
  explicitUrgency?: number,
): PriorityResult {
  const clamp = (v: number) => Math.max(0, Math.min(100, v));

  // Resolve urgency
  let urgencySource: PriorityResult["urgencySource"] = "provided";
  let urgency = clamp(dims.urgency);

  if (explicitUrgency === undefined && targetDate) {
    const derived = dateUrgency(targetDate);
    if (derived !== null) {
      urgency = derived;
      urgencySource = "date-derived";
    }
  } else if (explicitUrgency === undefined) {
    urgencySource = "default";
  }

  const importance     = clamp(dims.importance);
  const strategicValue = clamp(dims.strategicValue);
  const risk           = clamp(dims.risk);
  const opportunity    = clamp(dims.opportunity);
  const confidence     = clamp(dims.confidence);

  const priorityScore =
    importance     * GOAL_PRIORITY_WEIGHTS.importance     +
    urgency        * GOAL_PRIORITY_WEIGHTS.urgency        +
    strategicValue * GOAL_PRIORITY_WEIGHTS.strategicValue +
    opportunity    * GOAL_PRIORITY_WEIGHTS.opportunity    +
    (100 - risk)   * GOAL_PRIORITY_WEIGHTS.risk           + // inverted
    confidence     * GOAL_PRIORITY_WEIGHTS.confidence;

  return {
    priorityScore: Math.round(priorityScore * 100) / 100, // 2dp
    dimensions: { importance, urgency, strategicValue, risk, opportunity, confidence },
    urgencySource,
  };
}

/** Convenience: compute priority score and return only the score (0–100). */
export function scoreGoalPriority(
  importance: number,
  urgency: number,
  strategicValue: number,
  risk: number,
  opportunity: number,
  confidence: number,
  targetDate?: Date | null,
): number {
  return computePriorityScore(
    { importance, urgency, strategicValue, risk, opportunity, confidence },
    targetDate,
  ).priorityScore;
}
