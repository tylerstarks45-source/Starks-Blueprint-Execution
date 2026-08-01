// ─────────────────────────────────────────────────────────────────────────────
// Build 029: Universal Execution Engine — State Engine
// Manages the 9-state machine for sessions and nodes.
// Provides deterministic transition validation.
// ─────────────────────────────────────────────────────────────────────────────
import type { ExecutionState } from "./types";

// Allowed forward transitions
const ALLOWED: Record<ExecutionState, ExecutionState[]> = {
  pending:      ["ready", "cancelled"],
  ready:        ["running", "cancelled"],
  running:      ["waiting", "paused", "succeeded", "failed", "cancelled"],
  waiting:      ["running", "paused", "cancelled"],
  paused:       ["running", "cancelled"],
  succeeded:    [],
  failed:       ["rolled_back", "cancelled"],
  rolled_back:  [],
  cancelled:    [],
};

/**
 * Returns true if transitioning from `from` to `to` is a valid state machine step.
 */
export function canTransition(from: ExecutionState, to: ExecutionState): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

/**
 * Determine terminal states.
 */
export function isTerminal(state: ExecutionState): boolean {
  return state === "succeeded" || state === "failed" || state === "rolled_back" || state === "cancelled";
}

/**
 * Compute overall session health from node outcomes.
 */
export function computeSessionHealth(
  nodeCount: number,
  completedCount: number,
  failedCount: number,
  rolledBackCount: number
): import("./types").ExecutionHealth {
  if (nodeCount === 0) return "unknown";
  const failureRatio = (failedCount + rolledBackCount) / nodeCount;
  if (failureRatio === 0) return "healthy";
  if (failureRatio <= 0.2) return "degraded";
  return "failed";
}

/**
 * Derive final session status from node tallies.
 */
export function deriveSessionStatus(
  nodeCount: number,
  completedCount: number,
  failedCount: number,
  rolledBackCount: number,
  cancelledCount: number
): ExecutionState {
  const terminal = completedCount + failedCount + rolledBackCount + cancelledCount;
  if (terminal < nodeCount) return "running";
  if (failedCount > 0) return "failed";
  if (rolledBackCount > 0 && completedCount === nodeCount - rolledBackCount) return "succeeded";
  return "succeeded";
}
