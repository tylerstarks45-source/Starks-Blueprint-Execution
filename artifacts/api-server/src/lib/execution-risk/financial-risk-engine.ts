// ─────────────────────────────────────────────────────────────────────────────
// Build 026: Execution Risk Assessment Engine — Financial Risk Engine
// Evaluates financial exposure, potential loss, billing impact, cost uncertainty.
// ─────────────────────────────────────────────────────────────────────────────
import type { RiskCategoryAssessment, RiskFactor, RiskLevel } from "./types";

interface AssignmentInput {
  ownerType: string;
  executionClass: string;
  complexityLevel: string;
  businessCriticality: string;
}

// ── Financial exposure by owner type ─────────────────────────────────────────
const OWNER_FINANCIAL_BASE: Record<string, number> = {
  human: 0.15,
  department: 0.20,
  ai_agent: 0.25,      // API call costs, compute billing
  automation: 0.20,    // SaaS/infrastructure cost
  integration: 0.30,   // Third-party billing, per-call fees
  external_system: 0.40,
  future_capability: 0.10,
};

const CLASS_FINANCIAL_ADDER: Record<string, number> = {
  automated: 0.10,   // High-volume automation can generate large bills
  semi_automated: 0.05,
  manual: 0.00,
  external: 0.15,    // External vendors may invoice unpredictably
  deferred: 0.00,
};

const COMPLEXITY_FINANCIAL: Record<string, number> = {
  low: 0.00,
  medium: 0.05,
  high: 0.12,
  critical: 0.18,
};

const CRITICALITY_FINANCIAL: Record<string, number> = {
  low: 0.00,
  medium: 0.05,
  high: 0.10,
  critical: 0.18,
};

function scoreToLevel(score: number): RiskLevel {
  if (score < 0.10) return "negligible";
  if (score < 0.25) return "low";
  if (score < 0.45) return "medium";
  if (score < 0.65) return "high";
  return "critical";
}

export function assessFinancialRisk(input: AssignmentInput): RiskCategoryAssessment {
  const base = OWNER_FINANCIAL_BASE[input.ownerType] ?? 0.20;
  const classAdder = CLASS_FINANCIAL_ADDER[input.executionClass] ?? 0.05;
  const complexityAdder = COMPLEXITY_FINANCIAL[input.complexityLevel] ?? 0.05;
  const criticalityAdder = CRITICALITY_FINANCIAL[input.businessCriticality] ?? 0.05;

  const riskScore = Math.min(1, Math.round((base + classAdder + complexityAdder + criticalityAdder) * 1000) / 1000);

  const factors: RiskFactor[] = [
    { factor: `Financial exposure baseline for "${input.ownerType}"`, contribution: base, rationale: "Owner type determines default financial exposure (billing, fees, cost overrun)." },
    { factor: `Execution class billing impact "${input.executionClass}"`, contribution: classAdder, rationale: "Automated and external classes carry direct billing risk." },
    { factor: `Cost uncertainty from complexity "${input.complexityLevel}"`, contribution: complexityAdder, rationale: "Higher complexity increases cost estimation uncertainty." },
    { factor: `Business criticality loss amplification "${input.businessCriticality}"`, contribution: criticalityAdder, rationale: "Critical operations amplify financial loss on failure." },
  ].filter((f) => f.contribution > 0);

  return {
    category: "financial",
    riskLevel: scoreToLevel(riskScore),
    riskScore,
    factors,
    rationale: `Financial risk ${Math.round(riskScore * 100)}% for "${input.ownerType}" (${input.executionClass}). ` +
      `Covers: financial exposure, potential loss, billing impact, and cost uncertainty.`,
  };
}
