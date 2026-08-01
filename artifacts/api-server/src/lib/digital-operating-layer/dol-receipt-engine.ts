// ── Build 043: Execution Receipt Engine ──────────────────────────────────
// Records every external operation as an immutable audit receipt.
// Unified Operating Law: every external action must produce an execution receipt.
import { db } from "@workspace/db";
import { executionReceipts } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import type { ExecutionChannelType, ReceiptResult, ExecutionReceipt } from "./types";

// Create an execution receipt (immutable — never updated after insert).
export async function createReceipt(params: {
  sessionId:           number;
  channelType:         ExecutionChannelType;
  requestedOperation:  string;
  authorizedOperation: string;
  actualOperation:     string;
  authorityRef:        string;
  startedAt:           Date;
  completedAt?:        Date;
  result?:             ReceiptResult;
  evidence?:           Record<string, unknown>;
  rollbackRef?:        string;
}): Promise<ExecutionReceipt> {
  const completedAt = params.completedAt ?? new Date();
  const durationMs  = completedAt.getTime() - params.startedAt.getTime();

  const [row] = await db.insert(executionReceipts).values({
    sessionId:           params.sessionId,
    channelType:         params.channelType,
    requestedOperation:  params.requestedOperation,
    authorizedOperation: params.authorizedOperation,
    actualOperation:     params.actualOperation,
    startedAt:           params.startedAt,
    completedAt,
    durationMs,
    result:              params.result ?? "success",
    evidence:            params.evidence ?? {},
    rollbackRef:         params.rollbackRef ?? null,
    authorityRef:        params.authorityRef,
  }).returning();

  return {
    id:                  row.id,
    sessionId:           row.sessionId,
    channelType:         row.channelType as ExecutionChannelType,
    requestedOperation:  row.requestedOperation,
    authorizedOperation: row.authorizedOperation,
    actualOperation:     row.actualOperation,
    result:              (row.result ?? "success") as ReceiptResult,
    durationMs:          row.durationMs ?? null,
    authorityRef:        row.authorityRef,
  };
}

export async function getReceiptsBySession(sessionId: number): Promise<ExecutionReceipt[]> {
  const rows = await db
    .select()
    .from(executionReceipts)
    .where(eq(executionReceipts.sessionId, sessionId))
    .orderBy(desc(executionReceipts.createdAt));
  return rows.map(rowToReceipt);
}

export async function countTotalReceipts(): Promise<number> {
  const rows = await db.select({ id: executionReceipts.id }).from(executionReceipts);
  return rows.length;
}

export async function listRecentReceipts(limit = 50): Promise<ExecutionReceipt[]> {
  const rows = await db
    .select()
    .from(executionReceipts)
    .orderBy(desc(executionReceipts.createdAt))
    .limit(limit);
  return rows.map(rowToReceipt);
}

function rowToReceipt(r: typeof executionReceipts.$inferSelect): ExecutionReceipt {
  return {
    id:                  r.id,
    sessionId:           r.sessionId,
    channelType:         r.channelType as ExecutionChannelType,
    requestedOperation:  r.requestedOperation,
    authorizedOperation: r.authorizedOperation,
    actualOperation:     r.actualOperation,
    result:              (r.result ?? "success") as ReceiptResult,
    durationMs:          r.durationMs ?? null,
    authorityRef:        r.authorityRef,
  };
}
