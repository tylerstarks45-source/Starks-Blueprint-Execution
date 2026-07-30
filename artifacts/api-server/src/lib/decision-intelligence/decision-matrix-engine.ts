// ─── Build 019: Decision Matrix Engine ───────────────────────────────────────
//
// Constructs weighted comparison matrices using 7 criteria.
// Deterministic lookup — no AI, no mutation.

import { randomUUID } from "crypto";
import {
  MATRIX_CRITERIA,
  CRITERION_WEIGHTS,
  type MatrixCriterion,
  type MatrixRow,
  type ScoredScenario,
} from "./types";

// Deterministic raw score per criterion per scenario type.
// Scores in 0..1. Higher = better fit for the criterion.
const SCENARIO_TYPE_CRITERION_SCORES: Record<string, Record<MatrixCriterion, number>> = {
  revenue_growth:       { business_goals: 0.90, executive_policies: 0.80, governance_rules: 0.80, risk_tolerance: 0.65, resource_availability: 0.60, financial_capacity: 0.70, user_priorities: 0.85 },
  cost_reduction:       { business_goals: 0.75, executive_policies: 0.85, governance_rules: 0.90, risk_tolerance: 0.85, resource_availability: 0.80, financial_capacity: 0.90, user_priorities: 0.70 },
  automation:           { business_goals: 0.85, executive_policies: 0.75, governance_rules: 0.80, risk_tolerance: 0.70, resource_availability: 0.65, financial_capacity: 0.75, user_priorities: 0.80 },
  marketing:            { business_goals: 0.80, executive_policies: 0.70, governance_rules: 0.75, risk_tolerance: 0.75, resource_availability: 0.70, financial_capacity: 0.65, user_priorities: 0.85 },
  sales:                { business_goals: 0.85, executive_policies: 0.75, governance_rules: 0.75, risk_tolerance: 0.70, resource_availability: 0.65, financial_capacity: 0.70, user_priorities: 0.90 },
  operations:           { business_goals: 0.70, executive_policies: 0.85, governance_rules: 0.85, risk_tolerance: 0.80, resource_availability: 0.75, financial_capacity: 0.80, user_priorities: 0.65 },
  product:              { business_goals: 0.80, executive_policies: 0.70, governance_rules: 0.75, risk_tolerance: 0.65, resource_availability: 0.60, financial_capacity: 0.65, user_priorities: 0.80 },
  infrastructure:       { business_goals: 0.65, executive_policies: 0.80, governance_rules: 0.85, risk_tolerance: 0.75, resource_availability: 0.70, financial_capacity: 0.75, user_priorities: 0.60 },
  finance:              { business_goals: 0.75, executive_policies: 0.90, governance_rules: 0.90, risk_tolerance: 0.85, resource_availability: 0.80, financial_capacity: 0.90, user_priorities: 0.70 },
  risk_reduction:       { business_goals: 0.70, executive_policies: 0.90, governance_rules: 0.95, risk_tolerance: 0.90, resource_availability: 0.75, financial_capacity: 0.80, user_priorities: 0.65 },
  customer_success:     { business_goals: 0.85, executive_policies: 0.75, governance_rules: 0.80, risk_tolerance: 0.70, resource_availability: 0.65, financial_capacity: 0.65, user_priorities: 0.90 },
  knowledge:            { business_goals: 0.65, executive_policies: 0.70, governance_rules: 0.75, risk_tolerance: 0.80, resource_availability: 0.70, financial_capacity: 0.65, user_priorities: 0.70 },
};

const DEFAULT_CRITERION_SCORES: Record<MatrixCriterion, number> = {
  business_goals: 0.70, executive_policies: 0.70, governance_rules: 0.75,
  risk_tolerance: 0.70, resource_availability: 0.65, financial_capacity: 0.70, user_priorities: 0.70,
};

export function computeDecisionMatrix(
  scenarios: ScoredScenario[],
  reportId: string,
  businessId: number,
): MatrixRow[] {
  const rows: MatrixRow[] = [];

  for (const scenario of scenarios) {
    const typeScores = SCENARIO_TYPE_CRITERION_SCORES[scenario.scenarioType] ?? DEFAULT_CRITERION_SCORES;

    for (const criterion of MATRIX_CRITERIA) {
      const weight = CRITERION_WEIGHTS[criterion];
      // Blend the type-level baseline with the scenario's actual performance scores
      const rawBase = typeScores[criterion];
      // Adjust by scenario's actual confidence and expected value (small blended nudge)
      const nudge = (scenario.overallConfidence - 0.7) * 0.1 + (scenario.expectedValueScore - 0.5) * 0.08;
      const rawScore = Math.max(0, Math.min(1, rawBase + nudge));
      const weightedScore = rawScore * weight;

      rows.push({
        id: randomUUID(),
        reportId,
        businessId,
        criterion,
        criterionWeight: weight,
        scenarioId: scenario.scenarioId,
        scenarioType: scenario.scenarioType,
        rawScore,
        weightedScore,
        notes: `Base score for '${scenario.scenarioType}' on '${criterion}' criterion.`,
      });
    }
  }

  return rows;
}

/** Aggregate weighted matrix score per scenario. */
export function aggregateMatrixScores(rows: MatrixRow[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(row.scenarioId, (totals.get(row.scenarioId) ?? 0) + row.weightedScore);
  }
  return totals;
}
