// ─── Reflection Orchestrator (Build 012) ─────────────────────────────────────
//
// Central reflect-on-case pipeline.  Called after a case is closed.
// Steps:
//   1. Load timeline events from DB
//   2. Run Decision Reconstruction
//   3. Run Causal Analysis
//   4. Run Factor Engine
//   5. Run Quality Assessment
//   6. Assemble Report Draft
//   7. Persist Report + Factors + Scores + Evidence
//   8. Link report back to case
//   9. Fire extension point hooks (non-blocking)
//
// Reflection NEVER changes plans, goals, executions, or memory.

import { randomUUID } from "crypto";
import { logger } from "../logger";
import { getTimeline, insertTimelineEvents, insertReflectionReport, insertFactors, insertScores, insertEvidence, linkReflectionToCase, getCase } from "./reflection-registry";
import { buildTimeline, summarizeTimeline } from "./decision-reconstruction";
import { detectCausalLinks, assembleCausalAnalysis } from "./causal-analysis";
import { detectAllFactors } from "./factor-engine";
import { assessQuality, QUALITY_LOW_THRESHOLD } from "./quality-assessment";
import { assembleReportDraft, buildEvidenceItems } from "./report-engine";
import {
  fireReflectionHooks,
  REFLECTION_EXTENSION_POINT_IDS,
} from "./reflection-extension-points";
import type {
  ExecutiveCase,
  ReflectionReport,
  ReflectOnCaseInput,
} from "./types";
import type { SourceEvent } from "./decision-reconstruction";

// ── Main reflect pipeline ──────────────────────────────────────────────────────

export interface ReflectResult {
  report: ReflectionReport;
  factorCount: number;
  scoreCount: number;
  evidenceCount: number;
}

export async function reflectOnCase(input: ReflectOnCaseInput): Promise<ReflectResult | null> {
  const { caseId, userId } = input;

  const ec = await getCase(caseId);
  if (!ec) {
    logger.warn({ caseId }, "Reflection: case not found");
    return null;
  }

  // Guard: don't re-reflect unless forced
  if (ec.reflectionReportId && !input.forceReflect) {
    logger.info({ caseId, reportId: ec.reflectionReportId }, "Reflection: case already reflected");
    const existing = await import("./reflection-registry").then((m) => m.getReport(ec.reflectionReportId!));
    if (existing) {
      return { report: existing, factorCount: 0, scoreCount: 0, evidenceCount: 0 };
    }
  }

  // Fire started hook
  void fireReflectionHooks(REFLECTION_EXTENSION_POINT_IDS.REFLECTION_STARTED, { caseId, userId }).catch(() => {});

  // ── 1. Load or build timeline ─────────────────────────────────────────────
  let events = await getTimeline(caseId);
  if (events.length === 0) {
    // No timeline yet — insert a minimal one from what we know about the case
    const sourceEvents: SourceEvent[] = buildMinimalSourceEvents(ec);
    const drafted = buildTimeline(caseId, sourceEvents);
    events = await insertTimelineEvents(drafted);
  }

  // ── 2–4. Analysis passes (pure) ───────────────────────────────────────────
  const causalLinks = detectCausalLinks(events);
  const causal      = assembleCausalAnalysis(caseId, causalLinks);
  const factors     = detectAllFactors(events);
  const quality     = assessQuality(ec, events);

  // ── 5. Assemble report draft ───────────────────────────────────────────────
  const draft = assembleReportDraft(ec, events, factors, causal, quality);
  const evidenceItems = buildEvidenceItems(events, causal);

  // ── 6. Persist report ─────────────────────────────────────────────────────
  const report = await insertReflectionReport({
    caseId,
    userId,
    executiveSummary: draft.executiveSummary,
    primaryFactors: draft.primaryFactors,
    strengths: draft.strengths,
    weaknesses: draft.weaknesses,
    missedOpportunities: draft.missedOpportunities,
    unexpectedOutcomes: draft.unexpectedOutcomes,
    businessImpact: draft.businessImpact,
    reflectionConfidence: draft.reflectionConfidence,
    evidenceQuality: draft.evidenceQuality,
    overallQualityScore: draft.overallQualityScore,
  });

  // ── 7. Persist factors, scores, evidence ─────────────────────────────────
  const [persistedFactors, persistedScores, persistedEvidence] = await Promise.all([
    insertFactors(report.id, caseId, userId, factors),
    insertScores(report.id, caseId, userId, quality.scores),
    insertEvidence(report.id, caseId, evidenceItems),
  ]);

  // ── 8. Link report back to case ────────────────────────────────────────────
  await linkReflectionToCase(caseId, report.id);

  // ── 9. Fire hooks (non-blocking) ──────────────────────────────────────────
  void fireReflectionHooks(REFLECTION_EXTENSION_POINT_IDS.REFLECTION_REPORT_PRODUCED, report).catch(() => {});

  void fireReflectionHooks(REFLECTION_EXTENSION_POINT_IDS.LEARNING_READY, {
    caseId,
    reportId: report.id,
    overallQualityScore: report.overallQualityScore,
  }).catch(() => {});

  // Fire causal link hooks
  for (const link of causalLinks.slice(0, 5)) {
    void fireReflectionHooks(REFLECTION_EXTENSION_POINT_IDS.CAUSAL_LINK_IDENTIFIED, link).catch(() => {});
  }

  // Fire quality threshold hooks
  for (const score of quality.scores) {
    if (score.score < QUALITY_LOW_THRESHOLD) {
      void fireReflectionHooks(REFLECTION_EXTENSION_POINT_IDS.QUALITY_THRESHOLD_BREACHED, {
        caseId,
        dimension: score.dimension,
        score: score.score,
        threshold: QUALITY_LOW_THRESHOLD,
      }).catch(() => {});
    }
  }

  // Fire factor hooks
  for (const factor of persistedFactors.slice(0, 3)) {
    void fireReflectionHooks(REFLECTION_EXTENSION_POINT_IDS.FACTOR_IDENTIFIED, factor).catch(() => {});
  }

  logger.info(
    {
      caseId,
      reportId: report.id,
      overallQualityScore: report.overallQualityScore,
      factorCount: persistedFactors.length,
      scoreCount: persistedScores.length,
      evidenceCount: persistedEvidence.length,
    },
    "Reflection: report produced",
  );

  return {
    report,
    factorCount: persistedFactors.length,
    scoreCount: persistedScores.length,
    evidenceCount: persistedEvidence.length,
  };
}

// ── Minimal source event builder ───────────────────────────────────────────────
// When no observation chain events are available, build from case metadata alone.

function buildMinimalSourceEvents(ec: ExecutiveCase): SourceEvent[] {
  const events: SourceEvent[] = [];

  if (ec.primaryGoalId) {
    events.push({
      id: randomUUID(),
      eventType: "goal_created",
      eventCategory: "goal",
      description: `Goal created for case ${ec.id.slice(0, 8)}`,
      sourceObjectId: ec.primaryGoalId,
      sourceObjectType: "goal",
      occurredAt: ec.startedAt,
    });
  }

  if (ec.primaryPlanId) {
    events.push({
      id: randomUUID(),
      eventType: "plan_generated",
      eventCategory: "planning",
      description: `Plan generated for case ${ec.id.slice(0, 8)}`,
      sourceObjectId: ec.primaryPlanId,
      sourceObjectType: "plan",
      occurredAt: new Date(ec.startedAt.getTime() + 1000),
    });
  }

  if (ec.primaryExecutionId) {
    events.push({
      id: randomUUID(),
      eventType: "execution_started",
      eventCategory: "execution",
      description: `Execution started for case ${ec.id.slice(0, 8)}`,
      sourceObjectId: ec.primaryExecutionId,
      sourceObjectType: "execution",
      occurredAt: new Date(ec.startedAt.getTime() + 2000),
    });

    if (ec.endedAt) {
      events.push({
        id: randomUUID(),
        eventType: `execution_${ec.completionStatus}`,
        eventCategory: "execution",
        description: `Execution ${ec.completionStatus} for case ${ec.id.slice(0, 8)}`,
        sourceObjectId: ec.primaryExecutionId,
        sourceObjectType: "execution",
        occurredAt: ec.endedAt,
      });
    }
  }

  if (ec.rootRequest) {
    events.unshift({
      id: randomUUID(),
      eventType: "user_request",
      eventCategory: "reasoning",
      description: `User request: ${ec.rootRequest.slice(0, 80)}`,
      sourceObjectId: null,
      sourceObjectType: "user_request",
      occurredAt: new Date(ec.startedAt.getTime() - 100),
    });
  }

  return events;
}
