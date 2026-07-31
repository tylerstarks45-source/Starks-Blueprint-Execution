// ─────────────────────────────────────────────────────────────────────────────
// Build 023: Operational Planning Engine — Executive Brain Integration Bridge
// Throttle: every 110 brain cycles.
// Fail-open: any error here must never block the EB request path.
// ─────────────────────────────────────────────────────────────────────────────
import { runOperationalPlanning, fetchOperationalSummaryForEB } from "../operational-planning/operational-orchestrator";
import type { OperationalSummary } from "../operational-planning/types";

const OPERATIONAL_RUN_EVERY_N_CYCLES = 110;
const cycleCounts = new Map<number, number>();

const logger = { warn: console.warn.bind(console) };

/**
 * Fetch the most recent operational summary for the given user.
 * Returns null if none exists or if the DB call fails.
 */
export async function fetchOperationalSummary(userId: number): Promise<OperationalSummary | null> {
  try {
    return await fetchOperationalSummaryForEB(userId);
  } catch (err) {
    logger.warn({ err }, "EB operational-integration: fetchOperationalSummary failed (fail-open)");
    return null;
  }
}

/**
 * Trigger a background operational planning run every OPERATIONAL_RUN_EVERY_N_CYCLES EB cycles.
 * Fire-and-forget — never awaited on the critical path.
 */
export function triggerOperationalRun(userId: number, businessId: number): void {
  const prev = cycleCounts.get(userId) ?? 0;
  const next = prev + 1;
  cycleCounts.set(userId, next);

  if (next % OPERATIONAL_RUN_EVERY_N_CYCLES !== 0) return;

  runOperationalPlanning({ userId, businessId }).catch((err) => {
    logger.warn({ err }, "EB operational-integration: background run failed (fail-open)");
  });
}

/**
 * Build a compact advisory string for the EB context note.
 * Returns null if no summary is available.
 */
export function buildOperationalAdvisory(summary: OperationalSummary | null): string | null {
  if (!summary) return null;

  const readinessPct = Math.round(summary.executionReadinessScore * 100);
  const confPct = Math.round(summary.executionConfidence * 100);
  const overallPct = Math.round(summary.overallScore * 100);
  const critDepNote =
    summary.criticalDependencyCount > 0
      ? ` ${summary.criticalDependencyCount} critical execution dependencies must be resolved.`
      : " No critical execution dependencies.";

  return (
    `[Operational Planning] ${summary.phaseCount} phases, ${summary.workPackageCount} work packages. ` +
    `Execution readiness: ${summary.executionReadinessLevel} (${readinessPct}%), confidence ${confPct}%, overall ${overallPct}%.` +
    critDepNote
  );
}
