// ─── Plan Scoring Engine (Build 009) ─────────────────────────────────────────
//
// Deterministic 7-dimension scoring for Executive Plans.
// All dimensions produce 0–100 scores; inverted dimensions mean lower input →
// higher score (e.g. lower risk = higher risk score).
//
// No AI calls.  No I/O.  Pure computation.

import type { PlanScore } from "./types";
import { PLAN_SCORE_WEIGHTS } from "./types";

// ─── Dimension computers ──────────────────────────────────────────────────────

/** Complexity score: simpler = better.  estimatedComplexity is 0-100. */
function scoreComplexity(estimatedComplexity: number): number {
  return Math.max(0, Math.min(100, 100 - estimatedComplexity));
}

/** Risk score: lower risk = better.  estimatedRisk is 0-100. */
function scoreRisk(estimatedRisk: number): number {
  return Math.max(0, Math.min(100, 100 - estimatedRisk));
}

/** Cost score: relative to a normalizing maximum.
 *  Treats 0 cost as 100, and caps at 0 for very high cost values.
 *  maxCost defaults to 1_000_000 (a million units) for normalization. */
function scoreCost(estimatedCost: number | null | undefined, maxCost = 1_000_000): number {
  if (estimatedCost == null || estimatedCost <= 0) return 80;  // unknown or free → good
  const ratio = Math.min(estimatedCost / maxCost, 1);
  return Math.max(0, Math.round((1 - ratio) * 100));
}

/** Duration score: shorter = better.
 *  Baseline: 90 days = 50 score.  Normalizes logarithmically. */
function scoreDuration(estimatedDurationDays: number | null | undefined): number {
  if (estimatedDurationDays == null || estimatedDurationDays <= 0) return 75; // unknown
  // 1 day → ~100, 90 days → ~50, 365 days → ~25, 730 days → ~12
  const score = Math.max(0, 100 - Math.log2(estimatedDurationDays + 1) * 10);
  return Math.round(Math.min(100, score));
}

/** Resource demand score: fewer steps = less resource-intensive = better.
 *  stepCount 0 → 100, 5 → ~75, 20 → ~50, 50 → ~25. */
function scoreResourceDemand(stepCount: number): number {
  const score = Math.max(0, 100 - stepCount * 1.5);
  return Math.round(Math.min(100, score));
}

/** Strategic alignment score: how well the plan aligns with active goals.
 *  Pass the goal's priorityScore (0–100) or 75 as a neutral default. */
function scoreStrategicAlignment(goalPriorityScore: number | null | undefined): number {
  if (goalPriorityScore == null) return 75;
  return Math.max(0, Math.min(100, goalPriorityScore));
}

/** Confidence score: direct pass-through of estimatedConfidence (0–100). */
function scoreConfidence(estimatedConfidence: number): number {
  return Math.max(0, Math.min(100, estimatedConfidence));
}

// ─── Composite scorer ─────────────────────────────────────────────────────────

export interface PlanScoringInput {
  estimatedComplexity: number;
  estimatedRisk: number;
  estimatedCost?: number | null;
  estimatedDurationDays?: number | null;
  estimatedConfidence: number;
  stepCount?: number;
  goalPriorityScore?: number | null;
}

/** Compute the full 7-dimension plan score.
 *  Returns a PlanScore with per-dimension breakdowns and an overall composite. */
export function scorePlan(input: PlanScoringInput): PlanScore {
  const complexity   = scoreComplexity(input.estimatedComplexity);
  const risk         = scoreRisk(input.estimatedRisk);
  const cost         = scoreCost(input.estimatedCost);
  const duration     = scoreDuration(input.estimatedDurationDays);
  const resource     = scoreResourceDemand(input.stepCount ?? 0);
  const strategic    = scoreStrategicAlignment(input.goalPriorityScore);
  const confidence   = scoreConfidence(input.estimatedConfidence);

  const w = PLAN_SCORE_WEIGHTS;
  const overall = Math.round(
    complexity  * w.complexity         +
    risk        * w.risk               +
    cost        * w.cost               +
    duration    * w.duration           +
    resource    * w.resource_demand    +
    strategic   * w.strategic_alignment +
    confidence  * w.confidence,
  );

  return {
    overallScore: Math.max(0, Math.min(100, overall)),
    dimensions: {
      complexity,
      risk,
      cost,
      duration,
      resource_demand: resource,
      strategic_alignment: strategic,
      confidence,
    },
  };
}

/** Rank a list of {planId, score} pairs from highest to lowest overall score.
 *  Returns the same array with an added `rank` field (1 = best). */
export function rankPlans(
  plans: Array<{ planId: string; overallScore: number }>,
): Array<{ planId: string; overallScore: number; rank: number }> {
  return [...plans]
    .sort((a, b) => b.overallScore - a.overallScore)
    .map((p, i) => ({ ...p, rank: i + 1 }));
}

/** Build a human-readable strengths/weaknesses summary from a PlanScore. */
export function summarizePlanScore(score: PlanScore): { strengths: string[]; weaknesses: string[] } {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const dims = score.dimensions;

  if (dims.complexity >= 70)  strengths.push("Low complexity");
  if (dims.complexity < 40)   weaknesses.push("High complexity");
  if (dims.risk >= 70)        strengths.push("Low risk profile");
  if (dims.risk < 40)         weaknesses.push("High risk profile");
  if (dims.cost >= 70)        strengths.push("Cost-effective");
  if (dims.cost < 40)         weaknesses.push("High cost estimate");
  if (dims.duration >= 70)    strengths.push("Short delivery timeline");
  if (dims.duration < 40)     weaknesses.push("Long delivery timeline");
  if (dims.resource_demand >= 70) strengths.push("Low resource demand");
  if (dims.resource_demand < 40)  weaknesses.push("High resource demand");
  if (dims.strategic_alignment >= 70) strengths.push("Strong strategic alignment");
  if (dims.strategic_alignment < 40)  weaknesses.push("Weak strategic alignment");
  if (dims.confidence >= 70)  strengths.push("High confidence");
  if (dims.confidence < 40)   weaknesses.push("Low confidence");

  return { strengths, weaknesses };
}
