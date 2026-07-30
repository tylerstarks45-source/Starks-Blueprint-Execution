// ─── Build 017: Opportunity Registry — DB Persistence ─────────────────────────
//
// All DB persistence for the Opportunity Discovery Engine.
// Tables are append-only/immutable except opportunity_registry (upserted).

import { db } from "@workspace/db";
import {
  executiveOpportunitiesTable,
  opportunityReportsTable,
  opportunityEvidenceTable,
  opportunityScoresTable,
  opportunityRankingsTable,
  opportunitySnapshotsTable,
  opportunityRegistryTable,
} from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import type {
  ExecutiveOpportunity,
  OpportunityEvidence,
  OpportunityReport,
  OpportunityRanking,
  OpportunityRegistryEntry,
  OpportunitySnapshot,
  OpportunityScore,
} from "./types";
import { logger } from "../logger";

const uid = (p: string) => `${p}_${randomUUID().replace(/-/g, "").slice(0, 18)}`;

// ── Persist an opportunity report ─────────────────────────────────────────────

export async function persistOpportunityReport(report: OpportunityReport): Promise<void> {
  await db.insert(opportunityReportsTable).values({
    id: report.id,
    businessId: report.businessId,
    analysisReportId: report.analysisReportId ?? undefined,
    userId: report.userId ?? undefined,
    totalOpportunities: report.totalOpportunities,
    criticalOpportunities: report.criticalOpportunities,
    highPriorityOpportunities: report.highPriorityOpportunities,
    topCategory: report.topCategory ?? undefined,
    highestScore: report.highestScore ?? undefined,
    avgConfidence: report.avgConfidence ?? undefined,
    discoveryDurationMs: report.discoveryDurationMs,
    createdAt: report.createdAt,
  });
}

export async function persistOpportunities(opportunities: ExecutiveOpportunity[]): Promise<void> {
  if (opportunities.length === 0) return;
  await db.insert(executiveOpportunitiesTable).values(
    opportunities.map((o) => ({
      id: o.id,
      businessId: o.businessId,
      reportId: o.reportId,
      userId: o.userId ?? undefined,
      category: o.category,
      title: o.title,
      description: o.description,
      discoverySource: o.discoverySource,
      status: o.status,
      businessImpact: o.businessImpact,
      estimatedReach: o.estimatedReach,
      estimatedEffort: o.estimatedEffort,
      risk: o.risk,
      confidence: o.confidence,
      strategicValue: o.strategicValue,
      compositeScore: o.compositeScore,
      rankPosition: o.rankPosition ?? undefined,
      priorityGroup: o.priorityGroup,
      evidenceCount: o.evidenceCount,
      analysisReportId: o.analysisReportId ?? undefined,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    })),
  );
}

export async function persistEvidence(evidence: OpportunityEvidence[]): Promise<void> {
  if (evidence.length === 0) return;
  await db.insert(opportunityEvidenceTable).values(
    evidence.map((e) => ({
      id: e.id,
      opportunityId: e.opportunityId,
      businessId: e.businessId,
      evidenceType: e.evidenceType,
      referenceId: e.referenceId,
      referenceType: e.referenceType,
      description: e.description,
      weight: e.weight,
      createdAt: e.createdAt,
    })),
  );
}

export async function persistScores(scores: OpportunityScore[]): Promise<void> {
  if (scores.length === 0) return;
  await db.insert(opportunityScoresTable).values(
    scores.map((s) => ({
      id: s.id,
      opportunityId: s.opportunityId,
      businessId: s.businessId,
      reportId: s.reportId,
      businessImpact: s.businessImpact,
      estimatedReach: s.estimatedReach,
      estimatedEffort: s.estimatedEffort,
      risk: s.risk,
      confidence: s.confidence,
      strategicValue: s.strategicValue,
      compositeScore: s.compositeScore,
      scoringVersion: s.scoringVersion,
      createdAt: s.createdAt,
    })),
  );
}

export async function persistRankings(rankings: OpportunityRanking[]): Promise<void> {
  if (rankings.length === 0) return;
  await db.insert(opportunityRankingsTable).values(
    rankings.map((r) => ({
      id: r.id,
      reportId: r.reportId,
      businessId: r.businessId,
      opportunityId: r.opportunityId,
      rankPosition: r.rankPosition,
      priorityGroup: r.priorityGroup,
      scoreAtRank: r.scoreAtRank,
      createdAt: r.createdAt,
    })),
  );
}

export async function persistSnapshot(snap: OpportunitySnapshot): Promise<void> {
  await db.insert(opportunitySnapshotsTable).values({
    id: snap.id,
    businessId: snap.businessId,
    reportId: snap.reportId,
    totalOpportunities: snap.totalOpportunities,
    topOpportunityId: snap.topOpportunityId ?? undefined,
    highestScore: snap.highestScore ?? undefined,
    categoryDistribution: snap.categoryDistribution as any,
    priorityDistribution: snap.priorityDistribution as any,
    sourceDistribution: snap.sourceDistribution as any,
    createdAt: snap.createdAt,
  });
}

export async function upsertOpportunityRegistry(opts: {
  businessId: number;
  userId: number | null;
  reportId: string;
  totalNew: number;
  highestScore: number | null;
  highestConfidence: number | null;
  highestBusinessValue: number | null;
}): Promise<void> {
  const existing = await db.select({ id: opportunityRegistryTable.id, totalDiscovered: opportunityRegistryTable.totalDiscovered })
    .from(opportunityRegistryTable)
    .where(eq(opportunityRegistryTable.businessId, opts.businessId))
    .limit(1);
  const now = new Date();

  if (existing[0]) {
    await db.update(opportunityRegistryTable).set({
      totalDiscovered: (existing[0].totalDiscovered ?? 0) + opts.totalNew,
      activeCount: opts.totalNew,
      latestReportId: opts.reportId,
      highestScore: opts.highestScore ?? undefined,
      highestConfidence: opts.highestConfidence ?? undefined,
      highestBusinessValue: opts.highestBusinessValue ?? undefined,
      lastDiscoveredAt: now,
      updatedAt: now,
    }).where(eq(opportunityRegistryTable.businessId, opts.businessId));
  } else {
    await db.insert(opportunityRegistryTable).values({
      id: uid("oreg"),
      businessId: opts.businessId,
      userId: opts.userId ?? undefined,
      totalDiscovered: opts.totalNew,
      activeCount: opts.totalNew,
      resolvedCount: 0,
      dismissedCount: 0,
      latestReportId: opts.reportId,
      highestScore: opts.highestScore ?? undefined,
      highestConfidence: opts.highestConfidence ?? undefined,
      highestBusinessValue: opts.highestBusinessValue ?? undefined,
      lastDiscoveredAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }
}

// ── Read operations ───────────────────────────────────────────────────────────

function mapOpportunity(r: any): ExecutiveOpportunity {
  return {
    id: r.id,
    businessId: r.businessId ?? r.business_id,
    reportId: r.reportId ?? r.report_id,
    userId: r.userId ?? r.user_id,
    category: r.category,
    title: r.title,
    description: r.description,
    discoverySource: r.discoverySource ?? r.discovery_source,
    status: r.status,
    businessImpact: r.businessImpact ?? r.business_impact,
    estimatedReach: r.estimatedReach ?? r.estimated_reach,
    estimatedEffort: r.estimatedEffort ?? r.estimated_effort,
    risk: r.risk,
    confidence: r.confidence,
    strategicValue: r.strategicValue ?? r.strategic_value,
    compositeScore: r.compositeScore ?? r.composite_score,
    rankPosition: r.rankPosition ?? r.rank_position,
    priorityGroup: r.priorityGroup ?? r.priority_group,
    evidenceCount: r.evidenceCount ?? r.evidence_count,
    evidence: [],
    analysisReportId: r.analysisReportId ?? r.analysis_report_id,
    createdAt: new Date(r.createdAt ?? r.created_at),
    updatedAt: new Date(r.updatedAt ?? r.updated_at),
  };
}

export async function getLatestOpportunityReport(businessId: number): Promise<OpportunityReport | null> {
  const rows = await db.select().from(opportunityReportsTable)
    .where(eq(opportunityReportsTable.businessId, businessId))
    .orderBy(desc(opportunityReportsTable.createdAt))
    .limit(1);
  if (!rows[0]) return null;
  const rr = rows[0] as any;
  const reportId = rr.id;

  const opps = await db.select().from(executiveOpportunitiesTable)
    .where(eq(executiveOpportunitiesTable.reportId, reportId))
    .orderBy(executiveOpportunitiesTable.rankPosition);

  const rankings = await db.select().from(opportunityRankingsTable)
    .where(eq(opportunityRankingsTable.reportId, reportId))
    .orderBy(opportunityRankingsTable.rankPosition);

  return {
    id: rr.id,
    businessId: rr.businessId ?? rr.business_id,
    analysisReportId: rr.analysisReportId ?? rr.analysis_report_id,
    userId: rr.userId ?? rr.user_id,
    opportunities: opps.map(mapOpportunity),
    rankings: rankings.map((r: any) => ({
      id: r.id, reportId: r.reportId ?? r.report_id,
      businessId: r.businessId ?? r.business_id,
      opportunityId: r.opportunityId ?? r.opportunity_id,
      rankPosition: r.rankPosition ?? r.rank_position,
      priorityGroup: r.priorityGroup ?? r.priority_group,
      scoreAtRank: r.scoreAtRank ?? r.score_at_rank,
      createdAt: new Date(r.createdAt ?? r.created_at),
    })),
    totalOpportunities: rr.totalOpportunities ?? rr.total_opportunities,
    criticalOpportunities: rr.criticalOpportunities ?? rr.critical_opportunities,
    highPriorityOpportunities: rr.highPriorityOpportunities ?? rr.high_priority_opportunities,
    topCategory: rr.topCategory ?? rr.top_category,
    highestScore: rr.highestScore ?? rr.highest_score,
    avgConfidence: rr.avgConfidence ?? rr.avg_confidence,
    discoveryDurationMs: rr.discoveryDurationMs ?? rr.discovery_duration_ms,
    createdAt: new Date(rr.createdAt ?? rr.created_at),
  };
}

export async function listOpportunities(businessId: number, limit = 20): Promise<ExecutiveOpportunity[]> {
  const rows = await db.select().from(executiveOpportunitiesTable)
    .where(eq(executiveOpportunitiesTable.businessId, businessId))
    .orderBy(desc(executiveOpportunitiesTable.compositeScore))
    .limit(limit);
  return rows.map(mapOpportunity);
}

export async function listOpportunityReports(businessId: number, limit = 10) {
  return db.select().from(opportunityReportsTable)
    .where(eq(opportunityReportsTable.businessId, businessId))
    .orderBy(desc(opportunityReportsTable.createdAt))
    .limit(limit);
}

export async function listEvidenceForOpportunity(opportunityId: string): Promise<OpportunityEvidence[]> {
  const rows = await db.select().from(opportunityEvidenceTable)
    .where(eq(opportunityEvidenceTable.opportunityId, opportunityId));
  return rows.map((r: any) => ({
    id: r.id,
    opportunityId: r.opportunityId ?? r.opportunity_id,
    businessId: r.businessId ?? r.business_id,
    evidenceType: r.evidenceType ?? r.evidence_type,
    referenceId: r.referenceId ?? r.reference_id,
    referenceType: r.referenceType ?? r.reference_type,
    description: r.description,
    weight: r.weight,
    createdAt: new Date(r.createdAt ?? r.created_at),
  }));
}

export async function getOpportunityRegistry(businessId: number): Promise<OpportunityRegistryEntry | null> {
  const rows = await db.select().from(opportunityRegistryTable)
    .where(eq(opportunityRegistryTable.businessId, businessId)).limit(1);
  if (!rows[0]) return null;
  const r = rows[0] as any;
  return {
    id: r.id,
    businessId: r.businessId ?? r.business_id,
    userId: r.userId ?? r.user_id,
    totalDiscovered: r.totalDiscovered ?? r.total_discovered,
    activeCount: r.activeCount ?? r.active_count,
    resolvedCount: r.resolvedCount ?? r.resolved_count,
    dismissedCount: r.dismissedCount ?? r.dismissed_count,
    latestReportId: r.latestReportId ?? r.latest_report_id,
    highestScore: r.highestScore ?? r.highest_score,
    highestConfidence: r.highestConfidence ?? r.highest_confidence,
    highestBusinessValue: r.highestBusinessValue ?? r.highest_business_value,
    lastDiscoveredAt: r.lastDiscoveredAt ?? r.last_discovered_at ? new Date(r.lastDiscoveredAt ?? r.last_discovered_at) : null,
    createdAt: new Date(r.createdAt ?? r.created_at),
    updatedAt: new Date(r.updatedAt ?? r.updated_at),
  };
}

export async function listSnapshots(businessId: number, limit = 5): Promise<OpportunitySnapshot[]> {
  const rows = await db.select().from(opportunitySnapshotsTable)
    .where(eq(opportunitySnapshotsTable.businessId, businessId))
    .orderBy(desc(opportunitySnapshotsTable.createdAt))
    .limit(limit);
  return rows.map((r: any) => ({
    id: r.id,
    businessId: r.businessId ?? r.business_id,
    reportId: r.reportId ?? r.report_id,
    totalOpportunities: r.totalOpportunities ?? r.total_opportunities,
    topOpportunityId: r.topOpportunityId ?? r.top_opportunity_id,
    highestScore: r.highestScore ?? r.highest_score,
    categoryDistribution: r.categoryDistribution ?? r.category_distribution ?? {},
    priorityDistribution: r.priorityDistribution ?? r.priority_distribution ?? {},
    sourceDistribution: r.sourceDistribution ?? r.source_distribution ?? {},
    createdAt: new Date(r.createdAt ?? r.created_at),
  }));
}
