// ─── Build 016: KPI Analysis Engine ──────────────────────────────────────────
//
// Analyzes KPI state: healthy/declining/improving/missing/volatile KPIs,
// unmeasured objectives, revenue concentration, growth consistency.
// Reuses kpi-engine from Build 015. Pure.

import type { BusinessEdge, BusinessKpi, BusinessNode, KpiType } from "../business-graph/types";
import type { KpiAnalysisResult } from "./types";

// Expected core KPI types for a healthy business
const CORE_KPI_TYPES: KpiType[] = ["revenue", "mrr", "conversion_rate", "cac", "ltv"];
const GROWTH_KPI_TYPES: KpiType[] = ["mrr", "arr", "growth_rate", "lead_velocity", "traffic"];
const REVENUE_KPI_TYPES: KpiType[] = ["revenue", "mrr", "arr", "profit", "pipeline_value"];

export function analyzeKpis(
  kpis: BusinessKpi[],
  nodes: BusinessNode[],
  edges: BusinessEdge[],
): KpiAnalysisResult {
  const total = kpis.length;
  const healthy = kpis.filter((k) => k.isHealthy && k.currentValue != null).length;
  const declining = kpis.filter((k) => k.trend === "down").map((k) => k.id);
  const improving = kpis.filter((k) => k.trend === "up").map((k) => k.id);
  const volatile = kpis.filter((k) => k.trend === "volatile").map((k) => k.id);

  // Missing core KPI types
  const presentTypes = new Set(kpis.map((k) => k.kpiType));
  const missingKpiTypes = CORE_KPI_TYPES.filter((t) => !presentTypes.has(t)) as string[];

  // Unmeasured objectives: objective nodes with no "measures" edge pointing to them
  const measuredNodeIds = new Set(
    edges
      .filter((e) => e.isActive && e.edgeType === "measures")
      .map((e) => e.toNodeId),
  );
  // Also check KPI.nodeId linkage
  const kpiLinkedNodeIds = new Set(kpis.filter((k) => k.nodeId).map((k) => k.nodeId!));
  const objectiveNodes = nodes.filter((n) => n.nodeType === "objective" && n.isActive);
  const unmeasuredObjectives = objectiveNodes
    .filter((n) => !measuredNodeIds.has(n.id) && !kpiLinkedNodeIds.has(n.id))
    .map((n) => n.id);

  // Revenue concentration: how many revenue KPIs exist vs how many revenue nodes exist
  const revenueKpis = kpis.filter((k) => REVENUE_KPI_TYPES.includes(k.kpiType as KpiType));
  const revenueNodes = nodes.filter(
    (n) => n.nodeType === "revenue_stream" && n.isActive,
  );
  let revenueConcentration = 0;
  if (revenueNodes.length > 0 && revenueKpis.length > 0) {
    const revenueWithKpis = revenueNodes.filter((n) =>
      kpis.some((k) => k.nodeId === n.id && REVENUE_KPI_TYPES.includes(k.kpiType as KpiType)),
    ).length;
    revenueConcentration = revenueNodes.length === 1 ? 1.0 : 1 - revenueWithKpis / revenueNodes.length;
  }

  // Growth consistency: are growth KPIs all trending in the same direction?
  const growthKpis = kpis.filter((k) => GROWTH_KPI_TYPES.includes(k.kpiType as KpiType));
  let growthConsistency = 0.5;
  if (growthKpis.length > 0) {
    const upCount = growthKpis.filter((k) => k.trend === "up").length;
    const downCount = growthKpis.filter((k) => k.trend === "down").length;
    const consistency = Math.max(upCount, downCount) / growthKpis.length;
    growthConsistency = parseFloat(consistency.toFixed(2));
  }

  // KPI coverage: what fraction of active nodes have a linked KPI
  const activeNodes = nodes.filter((n) => n.isActive);
  const nodesWithKpi = activeNodes.filter(
    (n) => kpis.some((k) => k.nodeId === n.id) || measuredNodeIds.has(n.id),
  ).length;
  const kpiCoverageRate = activeNodes.length > 0
    ? parseFloat((nodesWithKpi / activeNodes.length).toFixed(3))
    : 0;

  // Human-readable findings
  const findings: string[] = [];
  if (declining.length > 0) findings.push(`${declining.length} KPI${declining.length > 1 ? "s are" : " is"} declining.`);
  if (missingKpiTypes.length > 0) findings.push(`Missing core KPI types: ${missingKpiTypes.join(", ")}.`);
  if (unmeasuredObjectives.length > 0) findings.push(`${unmeasuredObjectives.length} objective${unmeasuredObjectives.length > 1 ? "s have" : " has"} no measuring KPI.`);
  if (volatile.length > 0) findings.push(`${volatile.length} KPI${volatile.length > 1 ? "s are" : " is"} volatile.`);
  if (revenueConcentration >= 0.8) findings.push("Revenue is heavily concentrated — diversification may reduce risk.");
  if (total === 0) findings.push("No KPIs defined — business performance cannot be measured.");
  if (improving.length > 0) findings.push(`${improving.length} KPI${improving.length > 1 ? "s are" : " is"} improving.`);

  return {
    totalKpis: total,
    healthyKpis: healthy,
    decliningKpis: declining,
    improvingKpis: improving,
    volatileKpis: volatile,
    missingKpiTypes,
    unmeasuredObjectives,
    revenueConcentration: parseFloat(revenueConcentration.toFixed(3)),
    growthConsistency,
    kpiCoverageRate,
    findings,
  };
}
