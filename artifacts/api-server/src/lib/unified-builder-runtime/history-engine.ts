// ── Build 049: History Engine ─────────────────────────────────────────────────
// Maintains deterministic undo/redo chains per builder session.
import { db } from "@workspace/db";
import { builderHistory, builderEvents, runtimeRegistry } from "@workspace/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export async function recordOperation(params: {
  sessionId:      number;
  userId:         number;
  builderType:    string;
  operationType:  string;
  operationLabel: string;
  targetPath?:    string;
  beforeState:    Record<string, unknown>;
  afterState:     Record<string, unknown>;
}): Promise<{ historyId: number; sequenceNumber: number }> {
  // Get next sequence number for this session
  const prev = await db
    .select({ maxSeq: sql<string>`max(sequence_number)` })
    .from(builderHistory)
    .where(eq(builderHistory.sessionId, params.sessionId));

  const sequenceNumber = (Number(prev[0]?.maxSeq ?? 0)) + 1;

  const result = await db.insert(builderHistory).values({
    sessionId:      params.sessionId,
    userId:         params.userId,
    builderType:    params.builderType,
    sequenceNumber,
    operationType:  params.operationType,
    operationLabel: params.operationLabel,
    targetPath:     params.targetPath ?? null,
    beforeState:    params.beforeState,
    afterState:     params.afterState,
    isUndone:       false,
    isRedone:       false,
  }).returning({ id: builderHistory.id });

  const historyId = (result as any[])[0]?.id as number;

  // Update registry undo pointer + length
  await db.update(runtimeRegistry).set({
    historyLength: sequenceNumber,
    undoPointer:   sequenceNumber,
    updatedAt:     new Date(),
  }).where(eq(runtimeRegistry.sessionId, params.sessionId));

  return { historyId, sequenceNumber };
}

export async function undo(sessionId: number, userId: number): Promise<{ success: boolean; restoredState?: Record<string, unknown>; operationLabel?: string }> {
  // Find the last non-undone operation
  const rows = await db.select().from(builderHistory).where(
    and(
      eq(builderHistory.sessionId, sessionId),
      eq(builderHistory.userId, userId),
      eq(builderHistory.isUndone, false),
    )
  ).orderBy(desc(builderHistory.sequenceNumber)).limit(1);

  if (!rows[0]) return { success: false };

  const op = rows[0];
  await db.update(builderHistory).set({ isUndone: true }).where(eq(builderHistory.id, op.id));

  // Decrement undo pointer
  await db.update(runtimeRegistry).set({
    undoPointer: sql`greatest(0, ${runtimeRegistry.undoPointer} - 1)`,
    updatedAt:   new Date(),
  }).where(eq(runtimeRegistry.sessionId, sessionId));

  await db.insert(builderEvents).values({
    sessionId,
    userId,
    builderType: op.builderType,
    eventType:   "undo",
    severity:    "info",
    summary:     `Undid: "${op.operationLabel}"`,
    details:     { operationId: op.id, sequenceNumber: op.sequenceNumber },
  });

  return { success: true, restoredState: op.beforeState as Record<string, unknown>, operationLabel: op.operationLabel };
}

export async function redo(sessionId: number, userId: number): Promise<{ success: boolean; restoredState?: Record<string, unknown>; operationLabel?: string }> {
  // Find the most recent undone (not yet re-done) operation
  const rows = await db.select().from(builderHistory).where(
    and(
      eq(builderHistory.sessionId, sessionId),
      eq(builderHistory.userId, userId),
      eq(builderHistory.isUndone, true),
      eq(builderHistory.isRedone, false),
    )
  ).orderBy(builderHistory.sequenceNumber).limit(1);

  if (!rows[0]) return { success: false };

  const op = rows[0];
  await db.update(builderHistory).set({ isUndone: false, isRedone: true }).where(eq(builderHistory.id, op.id));

  await db.update(runtimeRegistry).set({
    undoPointer: sql`${runtimeRegistry.undoPointer} + 1`,
    updatedAt:   new Date(),
  }).where(eq(runtimeRegistry.sessionId, sessionId));

  await db.insert(builderEvents).values({
    sessionId,
    userId,
    builderType: op.builderType,
    eventType:   "redo",
    severity:    "info",
    summary:     `Redid: "${op.operationLabel}"`,
    details:     { operationId: op.id, sequenceNumber: op.sequenceNumber },
  });

  return { success: true, restoredState: op.afterState as Record<string, unknown>, operationLabel: op.operationLabel };
}

export async function getHistory(sessionId: number, limit: number = 50) {
  return db.select().from(builderHistory)
    .where(eq(builderHistory.sessionId, sessionId))
    .orderBy(desc(builderHistory.sequenceNumber))
    .limit(limit);
}

export async function countHistoryOps(userId: number): Promise<number> {
  const rows = await db.select({ cnt: sql<string>`count(*)` }).from(builderHistory).where(eq(builderHistory.userId, userId));
  return Number(rows[0]?.cnt ?? 0);
}
