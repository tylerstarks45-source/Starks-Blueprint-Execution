// ─── Build 017: Opportunity Discovery Orchestrator ────────────────────────────
//
// Orchestrates a full opportunity discovery run:
//   1. Reads latest BusinessAnalysisReport (Build 016)
//   2. Runs all 5 engines (detect → score → rank → evidence → report)
//   3. Persists to all 7 tables
//   4. Returns the full OpportunityReport

import { randomUUID } from "crypto";
import { detectOpportunities } from "./detection-engine";
import { scoreOpportunities, SCORING_VERSION } from "./scoring-engine";
import { rankOpportunities, topN, categoryDistribution, priorityDistribution, sourceDistribution, topCategory } from "./ranking-engine";
import {
  persistOpportunityReport, persistOpportunities, persistEvidence,
  persistScores, persistRankings, persistSnapshot, upsertOpportunityRegistry,
  getLatestOpportunityReport, getOpportunityRegistry,
} from "./opportunity-registry";
import { getLatestReport } from "../business-analysis/analysis-registry";
import { getBusiness } from "../business-graph/business-registry";
import type {
  ExecutiveOpportunity, OpportunityEvidence, OpportunityReport,
  OpportunityRanking, OpportunityScore, OpportunitySnapshot,
  OpportunityDiscoverySummary, TopOpportunitySummary,
  OpportunityCategory, PriorityGroup,
} from "./types";
import { logger } from "../logger";

const uid = (p: string) => `${p}_${randomUUID().replace(/-/g, "").slice(0, 18)}`;

// ── Main discovery run ────────────────────────────────────────────────────────

export async function runOpportunityDiscovery(
  businessId: number,
  userId: number,
): Promise<OpportunityReport | null> {
  const startMs = Date.now();

  try {
    const [business, analysisReport] = await Promise.all([
      getBusiness(businessId),
      getLatestReport(businessId),
    ]);

    if (!business) {
      logger.warn({ businessId }, "Opportunity Discovery: business not found");
      return null;
    }

    if (!analysisReport) {
      logger.warn({ businessId }, "Opportunity Discovery: no analysis report found — run business analysis first");
      return null;
    }

    const reportId = uid("opr");
    const now = new Date();

    // ── 1. Detect ──────────────────────────────────────────────────────────────
    const candidates = detectOpportunities(analysisReport);

    // ── 2. Score ───────────────────────────────────────────────────────────────
    const scored = scoreOpportunities(candidates);

    // ── 3. Rank ────────────────────────────────────────────────────────────────
    const ranked = rankOpportunities(scored);

    // ── 4. Build full opportunity objects ─────────────────────────────────────
    const opportunities: ExecutiveOpportunity[] = ranked.map((r) => {
      const oppId = uid("opp");
      const evidence: OpportunityEvidence[] = r.evidenceRefs.map((ref) => ({
        id: uid("oev"),
        opportunityId: oppId,
        businessId,
        evidenceType: ref.evidenceType,
        referenceId: ref.referenceId,
        referenceType: ref.referenceType,
        description: ref.description,
        weight: ref.weight,
        createdAt: now,
      }));
      return {
        id: oppId,
        businessId,
        reportId,
        userId,
        category: r.category,
        title: r.title,
        description: r.description,
        discoverySource: r.discoverySource,
        status: "active" as const,
        businessImpact: r.businessImpact,
        estimatedReach: r.estimatedReach,
        estimatedEffort: r.estimatedEffort,
        risk: r.risk,
        confidence: r.confidence,
        strategicValue: r.strategicValue,
        compositeScore: r.compositeScore,
        rankPosition: r.rankPosition,
        priorityGroup: r.priorityGroup,
        evidenceCount: evidence.length,
        evidence,
        analysisReportId: analysisReport.id,
        createdAt: now,
        updatedAt: now,
      };
    });

    // ── 5. Build score records ─────────────────────────────────────────────────
    const scores: OpportunityScore[] = opportunities.map((o) => ({
      id: uid("osc"),
      opportunityId: o.id,
      businessId,
      reportId,
      businessImpact: o.businessImpact,
      estimatedReach: o.estimatedReach,
      estimatedEffort: o.estimatedEffort,
      risk: o.risk,
      confidence: o.confidence,
      strategicValue: o.strategicValue,
      compositeScore: o.compositeScore,
      scoringVersion: SCORING_VERSION,
      createdAt: now,
    }));

    // ── 6. Build ranking records ───────────────────────────────────────────────
    const rankings: OpportunityRanking[] = opportunities.map((o) => ({
      id: uid("ork"),
      reportId,
      businessId,
      opportunityId: o.id,
      rankPosition: o.rankPosition!,
      priorityGroup: o.priorityGroup,
      scoreAtRank: o.compositeScore,
      createdAt: now,
    }));

    // ── 7. Derive report-level stats ───────────────────────────────────────────
    const criticalOpps = opportunities.filter((o) => o.priorityGroup === "critical").length;
    const highOpps = opportunities.filter((o) => o.priorityGroup === "high").length;
    const allScores = opportunities.map((o) => o.compositeScore);
    const allConfidences = opportunities.map((o) => o.confidence);
    const highestScore = allScores.length > 0 ? Math.max(...allScores) : null;
    const avgConfidence = allConfidences.length > 0
      ? allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length
      : null;
    const topCat = topCategory(ranked) as OpportunityCategory | null;
    const catDist = categoryDistribution(ranked);
    const priDist = priorityDistribution(ranked);
    const srcDist = sourceDistribution(ranked);
    const top1 = opportunities[0];

    const report: OpportunityReport = {
      id: reportId,
      businessId,
      analysisReportId: analysisReport.id,
      userId,
      opportunities,
      rankings,
      totalOpportunities: opportunities.length,
      criticalOpportunities: criticalOpps,
      highPriorityOpportunities: highOpps,
      topCategory: topCat,
      highestScore,
      avgConfidence,
      discoveryDurationMs: Date.now() - startMs,
      createdAt: now,
    };

    // ── 8. Persist ─────────────────────────────────────────────────────────────
    await persistOpportunityReport(report);
    await Promise.all([
      persistOpportunities(opportunities),
      persistScores(scores),
      persistRankings(rankings),
      persistSnapshot({
        id: uid("osnap"),
        businessId,
        reportId,
        totalOpportunities: opportunities.length,
        topOpportunityId: top1?.id ?? null,
        highestScore,
        categoryDistribution: catDist,
        priorityDistribution: priDist,
        sourceDistribution: srcDist,
        createdAt: now,
      }),
    ]);

    // Persist all evidence after opportunities are written (FK dependency)
    const allEvidence = opportunities.flatMap((o) => o.evidence);
    await persistEvidence(allEvidence);

    await upsertOpportunityRegistry({
      businessId,
      userId,
      reportId,
      totalNew: opportunities.length,
      highestScore,
      highestConfidence: allConfidences.length > 0 ? Math.max(...allConfidences) : null,
      highestBusinessValue: opportunities.length > 0 ? Math.max(...opportunities.map((o) => o.businessImpact)) : null,
    });

    logger.info({
      businessId, userId, reportId,
      total: opportunities.length,
      critical: criticalOpps, high: highOpps,
      computedMs: Date.now() - startMs,
    }, "Opportunity Discovery: run complete");

    return report;
  } catch (err) {
    logger.warn({ err, businessId }, "Opportunity Discovery: run failed (non-fatal)");
    return null;
  }
}

// ── EB summary ────────────────────────────────────────────────────────────────

export async function fetchOpportunitySummaryForEB(userId: number): Promise<OpportunityDiscoverySummary | null> {
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

    const registry = await getOpportunityRegistry(bizRows[0].id);
    const report = await getLatestOpportunityReport(bizRows[0].id);
    if (!report) return null;

    const top3: TopOpportunitySummary[] = report.opportunities.slice(0, 3).map((o) => ({
      id: o.id,
      category: o.category,
      title: o.title,
      compositeScore: o.compositeScore,
      confidence: o.confidence,
      businessImpact: o.businessImpact,
      priorityGroup: o.priorityGroup,
      discoverySource: o.discoverySource,
    }));

    return {
      businessId: bizRows[0].id,
      totalOpportunities: report.totalOpportunities,
      criticalCount: report.criticalOpportunities,
      highCount: report.highPriorityOpportunities,
      topOpportunities: top3,
      highestScore: report.highestScore,
      highestConfidence: registry?.highestConfidence ?? null,
      highestBusinessValue: registry?.highestBusinessValue ?? null,
      topCategory: report.topCategory,
      discoveredAt: report.createdAt,
    };
  } catch (err) {
    logger.warn({ err }, "Opportunity Discovery: fetchOpportunitySummaryForEB failed (non-fatal)");
    return null;
  }
}
