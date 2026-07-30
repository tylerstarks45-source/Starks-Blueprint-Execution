// ─── Build 016: Business Analysis Registry ───────────────────────────────────
//
// All DB persistence for the Business Analysis Engine.
// Tables are append-only and immutable (reports, findings, bottlenecks,
// constraints, leverage). analysis_registry is the mutable roll-up.

import { db } from "@workspace/db";
import {
  businessAnalysisReportsTable,
  businessFindingsTable,
  businessBottlenecksTable,
  businessConstraintsTable,
  businessLeveragePointsTable,
  analysisSnapshotsTable,
  analysisMetricsTable,
  analysisRegistryTable,
} from "@workspace/db/schema";
import { eq, and, desc, asc, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import type {
  AnalysisMetrics,
  AnalysisRegistryEntry,
  AnalysisSnapshot,
  BusinessAnalysisReport,
  BusinessBottleneck,
  BusinessConstraint,
  BusinessLeveragePoint,
  ExecutiveFinding,
} from "./types";
import { logger } from "../logger";

const uid = (prefix: string) => `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 18)}`;

// ── Persist a full analysis run ───────────────────────────────────────────────

export async function persistAnalysisReport(report: BusinessAnalysisReport): Promise<void> {
  await db.insert(businessAnalysisReportsTable).values({
    id: report.id,
    businessId: report.businessId,
    userId: report.userId,
    reportVersion: report.reportVersion,
    executiveSummary: report.executiveSummary,
    businessOverview: report.businessOverview as any,
    graphAnalysis: report.graphAnalysis as any,
    kpiAnalysis: report.kpiAnalysis as any,
    healthAnalysis: report.healthAnalysis as any,
    bottlenecks: report.bottlenecks as any,
    constraints: report.constraints as any,
    leveragePoints: report.leveragePoints as any,
    businessStability: report.businessStability,
    businessComplexityScore: report.businessComplexityScore,
    businessMaturityScore: report.businessMaturityScore,
    businessConfidence: report.businessConfidence,
    findingCount: report.findingCount,
    criticalFindingCount: report.criticalFindingCount,
    createdAt: report.createdAt,
  });
}

export async function persistFindings(findings: ExecutiveFinding[]): Promise<void> {
  if (findings.length === 0) return;
  await db.insert(businessFindingsTable).values(
    findings.map((f) => ({
      id: f.id,
      businessId: f.businessId,
      reportId: f.reportId,
      userId: f.userId,
      category: f.category,
      severity: f.severity,
      title: f.title,
      description: f.description,
      evidence: f.evidence as any,
      confidence: f.confidence,
      businessDomains: f.businessDomains as any,
      relatedNodeIds: f.relatedNodeIds as any,
      relatedKpiIds: f.relatedKpiIds as any,
      relatedHealthDimensions: f.relatedHealthDimensions as any,
      version: f.version,
      createdAt: f.createdAt,
    })),
  );
}

export async function persistBottlenecks(bottlenecks: BusinessBottleneck[]): Promise<void> {
  if (bottlenecks.length === 0) return;
  await db.insert(businessBottlenecksTable).values(
    bottlenecks.map((b) => ({
      id: b.id,
      businessId: b.businessId,
      reportId: b.reportId,
      userId: b.userId,
      bottleneckType: b.bottleneckType,
      title: b.title,
      description: b.description,
      severity: b.severity,
      evidence: b.evidence as any,
      businessImpact: b.businessImpact,
      confidence: b.confidence,
      affectedNodeIds: b.affectedNodeIds as any,
      createdAt: b.createdAt,
    })),
  );
}

export async function persistConstraints(constraints: BusinessConstraint[]): Promise<void> {
  if (constraints.length === 0) return;
  await db.insert(businessConstraintsTable).values(
    constraints.map((c) => ({
      id: c.id,
      businessId: c.businessId,
      reportId: c.reportId,
      userId: c.userId,
      constraintType: c.constraintType,
      title: c.title,
      description: c.description,
      severity: c.severity,
      affectedDomains: c.affectedDomains as any,
      affectedNodeIds: c.affectedNodeIds as any,
      metadata: c.metadata as any,
      createdAt: c.createdAt,
    })),
  );
}

export async function persistLeverage(points: BusinessLeveragePoint[]): Promise<void> {
  if (points.length === 0) return;
  await db.insert(businessLeveragePointsTable).values(
    points.map((l) => ({
      id: l.id,
      businessId: l.businessId,
      reportId: l.reportId,
      userId: l.userId,
      leverageType: l.leverageType,
      title: l.title,
      description: l.description,
      leverageScore: l.leverageScore,
      affectedNodeIds: l.affectedNodeIds as any,
      affectedKpiIds: l.affectedKpiIds as any,
      evidenceCount: l.evidenceCount,
      createdAt: l.createdAt,
    })),
  );
}

export async function persistSnapshot(snap: AnalysisSnapshot): Promise<void> {
  await db.insert(analysisSnapshotsTable).values({
    id: snap.id,
    businessId: snap.businessId,
    reportId: snap.reportId,
    userId: snap.userId,
    nodeCount: snap.nodeCount,
    edgeCount: snap.edgeCount,
    kpiCount: snap.kpiCount,
    healthScore: snap.healthScore ?? undefined,
    depCount: snap.depCount,
    graphState: snap.graphState as any,
    createdAt: snap.createdAt,
  });
}

export async function persistMetrics(m: AnalysisMetrics): Promise<void> {
  await db.insert(analysisMetricsTable).values({
    id: m.id,
    businessId: m.businessId,
    reportId: m.reportId,
    userId: m.userId,
    findingCount: m.findingCount,
    criticalFindings: m.criticalFindings,
    highFindings: m.highFindings,
    bottleneckCount: m.bottleneckCount,
    constraintCount: m.constraintCount,
    leverageCount: m.leverageCount,
    complexityScore: m.complexityScore,
    maturityScore: m.maturityScore,
    confidenceScore: m.confidenceScore,
    stabilityScore: m.stabilityScore,
    computedMs: m.computedMs,
    createdAt: m.createdAt,
  });
}

// ── Registry upsert ───────────────────────────────────────────────────────────

export async function upsertAnalysisRegistry(opts: {
  businessId: number;
  userId: number | null;
  reportId: string;
  complexity: number;
  maturity: number;
  confidence: number;
  stability: number;
}): Promise<void> {
  const existing = await db.select({ id: analysisRegistryTable.id, reportCount: analysisRegistryTable.reportCount })
    .from(analysisRegistryTable)
    .where(eq(analysisRegistryTable.businessId, opts.businessId))
    .limit(1);
  const now = new Date();

  if (existing[0]) {
    await db.update(analysisRegistryTable).set({
      reportCount: (existing[0].reportCount ?? 0) + 1,
      latestReportId: opts.reportId,
      latestComplexity: opts.complexity,
      latestMaturity: opts.maturity,
      latestConfidence: opts.confidence,
      latestStability: opts.stability,
      lastAnalyzedAt: now,
      updatedAt: now,
    }).where(eq(analysisRegistryTable.businessId, opts.businessId));
  } else {
    await db.insert(analysisRegistryTable).values({
      id: uid("areg"),
      businessId: opts.businessId,
      userId: opts.userId,
      reportCount: 1,
      latestReportId: opts.reportId,
      latestComplexity: opts.complexity,
      latestMaturity: opts.maturity,
      latestConfidence: opts.confidence,
      latestStability: opts.stability,
      lastAnalyzedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }
}

// ── Read operations ───────────────────────────────────────────────────────────

export async function getLatestReport(businessId: number): Promise<BusinessAnalysisReport | null> {
  const rows = await db.select().from(businessAnalysisReportsTable)
    .where(eq(businessAnalysisReportsTable.businessId, businessId))
    .orderBy(desc(businessAnalysisReportsTable.createdAt))
    .limit(1);
  if (!rows[0]) return null;
  const r = rows[0] as any;
  return {
    id: r.id, businessId: r.businessId ?? r.business_id, userId: r.userId ?? r.user_id,
    reportVersion: r.reportVersion ?? r.report_version,
    executiveSummary: r.executiveSummary ?? r.executive_summary,
    businessOverview: r.businessOverview ?? r.business_overview,
    graphAnalysis: r.graphAnalysis ?? r.graph_analysis,
    kpiAnalysis: r.kpiAnalysis ?? r.kpi_analysis,
    healthAnalysis: r.healthAnalysis ?? r.health_analysis,
    bottlenecks: r.bottlenecks ?? [],
    constraints: r.constraints ?? [],
    leveragePoints: r.leveragePoints ?? r.leverage_points ?? [],
    businessStability: r.businessStability ?? r.business_stability,
    businessComplexityScore: r.businessComplexityScore ?? r.business_complexity_score,
    businessMaturityScore: r.businessMaturityScore ?? r.business_maturity_score,
    businessConfidence: r.businessConfidence ?? r.business_confidence,
    findingCount: r.findingCount ?? r.finding_count,
    criticalFindingCount: r.criticalFindingCount ?? r.critical_finding_count,
    createdAt: new Date(r.createdAt ?? r.created_at),
  };
}

export async function listReports(businessId: number, limit = 10): Promise<BusinessAnalysisReport[]> {
  const rows = await db.select().from(businessAnalysisReportsTable)
    .where(eq(businessAnalysisReportsTable.businessId, businessId))
    .orderBy(desc(businessAnalysisReportsTable.createdAt))
    .limit(limit);
  return rows.map((r: any) => ({
    id: r.id, businessId: r.businessId ?? r.business_id, userId: r.userId ?? r.user_id,
    reportVersion: r.reportVersion ?? r.report_version,
    executiveSummary: r.executiveSummary ?? r.executive_summary,
    businessOverview: r.businessOverview ?? r.business_overview,
    graphAnalysis: r.graphAnalysis ?? r.graph_analysis,
    kpiAnalysis: r.kpiAnalysis ?? r.kpi_analysis,
    healthAnalysis: r.healthAnalysis ?? r.health_analysis,
    bottlenecks: r.bottlenecks ?? [],
    constraints: r.constraints ?? [],
    leveragePoints: r.leveragePoints ?? r.leverage_points ?? [],
    businessStability: r.businessStability ?? r.business_stability,
    businessComplexityScore: r.businessComplexityScore ?? r.business_complexity_score,
    businessMaturityScore: r.businessMaturityScore ?? r.business_maturity_score,
    businessConfidence: r.businessConfidence ?? r.business_confidence,
    findingCount: r.findingCount ?? r.finding_count,
    criticalFindingCount: r.criticalFindingCount ?? r.critical_finding_count,
    createdAt: new Date(r.createdAt ?? r.created_at),
  }));
}

export async function listFindings(reportId: string): Promise<ExecutiveFinding[]> {
  const rows = await db.select().from(businessFindingsTable)
    .where(eq(businessFindingsTable.reportId, reportId))
    .orderBy(desc(businessFindingsTable.confidence));
  return rows.map((r: any) => ({
    id: r.id, businessId: r.businessId ?? r.business_id, reportId: r.reportId ?? r.report_id,
    userId: r.userId ?? r.user_id,
    category: r.category, severity: r.severity, title: r.title, description: r.description,
    evidence: r.evidence ?? [], confidence: r.confidence,
    businessDomains: r.businessDomains ?? r.business_domains ?? [],
    relatedNodeIds: r.relatedNodeIds ?? r.related_node_ids ?? [],
    relatedKpiIds: r.relatedKpiIds ?? r.related_kpi_ids ?? [],
    relatedHealthDimensions: r.relatedHealthDimensions ?? r.related_health_dimensions ?? [],
    version: r.version, createdAt: new Date(r.createdAt ?? r.created_at),
  }));
}

export async function listBottlenecks(reportId: string): Promise<BusinessBottleneck[]> {
  const rows = await db.select().from(businessBottlenecksTable)
    .where(eq(businessBottlenecksTable.reportId, reportId))
    .orderBy(desc(businessBottlenecksTable.severity));
  return rows.map((r: any) => ({
    id: r.id, businessId: r.businessId ?? r.business_id, reportId: r.reportId ?? r.report_id,
    userId: r.userId ?? r.user_id,
    bottleneckType: r.bottleneckType ?? r.bottleneck_type,
    title: r.title, description: r.description, severity: r.severity,
    evidence: r.evidence ?? [], businessImpact: r.businessImpact ?? r.business_impact,
    confidence: r.confidence,
    affectedNodeIds: r.affectedNodeIds ?? r.affected_node_ids ?? [],
    createdAt: new Date(r.createdAt ?? r.created_at),
  }));
}

export async function listConstraints(reportId: string): Promise<BusinessConstraint[]> {
  const rows = await db.select().from(businessConstraintsTable)
    .where(eq(businessConstraintsTable.reportId, reportId))
    .orderBy(desc(businessConstraintsTable.severity));
  return rows.map((r: any) => ({
    id: r.id, businessId: r.businessId ?? r.business_id, reportId: r.reportId ?? r.report_id,
    userId: r.userId ?? r.user_id,
    constraintType: r.constraintType ?? r.constraint_type,
    title: r.title, description: r.description, severity: r.severity,
    affectedDomains: r.affectedDomains ?? r.affected_domains ?? [],
    affectedNodeIds: r.affectedNodeIds ?? r.affected_node_ids ?? [],
    metadata: r.metadata ?? {}, createdAt: new Date(r.createdAt ?? r.created_at),
  }));
}

export async function listLeverage(reportId: string): Promise<BusinessLeveragePoint[]> {
  const rows = await db.select().from(businessLeveragePointsTable)
    .where(eq(businessLeveragePointsTable.reportId, reportId))
    .orderBy(desc(businessLeveragePointsTable.leverageScore));
  return rows.map((r: any) => ({
    id: r.id, businessId: r.businessId ?? r.business_id, reportId: r.reportId ?? r.report_id,
    userId: r.userId ?? r.user_id,
    leverageType: r.leverageType ?? r.leverage_type,
    title: r.title, description: r.description, leverageScore: r.leverageScore ?? r.leverage_score,
    affectedNodeIds: r.affectedNodeIds ?? r.affected_node_ids ?? [],
    affectedKpiIds: r.affectedKpiIds ?? r.affected_kpi_ids ?? [],
    evidenceCount: r.evidenceCount ?? r.evidence_count,
    createdAt: new Date(r.createdAt ?? r.created_at),
  }));
}

export async function listSnapshots(reportId: string): Promise<AnalysisSnapshot[]> {
  const rows = await db.select().from(analysisSnapshotsTable)
    .where(eq(analysisSnapshotsTable.reportId, reportId));
  return rows.map((r: any) => ({
    id: r.id, businessId: r.businessId ?? r.business_id, reportId: r.reportId ?? r.report_id,
    userId: r.userId ?? r.user_id,
    nodeCount: r.nodeCount ?? r.node_count, edgeCount: r.edgeCount ?? r.edge_count,
    kpiCount: r.kpiCount ?? r.kpi_count, healthScore: r.healthScore ?? r.health_score,
    depCount: r.depCount ?? r.dep_count, graphState: r.graphState ?? r.graph_state ?? {},
    createdAt: new Date(r.createdAt ?? r.created_at),
  }));
}

export async function getRegistryEntry(businessId: number): Promise<AnalysisRegistryEntry | null> {
  const rows = await db.select().from(analysisRegistryTable)
    .where(eq(analysisRegistryTable.businessId, businessId)).limit(1);
  if (!rows[0]) return null;
  const r = rows[0] as any;
  return {
    id: r.id, businessId: r.businessId ?? r.business_id, userId: r.userId ?? r.user_id,
    reportCount: r.reportCount ?? r.report_count,
    latestReportId: r.latestReportId ?? r.latest_report_id,
    latestComplexity: r.latestComplexity ?? r.latest_complexity,
    latestMaturity: r.latestMaturity ?? r.latest_maturity,
    latestConfidence: r.latestConfidence ?? r.latest_confidence,
    latestStability: r.latestStability ?? r.latest_stability,
    lastAnalyzedAt: r.lastAnalyzedAt ?? r.last_analyzed_at ? new Date(r.lastAnalyzedAt ?? r.last_analyzed_at) : null,
    createdAt: new Date(r.createdAt ?? r.created_at),
    updatedAt: new Date(r.updatedAt ?? r.updated_at),
  };
}

export async function getReportDiagnostics(businessId: number): Promise<{
  reportCount: number; totalFindings: number; criticalFindings: number;
  avgComplexity: number | null; avgMaturity: number | null;
}> {
  try {
    const registry = await getRegistryEntry(businessId);
    const reports = await listReports(businessId, 5);
    const totalFindings = reports.reduce((s, r) => s + r.findingCount, 0);
    const criticalFindings = reports.reduce((s, r) => s + r.criticalFindingCount, 0);
    const complexities = reports.map((r) => r.businessComplexityScore).filter((v) => v != null);
    const maturities = reports.map((r) => r.businessMaturityScore).filter((v) => v != null);
    return {
      reportCount: registry?.reportCount ?? 0,
      totalFindings,
      criticalFindings,
      avgComplexity: complexities.length > 0 ? complexities.reduce((a, b) => a + b, 0) / complexities.length : null,
      avgMaturity: maturities.length > 0 ? maturities.reduce((a, b) => a + b, 0) / maturities.length : null,
    };
  } catch (err) {
    logger.warn({ err }, "Business Analysis: getReportDiagnostics failed");
    return { reportCount: 0, totalFindings: 0, criticalFindings: 0, avgComplexity: null, avgMaturity: null };
  }
}
