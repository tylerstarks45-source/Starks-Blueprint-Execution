// ─── Build 018: Business Impact Engine ───────────────────────────────────────
//
// Estimates impact on 9 business dimensions for a given scenario input.
// Deterministic lookup table keyed on scenario type, scaled by opportunity scores.
// Pure function — no DB I/O.

import type { BusinessImpact, ScenarioInput, ScenarioType } from "./types";

// ── Base impact deltas by scenario type ──────────────────────────────────────
// Values are "direction * magnitude" deltas on [-1, +1] scale.
// Positive revenue/profit/etc = improvement. Positive risk = more risk.

type ImpactTemplate = {
  revenue: number;
  profit: number;
  cashFlow: number;
  customerGrowth: number;
  customerRetention: number;
  operationalCapacity: number;
  automation: number;
  employeeWorkload: number;  // positive = heavier load
  risk: number;              // positive = higher risk
};

const BASE_IMPACT: Record<ScenarioType, ImpactTemplate> = {
  revenue_growth: {
    revenue: 0.30, profit: 0.18, cashFlow: 0.12, customerGrowth: 0.22,
    customerRetention: 0.10, operationalCapacity: 0.05, automation: 0.00,
    employeeWorkload: 0.15, risk: 0.10,
  },
  cost_reduction: {
    revenue: 0.02, profit: 0.32, cashFlow: 0.28, customerGrowth: 0.00,
    customerRetention: -0.05, operationalCapacity: 0.12, automation: 0.05,
    employeeWorkload: -0.10, risk: -0.12,
  },
  automation: {
    revenue: 0.08, profit: 0.15, cashFlow: 0.10, customerGrowth: 0.05,
    customerRetention: 0.08, operationalCapacity: 0.38, automation: 0.45,
    employeeWorkload: -0.25, risk: -0.12,
  },
  marketing: {
    revenue: 0.18, profit: 0.08, cashFlow: -0.05, customerGrowth: 0.35,
    customerRetention: 0.15, operationalCapacity: 0.02, automation: 0.00,
    employeeWorkload: 0.12, risk: 0.05,
  },
  sales: {
    revenue: 0.32, profit: 0.12, cashFlow: 0.15, customerGrowth: 0.28,
    customerRetention: 0.05, operationalCapacity: 0.05, automation: 0.02,
    employeeWorkload: 0.18, risk: 0.08,
  },
  customer_success: {
    revenue: 0.12, profit: 0.10, cashFlow: 0.08, customerGrowth: 0.08,
    customerRetention: 0.38, operationalCapacity: 0.05, automation: 0.02,
    employeeWorkload: 0.10, risk: -0.12,
  },
  operations: {
    revenue: 0.05, profit: 0.12, cashFlow: 0.10, customerGrowth: 0.02,
    customerRetention: 0.05, operationalCapacity: 0.32, automation: 0.08,
    employeeWorkload: -0.18, risk: -0.12,
  },
  product: {
    revenue: 0.15, profit: 0.08, cashFlow: -0.08, customerGrowth: 0.22,
    customerRetention: 0.28, operationalCapacity: 0.05, automation: 0.05,
    employeeWorkload: 0.20, risk: 0.12,
  },
  infrastructure: {
    revenue: 0.02, profit: 0.05, cashFlow: -0.10, customerGrowth: 0.02,
    customerRetention: 0.05, operationalCapacity: 0.22, automation: 0.12,
    employeeWorkload: -0.05, risk: -0.28,
  },
  finance: {
    revenue: 0.05, profit: 0.22, cashFlow: 0.32, customerGrowth: 0.00,
    customerRetention: 0.00, operationalCapacity: 0.05, automation: 0.02,
    employeeWorkload: 0.05, risk: -0.18,
  },
  risk_reduction: {
    revenue: 0.02, profit: 0.05, cashFlow: 0.05, customerGrowth: 0.00,
    customerRetention: 0.05, operationalCapacity: 0.10, automation: 0.02,
    employeeWorkload: -0.05, risk: -0.42,
  },
  knowledge: {
    revenue: 0.05, profit: 0.05, cashFlow: 0.02, customerGrowth: 0.02,
    customerRetention: 0.02, operationalCapacity: 0.12, automation: 0.05,
    employeeWorkload: -0.08, risk: -0.12,
  },
};

function clamp(v: number, min = -1, max = 1): number {
  return Math.max(min, Math.min(max, v));
}

export function estimateBusinessImpact(input: ScenarioInput): BusinessImpact {
  const base = BASE_IMPACT[input.category];
  const scale = clamp(input.businessImpact, 0, 1) * clamp(input.compositeScore, 0, 1);

  return {
    revenue:             parseFloat((clamp(base.revenue             * scale * 1.5)).toFixed(4)),
    profit:              parseFloat((clamp(base.profit              * scale * 1.5)).toFixed(4)),
    cashFlow:            parseFloat((clamp(base.cashFlow            * scale * 1.5)).toFixed(4)),
    customerGrowth:      parseFloat((clamp(base.customerGrowth      * scale * 1.5)).toFixed(4)),
    customerRetention:   parseFloat((clamp(base.customerRetention   * scale * 1.5)).toFixed(4)),
    operationalCapacity: parseFloat((clamp(base.operationalCapacity * scale * 1.5)).toFixed(4)),
    automation:          parseFloat((clamp(base.automation          * scale * 1.5)).toFixed(4)),
    employeeWorkload:    parseFloat((clamp(base.employeeWorkload     * scale * 1.5)).toFixed(4)),
    risk:                parseFloat((clamp(base.risk                * scale)).toFixed(4)),
  };
}

// ── Expected value score ──────────────────────────────────────────────────────
// Aggregate score for comparing scenarios: higher revenue/profit/growth > lower risk

export function computeExpectedValueScore(impact: BusinessImpact, confidence: number): number {
  const value = (
    Math.max(0, impact.revenue)          * 0.25 +
    Math.max(0, impact.profit)           * 0.20 +
    Math.max(0, impact.cashFlow)         * 0.10 +
    Math.max(0, impact.customerGrowth)   * 0.15 +
    Math.max(0, impact.automation)       * 0.10 +
    (1 - Math.max(0, impact.risk))       * 0.10 +
    (1 - Math.max(0, impact.employeeWorkload)) * 0.10
  ) * confidence;
  return parseFloat(Math.max(0, Math.min(1, value)).toFixed(4));
}
