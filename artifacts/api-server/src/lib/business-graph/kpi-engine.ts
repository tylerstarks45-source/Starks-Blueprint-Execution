// ─── Build 015: KPI Engine ────────────────────────────────────────────────────
//
// KPI management: build KPI specs, compute trends, evaluate health.
// KPIs are first-class objects — tracked, measured, and scored.
// Pure: no DB access.

import type { BusinessKpi, KpiPeriod, KpiTrend, KpiType } from "./types";

// ── Build a KPI spec ──────────────────────────────────────────────────────────

export function buildKpiSpec(opts: {
  businessId: number;
  userId: number | null;
  nodeId?: string;
  name: string;
  kpiType: KpiType;
  currentValue?: number;
  targetValue?: number;
  unit?: string;
  period?: KpiPeriod;
  metadata?: Record<string, unknown>;
}): Omit<BusinessKpi, "id" | "createdAt" | "updatedAt"> {
  const currentValue = opts.currentValue ?? null;
  const targetValue = opts.targetValue ?? null;
  const trend = currentValue != null ? "stable" : "stable";
  const isHealthy = evaluateKpiHealth(opts.kpiType, currentValue, targetValue);

  return {
    businessId: opts.businessId,
    userId: opts.userId,
    nodeId: opts.nodeId ?? null,
    name: opts.name,
    kpiType: opts.kpiType,
    currentValue,
    targetValue,
    previousValue: null,
    unit: opts.unit ?? defaultUnitForType(opts.kpiType),
    trend,
    period: opts.period ?? defaultPeriodForType(opts.kpiType),
    isHealthy,
    metadata: opts.metadata ?? {},
    measuredAt: currentValue != null ? new Date() : null,
  };
}

// ── Default unit by KPI type ──────────────────────────────────────────────────

function defaultUnitForType(kpiType: KpiType): string {
  switch (kpiType) {
    case "revenue":
    case "mrr":
    case "arr":
    case "profit":
    case "cac":
    case "ltv":
    case "pipeline_value":
      return "USD";
    case "conversion_rate":
    case "retention":
    case "churn":
    case "growth_rate":
      return "%";
    case "traffic":
    case "lead_velocity":
      return "count";
    default:
      return "";
  }
}

// ── Default period by KPI type ────────────────────────────────────────────────

function defaultPeriodForType(kpiType: KpiType): KpiPeriod {
  switch (kpiType) {
    case "mrr":
    case "churn":
    case "retention":
      return "monthly";
    case "arr":
      return "annual";
    case "traffic":
    case "lead_velocity":
      return "weekly";
    case "revenue":
    case "profit":
    case "pipeline_value":
      return "monthly";
    default:
      return "monthly";
  }
}

// ── Compute trend from current vs previous value ──────────────────────────────

export function computeTrend(current: number, previous: number | null): KpiTrend {
  if (previous == null) return "stable";
  const delta = current - previous;
  const pctChange = Math.abs(delta) / Math.max(Math.abs(previous), 0.01);
  if (pctChange < 0.02) return "stable";          // < 2% change = stable
  if (pctChange > 0.20) return "volatile";         // > 20% swing = volatile
  return delta > 0 ? "up" : "down";
}

// ── Evaluate KPI health ───────────────────────────────────────────────────────

export function evaluateKpiHealth(
  kpiType: KpiType,
  current: number | null,
  target: number | null,
): boolean {
  if (current == null) return true;     // unknown = optimistic default
  if (target == null) return true;      // no target = can't evaluate

  // For "bad" KPIs (churn, cac, expense), lower is better
  const lowerIsBetter: KpiType[] = ["churn", "cac"];
  if (lowerIsBetter.includes(kpiType)) {
    return current <= target * 1.10;    // within 10% over target is acceptable
  }
  // For all other KPIs, higher is better
  return current >= target * 0.75;      // within 75% of target is acceptable
}

// ── Aggregate KPI health across a business ────────────────────────────────────

export interface KpiHealthSummary {
  total: number;
  healthy: number;
  unhealthy: number;
  healthRate: number;
  missingData: number;
  byType: Partial<Record<KpiType, { current: number | null; target: number | null; isHealthy: boolean; trend: KpiTrend }>>;
}

export function summarizeKpiHealth(kpis: BusinessKpi[]): KpiHealthSummary {
  const healthy = kpis.filter((k) => k.isHealthy && k.currentValue != null).length;
  const missingData = kpis.filter((k) => k.currentValue == null).length;
  const unhealthy = kpis.length - healthy - missingData;

  const byType: KpiHealthSummary["byType"] = {};
  for (const k of kpis) {
    byType[k.kpiType] = {
      current: k.currentValue,
      target: k.targetValue,
      isHealthy: k.isHealthy,
      trend: k.trend,
    };
  }

  return {
    total: kpis.length,
    healthy,
    unhealthy,
    healthRate: kpis.length > 0 ? healthy / kpis.length : 1,
    missingData,
    byType,
  };
}

// ── Identify key revenue KPIs ─────────────────────────────────────────────────

export function getRevenueKpis(kpis: BusinessKpi[]): BusinessKpi[] {
  const revenueTypes: KpiType[] = ["revenue", "mrr", "arr", "profit", "pipeline_value"];
  return kpis.filter((k) => revenueTypes.includes(k.kpiType));
}

// ── Get growth signal from KPI set ────────────────────────────────────────────

export function computeGrowthSignal(kpis: BusinessKpi[]): number {
  // Returns 0-1 representing overall growth trajectory
  if (kpis.length === 0) return 0.5;
  let upCount = 0;
  let downCount = 0;
  for (const k of kpis) {
    if (k.trend === "up") upCount++;
    else if (k.trend === "down") downCount++;
  }
  const total = kpis.length;
  return 0.5 + (upCount - downCount) / (total * 2);
}
