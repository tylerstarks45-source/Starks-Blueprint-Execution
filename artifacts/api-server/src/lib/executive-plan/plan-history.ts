// ─── Plan History (Build 009) ─────────────────────────────────────────────────
//
// Immutable append-only planning history.
// Nothing is overwritten.  Future Reflection and Learning systems depend on this.
//
// Tracks:
//   - Plan revisions (content changes)
//   - Planning decisions (explicit choices recorded)
//   - Alternative proposals and rejections
//   - Approval events
//   - Scoring updates

import { randomUUID } from "crypto";
import { db, planHistoryTable } from "@workspace/db";
import { and, asc, desc, eq } from "drizzle-orm";
import { logger } from "../logger";
import type {
  PlanHistoryEntry,
  RecordPlanHistoryInput,
  PlanEventType,
} from "./types";
import type { ExecutivePlan } from "./types";

// ─── Row mapper ───────────────────────────────────────────────────────────────

function rowToEntry(row: typeof planHistoryTable.$inferSelect): PlanHistoryEntry {
  return {
    id: row.id,
    planId: row.planId,
    eventType: row.eventType,
    version: row.version,
    snapshot: (row.snapshot as Record<string, unknown>) ?? {},
    note: row.note,
    decidedBy: row.decidedBy,
    recordedAt: row.recordedAt,
  };
}

// ─── Write ────────────────────────────────────────────────────────────────────

/** Record a planning history event.  Fail-open — never throws. */
export async function recordPlanHistory(input: RecordPlanHistoryInput): Promise<PlanHistoryEntry | null> {
  try {
    const row = await db
      .insert(planHistoryTable)
      .values({
        id: randomUUID(),
        planId: input.planId,
        eventType: input.eventType,
        version: input.version,
        snapshot: input.snapshot,
        note: input.note ?? null,
        decidedBy: input.decidedBy ?? null,
      })
      .returning();
    return rowToEntry(row[0]);
  } catch (err) {
    logger.warn({ err, planId: input.planId }, "Plan history: record failed (non-fatal)");
    return null;
  }
}

/** Convenience wrapper: take a full plan snapshot on revision. */
export async function recordPlanRevision(
  plan: ExecutivePlan,
  note?: string,
  decidedBy?: string,
): Promise<PlanHistoryEntry | null> {
  return recordPlanHistory({
    planId: plan.id,
    eventType: "revision" as PlanEventType,
    version: plan.version,
    snapshot: plan as unknown as Record<string, unknown>,
    note,
    decidedBy,
  });
}

/** Record an explicit planning decision (e.g. "selected waterfall strategy"). */
export async function recordPlanDecision(
  planId: string,
  version: number,
  decision: string,
  context?: Record<string, unknown>,
  decidedBy?: string,
): Promise<PlanHistoryEntry | null> {
  return recordPlanHistory({
    planId,
    eventType: "decision" as PlanEventType,
    version,
    snapshot: { decision, context: context ?? {} },
    note: decision,
    decidedBy,
  });
}

/** Record an alternative plan being proposed. */
export async function recordAlternativeProposed(
  primaryPlanId: string,
  alternativePlanId: string,
  alternativeName: string,
  version: number,
): Promise<PlanHistoryEntry | null> {
  return recordPlanHistory({
    planId: primaryPlanId,
    eventType: "alternative" as PlanEventType,
    version,
    snapshot: { alternativePlanId, alternativeName },
    note: `Alternative plan proposed: ${alternativeName}`,
    decidedBy: "executive-plan",
  });
}

/** Record a plan or alternative being rejected. */
export async function recordPlanRejection(
  planId: string,
  version: number,
  reason: string,
  decidedBy?: string,
): Promise<PlanHistoryEntry | null> {
  return recordPlanHistory({
    planId,
    eventType: "rejection" as PlanEventType,
    version,
    snapshot: { reason },
    note: reason,
    decidedBy,
  });
}

/** Record a plan being approved. */
export async function recordPlanApproval(
  planId: string,
  version: number,
  approvedBy?: string,
): Promise<PlanHistoryEntry | null> {
  return recordPlanHistory({
    planId,
    eventType: "approval" as PlanEventType,
    version,
    snapshot: { approvedBy: approvedBy ?? "user" },
    note: "Plan approved for execution",
    decidedBy: approvedBy ?? "user",
  });
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/** Retrieve the full immutable history for a plan, oldest-first. */
export async function getPlanHistory(planId: string): Promise<PlanHistoryEntry[]> {
  const rows = await db
    .select()
    .from(planHistoryTable)
    .where(eq(planHistoryTable.planId, planId))
    .orderBy(asc(planHistoryTable.recordedAt));
  return rows.map(rowToEntry);
}

/** Retrieve the most recent N events for a plan. */
export async function getRecentPlanHistory(
  planId: string,
  limit = 20,
): Promise<PlanHistoryEntry[]> {
  const rows = await db
    .select()
    .from(planHistoryTable)
    .where(eq(planHistoryTable.planId, planId))
    .orderBy(desc(planHistoryTable.recordedAt))
    .limit(limit);
  return rows.map(rowToEntry).reverse(); // Return oldest-first after slicing
}

/** Retrieve all history events of a specific type for a plan. */
export async function getPlanHistoryByType(
  planId: string,
  eventType: PlanEventType,
): Promise<PlanHistoryEntry[]> {
  const rows = await db
    .select()
    .from(planHistoryTable)
    .where(
      and(
        eq(planHistoryTable.planId, planId),
        eq(planHistoryTable.eventType, eventType),
      ),
    )
    .orderBy(asc(planHistoryTable.recordedAt));
  return rows.map(rowToEntry);
}
