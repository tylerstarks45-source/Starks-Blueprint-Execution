// ─── Goal Progress Engine (Build 008) ────────────────────────────────────────
//
// Tracks goal progress over time, records immutable history snapshots, and
// estimates completion dates from historical velocity.
//
// NO planning, scheduling, or task management — only progress observation.

import { db, goalProgressHistoryTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import type { GoalProgressSnapshot, GoalProgressReport } from "./types";

// ─── Row mapper ───────────────────────────────────────────────────────────────

function rowToSnapshot(row: typeof goalProgressHistoryTable.$inferSelect): GoalProgressSnapshot {
  return {
    id: row.id,
    goalId: row.goalId,
    progressPct: row.progressPct,
    status: row.status,
    note: row.note,
    recordedAt: row.recordedAt,
  };
}

// ─── Record a progress snapshot ───────────────────────────────────────────────

/** Append one immutable progress snapshot to the goal's history. */
export async function recordProgressSnapshot(
  goalId: string,
  progressPct: number,
  status: string,
  note?: string,
): Promise<GoalProgressSnapshot> {
  const id = crypto.randomUUID();
  const [row] = await db
    .insert(goalProgressHistoryTable)
    .values({
      id,
      goalId,
      progressPct: Math.max(0, Math.min(100, progressPct)),
      status,
      note: note ?? null,
    })
    .returning();
  if (!row) throw new Error(`Failed to record progress snapshot for goal ${goalId}`);
  return rowToSnapshot(row);
}

// ─── Retrieve history ─────────────────────────────────────────────────────────

/** Return the full progress history for a goal, newest first. */
export async function getProgressHistory(
  goalId: string,
  limit = 50,
): Promise<GoalProgressSnapshot[]> {
  const rows = await db
    .select()
    .from(goalProgressHistoryTable)
    .where(eq(goalProgressHistoryTable.goalId, goalId))
    .orderBy(desc(goalProgressHistoryTable.recordedAt))
    .limit(limit);
  return rows.map(rowToSnapshot);
}

// ─── Velocity and estimated completion ───────────────────────────────────────

/** Compute the progress velocity (pct/day) from history.
 *  Requires at least 2 data points. Returns null if insufficient data. */
function computeVelocity(history: GoalProgressSnapshot[]): number | null {
  if (history.length < 2) return null;
  // Use oldest and newest points for a linear estimate
  const newest = history[0];
  const oldest = history[history.length - 1];
  const deltaProgress = newest.progressPct - oldest.progressPct;
  const deltaDays =
    (newest.recordedAt.getTime() - oldest.recordedAt.getTime()) / (1000 * 60 * 60 * 24);
  if (deltaDays < 0.1) return null; // too close together
  return deltaProgress / deltaDays;
}

/** Estimate completion date given current velocity and remaining progress. */
function estimateCompletion(
  currentProgressPct: number,
  velocityPctPerDay: number | null,
): Date | null {
  if (velocityPctPerDay === null || velocityPctPerDay <= 0) return null;
  const remaining = 100 - currentProgressPct;
  if (remaining <= 0) return new Date(); // already complete
  const daysNeeded = remaining / velocityPctPerDay;
  return new Date(Date.now() + daysNeeded * 24 * 60 * 60 * 1000);
}

// ─── Progress report ─────────────────────────────────────────────────────────

/** Build a GoalProgressReport for a goal from its history. */
export async function buildProgressReport(
  goalId: string,
  currentProgressPct: number,
  currentStatus: string,
): Promise<GoalProgressReport> {
  const history = await getProgressHistory(goalId, 100);

  let daysSinceStart = 0;
  if (history.length > 0) {
    const oldest = history[history.length - 1];
    daysSinceStart = Math.round(
      (Date.now() - oldest.recordedAt.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  const velocityPctPerDay = computeVelocity(history);
  const estimatedCompletionDate = estimateCompletion(currentProgressPct, velocityPctPerDay);

  return {
    goalId,
    currentProgressPct,
    currentStatus,
    daysSinceStart,
    velocityPctPerDay,
    estimatedCompletionDate,
    history,
  };
}
