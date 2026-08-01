// ─────────────────────────────────────────────────────────────────────────────
// Build 028: Intelligent Workflow Execution Engine — Types (self-contained)
// ─────────────────────────────────────────────────────────────────────────────

// ── Extension Point IDs ───────────────────────────────────────────────────────
export const EP_WORKFLOW_CONSTRUCTED      = "workflow-execution.workflow-constructed";
export const EP_WORKFLOW_PHASE_ORGANIZED  = "workflow-execution.workflow-phase-organized";
export const EP_DEPENDENCY_GRAPH_BUILT    = "workflow-execution.dependency-graph-built";
export const EP_CHECKPOINT_CREATED       = "workflow-execution.checkpoint-created";
export const EP_CONDITIONAL_ROUTE_DEFINED = "workflow-execution.conditional-route-defined";
export const EP_ROLLBACK_PATH_ASSIGNED    = "workflow-execution.rollback-path-assigned";
export const EP_WORKFLOW_EVALUATED       = "workflow-execution.workflow-evaluated";
export const EP_WORKFLOW_REPORT_GENERATED = "workflow-execution.workflow-report-generated";

// ── Workflow Phase ────────────────────────────────────────────────────────────
export type WorkflowPhase =
  | "preparation"
  | "configuration"
  | "validation"
  | "deployment"
  | "verification"
  | "completion";

export const WORKFLOW_PHASES: WorkflowPhase[] = [
  "preparation", "configuration", "validation",
  "deployment", "verification", "completion",
];

// ── Node Types ────────────────────────────────────────────────────────────────
export type NodeType = "task" | "gate" | "checkpoint" | "merge" | "fork" | "start" | "end";

// ── Edge Types ────────────────────────────────────────────────────────────────
export type EdgeType = "sequential" | "parallel" | "conditional" | "rollback" | "retry";

// ── Checkpoint Types ──────────────────────────────────────────────────────────
export type CheckpointType =
  | "pre_execution"
  | "post_execution"
  | "validation_gate"
  | "rollback_marker";

// ── Branch Conditions ─────────────────────────────────────────────────────────
export type BranchCondition =
  | "success"
  | "failure"
  | "retry"
  | "escalation"
  | "skip"
  | "manual_approval";

// ── Rollback Strategies ───────────────────────────────────────────────────────
export type RollbackStrategy = "immediate" | "checkpoint" | "full";

// ── Workflow Complexity ───────────────────────────────────────────────────────
export type WorkflowComplexity = "simple" | "moderate" | "complex" | "very_complex";

// ── Workflow Node ─────────────────────────────────────────────────────────────
export interface WorkflowNode {
  id:                     string;
  workflowId:             string;
  businessId:             number;
  assignmentId?:          string;
  workPackageId?:         string;
  packageTitle?:          string;
  phase:                  WorkflowPhase;
  nodeType:               NodeType;
  nodeTitle:              string;
  nodeDescription:        string;
  sequencePosition:       number;
  ownerType:              string;
  executionClass:         string;
  estimatedDurationHours: number;
  isCritical:             boolean;
  status:                 string;
}

// ── Workflow Edge ─────────────────────────────────────────────────────────────
export interface WorkflowEdge {
  id:         string;
  workflowId: string;
  businessId: number;
  fromNodeId: string;
  toNodeId:   string;
  edgeType:   EdgeType;
  edgeLabel:  string;
  condition:  string;
  isCritical: boolean;
}

// ── Workflow Checkpoint ───────────────────────────────────────────────────────
export interface WorkflowCheckpoint {
  id:                 string;
  workflowId:         string;
  nodeId:             string;
  businessId:         number;
  checkpointType:     CheckpointType;
  expectedState:      string;
  requiredValidation: string;
  rollbackMarker:     string;
  successCriteria:    string;
  isBlocking:         boolean;
}

// ── Workflow Branch ───────────────────────────────────────────────────────────
export interface WorkflowBranch {
  id:                string;
  workflowId:        string;
  nodeId:            string;
  businessId:        number;
  branchCondition:   BranchCondition;
  targetNodeId?:     string;
  branchDescription: string;
  priority:          number;
  isDefaultPath:     boolean;
}

// ── Workflow Rollback ─────────────────────────────────────────────────────────
export interface WorkflowRollback {
  id:                             string;
  workflowId:                     string;
  nodeId:                         string;
  businessId:                     number;
  rollbackTargetNodeId?:          string;
  rollbackStrategy:               RollbackStrategy;
  rollbackSteps:                  string[];
  estimatedRollbackDurationHours: number;
  rollbackConfidence:             number;
}

// ── Workflow Evaluation ───────────────────────────────────────────────────────
export interface WorkflowEvaluation {
  completeness:    number; // 0-1
  reliability:     number;
  recoverability:  number;
  complexity:      number; // 0-1 (higher = more complex)
  maintainability: number;
  confidence:      number;
  overallScore:    number;
  narrative:       string;
}

// ── Full Workflow Record ──────────────────────────────────────────────────────
export interface ExecutionWorkflow {
  id:                    string;
  businessId:            number;
  userId:                number;
  simulationReportId?:   string;
  riskReportId?:         string;
  authorityReportId?:    string;
  orchestrationReportId?: string;
  nodes:                 WorkflowNode[];
  edges:                 WorkflowEdge[];
  checkpoints:           WorkflowCheckpoint[];
  branches:              WorkflowBranch[];
  rollbacks:             WorkflowRollback[];
  evaluation:            WorkflowEvaluation;
  nodeCount:             number;
  edgeCount:             number;
  checkpointCount:       number;
  branchCount:           number;
  rollbackCount:         number;
  phaseCount:            number;
  workflowComplexity:    WorkflowComplexity;
  rollbackCoverage:      number;
  workflowConfidence:    number;
  isWorkflowReady:       boolean;
  executiveSummary:      string;
  buildDurationMs:       number;
  createdAt:             Date;
}

// ── EB Summary ────────────────────────────────────────────────────────────────
export interface WorkflowSummary {
  workflowId:         string;
  businessId:         number;
  nodeCount:          number;
  edgeCount:          number;
  checkpointCount:    number;
  phaseCount:         number;
  workflowComplexity: WorkflowComplexity;
  rollbackCoverage:   number;
  workflowConfidence: number;
  isWorkflowReady:    boolean;
  executiveSummary:   string;
  createdAt:          Date;
}
