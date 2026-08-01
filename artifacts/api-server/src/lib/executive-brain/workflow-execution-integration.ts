// ─────────────────────────────────────────────────────────────────────────────
// Build 028: Intelligent Workflow Execution Engine — Executive Brain Bridge
// Throttle: every 160 brain cycles.
// Fail-open: any error here must never block the EB request path.
// ─────────────────────────────────────────────────────────────────────────────
import { buildExecutionWorkflow, fetchWorkflowSummaryForEB } from "../workflow-execution/workflow-orchestrator";
import type { WorkflowSummary } from "../workflow-execution/types";

const WORKFLOW_BUILD_EVERY_N_CYCLES = 160;
const cycleCounts = new Map<number, number>();

const logger = { warn: console.warn.bind(console) };

/**
 * Fetch the most recent workflow summary for the given user.
 */
export async function fetchWorkflowExecutionSummary(userId: number): Promise<WorkflowSummary | null> {
  try {
    return await fetchWorkflowSummaryForEB(userId);
  } catch (err) {
    logger.warn({ err }, "EB workflow-execution-integration: fetch failed (fail-open)");
    return null;
  }
}

/**
 * Trigger a background workflow build every WORKFLOW_BUILD_EVERY_N_CYCLES EB cycles.
 * Fire-and-forget — never awaited on the critical path.
 */
export function triggerWorkflowBuildRun(userId: number, businessId: number): void {
  const prev = cycleCounts.get(userId) ?? 0;
  const next = prev + 1;
  cycleCounts.set(userId, next);

  if (next % WORKFLOW_BUILD_EVERY_N_CYCLES !== 0) return;

  buildExecutionWorkflow({ userId, businessId }).catch((err) => {
    logger.warn({ err }, "EB workflow-execution-integration: background build failed (fail-open)");
  });
}

/**
 * Build a compact advisory string for the EB context note.
 */
export function buildWorkflowExecutionAdvisory(summary: WorkflowSummary | null): string | null {
  if (!summary) return null;

  const confPct     = Math.round(summary.workflowConfidence * 100);
  const rollbackPct = Math.round(summary.rollbackCoverage * 100);
  const verdict     = summary.isWorkflowReady ? "READY" : "NOT READY";

  return (
    `[Workflow] ${verdict}. ` +
    `${summary.nodeCount} nodes, ${summary.edgeCount} edges, ${summary.checkpointCount} checkpoints. ` +
    `${summary.phaseCount} phase(s), complexity: ${summary.workflowComplexity}. ` +
    `Confidence: ${confPct}%. Rollback coverage: ${rollbackPct}%.`
  );
}
