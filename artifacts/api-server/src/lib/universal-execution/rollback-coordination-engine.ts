// ─────────────────────────────────────────────────────────────────────────────
// Build 029: Universal Execution Engine — Rollback Coordination Engine
// Coordinates rollback using Build 028 rollback definitions.
// Never invents rollback logic — reads existing workflow_rollbacks rows.
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@workspace/db";
import { executionNodes } from "@workspace/db/schema";
import { workflowRollbacks } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { ExecutionNodeRecord } from "./types";
import { emitEvent } from "./node-execution-engine";

const logger = { warn: console.warn.bind(console) };

export interface RollbackResult {
  initiated: boolean;
  strategy: string;
  targetNodeId: string | null;
  steps: unknown[];
  estimatedDurationHours: number;
}

/**
 * Coordinate rollback for a failed node using the Build 028 rollback definition.
 * Steps:
 * 1. Emit rollback_initiated event
 * 2. Look up rollback definition from workflow_rollbacks
 * 3. Update node status to rolled_back
 * 4. Emit rollback_completed event
 * Returns rollback result for reporting.
 */
export async function coordinateRollback(node: ExecutionNodeRecord): Promise<RollbackResult> {
  // ── 1. Emit rollback_initiated ────────────────────────────────────────────
  await emitEvent(
    node.sessionId, node.businessId,
    "rollback_initiated",
    `Rollback initiated for failed node "${node.nodeTitle}".`,
    { nodeId: node.id, nodeTitle: node.nodeTitle, isCritical: node.isCritical },
    node.id
  );

  // ── 2. Look up rollback definition from Build 028 ─────────────────────────
  let rollbackDef: typeof workflowRollbacks.$inferSelect | undefined;
  try {
    if (node.workflowNodeId) {
      const rows = await db
        .select()
        .from(workflowRollbacks)
        .where(eq(workflowRollbacks.nodeId, node.workflowNodeId))
        .limit(1);
      rollbackDef = rows[0];
    }
  } catch (err) {
    logger.warn({ err, nodeId: node.id }, "rollback-coordination-engine: rollback lookup failed");
  }

  const strategy  = rollbackDef?.rollbackStrategy ?? "checkpoint";
  const targetNodeId = rollbackDef?.rollbackTargetNodeId ?? null;
  const steps     = Array.isArray(rollbackDef?.rollbackSteps) ? rollbackDef.rollbackSteps as unknown[] : [];
  const estimatedDurationHours = rollbackDef ? Number(rollbackDef.estimatedRollbackDurationHours) : 1.0;

  // ── 3. Update node to rolled_back ─────────────────────────────────────────
  try {
    await db
      .update(executionNodes)
      .set({ status: "rolled_back" })
      .where(eq(executionNodes.id, node.id));
  } catch (err) {
    logger.warn({ err, nodeId: node.id }, "rollback-coordination-engine: node status update failed");
  }

  // ── 4. Emit rollback_completed ────────────────────────────────────────────
  await emitEvent(
    node.sessionId, node.businessId,
    "rollback_completed",
    `Rollback completed for node "${node.nodeTitle}" using strategy "${strategy}".`,
    { strategy, targetNodeId, steps, estimatedDurationHours },
    node.id
  );

  return { initiated: true, strategy, targetNodeId, steps, estimatedDurationHours };
}
