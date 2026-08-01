// ─────────────────────────────────────────────────────────────────────────────
// Build 028: Intelligent Workflow Execution Engine — Workflow Evaluation Engine
// Scores: completeness, reliability, recoverability, complexity,
// maintainability, confidence.
// ─────────────────────────────────────────────────────────────────────────────
import type {
  WorkflowNode, WorkflowEdge, WorkflowCheckpoint,
  WorkflowBranch, WorkflowRollback, WorkflowComplexity, WorkflowEvaluation
} from "./types";

interface EvaluationInput {
  nodes:       WorkflowNode[];
  edges:       WorkflowEdge[];
  checkpoints: WorkflowCheckpoint[];
  branches:    WorkflowBranch[];
  rollbacks:   WorkflowRollback[];
}

function scoreCompleteness(input: EvaluationInput): number {
  const taskNodes     = input.nodes.filter((n) => n.nodeType === "task");
  const hasStart      = input.nodes.some((n) => n.nodeType === "start");
  const hasEnd        = input.nodes.some((n) => n.nodeType === "end");
  const hasEdges      = input.edges.length > 0;
  const hasBranches   = input.branches.length > 0;
  const hasCheckpoints = input.checkpoints.length >= taskNodes.length;

  const parts = [hasStart, hasEnd, hasEdges, hasBranches, hasCheckpoints, taskNodes.length > 0];
  return Math.round((parts.filter(Boolean).length / parts.length) * 1000) / 1000;
}

function scoreReliability(input: EvaluationInput): number {
  const taskNodes   = input.nodes.filter((n) => n.nodeType === "task");
  if (!taskNodes.length) return 0;

  // How many tasks have both pre + post checkpoints
  const fullyCovered = taskNodes.filter((n) => {
    const cps = input.checkpoints.filter((c) => c.nodeId === n.id);
    return cps.some((c) => c.checkpointType === "pre_execution") &&
           cps.some((c) => c.checkpointType === "post_execution");
  });
  return Math.round((fullyCovered.length / taskNodes.length) * 1000) / 1000;
}

function scoreRecoverability(input: EvaluationInput): number {
  const taskNodes      = input.nodes.filter((n) => n.nodeType === "task");
  if (!taskNodes.length) return 0;

  const withRollback  = taskNodes.filter((n) => input.rollbacks.some((r) => r.nodeId === n.id));
  const avgConfidence = withRollback.reduce((acc, n) => {
    const rb = input.rollbacks.find((r) => r.nodeId === n.id)!;
    return acc + rb.rollbackConfidence;
  }, 0) / (withRollback.length || 1);

  const coverage = withRollback.length / taskNodes.length;
  return Math.round(((coverage * 0.6) + (avgConfidence * 0.4)) * 1000) / 1000;
}

function scoreComplexity(input: EvaluationInput): number {
  // Higher score = more complex (inverse of "simple")
  const nodeCount = input.nodes.length;
  const edgeRatio = input.edges.length / Math.max(1, nodeCount);
  const branchRatio = input.branches.length / Math.max(1, nodeCount);

  const raw = Math.min(1, (nodeCount / 20) * 0.4 + (edgeRatio / 3) * 0.3 + (branchRatio / 4) * 0.3);
  return Math.round(raw * 1000) / 1000;
}

function scoreMaintainability(input: EvaluationInput): number {
  // Higher = easier to maintain: fewer critical nodes, more checkpoints, fewer external class nodes
  const taskNodes    = input.nodes.filter((n) => n.nodeType === "task");
  const criticalRatio = taskNodes.filter((n) => n.isCritical).length / Math.max(1, taskNodes.length);
  const externalRatio = taskNodes.filter((n) => n.executionClass === "external").length / Math.max(1, taskNodes.length);

  const raw = Math.max(0, 1 - criticalRatio * 0.4 - externalRatio * 0.3);
  return Math.round(raw * 1000) / 1000;
}

function complexityLevel(score: number): WorkflowComplexity {
  if (score < 0.25) return "simple";
  if (score < 0.50) return "moderate";
  if (score < 0.75) return "complex";
  return "very_complex";
}

export function evaluateWorkflow(input: EvaluationInput): WorkflowEvaluation {
  const completeness    = scoreCompleteness(input);
  const reliability     = scoreReliability(input);
  const recoverability  = scoreRecoverability(input);
  const complexity      = scoreComplexity(input);
  const maintainability = scoreMaintainability(input);

  // Confidence = weighted composite (completeness 30% + reliability 25% + recoverability 25% + (1-complexity)*10% + maintainability*10%)
  const confidence = Math.round((
    completeness * 0.30 +
    reliability * 0.25 +
    recoverability * 0.25 +
    (1 - complexity) * 0.10 +
    maintainability * 0.10
  ) * 1000) / 1000;

  const overallScore = Math.round((
    (completeness + reliability + recoverability + (1 - complexity) + maintainability) / 5
  ) * 1000) / 1000;

  const cl = complexityLevel(complexity);
  const ready = completeness >= 0.80 && reliability >= 0.70 && recoverability >= 0.60;

  const narrative =
    `Workflow evaluated: ${ready ? "READY" : "INCOMPLETE"}. ` +
    `Completeness: ${Math.round(completeness * 100)}%, ` +
    `reliability: ${Math.round(reliability * 100)}%, ` +
    `recoverability: ${Math.round(recoverability * 100)}%, ` +
    `complexity: ${cl} (${Math.round(complexity * 100)}%), ` +
    `maintainability: ${Math.round(maintainability * 100)}%. ` +
    `Confidence: ${Math.round(confidence * 100)}%.`;

  return { completeness, reliability, recoverability, complexity, maintainability, confidence, overallScore, narrative };
}

export { complexityLevel };
