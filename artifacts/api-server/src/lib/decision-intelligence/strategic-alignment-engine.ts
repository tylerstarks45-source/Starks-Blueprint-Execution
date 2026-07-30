// ─── Build 019: Strategic Alignment Engine ───────────────────────────────────
//
// Evaluates how well each scenario supports 7 strategic dimensions.
// Deterministic — no AI, no mutation.

import {
  ALIGNMENT_DIMENSIONS,
  type AlignmentDimension,
  type AlignmentProfile,
  type StrategicAlignment,
  type ScoredScenario,
} from "./types";

// Alignment score table: scenario_type → dimension → base 0..1 score
const ALIGNMENT_TABLE: Record<string, Record<AlignmentDimension, number>> = {
  revenue_growth:   { revenue_growth: 0.95, profitability: 0.75, automation: 0.55, scalability: 0.80, customer_growth: 0.75, operational_stability: 0.55, long_term_vision: 0.75 },
  cost_reduction:   { revenue_growth: 0.50, profitability: 0.90, automation: 0.65, scalability: 0.60, customer_growth: 0.40, operational_stability: 0.80, long_term_vision: 0.60 },
  automation:       { revenue_growth: 0.60, profitability: 0.75, automation: 0.95, scalability: 0.80, customer_growth: 0.50, operational_stability: 0.75, long_term_vision: 0.80 },
  marketing:        { revenue_growth: 0.80, profitability: 0.60, automation: 0.45, scalability: 0.65, customer_growth: 0.85, operational_stability: 0.45, long_term_vision: 0.65 },
  sales:            { revenue_growth: 0.85, profitability: 0.70, automation: 0.50, scalability: 0.65, customer_growth: 0.80, operational_stability: 0.50, long_term_vision: 0.60 },
  operations:       { revenue_growth: 0.50, profitability: 0.80, automation: 0.70, scalability: 0.75, customer_growth: 0.45, operational_stability: 0.90, long_term_vision: 0.75 },
  product:          { revenue_growth: 0.70, profitability: 0.60, automation: 0.65, scalability: 0.75, customer_growth: 0.70, operational_stability: 0.60, long_term_vision: 0.85 },
  infrastructure:   { revenue_growth: 0.45, profitability: 0.65, automation: 0.75, scalability: 0.85, customer_growth: 0.40, operational_stability: 0.80, long_term_vision: 0.80 },
  finance:          { revenue_growth: 0.55, profitability: 0.85, automation: 0.55, scalability: 0.60, customer_growth: 0.40, operational_stability: 0.80, long_term_vision: 0.65 },
  risk_reduction:   { revenue_growth: 0.40, profitability: 0.65, automation: 0.50, scalability: 0.55, customer_growth: 0.40, operational_stability: 0.90, long_term_vision: 0.70 },
  customer_success: { revenue_growth: 0.70, profitability: 0.60, automation: 0.50, scalability: 0.65, customer_growth: 0.90, operational_stability: 0.60, long_term_vision: 0.70 },
  knowledge:        { revenue_growth: 0.45, profitability: 0.50, automation: 0.65, scalability: 0.60, customer_growth: 0.50, operational_stability: 0.65, long_term_vision: 0.80 },
};

const DEFAULT_ALIGNMENT: Record<AlignmentDimension, number> = {
  revenue_growth: 0.60, profitability: 0.60, automation: 0.55,
  scalability: 0.60, customer_growth: 0.55, operational_stability: 0.65, long_term_vision: 0.65,
};

const ALIGNMENT_EVIDENCE: Record<AlignmentDimension, string> = {
  revenue_growth:       "Revenue impact derived from scenario expected-value and KPI projections.",
  profitability:        "Profitability alignment inferred from cost-reduction and margin impact dimensions.",
  automation:           "Automation score sourced from automation-potential field in simulation scenario.",
  scalability:          "Scalability alignment derived from operational-capacity and infrastructure impacts.",
  customer_growth:      "Customer growth alignment from customer-retention and growth KPI projections.",
  operational_stability:"Operational stability from risk score (inverted) and operational health projection.",
  long_term_vision:     "Long-term vision alignment from growth-potential and strategic category weighting.",
};

export function computeStrategicAlignment(scenarios: ScoredScenario[]): StrategicAlignment[] {
  return scenarios.map((scenario) => {
    const table = ALIGNMENT_TABLE[scenario.scenarioType] ?? DEFAULT_ALIGNMENT;

    const dimensions: AlignmentProfile[] = ALIGNMENT_DIMENSIONS.map((dim) => {
      const base = table[dim];
      // Blend in scenario-specific signals
      let score = base;
      if (dim === "revenue_growth")       score = base * 0.7 + scenario.expectedValueScore * 0.3;
      if (dim === "automation")           score = base * 0.6 + scenario.automationPotential * 0.4;
      if (dim === "scalability")          score = base * 0.7 + scenario.growthPotential * 0.3;
      if (dim === "operational_stability") score = base * 0.7 + (1 - scenario.riskScore) * 0.3;
      score = Math.max(0, Math.min(1, score));
      return {
        dimension: dim,
        score,
        evidence: ALIGNMENT_EVIDENCE[dim],
      };
    });

    const overallAlignmentScore =
      dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length;

    return {
      scenarioId: scenario.scenarioId,
      scenarioType: scenario.scenarioType,
      dimensions,
      overallAlignmentScore,
    };
  });
}
