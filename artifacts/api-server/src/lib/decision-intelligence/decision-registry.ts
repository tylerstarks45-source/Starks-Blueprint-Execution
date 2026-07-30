// ─── Build 019: Decision Intelligence — Registry (DB Persistence) ────────────
//
// All DB read/write logic for the 8 decision tables lives here.
// No other module touches the DB directly.

import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import {
  decisionReportsTable,
  executiveDecisionsTable,
  decisionRationalesTable,
  decisionMatricesTable,
  decisionTradeoffsTable,
  decisionConfidenceTable,
  decisionSnapshotsTable,
  decisionRegistryTable,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import type {
  DecisionReport,
  ExecutiveDecision,
  DecisionRationale,
  MatrixRow,
  DecisionTradeoff,
  DecisionConfidenceRecord,
} from "./types";

// ── Save decision_reports (anchor row — persisted FIRST) ───────────────────

export async function saveDecisionReport(
  report: DecisionReport,
): Promise<void> {
  await db.insert(decisionReportsTable).values({
    id: report.id,
    businessId: report.businessId,
    userId: report.userId,
    simulationReportId: report.simulationReportId,
    primaryDecisionId: report.primaryDecision.id,
    decisionCount: report.alternativeDecisions.length + 1,
    alternativeCount: report.alternativeDecisions.length,
    rejectedCount: report.rejectedDecisions.length,
    overallConfidence: report.overallConfidence,
    strategicAlignmentScore: report.strategicAlignmentScore,
    executiveSummary: report.executiveSummary,
    decisionDurationMs: report.decisionDurationMs,
  });
}

// ── Save executive_decisions ───────────────────────────────────────────────

export async function saveDecision(decision: ExecutiveDecision): Promise<void> {
  await db.insert(executiveDecisionsTable).values({
    id: decision.id,
    reportId: decision.reportId,
    businessId: decision.businessId,
    userId: decision.userId,
    scenarioId: decision.scenarioId,
    scenarioName: decision.scenarioName,
    scenarioType: decision.scenarioType,
    decisionType: decision.decisionType,
    rankPosition: decision.rankPosition,
    selectionScore: decision.selectionScore,
    expectedValueScore: decision.expectedValueScore,
    strategicAlignmentScore: decision.strategicAlignmentScore,
    riskScore: decision.riskScore,
    confidenceScore: decision.confidenceScore,
    complexityScore: decision.complexityScore,
    resourceDemand: decision.resourceDemand,
    governanceCompliant: decision.governanceCompliant,
    goalAlignmentScore: decision.goalAlignmentScore,
    rejectionReason: decision.rejectionReason,
    alignmentProfile: decision.alignmentProfile as any,
    tradeoffSummary: decision.tradeoffSummary as any,
  });
}

// ── Save decision_rationales ───────────────────────────────────────────────

export async function saveRationales(rationales: DecisionRationale[]): Promise<void> {
  if (rationales.length === 0) return;
  await db.insert(decisionRationalesTable).values(
    rationales.map((r) => ({
      id: r.id,
      decisionId: r.decisionId,
      reportId: r.reportId,
      businessId: r.businessId,
      rationaleType: r.rationaleType,
      dimension: r.dimension,
      title: r.title,
      explanation: r.explanation,
      weight: r.weight,
      supportingEvidence: r.supportingEvidence as any,
    })),
  );
}

// ── Save decision_matrices ─────────────────────────────────────────────────

export async function saveMatrixRows(rows: MatrixRow[]): Promise<void> {
  if (rows.length === 0) return;
  await db.insert(decisionMatricesTable).values(
    rows.map((r) => ({
      id: r.id,
      reportId: r.reportId,
      businessId: r.businessId,
      criterion: r.criterion,
      criterionWeight: r.criterionWeight,
      scenarioId: r.scenarioId,
      scenarioType: r.scenarioType,
      rawScore: r.rawScore,
      weightedScore: r.weightedScore,
      notes: r.notes,
    })),
  );
}

// ── Save decision_tradeoffs ────────────────────────────────────────────────

export async function saveTradeoffs(tradeoffs: DecisionTradeoff[]): Promise<void> {
  if (tradeoffs.length === 0) return;
  await db.insert(decisionTradeoffsTable).values(
    tradeoffs.map((t) => ({
      id: t.id,
      decisionId: t.decisionId,
      reportId: t.reportId,
      businessId: t.businessId,
      tradeoffCategory: t.tradeoffCategory,
      title: t.title,
      description: t.description,
      magnitude: t.magnitude,
      certainty: t.certainty,
      timeHorizon: t.timeHorizon,
    })),
  );
}

// ── Save decision_confidence ───────────────────────────────────────────────

export async function saveConfidence(c: DecisionConfidenceRecord): Promise<void> {
  await db.insert(decisionConfidenceTable).values({
    id: c.id,
    decisionId: c.decisionId,
    reportId: c.reportId,
    businessId: c.businessId,
    decisionConfidence: c.decisionConfidence,
    evidenceScore: c.evidenceScore,
    dataCompleteness: c.dataCompleteness,
    assumptionStability: c.assumptionStability,
    policyCompliance: c.policyCompliance,
    overallConfidence: c.overallConfidence,
    confidenceNarrative: c.confidenceNarrative,
  });
}

// ── Save decision_snapshots ────────────────────────────────────────────────

export async function saveDecisionSnapshot(report: DecisionReport): Promise<void> {
  const typeDist: Record<string, number> = {};
  const all = [report.primaryDecision, ...report.alternativeDecisions, ...report.rejectedDecisions];
  for (const d of all) typeDist[d.decisionType] = (typeDist[d.decisionType] ?? 0) + 1;

  await db.insert(decisionSnapshotsTable).values({
    id: randomUUID(),
    businessId: report.businessId,
    reportId: report.id,
    primaryDecisionId: report.primaryDecision.id,
    decisionCount: all.length,
    overallConfidence: report.overallConfidence,
    strategicAlignmentScore: report.strategicAlignmentScore,
    typeDistribution: typeDist as any,
  });
}

// ── Upsert decision_registry ───────────────────────────────────────────────

export async function upsertDecisionRegistry(report: DecisionReport): Promise<void> {
  const existing = await db
    .select()
    .from(decisionRegistryTable)
    .where(eq(decisionRegistryTable.businessId, report.businessId))
    .limit(1);

  const primary = report.primaryDecision;

  if (existing.length === 0) {
    await db.insert(decisionRegistryTable).values({
      id: randomUUID(),
      businessId: report.businessId,
      userId: report.userId,
      totalDecisions: 1,
      totalReports: 1,
      latestReportId: report.id,
      latestPrimaryDecisionId: primary.id,
      latestPrimaryScenarioType: primary.scenarioType,
      latestConfidence: report.overallConfidence,
      latestAlignmentScore: report.strategicAlignmentScore,
      lastDecidedAt: new Date(),
    });
  } else {
    const row = existing[0]!;
    await db
      .update(decisionRegistryTable)
      .set({
        totalDecisions: (row.totalDecisions ?? 0) + 1,
        totalReports: (row.totalReports ?? 0) + 1,
        latestReportId: report.id,
        latestPrimaryDecisionId: primary.id,
        latestPrimaryScenarioType: primary.scenarioType,
        latestConfidence: report.overallConfidence,
        latestAlignmentScore: report.strategicAlignmentScore,
        lastDecidedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(decisionRegistryTable.businessId, report.businessId));
  }
}

// ── Read helpers ───────────────────────────────────────────────────────────

export async function getLatestDecisionReport(businessId: number) {
  const reports = await db
    .select()
    .from(decisionReportsTable)
    .where(eq(decisionReportsTable.businessId, businessId))
    .orderBy(desc(decisionReportsTable.createdAt))
    .limit(1);
  return reports[0] ?? null;
}

export async function getDecisionsByReport(reportId: string) {
  return db
    .select()
    .from(executiveDecisionsTable)
    .where(eq(executiveDecisionsTable.reportId, reportId))
    .orderBy(executiveDecisionsTable.rankPosition);
}

export async function getDecisionRegistry(businessId: number) {
  const rows = await db
    .select()
    .from(decisionRegistryTable)
    .where(eq(decisionRegistryTable.businessId, businessId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getDecisionRationales(decisionId: string) {
  return db
    .select()
    .from(decisionRationalesTable)
    .where(eq(decisionRationalesTable.decisionId, decisionId));
}

export async function getDecisionTradeoffs(decisionId: string) {
  return db
    .select()
    .from(decisionTradeoffsTable)
    .where(eq(decisionTradeoffsTable.decisionId, decisionId));
}

export async function getDecisionConfidence(decisionId: string) {
  const rows = await db
    .select()
    .from(decisionConfidenceTable)
    .where(eq(decisionConfidenceTable.decisionId, decisionId))
    .limit(1);
  return rows[0] ?? null;
}

export async function listDecisionReports(businessId: number) {
  return db
    .select()
    .from(decisionReportsTable)
    .where(eq(decisionReportsTable.businessId, businessId))
    .orderBy(desc(decisionReportsTable.createdAt));
}
