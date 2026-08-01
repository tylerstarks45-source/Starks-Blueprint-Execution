// ── ETI Constraint Modeling Engine ────────────────────────────────────────
// Validates constraint sets, detects violations, and normalises constraint
// values so downstream engines work on a consistent 0–1 scale.
// Pure computation — no I/O.

import type { TradeoffConstraint, TradeoffOption, ConstraintType } from "./types";

export interface ConstraintViolation {
  optionKey:       string;
  constraintKey:   string;
  constraintName:  string;
  severity:        string;
  reason:          string;
}

export interface ConstraintSummary {
  totalConstraints: number;
  hardConstraints:  number;
  softConstraints:  number;
  bindingTypes:     ConstraintType[];
  bindingCount:     number;
}

// Validate that all hard constraints are satisfiable (no constraint conflicts)
export function validateConstraintSet(constraints: TradeoffConstraint[]): {
  valid: boolean;
  conflicts: string[];
} {
  const conflicts: string[] = [];
  const hard = constraints.filter(c => c.severity === "hard");

  // Check for directly contradictory hard constraints
  for (let i = 0; i < hard.length; i++) {
    for (let j = i + 1; j < hard.length; j++) {
      const a = hard[i];
      const b = hard[j];
      if (a.type === b.type && a.relatesTo?.some(r => b.relatesTo?.includes(r))) {
        // Same type, same domain — potential conflict worth flagging
        conflicts.push(`Potential conflict: "${a.name}" vs "${b.name}" (both hard ${a.type} constraints)`);
      }
    }
  }

  return { valid: conflicts.length === 0, conflicts };
}

// Detect which options violate which constraints (returns hard violations only)
export function detectConstraintViolations(
  options: TradeoffOption[],
  constraints: TradeoffConstraint[],
): Map<string, ConstraintViolation[]> {
  const violations = new Map<string, ConstraintViolation[]>();

  for (const option of options) {
    const optViolations: ConstraintViolation[] = [];

    for (const constraint of constraints) {
      if (constraint.severity !== "hard") continue;

      // Heuristic: if the option's lowest relevant objective score is below
      // the threshold implied by the constraint, flag as a potential violation.
      const relevantObjectives = getObjectivesForConstraintType(constraint.type);
      const relevantScores = relevantObjectives
        .map(obj => option.scores[obj as import("./types").ObjectiveKey] ?? null)
        .filter((s): s is number => s !== null);

      if (relevantScores.length > 0) {
        const minScore = Math.min(...relevantScores);
        // Hard constraint: score < 0.25 on any directly relevant objective is a violation
        if (minScore < 0.25) {
          optViolations.push({
            optionKey:      option.key,
            constraintKey:  constraint.key,
            constraintName: constraint.name,
            severity:       constraint.severity,
            reason: `Option "${option.name}" scores ${(minScore * 100).toFixed(0)}% on ${relevantObjectives.join("/")} — below hard constraint threshold for ${constraint.name}.`,
          });
        }
      }
    }

    violations.set(option.key, optViolations);
  }

  return violations;
}

// Compute a constraint compliance score per option (0=many violations, 1=none)
export function computeConstraintComplianceScore(
  optionKey: string,
  violations: Map<string, ConstraintViolation[]>,
  constraints: TradeoffConstraint[],
): number {
  const optViolations = violations.get(optionKey) ?? [];
  const hardCount = constraints.filter(c => c.severity === "hard").length;
  if (hardCount === 0) return 1.0;
  const penaltyPerViolation = 1 / hardCount;
  return Math.max(0, 1 - optViolations.length * penaltyPerViolation);
}

// Summarise the constraint set for the advisory
export function summariseConstraints(constraints: TradeoffConstraint[]): ConstraintSummary {
  const types = new Set(constraints.filter(c => c.severity === "hard").map(c => c.type)) as Set<ConstraintType>;
  return {
    totalConstraints: constraints.length,
    hardConstraints:  constraints.filter(c => c.severity === "hard").length,
    softConstraints:  constraints.filter(c => c.severity === "soft").length,
    bindingTypes:     Array.from(types),
    bindingCount:     types.size,
  };
}

// Map constraint types to relevant objective keys
function getObjectivesForConstraintType(type: string): string[] {
  const map: Record<string, string[]> = {
    budget:         ["cost", "capital", "buy"],
    timeline:       ["speed", "short_term"],
    risk:           ["risk", "stability", "sustainability"],
    skills:         ["automation", "build"],
    infrastructure: ["infrastructure", "latency", "performance"],
    compliance:     ["security", "risk"],
    business:       ["growth", "reward", "long_term"],
    operational:    ["automation", "simplicity", "usability"],
  };
  return map[type] ?? ["performance"];
}

// ── Platform default constraint templates ─────────────────────────────────
// Used by the orchestrator to seed platform-level trade-off scenarios.

export interface DefaultConstraintSet {
  decisionType: string;
  constraints: Omit<TradeoffConstraint, "key">[];
}

export function getPlatformDefaultConstraints(decisionType: string): TradeoffConstraint[] {
  const templates: Record<string, Omit<TradeoffConstraint, "key">[]> = {
    "build-vs-buy": [
      { type: "budget",    name: "Engineering budget",     value: "moderate",   severity: "hard",       relatesTo: ["cost"] },
      { type: "timeline",  name: "Time to production",     value: "3-6 months", severity: "hard",       relatesTo: ["speed"] },
      { type: "skills",    name: "In-house AI expertise",  value: "limited",    severity: "soft" },
      { type: "business",  name: "Long-term control",      value: "required",   severity: "preference" },
    ],
    "cost-vs-performance": [
      { type: "budget",    name: "Infrastructure budget",  value: "fixed",      severity: "hard",       relatesTo: ["cost"] },
      { type: "operational", name: "Latency target",       value: "<500ms p99", severity: "hard",       relatesTo: ["latency"] },
      { type: "business",  name: "User growth rate",       value: "moderate",   severity: "soft" },
    ],
    "innovation-vs-stability": [
      { type: "risk",       name: "Production risk tolerance", value: "low",     severity: "hard",       relatesTo: ["risk"] },
      { type: "operational", name: "Rollback capability",      value: "required", severity: "hard" },
      { type: "timeline",  name: "Adoption runway",           value: "6+ months", severity: "soft" },
    ],
    "speed-vs-quality": [
      { type: "timeline",  name: "Market window",          value: "6 weeks",    severity: "hard",       relatesTo: ["speed"] },
      { type: "compliance",name: "Quality gate",           value: "unit tests", severity: "soft" },
      { type: "business",  name: "Competitive pressure",   value: "high",       severity: "preference" },
    ],
    "automation-vs-manual": [
      { type: "budget",    name: "Tooling investment",     value: "moderate",   severity: "soft",       relatesTo: ["cost"] },
      { type: "skills",    name: "Automation expertise",   value: "available",  severity: "soft" },
      { type: "operational", name: "Error tolerance",      value: "low",        severity: "hard" },
    ],
    "security-vs-usability": [
      { type: "compliance", name: "Regulatory requirement", value: "SOC2",      severity: "hard",       relatesTo: ["security"] },
      { type: "business",  name: "User adoption rate",     value: "critical",   severity: "hard",       relatesTo: ["usability"] },
      { type: "risk",      name: "Breach risk tolerance",  value: "very-low",   severity: "hard" },
    ],
  };

  const base = templates[decisionType] ?? templates["build-vs-buy"];
  return base.map((c, i) => ({ ...c, key: `${decisionType}-constraint-${i + 1}` }));
}
