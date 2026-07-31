// ─────────────────────────────────────────────────────────────────────────────
// Build 025: Authority Resolution Engine — Executive Brain Integration Bridge
// Throttle: every 130 brain cycles.
// Fail-open: any error here must never block the EB request path.
// ─────────────────────────────────────────────────────────────────────────────
import { runAuthorityResolution, fetchAuthoritySummaryForEB } from "../authority-resolution/authority-orchestrator";
import type { AuthoritySummary } from "../authority-resolution/types";

const AUTHORITY_RUN_EVERY_N_CYCLES = 130;
const cycleCounts = new Map<number, number>();

const logger = { warn: console.warn.bind(console) };

/**
 * Fetch the most recent authority resolution summary for the given user.
 * Returns null if none exists or if the DB call fails.
 */
export async function fetchAuthoritySummary(userId: number): Promise<AuthoritySummary | null> {
  try {
    return await fetchAuthoritySummaryForEB(userId);
  } catch (err) {
    logger.warn({ err }, "EB authority-resolution-integration: fetch failed (fail-open)");
    return null;
  }
}

/**
 * Trigger a background authority resolution run every AUTHORITY_RUN_EVERY_N_CYCLES EB cycles.
 * Fire-and-forget — never awaited on the critical path.
 */
export function triggerAuthorityResolutionRun(userId: number, businessId: number): void {
  const prev = cycleCounts.get(userId) ?? 0;
  const next = prev + 1;
  cycleCounts.set(userId, next);

  if (next % AUTHORITY_RUN_EVERY_N_CYCLES !== 0) return;

  runAuthorityResolution({ userId, businessId }).catch((err) => {
    logger.warn({ err }, "EB authority-resolution-integration: background run failed (fail-open)");
  });
}

/**
 * Build a compact advisory string for the EB context note.
 * Returns null if no summary is available.
 */
export function buildAuthorityAdvisory(summary: AuthoritySummary | null): string | null {
  if (!summary) return null;

  const authPct = Math.round(summary.authorizationScore * 100);
  const confPct = Math.round(summary.authorityConfidence * 100);
  const authStatus = summary.isAuthorized ? "AUTHORIZED" : "NOT AUTHORIZED";

  const missingNote =
    summary.missingCount > 0
      ? ` ${summary.missingCount} authority requirement(s) missing (denied/unavailable).`
      : " No missing authorities.";

  const approvalNote =
    summary.approvalRequiredCount > 0
      ? ` ${summary.approvalRequiredCount} approval(s) required before execution.`
      : "";

  return (
    `[Authority Resolution] ${authStatus}. ` +
    `${summary.requirementCount} requirement(s): ${summary.grantedCount} granted, ${summary.pendingCount} pending, ${summary.deniedCount} denied. ` +
    `Authorization score: ${authPct}%, confidence: ${confPct}%.` +
    missingNote +
    approvalNote
  );
}
