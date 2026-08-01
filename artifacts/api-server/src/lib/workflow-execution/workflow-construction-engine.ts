// ─────────────────────────────────────────────────────────────────────────────
// Build 028: Intelligent Workflow Execution Engine — Workflow Construction Engine
// Transforms execution assignments into workflow nodes.
// Adds START node at position 0 and END node at final position.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type { WorkflowNode, WorkflowPhase, NodeType } from "./types";
import { assignWorkflowPhase } from "./workflow-phase-engine";

interface AssignmentInput {
  id:                  string;
  workPackageId?:      string;
  packageTitle?:       string;
  ownerType:           string;
  executionClass:      string;
  complexityLevel?:    string;
  businessCriticality?: string;
  sequencePosition?:   number;
  estimatedDurationHours?: number;
}

const CRITICALITY_FLAGS: Record<string, boolean> = {
  low: false, medium: false, high: true, critical: true,
};

function nodeTypeForClass(executionClass: string, position: number, total: number): NodeType {
  if (position === 0) return "start";
  if (position === total - 1) return "end";
  // Insert validation gates at phase boundaries (every 3rd node after start)
  if (position % 3 === 0 && executionClass === "automated") return "gate";
  return "task";
}

export function constructWorkflowNodes(
  workflowId: string,
  businessId: number,
  assignments: AssignmentInput[]
): WorkflowNode[] {
  const total = assignments.length + 2; // +2 for START and END

  const nodes: WorkflowNode[] = [];

  // START node
  nodes.push({
    id:                     randomUUID(),
    workflowId,
    businessId,
    phase:                  "preparation",
    nodeType:               "start",
    nodeTitle:              "Workflow Start",
    nodeDescription:        "Entry point for execution workflow. Validates prerequisites and initialises context.",
    sequencePosition:       0,
    ownerType:              "automation",
    executionClass:         "automated",
    estimatedDurationHours: 0.1,
    isCritical:             true,
    status:                 "pending",
  });

  // Task nodes per assignment
  assignments.forEach((asgn, idx) => {
    const position = idx + 1;
    const phase    = assignWorkflowPhase(position, total);
    const nodeType = nodeTypeForClass(asgn.executionClass, position, total);
    const isCritical = CRITICALITY_FLAGS[asgn.businessCriticality ?? "medium"] ?? false;

    nodes.push({
      id:                     randomUUID(),
      workflowId,
      businessId,
      assignmentId:           asgn.id,
      workPackageId:          asgn.workPackageId,
      packageTitle:           asgn.packageTitle,
      phase,
      nodeType,
      nodeTitle:              asgn.packageTitle ?? `Task ${position}`,
      nodeDescription:        `Execute ${asgn.packageTitle ?? `assignment ${position}`} via ${asgn.executionClass} class owned by ${asgn.ownerType}.`,
      sequencePosition:       position,
      ownerType:              asgn.ownerType,
      executionClass:         asgn.executionClass,
      estimatedDurationHours: asgn.estimatedDurationHours ?? 1.0,
      isCritical,
      status:                 "pending",
    });
  });

  // END node
  nodes.push({
    id:                     randomUUID(),
    workflowId,
    businessId,
    phase:                  "completion",
    nodeType:               "end",
    nodeTitle:              "Workflow Complete",
    nodeDescription:        "All execution tasks complete. Post-execution validation and cleanup performed.",
    sequencePosition:       total - 1,
    ownerType:              "automation",
    executionClass:         "automated",
    estimatedDurationHours: 0.1,
    isCritical:             true,
    status:                 "pending",
  });

  return nodes;
}
