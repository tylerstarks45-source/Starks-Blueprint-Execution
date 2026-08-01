// ─────────────────────────────────────────────────────────────────────────────
// Build 027: Execution Simulation Engine — Executive Brain Integration Bridge
// Throttle: every 150 brain cycles.
// Fail-open: any error here must never block the EB request path.
// ─────────────────────────────────────────────────────────────────────────────
import { runExecutionSimulation, fetchSimulationSummaryForEB } from "../execution-simulation/simulation-orchestrator";
import type { ExecutionSimulationSummary } from "../execution-simulation/types";

const SIMULATION_RUN_EVERY_N_CYCLES = 150;
const cycleCounts = new Map<number, number>();

const logger = { warn: console.warn.bind(console) };

/**
 * Fetch the most recent execution simulation summary for the given user.
 */
export async function fetchExecutionSimulationSummary(userId: number): Promise<ExecutionSimulationSummary | null> {
  try {
    return await fetchSimulationSummaryForEB(userId);
  } catch (err) {
    logger.warn({ err }, "EB execution-simulation-integration: fetch failed (fail-open)");
    return null;
  }
}

/**
 * Trigger a background simulation run every SIMULATION_RUN_EVERY_N_CYCLES EB cycles.
 * Fire-and-forget — never awaited on the critical path.
 */
export function triggerExecutionSimulationRun(userId: number, businessId: number): void {
  const prev = cycleCounts.get(userId) ?? 0;
  const next = prev + 1;
  cycleCounts.set(userId, next);

  if (next % SIMULATION_RUN_EVERY_N_CYCLES !== 0) return;

  runExecutionSimulation({ userId, businessId }).catch((err) => {
    logger.warn({ err }, "EB execution-simulation-integration: background run failed (fail-open)");
  });
}

/**
 * Build a compact advisory string for the EB context note.
 */
export function buildExecutionSimulationAdvisory(summary: ExecutionSimulationSummary | null): string | null {
  if (!summary) return null;

  const confPct    = Math.round(summary.overallConfidence * 100);
  const bestPct    = Math.round(summary.bestCaseConfidence * 100);
  const worstPct   = Math.round(summary.worstCaseConfidence * 100);
  const rollbackPct = Math.round(summary.rollbackConfidence * 100);
  const verdict    = summary.isSimulationComplete ? "READY" : "INCOMPLETE";

  return (
    `[Execution Simulation] ${verdict}. ` +
    `${summary.simulationCount} simulation(s), ${summary.scenarioCount} scenario(s). ` +
    `Confidence: ${confPct}% (best: ${bestPct}%, worst: ${worstPct}%). ` +
    `Est. duration: ${summary.estimatedDurationExpected.toFixed(1)}${summary.estimatedDurationUnit}. ` +
    `Rollback confidence: ${rollbackPct}%.`
  );
}
