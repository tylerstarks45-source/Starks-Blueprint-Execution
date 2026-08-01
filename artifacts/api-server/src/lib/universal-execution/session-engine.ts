// ─────────────────────────────────────────────────────────────────────────────
// Build 029: Universal Execution Engine — Session Engine
// Creates immutable execution sessions from workflow definitions.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { executionSessions, executionNodes } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { workflowRegistry, workflowNodes } from "@workspace/db/schema";
import type { ExecutionNodeRecord } from "./types";

const logger = { warn: console.warn.bind(console) };

export interface SessionCreateInput {
  businessId: number;
  userId: number;
}

export interface CreatedSession {
  sessionId: string;
  workflowId: string | null;
  isWorkflowReady: boolean;
  nodes: ExecutionNodeRecord[];
}

/**
 * Create an execution session. Looks up the latest workflow for the business,
 * creates the session record, then creates one execution_node row per workflow node.
 * Returns the session id and all node records for the orchestrator to iterate over.
 */
export async function createExecutionSession(input: SessionCreateInput): Promise<CreatedSession | null> {
  const { businessId, userId } = input;

  // ── 1. Look up the workflow registry for this business ──────────────────
  const regRows = await db
    .select()
    .from(workflowRegistry)
    .where(eq(workflowRegistry.businessId, businessId))
    .limit(1);

  const reg = regRows[0];
  if (!reg || !reg.latestWorkflowId) return null;

  // ── 2. Load workflow nodes ordered by sequence position ─────────────────
  const wfNodes = await db
    .select()
    .from(workflowNodes)
    .where(eq(workflowNodes.workflowId, reg.latestWorkflowId))
    .orderBy(workflowNodes.sequencePosition);

  if (wfNodes.length === 0) return null;

  // ── 3. Create the session record ────────────────────────────────────────
  const sessionId = `esess-${randomUUID()}`;
  await db.insert(executionSessions).values({
    id: sessionId,
    businessId,
    userId,
    workflowId: reg.latestWorkflowId,
    isWorkflowReady: reg.isWorkflowReady,
    nodeCount: wfNodes.length,
    startedNodeCount: 0,
    completedNodeCount: 0,
    failedNodeCount: 0,
    rolledBackNodeCount: 0,
    status: "pending",
    durationMs: 0,
    executiveSummary: "",
  });

  // ── 4. Create one execution_node per workflow node ───────────────────────
  const nodeRecords: ExecutionNodeRecord[] = [];
  for (const wn of wfNodes) {
    const nodeId = `enode-${randomUUID()}`;
    const rec: ExecutionNodeRecord = {
      id: nodeId,
      sessionId,
      businessId,
      workflowId: reg.latestWorkflowId,
      workflowNodeId: wn.id,
      nodeTitle: wn.nodeTitle,
      nodeType: wn.nodeType,
      phase: wn.phase,
      executionClass: wn.executionClass,
      ownerType: wn.ownerType,
      sequencePosition: wn.sequencePosition,
      isCritical: wn.isCritical,
      status: "pending",
      checkpointPreValidated: false,
      checkpointPostValidated: false,
      durationMs: 0,
    };
    await db.insert(executionNodes).values({
      id: rec.id,
      sessionId: rec.sessionId,
      businessId: rec.businessId,
      workflowId: rec.workflowId,
      workflowNodeId: rec.workflowNodeId ?? undefined,
      nodeTitle: rec.nodeTitle,
      nodeType: rec.nodeType,
      phase: rec.phase,
      executionClass: rec.executionClass,
      ownerType: rec.ownerType,
      sequencePosition: rec.sequencePosition,
      isCritical: rec.isCritical,
      status: "pending",
      checkpointPreValidated: false,
      checkpointPostValidated: false,
      durationMs: 0,
    });
    nodeRecords.push(rec);
  }

  return { sessionId, workflowId: reg.latestWorkflowId, isWorkflowReady: reg.isWorkflowReady, nodes: nodeRecords };
}

/**
 * Update session status in the DB.
 */
export async function updateSessionStatus(
  sessionId: string,
  patch: {
    status?: string;
    completedNodeCount?: number;
    failedNodeCount?: number;
    rolledBackNodeCount?: number;
    startedNodeCount?: number;
    durationMs?: number;
    executiveSummary?: string;
  }
): Promise<void> {
  try {
    await db
      .update(executionSessions)
      .set(patch)
      .where(eq(executionSessions.id, sessionId));
  } catch (err) {
    logger.warn({ err, sessionId }, "session-engine: updateSessionStatus failed");
  }
}
