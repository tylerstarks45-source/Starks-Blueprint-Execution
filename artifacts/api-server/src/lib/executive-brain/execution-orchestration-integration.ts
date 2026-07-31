// ─────────────────────────────────────────────────────────────────────────────
// Build 024: Execution Orchestration Engine — Executive Brain Integration Bridge
// Throttle: every 120 brain cycles.
// Fail-open: any error here must never block the EB request path.
// ─────────────────────────────────────────────────────────────────────────────
import { runExecutionOrchestration, fetchOrchestrationSummaryForEB } from "../execution-orchestration/execution-orchestration-orchestrator";
import type { ExecutionOrchestrationSummary } from "../execution-orchestration/types";

const ORCHESTRATION_RUN_EVERY_N_CYCLES = 120;
const cycleCounts = new Map<number, number>();

const logger = { warn: console.warn.bind(console) };

/**
 * Fetch the most recent execution orchestration summary for the given user.
 * Returns null if none exists or if the DB call fails.
 */
export async function fetchExecutionOrchestrationSummary(userId: number): Promise<ExecutionOrchestrationSummary | null> {
  try {
    return await fetchOrchestrationSummaryForEB(userId);
  } catch (err) {
    logger.warn({ err }, "EB execution-orchestration-integration: fetch failed (fail-open)");
    return null;
  }
}

/**
 * Trigger a background execution orchestration run every ORCHESTRATION_RUN_EVERY_N_CYCLES EB cycles.
 * Fire-and-forget — never awaited on the critical path.
 */
export function triggerExecutionOrchestrationRun(userId: number, businessId: number): void {
  const prev = cycleCounts.get(userId) ?? 0;
  const next = prev + 1;
  cycleCounts.set(userId, next);

  if (next % ORCHESTRATION_RUN_EVERY_N_CYCLES !== 0) return;

  runExecutionOrchestration({ userId, businessId }).catch((err) => {
    logger.warn({ err }, "EB execution-orchestration-integration: background run failed (fail-open)");
  });
}

/**
 * Build a compact advisory string for the EB context note.
 * Returns null if no summary is available.
 */
export function buildExecutionOrchestrationAdvisory(summary: ExecutionOrchestrationSummary | null): string | null {
  if (!summary) return null;

  const readinessPct = Math.round(summary.executionReadinessScore * 100);
  const confPct = Math.round(summary.executionConfidence * 100);
  const automationPct = Math.round(summary.automationRatio * 100);
  const critBlockerNote =
    summary.criticalBlockerCount > 0
      ? ` ${summary.criticalBlockerCount} critical execution blocker(s) require resolution.`
      : " No critical execution blockers.";
  const deferredNote =
    summary.deferredCount > 0
      ? ` ${summary.deferredCount} assignment(s) deferred.`
      : "";

  return (
    `[Execution Orchestration] ${summary.assignmentCount} assignments (automation: ${automationPct}%). ` +
    `Readiness: ${summary.executionReadinessLevel} (${readinessPct}%), confidence ${confPct}%.` +
    critBlockerNote +
    deferredNote
  );
}
