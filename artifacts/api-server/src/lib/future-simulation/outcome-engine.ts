// ─── Build 018: Outcome Engine ────────────────────────────────────────────────
//
// Produces 4 scenario outcomes: best_case, expected_case, worst_case, most_likely.
// Each outcome has probability, multi-dimensional impact projections, confidence,
// known unknowns, and a value score.
// No recommendations — only projected futures.
// Pure function — no DB I/O.

import type {
  BusinessImpact, HealthProjection, KpiProjection,
  OutcomeType, RiskSummary, ScenarioInput, SimulationOutcome,
} from "./types";
import { randomUUID } from "crypto";

const uid = () => `out_${randomUUID().replace(/-/g, "").slice(0, 18)}`;

// ── Outcome multipliers ───────────────────────────────────────────────────────
// Scale the expected-case values by these factors to produce each outcome branch.

const MULTIPLIERS: Record<OutcomeType, { impact: number; probability: number; confidence: number }> = {
  best_case:     { impact: 1.60, probability: 0.15, confidence: 0.55 },
  expected_case: { impact: 1.00, probability: 0.50, confidence: 0.80 },
  worst_case:    { impact: 0.30, probability: 0.15, confidence: 0.55 },
  most_likely:   { impact: 0.80, probability: 0.70, confidence: 0.75 },
};

function scaleImpact(impact: BusinessImpact, factor: number): Record<string, number> {
  return {
    revenue:             parseFloat(Math.max(-1, Math.min(1, impact.revenue             * factor)).toFixed(4)),
    profit:              parseFloat(Math.max(-1, Math.min(1, impact.profit              * factor)).toFixed(4)),
    cashFlow:            parseFloat(Math.max(-1, Math.min(1, impact.cashFlow            * factor)).toFixed(4)),
    customerGrowth:      parseFloat(Math.max(-1, Math.min(1, impact.customerGrowth      * factor)).toFixed(4)),
    customerRetention:   parseFloat(Math.max(-1, Math.min(1, impact.customerRetention   * factor)).toFixed(4)),
    operationalCapacity: parseFloat(Math.max(-1, Math.min(1, impact.operationalCapacity * factor)).toFixed(4)),
    automation:          parseFloat(Math.max(-1, Math.min(1, impact.automation          * factor)).toFixed(4)),
    employeeWorkload:    parseFloat(Math.max(-1, Math.min(1, impact.employeeWorkload     * factor)).toFixed(4)),
    risk:                parseFloat(Math.max(-1, Math.min(1, impact.risk                * (2 - factor))).toFixed(4)), // risk inverts
  };
}

function scaleHealth(projections: HealthProjection[], factor: number): Record<string, number> {
  const result: Record<string, number> = {};
  for (const p of projections) {
    result[p.dimension] = parseFloat(Math.max(-1, Math.min(1, p.projectedDelta * factor)).toFixed(4));
  }
  return result;
}

function scaleKpis(projections: KpiProjection[], factor: number): Record<string, number> {
  const result: Record<string, number> = {};
  for (const k of projections) {
    result[k.category] = parseFloat(Math.max(-1, Math.min(1, k.expectedChange * factor)).toFixed(4));
  }
  return result;
}

function computeValueScore(kpiImpact: Record<string, number>, financialImpact: Record<string, number>): number {
  const revGain  = Math.max(0, financialImpact.revenue ?? 0) * 0.30;
  const profGain = Math.max(0, financialImpact.profit  ?? 0) * 0.25;
  const kpiGain  = Object.values(kpiImpact).filter((v) => v > 0).reduce((a, b) => a + b, 0) / Math.max(1, Object.keys(kpiImpact).length) * 0.45;
  return parseFloat(Math.max(0, Math.min(1, revGain + profGain + kpiGain)).toFixed(4));
}

export function computeOutcomes(
  input: ScenarioInput,
  scenarioId: string,
  businessId: number,
  impact: BusinessImpact,
  healthProjections: HealthProjection[],
  kpiProjections: KpiProjection[],
  riskSummary: RiskSummary,
  now: Date,
): SimulationOutcome[] {
  const outcomeTypes: OutcomeType[] = ["best_case", "expected_case", "worst_case", "most_likely"];

  return outcomeTypes.map((type) => {
    const m = MULTIPLIERS[type];
    const scaledFinancial = scaleImpact(impact, m.impact);
    const scaledHealth = scaleHealth(healthProjections, m.impact);
    const scaledKpis = scaleKpis(kpiProjections, m.impact);
    const scaledRisk: Record<string, number> = {};
    for (const r of riskSummary.risks) {
      scaledRisk[r.riskType] = parseFloat(Math.max(0, Math.min(1, r.level * (2 - m.impact))).toFixed(4));
    }
    const scaledOperational: Record<string, number> = {
      operationalCapacity: scaledFinancial.operationalCapacity,
      automation: scaledFinancial.automation,
      employeeWorkload: scaledFinancial.employeeWorkload,
    };

    return {
      id: uid(),
      scenarioId,
      businessId,
      outcomeType: type,
      probability: m.probability,
      kpiImpact: scaledKpis,
      healthImpact: scaledHealth,
      financialImpact: { revenue: scaledFinancial.revenue, profit: scaledFinancial.profit, cashFlow: scaledFinancial.cashFlow },
      operationalImpact: scaledOperational,
      riskImpact: scaledRisk,
      confidence: parseFloat(Math.min(m.confidence * input.confidence, 0.90).toFixed(4)),
      knownUnknowns: type === "worst_case" || type === "most_likely" ? riskSummary.knownUnknowns : [],
      valueScore: computeValueScore(scaledKpis, scaledFinancial),
      createdAt: now,
    };
  });
}

// ── Branch builder ────────────────────────────────────────────────────────────

export function buildBranches(
  scenarios: SimulationOutcome[],
  scenarioId: string,
  businessId: number,
  input: ScenarioInput,
  now: Date,
): import("./types").ScenarioBranch[] {
  return scenarios.map((o) => ({
    id: uid(),
    scenarioId,
    businessId,
    branchType: o.outcomeType,
    description: `${o.outcomeType.replace(/_/g, " ")} for "${input.opportunityTitle}"`,
    probability: o.probability,
    valueScore: o.valueScore,
    keyDrivers: [
      `Opportunity: ${input.opportunityTitle}`,
      `Category: ${input.category}`,
      `Discovery source: ${input.discoverySource}`,
    ],
    keyRisks: Object.entries(o.riskImpact)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([type, level]) => `${type}: ${(level * 100).toFixed(0)}%`),
    kpiImpact: o.kpiImpact,
    healthImpact: o.healthImpact,
    financialImpact: o.financialImpact,
    createdAt: now,
  }));
}
