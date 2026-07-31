// ─────────────────────────────────────────────────────────────────────────────
// Build 022: Capability Planning Engine — Executive Brain Integration Bridge
// Throttle: every 100 brain cycles.
// Fail-open: any error here must never block the EB request path.
// ─────────────────────────────────────────────────────────────────────────────
import { runCapabilityPlanning, fetchCapabilitySummaryForEB } from "../capability-planning/capability-orchestrator";
import type { CapabilitySummary } from "../capability-planning/types";

const CAPABILITY_RUN_EVERY_N_CYCLES = 100;
const cycleCounts = new Map<number, number>();

const logger = { warn: console.warn.bind(console) };

/**
 * Fetch the most recent capability summary for the given user.
 * Returns null if none exists or if the DB call fails.
 */
export async function fetchCapabilitySummary(userId: number): Promise<CapabilitySummary | null> {
  try {
    return await fetchCapabilitySummaryForEB(userId);
  } catch (err) {
    logger.warn({ err }, "EB capability-integration: fetchCapabilitySummary failed (fail-open)");
    return null;
  }
}

/**
 * Trigger a background capability planning run every CAPABILITY_RUN_EVERY_N_CYCLES EB cycles.
 * Fire-and-forget — never awaited on the critical path.
 */
export function triggerCapabilityRun(userId: number, businessId: number): void {
  const prev = cycleCounts.get(userId) ?? 0;
  const next = prev + 1;
  cycleCounts.set(userId, next);

  if (next % CAPABILITY_RUN_EVERY_N_CYCLES !== 0) return;

  runCapabilityPlanning({ userId, businessId }).catch((err) => {
    logger.warn({ err }, "EB capability-integration: background run failed (fail-open)");
  });
}

/**
 * Build a compact advisory string for the EB context note.
 * Returns null if no summary is available.
 */
export function buildCapabilityAdvisory(summary: CapabilitySummary | null): string | null {
  if (!summary) return null;

  const readinessPct = Math.round(summary.overallReadinessScore * 100);
  const confPct = Math.round(summary.overallConfidence * 100);
  const critGapNote =
    summary.criticalGapCount > 0
      ? ` ${summary.criticalGapCount} critical gaps — top domains: ${summary.topCriticalDomains.join(", ")}.`
      : summary.missingCapabilityCount > 0
      ? ` ${summary.missingCapabilityCount} capabilities must be built from scratch.`
      : " No critical capability gaps.";
  const riskNote = summary.highestRiskGap ? ` Highest risk: ${summary.highestRiskGap}.` : "";

  return (
    `[Capability Planning] ${summary.domainCount} domains, ${summary.requirementCount} requirements, ${summary.gapCount} gaps. ` +
    `Readiness: ${summary.overallReadinessLevel} (${readinessPct}%), confidence ${confPct}%.` +
    critGapNote +
    riskNote
  );
}
