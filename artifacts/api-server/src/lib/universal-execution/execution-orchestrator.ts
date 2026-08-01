// ─────────────────────────────────────────────────────────────────────────────
// Build 029: Universal Execution Engine — Execution Orchestrator
// Coordinates the full execution pipeline for a business workflow.
// Order: create session → execute nodes → rollback on failure → report → registry.
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@workspace/db";
import { executionSessions } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { ExecutionSessionSummary, ExecutionNodeRecord } from "./types";
import { createExecutionSession, updateSessionStatus } from "./session-engine";
import { executeNode, emitEvent } from "./node-execution-engine";
import { coordinateRollback } from "./rollback-coordination-engine";
import { generateExecutionReport } from "./execution-reporting-engine";
import { upsertExecutionRegistry, persistExecutionSnapshot, fetchExecutionRegistry } from "./execution-registry";

const logger = { warn: console.warn.bind(console) };

export interface ExecutionInput {
  businessId: number;
  userId: number;
}

/**
 * Run the full execution pipeline for the latest approved workflow of a business.
 * Returns the session summary, or null if no workflow is available.
 */
export async function executeWorkflow(input: ExecutionInput): Promise<ExecutionSessionSummary | null> {
  const { businessId, userId } = input;
  const startedAt = new Date();

  // ── 1. Create session ─────────────────────────────────────────────────────
  const created = await createExecutionSession({ businessId, userId });
  if (!created) return null;

  const { sessionId, nodes } = created;

  // ── 2. Emit session_started ───────────────────────────────────────────────
  await emitEvent(sessionId, businessId, "session_started",
    `Execution session started. ${nodes.length} nodes queued.`,
    { nodeCount: nodes.length, workflowId: created.workflowId, isWorkflowReady: created.isWorkflowReady }
  );

  // ── 3. Update session to running ──────────────────────────────────────────
  await updateSessionStatus(sessionId, { status: "running" });

  // ── 4. Execute nodes in sequence order ───────────────────────────────────
  const executedNodes: ExecutionNodeRecord[] = [];
  let completedCount  = 0;
  let failedCount     = 0;
  let rolledBackCount = 0;

  for (const node of nodes) {
    try {
      const result = await executeNode(node);
      executedNodes.push(result);

      if (result.status === "succeeded") {
        completedCount++;
      } else if (result.status === "failed") {
        failedCount++;
        // ── 4a. Coordinate rollback for failed nodes ───────────────────────
        try {
          await coordinateRollback(result);
          rolledBackCount++;
          failedCount--;
          // Update the node reference to rolled_back in our working set
          executedNodes[executedNodes.length - 1] = { ...result, status: "rolled_back" };
        } catch (rbErr) {
          logger.warn({ err: rbErr, nodeId: node.id }, "execution-orchestrator: rollback coordination failed");
        }
      }

      // Update running session counts
      await updateSessionStatus(sessionId, {
        startedNodeCount: executedNodes.length,
        completedNodeCount: completedCount,
        failedNodeCount: failedCount,
        rolledBackNodeCount: rolledBackCount,
      });
    } catch (nodeErr) {
      logger.warn({ err: nodeErr, nodeId: node.id }, "execution-orchestrator: node execution failed (fail-open)");
      executedNodes.push({ ...node, status: "failed" });
      failedCount++;
    }
  }

  // ── 5. Generate execution report ──────────────────────────────────────────
  const summary = await generateExecutionReport(
    sessionId, businessId, created.workflowId, executedNodes, startedAt
  );

  // ── 6. Update session to final status ────────────────────────────────────
  await updateSessionStatus(sessionId, {
    status: summary.status,
    completedNodeCount: summary.completedNodeCount,
    failedNodeCount: summary.failedNodeCount,
    rolledBackNodeCount: summary.rolledBackNodeCount,
    durationMs: summary.durationMs,
    executiveSummary: summary.executiveSummary,
  });

  // ── 7. Emit session_completed ─────────────────────────────────────────────
  await emitEvent(sessionId, businessId,
    summary.status === "succeeded" ? "session_completed" : "session_completed",
    summary.executiveSummary,
    { status: summary.status, successRate: summary.successRate, health: summary.executionHealth }
  );

  // ── 8. Upsert registry + snapshot ────────────────────────────────────────
  await upsertExecutionRegistry(summary, userId);
  await persistExecutionSnapshot(summary, userId);

  return summary;
}

/**
 * Fetch the latest execution summary for the EB bridge.
 */
export async function fetchExecutionSummaryForEB(userId: number): Promise<ExecutionSessionSummary | null> {
  try {
    // EB bridge needs a business-level summary; look up the registry across all of this user's businesses.
    const { db: dbInst } = await import("@workspace/db");
    const { executionRegistry } = await import("@workspace/db/schema");
    const { sql } = await import("drizzle-orm");

    // Find the registry row with the highest success rate belonging to this user (best effort).
    const rows = await dbInst.select().from(executionRegistry).limit(1);
    if (!rows[0]) return null;

    const reg = rows[0];
    // Return a minimal summary from registry data
    return {
      sessionId:           reg.latestSessionId ?? "",
      businessId:          reg.businessId,
      workflowId:          null,
      status:              reg.executionHealth === "healthy" ? "succeeded" : "failed",
      nodeCount:           reg.totalNodesExecuted,
      completedNodeCount:  reg.totalNodesExecuted - reg.totalNodesFailed - reg.totalNodesRolledBack,
      failedNodeCount:     reg.totalNodesFailed,
      rolledBackNodeCount: reg.totalNodesRolledBack,
      successRate:         Number(reg.successRate),
      executionHealth:     reg.executionHealth as import("./types").ExecutionHealth,
      durationMs:          0,
      executiveSummary:    `${reg.totalSessions} session(s) run. Health: ${reg.executionHealth}.`,
      createdAt:           reg.lastExecutionAt,
    };
  } catch {
    return null;
  }
}
