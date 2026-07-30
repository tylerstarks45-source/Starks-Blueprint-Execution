// ─── Build 018: KPI Projection Engine ────────────────────────────────────────
//
// Estimates KPI movement for 6 categories per scenario.
// Each projection includes expected change, direction, confidence, and evidence.
// Pure function — no DB I/O.

import type { KpiProjection, ScenarioInput, ScenarioType } from "./types";

// ── Category impact table ─────────────────────────────────────────────────────
// Expected change values are on [-1, +1] scale.

type KpiImpactRow = { change: number; confidence: number };
type CategoryImpact = Record<string, KpiImpactRow>;

const KPI_IMPACT: Record<ScenarioType, CategoryImpact> = {
  revenue_growth:   { revenue: { change: 0.28, confidence: 0.80 }, marketing: { change: 0.10, confidence: 0.65 }, sales: { change: 0.25, confidence: 0.75 }, customer: { change: 0.18, confidence: 0.70 }, operations: { change: 0.05, confidence: 0.60 }, financial: { change: 0.20, confidence: 0.75 } },
  cost_reduction:   { revenue: { change: 0.02, confidence: 0.60 }, marketing: { change: -0.05, confidence: 0.60 }, sales: { change: 0.02, confidence: 0.60 }, customer: { change: -0.02, confidence: 0.55 }, operations: { change: 0.15, confidence: 0.75 }, financial: { change: 0.28, confidence: 0.80 } },
  automation:       { revenue: { change: 0.08, confidence: 0.65 }, marketing: { change: 0.05, confidence: 0.60 }, sales: { change: 0.05, confidence: 0.60 }, customer: { change: 0.08, confidence: 0.65 }, operations: { change: 0.38, confidence: 0.85 }, financial: { change: 0.15, confidence: 0.70 } },
  marketing:        { revenue: { change: 0.15, confidence: 0.70 }, marketing: { change: 0.38, confidence: 0.80 }, sales: { change: 0.12, confidence: 0.65 }, customer: { change: 0.30, confidence: 0.75 }, operations: { change: 0.00, confidence: 0.55 }, financial: { change: 0.08, confidence: 0.60 } },
  sales:            { revenue: { change: 0.30, confidence: 0.78 }, marketing: { change: 0.08, confidence: 0.60 }, sales: { change: 0.35, confidence: 0.82 }, customer: { change: 0.22, confidence: 0.70 }, operations: { change: 0.05, confidence: 0.58 }, financial: { change: 0.18, confidence: 0.68 } },
  customer_success: { revenue: { change: 0.10, confidence: 0.68 }, marketing: { change: 0.05, confidence: 0.58 }, sales: { change: 0.08, confidence: 0.62 }, customer: { change: 0.38, confidence: 0.85 }, operations: { change: 0.05, confidence: 0.60 }, financial: { change: 0.08, confidence: 0.62 } },
  operations:       { revenue: { change: 0.05, confidence: 0.58 }, marketing: { change: 0.00, confidence: 0.55 }, sales: { change: 0.05, confidence: 0.58 }, customer: { change: 0.05, confidence: 0.60 }, operations: { change: 0.32, confidence: 0.82 }, financial: { change: 0.12, confidence: 0.68 } },
  product:          { revenue: { change: 0.12, confidence: 0.65 }, marketing: { change: 0.10, confidence: 0.62 }, sales: { change: 0.10, confidence: 0.62 }, customer: { change: 0.25, confidence: 0.72 }, operations: { change: 0.05, confidence: 0.58 }, financial: { change: 0.05, confidence: 0.58 } },
  infrastructure:   { revenue: { change: 0.02, confidence: 0.55 }, marketing: { change: 0.00, confidence: 0.52 }, sales: { change: 0.02, confidence: 0.55 }, customer: { change: 0.05, confidence: 0.60 }, operations: { change: 0.22, confidence: 0.78 }, financial: { change: 0.05, confidence: 0.60 } },
  finance:          { revenue: { change: 0.05, confidence: 0.60 }, marketing: { change: 0.00, confidence: 0.52 }, sales: { change: 0.02, confidence: 0.55 }, customer: { change: 0.00, confidence: 0.52 }, operations: { change: 0.05, confidence: 0.58 }, financial: { change: 0.30, confidence: 0.82 } },
  risk_reduction:   { revenue: { change: 0.02, confidence: 0.55 }, marketing: { change: 0.00, confidence: 0.52 }, sales: { change: 0.02, confidence: 0.55 }, customer: { change: 0.05, confidence: 0.58 }, operations: { change: 0.10, confidence: 0.65 }, financial: { change: 0.05, confidence: 0.60 } },
  knowledge:        { revenue: { change: 0.05, confidence: 0.58 }, marketing: { change: 0.02, confidence: 0.55 }, sales: { change: 0.05, confidence: 0.58 }, customer: { change: 0.02, confidence: 0.55 }, operations: { change: 0.12, confidence: 0.68 }, financial: { change: 0.02, confidence: 0.55 } },
};

function direction(change: number): "up" | "down" | "flat" {
  if (change > 0.02) return "up";
  if (change < -0.02) return "down";
  return "flat";
}

export function projectKpis(input: ScenarioInput): KpiProjection[] {
  const table = KPI_IMPACT[input.category];
  const scale = input.compositeScore * input.businessImpact;

  return Object.entries(table).map(([category, row]) => {
    const scaledChange = parseFloat((row.change * scale * 2).toFixed(4));
    const scaledConf = parseFloat(Math.min(row.confidence * input.confidence, 0.95).toFixed(4));
    return {
      category,
      expectedChange: Math.max(-1, Math.min(1, scaledChange)),
      direction: direction(scaledChange),
      confidence: scaledConf,
      supportingEvidence: [
        `Opportunity: ${input.opportunityTitle}`,
        `Discovery source: ${input.discoverySource}`,
        `Opportunity composite score: ${(input.compositeScore * 100).toFixed(0)}%`,
      ],
    };
  });
}
