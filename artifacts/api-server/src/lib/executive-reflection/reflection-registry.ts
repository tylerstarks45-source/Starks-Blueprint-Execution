// ─── Reflection Registry (Build 012) ─────────────────────────────────────────
//
// All persistence for the Reflection Engine.
// Cases are immutable after closure. Reports are immutable once created.

import { randomUUID } from "crypto";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import {
  db,
  executiveCasesTable,
  caseMembersTable,
  caseTimelinesTable,
  reflectionReportsTable,
  reflectionFactorsTable,
  reflectionScoresTable,
  reflectionEvidenceTable,
  reflectionMetricsTable,
} from "@workspace/db";
import { logger } from "../logger";
import type {
  ExecutiveCase,
  CaseMember,
  CaseTimelineEvent,
  ReflectionReport,
  ReflectionFactor,
  ReflectionScore,
  ReflectionEvidence,
  CaseCompletionStatus,
  CaseMemberObjectType,
  CaseMemberRole,
  FactorCategory,
  FactorDirection,
  ScoreDimension,
  EvidenceType,
  TimelineEventCategory,
  OpenCaseInput,
  ReflectionDiagnostics,
} from "./types";
import type { FactorCandidate } from "./factor-engine";
import type { QualityScoreResult } from "./types";
import type { EvidenceItem } from "./report-engine";

// ── Row mappers ────────────────────────────────────────────────────────────────

function mapCaseRow(row: typeof executiveCasesTable.$inferSelect): ExecutiveCase {
  return {
    id: row.id,
    userId: row.userId ?? null,
    rootRequest: row.rootRequest ?? null,
    businessDomain: row.businessDomain ?? null,
    strategicCategory: row.strategicCategory ?? null,
    primaryGoalId: row.primaryGoalId ?? null,
    primaryPlanId: row.primaryPlanId ?? null,
    primaryExecutionId: row.primaryExecutionId ?? null,
    primaryChainId: row.primaryChainId ?? null,
    startedAt: row.startedAt,
    endedAt: row.endedAt ?? null,
    durationMs: row.durationMs ?? null,
    completionStatus: row.completionStatus as CaseCompletionStatus,
    primaryOutcome: row.primaryOutcome ?? null,
    closedAt: row.closedAt ?? null,
    isClosed: row.isClosed,
    reflectionReportId: row.reflectionReportId ?? null,
    version: row.version,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.createdAt,
  };
}

function mapMemberRow(row: typeof caseMembersTable.$inferSelect): CaseMember {
  return {
    id: row.id,
    caseId: row.caseId,
    objectId: row.objectId,
    objectType: row.objectType as CaseMemberObjectType,
    role: row.role as CaseMemberRole,
    addedAt: row.addedAt,
  };
}

function mapTimelineRow(row: typeof caseTimelinesTable.$inferSelect): CaseTimelineEvent {
  return {
    id: row.id,
    caseId: row.caseId,
    sequenceNumber: row.sequenceNumber,
    eventType: row.eventType,
    eventCategory: row.eventCategory as TimelineEventCategory,
    eventDescription: row.eventDescription ?? null,
    sourceObjectId: row.sourceObjectId ?? null,
    sourceObjectType: row.sourceObjectType ?? null,
    observedAt: row.observedAt,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

function mapReportRow(row: typeof reflectionReportsTable.$inferSelect): ReflectionReport {
  return {
    id: row.id,
    caseId: row.caseId,
    userId: row.userId ?? null,
    executiveSummary: row.executiveSummary,
    primaryFactors: (row.primaryFactors as string[]) ?? [],
    strengths: (row.strengths as string[]) ?? [],
    weaknesses: (row.weaknesses as string[]) ?? [],
    missedOpportunities: (row.missedOpportunities as string[]) ?? [],
    unexpectedOutcomes: (row.unexpectedOutcomes as string[]) ?? [],
    businessImpact: row.businessImpact ?? null,
    reflectionConfidence: row.reflectionConfidence,
    evidenceQuality: row.evidenceQuality,
    overallQualityScore: row.overallQualityScore,
    producedAt: row.producedAt,
    version: row.version,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

function mapFactorRow(row: typeof reflectionFactorsTable.$inferSelect): ReflectionFactor {
  return {
    id: row.id,
    reportId: row.reportId,
    caseId: row.caseId,
    userId: row.userId ?? null,
    factorCategory: row.factorCategory as FactorCategory,
    factorDescription: row.factorDescription,
    influenceScore: row.influenceScore,
    direction: row.direction as FactorDirection,
    evidence: (row.evidence as Record<string, unknown>[]) ?? [],
    createdAt: row.createdAt,
  };
}

function mapScoreRow(row: typeof reflectionScoresTable.$inferSelect): ReflectionScore {
  return {
    id: row.id,
    reportId: row.reportId,
    caseId: row.caseId,
    userId: row.userId ?? null,
    scoreDimension: row.scoreDimension as ScoreDimension,
    score: row.score,
    explanation: row.explanation,
    evidenceCount: row.evidenceCount,
    createdAt: row.createdAt,
  };
}

function mapEvidenceRow(row: typeof reflectionEvidenceTable.$inferSelect): ReflectionEvidence {
  return {
    id: row.id,
    reportId: row.reportId,
    caseId: row.caseId,
    evidenceType: row.evidenceType as EvidenceType,
    sourceObjectId: row.sourceObjectId ?? null,
    sourceObjectType: row.sourceObjectType ?? null,
    summary: row.summary,
    strength: row.strength,
    payload: (row.payload as Record<string, unknown>) ?? {},
    recordedAt: row.recordedAt,
  };
}

// ── Case CRUD ──────────────────────────────────────────────────────────────────

export async function openCase(input: OpenCaseInput): Promise<ExecutiveCase> {
  const row = await db
    .insert(executiveCasesTable)
    .values({
      id: randomUUID(),
      userId: input.userId,
      rootRequest: input.rootRequest ?? null,
      businessDomain: input.businessDomain ?? null,
      strategicCategory: input.strategicCategory ?? null,
      primaryGoalId: input.primaryGoalId ?? null,
      primaryPlanId: input.primaryPlanId ?? null,
      primaryExecutionId: input.primaryExecutionId ?? null,
      primaryChainId: input.primaryChainId ?? null,
      metadata: input.metadata ?? {},
    })
    .returning()
    .then((rows) => rows[0]!);
  return mapCaseRow(row);
}

export async function closeCase(
  caseId: string,
  opts: {
    completionStatus: CaseCompletionStatus;
    primaryOutcome?: string;
    durationMs?: number;
  },
): Promise<ExecutiveCase | null> {
  const now = new Date();
  const row = await db
    .update(executiveCasesTable)
    .set({
      completionStatus: opts.completionStatus,
      primaryOutcome: opts.primaryOutcome ?? null,
      durationMs: opts.durationMs ?? null,
      endedAt: now,
      closedAt: now,
      isClosed: true,
    })
    .where(and(eq(executiveCasesTable.id, caseId), eq(executiveCasesTable.isClosed, false)))
    .returning()
    .then((rows) => rows[0] ?? null);
  return row ? mapCaseRow(row) : null;
}

export async function linkReflectionToCase(caseId: string, reportId: string): Promise<void> {
  await db
    .update(executiveCasesTable)
    .set({ reflectionReportId: reportId })
    .where(eq(executiveCasesTable.id, caseId));
}

export async function getCase(caseId: string): Promise<ExecutiveCase | null> {
  const row = await db.select().from(executiveCasesTable)
    .where(eq(executiveCasesTable.id, caseId)).limit(1)
    .then((rows) => rows[0] ?? null);
  return row ? mapCaseRow(row) : null;
}

export async function getCaseByExecution(
  executionId: string,
  userId: number,
): Promise<ExecutiveCase | null> {
  const row = await db.select().from(executiveCasesTable)
    .where(and(
      eq(executiveCasesTable.primaryExecutionId, executionId),
      eq(executiveCasesTable.userId, userId),
    ))
    .orderBy(desc(executiveCasesTable.createdAt))
    .limit(1)
    .then((rows) => rows[0] ?? null);
  return row ? mapCaseRow(row) : null;
}

export async function listCases(opts: {
  userId?: number;
  isClosed?: boolean;
  completionStatus?: CaseCompletionStatus;
  limit?: number;
}): Promise<ExecutiveCase[]> {
  const conditions = [];
  if (opts.userId != null)       conditions.push(eq(executiveCasesTable.userId, opts.userId));
  if (opts.isClosed != null)     conditions.push(eq(executiveCasesTable.isClosed, opts.isClosed));
  if (opts.completionStatus)     conditions.push(eq(executiveCasesTable.completionStatus, opts.completionStatus));

  const rows = await db.select().from(executiveCasesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(executiveCasesTable.createdAt))
    .limit(opts.limit ?? 20);
  return rows.map(mapCaseRow);
}

// ── Case Members ───────────────────────────────────────────────────────────────

export async function addCaseMembers(
  members: Array<{ caseId: string; objectId: string; objectType: CaseMemberObjectType; role: CaseMemberRole }>,
): Promise<CaseMember[]> {
  if (members.length === 0) return [];
  const rows = await db.insert(caseMembersTable)
    .values(members.map((m) => ({ id: randomUUID(), ...m })))
    .returning();
  return rows.map(mapMemberRow);
}

export async function getCaseMembers(caseId: string): Promise<CaseMember[]> {
  const rows = await db.select().from(caseMembersTable)
    .where(eq(caseMembersTable.caseId, caseId));
  return rows.map(mapMemberRow);
}

// ── Timeline ───────────────────────────────────────────────────────────────────

export async function insertTimelineEvents(
  events: Array<Omit<CaseTimelineEvent, "id">>,
): Promise<CaseTimelineEvent[]> {
  if (events.length === 0) return [];
  const rows = await db.insert(caseTimelinesTable)
    .values(events.map((e) => ({ id: randomUUID(), ...e })))
    .returning();
  return rows.map(mapTimelineRow);
}

export async function getTimeline(caseId: string): Promise<CaseTimelineEvent[]> {
  const rows = await db.select().from(caseTimelinesTable)
    .where(eq(caseTimelinesTable.caseId, caseId))
    .orderBy(caseTimelinesTable.sequenceNumber);
  return rows.map(mapTimelineRow);
}

// ── Reflection Reports ─────────────────────────────────────────────────────────

export async function insertReflectionReport(input: {
  caseId: string;
  userId: number;
  executiveSummary: string;
  primaryFactors: string[];
  strengths: string[];
  weaknesses: string[];
  missedOpportunities: string[];
  unexpectedOutcomes: string[];
  businessImpact: string;
  reflectionConfidence: number;
  evidenceQuality: number;
  overallQualityScore: number;
}): Promise<ReflectionReport> {
  const row = await db.insert(reflectionReportsTable)
    .values({ id: randomUUID(), ...input })
    .returning()
    .then((rows) => rows[0]!);
  return mapReportRow(row);
}

export async function getReport(reportId: string): Promise<ReflectionReport | null> {
  const row = await db.select().from(reflectionReportsTable)
    .where(eq(reflectionReportsTable.id, reportId)).limit(1)
    .then((rows) => rows[0] ?? null);
  return row ? mapReportRow(row) : null;
}

export async function getReportByCase(caseId: string): Promise<ReflectionReport | null> {
  const row = await db.select().from(reflectionReportsTable)
    .where(eq(reflectionReportsTable.caseId, caseId))
    .orderBy(desc(reflectionReportsTable.producedAt)).limit(1)
    .then((rows) => rows[0] ?? null);
  return row ? mapReportRow(row) : null;
}

export async function listReports(opts: { userId?: number; limit?: number }): Promise<ReflectionReport[]> {
  const conditions = opts.userId != null ? [eq(reflectionReportsTable.userId, opts.userId)] : [];
  const rows = await db.select().from(reflectionReportsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(reflectionReportsTable.producedAt))
    .limit(opts.limit ?? 20);
  return rows.map(mapReportRow);
}

// ── Factors ────────────────────────────────────────────────────────────────────

export async function insertFactors(
  reportId: string,
  caseId: string,
  userId: number,
  factors: FactorCandidate[],
): Promise<ReflectionFactor[]> {
  if (factors.length === 0) return [];
  const rows = await db.insert(reflectionFactorsTable)
    .values(factors.map((f) => ({
      id: randomUUID(),
      reportId,
      caseId,
      userId,
      factorCategory: f.factorCategory,
      factorDescription: f.factorDescription,
      influenceScore: f.influenceScore,
      direction: f.direction,
      evidence: f.evidence,
    })))
    .returning();
  return rows.map(mapFactorRow);
}

export async function getFactors(reportId: string): Promise<ReflectionFactor[]> {
  const rows = await db.select().from(reflectionFactorsTable)
    .where(eq(reflectionFactorsTable.reportId, reportId))
    .orderBy(desc(reflectionFactorsTable.influenceScore));
  return rows.map(mapFactorRow);
}

// ── Scores ─────────────────────────────────────────────────────────────────────

export async function insertScores(
  reportId: string,
  caseId: string,
  userId: number,
  scores: QualityScoreResult[],
): Promise<ReflectionScore[]> {
  if (scores.length === 0) return [];
  const rows = await db.insert(reflectionScoresTable)
    .values(scores.map((s) => ({
      id: randomUUID(),
      reportId,
      caseId,
      userId,
      scoreDimension: s.dimension,
      score: s.score,
      explanation: s.explanation,
      evidenceCount: s.evidenceCount,
    })))
    .returning();
  return rows.map(mapScoreRow);
}

export async function getScores(reportId: string): Promise<ReflectionScore[]> {
  const rows = await db.select().from(reflectionScoresTable)
    .where(eq(reflectionScoresTable.reportId, reportId));
  return rows.map(mapScoreRow);
}

// ── Evidence ───────────────────────────────────────────────────────────────────

export async function insertEvidence(
  reportId: string,
  caseId: string,
  items: EvidenceItem[],
): Promise<ReflectionEvidence[]> {
  if (items.length === 0) return [];
  const rows = await db.insert(reflectionEvidenceTable)
    .values(items.map((e) => ({
      id: randomUUID(),
      reportId,
      caseId,
      evidenceType: e.evidenceType,
      sourceObjectId: e.sourceObjectId,
      sourceObjectType: e.sourceObjectType,
      summary: e.summary,
      strength: e.strength,
      payload: e.payload,
    })))
    .returning();
  return rows.map(mapEvidenceRow);
}

export async function getEvidence(reportId: string): Promise<ReflectionEvidence[]> {
  const rows = await db.select().from(reflectionEvidenceTable)
    .where(eq(reflectionEvidenceTable.reportId, reportId))
    .orderBy(desc(reflectionEvidenceTable.strength));
  return rows.map(mapEvidenceRow);
}

// ── Diagnostics ────────────────────────────────────────────────────────────────

export async function getReflectionDiagnostics(userId?: number): Promise<ReflectionDiagnostics> {
  const caseWhere = userId != null ? eq(executiveCasesTable.userId, userId) : undefined;
  const cases = await db.select().from(executiveCasesTable).where(caseWhere);

  const byStatus: Record<string, number> = {};
  for (const c of cases) {
    byStatus[c.completionStatus] = (byStatus[c.completionStatus] ?? 0) + 1;
  }

  const reportWhere = userId != null ? eq(reflectionReportsTable.userId, userId) : undefined;
  const reports = await db.select().from(reflectionReportsTable).where(reportWhere);

  const avgQuality = reports.length > 0
    ? reports.reduce((s, r) => s + r.overallQualityScore, 0) / reports.length
    : 0;

  const oneDayAgo = new Date(Date.now() - 86_400_000);
  const recentConditions = userId != null
    ? and(gte(reflectionReportsTable.producedAt, oneDayAgo), eq(reflectionReportsTable.userId, userId))
    : gte(reflectionReportsTable.producedAt, oneDayAgo);
  const recentResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(reflectionReportsTable)
    .where(recentConditions);

  return {
    totalCases: cases.length,
    openCases: cases.filter((c) => !c.isClosed).length,
    closedCases: cases.filter((c) => c.isClosed).length,
    totalReports: reports.length,
    averageQualityScore: Math.round(avgQuality * 1000) / 1000,
    byCompletionStatus: byStatus,
    recentReflections: Number(recentResult[0]?.count ?? 0),
  };
}
