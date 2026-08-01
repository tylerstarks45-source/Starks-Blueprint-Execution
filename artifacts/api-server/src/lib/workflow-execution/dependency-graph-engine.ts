// ─────────────────────────────────────────────────────────────────────────────
// Build 028: Intelligent Workflow Execution Engine — Dependency Graph Engine
// Constructs directed execution graph with sequential, parallel, conditional,
// rollback, and retry edges.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type { WorkflowNode, WorkflowEdge, EdgeType } from "./types";

// Nodes in the same phase that can run in parallel (same execution class)
function canRunInParallel(a: WorkflowNode, b: WorkflowNode): boolean {
  return (
    a.phase === b.phase &&
    a.nodeType === "task" &&
    b.nodeType === "task" &&
    a.executionClass === b.executionClass &&
    a.executionClass === "automated" &&
    !a.isCritical &&
    !b.isCritical
  );
}

export function buildDependencyGraph(
  workflowId: string,
  businessId: number,
  nodes: WorkflowNode[]
): WorkflowEdge[] {
  const edges: WorkflowEdge[] = [];

  const addEdge = (
    fromId: string,
    toId: string,
    type: EdgeType,
    label: string,
    condition = "",
    isCritical = false
  ) => {
    edges.push({ id: randomUUID(), workflowId, businessId, fromNodeId: fromId, toNodeId: toId, edgeType: type, edgeLabel: label, condition, isCritical });
  };

  // Sort by sequence position
  const sorted = [...nodes].sort((a, b) => a.sequencePosition - b.sequencePosition);

  // 1. Sequential backbone — every node links to the next
  for (let i = 0; i < sorted.length - 1; i++) {
    const from = sorted[i]!;
    const to   = sorted[i + 1]!;
    addEdge(from.id, to.id, "sequential", "→", "on_success", from.isCritical || to.isCritical);
  }

  // 2. Parallel branches — for pairs of adjacent automated non-critical tasks in the same phase
  for (let i = 1; i < sorted.length - 2; i++) {
    const a = sorted[i]!;
    const b = sorted[i + 1]!;
    if (canRunInParallel(a, b)) {
      // Fork: previous node → both a and b
      const prev = sorted[i - 1]!;
      addEdge(prev.id, b.id, "parallel", "∥", "can_parallelise", false);
    }
  }

  // 3. Retry edges — task nodes pointing back to themselves (for retry logic)
  for (const node of sorted) {
    if (node.nodeType === "task" && node.executionClass !== "external") {
      addEdge(node.id, node.id, "retry", "↺ retry", "on_transient_failure", false);
    }
  }

  // 4. Conditional edges — gate nodes branch on success/failure
  const gateNodes = sorted.filter((n) => n.nodeType === "gate");
  for (const gate of gateNodes) {
    const idx  = sorted.indexOf(gate);
    const next = sorted[idx + 1];
    if (next) {
      addEdge(gate.id, next.id, "conditional", "✓ pass", "validation_passed", true);
    }
    // Failure → END
    const endNode = sorted.find((n) => n.nodeType === "end");
    if (endNode) {
      addEdge(gate.id, endNode.id, "conditional", "✗ fail → end", "validation_failed", true);
    }
  }

  // 5. Rollback edges — critical nodes point back to previous node
  for (const node of sorted) {
    if (node.isCritical && node.nodeType === "task") {
      const idx  = sorted.indexOf(node);
      const prev = sorted[idx - 1];
      if (prev) {
        addEdge(node.id, prev.id, "rollback", "↩ rollback", "on_critical_failure", true);
      }
    }
  }

  return edges;
}
