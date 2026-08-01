// ─────────────────────────────────────────────────────────────────────────────
// Build 028: Intelligent Workflow Execution Engine — Checkpoint Engine
// Every task node receives pre_execution + post_execution checkpoints.
// Gate nodes receive validation_gate.
// Phase-boundary nodes receive rollback_marker.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type { WorkflowNode, WorkflowCheckpoint, CheckpointType, WorkflowPhase } from "./types";

const PHASE_SEQUENCE: WorkflowPhase[] = [
  "preparation", "configuration", "validation",
  "deployment", "verification", "completion",
];

function isPhaseTransition(node: WorkflowNode, nodes: WorkflowNode[]): boolean {
  const sorted = [...nodes].sort((a, b) => a.sequencePosition - b.sequencePosition);
  const idx    = sorted.indexOf(node);
  if (idx <= 0) return false;
  const prev = sorted[idx - 1]!;
  return prev.phase !== node.phase;
}

function buildCheckpoint(
  workflowId: string,
  nodeId: string,
  businessId: number,
  type: CheckpointType,
  node: WorkflowNode
): WorkflowCheckpoint {
  const typeDescriptions: Record<CheckpointType, {
    expectedState: string;
    requiredValidation: string;
    rollbackMarker: string;
    successCriteria: string;
    isBlocking: boolean;
  }> = {
    pre_execution: {
      expectedState:      `All prerequisites for '${node.nodeTitle}' are met and context is initialised.`,
      requiredValidation: `Verify owner '${node.ownerType}' has active credentials and execution class '${node.executionClass}' is available.`,
      rollbackMarker:     `pre_exec_${node.id.slice(0, 8)}`,
      successCriteria:    `Context loaded, permissions confirmed, dependencies healthy.`,
      isBlocking:         true,
    },
    post_execution: {
      expectedState:      `'${node.nodeTitle}' has completed with all output artefacts in expected state.`,
      requiredValidation: `Verify output artefacts exist, state transitions recorded, no error conditions raised.`,
      rollbackMarker:     `post_exec_${node.id.slice(0, 8)}`,
      successCriteria:    `Output verified, downstream dependencies unblocked, execution record archived.`,
      isBlocking:         node.isCritical,
    },
    validation_gate: {
      expectedState:      `All validations for phase '${node.phase}' are complete and passing.`,
      requiredValidation: `Run full validation suite for phase '${node.phase}'.`,
      rollbackMarker:     `gate_${node.id.slice(0, 8)}`,
      successCriteria:    `Zero validation failures. Proceed to next phase.`,
      isBlocking:         true,
    },
    rollback_marker: {
      expectedState:      `Stable state captured before phase transition to '${node.phase}'.`,
      requiredValidation: `Confirm all prior phase outputs are persisted and recoverable.`,
      rollbackMarker:     `phase_boundary_${node.phase}_${node.id.slice(0, 8)}`,
      successCriteria:    `Rollback marker written. Phase transition safe to proceed.`,
      isBlocking:         false,
    },
  };

  const cfg = typeDescriptions[type];
  return {
    id: randomUUID(),
    workflowId,
    nodeId,
    businessId,
    checkpointType:     type,
    expectedState:      cfg.expectedState,
    requiredValidation: cfg.requiredValidation,
    rollbackMarker:     cfg.rollbackMarker,
    successCriteria:    cfg.successCriteria,
    isBlocking:         cfg.isBlocking,
  };
}

export function createCheckpoints(
  workflowId: string,
  businessId: number,
  nodes: WorkflowNode[]
): WorkflowCheckpoint[] {
  const checkpoints: WorkflowCheckpoint[] = [];

  for (const node of nodes) {
    if (node.nodeType === "task") {
      checkpoints.push(buildCheckpoint(workflowId, node.id, businessId, "pre_execution",  node));
      checkpoints.push(buildCheckpoint(workflowId, node.id, businessId, "post_execution", node));
    }
    if (node.nodeType === "gate") {
      checkpoints.push(buildCheckpoint(workflowId, node.id, businessId, "validation_gate", node));
    }
    if (isPhaseTransition(node, nodes)) {
      checkpoints.push(buildCheckpoint(workflowId, node.id, businessId, "rollback_marker", node));
    }
  }

  return checkpoints;
}
