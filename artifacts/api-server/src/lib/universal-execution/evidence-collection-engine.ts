// ─────────────────────────────────────────────────────────────────────────────
// Build 029: Universal Execution Engine — Evidence Collection Engine
// Captures inputs, outputs, logs, errors, validation results, execution metadata.
// Every executed node MUST generate immutable evidence.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { executionEvidence } from "@workspace/db/schema";
import type { ExecutionNodeRecord, EvidenceType } from "./types";
import type { CheckpointValidationResult } from "./checkpoint-validation-engine";

const logger = { warn: console.warn.bind(console) };

export interface NodeExecutionOutcome {
  status: "succeeded" | "failed";
  durationMs: number;
  outputDescription: string;
  errorMessage?: string;
}

/**
 * Collect all 6 evidence types for a completed node.
 * Writes one row per evidence type to execution_evidence.
 * Fail-open: evidence errors never block the execution path.
 */
export async function collectEvidence(
  node: ExecutionNodeRecord,
  outcome: NodeExecutionOutcome,
  preCheckpoint: CheckpointValidationResult,
  postCheckpoint: CheckpointValidationResult
): Promise<void> {
  const evidenceBatch: Array<{ type: EvidenceType; data: Record<string, unknown>; isError: boolean }> = [
    {
      type: "inputs",
      data: {
        workflowNodeId: node.workflowNodeId,
        nodeTitle: node.nodeTitle,
        phase: node.phase,
        executionClass: node.executionClass,
        ownerType: node.ownerType,
        isCritical: node.isCritical,
        sequencePosition: node.sequencePosition,
      },
      isError: false,
    },
    {
      type: "outputs",
      data: {
        status: outcome.status,
        outputDescription: outcome.outputDescription,
        durationMs: outcome.durationMs,
      },
      isError: false,
    },
    {
      type: "logs",
      data: {
        log: `Node ${node.nodeTitle} (${node.nodeType}) executed in ${outcome.durationMs}ms — ${outcome.status.toUpperCase()}`,
        phase: node.phase,
        executionClass: node.executionClass,
      },
      isError: false,
    },
    {
      type: "errors",
      data: {
        hasError: !!outcome.errorMessage,
        errorMessage: outcome.errorMessage ?? null,
      },
      isError: !!outcome.errorMessage,
    },
    {
      type: "validation_results",
      data: {
        preCheckpoint: { passed: preCheckpoint.passed, reason: preCheckpoint.reason },
        postCheckpoint: { passed: postCheckpoint.passed, reason: postCheckpoint.reason },
      },
      isError: !preCheckpoint.passed || !postCheckpoint.passed,
    },
    {
      type: "execution_metadata",
      data: {
        nodeId: node.id,
        sessionId: node.sessionId,
        businessId: node.businessId,
        workflowId: node.workflowId,
        nodeType: node.nodeType,
        isCritical: node.isCritical,
        checkpointPreValidated: preCheckpoint.passed,
        checkpointPostValidated: postCheckpoint.passed,
        collectedAt: new Date().toISOString(),
      },
      isError: false,
    },
  ];

  for (const ev of evidenceBatch) {
    try {
      await db.insert(executionEvidence).values({
        id: `eevid-${randomUUID()}`,
        sessionId: node.sessionId,
        nodeId: node.id,
        businessId: node.businessId,
        evidenceType: ev.type,
        evidenceData: ev.data,
        isError: ev.isError,
      });
    } catch (err) {
      logger.warn({ err, nodeId: node.id, evidenceType: ev.type }, "evidence-collection-engine: insert failed (fail-open)");
    }
  }
}
