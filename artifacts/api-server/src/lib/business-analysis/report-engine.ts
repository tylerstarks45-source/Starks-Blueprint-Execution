// ─── Build 016: Analysis Report Engine ───────────────────────────────────────
//
// Produces immutable Business Analysis Reports.
// Assembles all engine outputs into a single structured report.
// Computes stability, complexity, maturity, confidence scores.
// Pure: no DB access.

import type {
  BusinessAnalysisReport,
  BusinessBottleneck,
  BusinessConstraint,
  BusinessLeveragePoint,
  BusinessOverview,
  ExecutiveFinding,
  GraphAnalysisResult,
  HealthAnalysisResult,
  KpiAnalysisResult,
} from "./types";

// ── Stability score ───────────────────────────────────────────────────────────
// A stable business has high health stability, few bottlenecks, few critical findings.

function computeStability(opts: {
  healthStability: number;
  bottleneckCount: number;
  criticalFindings: number;
  disconnectedClusters: number;
}): number {
  const { healthStability, bottleneckCount, criticalFindings, disconnectedClusters } = opts;
  const bottleneckPenalty = Math.min(0.4, bottleneckCount * 0.06);
  const criticalPenalty = Math.min(0.3, criticalFindings * 0.08);
  const clusterPenalty = Math.min(0.2, disconnectedClusters * 0.05);
  return parseFloat(Math.max(0, healthStability - bottleneckPenalty - criticalPenalty - clusterPenalty).toFixed(3));
}

// ── Confidence score ──────────────────────────────────────────────────────────
// How confident is the analysis given data completeness.

function computeAnalysisConfidence(opts: {
  nodeCount: number;
  kpiCount: number;
  hasHealth: boolean;
  depCount: number;
  healthConfidence: number;
}): number {
  const { nodeCount, kpiCount, hasHealth, depCount, healthConfidence } = opts;
  const nodeConf = Math.min(0.25, nodeCount * 0.025);
  const kpiConf = Math.min(0.25, kpiCount * 0.05);
  const healthConf = hasHealth ? 0.25 * healthConfidence : 0;
  const depConf = Math.min(0.15, depCount * 0.03);
  const baseConf = 0.10; // baseline for any analysis
  return parseFloat(Math.min(1, baseConf + nodeConf + kpiConf + healthConf + depConf).toFixed(3));
}

// ── Executive summary text ────────────────────────────────────────────────────

function buildExecutiveSummary(opts: {
  overview: BusinessOverview;
  graphAnalysis: GraphAnalysisResult;
  healthAnalysis: HealthAnalysisResult;
  bottlenecks: BusinessBottleneck[];
  constraints: BusinessConstraint[];
  leverage: BusinessLeveragePoint[];
  criticalFindings: number;
  stability: number;
  maturity: number;
  complexity: number;
}): string {
  const { overview, graphAnalysis, healthAnalysis, bottlenecks, constraints, leverage, criticalFindings, stability, maturity, complexity } = opts;

  const healthLabel = healthAnalysis.overallHealth >= 0.75 ? "healthy" : healthAnalysis.overallHealth >= 0.50 ? "moderate" : "needs attention";
  const maturityLabel = maturity >= 0.7 ? "mature" : maturity >= 0.4 ? "developing" : "early-stage";
  const complexityLabel = complexity >= 0.7 ? "high" : complexity >= 0.4 ? "moderate" : "low";

  const lines: string[] = [];
  lines.push(`${overview.businessName} is a ${maturityLabel} business with ${healthLabel} health (${(healthAnalysis.overallHealth * 100).toFixed(0)}% overall).`);
  lines.push(`The business graph has ${overview.nodeCount} nodes and ${overview.edgeCount} edges, representing ${complexityLabel} complexity.`);

  if (criticalFindings > 0) lines.push(`${criticalFindings} critical finding${criticalFindings > 1 ? "s require" : " requires"} immediate attention.`);

  if (healthAnalysis.weakestDimension !== "unknown") {
    lines.push(`Weakest dimension: ${healthAnalysis.weakestDimension} (${(healthAnalysis.weakestScore * 100).toFixed(0)}%). Strongest: ${healthAnalysis.strongestDimension} (${(healthAnalysis.strongestScore * 100).toFixed(0)}%).`);
  }

  if (bottlenecks.length > 0) {
    lines.push(`${bottlenecks.length} bottleneck${bottlenecks.length > 1 ? "s were" : " was"} identified; largest: ${bottlenecks[0]!.title}.`);
  }

  if (leverage.length > 0) {
    lines.push(`Top leverage point: ${leverage[0]!.title} (leverage score: ${(leverage[0]!.leverageScore * 100).toFixed(0)}%).`);
  }

  if (graphAnalysis.disconnectedClusters > 0) {
    lines.push(`${graphAnalysis.disconnectedClusters} disconnected cluster${graphAnalysis.disconnectedClusters > 1 ? "s suggest" : " suggests"} siloed operations.`);
  }

  return lines.join(" ");
}

// ── Main report builder ───────────────────────────────────────────────────────

export function buildAnalysisReport(opts: {
  reportId: string;
  businessId: number;
  userId: number | null;
  reportVersion: number;
  overview: BusinessOverview;
  graphAnalysis: GraphAnalysisResult;
  kpiAnalysis: KpiAnalysisResult;
  healthAnalysis: HealthAnalysisResult;
  bottlenecks: BusinessBottleneck[];
  constraints: BusinessConstraint[];
  leverage: BusinessLeveragePoint[];
  findings: ExecutiveFinding[];
}): BusinessAnalysisReport {
  const {
    reportId, businessId, userId, reportVersion,
    overview, graphAnalysis, kpiAnalysis, healthAnalysis,
    bottlenecks, constraints, leverage, findings,
  } = opts;

  const criticalFindings = findings.filter((f) => f.severity === "critical").length;

  const stability = computeStability({
    healthStability: healthAnalysis.healthStability,
    bottleneckCount: bottlenecks.length,
    criticalFindings,
    disconnectedClusters: graphAnalysis.disconnectedClusters,
  });

  const confidence = computeAnalysisConfidence({
    nodeCount: overview.nodeCount,
    kpiCount: overview.kpiCount,
    hasHealth: overview.overallHealth != null,
    depCount: overview.depCount,
    healthConfidence: healthAnalysis.healthConfidence,
  });

  const executiveSummary = buildExecutiveSummary({
    overview, graphAnalysis, healthAnalysis, bottlenecks, constraints, leverage,
    criticalFindings, stability, maturity: graphAnalysis.maturityScore,
    complexity: graphAnalysis.complexityScore,
  });

  return {
    id: reportId,
    businessId,
    userId,
    reportVersion,
    executiveSummary,
    businessOverview: overview,
    graphAnalysis,
    kpiAnalysis,
    healthAnalysis,
    bottlenecks,
    constraints,
    leveragePoints: leverage,
    businessStability: stability,
    businessComplexityScore: graphAnalysis.complexityScore,
    businessMaturityScore: graphAnalysis.maturityScore,
    businessConfidence: confidence,
    findingCount: findings.length,
    criticalFindingCount: criticalFindings,
    createdAt: new Date(),
  };
}

// ── EB summary builder ────────────────────────────────────────────────────────

export function buildAnalysisSummaryForEB(report: BusinessAnalysisReport): string {
  const lines: string[] = [
    `BUSINESS ANALYSIS: "${report.businessOverview.businessName}"`,
    `Maturity: ${(report.businessMaturityScore * 100).toFixed(0)}% | Complexity: ${(report.businessComplexityScore * 100).toFixed(0)}% | Stability: ${(report.businessStability * 100).toFixed(0)}% | Confidence: ${(report.businessConfidence * 100).toFixed(0)}%`,
  ];

  if (report.criticalFindingCount > 0) {
    lines.push(`CRITICAL: ${report.criticalFindingCount} critical finding${report.criticalFindingCount > 1 ? "s" : ""} require attention.`);
  }

  if (report.bottlenecks[0]) {
    lines.push(`Top bottleneck: ${report.bottlenecks[0].title} (severity: ${(report.bottlenecks[0].severity * 100).toFixed(0)}%)`);
  }

  if (report.constraints[0]) {
    lines.push(`Top constraint: ${report.constraints[0].title}`);
  }

  if (report.leveragePoints[0]) {
    lines.push(`Top leverage: ${report.leveragePoints[0].title}`);
  }

  lines.push(`Health analysis: weakest=${report.healthAnalysis.weakestDimension}(${(report.healthAnalysis.weakestScore * 100).toFixed(0)}%), drift=${report.healthAnalysis.healthDrift}`);

  return lines.join("\n");
}
