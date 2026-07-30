// ─── Build 018: Health Projection Engine ─────────────────────────────────────
//
// Estimates future Business Health deltas for 8 dimensions per scenario.
// Pure function — no DB I/O.

import type { HealthProjection, ScenarioInput, ScenarioType } from "./types";

// ── Health dimension impact table ─────────────────────────────────────────────

type HealthRow = Record<string, number>; // dimension → delta

const HEALTH_IMPACT: Record<ScenarioType, HealthRow> = {
  revenue_growth:   { financial: 0.18, operational: 0.05, marketing: 0.12, sales: 0.22, customer: 0.15, technology: 0.00, knowledge: 0.05, governance: 0.02 },
  cost_reduction:   { financial: 0.28, operational: 0.12, marketing: -0.05, sales: 0.00, customer: -0.02, technology: 0.02, knowledge: 0.05, governance: 0.08 },
  automation:       { financial: 0.12, operational: 0.35, marketing: 0.02, sales: 0.05, customer: 0.08, technology: 0.30, knowledge: 0.08, governance: 0.05 },
  marketing:        { financial: -0.02, operational: 0.02, marketing: 0.35, sales: 0.12, customer: 0.25, technology: 0.02, knowledge: 0.05, governance: 0.02 },
  sales:            { financial: 0.20, operational: 0.05, marketing: 0.10, sales: 0.32, customer: 0.18, technology: 0.02, knowledge: 0.05, governance: 0.02 },
  customer_success: { financial: 0.08, operational: 0.05, marketing: 0.05, sales: 0.05, customer: 0.38, technology: 0.02, knowledge: 0.08, governance: 0.05 },
  operations:       { financial: 0.10, operational: 0.32, marketing: 0.00, sales: 0.02, customer: 0.05, technology: 0.10, knowledge: 0.08, governance: 0.10 },
  product:          { financial: -0.05, operational: 0.05, marketing: 0.08, sales: 0.10, customer: 0.25, technology: 0.20, knowledge: 0.12, governance: 0.05 },
  infrastructure:   { financial: -0.08, operational: 0.20, marketing: 0.00, sales: 0.00, customer: 0.05, technology: 0.32, knowledge: 0.08, governance: 0.12 },
  finance:          { financial: 0.32, operational: 0.05, marketing: 0.00, sales: 0.00, customer: 0.00, technology: 0.02, knowledge: 0.05, governance: 0.15 },
  risk_reduction:   { financial: 0.05, operational: 0.10, marketing: 0.00, sales: 0.00, customer: 0.05, technology: 0.08, knowledge: 0.05, governance: 0.25 },
  knowledge:        { financial: 0.05, operational: 0.10, marketing: 0.02, sales: 0.05, customer: 0.02, technology: 0.05, knowledge: 0.30, governance: 0.10 },
};

export function projectHealth(
  input: ScenarioInput,
  currentHealth: Record<string, number | null> = {},
): HealthProjection[] {
  const deltas = HEALTH_IMPACT[input.category];
  const scale = input.compositeScore * input.businessImpact;

  return Object.entries(deltas).map(([dim, baseDelta]) => ({
    dimension: dim,
    currentEstimate: currentHealth[dim] ?? null,
    projectedDelta: parseFloat(Math.max(-1, Math.min(1, baseDelta * scale * 1.5)).toFixed(4)),
    confidence: parseFloat(Math.min(0.70 * input.confidence, 0.90).toFixed(4)),
  }));
}
