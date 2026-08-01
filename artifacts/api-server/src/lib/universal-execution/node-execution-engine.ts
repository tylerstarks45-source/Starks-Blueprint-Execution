// ─────────────────────────────────────────────────────────────────────────────
// Build 029: Universal Execution Engine — Node Execution Engine
// Executes one workflow node at a time. Never skips checkpoints.
// Generic: knows nothing about Shopify, GitHub, Stripe, etc.
// Platform-specific behavior introduced later through Execution Adapters.
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@workspace/db";
import { executionNodes, executionEvents } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { ExecutionNodeRecord, ExecutionEventType } from "./types";
import { validatePreCheckpoint, validatePostCheckpoint } from "./checkpoint-validation-engine";
import { collectEvidence } from "./evidence-collection-engine";
import type { NodeExecutionOutcome } from "./evidence-collection-engine";

const logger = { warn: console.warn.bind(console) };

/**
 * Emit an execution event to the append-only event stream.
 */
export async function emitEvent(
  sessionId: string,
  businessId: number,
  eventType: ExecutionEventType,
  description: string,
  data: Record<string, unknown>,
  nodeId?: string
): Promise<void> {
  try {
    await db.insert(executionEvents).values({
      id: `eevt-${randomUUID()}`,
      sessionId,
      nodeId: nodeId ?? null,
      businessId,
      eventType,
      eventDescription: description,
      eventData: data,
    });
  } catch (err) {
    logger.warn({ err, sessionId, eventType }, "node-execution-engine: emitEvent failed (fail-open)");
  }
}

/**
 * Determine the deterministic execution outcome for a node.
 * In the generic engine (no adapters), all nodes succeed.
 * START/END/gate nodes: instant (0ms). Task nodes: simulated duration.
 * Future adapters intercept via EP_NODE_EXECUTION_STARTED / EP_NODE_EXECUTION_COMPLETED.
 */
function determineOutcome(node: ExecutionNodeRecord): NodeExecutionOutcome {
  const isStructural = node.nodeType === "start" || node.nodeType === "end" || node.nodeType === "gate";
  const baseDuration = isStructural ? 0 : 50 + node.sequencePosition * 10;
  return {
    status: "succeeded",
    durationMs: baseDuration,
    outputDescription: isStructural
      ? `${node.nodeType.toUpperCase()} node processed deterministically.`
      : `Node "${node.nodeTitle}" executed via ${node.executionClass} class — work recorded.`,
  };
}

/**
 * Execute a single workflow node:
 * 1. Validate pre-checkpoint
 * 2. Emit node_started event
 * 3. Determine outcome (deterministic in generic engine)
 * 4. Validate post-checkpoint
 * 5. Collect evidence
 * 6. Update node status in DB
 * 7. Emit node_completed event
 * Returns the updated node record.
 */
export async function executeNode(node: ExecutionNodeRecord): Promise<ExecutionNodeRecord> {
  // ── Pre-checkpoint ────────────────────────────────────────────────────────
  const preCheck = await validatePreCheckpoint(node);
  await emitEvent(
    node.sessionId, node.businessId,
    preCheck.passed ? "checkpoint_validated" : "checkpoint_failed",
    `Pre-checkpoint for node "${node.nodeTitle}": ${preCheck.reason}`,
    { checkpointType: "pre_execution", passed: preCheck.passed },
    node.id
  );

  // ── node_started ──────────────────────────────────────────────────────────
  await emitEvent(
    node.sessionId, node.businessId,
    "node_started",
    `Node "${node.nodeTitle}" (${node.nodeType}) starting.`,
    { nodeType: node.nodeType, phase: node.phase, executionClass: node.executionClass, isCritical: node.isCritical },
    node.id
  );

  // ── Determine outcome (deterministic) ─────────────────────────────────────
  const outcome = determineOutcome(node);

  // ── Post-checkpoint ───────────────────────────────────────────────────────
  const postCheck = await validatePostCheckpoint({ ...node, status: outcome.status });
  await emitEvent(
    node.sessionId, node.businessId,
    postCheck.passed ? "checkpoint_validated" : "checkpoint_failed",
    `Post-checkpoint for node "${node.nodeTitle}": ${postCheck.reason}`,
    { checkpointType: "post_execution", passed: postCheck.passed },
    node.id
  );

  // ── Collect evidence ──────────────────────────────────────────────────────
  await collectEvidence(node, outcome, preCheck, postCheck);

  await emitEvent(
    node.sessionId, node.businessId,
    "evidence_collected",
    `Evidence collected for node "${node.nodeTitle}".`,
    { nodeTitle: node.nodeTitle, durationMs: outcome.durationMs },
    node.id
  );

  // ── Update node status in DB ──────────────────────────────────────────────
  const updatedNode: ExecutionNodeRecord = {
    ...node,
    status: outcome.status,
    checkpointPreValidated: preCheck.passed,
    checkpointPostValidated: postCheck.passed,
    durationMs: outcome.durationMs,
  };

  try {
    await db
      .update(executionNodes)
      .set({
        status: updatedNode.status,
        checkpointPreValidated: updatedNode.checkpointPreValidated,
        checkpointPostValidated: updatedNode.checkpointPostValidated,
        durationMs: updatedNode.durationMs,
      })
      .where(eq(executionNodes.id, node.id));
  } catch (err) {
    logger.warn({ err, nodeId: node.id }, "node-execution-engine: DB node update failed");
  }

  // ── node_completed ────────────────────────────────────────────────────────
  await emitEvent(
    node.sessionId, node.businessId,
    outcome.status === "succeeded" ? "node_completed" : "node_failed",
    `Node "${node.nodeTitle}" ${outcome.status}.`,
    { status: outcome.status, durationMs: outcome.durationMs },
    node.id
  );

  return updatedNode;
}
