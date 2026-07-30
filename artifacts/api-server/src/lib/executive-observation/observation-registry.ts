// ─── Observation Registry (Build 011) ────────────────────────────────────────
//
// All persistence for the Observation Engine.
// Observations are IMMUTABLE — INSERT only, no UPDATE, no DELETE.

import { randomUUID } from "crypto";
import { eq, and, desc, gte, lte, inArray, sql } from "drizzle-orm";
import {
  db,
  executiveObservationsTable,
  observationChainsTable,
  observationChainMembersTable,
  observationSignalsTable,
  observationTrendsTable,
  observationAnomaliesTable,
  observationCorrelationsTable,
  observationMetricsTable,
} from "@workspace/db";
import { logger } from "../logger";
import type {
  ExecutiveObservation,
  ObservationChain,
  ObservationSignal,
  ObservationTrend,
  ObservationAnomaly,
  ObservationCorrelation,
  ObservationSeverity,
  ObservationSignalType,
  ObservationEventCategory,
  TrendType,
  AnomalyType,
  CorrelationType,
  ObservationDiagnostics,
} from "./types";
import type { DetectedTrend } from "./observation-trend";
import type { DetectedAnomaly } from "./observation-anomaly";
import type { CorrelationCandidate } from "./observation-correlation";

// ── Row mappers ────────────────────────────────────────────────────────────────

function mapObsRow(row: typeof executiveObservationsTable.$inferSelect): ExecutiveObservation {
  return {
    id: row.id,
    userId: row.userId ?? null,
    sourceSystem: row.sourceSystem,
    sourceObjectId: row.sourceObjectId ?? null,
    sourceObjectType: row.sourceObjectType ?? null,
    eventType: row.eventType,
    eventCategory: row.eventCategory as ObservationEventCategory,
    severity: row.severity as ObservationSeverity,
    attentionScore: row.attentionScore,
    attentionDimensions: (row.attentionDimensions as Record<string, number>) ?? {},
    signalType: row.signalType as ObservationSignalType,
    observedState: row.observedState ?? null,
    previousState: row.previousState ?? null,
    chainId: row.chainId ?? null,
    relatedGoalId: row.relatedGoalId ?? null,
    relatedPlanId: row.relatedPlanId ?? null,
    relatedExecutionId: row.relatedExecutionId ?? null,
    relatedContextId: row.relatedContextId ?? null,
    relatedJudgmentId: row.relatedJudgmentId ?? null,
    relatedMemoryId: row.relatedMemoryId ?? null,
    relatedKnowledgeId: row.relatedKnowledgeId ?? null,
    relatedUserRequestId: row.relatedUserRequestId ?? null,
    payload: (row.payload as Record<string, unknown>) ?? {},
    version: row.version,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    observedAt: row.observedAt,
  };
}

function mapChainRow(row: typeof observationChainsTable.$inferSelect): ObservationChain {
  return {
    id: row.id,
    userId: row.userId ?? null,
    name: row.name,
    description: row.description ?? null,
    anchorObjectId: row.anchorObjectId ?? null,
    anchorObjectType: row.anchorObjectType ?? null,
    observationCount: row.observationCount,
    firstObservedAt: row.firstObservedAt ?? null,
    lastObservedAt: row.lastObservedAt ?? null,
    signalTypes: (row.signalTypes as string[]) ?? [],
    maxSeverity: row.maxSeverity,
    maxAttentionScore: row.maxAttentionScore,
    isActive: row.isActive,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapSignalRow(row: typeof observationSignalsTable.$inferSelect): ObservationSignal {
  return {
    id: row.id,
    observationId: row.observationId,
    userId: row.userId ?? null,
    signalType: row.signalType as ObservationSignalType,
    strength: row.strength,
    description: row.description ?? null,
    relatedGoalId: row.relatedGoalId ?? null,
    relatedPlanId: row.relatedPlanId ?? null,
    relatedExecutionId: row.relatedExecutionId ?? null,
    payload: (row.payload as Record<string, unknown>) ?? {},
    emittedAt: row.emittedAt,
  };
}

function mapTrendRow(row: typeof observationTrendsTable.$inferSelect): ObservationTrend {
  return {
    id: row.id,
    userId: row.userId ?? null,
    trendType: row.trendType as TrendType,
    direction: row.direction as "up" | "down" | "neutral" | "volatile",
    magnitude: row.magnitude,
    windowStartAt: row.windowStartAt,
    windowEndAt: row.windowEndAt,
    sampleCount: row.sampleCount,
    description: row.description ?? null,
    evidence: (row.evidence as Record<string, unknown>[]) ?? [],
    anchorObjectId: row.anchorObjectId ?? null,
    anchorObjectType: row.anchorObjectType ?? null,
    detectedAt: row.detectedAt,
  };
}

function mapAnomalyRow(row: typeof observationAnomaliesTable.$inferSelect): ObservationAnomaly {
  return {
    id: row.id,
    userId: row.userId ?? null,
    anomalyType: row.anomalyType as AnomalyType,
    severity: row.severity as ObservationSeverity,
    description: row.description,
    sourceObjectId: row.sourceObjectId ?? null,
    sourceObjectType: row.sourceObjectType ?? null,
    evidence: (row.evidence as Record<string, unknown>[]) ?? [],
    isResolved: row.isResolved,
    resolvedAt: row.resolvedAt ?? null,
    detectedAt: row.detectedAt,
  };
}

function mapCorrelationRow(row: typeof observationCorrelationsTable.$inferSelect): ObservationCorrelation {
  return {
    id: row.id,
    sourceObservationId: row.sourceObservationId,
    targetObservationId: row.targetObservationId,
    correlationType: row.correlationType as CorrelationType,
    strength: row.strength,
    createdAt: row.createdAt,
  };
}

// ── Observation CRUD (append-only) ─────────────────────────────────────────────

export async function insertObservation(
  input: Omit<ExecutiveObservation, "observedAt"> & { observedAt?: Date },
): Promise<ExecutiveObservation> {
  const row = await db
    .insert(executiveObservationsTable)
    .values({
      id: input.id,
      userId: input.userId ?? null,
      sourceSystem: input.sourceSystem,
      sourceObjectId: input.sourceObjectId ?? null,
      sourceObjectType: input.sourceObjectType ?? null,
      eventType: input.eventType,
      eventCategory: input.eventCategory,
      severity: input.severity,
      attentionScore: input.attentionScore,
      attentionDimensions: input.attentionDimensions,
      signalType: input.signalType,
      observedState: input.observedState ?? null,
      previousState: input.previousState ?? null,
      chainId: input.chainId ?? null,
      relatedGoalId: input.relatedGoalId ?? null,
      relatedPlanId: input.relatedPlanId ?? null,
      relatedExecutionId: input.relatedExecutionId ?? null,
      relatedContextId: input.relatedContextId ?? null,
      relatedJudgmentId: input.relatedJudgmentId ?? null,
      relatedMemoryId: input.relatedMemoryId ?? null,
      relatedKnowledgeId: input.relatedKnowledgeId ?? null,
      relatedUserRequestId: input.relatedUserRequestId ?? null,
      payload: input.payload,
      version: input.version,
      metadata: input.metadata,
    })
    .returning()
    .then((rows) => rows[0]!);
  return mapObsRow(row);
}

export async function getObservation(id: string): Promise<ExecutiveObservation | null> {
  const row = await db
    .select()
    .from(executiveObservationsTable)
    .where(eq(executiveObservationsTable.id, id))
    .limit(1)
    .then((rows) => rows[0] ?? null);
  return row ? mapObsRow(row) : null;
}

export async function listObservations(opts: {
  userId?: number;
  sourceSystem?: string;
  eventCategory?: ObservationEventCategory;
  signalType?: ObservationSignalType;
  severity?: ObservationSeverity;
  chainId?: string;
  relatedExecutionId?: string;
  relatedGoalId?: string;
  relatedPlanId?: string;
  minAttentionScore?: number;
  since?: Date;
  limit?: number;
}): Promise<ExecutiveObservation[]> {
  const conditions = [];
  if (opts.userId != null)         conditions.push(eq(executiveObservationsTable.userId, opts.userId));
  if (opts.sourceSystem)           conditions.push(eq(executiveObservationsTable.sourceSystem, opts.sourceSystem));
  if (opts.eventCategory)          conditions.push(eq(executiveObservationsTable.eventCategory, opts.eventCategory));
  if (opts.signalType)             conditions.push(eq(executiveObservationsTable.signalType, opts.signalType));
  if (opts.severity)               conditions.push(eq(executiveObservationsTable.severity, opts.severity));
  if (opts.chainId)                conditions.push(eq(executiveObservationsTable.chainId, opts.chainId));
  if (opts.relatedExecutionId)     conditions.push(eq(executiveObservationsTable.relatedExecutionId, opts.relatedExecutionId));
  if (opts.relatedGoalId)          conditions.push(eq(executiveObservationsTable.relatedGoalId, opts.relatedGoalId));
  if (opts.relatedPlanId)          conditions.push(eq(executiveObservationsTable.relatedPlanId, opts.relatedPlanId));
  if (opts.minAttentionScore != null) conditions.push(gte(executiveObservationsTable.attentionScore, opts.minAttentionScore));
  if (opts.since)                  conditions.push(gte(executiveObservationsTable.observedAt, opts.since));

  const rows = await db
    .select()
    .from(executiveObservationsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(executiveObservationsTable.observedAt))
    .limit(opts.limit ?? 100);
  return rows.map(mapObsRow);
}

export async function getRecentObservations(userId: number, limit = 50): Promise<ExecutiveObservation[]> {
  return listObservations({ userId, limit });
}

export async function getAttentionQueue(userId: number, threshold = 0.7, limit = 20): Promise<ExecutiveObservation[]> {
  return listObservations({ userId, minAttentionScore: threshold, limit });
}

// ── Chains ─────────────────────────────────────────────────────────────────────

export async function getOrCreateChain(input: {
  userId: number;
  anchorObjectId: string;
  anchorObjectType: string;
  name: string;
}): Promise<ObservationChain> {
  // Find existing active chain for this anchor
  const existing = await db
    .select()
    .from(observationChainsTable)
    .where(
      and(
        eq(observationChainsTable.userId, input.userId),
        eq(observationChainsTable.anchorObjectId, input.anchorObjectId),
        eq(observationChainsTable.anchorObjectType, input.anchorObjectType),
        eq(observationChainsTable.isActive, true),
      ),
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (existing) return mapChainRow(existing);

  const row = await db
    .insert(observationChainsTable)
    .values({
      id: randomUUID(),
      userId: input.userId,
      name: input.name,
      anchorObjectId: input.anchorObjectId,
      anchorObjectType: input.anchorObjectType,
    })
    .returning()
    .then((rows) => rows[0]!);

  return mapChainRow(row);
}

export async function updateChain(
  chainId: string,
  updates: Partial<{
    observationCount: number;
    firstObservedAt: Date;
    lastObservedAt: Date;
    signalTypes: string[];
    maxSeverity: string;
    maxAttentionScore: number;
  }>,
): Promise<void> {
  await db
    .update(observationChainsTable)
    .set(updates)
    .where(eq(observationChainsTable.id, chainId));
}

export async function addObservationToChain(
  chainId: string,
  observationId: string,
  position: number,
): Promise<void> {
  await db.insert(observationChainMembersTable).values({
    id: randomUUID(),
    chainId,
    observationId,
    positionInChain: position,
  });
}

export async function getChain(chainId: string): Promise<ObservationChain | null> {
  const row = await db
    .select()
    .from(observationChainsTable)
    .where(eq(observationChainsTable.id, chainId))
    .limit(1)
    .then((rows) => rows[0] ?? null);
  return row ? mapChainRow(row) : null;
}

export async function listChains(opts: { userId?: number; isActive?: boolean; limit?: number }): Promise<ObservationChain[]> {
  const conditions = [];
  if (opts.userId != null) conditions.push(eq(observationChainsTable.userId, opts.userId));
  if (opts.isActive != null) conditions.push(eq(observationChainsTable.isActive, opts.isActive));

  const rows = await db
    .select()
    .from(observationChainsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(observationChainsTable.updatedAt))
    .limit(opts.limit ?? 20);
  return rows.map(mapChainRow);
}

export async function getChainObservations(chainId: string, limit = 100): Promise<ExecutiveObservation[]> {
  const members = await db
    .select()
    .from(observationChainMembersTable)
    .where(eq(observationChainMembersTable.chainId, chainId))
    .orderBy(observationChainMembersTable.positionInChain)
    .limit(limit);

  if (members.length === 0) return [];

  const obsIds = members.map((m) => m.observationId);
  const rows = await db
    .select()
    .from(executiveObservationsTable)
    .where(inArray(executiveObservationsTable.id, obsIds));
  const byId = new Map(rows.map((r) => [r.id, r]));
  return members
    .map((m) => byId.get(m.observationId))
    .filter((r): r is typeof executiveObservationsTable.$inferSelect => r != null)
    .map(mapObsRow);
}

// ── Signals ────────────────────────────────────────────────────────────────────

export async function insertSignal(input: {
  observationId: string;
  userId?: number | null;
  signalType: ObservationSignalType;
  strength: number;
  description?: string;
  relatedGoalId?: string | null;
  relatedPlanId?: string | null;
  relatedExecutionId?: string | null;
  payload?: Record<string, unknown>;
}): Promise<ObservationSignal> {
  const row = await db
    .insert(observationSignalsTable)
    .values({
      id: randomUUID(),
      observationId: input.observationId,
      userId: input.userId ?? null,
      signalType: input.signalType,
      strength: input.strength,
      description: input.description ?? null,
      relatedGoalId: input.relatedGoalId ?? null,
      relatedPlanId: input.relatedPlanId ?? null,
      relatedExecutionId: input.relatedExecutionId ?? null,
      payload: input.payload ?? {},
    })
    .returning()
    .then((rows) => rows[0]!);
  return mapSignalRow(row);
}

export async function getSignalFeed(userId: number, limit = 50): Promise<ObservationSignal[]> {
  const rows = await db
    .select()
    .from(observationSignalsTable)
    .where(eq(observationSignalsTable.userId, userId))
    .orderBy(desc(observationSignalsTable.emittedAt))
    .limit(limit);
  return rows.map(mapSignalRow);
}

// ── Trends ─────────────────────────────────────────────────────────────────────

export async function insertTrend(
  userId: number,
  trend: DetectedTrend,
  windowStartAt: Date,
  windowEndAt: Date,
  sampleCount: number,
): Promise<ObservationTrend> {
  const row = await db
    .insert(observationTrendsTable)
    .values({
      id: randomUUID(),
      userId,
      trendType: trend.trendType,
      direction: trend.direction,
      magnitude: trend.magnitude,
      windowStartAt,
      windowEndAt,
      sampleCount,
      description: trend.description,
      evidence: trend.evidence,
      anchorObjectId: trend.anchorObjectId ?? null,
      anchorObjectType: trend.anchorObjectType ?? null,
    })
    .returning()
    .then((rows) => rows[0]!);
  return mapTrendRow(row);
}

export async function getTrendFeed(userId: number, limit = 20): Promise<ObservationTrend[]> {
  const rows = await db
    .select()
    .from(observationTrendsTable)
    .where(eq(observationTrendsTable.userId, userId))
    .orderBy(desc(observationTrendsTable.detectedAt))
    .limit(limit);
  return rows.map(mapTrendRow);
}

// ── Anomalies ──────────────────────────────────────────────────────────────────

export async function insertAnomaly(
  userId: number,
  anomaly: DetectedAnomaly,
): Promise<ObservationAnomaly> {
  const row = await db
    .insert(observationAnomaliesTable)
    .values({
      id: randomUUID(),
      userId,
      anomalyType: anomaly.anomalyType,
      severity: anomaly.severity,
      description: anomaly.description,
      sourceObjectId: anomaly.sourceObjectId ?? null,
      sourceObjectType: anomaly.sourceObjectType ?? null,
      evidence: anomaly.evidence,
    })
    .returning()
    .then((rows) => rows[0]!);
  return mapAnomalyRow(row);
}

export async function getAnomalyFeed(userId: number, unresolvedOnly = true, limit = 20): Promise<ObservationAnomaly[]> {
  const conditions = [eq(observationAnomaliesTable.userId, userId)];
  if (unresolvedOnly) conditions.push(eq(observationAnomaliesTable.isResolved, false));

  const rows = await db
    .select()
    .from(observationAnomaliesTable)
    .where(and(...conditions))
    .orderBy(desc(observationAnomaliesTable.detectedAt))
    .limit(limit);
  return rows.map(mapAnomalyRow);
}

// ── Correlations ───────────────────────────────────────────────────────────────

export async function insertCorrelations(
  candidates: CorrelationCandidate[],
): Promise<ObservationCorrelation[]> {
  if (candidates.length === 0) return [];
  const rows = await db
    .insert(observationCorrelationsTable)
    .values(
      candidates.map((c) => ({
        id: randomUUID(),
        sourceObservationId: c.sourceObservationId,
        targetObservationId: c.targetObservationId,
        correlationType: c.correlationType,
        strength: c.strength,
      })),
    )
    .returning();
  return rows.map(mapCorrelationRow);
}

export async function getCorrelationsForObservation(
  observationId: string,
): Promise<ObservationCorrelation[]> {
  const rows = await db
    .select()
    .from(observationCorrelationsTable)
    .where(eq(observationCorrelationsTable.sourceObservationId, observationId))
    .orderBy(desc(observationCorrelationsTable.strength));
  return rows.map(mapCorrelationRow);
}

// ── Diagnostics ────────────────────────────────────────────────────────────────

export async function getObservationDiagnostics(userId?: number): Promise<ObservationDiagnostics> {
  const whereClause = userId != null ? eq(executiveObservationsTable.userId, userId) : undefined;
  const rows = await db.select().from(executiveObservationsTable).where(whereClause);

  const bySeverity: Record<string, number> = {};
  const bySignalType: Record<string, number> = {};
  const byEventCategory: Record<string, number> = {};
  let totalAttention = 0;

  for (const row of rows) {
    bySeverity[row.severity]         = (bySeverity[row.severity] ?? 0) + 1;
    bySignalType[row.signalType]     = (bySignalType[row.signalType] ?? 0) + 1;
    byEventCategory[row.eventCategory] = (byEventCategory[row.eventCategory] ?? 0) + 1;
    totalAttention += row.attentionScore;
  }

  const total = rows.length;

  // Active chain count
  const chainCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(observationChainsTable)
    .where(
      userId != null
        ? and(eq(observationChainsTable.isActive, true), eq(observationChainsTable.userId, userId))
        : eq(observationChainsTable.isActive, true),
    );
  const activeChainCount = Number(chainCountResult[0]?.count ?? 0);

  // Unresolved anomalies
  const anomalyCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(observationAnomaliesTable)
    .where(
      userId != null
        ? and(eq(observationAnomaliesTable.isResolved, false), eq(observationAnomaliesTable.userId, userId))
        : eq(observationAnomaliesTable.isResolved, false),
    );
  const unresolvedAnomalies = Number(anomalyCountResult[0]?.count ?? 0);

  // Recent trends (last 24h)
  const oneDayAgo = new Date(Date.now() - 86_400_000);
  const trendCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(observationTrendsTable)
    .where(
      userId != null
        ? and(gte(observationTrendsTable.detectedAt, oneDayAgo), eq(observationTrendsTable.userId, userId))
        : gte(observationTrendsTable.detectedAt, oneDayAgo),
    );
  const recentTrends = Number(trendCountResult[0]?.count ?? 0);

  return {
    totalObservations: total,
    bySeverity,
    bySignalType,
    byEventCategory,
    activeChainCount,
    unresolved_anomalies: unresolvedAnomalies,
    recentTrends,
    averageAttentionScore: total > 0 ? Math.round((totalAttention / total) * 1000) / 1000 : 0,
  };
}
