// ─── Build 016: Executive Findings Engine ────────────────────────────────────
//
// Aggregates outputs from all analysis engines into immutable Executive Findings.
// Findings are category + severity + evidence + confidence.
// No prescription. No planning. No execution. Purely explains. Pure.

import { randomUUID } from "crypto";
import type {
  BusinessBottleneck,
  BusinessConstraint,
  BusinessLeveragePoint,
  ExecutiveFinding,
  FindingCategory,
  FindingSeverity,
  GraphAnalysisResult,
  HealthAnalysisResult,
  KpiAnalysisResult,
} from "./types";

const uid = () => `bfind_${randomUUID().replace(/-/g, "").slice(0, 16)}`;

function makeFinding(opts: Omit<ExecutiveFinding, "id" | "version" | "createdAt">): ExecutiveFinding {
  return { ...opts, id: uid(), version: 1, createdAt: new Date() };
}

// ── Severity helpers ──────────────────────────────────────────────────────────

function severityFromScore(score: number): FindingSeverity {
  if (score >= 0.85) return "critical";
  if (score >= 0.70) return "high";
  if (score >= 0.50) return "medium";
  if (score >= 0.30) return "low";
  return "info";
}

// ── Graph findings ────────────────────────────────────────────────────────────

export function findingsFromGraph(
  graph: GraphAnalysisResult,
  businessId: number, reportId: string, userId: number | null,
): ExecutiveFinding[] {
  const results: ExecutiveFinding[] = [];

  if (graph.disconnectedClusters > 0) {
    results.push(makeFinding({
      businessId, reportId, userId,
      category: "graph",
      severity: graph.disconnectedClusters >= 3 ? "high" : "medium",
      title: `${graph.disconnectedClusters} disconnected cluster${graph.disconnectedClusters > 1 ? "s" : ""} in business graph`,
      description: `${graph.disconnectedClusters} part${graph.disconnectedClusters > 1 ? "s" : ""} of the business graph are not connected to the main cluster, suggesting siloed operations.`,
      evidence: [`Disconnected cluster count: ${graph.disconnectedClusters}`, `Total nodes: ${graph.nodeCount}`, `Total edges: ${graph.edgeCount}`],
      confidence: 0.90,
      businessDomains: ["operations", "strategy"],
      relatedNodeIds: [], relatedKpiIds: [], relatedHealthDimensions: [],
    }));
  }

  if (graph.completenessScore < 0.5) {
    results.push(makeFinding({
      businessId, reportId, userId,
      category: "graph",
      severity: graph.completenessScore < 0.3 ? "high" : "medium",
      title: "Business graph is incomplete",
      description: `Graph completeness is ${(graph.completenessScore * 100).toFixed(0)}% — key business entity types are missing.`,
      evidence: [`Completeness score: ${(graph.completenessScore * 100).toFixed(0)}%`, `Node types present: ${Object.keys(graph.nodeTypeDistribution).length}`],
      confidence: 0.85,
      businessDomains: ["strategy", "operations"],
      relatedNodeIds: [], relatedKpiIds: [], relatedHealthDimensions: [],
    }));
  }

  if (graph.criticalHubs.length > 0) {
    const topHub = graph.criticalHubs[0]!;
    results.push(makeFinding({
      businessId, reportId, userId,
      category: "graph",
      severity: topHub.hubScore >= 0.8 ? "high" : "medium",
      title: `Hub node "${topHub.nodeName}" is a critical connection point`,
      description: `"${topHub.nodeName}" (${topHub.nodeType}) has ${topHub.totalDegree} connections — it is a critical hub in the business graph.`,
      evidence: [`Hub score: ${(topHub.hubScore * 100).toFixed(0)}%`, `In-degree: ${topHub.inDegree}`, `Out-degree: ${topHub.outDegree}`],
      confidence: 0.92,
      businessDomains: ["operations"],
      relatedNodeIds: [topHub.nodeId], relatedKpiIds: [], relatedHealthDimensions: [],
    }));
  }

  return results;
}

// ── KPI findings ──────────────────────────────────────────────────────────────

export function findingsFromKpis(
  kpiAnalysis: KpiAnalysisResult,
  businessId: number, reportId: string, userId: number | null,
): ExecutiveFinding[] {
  const results: ExecutiveFinding[] = [];

  if (kpiAnalysis.totalKpis === 0) {
    results.push(makeFinding({
      businessId, reportId, userId,
      category: "kpi",
      severity: "high",
      title: "No KPIs defined",
      description: "The business has no KPIs defined. Business performance cannot be measured.",
      evidence: ["Zero KPIs found in business graph."],
      confidence: 1.0,
      businessDomains: ["finance", "growth", "operations"],
      relatedNodeIds: [], relatedKpiIds: [], relatedHealthDimensions: ["Financial", "Growth"],
    }));
    return results;
  }

  if (kpiAnalysis.decliningKpis.length > 0) {
    const sev: FindingSeverity = kpiAnalysis.decliningKpis.length >= 3 ? "high" : "medium";
    results.push(makeFinding({
      businessId, reportId, userId,
      category: "kpi",
      severity: sev,
      title: `${kpiAnalysis.decliningKpis.length} KPI${kpiAnalysis.decliningKpis.length > 1 ? "s are" : " is"} declining`,
      description: `${kpiAnalysis.decliningKpis.length} of ${kpiAnalysis.totalKpis} KPIs show a declining trend.`,
      evidence: kpiAnalysis.findings.filter((f) => f.includes("declining")),
      confidence: 0.88,
      businessDomains: ["finance", "growth"],
      relatedNodeIds: [], relatedKpiIds: kpiAnalysis.decliningKpis,
      relatedHealthDimensions: ["Financial", "Growth"],
    }));
  }

  if (kpiAnalysis.missingKpiTypes.length > 0) {
    results.push(makeFinding({
      businessId, reportId, userId,
      category: "kpi",
      severity: "medium",
      title: "Core KPI types are missing",
      description: `These core KPI types are not tracked: ${kpiAnalysis.missingKpiTypes.join(", ")}.`,
      evidence: [`Missing: ${kpiAnalysis.missingKpiTypes.join(", ")}`],
      confidence: 0.95,
      businessDomains: ["finance", "sales"],
      relatedNodeIds: [], relatedKpiIds: [],
      relatedHealthDimensions: ["Financial", "Sales"],
    }));
  }

  if (kpiAnalysis.unmeasuredObjectives.length > 0) {
    results.push(makeFinding({
      businessId, reportId, userId,
      category: "kpi",
      severity: kpiAnalysis.unmeasuredObjectives.length >= 3 ? "high" : "medium",
      title: `${kpiAnalysis.unmeasuredObjectives.length} objective${kpiAnalysis.unmeasuredObjectives.length > 1 ? "s are" : " is"} unmeasured`,
      description: `${kpiAnalysis.unmeasuredObjectives.length} objective node${kpiAnalysis.unmeasuredObjectives.length > 1 ? "s have" : " has"} no KPI measuring progress.`,
      evidence: [`Unmeasured objectives: ${kpiAnalysis.unmeasuredObjectives.length}`],
      confidence: 0.90,
      businessDomains: ["strategy"],
      relatedNodeIds: kpiAnalysis.unmeasuredObjectives, relatedKpiIds: [],
      relatedHealthDimensions: ["Executive"],
    }));
  }

  return results;
}

// ── Health findings ───────────────────────────────────────────────────────────

export function findingsFromHealth(
  healthAnalysis: HealthAnalysisResult,
  businessId: number, reportId: string, userId: number | null,
): ExecutiveFinding[] {
  const results: ExecutiveFinding[] = [];

  if (healthAnalysis.criticalDimensions.length > 0) {
    results.push(makeFinding({
      businessId, reportId, userId,
      category: "health",
      severity: "critical",
      title: `Critical health in: ${healthAnalysis.criticalDimensions.join(", ")}`,
      description: `${healthAnalysis.criticalDimensions.length} health dimension${healthAnalysis.criticalDimensions.length > 1 ? "s are" : " is"} critically low (below 40%).`,
      evidence: healthAnalysis.criticalDimensions.map((d) => `${d}: ${(( healthAnalysis.dimensionScores[d] ?? 0) * 100).toFixed(0)}%`),
      confidence: 0.92,
      businessDomains: healthAnalysis.criticalDimensions.map((d) => d.toLowerCase()),
      relatedNodeIds: [], relatedKpiIds: [],
      relatedHealthDimensions: healthAnalysis.criticalDimensions,
    }));
  }

  if (healthAnalysis.healthDrift === "declining") {
    results.push(makeFinding({
      businessId, reportId, userId,
      category: "health",
      severity: "high",
      title: "Overall business health is declining",
      description: `Health trend is declining. Weakest dimension: ${healthAnalysis.weakestDimension} (${(healthAnalysis.weakestScore * 100).toFixed(0)}%).`,
      evidence: [`Overall health: ${(healthAnalysis.overallHealth * 100).toFixed(0)}%`, `Weakest: ${healthAnalysis.weakestDimension} (${(healthAnalysis.weakestScore * 100).toFixed(0)}%)`],
      confidence: 0.85,
      businessDomains: ["operations", "finance"],
      relatedNodeIds: [], relatedKpiIds: [],
      relatedHealthDimensions: [healthAnalysis.weakestDimension],
    }));
  }

  return results;
}

// ── Bottleneck findings ───────────────────────────────────────────────────────

export function findingsFromBottlenecks(
  bottlenecks: BusinessBottleneck[],
  businessId: number, reportId: string, userId: number | null,
): ExecutiveFinding[] {
  return bottlenecks
    .filter((b) => b.severity >= 0.6)
    .slice(0, 4)
    .map((b) =>
      makeFinding({
        businessId, reportId, userId,
        category: "bottleneck",
        severity: severityFromScore(b.severity),
        title: b.title,
        description: b.description,
        evidence: b.evidence.slice(0, 3),
        confidence: b.confidence,
        businessDomains: [b.bottleneckType],
        relatedNodeIds: b.affectedNodeIds.slice(0, 5),
        relatedKpiIds: [], relatedHealthDimensions: [],
      }),
    );
}

// ── Constraint findings ───────────────────────────────────────────────────────

export function findingsFromConstraints(
  constraints: BusinessConstraint[],
  businessId: number, reportId: string, userId: number | null,
): ExecutiveFinding[] {
  return constraints
    .filter((c) => c.severity >= 0.55)
    .slice(0, 4)
    .map((c) =>
      makeFinding({
        businessId, reportId, userId,
        category: "constraint",
        severity: severityFromScore(c.severity),
        title: c.title,
        description: c.description,
        evidence: c.affectedDomains.map((d) => `Affected domain: ${d}`),
        confidence: 0.80,
        businessDomains: c.affectedDomains,
        relatedNodeIds: c.affectedNodeIds.slice(0, 5),
        relatedKpiIds: [], relatedHealthDimensions: [],
      }),
    );
}

// ── Leverage findings ─────────────────────────────────────────────────────────

export function findingsFromLeverage(
  leverage: BusinessLeveragePoint[],
  businessId: number, reportId: string, userId: number | null,
): ExecutiveFinding[] {
  return leverage
    .filter((l) => l.leverageScore >= 0.65)
    .slice(0, 3)
    .map((l) =>
      makeFinding({
        businessId, reportId, userId,
        category: "leverage",
        severity: l.leverageScore >= 0.80 ? "medium" : "low",
        title: l.title,
        description: l.description,
        evidence: [`Evidence count: ${l.evidenceCount}`, `Leverage score: ${(l.leverageScore * 100).toFixed(0)}%`],
        confidence: 0.80,
        businessDomains: [l.leverageType],
        relatedNodeIds: l.affectedNodeIds.slice(0, 5),
        relatedKpiIds: l.affectedKpiIds.slice(0, 3),
        relatedHealthDimensions: [],
      }),
    );
}

// ── Aggregate all findings ────────────────────────────────────────────────────

export function generateAllFindings(opts: {
  graphAnalysis: GraphAnalysisResult;
  kpiAnalysis: KpiAnalysisResult;
  healthAnalysis: HealthAnalysisResult;
  bottlenecks: BusinessBottleneck[];
  constraints: BusinessConstraint[];
  leverage: BusinessLeveragePoint[];
  businessId: number;
  reportId: string;
  userId: number | null;
}): ExecutiveFinding[] {
  const { graphAnalysis, kpiAnalysis, healthAnalysis, bottlenecks, constraints, leverage, businessId, reportId, userId } = opts;

  const severityOrder: Record<FindingSeverity, number> = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };

  return [
    ...findingsFromGraph(graphAnalysis, businessId, reportId, userId),
    ...findingsFromKpis(kpiAnalysis, businessId, reportId, userId),
    ...findingsFromHealth(healthAnalysis, businessId, reportId, userId),
    ...findingsFromBottlenecks(bottlenecks, businessId, reportId, userId),
    ...findingsFromConstraints(constraints, businessId, reportId, userId),
    ...findingsFromLeverage(leverage, businessId, reportId, userId),
  ].sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity]);
}
