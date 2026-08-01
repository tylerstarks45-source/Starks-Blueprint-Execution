// ─────────────────────────────────────────────────────────────────────────────
// Build 028: Intelligent Workflow Execution Engine — Extension Points (8)
// ─────────────────────────────────────────────────────────────────────────────
import { declareExtensionPoint } from "../cognitive-foundation/extension-points";
import {
  EP_WORKFLOW_CONSTRUCTED,
  EP_WORKFLOW_PHASE_ORGANIZED,
  EP_DEPENDENCY_GRAPH_BUILT,
  EP_CHECKPOINT_CREATED,
  EP_CONDITIONAL_ROUTE_DEFINED,
  EP_ROLLBACK_PATH_ASSIGNED,
  EP_WORKFLOW_EVALUATED,
  EP_WORKFLOW_REPORT_GENERATED,
} from "./types";

export function declareWorkflowExecutionExtensionPoints(): void {
  declareExtensionPoint({
    id: EP_WORKFLOW_CONSTRUCTED,
    description: "Fired after an execution workflow graph is constructed from approved execution assignments.",
    declaredBy: "workflow-execution",
  });
  declareExtensionPoint({
    id: EP_WORKFLOW_PHASE_ORGANIZED,
    description: "Fired after workflow nodes are organized into execution phases: preparation → configuration → validation → deployment → verification → completion.",
    declaredBy: "workflow-execution",
  });
  declareExtensionPoint({
    id: EP_DEPENDENCY_GRAPH_BUILT,
    description: "Fired after the directed dependency graph is constructed with sequential, parallel, conditional, rollback, and retry edges.",
    declaredBy: "workflow-execution",
  });
  declareExtensionPoint({
    id: EP_CHECKPOINT_CREATED,
    description: "Fired after a workflow checkpoint is created: expected state, required validation, rollback marker, success criteria.",
    declaredBy: "workflow-execution",
  });
  declareExtensionPoint({
    id: EP_CONDITIONAL_ROUTE_DEFINED,
    description: "Fired after conditional branches are defined for a node: success, failure, retry, escalation, skip, manual approval paths.",
    declaredBy: "workflow-execution",
  });
  declareExtensionPoint({
    id: EP_ROLLBACK_PATH_ASSIGNED,
    description: "Fired after every workflow node receives a deterministic rollback path (immediate, checkpoint, or full strategy).",
    declaredBy: "workflow-execution",
  });
  declareExtensionPoint({
    id: EP_WORKFLOW_EVALUATED,
    description: "Fired after the workflow is evaluated: completeness, reliability, recoverability, complexity, maintainability, confidence.",
    declaredBy: "workflow-execution",
  });
  declareExtensionPoint({
    id: EP_WORKFLOW_REPORT_GENERATED,
    description: "Fired when the complete execution workflow report is assembled and persisted.",
    declaredBy: "workflow-execution",
  });
}
