// ─── Attention Engine (Build 011) ────────────────────────────────────────────
//
// Deterministic 8-dimension attention scoring.
// No I/O — pure computation.
// Output: 0.00 → 1.00  (higher = deserves more executive focus)
//
// Dimension weights (must sum to 1.0):
//   severity              0.25
//   executionState        0.20
//   failureCount          0.15
//   goalPriority          0.10
//   businessImpact        0.10
//   urgency               0.08
//   strategicImportance   0.07
//   novelty               0.05

import type { ObservationSeverity, AttentionScoreResult, IngestObservationInput } from "./types";

// ── Severity mapping ──────────────────────────────────────────────────────────

const SEVERITY_SCORES: Record<ObservationSeverity, number> = {
  critical: 1.00,
  high:     0.80,
  medium:   0.50,
  low:      0.20,
  info:     0.05,
};

// ── Execution state mapping ───────────────────────────────────────────────────

const EXECUTION_STATE_SCORES: Record<string, number> = {
  failed:    1.00,
  blocked:   0.80,
  retrying:  0.70,
  paused:    0.40,
  waiting:   0.30,
  running:   0.20,
  approved:  0.10,
  pending:   0.05,
  completed: 0.02,
  cancelled: 0.02,
};

// ── Business impact mapping ───────────────────────────────────────────────────

const BUSINESS_IMPACT_SCORES: Record<string, number> = {
  high:    1.00,
  medium:  0.50,
  low:     0.20,
  unknown: 0.10,
};

// ── Urgency mapping ───────────────────────────────────────────────────────────

const URGENCY_SCORES: Record<string, number> = {
  immediate: 1.00,
  soon:      0.70,
  deferred:  0.30,
  unknown:   0.40,
};

// ── Strategic importance mapping ──────────────────────────────────────────────

const STRATEGIC_SCORES: Record<string, number> = {
  critical: 1.00,
  high:     0.70,
  medium:   0.40,
  low:      0.20,
};

// ── Dimension weights ─────────────────────────────────────────────────────────

const W = {
  severity:            0.25,
  executionState:      0.20,
  failureCount:        0.15,
  goalPriority:        0.10,
  businessImpact:      0.10,
  urgency:             0.08,
  strategicImportance: 0.07,
  novelty:             0.05,
} as const;

// ── Core scoring function ─────────────────────────────────────────────────────

export function computeAttentionScore(input: {
  severity: ObservationSeverity;
  observedState?: string | null;
  goalPriority?: number | null;     // 0–100
  failureCount?: number | null;     // absolute count
  maxRetries?: number | null;
  isNovel?: boolean;
  businessImpact?: "high" | "medium" | "low" | "unknown";
  urgency?: "immediate" | "soon" | "deferred" | "unknown";
  strategicImportance?: "critical" | "high" | "medium" | "low";
}): AttentionScoreResult {
  const severityScore = SEVERITY_SCORES[input.severity] ?? 0.1;

  const executionStateScore =
    input.observedState
      ? (EXECUTION_STATE_SCORES[input.observedState] ?? 0.1)
      : 0.1;

  // Failure count: saturates at 1.0 when failures ≥ maxRetries
  const maxRetries = input.maxRetries ?? 3;
  const failureScore = input.failureCount != null
    ? Math.min(input.failureCount / Math.max(maxRetries, 1), 1.0)
    : 0;

  // Goal priority: 0–100 normalised to 0–1
  const goalPriorityScore = input.goalPriority != null
    ? Math.min(Math.max(input.goalPriority / 100, 0), 1.0)
    : 0.3;

  const businessImpactScore = BUSINESS_IMPACT_SCORES[input.businessImpact ?? "unknown"] ?? 0.1;
  const urgencyScore        = URGENCY_SCORES[input.urgency ?? "unknown"] ?? 0.4;
  const strategicScore      = STRATEGIC_SCORES[input.strategicImportance ?? "medium"] ?? 0.4;
  const noveltyScore        = input.isNovel ? 1.0 : 0.0;

  const score = Math.min(1.0, Math.max(0.0,
    W.severity            * severityScore +
    W.executionState      * executionStateScore +
    W.failureCount        * failureScore +
    W.goalPriority        * goalPriorityScore +
    W.businessImpact      * businessImpactScore +
    W.urgency             * urgencyScore +
    W.strategicImportance * strategicScore +
    W.novelty             * noveltyScore,
  ));

  return {
    score: Math.round(score * 1000) / 1000,
    dimensions: {
      severity:            Math.round(severityScore * 1000) / 1000,
      goalPriority:        Math.round(goalPriorityScore * 1000) / 1000,
      executionState:      Math.round(executionStateScore * 1000) / 1000,
      failureCount:        Math.round(failureScore * 1000) / 1000,
      novelty:             noveltyScore,
      businessImpact:      Math.round(businessImpactScore * 1000) / 1000,
      urgency:             Math.round(urgencyScore * 1000) / 1000,
      strategicImportance: Math.round(strategicScore * 1000) / 1000,
    },
  };
}

/** Convenience: compute from an IngestObservationInput. */
export function computeAttentionForIngestion(input: IngestObservationInput): AttentionScoreResult {
  return computeAttentionScore({
    severity:             input.severity ?? "info",
    observedState:        input.payload?.["status"] as string | undefined ?? null,
    goalPriority:         input.goalPriority,
    failureCount:         input.failureCount,
    isNovel:              input.isNovel ?? false,
    businessImpact:       input.businessImpact ?? "unknown",
    urgency:              input.urgency ?? "unknown",
    strategicImportance:  input.strategicImportance ?? "medium",
  });
}

export const ATTENTION_HIGH_THRESHOLD  = 0.8;
export const ATTENTION_REFLECTION_THRESHOLD = 0.7;
