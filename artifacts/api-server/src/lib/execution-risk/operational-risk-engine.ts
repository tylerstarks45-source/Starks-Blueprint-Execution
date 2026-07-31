// ─────────────────────────────────────────────────────────────────────────────
// Build 026: Execution Risk Assessment Engine — Operational Risk Engine
// Evaluates operational disruption risk from owner type, execution class,
// complexity, and business criticality. No AI calls; fully deterministic.
// ─────────────────────────────────────────────────────────────────────────────
import type { RiskCategoryAssessment, RiskFactor, RiskLevel } from "./types";

interface AssignmentInput {
  ownerType: string;
  executionClass: string;
  complexityLevel: string;
  businessCriticality: string;
}

// ── Owner type disruption base scores ─────────────────────────────────────────
const OWNER_DISRUPTION: Record<string, number> = {
  human: 0.25,
  department: 0.20,
  ai_agent: 0.40,
  automation: 0.30,
  integration: 0.35,
  external_system: 0.50,
  future_capability: 0.70,
};

// ── Execution class multipliers ────────────────────────────────────────────────
const CLASS_MULTIPLIER: Record<string, number> = {
  automated: 1.10,
  semi_automated: 0.95,
  manual: 0.75,
  external: 1.20,
  deferred: 0.50,
};

// ── Complexity adders ──────────────────────────────────────────────────────────
const COMPLEXITY_ADDER: Record<string, number> = {
  low: 0.00,
  medium: 0.08,
  high: 0.15,
  critical: 0.22,
};

// ── Business criticality adders ────────────────────────────────────────────────
const CRITICALITY_ADDER: Record<string, number> = {
  low: 0.00,
  medium: 0.05,
  high: 0.12,
  critical: 0.20,
};

function scoreToLevel(score: number): RiskLevel {
  if (score < 0.15) return "negligible";
  if (score < 0.30) return "low";
  if (score < 0.50) return "medium";
  if (score < 0.70) return "high";
  return "critical";
}

export function assessOperationalRisk(input: AssignmentInput): RiskCategoryAssessment {
  const base = OWNER_DISRUPTION[input.ownerType] ?? 0.35;
  const multiplier = CLASS_MULTIPLIER[input.executionClass] ?? 1.0;
  const complexityAdder = COMPLEXITY_ADDER[input.complexityLevel] ?? 0.08;
  const criticalityAdder = CRITICALITY_ADDER[input.businessCriticality] ?? 0.05;

  const rawScore = Math.min(1, base * multiplier + complexityAdder + criticalityAdder);
  const riskScore = Math.round(rawScore * 1000) / 1000;

  const factors: RiskFactor[] = [
    { factor: `Owner type "${input.ownerType}" disruption baseline`, contribution: base, rationale: "Derived from owner type's operational reliability baseline." },
    { factor: `Execution class "${input.executionClass}" multiplier`, contribution: (base * multiplier - base), rationale: "Automated and external execution classes carry higher disruption potential." },
    { factor: `Complexity level "${input.complexityLevel}"`, contribution: complexityAdder, rationale: "Higher complexity increases operational failure probability." },
    { factor: `Business criticality "${input.businessCriticality}"`, contribution: criticalityAdder, rationale: "Critical business functions amplify the impact of any disruption." },
  ].filter((f) => f.contribution > 0);

  return {
    category: "operational",
    riskLevel: scoreToLevel(riskScore),
    riskScore,
    factors,
    rationale: `Operational disruption risk of ${Math.round(riskScore * 100)}% for "${input.ownerType}" (${input.executionClass}). ` +
      `Complexity: ${input.complexityLevel}. Business criticality: ${input.businessCriticality}.`,
  };
}
