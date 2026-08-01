// ─────────────────────────────────────────────────────────────────────────────
// Build 028: Intelligent Workflow Execution Engine — Workflow Phase Engine
// Assigns each node to one of 6 execution phases based on sequence position.
// Phases: preparation → configuration → validation → deployment → verification → completion
// ─────────────────────────────────────────────────────────────────────────────
import type { WorkflowPhase } from "./types";
import { WORKFLOW_PHASES } from "./types";

/**
 * Deterministically assigns a workflow phase based on the node's relative position.
 * START is always "preparation". END is always "completion".
 * All others are distributed across the 6 phases proportionally.
 */
export function assignWorkflowPhase(position: number, total: number): WorkflowPhase {
  if (position === 0) return "preparation";
  if (position >= total - 1) return "completion";

  const midNodeCount = total - 2; // exclude start and end
  const midPos       = position - 1; // 0-indexed among task nodes
  const phaseCount   = WORKFLOW_PHASES.length; // 6

  // Divide mid-nodes across 6 phases evenly
  const phaseIndex = Math.min(
    phaseCount - 1,
    Math.floor((midPos / midNodeCount) * phaseCount)
  );

  return WORKFLOW_PHASES[phaseIndex]!;
}

/**
 * Return human-readable description for a phase.
 */
export const PHASE_DESCRIPTIONS: Record<WorkflowPhase, string> = {
  preparation:   "Initialise context, validate prerequisites, and prepare execution environment.",
  configuration: "Configure execution parameters, credentials, and resource bindings.",
  validation:    "Validate configuration completeness, permissions, and dependency readiness.",
  deployment:    "Execute primary deployment and transformation operations.",
  verification:  "Verify execution outcomes, run post-execution tests, and confirm state changes.",
  completion:    "Finalise execution, emit completion events, and archive execution record.",
};
