// ─────────────────────────────────────────────────────────────────────────────
// Build 021: Strategic Planning Engine — Executive Brain Integration Bridge
// Throttle: every 90 brain cycles.
// Fail-open: any error here must never block the EB request path.
// ─────────────────────────────────────────────────────────────────────────────
import { runStrategicPlanning, fetchPlanningSummaryForEB } from "../strategic-planning/planning-orchestrator";
import type { PlanningSummary } from "../strategic-planning/types";

const PLANNING_RUN_EVERY_N_CYCLES = 90;
const cycleCounts = new Map<number, number>();

const logger = {
  warn: console.warn.bind(console),
};

/**
 * Fetch the most recent planning summary for the given user.
 * Returns null if none exists or if the DB call fails.
 */
export async function fetchPlanSummary(userId: number): Promise<PlanningSummary | null> {
  try {
    return await fetchPlanningSummaryForEB(userId);
  } catch (err) {
    logger.warn({ err }, "EB planning-integration: fetchPlanSummary failed (fail-open)");
    return null;
  }
}

/**
 * Trigger a background strategic planning run every PLANNING_RUN_EVERY_N_CYCLES EB cycles.
 * Fire-and-forget — never awaited on the critical path.
 */
export function triggerPlanningRun(userId: number, businessId: number): void {
  const prev = cycleCounts.get(userId) ?? 0;
  const next = prev + 1;
  cycleCounts.set(userId, next);

  if (next % PLANNING_RUN_EVERY_N_CYCLES !== 0) return;

  // Fire and forget — fail-open
  runStrategicPlanning({ userId, businessId }).catch((err) => {
    logger.warn({ err }, "EB planning-integration: background run failed (fail-open)");
  });
}

/**
 * Build a compact advisory string for the EB context note.
 * Returns null if no summary is available.
 */
export function buildPlanningAdvisory(summary: PlanningSummary | null): string | null {
  if (!summary) return null;

  const readinessPct = Math.round(summary.overallReadinessScore * 100);
  const confPct = Math.round(summary.overallConfidence * 100);
  const topProgramsStr =
    summary.topProgramNames.length > 0
      ? summary.topProgramNames.join(", ")
      : "none";
  const critDepsNote =
    summary.criticalDependencyCount > 0
      ? ` ${summary.criticalDependencyCount} critical dependencies require management.`
      : "";

  return (
    `[Strategic Planning] ${summary.programCount} programmes, ${summary.initiativeCount} initiatives, ` +
    `${summary.milestoneCount} milestones. ` +
    `Readiness: ${summary.overallReadinessLevel} (${readinessPct}%), confidence ${confPct}%. ` +
    `Top programmes: ${topProgramsStr}.` +
    critDepsNote
  );
}
