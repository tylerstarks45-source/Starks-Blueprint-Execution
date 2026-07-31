// ─────────────────────────────────────────────────────────────────────────────
// Build 026: Execution Risk Assessment Engine — Executive Brain Integration Bridge
// Throttle: every 140 brain cycles.
// Fail-open: any error here must never block the EB request path.
// ─────────────────────────────────────────────────────────────────────────────
import { runRiskAssessment, fetchRiskSummaryForEB } from "../execution-risk/risk-orchestrator";
import type { ExecutionRiskSummary } from "../execution-risk/types";

const RISK_RUN_EVERY_N_CYCLES = 140;
const cycleCounts = new Map<number, number>();

const logger = { warn: console.warn.bind(console) };

/**
 * Fetch the most recent execution risk summary for the given user.
 */
export async function fetchExecutionRiskSummary(userId: number): Promise<ExecutionRiskSummary | null> {
  try {
    return await fetchRiskSummaryForEB(userId);
  } catch (err) {
    logger.warn({ err }, "EB execution-risk-integration: fetch failed (fail-open)");
    return null;
  }
}

/**
 * Trigger a background risk assessment run every RISK_RUN_EVERY_N_CYCLES EB cycles.
 * Fire-and-forget — never awaited on the critical path.
 */
export function triggerRiskAssessmentRun(userId: number, businessId: number): void {
  const prev = cycleCounts.get(userId) ?? 0;
  const next = prev + 1;
  cycleCounts.set(userId, next);

  if (next % RISK_RUN_EVERY_N_CYCLES !== 0) return;

  runRiskAssessment({ userId, businessId }).catch((err) => {
    logger.warn({ err }, "EB execution-risk-integration: background run failed (fail-open)");
  });
}

/**
 * Build a compact advisory string for the EB context note.
 */
export function buildRiskAdvisory(summary: ExecutionRiskSummary | null): string | null {
  if (!summary) return null;

  const riskPct = Math.round(summary.overallRiskScore * 100);
  const safetyPct = Math.round(summary.safetyScore * 100);
  const rollbackPct = Math.round(summary.rollbackReadiness * 100);
  const verdict = summary.isSafeToExecute ? "SAFE" : "NOT RECOMMENDED";

  return (
    `[Execution Risk] ${verdict}. Overall risk: ${summary.overallRiskLevel} (${riskPct}%). ` +
    `Safety score: ${safetyPct}%. Rollback readiness: ${rollbackPct}%. ` +
    `Highest risk: ${summary.highestRiskCategory} (${summary.highestRiskLevel}). ` +
    `${summary.mitigationCount} mitigation(s) identified.`
  );
}
