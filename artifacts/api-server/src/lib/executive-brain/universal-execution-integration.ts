// ─────────────────────────────────────────────────────────────────────────────
// Build 029: Universal Execution Engine — Executive Brain Bridge
// Throttle: every 170 brain cycles.
// Fail-open: any error here must never block the EB request path.
// ─────────────────────────────────────────────────────────────────────────────
import { executeWorkflow, fetchExecutionSummaryForEB } from "../universal-execution/execution-orchestrator";
import type { ExecutionSessionSummary } from "../universal-execution/types";

const EXECUTION_RUN_EVERY_N_CYCLES = 170;
const cycleCounts = new Map<number, number>();

const logger = { warn: console.warn.bind(console) };

/**
 * Fetch the most recent execution summary for the given user.
 */
export async function fetchUniversalExecutionSummary(userId: number): Promise<ExecutionSessionSummary | null> {
  try {
    return await fetchExecutionSummaryForEB(userId);
  } catch (err) {
    logger.warn({ err }, "EB universal-execution-integration: fetch failed (fail-open)");
    return null;
  }
}

/**
 * Trigger a background execution run every EXECUTION_RUN_EVERY_N_CYCLES EB cycles.
 * Fire-and-forget — never awaited on the critical path.
 */
export function triggerUniversalExecutionRun(userId: number, businessId: number): void {
  const prev = cycleCounts.get(userId) ?? 0;
  const next = prev + 1;
  cycleCounts.set(userId, next);

  if (next % EXECUTION_RUN_EVERY_N_CYCLES !== 0) return;

  executeWorkflow({ userId, businessId }).catch((err) => {
    logger.warn({ err }, "EB universal-execution-integration: background execution failed (fail-open)");
  });
}

/**
 * Build a compact advisory string for the EB context note.
 */
export function buildUniversalExecutionAdvisory(summary: ExecutionSessionSummary | null): string | null {
  if (!summary) return null;

  const successPct = Math.round(summary.successRate * 100);
  const verdict    = summary.executionHealth === "healthy"
    ? "HEALTHY"
    : summary.executionHealth === "degraded"
    ? "DEGRADED"
    : summary.executionHealth === "failed"
    ? "FAILED"
    : "UNKNOWN";

  return (
    `[Execution] ${verdict}. ` +
    `${summary.nodeCount} nodes: ${summary.completedNodeCount} succeeded, ` +
    `${summary.failedNodeCount} failed, ${summary.rolledBackNodeCount} rolled back. ` +
    `Success rate: ${successPct}%. Duration: ${Math.round(summary.durationMs / 1000)}s.`
  );
}
