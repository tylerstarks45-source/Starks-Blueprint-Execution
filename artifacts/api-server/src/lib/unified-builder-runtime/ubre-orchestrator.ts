// ── Build 049: UBRE Orchestrator ──────────────────────────────────────────────
import { db } from "@workspace/db";
import {
  builderSessions, builderDrafts, builderHistory, builderEvents,
  builderLocks, runtimeRegistry, runtimeSnapshots, ubreDiagnostics, builderRecovery,
} from "@workspace/db/schema";
import { eq, and, sql, desc, gt } from "drizzle-orm";
import { countActiveSessions, countSessionsWithUnsavedWork, getSessionsByState } from "./runtime-session-engine";
import { countDraftsForUser } from "./draft-engine";
import { countHistoryOps } from "./history-engine";
import { countPendingRecoveries } from "./recovery-engine";
import { getValidationPassRate } from "./validation-engine";
import type { UBRESummary } from "./types";
import { UBRE_THROTTLE_CYCLES } from "./types";

// ── Autosave trigger (called by builders on change) ───────────────────────────
export { saveDraft as autosave } from "./draft-engine";

// ── Lock management ───────────────────────────────────────────────────────────
export async function acquireLock(params: {
  userId:      number;
  sessionId:   number;
  builderType: string;
  assetId?:    number;
  elementPath?: string;
  lockType?:   "exclusive" | "shared";
  ttlSeconds?: number;
}): Promise<{ lockId: number; acquired: boolean }> {
  // Check for active conflicting exclusive lock
  if (params.assetId) {
    const existing = await db.select().from(builderLocks).where(
      and(
        eq(builderLocks.assetId, params.assetId),
        eq(builderLocks.isActive, true),
        eq(builderLocks.lockType, "exclusive"),
      )
    ).limit(1);

    if (existing.length > 0 && existing[0]!.userId !== params.userId) {
      return { lockId: -1, acquired: false };
    }
  }

  const expiresAt = params.ttlSeconds ? new Date(Date.now() + params.ttlSeconds * 1000) : null;

  const result = await db.insert(builderLocks).values({
    userId:      params.userId,
    builderType: params.builderType,
    assetId:     params.assetId ?? null,
    elementPath: params.elementPath ?? null,
    lockType:    params.lockType ?? "exclusive",
    sessionId:   params.sessionId,
    isActive:    true,
    expiresAt,
  }).returning({ id: builderLocks.id });

  const lockId = (result as any[])[0]?.id as number;

  await db.insert(builderEvents).values({
    sessionId:   params.sessionId,
    userId:      params.userId,
    builderType: params.builderType,
    eventType:   "lock_acquired",
    severity:    "info",
    summary:     `Lock acquired on asset ${params.assetId ?? "unknown"}`,
    details:     { lockId, assetId: params.assetId, elementPath: params.elementPath },
  });

  return { lockId, acquired: true };
}

export async function releaseLock(lockId: number, userId: number): Promise<void> {
  const rows = await db.select().from(builderLocks).where(
    and(eq(builderLocks.id, lockId), eq(builderLocks.userId, userId))
  ).limit(1);

  if (!rows[0]) return;

  await db.update(builderLocks).set({ isActive: false, releasedAt: new Date() }).where(eq(builderLocks.id, lockId));

  await db.insert(builderEvents).values({
    sessionId:   rows[0].sessionId,
    userId,
    builderType: rows[0].builderType,
    eventType:   "lock_released",
    severity:    "info",
    summary:     `Lock released on asset ${rows[0].assetId ?? "unknown"}`,
    details:     { lockId },
  });
}

export async function getActiveLocks(userId: number) {
  return db.select().from(builderLocks).where(and(eq(builderLocks.userId, userId), eq(builderLocks.isActive, true)));
}

export async function countActiveLocks(): Promise<number> {
  const rows = await db.select({ cnt: sql<string>`count(*)` }).from(builderLocks).where(eq(builderLocks.isActive, true));
  return Number(rows[0]?.cnt ?? 0);
}

// ── Events ────────────────────────────────────────────────────────────────────
export async function getEvents(userId: number, limit: number = 50) {
  return db.select().from(builderEvents).where(eq(builderEvents.userId, userId))
    .orderBy(desc(builderEvents.createdAt)).limit(limit);
}

// ── Registry ─────────────────────────────────────────────────────────────────
export async function getRuntimeRegistry(userId: number) {
  return db.select().from(runtimeRegistry).where(eq(runtimeRegistry.userId, userId));
}

// ── Diagnostics ───────────────────────────────────────────────────────────────
export async function getDiagnostics(limit: number = 50) {
  return db.select().from(ubreDiagnostics).orderBy(desc(ubreDiagnostics.createdAt)).limit(limit);
}

export async function getBuilderHealth(): Promise<{
  status: "healthy" | "degraded" | "critical";
  activeSessions: number;
  crashedSessions: number;
  pendingRecoveries: number;
  activeLocks: number;
  recentErrors: number;
}> {
  const [activeSessions, crashed, locks, recentErrors] = await Promise.all([
    countActiveSessions(),
    getSessionsByState("crashed"),
    countActiveLocks(),
    db.select({ cnt: sql<string>`count(*)` }).from(ubreDiagnostics).where(
      and(
        eq(ubreDiagnostics.severity, "error"),
        gt(ubreDiagnostics.createdAt, new Date(Date.now() - 3600000)),
      )
    ),
  ]);

  const crashedCount = crashed.length;
  const errorCount   = Number(recentErrors[0]?.cnt ?? 0);
  const status: "healthy" | "degraded" | "critical" =
    errorCount > 10 || crashedCount > 5 ? "critical" :
    errorCount > 3  || crashedCount > 0 ? "degraded" : "healthy";

  return {
    status,
    activeSessions,
    crashedSessions:   crashedCount,
    pendingRecoveries: crashedCount,
    activeLocks:       locks,
    recentErrors:      errorCount,
  };
}

// ── UBRE Summary for EB ───────────────────────────────────────────────────────
export async function computeUBRESummary(userId: number): Promise<UBRESummary> {
  const [
    activeSessions,
    sessionsWithUnsaved,
    totalDrafts,
    totalHistoryOps,
    activeLocks,
    pendingRecoveries,
    passRate,
    recentErrors,
    publishReadySessions,
  ] = await Promise.all([
    countActiveSessions(),
    countSessionsWithUnsavedWork(userId),
    countDraftsForUser(userId),
    countHistoryOps(userId),
    countActiveLocks(),
    countPendingRecoveries(userId),
    getValidationPassRate(userId),
    db.select({ cnt: sql<string>`count(*)` }).from(ubreDiagnostics).where(
      and(eq(ubreDiagnostics.severity, "error"), gt(ubreDiagnostics.createdAt, new Date(Date.now() - 86400000)))
    ),
    db.select({ cnt: sql<string>`count(*)` }).from(runtimeRegistry).where(
      and(eq(runtimeRegistry.userId, userId), eq(runtimeRegistry.isPublishReady, true))
    ),
  ]);

  // Builder breakdown
  const bkDown = await db.select({
    type: builderSessions.builderType,
    cnt:  sql<string>`count(*)`,
  }).from(builderSessions).where(
    and(eq(builderSessions.userId, userId), eq(builderSessions.sessionState, "active"))
  ).groupBy(builderSessions.builderType);

  const builderBreakdown: Record<string, number> = {};
  for (const r of bkDown) builderBreakdown[r.type] = Number(r.cnt);

  return {
    activeSessions,
    sessionsWithUnsaved,
    totalDrafts,
    totalHistoryOps,
    activeLocks,
    pendingRecoveries,
    builderBreakdown,
    recentErrors:         Number(recentErrors[0]?.cnt ?? 0),
    publishReadySessions: Number(publishReadySessions[0]?.cnt ?? 0),
    validationPassRate:   passRate,
    computedAt:           new Date().toISOString(),
  };
}

// ── Snapshots ─────────────────────────────────────────────────────────────────
export async function captureUBRESnapshot(userId: number): Promise<void> {
  const summary = await computeUBRESummary(userId);

  const crashed = await getSessionsByState("crashed");

  await db.insert(runtimeSnapshots).values({
    activeSessions:     summary.activeSessions,
    totalSessions:      summary.totalDrafts, // rough proxy
    totalDrafts:        summary.totalDrafts,
    totalHistoryOps:    summary.totalHistoryOps,
    totalEvents:        0,
    activeLocks:        summary.activeLocks,
    builderBreakdown:   summary.builderBreakdown,
    validationPassRate: summary.validationPassRate,
    recoveryCount:      summary.pendingRecoveries,
    crashCount:         crashed.length,
    lawApplied:         true,
    snapshotData:       { build: "049", userId, computedAt: summary.computedAt },
  });
}

// ── Maintenance ───────────────────────────────────────────────────────────────
let maintenanceCycle = 0;

export async function triggerUBREMaintenance(userId: number): Promise<void> {
  maintenanceCycle++;
  if (maintenanceCycle % UBRE_THROTTLE_CYCLES !== 0) return;
  await captureUBRESnapshot(userId);
  // Release expired locks
  await db.update(builderLocks).set({ isActive: false, releasedAt: new Date() }).where(
    and(eq(builderLocks.isActive, true), sql`expires_at IS NOT NULL AND expires_at < NOW()`)
  );
}

export async function getSnapshots(limit: number = 20) {
  return db.select().from(runtimeSnapshots).orderBy(desc(runtimeSnapshots.createdAt)).limit(limit);
}
