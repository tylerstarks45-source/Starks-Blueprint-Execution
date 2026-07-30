// ─── Build 017: Opportunity Scoring Engine ────────────────────────────────────
//
// Every opportunity receives 7-dimensional deterministic scoring.
// Pure function — no DB I/O.

import type { OpportunityCandidate } from "./types";

export interface ScoredCandidate extends OpportunityCandidate {
  compositeScore: number;
}

// ── Composite score formula ───────────────────────────────────────────────────
//
//   composite = impact(0.30) + strategic(0.25) + reach(0.15) + confidence(0.20)
//             + (1-effort)(0.05) + (1-risk)(0.05)
//
// All inputs are clamped to [0, 1]. Output is [0, 1].

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function computeCompositeScore(c: OpportunityCandidate): number {
  return parseFloat((
    clamp(c.businessImpact)   * 0.30 +
    clamp(c.strategicValue)   * 0.25 +
    clamp(c.estimatedReach)   * 0.15 +
    clamp(c.confidence)       * 0.20 +
    (1 - clamp(c.estimatedEffort)) * 0.05 +
    (1 - clamp(c.risk))       * 0.05
  ).toFixed(4));
}

// ── Scoring version ───────────────────────────────────────────────────────────
// Bump when the formula changes so history records can be compared accurately.

export const SCORING_VERSION = 1;

// ── Score a batch of candidates ───────────────────────────────────────────────

export function scoreOpportunities(candidates: OpportunityCandidate[]): ScoredCandidate[] {
  return candidates.map((c) => ({
    ...c,
    businessImpact: clamp(c.businessImpact),
    estimatedReach: clamp(c.estimatedReach),
    estimatedEffort: clamp(c.estimatedEffort),
    risk: clamp(c.risk),
    confidence: clamp(c.confidence),
    strategicValue: clamp(c.strategicValue),
    compositeScore: computeCompositeScore(c),
  }));
}
