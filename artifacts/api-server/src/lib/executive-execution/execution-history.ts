// ─── Execution History (Build 010) ────────────────────────────────────────────
//
// Immutable append-only event log for all execution transitions and events.
// Every state transition, retry, failure, cancellation, completion, and
// manual intervention is recorded here.
//
// Future Observation and Reflection systems depend on this history being
// complete, accurate, and unmodified.

import { randomUUID } from "crypto";
import { db, executionHistoryTable } from "@workspace/db";
import type {
  ExecutionHistoryEvent,
  ExecutionEventType,
  ExecutionStatus,
  ExecutionStepStatus,
} from "./types";
import { logger } from "../logger";

// ── Core insert (all writes go through here) ──────────────────────────────────

export async function recordExecutionEvent(input: {
  executionId: string;
  stepId?: string | null;
  eventType: ExecutionEventType;
  fromStatus?: string | null;
  toStatus?: string | null;
  note?: string | null;
  triggeredBy?: string | null;
  snapshot?: Record<string, unknown>;
}): Promise<ExecutionHistoryEvent> {
  const row = await db
    .insert(executionHistoryTable)
    .values({
      id: randomUUID(),
      executionId: input.executionId,
      stepId: input.stepId ?? null,
      eventType: input.eventType,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      note: input.note ?? null,
      triggeredBy: input.triggeredBy ?? null,
      snapshot: input.snapshot ?? {},
    })
    .returning()
    .then((rows) => rows[0]!);

  return mapHistoryRow(row);
}

// ── Typed event helpers ────────────────────────────────────────────────────────

export async function recordExecutionCreated(
  executionId: string,
  snapshot?: Record<string, unknown>,
): Promise<ExecutionHistoryEvent> {
  return recordExecutionEvent({ executionId, eventType: "created", toStatus: "pending", snapshot, triggeredBy: "system" });
}

export async function recordExecutionApproved(executionId: string, triggeredBy = "user"): Promise<ExecutionHistoryEvent> {
  return recordExecutionEvent({ executionId, eventType: "approved", fromStatus: "pending", toStatus: "approved", triggeredBy });
}

export async function recordExecutionStarted(
  executionId: string,
  triggeredBy = "coordinator",
): Promise<ExecutionHistoryEvent> {
  return recordExecutionEvent({ executionId, eventType: "started", fromStatus: "approved", toStatus: "running", triggeredBy });
}

export async function recordExecutionPaused(
  executionId: string,
  fromStatus: ExecutionStatus,
  triggeredBy = "user",
  note?: string,
): Promise<ExecutionHistoryEvent> {
  return recordExecutionEvent({ executionId, eventType: "paused", fromStatus, toStatus: "paused", triggeredBy, note });
}

export async function recordExecutionResumed(
  executionId: string,
  fromStatus: ExecutionStatus,
  triggeredBy = "user",
): Promise<ExecutionHistoryEvent> {
  return recordExecutionEvent({ executionId, eventType: "resumed", fromStatus, toStatus: "running", triggeredBy });
}

export async function recordExecutionBlocked(
  executionId: string,
  reason: string,
  triggeredBy = "coordinator",
): Promise<ExecutionHistoryEvent> {
  return recordExecutionEvent({ executionId, eventType: "blocked", fromStatus: "running", toStatus: "blocked", note: reason, triggeredBy });
}

export async function recordExecutionUnblocked(
  executionId: string,
  triggeredBy = "coordinator",
): Promise<ExecutionHistoryEvent> {
  return recordExecutionEvent({ executionId, eventType: "unblocked", fromStatus: "blocked", toStatus: "running", triggeredBy });
}

export async function recordExecutionRetrying(
  executionId: string,
  retryCount: number,
  triggeredBy = "coordinator",
): Promise<ExecutionHistoryEvent> {
  return recordExecutionEvent({
    executionId,
    eventType: "retrying",
    fromStatus: "failed",
    toStatus: "retrying",
    note: `Retry attempt #${retryCount}`,
    triggeredBy,
  });
}

export async function recordExecutionCompleted(
  executionId: string,
  triggeredBy = "coordinator",
  snapshot?: Record<string, unknown>,
): Promise<ExecutionHistoryEvent> {
  return recordExecutionEvent({ executionId, eventType: "completed", fromStatus: "running", toStatus: "completed", triggeredBy, snapshot });
}

export async function recordExecutionFailed(
  executionId: string,
  reason: string,
  triggeredBy = "coordinator",
  snapshot?: Record<string, unknown>,
): Promise<ExecutionHistoryEvent> {
  return recordExecutionEvent({ executionId, eventType: "failed", toStatus: "failed", note: reason, triggeredBy, snapshot });
}

export async function recordExecutionCancelled(
  executionId: string,
  reason?: string,
  triggeredBy = "user",
): Promise<ExecutionHistoryEvent> {
  return recordExecutionEvent({ executionId, eventType: "cancelled", toStatus: "cancelled", note: reason, triggeredBy });
}

export async function recordManualIntervention(
  executionId: string,
  note: string,
  triggeredBy = "user",
): Promise<ExecutionHistoryEvent> {
  return recordExecutionEvent({ executionId, eventType: "manual_intervention", note, triggeredBy });
}

// ── Step events ────────────────────────────────────────────────────────────────

export async function recordStepStarted(
  executionId: string,
  stepId: string,
  triggeredBy = "coordinator",
): Promise<ExecutionHistoryEvent> {
  return recordExecutionEvent({ executionId, stepId, eventType: "step_started", fromStatus: "pending", toStatus: "running", triggeredBy });
}

export async function recordStepCompleted(
  executionId: string,
  stepId: string,
  triggeredBy = "coordinator",
): Promise<ExecutionHistoryEvent> {
  return recordExecutionEvent({ executionId, stepId, eventType: "step_completed", fromStatus: "running", toStatus: "completed", triggeredBy });
}

export async function recordStepFailed(
  executionId: string,
  stepId: string,
  reason: string,
  triggeredBy = "coordinator",
): Promise<ExecutionHistoryEvent> {
  return recordExecutionEvent({ executionId, stepId, eventType: "step_failed", toStatus: "failed", note: reason, triggeredBy });
}

export async function recordStepSkipped(
  executionId: string,
  stepId: string,
  reason: string,
  triggeredBy = "user",
): Promise<ExecutionHistoryEvent> {
  return recordExecutionEvent({ executionId, stepId, eventType: "step_skipped", fromStatus: "pending", toStatus: "skipped", note: reason, triggeredBy });
}

export async function recordStepRetried(
  executionId: string,
  stepId: string,
  retryCount: number,
  triggeredBy = "coordinator",
): Promise<ExecutionHistoryEvent> {
  return recordExecutionEvent({
    executionId,
    stepId,
    eventType: "step_retried",
    fromStatus: "failed",
    toStatus: "retrying",
    note: `Retry attempt #${retryCount}`,
    triggeredBy,
  });
}

export async function recordAdapterDispatched(
  executionId: string,
  stepId: string,
  adapterType: string,
): Promise<ExecutionHistoryEvent> {
  return recordExecutionEvent({
    executionId,
    stepId,
    eventType: "adapter_dispatched",
    note: `Dispatched to adapter: ${adapterType}`,
    triggeredBy: "coordinator",
  });
}

export async function recordRecoveryPointCreated(
  executionId: string,
  label: string,
): Promise<ExecutionHistoryEvent> {
  return recordExecutionEvent({
    executionId,
    eventType: "recovery_point_created",
    note: `Recovery point created: ${label}`,
    triggeredBy: "coordinator",
  });
}

// ── Reads ──────────────────────────────────────────────────────────────────────

export async function getExecutionHistory(
  executionId: string,
  limit = 100,
): Promise<ExecutionHistoryEvent[]> {
  const { eq, desc } = await import("drizzle-orm");
  const rows = await db
    .select()
    .from(executionHistoryTable)
    .where(eq(executionHistoryTable.executionId, executionId))
    .orderBy(desc(executionHistoryTable.recordedAt))
    .limit(limit);
  return rows.map(mapHistoryRow);
}

export async function getRecentExecutionHistory(
  executionId: string,
  limit = 10,
): Promise<ExecutionHistoryEvent[]> {
  return getExecutionHistory(executionId, limit);
}

export async function getStepHistory(
  executionId: string,
  stepId: string,
): Promise<ExecutionHistoryEvent[]> {
  const { eq, and, desc } = await import("drizzle-orm");
  const rows = await db
    .select()
    .from(executionHistoryTable)
    .where(and(
      eq(executionHistoryTable.executionId, executionId),
      eq(executionHistoryTable.stepId, stepId),
    ))
    .orderBy(desc(executionHistoryTable.recordedAt));
  return rows.map(mapHistoryRow);
}

// ── Row mapping ────────────────────────────────────────────────────────────────

function mapHistoryRow(row: typeof executionHistoryTable.$inferSelect): ExecutionHistoryEvent {
  return {
    id: row.id,
    executionId: row.executionId,
    stepId: row.stepId ?? null,
    eventType: row.eventType as ExecutionEventType,
    fromStatus: row.fromStatus ?? null,
    toStatus: row.toStatus ?? null,
    note: row.note ?? null,
    triggeredBy: row.triggeredBy ?? null,
    snapshot: (row.snapshot as Record<string, unknown>) ?? {},
    recordedAt: row.recordedAt,
  };
}
