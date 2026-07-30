// ─── Build 016: Business Analysis Orchestrator ────────────────────────────────
//
// Orchestrates a full analysis run: reads Business Graph data (from Build 015),
// runs all 8 engines, persists results to all 8 tables.

import { randomUUID } from "crypto";
import { analyzeGraph } from "./graph-analysis-engine";
import { analyzeKpis } from "./kpi-analysis-engine";
import { analyzeHealth } from "./health-analysis-engine";
import { detectAllBottlenecks } from "./bottleneck-engine";
import { detectAllConstraints } from "./constraint-engine";
import { detectAllLeveragePoints } from "./leverage-engine";
import { generateAllFindings } from "./findings-engine";
import { buildAnalysisReport } from "./report-engine";
import {
  persistAnalysisReport, persistFindings, persistBottlenecks,
  persistConstraints, persistLeverage, persistSnapshot,
  persistMetrics, upsertAnalysisRegistry, getLatestReport,
} from "./analysis-registry";
import {
  listNodes, listEdges, listKpis, getLatestHealth,
  listDependencies, getBusiness,
} from "../business-graph/business-registry";
import type { BusinessAnalysisReport, BusinessAnalysisSummary } from "./types";
import { logger } from "../logger";

const uid = (p: string) => `${p}_${randomUUID().replace(/-/g, "").slice(0, 18)}`;

// ── Run a full analysis ───────────────────────────────────────────────────────

export async function runBusinessAnalysis(
  businessId: number,
  userId: number,
  reportVersion = 1,
): Promise<BusinessAnalysisReport | null> {
  const startMs = Date.now();

  try {
    const [business, nodes, edges, kpis, health, deps] = await Promise.all([
      getBusiness(businessId),
      listNodes(businessId),
      listEdges(businessId),
      listKpis(businessId),
      getLatestHealth(businessId),
      listDependencies(businessId),
    ]);

    if (!business) {
      logger.warn({ businessId }, "Business Analysis: business not found");
      return null;
    }

    const reportId = uid("bar");

    // ── Run all 8 engines ──────────────────────────────────────────────────────
    const graphAnalysis = analyzeGraph(nodes, edges);
    const kpiAnalysis = analyzeKpis(kpis, nodes, edges);
    const healthAnalysis = analyzeHealth(health, null); // no previous health for now

    const bottlenecks = detectAllBottlenecks({ nodes, edges, kpis, deps, health, reportId, businessId, userId });
    const constraints = detectAllConstraints({ nodes, edges, kpis, deps, reportId, businessId, userId });
    const leverage = detectAllLeveragePoints({ nodes, edges, kpis, deps, reportId, businessId, userId });
    const findings = generateAllFindings({ graphAnalysis, kpiAnalysis, healthAnalysis, bottlenecks, constraints, leverage, businessId, reportId, userId });

    const overview = {
      businessId, businessName: business.name, businessType: business.businessType,
      nodeCount: nodes.filter((n) => n.isActive).length,
      edgeCount: edges.filter((e) => e.isActive).length,
      kpiCount: kpis.length,
      depCount: deps.length,
      overallHealth: health?.overallHealth ?? null,
      topNodeType: Object.entries(graphAnalysis.nodeTypeDistribution).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null,
    };

    const report = buildAnalysisReport({
      reportId, businessId, userId, reportVersion, overview,
      graphAnalysis, kpiAnalysis, healthAnalysis,
      bottlenecks, constraints, leverage, findings,
    });

    const computedMs = Date.now() - startMs;

    // ── Persist everything ─────────────────────────────────────────────────────
    await persistAnalysisReport(report);
    await Promise.all([
      persistFindings(findings),
      persistBottlenecks(bottlenecks),
      persistConstraints(constraints),
      persistLeverage(leverage),
      persistSnapshot({
        id: uid("asnap"), businessId, reportId, userId,
        nodeCount: overview.nodeCount, edgeCount: overview.edgeCount,
        kpiCount: overview.kpiCount, healthScore: health?.overallHealth ?? null,
        depCount: deps.length,
        graphState: { nodeTypes: graphAnalysis.nodeTypeDistribution, edgeTypes: graphAnalysis.edgeTypeDistribution },
        createdAt: new Date(),
      }),
      persistMetrics({
        id: uid("ametric"), businessId, reportId, userId,
        findingCount: findings.length,
        criticalFindings: findings.filter((f) => f.severity === "critical").length,
        highFindings: findings.filter((f) => f.severity === "high").length,
        bottleneckCount: bottlenecks.length,
        constraintCount: constraints.length,
        leverageCount: leverage.length,
        complexityScore: report.businessComplexityScore,
        maturityScore: report.businessMaturityScore,
        confidenceScore: report.businessConfidence,
        stabilityScore: report.businessStability,
        computedMs,
        createdAt: new Date(),
      }),
    ]);

    await upsertAnalysisRegistry({
      businessId, userId: userId,
      reportId, complexity: report.businessComplexityScore,
      maturity: report.businessMaturityScore,
      confidence: report.businessConfidence,
      stability: report.businessStability,
    });

    logger.info({
      businessId, userId, reportId, computedMs,
      findings: findings.length, bottlenecks: bottlenecks.length,
      constraints: constraints.length, leverage: leverage.length,
    }, "Business Analysis: analysis complete");

    return report;
  } catch (err) {
    logger.warn({ err, businessId }, "Business Analysis: runBusinessAnalysis failed");
    return null;
  }
}

// ── Fetch summary for EB ──────────────────────────────────────────────────────

export async function fetchAnalysisSummaryForEB(userId: number): Promise<BusinessAnalysisSummary | null> {
  try {
    // Find the primary business for this user
    const { db } = await import("@workspace/db");
    const { businessesTable } = await import("@workspace/db/schema");
    const { eq, desc } = await import("drizzle-orm");
    const bizRows = await db.select().from(businessesTable)
      .where(eq(businessesTable.ownerId, userId))
      .orderBy(desc(businessesTable.updatedAt))
      .limit(1);
    if (!bizRows[0]) return null;

    const report = await getLatestReport(bizRows[0].id);
    if (!report) return null;

    return {
      businessId: report.businessId,
      complexityScore: report.businessComplexityScore,
      maturityScore: report.businessMaturityScore,
      stabilityScore: report.businessStability,
      confidence: report.businessConfidence,
      criticalFindings: report.criticalFindingCount,
      topBottleneck: report.bottlenecks[0]
        ? { bottleneckType: report.bottlenecks[0].bottleneckType, title: report.bottlenecks[0].title, severity: report.bottlenecks[0].severity }
        : null,
      topConstraint: report.constraints[0]
        ? { constraintType: report.constraints[0].constraintType, title: report.constraints[0].title, severity: report.constraints[0].severity }
        : null,
      topLeverage: report.leveragePoints[0]
        ? { leverageType: report.leveragePoints[0].leverageType, title: report.leveragePoints[0].title, leverageScore: report.leveragePoints[0].leverageScore }
        : null,
      weakestDimension: report.healthAnalysis?.weakestDimension ?? null,
      analyzedAt: report.createdAt,
    };
  } catch (err) {
    logger.warn({ err }, "Business Analysis: fetchAnalysisSummaryForEB failed");
    return null;
  }
}
