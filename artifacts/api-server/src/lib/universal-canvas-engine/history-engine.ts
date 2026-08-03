// ─────────────────────────────────────────────────────────────────────────────
// Build 052 — History Engine
// Append-only canvas operation log with undo/redo pointer support
// Integrates with UBRE history via sequenceNumber
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@workspace/db";
import { canvasHistory } from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";
import type { OperationType } from "./types";

export interface HistoryEntry {
  canvasId:       string;
  sessionId?:     number;
  operationType:  OperationType;
  operationTitle: string;
  affectedNodeIds:string[];
  beforeState:    Record<string, unknown>;
  afterState:     Record<string, unknown>;
  sequenceNumber: number;
}

export async function recordOperation(entry: HistoryEntry): Promise<any> {
  const rows = await db.insert(canvasHistory).values({
    canvasId:        entry.canvasId,
    sessionId:       entry.sessionId ?? null,
    operationType:   entry.operationType,
    operationTitle:  entry.operationTitle,
    affectedNodeIds: entry.affectedNodeIds,
    beforeState:     entry.beforeState,
    afterState:      entry.afterState,
    isUndone:        false,
    sequenceNumber:  entry.sequenceNumber,
    metadata:        {},
  }).returning() as any[];
  return rows[0];
}

export async function markUndone(id: number): Promise<void> {
  await db.update(canvasHistory).set({ isUndone: true }).where(eq(canvasHistory.id, id));
}

export async function listHistory(canvasId: string, limit = 50): Promise<any[]> {
  return db
    .select()
    .from(canvasHistory)
    .where(eq(canvasHistory.canvasId, canvasId))
    .orderBy(desc(canvasHistory.sequenceNumber))
    .limit(limit);
}

export async function getUndoStack(canvasId: string): Promise<any[]> {
  const all = await db
    .select()
    .from(canvasHistory)
    .where(and(eq(canvasHistory.canvasId, canvasId)))
    .orderBy(desc(canvasHistory.sequenceNumber));
  return all.filter((h: any) => !h.isUndone);
}

export async function getRedoStack(canvasId: string): Promise<any[]> {
  const all = await db
    .select()
    .from(canvasHistory)
    .where(and(eq(canvasHistory.canvasId, canvasId)))
    .orderBy(desc(canvasHistory.sequenceNumber));
  return all.filter((h: any) => h.isUndone);
}

export async function getHistoryCount(canvasId?: string): Promise<number> {
  const rows = canvasId
    ? await db.select({ id: canvasHistory.id }).from(canvasHistory).where(eq(canvasHistory.canvasId, canvasId))
    : await db.select({ id: canvasHistory.id }).from(canvasHistory);
  return rows.length;
}
