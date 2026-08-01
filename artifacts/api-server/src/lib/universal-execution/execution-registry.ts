// ─────────────────────────────────────────────────────────────────────────────
// Build 029: Universal Execution Engine — Execution Registry
// Maintains one row per business with aggregate execution health.
// Upserted at the end of every session.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { executionRegistry, executionSnapshots } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { ExecutionSessionSummary } from "./types";

const logger = { warn: console.warn.bind(console) };

/**
 * Upsert the execution_registry row for this business.
 * Increments cumulative counters and recomputes aggregate success rate.
 */
export async function upsertExecutionRegistry(
  summary: ExecutionSessionSummary,
  userId: number
): Promise<void> {
  try {
    // Fetch existing row
    const rows = await db
      .select()
      .from(executionRegistry)
      .where(eq(executionRegistry.businessId, summary.businessId))
      .limit(1);

    const existing = rows[0];

    if (existing) {
      const totalSessions      = existing.totalSessions + 1;
      const totalNodesExecuted = existing.totalNodesExecuted + summary.nodeCount;
      const totalNodesFailed   = existing.totalNodesFailed + summary.failedNodeCount;
      const totalNodesRolledBack = existing.totalNodesRolledBack + summary.rolledBackNodeCount;
      const successRate        = totalNodesExecuted > 0
        ? ((totalNodesExecuted - totalNodesFailed - totalNodesRolledBack) / totalNodesExecuted)
        : 1.0;

      await db
        .update(executionRegistry)
        .set({
          latestSessionId:      summary.sessionId,
          totalSessions,
          totalNodesExecuted,
          totalNodesFailed,
          totalNodesRolledBack,
          successRate:          String(successRate.toFixed(4)),
          executionHealth:      summary.executionHealth,
          lastExecutionAt:      new Date(),
          updatedAt:            new Date(),
        })
        .where(eq(executionRegistry.businessId, summary.businessId));
    } else {
      await db.insert(executionRegistry).values({
        id:                   `ereg-${randomUUID()}`,
        businessId:           summary.businessId,
        latestSessionId:      summary.sessionId,
        totalSessions:        1,
        totalNodesExecuted:   summary.nodeCount,
        totalNodesFailed:     summary.failedNodeCount,
        totalNodesRolledBack: summary.rolledBackNodeCount,
        successRate:          String(summary.successRate.toFixed(4)),
        executionHealth:      summary.executionHealth,
        lastExecutionAt:      new Date(),
      });
    }
  } catch (err) {
    logger.warn({ err, businessId: summary.businessId }, "execution-registry: upsert failed");
  }
}

/**
 * Persist a JSONB snapshot of the session for point-in-time audit.
 */
export async function persistExecutionSnapshot(
  summary: ExecutionSessionSummary,
  userId: number
): Promise<void> {
  try {
    await db.insert(executionSnapshots).values({
      id:           `esnap-${randomUUID()}`,
      sessionId:    summary.sessionId,
      businessId:   summary.businessId,
      userId,
      snapshotData: summary as unknown as Record<string, unknown>,
    });
  } catch (err) {
    logger.warn({ err, sessionId: summary.sessionId }, "execution-registry: snapshot insert failed");
  }
}

/**
 * Fetch the registry entry for the EB bridge.
 */
export async function fetchExecutionRegistry(
  businessId: number
): Promise<typeof executionRegistry.$inferSelect | null> {
  try {
    const rows = await db
      .select()
      .from(executionRegistry)
      .where(eq(executionRegistry.businessId, businessId))
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}
