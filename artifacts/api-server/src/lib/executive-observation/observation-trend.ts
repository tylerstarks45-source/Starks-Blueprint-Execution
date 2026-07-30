// ─── Trend Engine (Build 011) ─────────────────────────────────────────────────
//
// Detects measurable trends from observation history.
// Deterministic — no AI.
// Pure computation — DB reads supplied by observation-registry.ts.

import type {
  ObservationTrend,
  TrendType,
  ExecutiveObservation,
  ObservationSignalType,
} from "./types";

// ── Trend input ────────────────────────────────────────────────────────────────

export interface TrendWindow {
  observations: ExecutiveObservation[];
  windowStartAt: Date;
  windowEndAt: Date;
}

export interface DetectedTrend {
  trendType: TrendType;
  direction: "up" | "down" | "neutral" | "volatile";
  magnitude: number;   // 0.0 → 1.0
  description: string;
  evidence: Record<string, unknown>[];
  anchorObjectId?: string;
  anchorObjectType?: string;
}

// ── Individual trend detectors ────────────────────────────────────────────────

/** Repeated failures: failure count > threshold in window */
export function detectRepeatedFailures(
  window: TrendWindow,
  threshold = 3,
): DetectedTrend | null {
  const failures = window.observations.filter((o) => o.signalType === "failure");
  if (failures.length < threshold) return null;

  const magnitude = Math.min(1.0, failures.length / (threshold * 2));
  return {
    trendType: "repeated_failures",
    direction: "down",
    magnitude: Math.round(magnitude * 1000) / 1000,
    description: `${failures.length} failure(s) detected in window (threshold: ${threshold})`,
    evidence: failures.slice(0, 5).map((o) => ({
      observationId: o.id,
      eventType: o.eventType,
      severity: o.severity,
      observedAt: o.observedAt.toISOString(),
    })),
  };
}

/** Retry escalation: observations with retrying signal increasing */
export function detectRetryEscalation(
  window: TrendWindow,
  threshold = 3,
): DetectedTrend | null {
  const retries = window.observations.filter((o) => o.signalType === "risk" && o.eventType.includes("retry"));
  if (retries.length < threshold) return null;

  const magnitude = Math.min(1.0, retries.length / (threshold * 2));
  return {
    trendType: "retry_escalation",
    direction: "down",
    magnitude: Math.round(magnitude * 1000) / 1000,
    description: `${retries.length} retry event(s) detected in window (threshold: ${threshold})`,
    evidence: retries.slice(0, 5).map((o) => ({
      observationId: o.id,
      eventType: o.eventType,
      observedAt: o.observedAt.toISOString(),
    })),
  };
}

/** Increasing success: success rate rising over the window */
export function detectIncreasingSuccess(
  window: TrendWindow,
): DetectedTrend | null {
  const half = Math.floor(window.observations.length / 2);
  if (half < 2) return null;

  const firstHalf  = window.observations.slice(0, half);
  const secondHalf = window.observations.slice(half);

  const successRate = (obs: ExecutiveObservation[]) =>
    obs.length > 0
      ? obs.filter((o) => o.signalType === "success").length / obs.length
      : 0;

  const rate1 = successRate(firstHalf);
  const rate2 = successRate(secondHalf);
  const delta = rate2 - rate1;

  if (delta < 0.15) return null;  // not meaningful

  return {
    trendType: "increasing_success",
    direction: "up",
    magnitude: Math.min(1.0, Math.round(delta * 1000) / 1000),
    description: `Success rate improved from ${(rate1 * 100).toFixed(0)}% to ${(rate2 * 100).toFixed(0)}% in window`,
    evidence: [{ rate1, rate2, delta, samples: window.observations.length }],
  };
}

/** Improving completion: more completed events in second half vs first */
export function detectImprovingCompletion(
  window: TrendWindow,
): DetectedTrend | null {
  const half = Math.floor(window.observations.length / 2);
  if (half < 2) return null;

  const firstHalf  = window.observations.slice(0, half);
  const secondHalf = window.observations.slice(half);

  const completionCount = (obs: ExecutiveObservation[]) =>
    obs.filter((o) => o.eventType.includes("completed")).length;

  const c1 = completionCount(firstHalf);
  const c2 = completionCount(secondHalf);
  if (c2 <= c1) return null;

  const magnitude = Math.min(1.0, (c2 - c1) / Math.max(c1, 1));
  return {
    trendType: "improving_completion",
    direction: "up",
    magnitude: Math.round(magnitude * 1000) / 1000,
    description: `Completion events increased from ${c1} to ${c2} between halves of window`,
    evidence: [{ c1, c2, samples: window.observations.length }],
  };
}

/** Execution velocity: completions per unit time */
export function computeExecutionVelocity(
  window: TrendWindow,
): DetectedTrend | null {
  const completions = window.observations.filter(
    (o) => o.eventType.includes("completed") && o.eventCategory === "execution",
  );
  if (completions.length < 2) return null;

  const windowHours = (window.windowEndAt.getTime() - window.windowStartAt.getTime()) / 3_600_000;
  if (windowHours <= 0) return null;

  const velocity = completions.length / windowHours;
  const magnitude = Math.min(1.0, velocity / 10);  // 10 completions/hour = magnitude 1.0

  return {
    trendType: "execution_velocity",
    direction: velocity > 1 ? "up" : "neutral",
    magnitude: Math.round(magnitude * 1000) / 1000,
    description: `Execution velocity: ${velocity.toFixed(2)} completions/hour`,
    evidence: [{ completions: completions.length, windowHours, velocity }],
  };
}

/** Goal completion velocity */
export function detectGoalCompletionVelocity(
  window: TrendWindow,
): DetectedTrend | null {
  const goalCompletions = window.observations.filter(
    (o) => o.eventCategory === "goal" && o.eventType.includes("completed"),
  );
  if (goalCompletions.length === 0) return null;

  const windowDays = (window.windowEndAt.getTime() - window.windowStartAt.getTime()) / 86_400_000;
  if (windowDays <= 0) return null;

  const velocity = goalCompletions.length / windowDays;
  return {
    trendType: "goal_completion_velocity",
    direction: velocity > 0.5 ? "up" : "neutral",
    magnitude: Math.min(1.0, Math.round(velocity * 1000) / 1000),
    description: `Goal completion velocity: ${velocity.toFixed(2)} goals/day`,
    evidence: [{ goalCompletions: goalCompletions.length, windowDays, velocity }],
  };
}

/** Planning frequency */
export function detectPlanningFrequency(
  window: TrendWindow,
): DetectedTrend | null {
  const planEvents = window.observations.filter(
    (o) => o.eventCategory === "planning" && o.eventType.includes("generated"),
  );
  if (planEvents.length === 0) return null;

  const windowDays = Math.max(
    (window.windowEndAt.getTime() - window.windowStartAt.getTime()) / 86_400_000,
    0.001,
  );
  const freq = planEvents.length / windowDays;
  return {
    trendType: "planning_frequency",
    direction: freq > 1 ? "up" : "neutral",
    magnitude: Math.min(1.0, Math.round((freq / 5) * 1000) / 1000),   // 5/day = magnitude 1.0
    description: `Planning frequency: ${freq.toFixed(2)} plans/day`,
    evidence: [{ planEvents: planEvents.length, windowDays, freq }],
  };
}

// ── Master trend detector ──────────────────────────────────────────────────────

export function detectAllTrends(window: TrendWindow): DetectedTrend[] {
  const trends: (DetectedTrend | null)[] = [
    detectRepeatedFailures(window),
    detectRetryEscalation(window),
    detectIncreasingSuccess(window),
    detectImprovingCompletion(window),
    computeExecutionVelocity(window),
    detectGoalCompletionVelocity(window),
    detectPlanningFrequency(window),
  ];
  return trends.filter((t): t is DetectedTrend => t !== null);
}
