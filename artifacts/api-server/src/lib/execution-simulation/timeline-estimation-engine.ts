// ─────────────────────────────────────────────────────────────────────────────
// Build 027: Execution Simulation Engine — Timeline Estimation Engine
// Predicts execution duration with min/expected/max confidence intervals.
// ─────────────────────────────────────────────────────────────────────────────

interface TimelineInput {
  ownerType:           string;
  executionClass:      string;
  complexityLevel:     string;
  businessCriticality: string;
}

interface TimelineEstimate {
  minHours:      number;
  expectedHours: number;
  maxHours:      number;
  durationUnit:  string;
  confidence:    number; // how reliable is this estimate 0-1
}

// Base execution hours by execution class
const CLASS_BASE_HOURS: Record<string, number> = {
  automated:  0.5,
  ai_driven:  1.0,
  human:      4.0,
  external:   8.0,
  hybrid:     2.0,
};

// Complexity multipliers
const COMPLEXITY_MULTIPLIER: Record<string, number> = {
  low: 0.5, medium: 1.0, high: 2.0, very_high: 3.5, extreme: 6.0,
};

// Criticality overhead
const CRITICALITY_OVERHEAD: Record<string, number> = {
  low: 0, medium: 0.5, high: 1.5, critical: 3.0,
};

// Owner type latency adder (human approval, external handoffs)
const OWNER_LATENCY_HOURS: Record<string, number> = {
  ai_agent:          0.25,
  automation:        0.10,
  human:             2.00,
  department:        4.00,
  integration:       0.50,
  external_system:   6.00,
  future_capability: 1.00,
};

// Confidence in estimate by class (automated = more predictable)
const CLASS_CONFIDENCE: Record<string, number> = {
  automated: 0.88, ai_driven: 0.70, human: 0.55, external: 0.45, hybrid: 0.65,
};

export function estimateTimeline(input: TimelineInput): TimelineEstimate {
  const base       = CLASS_BASE_HOURS[input.executionClass]     ?? 2.0;
  const multiplier = COMPLEXITY_MULTIPLIER[input.complexityLevel] ?? 1.0;
  const overhead   = CRITICALITY_OVERHEAD[input.businessCriticality] ?? 0;
  const latency    = OWNER_LATENCY_HOURS[input.ownerType]        ?? 1.0;

  const expectedHours = Math.round((base * multiplier + overhead + latency) * 10) / 10;
  const minHours      = Math.round(expectedHours * 0.60 * 10) / 10;
  const maxHours      = Math.round(expectedHours * 2.20 * 10) / 10;

  const confidence = Math.round((CLASS_CONFIDENCE[input.executionClass] ?? 0.65) * 1000) / 1000;

  return { minHours, expectedHours, maxHours, durationUnit: "hours", confidence };
}
