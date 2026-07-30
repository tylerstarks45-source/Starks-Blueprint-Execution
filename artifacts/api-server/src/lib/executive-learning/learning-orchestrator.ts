// ─── Build 013: Learning Orchestrator ────────────────────────────────────────
//
// Runs a complete learning cycle:
//   1. Load recent Reflection Reports + Executive Cases
//   2. Pattern Discovery
//   3. Principle Extraction (new) + dedup against existing DB
//   4. Contradiction Scan against existing principles
//   5. Confidence update on existing principles
//   6. Validation pass on all draft/candidate principles
//   7. Deprecation check on validated/candidate principles
//   8. Persist new/updated principles + snapshots + evidence
//   9. Build Principle Graph edges for all active principles
//  10. Assemble + persist Learning Report
//
// Learning NEVER changes behavior, planning, goals, judgment, or execution.

import { db } from "@workspace/db";
import {
  executiveCasesTable as executiveCases,
  reflectionReportsTable as reflectionReports,
  reflectionScoresTable as reflectionScores,
} from "@workspace/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";

import {
  runPatternDiscovery,
  type CaseForMining,
  type ReportForMining,
  type ScoreForMining,
} from "./pattern-discovery";
import { extractPrinciples, buildPrincipleFingerprint } from "./principle-extraction";
import {
  validatePrinciple,
  shouldDeprecate,
  applyValidationResult,
  applyDeprecation,
  adjustConfidence,
} from "./principle-validation";
import {
  runContradictionScan,
  summarizeContradictions,
} from "./contradiction-engine";
import { buildGraphEdges } from "./principle-graph";
import { assembleLearningReport, buildConfidenceChanges } from "./learning-report-engine";
import {
  getPrincipleByFingerprint,
  savePrinciple,
  updatePrinciple,
  snapshotVersion,
  saveValidationHistEntry,
  saveEvidence,
  saveContradiction,
  saveGraphEdges,
  saveLearningReport,
  listPrinciples,
  getAllGraphEdges,
} from "./learning-registry";
import type {
  ExecutivePrinciple,
  LearningCycleResult,
  PrincipleStatus,
} from "./types";
import { logger } from "../logger";

// ── Load input data ───────────────────────────────────────────────────────────

async function loadCases(userId: number, limit: number): Promise<CaseForMining[]> {
  const rows = await db
    .select()
    .from(executiveCases)
    .where(and(eq(executiveCases.userId, userId), eq(executiveCases.isClosed, true)))
    .orderBy(desc(executiveCases.startedAt))
    .limit(limit);

  return rows.map((r: any) => ({
    id: r.id,
    userId: r.userId ?? r.user_id,
    businessDomain: r.businessDomain ?? r.business_domain,
    strategicCategory: r.strategicCategory ?? r.strategic_category,
    completionStatus: r.completionStatus ?? r.completion_status,
    primaryGoalId: r.primaryGoalId ?? r.primary_goal_id,
    primaryPlanId: r.primaryPlanId ?? r.primary_plan_id,
    primaryExecutionId: r.primaryExecutionId ?? r.primary_execution_id,
    durationMs: r.durationMs ?? r.duration_ms,
    startedAt: new Date(r.startedAt ?? r.started_at),
    metadata: (r.metadata ?? {}) as Record<string, unknown>,
  }));
}

async function loadReports(caseIds: string[]): Promise<{ reports: ReportForMining[]; scores: ScoreForMining[] }> {
  if (caseIds.length === 0) return { reports: [], scores: [] };

  const [rRows, sRows] = await Promise.all([
    db
      .select()
      .from(reflectionReports)
      .where(inArray(reflectionReports.caseId, caseIds)),
    db
      .select()
      .from(reflectionScores)
      .where(inArray(reflectionScores.caseId, caseIds)),
  ]);

  const reports: ReportForMining[] = rRows.map((r: any) => ({
    id: r.id,
    caseId: r.caseId ?? r.case_id,
    overallQualityScore: r.overallQualityScore ?? r.overall_quality_score ?? 0,
    primaryFactors: (r.primaryFactors ?? r.primary_factors ?? []) as unknown[],
    strengths: (r.strengths ?? []) as string[],
    weaknesses: (r.weaknesses ?? []) as string[],
    reflectionConfidence: r.reflectionConfidence ?? r.reflection_confidence ?? 0,
    metadata: (r.metadata ?? {}) as Record<string, unknown>,
  }));

  const scores: ScoreForMining[] = sRows.map((r: any) => ({
    caseId: r.caseId ?? r.case_id,
    reportId: r.reportId ?? r.report_id,
    scoreDimension: r.scoreDimension ?? r.score_dimension,
    score: r.score,
  }));

  return { reports, scores };
}

// ── Main cycle ────────────────────────────────────────────────────────────────

export async function runLearningCycle(opts: {
  userId: number;
  caseLimit?: number;
}): Promise<LearningCycleResult | null> {
  const { userId, caseLimit = 50 } = opts;

  try {
    // ── Step 1: Load cases + reports ─────────────────────────────────────────
    const cases = await loadCases(userId, caseLimit);
    if (cases.length < 2) {
      logger.info({ userId, caseCount: cases.length }, "Learning: insufficient closed cases for a cycle");
      return null;
    }

    const caseIds = cases.map((c) => c.id);
    const { reports, scores } = await loadReports(caseIds);
    const reportMap = new Map<string, ReportForMining>(reports.map((r) => [r.caseId, r]));

    // Load existing principles for contradiction scanning
    const existingPrinciples = await listPrinciples({ userId, limit: 200 });

    // ── Step 2: Pattern Discovery ─────────────────────────────────────────────
    const patterns = runPatternDiscovery(cases, reports, scores);
    logger.debug({ userId, patternCount: patterns.length }, "Learning: patterns discovered");

    // ── Step 3: Extract + dedup principles ───────────────────────────────────
    const extracted = extractPrinciples(patterns, userId);
    const candidatePrinciples: ExecutivePrinciple[] = [];

    for (let i = 0; i < extracted.length; i++) {
      const p = extracted[i]!;
      const pattern = patterns[i]; // alignment by index from extractPrinciples
      if (!pattern) continue;

      const fp = buildPrincipleFingerprint(userId, pattern);
      const existing = await getPrincipleByFingerprint(
        userId,
        pattern.patternType,
        pattern.domains[0] ?? "general",
        pattern.outcome,
      );

      if (existing) {
        // Update existing: increment observations, adjust confidence
        const updated: ExecutivePrinciple = {
          ...existing,
          timesObserved: existing.timesObserved + pattern.frequency,
          timesConfirmed: existing.timesConfirmed + Math.round(pattern.frequency * pattern.successRate),
          timesContradicted: existing.timesContradicted + Math.round(pattern.frequency * pattern.failureRate),
          confidence: adjustConfidence(existing.confidence, pattern.successRate > 0.5, pattern.confidence),
          patternFrequency: existing.patternFrequency + pattern.frequency,
          updatedAt: new Date(),
          version: existing.version + 1,
        };
        candidatePrinciples.push(updated);
      } else {
        // New principle
        candidatePrinciples.push(p);
      }
    }

    // ── Step 4: Contradiction Scan ────────────────────────────────────────────
    const casesSinceMap = new Map<string, number>(existingPrinciples.map((p) => [p.id, cases.length]));
    const contradictions = runContradictionScan(
      existingPrinciples,
      cases,
      reportMap,
      casesSinceMap,
    );
    const contradictionSummary = summarizeContradictions(contradictions);

    // Apply confidence impacts from contradictions
    const contradictionImpactMap = new Map<string, number>();
    for (const c of contradictions) {
      const current = contradictionImpactMap.get(c.principleId) ?? 0;
      contradictionImpactMap.set(c.principleId, current + c.confidenceImpact);
    }

    // ── Step 5: Update existing principle confidence ──────────────────────────
    const confidenceBefore = new Map<string, number>(
      [...existingPrinciples, ...candidatePrinciples].map((p) => [p.id, p.confidence]),
    );

    // Apply contradiction impacts to existing principles
    for (const ep of existingPrinciples) {
      const impact = contradictionImpactMap.get(ep.id);
      if (impact && Math.abs(impact) > 0.01) {
        const updated = {
          ...ep,
          confidence: Math.max(0.05, Math.min(0.99, ep.confidence + impact)),
          timesContradicted: ep.timesContradicted + contradictions.filter((c) => c.principleId === ep.id).length,
          updatedAt: new Date(),
          version: ep.version + 1,
        };
        await updatePrinciple(updated);
        await snapshotVersion(updated, "confidence-adjusted-from-contradictions");
      }
    }

    // ── Step 6: Validation pass ───────────────────────────────────────────────
    const newPrinciples: ExecutivePrinciple[] = [];
    const strengthenedPrinciples: ExecutivePrinciple[] = [];
    const weakeningPrinciples: ExecutivePrinciple[] = [];
    const deprecatedPrinciples: ExecutivePrinciple[] = [];

    for (const p of candidatePrinciples) {
      const previousStatus = p.status as PrincipleStatus;
      const validationResult = validatePrinciple(p);

      // ── Step 7: Deprecation check ─────────────────────────────────────────
      if (shouldDeprecate(p)) {
        const deprecated = applyDeprecation(p, new Date());
        if (p.id in {} || existingPrinciples.find((e) => e.id === p.id)) {
          await updatePrinciple(deprecated);
        } else {
          await savePrinciple(deprecated);
        }
        await snapshotVersion(deprecated, "deprecated-sustained-contradiction");
        await saveValidationHistEntry(deprecated, validationResult, previousStatus);
        deprecatedPrinciples.push(deprecated);
        continue;
      }

      const updated = applyValidationResult(p, validationResult, new Date());
      const isExisting = existingPrinciples.some((e) => e.id === p.id);

      if (isExisting) {
        await updatePrinciple(updated);
      } else {
        await savePrinciple(updated);
      }
      await snapshotVersion(updated, `status-${previousStatus}->${updated.status}`);
      await saveValidationHistEntry(updated, validationResult, previousStatus);

      // Classify into report buckets
      if (updated.status === "validated" && previousStatus !== "validated") {
        newPrinciples.push(updated);
        // Persist evidence from origin cases
        for (const caseId of updated.originCases.slice(0, 5)) {
          const caseRow = cases.find((c) => c.id === caseId);
          const report = reportMap.get(caseId);
          await saveEvidence({
            principleId: updated.id,
            userId,
            caseId,
            reportId: report?.id ?? null,
            evidenceType: updated.successRate > 0.5 ? "supporting" : "contradictory",
            summary: `Origin case ${caseId}: ${caseRow?.completionStatus ?? "unknown"} in ${caseRow?.businessDomain ?? "general"}`,
            strength: report?.overallQualityScore ?? updated.confidence,
            businessDomain: caseRow?.businessDomain ?? null,
            qualityScore: report?.overallQualityScore ?? null,
            outcomeStatus: caseRow?.completionStatus ?? null,
            payload: { principleVersion: updated.version },
          });
        }
      } else if (isExisting && updated.confidence > (existingPrinciples.find((e) => e.id === p.id)?.confidence ?? 0)) {
        strengthenedPrinciples.push(updated);
      } else if (isExisting && updated.confidence < (existingPrinciples.find((e) => e.id === p.id)?.confidence ?? 1)) {
        weakeningPrinciples.push(updated);
      }
    }

    // Persist contradictions
    for (const c of contradictions) {
      try {
        await saveContradiction(c);
      } catch {
        // duplicate — skip
      }
    }

    // ── Step 8: Principle Graph ───────────────────────────────────────────────
    const allActivePrinciples = await listPrinciples({ userId, limit: 200 });
    const activeForGraph = allActivePrinciples.filter(
      (p) => p.status === "validated" || p.status === "candidate",
    );
    let graphEdgesAdded = 0;
    if (activeForGraph.length >= 2) {
      const edges = buildGraphEdges(activeForGraph);
      graphEdgesAdded = await saveGraphEdges(edges);
    }

    // ── Step 9: Assemble + persist Learning Report ────────────────────────────
    const confidenceChanges = buildConfidenceChanges(
      confidenceBefore,
      [...newPrinciples, ...strengthenedPrinciples, ...weakeningPrinciples, ...deprecatedPrinciples],
    );

    const cycleVersion = (await listLearningReports_count(userId)) + 1;

    const report = assembleLearningReport({
      userId,
      newPrinciples,
      strengthenedPrinciples,
      weakeningPrinciples,
      deprecatedPrinciples,
      patterns,
      contradictions: contradictionSummary,
      confidenceChanges,
      casesAnalyzed: cases.length,
      reportsAnalyzed: reports.length,
      principlesExtracted: candidatePrinciples.length,
      cycleVersion,
    });
    await saveLearningReport(report);

    logger.info(
      {
        userId,
        patternsDiscovered: patterns.length,
        newPrinciples: newPrinciples.length,
        strengthened: strengthenedPrinciples.length,
        weakening: weakeningPrinciples.length,
        deprecated: deprecatedPrinciples.length,
        graphEdgesAdded,
        contradictions: contradictions.length,
        reportId: report.id,
      },
      "Learning: cycle completed",
    );

    return {
      report,
      newPrinciples,
      strengthenedPrinciples,
      weakeningPrinciples,
      deprecatedPrinciples,
      patternsDiscovered: patterns,
      graphEdgesAdded,
    };
  } catch (err) {
    logger.error({ err }, "Learning: runLearningCycle failed");
    return null;
  }
}

// helper — count existing reports for cycle versioning
async function listLearningReports_count(userId: number): Promise<number> {
  try {
    const { learningReports } = await import("@workspace/db/schema");
    const { sql: sqlFn } = await import("drizzle-orm");
    const result = await db
      .select({ count: sqlFn<number>`count(*)` })
      .from(learningReports)
      .where(eq(learningReports.userId, userId));
    return Number(result[0]?.count ?? 0);
  } catch {
    return 0;
  }
}
