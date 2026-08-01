// ─────────────────────────────────────────────────────────────────────────────
// Build 028: Intelligent Workflow Execution Engine — Conditional Routing Engine
// Defines deterministic branches per node:
// success → next, failure → rollback, retry → self, escalation → gate,
// skip (optional, non-critical only), manual_approval (critical nodes).
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type { WorkflowNode, WorkflowBranch, BranchCondition } from "./types";

function findNext(node: WorkflowNode, nodes: WorkflowNode[]): WorkflowNode | undefined {
  return nodes
    .filter((n) => n.sequencePosition > node.sequencePosition)
    .sort((a, b) => a.sequencePosition - b.sequencePosition)[0];
}

function findPrev(node: WorkflowNode, nodes: WorkflowNode[]): WorkflowNode | undefined {
  return nodes
    .filter((n) => n.sequencePosition < node.sequencePosition)
    .sort((a, b) => b.sequencePosition - a.sequencePosition)[0];
}

function findEnd(nodes: WorkflowNode[]): WorkflowNode | undefined {
  return nodes.find((n) => n.nodeType === "end");
}

function findGate(node: WorkflowNode, nodes: WorkflowNode[]): WorkflowNode | undefined {
  return nodes.find(
    (n) => n.nodeType === "gate" && n.sequencePosition > node.sequencePosition
  );
}

function makeBranch(
  workflowId: string,
  businessId: number,
  nodeId: string,
  condition: BranchCondition,
  targetNodeId: string | undefined,
  description: string,
  priority: number,
  isDefault = false
): WorkflowBranch {
  return {
    id:                randomUUID(),
    workflowId,
    nodeId,
    businessId,
    branchCondition:   condition,
    targetNodeId,
    branchDescription: description,
    priority,
    isDefaultPath:     isDefault,
  };
}

export function defineConditionalRoutes(
  workflowId: string,
  businessId: number,
  nodes: WorkflowNode[]
): WorkflowBranch[] {
  const branches: WorkflowBranch[] = [];

  for (const node of nodes) {
    if (node.nodeType === "start" || node.nodeType === "end") continue;

    const nextNode  = findNext(node, nodes);
    const prevNode  = findPrev(node, nodes);
    const endNode   = findEnd(nodes);
    const gateNode  = findGate(node, nodes);

    // 1. Success → next node (default path)
    branches.push(makeBranch(workflowId, businessId, node.id, "success",
      nextNode?.id, `On success, proceed to '${nextNode?.nodeTitle ?? "end"}'.`, 0, true));

    // 2. Failure → rollback to previous node (or end for unrecoverable)
    const failTarget = node.isCritical ? endNode?.id : prevNode?.id;
    branches.push(makeBranch(workflowId, businessId, node.id, "failure",
      failTarget, `On failure, ${node.isCritical ? "abort workflow and reach end node" : `rollback to '${prevNode?.nodeTitle ?? "start"}'`}.`, 10));

    // 3. Retry → self (for non-external, non-critical nodes)
    if (node.executionClass !== "external") {
      branches.push(makeBranch(workflowId, businessId, node.id, "retry",
        node.id, `On transient failure, retry '${node.nodeTitle}' (max 3 attempts).`, 5));
    }

    // 4. Escalation → next validation gate (or end if none)
    const escalationTarget = gateNode?.id ?? endNode?.id;
    branches.push(makeBranch(workflowId, businessId, node.id, "escalation",
      escalationTarget, `On unresolvable issue, escalate to validation gate '${gateNode?.nodeTitle ?? "end"}'.`, 20));

    // 5. Skip (non-critical, non-gate, non-start/end only)
    if (!node.isCritical && node.nodeType === "task") {
      branches.push(makeBranch(workflowId, businessId, node.id, "skip",
        nextNode?.id, `If prerequisites not met, skip '${node.nodeTitle}' and continue.`, 30));
    }

    // 6. Manual approval (critical nodes only)
    if (node.isCritical) {
      branches.push(makeBranch(workflowId, businessId, node.id, "manual_approval",
        node.id, `'${node.nodeTitle}' requires explicit human approval before proceeding.`, 1));
    }
  }

  return branches;
}
