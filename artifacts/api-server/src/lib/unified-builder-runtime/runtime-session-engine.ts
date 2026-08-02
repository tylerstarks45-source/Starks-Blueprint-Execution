// ── Build 049: Runtime Session Engine ────────────────────────────────────────
// Owns every active editing session across all builders.
import { db } from "@workspace/db";
import { builderSessions, builderEvents, runtimeRegistry } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import type { BuilderType, SessionState } from "./types";

export async function startSession(params: {
  userId:       number;
  builderType:  BuilderType;
  assetId?:     number;
  projectId?:   number;
  businessId?:  number;
  metadata?:    Record<string, unknown>;
}): Promise<{ sessionId: number }> {
  const result = await db
    .insert(builderSessions)
    .values({
      userId:          params.userId,
      builderType:     params.builderType,
      assetId:         params.assetId ?? null,
      projectId:       params.projectId ?? null,
      businessId:      params.businessId ?? null,
      sessionState:    "active",
      hasUnsavedWork:  false,
      autosaveEnabled: true,
      autosaveIntervalMs: 30000,
      lastActivityAt:  new Date(),
      metadata:        params.metadata ?? {},
    })
    .returning({ id: builderSessions.id });

  const sessionId = (result as any[])[0]?.id as number;

  // Upsert runtime registry
  await db.insert(runtimeRegistry).values({
    sessionId,
    userId:       params.userId,
    builderType:  params.builderType,
    assetId:      params.assetId ?? null,
    sessionState: "active",
    historyLength:  0,
    undoPointer:    0,
    hasUnsavedWork: false,
    isPublishReady: false,
  }).onConflictDoNothing();

  // Record event
  await db.insert(builderEvents).values({
    sessionId,
    userId:      params.userId,
    builderType: params.builderType,
    eventType:   "session_started",
    severity:    "info",
    summary:     `${params.builderType} session started for asset ${params.assetId ?? "none"}`,
    details:     { assetId: params.assetId, projectId: params.projectId },
  });

  return { sessionId };
}

export async function endSession(sessionId: number, userId: number): Promise<void> {
  const rows = await db.select().from(builderSessions).where(and(eq(builderSessions.id, sessionId), eq(builderSessions.userId, userId))).limit(1);
  if (!rows[0]) return;

  await db.update(builderSessions).set({ sessionState: "ended", endedAt: new Date() }).where(eq(builderSessions.id, sessionId));
  await db.update(runtimeRegistry).set({ sessionState: "ended", updatedAt: new Date() }).where(eq(runtimeRegistry.sessionId, sessionId));

  await db.insert(builderEvents).values({
    sessionId,
    userId,
    builderType: rows[0].builderType,
    eventType:   "session_ended",
    severity:    "info",
    summary:     `${rows[0].builderType} session ended`,
    details:     {},
  });
}

export async function getActiveSession(userId: number, builderType: BuilderType, assetId?: number) {
  const conditions = [
    eq(builderSessions.userId, userId),
    eq(builderSessions.builderType, builderType),
    eq(builderSessions.sessionState, "active"),
  ];
  if (assetId) conditions.push(eq(builderSessions.assetId, assetId));
  const rows = await db.select().from(builderSessions).where(and(...conditions)).limit(1);
  return rows[0] ?? null;
}

export async function listActiveSessions(userId: number) {
  return db.select().from(builderSessions).where(and(
    eq(builderSessions.userId, userId),
    eq(builderSessions.sessionState, "active"),
  ));
}

export async function markSessionActivity(sessionId: number): Promise<void> {
  await db.update(builderSessions).set({ lastActivityAt: new Date() }).where(eq(builderSessions.id, sessionId));
  await db.update(runtimeRegistry).set({ updatedAt: new Date() }).where(eq(runtimeRegistry.sessionId, sessionId));
}

export async function countActiveSessions(): Promise<number> {
  const rows = await db.select({ cnt: sql<string>`count(*)` }).from(builderSessions).where(eq(builderSessions.sessionState, "active"));
  return Number(rows[0]?.cnt ?? 0);
}

export async function countSessionsWithUnsavedWork(userId: number): Promise<number> {
  const rows = await db.select({ cnt: sql<string>`count(*)` }).from(builderSessions).where(and(
    eq(builderSessions.userId, userId),
    eq(builderSessions.sessionState, "active"),
    eq(builderSessions.hasUnsavedWork, true),
  ));
  return Number(rows[0]?.cnt ?? 0);
}

export async function getSessionsByState(state: SessionState) {
  return db.select().from(builderSessions).where(eq(builderSessions.sessionState, state));
}
