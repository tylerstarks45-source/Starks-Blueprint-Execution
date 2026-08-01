// ─────────────────────────────────────────────────────────────────────────────
// Build 028: Intelligent Workflow Execution Engine — Rollback Path Engine
// Every workflow node receives a deterministic rollback path.
// Rollback is part of the workflow, never an afterthought.
// Strategy: immediate (simple/automated), checkpoint (moderate), full (complex/external).
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type { WorkflowNode, WorkflowRollback, RollbackStrategy } from "./types";

const CLASS_ROLLBACK_STRATEGY: Record<string, RollbackStrategy> = {
  automated: "checkpoint",
  ai_driven: "checkpoint",
  human:     "immediate",
  external:  "full",
  hybrid:    "checkpoint",
};

const CLASS_ROLLBACK_CONFIDENCE: Record<string, number> = {
  automated: 0.85, ai_driven: 0.70, human: 0.80, external: 0.40, hybrid: 0.72,
};

const STRATEGY_DURATION: Record<RollbackStrategy, number> = {
  immediate:  0.25,
  checkpoint: 1.0,
  full:       4.0,
};

function buildRollbackSteps(
  node: WorkflowNode,
  strategy: RollbackStrategy,
  targetTitle?: string
): string[] {
  const base = [
    `1. Stop execution of '${node.nodeTitle}'`,
    `2. Emit rollback event for '${node.nodeTitle}'`,
  ];

  if (strategy === "immediate") {
    base.push(`3. Revert in-process changes immediately`);
    base.push(`4. Restore previous node state`);
    base.push(`5. Confirm '${targetTitle ?? "previous step"}' is in healthy state`);
  } else if (strategy === "checkpoint") {
    base.push(`3. Load rollback checkpoint for '${node.nodeTitle}'`);
    base.push(`4. Restore state to checkpoint snapshot`);
    base.push(`5. Re-validate '${node.nodeTitle}' prerequisites`);
    base.push(`6. Confirm recovery with post-rollback health check`);
  } else {
    // full
    base.push(`3. Initiate full workflow rollback sequence`);
    base.push(`4. Reverse all committed state changes in reverse order`);
    base.push(`5. Restore each node to pre-execution state`);
    base.push(`6. Validate full workflow state is consistent`);
    base.push(`7. File incident report`);
    base.push(`8. Notify responsible owner '${node.ownerType}'`);
  }

  return base;
}

function findPrevNode(node: WorkflowNode, nodes: WorkflowNode[]): WorkflowNode | undefined {
  return nodes
    .filter((n) => n.sequencePosition < node.sequencePosition)
    .sort((a, b) => b.sequencePosition - a.sequencePosition)[0];
}

export function assignRollbackPaths(
  workflowId: string,
  businessId: number,
  nodes: WorkflowNode[]
): WorkflowRollback[] {
  return nodes
    .filter((n) => n.nodeType !== "start" && n.nodeType !== "end")
    .map((node) => {
      const strategy   = CLASS_ROLLBACK_STRATEGY[node.executionClass] ?? "checkpoint";
      const confidence = CLASS_ROLLBACK_CONFIDENCE[node.executionClass] ?? 0.70;
      const prevNode   = findPrevNode(node, nodes);
      const duration   = STRATEGY_DURATION[strategy];

      return {
        id:                             randomUUID(),
        workflowId,
        nodeId:                         node.id,
        businessId,
        rollbackTargetNodeId:           prevNode?.id,
        rollbackStrategy:               strategy,
        rollbackSteps:                  buildRollbackSteps(node, strategy, prevNode?.nodeTitle),
        estimatedRollbackDurationHours: duration,
        rollbackConfidence:             Math.round(confidence * 1000) / 1000,
      };
    });
}
