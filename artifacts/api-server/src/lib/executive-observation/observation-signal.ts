// ─── Signal Engine (Build 011) ────────────────────────────────────────────────
//
// Converts observations into standardized Cognitive Signals.
// No I/O — pure computation.
// Signals are immutable. Signals NEVER contain recommendations.

import type {
  ObservationSignalType,
  ObservationSeverity,
  ObservationEventCategory,
} from "./types";

// ── Event-to-signal mapping ───────────────────────────────────────────────────
// Deterministic: given eventType + eventCategory + severity → signalType

interface SignalRule {
  eventTypePatterns?: string[];   // substring patterns in eventType
  categories?: ObservationEventCategory[];
  severities?: ObservationSeverity[];
  signal: ObservationSignalType;
  /** 0.0–1.0 base strength (before severity modifier) */
  baseStrength: number;
}

const SIGNAL_RULES: SignalRule[] = [
  // ── Failures ───────────────────────────────────────────────────────────────
  {
    eventTypePatterns: ["failed", "failure", "error"],
    signal: "failure",
    baseStrength: 0.9,
  },
  // ── Retries / risk ─────────────────────────────────────────────────────────
  {
    eventTypePatterns: ["retry", "retrying"],
    signal: "risk",
    baseStrength: 0.7,
  },
  // ── Cancellations → also risk ──────────────────────────────────────────────
  {
    eventTypePatterns: ["cancel"],
    signal: "risk",
    baseStrength: 0.5,
  },
  // ── Completions / successes ────────────────────────────────────────────────
  {
    eventTypePatterns: ["completed", "success", "approved", "done"],
    signal: "success",
    baseStrength: 0.8,
  },
  // ── Paused / blocked → delay ───────────────────────────────────────────────
  {
    eventTypePatterns: ["paused", "waiting", "blocked"],
    signal: "delay",
    baseStrength: 0.6,
  },
  // ── Progress events ────────────────────────────────────────────────────────
  {
    eventTypePatterns: ["started", "running", "step_started", "approved"],
    categories: ["execution"],
    signal: "progress",
    baseStrength: 0.4,
  },
  // ── Goal & planning events ─────────────────────────────────────────────────
  {
    categories: ["goal"],
    eventTypePatterns: ["created", "updated"],
    signal: "progress",
    baseStrength: 0.3,
  },
  {
    categories: ["planning"],
    eventTypePatterns: ["generated", "created", "approved"],
    signal: "progress",
    baseStrength: 0.3,
  },
  // ── Conflict signals ───────────────────────────────────────────────────────
  {
    eventTypePatterns: ["conflict"],
    signal: "conflict",
    baseStrength: 0.8,
  },
  // ── Regression signals ─────────────────────────────────────────────────────
  {
    eventTypePatterns: ["regress", "degraded"],
    signal: "regression",
    baseStrength: 0.75,
  },
  // ── Bottleneck ─────────────────────────────────────────────────────────────
  {
    eventTypePatterns: ["bottleneck", "stall", "slow"],
    signal: "bottleneck",
    baseStrength: 0.65,
  },
  // ── Novelty ────────────────────────────────────────────────────────────────
  {
    eventTypePatterns: ["novel", "new", "first"],
    signal: "novelty",
    baseStrength: 0.5,
  },
  // ── Trend ──────────────────────────────────────────────────────────────────
  {
    eventTypePatterns: ["trend"],
    signal: "trend",
    baseStrength: 0.6,
  },
  // ── Opportunity ────────────────────────────────────────────────────────────
  {
    eventTypePatterns: ["opportunity"],
    signal: "opportunity",
    baseStrength: 0.7,
  },
];

// ── Severity strength modifier ────────────────────────────────────────────────

const SEVERITY_STRENGTH_MODIFIER: Record<ObservationSeverity, number> = {
  critical: 1.0,
  high:     0.9,
  medium:   0.7,
  low:      0.5,
  info:     0.3,
};

// ── Core classification ───────────────────────────────────────────────────────

export interface SignalClassification {
  signalType: ObservationSignalType;
  strength: number;   // 0.0 → 1.0
  matchedRule: string;
}

export function classifySignal(
  eventType: string,
  eventCategory: ObservationEventCategory,
  severity: ObservationSeverity,
): SignalClassification {
  const eventLower = eventType.toLowerCase();
  const severityMod = SEVERITY_STRENGTH_MODIFIER[severity] ?? 0.5;

  for (const rule of SIGNAL_RULES) {
    const patternMatch = !rule.eventTypePatterns ||
      rule.eventTypePatterns.some((p) => eventLower.includes(p));
    const categoryMatch = !rule.categories ||
      rule.categories.includes(eventCategory);
    const severityMatch = !rule.severities ||
      rule.severities.includes(severity);

    if (patternMatch && categoryMatch && severityMatch) {
      const strength = Math.min(1.0, rule.baseStrength * severityMod);
      return {
        signalType: rule.signal,
        strength: Math.round(strength * 1000) / 1000,
        matchedRule: rule.signal,
      };
    }
  }

  return {
    signalType: "unknown",
    strength: 0.1,
    matchedRule: "default",
  };
}

// ── Signal description generator ─────────────────────────────────────────────

export function describeSignal(
  signalType: ObservationSignalType,
  eventType: string,
  sourceSystem: string,
  sourceObjectId: string | null,
): string {
  const source = sourceObjectId
    ? `${sourceSystem}:${sourceObjectId.slice(0, 8)}`
    : sourceSystem;
  const descriptions: Record<ObservationSignalType, string> = {
    success:     `Success signal from ${source}: ${eventType}`,
    failure:     `Failure signal from ${source}: ${eventType}`,
    opportunity: `Opportunity signal from ${source}: ${eventType}`,
    risk:        `Risk signal from ${source}: ${eventType}`,
    progress:    `Progress signal from ${source}: ${eventType}`,
    regression:  `Regression signal from ${source}: ${eventType}`,
    conflict:    `Conflict signal from ${source}: ${eventType}`,
    delay:       `Delay signal from ${source}: ${eventType}`,
    bottleneck:  `Bottleneck signal from ${source}: ${eventType}`,
    novelty:     `Novelty signal from ${source}: ${eventType}`,
    trend:       `Trend signal from ${source}: ${eventType}`,
    unknown:     `Unknown signal from ${source}: ${eventType}`,
  };
  return descriptions[signalType];
}

// ── Batch classification (for multiple observations) ──────────────────────────

export function classifySignals(
  observations: Array<{
    eventType: string;
    eventCategory: ObservationEventCategory;
    severity: ObservationSeverity;
  }>,
): SignalClassification[] {
  return observations.map((o) =>
    classifySignal(o.eventType, o.eventCategory, o.severity),
  );
}

// ── Signal strength aggregation ───────────────────────────────────────────────

export function aggregateSignalTypes(
  signals: Array<{ signalType: ObservationSignalType }>,
): ObservationSignalType[] {
  const counts = new Map<ObservationSignalType, number>();
  for (const s of signals) {
    counts.set(s.signalType, (counts.get(s.signalType) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type]) => type);
}
