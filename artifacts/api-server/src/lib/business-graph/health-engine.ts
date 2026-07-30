// ─── Build 015: Business Health Engine ───────────────────────────────────────
//
// Deterministic 7-dimension health scoring from Business Graph state.
// Dimensions: financial, marketing, sales, operational, product, growth, executive
// Pure: no DB access.

import type {
  BusinessDependency,
  BusinessEdge,
  BusinessHealth,
  BusinessKpi,
  BusinessNode,
  HealthIssue,
} from "./types";
import { summarizeKpiHealth, computeGrowthSignal } from "./kpi-engine";

// ── Score each dimension ───────────────────────────────────────────────────────

function scoreFinancial(kpis: BusinessKpi[], nodes: BusinessNode[]): number {
  const revenueTypes = ["revenue", "mrr", "arr", "profit"];
  const revenueKpis = kpis.filter((k) => revenueTypes.includes(k.kpiType));
  const expenseNodes = nodes.filter((n) => n.nodeType === "expense" && n.isActive);

  if (revenueKpis.length === 0) return 0.4; // no data = below neutral

  const revenueHealthy = revenueKpis.filter((k) => k.isHealthy).length;
  const revenueScore = revenueKpis.length > 0 ? revenueHealthy / revenueKpis.length : 0.5;

  // Penalize for many unmanaged expense nodes
  const expensePenalty = Math.min(0.2, expenseNodes.length * 0.02);
  return Math.max(0.1, Math.min(1.0, revenueScore - expensePenalty));
}

function scoreMarketing(kpis: BusinessKpi[], nodes: BusinessNode[]): number {
  const marketingKpiTypes = ["traffic", "lead_velocity", "conversion_rate"];
  const marketingKpis = kpis.filter((k) => marketingKpiTypes.includes(k.kpiType));
  const marketingNodes = nodes.filter(
    (n) => ["campaign", "funnel", "offer"].includes(n.nodeType) && n.isActive,
  );

  const nodeScore = Math.min(1.0, marketingNodes.length * 0.15);
  const kpiScore = marketingKpis.length > 0
    ? marketingKpis.filter((k) => k.isHealthy).length / marketingKpis.length
    : 0.4;

  const hasActiveFunnel = nodes.some((n) => n.nodeType === "funnel" && n.status === "active");
  const funnelBonus = hasActiveFunnel ? 0.1 : 0;

  return Math.min(1.0, nodeScore * 0.3 + kpiScore * 0.6 + funnelBonus);
}

function scoreSales(kpis: BusinessKpi[], nodes: BusinessNode[]): number {
  const salesKpiTypes = ["pipeline_value", "conversion_rate", "cac", "ltv"];
  const salesKpis = kpis.filter((k) => salesKpiTypes.includes(k.kpiType));
  const customerNodes = nodes.filter(
    (n) => ["customer", "lead"].includes(n.nodeType) && n.isActive,
  );

  const kpiScore = salesKpis.length > 0
    ? salesKpis.filter((k) => k.isHealthy).length / salesKpis.length
    : 0.4;
  const customerBonus = Math.min(0.2, customerNodes.length * 0.05);

  return Math.min(1.0, kpiScore * 0.7 + customerBonus + 0.1);
}

function scoreOperational(nodes: BusinessNode[], deps: BusinessDependency[]): number {
  const operationalNodes = nodes.filter(
    (n) => ["process", "automation", "department"].includes(n.nodeType) && n.isActive,
  );
  const blockedNodes = nodes.filter((n) => n.status === "blocked").length;
  const criticalDeps = deps.filter(
    (d) => !d.resolved && ["single_point_of_failure", "broken_workflow"].includes(d.dependencyType),
  ).length;

  const nodeScore = Math.min(0.5, operationalNodes.length * 0.1);
  const blockPenalty = Math.min(0.4, blockedNodes * 0.1);
  const depPenalty = Math.min(0.3, criticalDeps * 0.1);

  return Math.max(0.1, 0.7 + nodeScore - blockPenalty - depPenalty);
}

function scoreProduct(nodes: BusinessNode[], kpis: BusinessKpi[]): number {
  const productNodes = nodes.filter(
    (n) => ["product", "service"].includes(n.nodeType) && n.isActive,
  );
  const retentionKpis = kpis.filter((k) => ["retention", "churn"].includes(k.kpiType));

  if (productNodes.length === 0) return 0.3; // no products = low score

  const healthyProducts = productNodes.filter((n) => n.health === "healthy").length;
  const productScore = productNodes.length > 0 ? healthyProducts / productNodes.length : 0.5;
  const retentionScore = retentionKpis.length > 0
    ? retentionKpis.filter((k) => k.isHealthy).length / retentionKpis.length
    : 0.5;

  return Math.min(1.0, productScore * 0.6 + retentionScore * 0.4);
}

function scoreGrowth(kpis: BusinessKpi[]): number {
  const growthKpiTypes = ["growth_rate", "mrr", "arr", "lead_velocity", "traffic"];
  const growthKpis = kpis.filter((k) => growthKpiTypes.includes(k.kpiType));

  const growthSignal = computeGrowthSignal(kpis);
  const kpiScore = growthKpis.length > 0
    ? growthKpis.filter((k) => k.isHealthy).length / growthKpis.length
    : 0.4;

  return Math.min(1.0, growthSignal * 0.5 + kpiScore * 0.5);
}

function scoreExecutive(nodes: BusinessNode[], edges: BusinessEdge[]): number {
  const objectiveNodes = nodes.filter(
    (n) => n.nodeType === "objective" && n.isActive,
  );
  const riskNodes = nodes.filter(
    (n) => n.nodeType === "risk" && n.isActive && n.risk === "critical",
  );
  const blockedObjectives = objectiveNodes.filter((n) => n.status === "blocked").length;

  const objectiveBonus = Math.min(0.3, objectiveNodes.length * 0.1);
  const riskPenalty = Math.min(0.4, riskNodes.length * 0.1);
  const blockPenalty = Math.min(0.2, blockedObjectives * 0.1);

  return Math.max(0.1, Math.min(1.0, 0.6 + objectiveBonus - riskPenalty - blockPenalty));
}

// ── Compute overall health ────────────────────────────────────────────────────
// Weighted average: financial(25%), operational(20%), growth(15%), product(15%),
//                   marketing(10%), sales(10%), executive(5%)

function computeOverall(scores: {
  financial: number; marketing: number; sales: number; operational: number;
  product: number; growth: number; executive: number;
}): number {
  return (
    scores.financial * 0.25 +
    scores.operational * 0.20 +
    scores.growth * 0.15 +
    scores.product * 0.15 +
    scores.marketing * 0.10 +
    scores.sales * 0.10 +
    scores.executive * 0.05
  );
}

// ── Generate health issues ────────────────────────────────────────────────────

function generateIssues(opts: {
  scores: Record<string, number>;
  nodes: BusinessNode[];
  deps: BusinessDependency[];
  kpiSummary: ReturnType<typeof summarizeKpiHealth>;
}): HealthIssue[] {
  const { scores, nodes, deps, kpiSummary } = opts;
  const issues: HealthIssue[] = [];

  for (const [dim, score] of Object.entries(scores)) {
    if (score < 0.3) {
      issues.push({ dimension: dim, severity: "critical", description: `${dim.replace("_", " ")} is critically low (score: ${(score * 100).toFixed(0)}%).` });
    } else if (score < 0.5) {
      issues.push({ dimension: dim, severity: "high", description: `${dim.replace("_", " ")} is below healthy threshold (score: ${(score * 100).toFixed(0)}%).` });
    } else if (score < 0.65) {
      issues.push({ dimension: dim, severity: "medium", description: `${dim.replace("_", " ")} can be improved (score: ${(score * 100).toFixed(0)}%).` });
    }
  }

  const blockedNodes = nodes.filter((n) => n.status === "blocked");
  if (blockedNodes.length > 0) {
    issues.push({
      dimension: "operational",
      severity: "high",
      description: `${blockedNodes.length} node${blockedNodes.length > 1 ? "s are" : " is"} blocked.`,
      affectedNodeIds: blockedNodes.map((n) => n.id),
    });
  }

  const criticalDeps = deps.filter((d) => !d.resolved && d.severity >= 0.8);
  if (criticalDeps.length > 0) {
    issues.push({
      dimension: "operational",
      severity: "critical",
      description: `${criticalDeps.length} critical unresolved dependenc${criticalDeps.length > 1 ? "ies" : "y"} detected.`,
    });
  }

  if (kpiSummary.unhealthy > 0) {
    issues.push({
      dimension: "financial",
      severity: kpiSummary.unhealthy > kpiSummary.total / 2 ? "high" : "medium",
      description: `${kpiSummary.unhealthy} KPI${kpiSummary.unhealthy > 1 ? "s are" : " is"} below target.`,
    });
  }

  return issues.slice(0, 10);
}

// ── Generate recommendations ──────────────────────────────────────────────────

function generateRecommendations(opts: {
  scores: Record<string, number>;
  nodes: BusinessNode[];
  kpis: BusinessKpi[];
}): string[] {
  const { scores, nodes, kpis } = opts;
  const recs: string[] = [];

  if (scores.financial! < 0.5) recs.push("Add revenue KPIs (MRR, ARR) to improve financial visibility.");
  if (scores.marketing! < 0.5) recs.push("Create at least one active campaign or funnel node.");
  if (scores.growth! < 0.5) recs.push("Track growth KPIs (growth rate, lead velocity) to measure momentum.");
  if (scores.operational! < 0.5) recs.push("Resolve blocked nodes and broken workflow dependencies.");
  if (scores.product! < 0.5) recs.push("Track retention and churn KPIs for product health.");
  if (scores.executive! < 0.5) recs.push("Define objective nodes to clarify strategic priorities.");
  if (nodes.filter((n) => n.nodeType === "automation" && n.isActive).length === 0) {
    recs.push("Add automation nodes to improve operational efficiency.");
  }
  if (kpis.filter((k) => k.currentValue != null).length < kpis.length / 2) {
    recs.push("Record current values for KPIs to enable health tracking.");
  }

  return recs.slice(0, 5);
}

// ── Main health computation ───────────────────────────────────────────────────

export function computeBusinessHealth(opts: {
  businessId: number;
  userId: number | null;
  nodes: BusinessNode[];
  edges: BusinessEdge[];
  kpis: BusinessKpi[];
  deps: BusinessDependency[];
}): Omit<BusinessHealth, "id" | "computedAt"> {
  const { businessId, userId, nodes, edges, kpis, deps } = opts;
  const kpiSummary = summarizeKpiHealth(kpis);

  const scores = {
    financial: scoreFinancial(kpis, nodes),
    marketing: scoreMarketing(kpis, nodes),
    sales: scoreSales(kpis, nodes),
    operational: scoreOperational(nodes, deps),
    product: scoreProduct(nodes, kpis),
    growth: scoreGrowth(kpis),
    executive: scoreExecutive(nodes, edges),
  };
  const overall = computeOverall(scores);

  return {
    businessId,
    userId,
    overallHealth: parseFloat(overall.toFixed(3)),
    financialHealth: parseFloat(scores.financial.toFixed(3)),
    marketingHealth: parseFloat(scores.marketing.toFixed(3)),
    salesHealth: parseFloat(scores.sales.toFixed(3)),
    operationalHealth: parseFloat(scores.operational.toFixed(3)),
    productHealth: parseFloat(scores.product.toFixed(3)),
    growthHealth: parseFloat(scores.growth.toFixed(3)),
    executiveHealth: parseFloat(scores.executive.toFixed(3)),
    issues: generateIssues({ scores, nodes, deps, kpiSummary }),
    recommendations: generateRecommendations({ scores, nodes, kpis }),
    nodeCount: nodes.length,
    kpiCount: kpis.length,
    dependencyCount: deps.length,
    criticalDependencies: deps.filter((d) => !d.resolved && d.severity >= 0.8).length,
  };
}
