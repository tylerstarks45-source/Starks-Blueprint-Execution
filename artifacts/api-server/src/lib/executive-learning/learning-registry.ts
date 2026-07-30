// ─── Build 013: Learning Registry ────────────────────────────────────────────
//
// All DB persistence for the Executive Principle Learning Engine.
// Principles are immutable after validation — only status, confidence, and
// version fields may advance. Version snapshots are written on every update.

import { db } from "@workspace/db";
import {
  executivePrinciples,
  principleEvidence,
  principleVersions,
  learningReports,
  learningMetrics,
  principleContradictions,
  principleValidationHist,
  principleCategories,
  principleRelationships,
} from "@workspace/db/schema";
import { eq, and, desc, asc, sql, inArray, ne } from "drizzle-orm";
import { randomUUID } from "crypto";
import type {
  ExecutivePrinciple,
  LearningSummary,
  LearningReport,
  LearningDiagnostics,
  PrincipleEvidenceRecord,
  PrincipleContradiction,
  PrincipleRelationship,
  PrincipleStatus,
} from "./types";
import type { ValidationCheckResult } from "./types";
import type { EdgeSpec } from "./principle-graph";
import { logger } from "../logger";

// ── Row mappers ───────────────────────────────────────────────────────────────

function mapPrinciple(row: any): ExecutivePrinciple {
  return {
    id: row.id,
    userId: row.userId ?? row.user_id,
    title: row.title,
    description: row.description,
    category: row.category,
    businessDomain: row.businessDomain ?? row.business_domain,
    strategicCategory: row.strategicCategory ?? row.strategic_category,
    originCases: (row.originCases ?? row.origin_cases) as string[],
    supportingEvidence: row.supportingEvidence ?? row.supporting_evidence,
    contradictoryEvidence: row.contradictoryEvidence ?? row.contradictory_evidence,
    confidence: row.confidence,
    reliability: row.reliability,
    novelty: row.novelty,
    generality: row.generality,
    applicability: row.applicability,
    successRate: row.successRate ?? row.success_rate,
    failureRate: row.failureRate ?? row.failure_rate,
    timesObserved: row.timesObserved ?? row.times_observed,
    timesConfirmed: row.timesConfirmed ?? row.times_confirmed,
    timesContradicted: row.timesContradicted ?? row.times_contradicted,
    status: row.status,
    version: row.version,
    patternType: row.patternType ?? row.pattern_type,
    patternFrequency: row.patternFrequency ?? row.pattern_frequency,
    createdAt: new Date(row.createdAt ?? row.created_at),
    updatedAt: new Date(row.updatedAt ?? row.updated_at),
    validatedAt: row.validatedAt ?? row.validated_at ? new Date(row.validatedAt ?? row.validated_at) : null,
    deprecatedAt: row.deprecatedAt ?? row.deprecated_at ? new Date(row.deprecatedAt ?? row.deprecated_at) : null,
    archivedAt: row.archivedAt ?? row.archived_at ? new Date(row.archivedAt ?? row.archived_at) : null,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  };
}

function mapReport(row: any): LearningReport {
  return {
    id: row.id,
    userId: row.userId ?? row.user_id,
    newPrincipleIds: (row.newPrincipleIds ?? row.new_principle_ids) as string[],
    strengthenedPrincipleIds: (row.strengthenedPrincipleIds ?? row.strengthened_principle_ids) as string[],
    weakeningPrincipleIds: (row.weakeningPrincipleIds ?? row.weakening_principle_ids) as string[],
    deprecatedPrincipleIds: (row.deprecatedPrincipleIds ?? row.deprecated_principle_ids) as string[],
    evidenceSummary: row.evidenceSummary ?? row.evidence_summary,
    confidenceChanges: (row.confidenceChanges ?? row.confidence_changes) as Record<string, number>,
    businessImpact: row.businessImpact ?? row.business_impact,
    learningConfidence: row.learningConfidence ?? row.learning_confidence,
    casesAnalyzed: row.casesAnalyzed ?? row.cases_analyzed,
    reportsAnalyzed: row.reportsAnalyzed ?? row.reports_analyzed,
    patternsDiscovered: row.patternsDiscovered ?? row.patterns_discovered,
    principlesExtracted: row.principlesExtracted ?? row.principles_extracted,
    principlesValidated: row.principlesValidated ?? row.principles_validated,
    cycleVersion: row.cycleVersion ?? row.cycle_version,
    producedAt: new Date(row.producedAt ?? row.produced_at),
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  };
}

function mapRelationship(row: any): PrincipleRelationship {
  return {
    id: row.id,
    fromPrincipleId: row.fromPrincipleId ?? row.from_principle_id,
    toPrincipleId: row.toPrincipleId ?? row.to_principle_id,
    relationType: row.relationType ?? row.relation_type,
    strength: row.strength,
    userId: row.userId ?? row.user_id,
    isActive: row.isActive ?? row.is_active,
    createdAt: new Date(row.createdAt ?? row.created_at),
    updatedAt: new Date(row.updatedAt ?? row.updated_at),
  };
}

// ── Principle fingerprint lookup ──────────────────────────────────────────────

export async function getPrincipleByFingerprint(
  userId: number,
  patternType: string,
  businessDomain: string,
  outcome: string,
): Promise<ExecutivePrinciple | null> {
  try {
    const rows = await db
      .select()
      .from(executivePrinciples)
      .where(
        and(
          eq(executivePrinciples.userId, userId),
          eq(executivePrinciples.patternType, patternType),
          eq(executivePrinciples.businessDomain, businessDomain),
        ),
      )
      .limit(1);
    return rows[0] ? mapPrinciple(rows[0]) : null;
  } catch (err) {
    logger.warn({ err }, "Learning: getPrincipleByFingerprint failed");
    return null;
  }
}

// ── Save a new principle ──────────────────────────────────────────────────────

export async function savePrinciple(p: ExecutivePrinciple): Promise<ExecutivePrinciple> {
  await db.insert(executivePrinciples).values({
    id: p.id,
    userId: p.userId,
    title: p.title,
    description: p.description,
    category: p.category,
    businessDomain: p.businessDomain,
    strategicCategory: p.strategicCategory,
    originCases: p.originCases as any,
    supportingEvidence: p.supportingEvidence,
    contradictoryEvidence: p.contradictoryEvidence,
    confidence: p.confidence,
    reliability: p.reliability,
    novelty: p.novelty,
    generality: p.generality,
    applicability: p.applicability,
    successRate: p.successRate,
    failureRate: p.failureRate,
    timesObserved: p.timesObserved,
    timesConfirmed: p.timesConfirmed,
    timesContradicted: p.timesContradicted,
    status: p.status,
    version: p.version,
    patternType: p.patternType,
    patternFrequency: p.patternFrequency,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    validatedAt: p.validatedAt ?? undefined,
    deprecatedAt: p.deprecatedAt ?? undefined,
    archivedAt: p.archivedAt ?? undefined,
    metadata: p.metadata as any,
  });
  return p;
}

// ── Update an existing principle ──────────────────────────────────────────────

export async function updatePrinciple(p: ExecutivePrinciple): Promise<ExecutivePrinciple> {
  await db
    .update(executivePrinciples)
    .set({
      title: p.title,
      description: p.description,
      confidence: p.confidence,
      reliability: p.reliability,
      timesObserved: p.timesObserved,
      timesConfirmed: p.timesConfirmed,
      timesContradicted: p.timesContradicted,
      successRate: p.successRate,
      failureRate: p.failureRate,
      supportingEvidence: p.supportingEvidence,
      contradictoryEvidence: p.contradictoryEvidence,
      status: p.status,
      version: p.version,
      updatedAt: p.updatedAt,
      validatedAt: p.validatedAt ?? undefined,
      deprecatedAt: p.deprecatedAt ?? undefined,
      archivedAt: p.archivedAt ?? undefined,
      patternFrequency: p.patternFrequency,
      metadata: p.metadata as any,
    })
    .where(eq(executivePrinciples.id, p.id));
  return p;
}

// ── Snapshot a version ────────────────────────────────────────────────────────

export async function snapshotVersion(p: ExecutivePrinciple, changeReason: string): Promise<void> {
  await db.insert(principleVersions).values({
    id: `pv_${randomUUID().replace(/-/g, "").slice(0, 20)}`,
    principleId: p.id,
    userId: p.userId,
    version: p.version,
    title: p.title,
    description: p.description,
    status: p.status,
    confidence: p.confidence,
    timesObserved: p.timesObserved,
    timesConfirmed: p.timesConfirmed,
    timesContradicted: p.timesContradicted,
    changeReason,
    snapshotAt: new Date(),
    payload: {},
  }).onConflictDoNothing();
}

// ── Save validation history entry ─────────────────────────────────────────────

export async function saveValidationHistEntry(
  p: ExecutivePrinciple,
  result: ValidationCheckResult,
  previousStatus: PrincipleStatus,
): Promise<void> {
  await db.insert(principleValidationHist).values({
    id: `pvh_${randomUUID().replace(/-/g, "").slice(0, 18)}`,
    principleId: p.id,
    userId: p.userId,
    validationResult: result.validationResult,
    previousStatus,
    newStatus: result.newStatus,
    minObservationsMet: result.minObservationsMet,
    minSupportMet: result.minSupportMet,
    maxContradictionMet: result.maxContradictionMet,
    minConfidenceMet: result.minConfidenceMet,
    businessSignificanceMet: result.businessSignificanceMet,
    strategicSignificanceMet: result.strategicSignificanceMet,
    confidenceAtValidation: p.confidence,
    observationsAtValidation: p.timesObserved,
    failureReasons: result.failureReasons as any,
    validatedAt: new Date(),
    payload: {},
  });
}

// ── Save evidence ─────────────────────────────────────────────────────────────

export async function saveEvidence(ev: Omit<PrincipleEvidenceRecord, "id" | "recordedAt">): Promise<void> {
  await db.insert(principleEvidence).values({
    id: `pe_${randomUUID().replace(/-/g, "").slice(0, 20)}`,
    principleId: ev.principleId,
    userId: ev.userId,
    caseId: ev.caseId ?? undefined,
    reportId: ev.reportId ?? undefined,
    evidenceType: ev.evidenceType,
    summary: ev.summary,
    strength: ev.strength,
    businessDomain: ev.businessDomain ?? undefined,
    qualityScore: ev.qualityScore ?? undefined,
    outcomeStatus: ev.outcomeStatus ?? undefined,
    recordedAt: new Date(),
    payload: ev.payload as any,
  });
}

// ── Save contradiction ────────────────────────────────────────────────────────

export async function saveContradiction(c: PrincipleContradiction): Promise<void> {
  await db.insert(principleContradictions).values({
    id: c.id,
    principleId: c.principleId,
    userId: c.userId,
    contradictingCaseId: c.contradictingCaseId ?? undefined,
    contradictingReportId: c.contradictingReportId ?? undefined,
    contradictionType: c.contradictionType,
    severity: c.severity,
    description: c.description,
    confidenceImpact: c.confidenceImpact,
    resolved: c.resolved,
    resolvedAt: c.resolvedAt ?? undefined,
    recordedAt: c.recordedAt,
    payload: c.payload as any,
  });
}

// ── Save graph edges ──────────────────────────────────────────────────────────

export async function saveGraphEdges(edges: EdgeSpec[]): Promise<number> {
  if (edges.length === 0) return 0;
  let saved = 0;
  for (const e of edges) {
    try {
      await db.insert(principleRelationships).values({
        id: e.id,
        fromPrincipleId: e.fromPrincipleId,
        toPrincipleId: e.toPrincipleId,
        relationType: e.relationType,
        strength: e.strength,
        userId: e.userId,
        isActive: true,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      }).onConflictDoNothing();
      saved++;
    } catch {
      // duplicate edge — skip silently
    }
  }
  return saved;
}

// ── Save learning report ──────────────────────────────────────────────────────

export async function saveLearningReport(r: LearningReport): Promise<LearningReport> {
  await db.insert(learningReports).values({
    id: r.id,
    userId: r.userId,
    newPrincipleIds: r.newPrincipleIds as any,
    strengthenedPrincipleIds: r.strengthenedPrincipleIds as any,
    weakeningPrincipleIds: r.weakeningPrincipleIds as any,
    deprecatedPrincipleIds: r.deprecatedPrincipleIds as any,
    evidenceSummary: r.evidenceSummary,
    confidenceChanges: r.confidenceChanges as any,
    businessImpact: r.businessImpact ?? undefined,
    learningConfidence: r.learningConfidence,
    casesAnalyzed: r.casesAnalyzed,
    reportsAnalyzed: r.reportsAnalyzed,
    patternsDiscovered: r.patternsDiscovered,
    principlesExtracted: r.principlesExtracted,
    principlesValidated: r.principlesValidated,
    cycleVersion: r.cycleVersion,
    producedAt: r.producedAt,
    metadata: r.metadata as any,
  });
  return r;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getPrinciple(id: string): Promise<ExecutivePrinciple | null> {
  const rows = await db.select().from(executivePrinciples).where(eq(executivePrinciples.id, id)).limit(1);
  return rows[0] ? mapPrinciple(rows[0]) : null;
}

export async function listPrinciples(opts: {
  userId: number;
  status?: PrincipleStatus;
  businessDomain?: string;
  category?: string;
  limit?: number;
}): Promise<ExecutivePrinciple[]> {
  let q = db.select().from(executivePrinciples).$dynamic();
  const conditions = [eq(executivePrinciples.userId, opts.userId)];
  if (opts.status) conditions.push(eq(executivePrinciples.status, opts.status));
  if (opts.businessDomain) conditions.push(eq(executivePrinciples.businessDomain, opts.businessDomain));
  if (opts.category) conditions.push(eq(executivePrinciples.category, opts.category));
  q = q.where(and(...conditions)).orderBy(desc(executivePrinciples.confidence)).limit(opts.limit ?? 50);
  const rows = await q;
  return rows.map(mapPrinciple);
}

export async function searchPrinciples(opts: {
  userId: number;
  query: string;
  status?: PrincipleStatus;
  limit?: number;
}): Promise<ExecutivePrinciple[]> {
  // Simple text search over title + description using ILIKE
  const rows = await db
    .select()
    .from(executivePrinciples)
    .where(
      and(
        eq(executivePrinciples.userId, opts.userId),
        opts.status ? eq(executivePrinciples.status, opts.status) : undefined,
        sql`(${executivePrinciples.title} ILIKE ${`%${opts.query}%`} OR ${executivePrinciples.description} ILIKE ${`%${opts.query}%`})`,
      ),
    )
    .orderBy(desc(executivePrinciples.confidence))
    .limit(opts.limit ?? 20);
  return rows.map(mapPrinciple);
}

export async function getValidatedPrinciples(userId: number, limit = 20): Promise<ExecutivePrinciple[]> {
  const rows = await db
    .select()
    .from(executivePrinciples)
    .where(and(eq(executivePrinciples.userId, userId), eq(executivePrinciples.status, "validated")))
    .orderBy(desc(executivePrinciples.confidence))
    .limit(limit);
  return rows.map(mapPrinciple);
}

export async function getPrincipleVersions(principleId: string): Promise<any[]> {
  return db
    .select()
    .from(principleVersions)
    .where(eq(principleVersions.principleId, principleId))
    .orderBy(asc(principleVersions.version));
}

export async function getPrincipleEvidence(principleId: string): Promise<any[]> {
  return db
    .select()
    .from(principleEvidence)
    .where(eq(principleEvidence.principleId, principleId))
    .orderBy(desc(principleEvidence.recordedAt))
    .limit(50);
}

export async function getPrincipleContradictions(principleId: string): Promise<any[]> {
  return db
    .select()
    .from(principleContradictions)
    .where(eq(principleContradictions.principleId, principleId))
    .orderBy(desc(principleContradictions.recordedAt))
    .limit(50);
}

export async function getPrincipleValidationHistory(principleId: string): Promise<any[]> {
  return db
    .select()
    .from(principleValidationHist)
    .where(eq(principleValidationHist.principleId, principleId))
    .orderBy(asc(principleValidationHist.validatedAt));
}

export async function getLearningReport(id: string): Promise<LearningReport | null> {
  const rows = await db.select().from(learningReports).where(eq(learningReports.id, id)).limit(1);
  return rows[0] ? mapReport(rows[0]) : null;
}

export async function listLearningReports(userId: number, limit = 10): Promise<LearningReport[]> {
  const rows = await db
    .select()
    .from(learningReports)
    .where(eq(learningReports.userId, userId))
    .orderBy(desc(learningReports.producedAt))
    .limit(limit);
  return rows.map(mapReport);
}

export async function getPrincipleRelationships(principleId: string): Promise<PrincipleRelationship[]> {
  const rows = await db
    .select()
    .from(principleRelationships)
    .where(
      and(
        eq(principleRelationships.fromPrincipleId, principleId),
        eq(principleRelationships.isActive, true),
      ),
    );
  return rows.map(mapRelationship);
}

export async function getAllGraphEdges(userId: number): Promise<PrincipleRelationship[]> {
  const rows = await db
    .select()
    .from(principleRelationships)
    .where(and(eq(principleRelationships.userId, userId), eq(principleRelationships.isActive, true)));
  return rows.map(mapRelationship);
}

export async function getLearningSummary(userId: number): Promise<LearningSummary | null> {
  try {
    const [allPrinciples, latestReport] = await Promise.all([
      db.select().from(executivePrinciples).where(eq(executivePrinciples.userId, userId)),
      db
        .select()
        .from(learningReports)
        .where(eq(learningReports.userId, userId))
        .orderBy(desc(learningReports.producedAt))
        .limit(1),
    ]);

    const validated = allPrinciples.filter((p) => p.status === "validated");
    const candidates = allPrinciples.filter((p) => p.status === "candidate");
    const reportCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(learningReports)
      .where(eq(learningReports.userId, userId));

    return {
      validatedPrincipleCount: validated.length,
      candidatePrincipleCount: candidates.length,
      totalPrincipleCount: allPrinciples.length,
      topValidatedPrinciples: validated
        .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
        .slice(0, 3)
        .map((p) => ({
          id: p.id,
          title: p.title,
          confidence: p.confidence,
          category: p.category as any,
          businessDomain: p.businessDomain,
        })),
      lastLearningReportId: latestReport[0]?.id ?? null,
      lastCycleAt: latestReport[0]?.producedAt ? new Date(latestReport[0].producedAt) : null,
      learningCycleCount: Number(reportCount[0]?.count ?? 0),
    };
  } catch (err) {
    logger.warn({ err }, "Learning: getLearningSummary failed");
    return null;
  }
}

export async function getLearningDiagnostics(userId: number): Promise<LearningDiagnostics> {
  const [principles, evidence, contradictions, reports, edges] = await Promise.all([
    db.select().from(executivePrinciples).where(eq(executivePrinciples.userId, userId)),
    db.select({ count: sql<number>`count(*)` }).from(principleEvidence).where(eq(principleEvidence.userId, userId)),
    db.select().from(principleContradictions).where(eq(principleContradictions.userId, userId)),
    db.select({ count: sql<number>`count(*)` }).from(learningReports).where(eq(learningReports.userId, userId)),
    db.select({ count: sql<number>`count(*)` }).from(principleRelationships).where(and(eq(principleRelationships.userId, userId), eq(principleRelationships.isActive, true))),
  ]);

  const byStatus: Record<string, number> = {};
  let totalConf = 0;
  for (const p of principles) {
    byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
    totalConf += p.confidence ?? 0;
  }

  const lastReport = await db
    .select()
    .from(learningReports)
    .where(eq(learningReports.userId, userId))
    .orderBy(desc(learningReports.producedAt))
    .limit(1);

  return {
    userId,
    totalPrinciples: principles.length,
    byStatus: byStatus as any,
    averageConfidence: principles.length > 0 ? totalConf / principles.length : 0,
    totalEvidence: Number(evidence[0]?.count ?? 0),
    totalContradictions: contradictions.length,
    unresolvedContradictions: contradictions.filter((c) => !c.resolved).length,
    totalLearningReports: Number(reports[0]?.count ?? 0),
    graphEdgeCount: Number(edges[0]?.count ?? 0),
    lastCycleAt: lastReport[0]?.producedAt ? new Date(lastReport[0].producedAt) : null,
  };
}
