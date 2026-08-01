// ─────────────────────────────────────────────────────────────────────────────
// Build 028: Intelligent Workflow Execution Engine — Report Assembly Engine
// Assembles the immutable full workflow record and compact EB summary.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type {
  ExecutionWorkflow, WorkflowSummary, WorkflowNode, WorkflowEdge,
  WorkflowCheckpoint, WorkflowBranch, WorkflowRollback, WorkflowEvaluation, WorkflowPhase
} from "./types";
import { complexityLevel } from "./workflow-evaluation-engine";

interface ReportInput {
  businessId:             number;
  userId:                 number;
  simulationReportId?:    string;
  riskReportId?:          string;
  authorityReportId?:     string;
  orchestrationReportId?: string;
  nodes:                  WorkflowNode[];
  edges:                  WorkflowEdge[];
  checkpoints:            WorkflowCheckpoint[];
  branches:               WorkflowBranch[];
  rollbacks:              WorkflowRollback[];
  evaluation:             WorkflowEvaluation;
  buildDurationMs:        number;
}

function countPhases(nodes: WorkflowNode[]): number {
  const phases = new Set<WorkflowPhase>(nodes.map((n) => n.phase));
  return phases.size;
}

function buildSummary(nodes: WorkflowNode[], evaluation: WorkflowEvaluation, checkpointCount: number): string {
  const taskCount = nodes.filter((n) => n.nodeType === "task").length;
  const conf      = Math.round(evaluation.confidence * 100);
  const ready     = evaluation.completeness >= 0.80 && evaluation.reliability >= 0.70 && evaluation.recoverability >= 0.60;

  return (
    `${nodes.length} workflow node(s) (${taskCount} tasks) across ${countPhases(nodes)} phases. ` +
    `${checkpointCount} checkpoints. Confidence: ${conf}%. ` +
    `Workflow ${ready ? "READY for execution" : "NOT YET READY — review evaluation scores"}.`
  );
}

export function assembleWorkflowReport(input: ReportInput): ExecutionWorkflow {
  const {
    businessId, userId, simulationReportId, riskReportId,
    authorityReportId, orchestrationReportId,
    nodes, edges, checkpoints, branches, rollbacks, evaluation, buildDurationMs
  } = input;

  const taskNodes        = nodes.filter((n) => n.nodeType === "task");
  const rollbackCoverage = taskNodes.length > 0
    ? Math.round((rollbacks.length / taskNodes.length) * 1000) / 1000
    : 0;

  const isWorkflowReady =
    evaluation.completeness >= 0.80 &&
    evaluation.reliability  >= 0.70 &&
    evaluation.recoverability >= 0.60;

  return {
    id:                    randomUUID(),
    businessId,
    userId,
    simulationReportId,
    riskReportId,
    authorityReportId,
    orchestrationReportId,
    nodes,
    edges,
    checkpoints,
    branches,
    rollbacks,
    evaluation,
    nodeCount:             nodes.length,
    edgeCount:             edges.length,
    checkpointCount:       checkpoints.length,
    branchCount:           branches.length,
    rollbackCount:         rollbacks.length,
    phaseCount:            countPhases(nodes),
    workflowComplexity:    complexityLevel(evaluation.complexity),
    rollbackCoverage,
    workflowConfidence:    evaluation.confidence,
    isWorkflowReady,
    executiveSummary:      buildSummary(nodes, evaluation, checkpoints.length),
    buildDurationMs,
    createdAt:             new Date(),
  };
}

export function buildWorkflowSummary(wf: ExecutionWorkflow): WorkflowSummary {
  return {
    workflowId:         wf.id,
    businessId:         wf.businessId,
    nodeCount:          wf.nodeCount,
    edgeCount:          wf.edgeCount,
    checkpointCount:    wf.checkpointCount,
    phaseCount:         wf.phaseCount,
    workflowComplexity: wf.workflowComplexity,
    rollbackCoverage:   wf.rollbackCoverage,
    workflowConfidence: wf.workflowConfidence,
    isWorkflowReady:    wf.isWorkflowReady,
    executiveSummary:   wf.executiveSummary,
    createdAt:          wf.createdAt,
  };
}
