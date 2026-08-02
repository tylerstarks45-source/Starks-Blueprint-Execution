// ── Launch Hardening Orchestrator ─────────────────────────────────────────
// Coordinates all 6 hardening engines in a single import/recalculate run.
// ────────────────────────────────────────────────────────────────────────────

import { importAuditFindings, getRemainingBlockers } from "./lh-classification-engine";
import { recalculateAllPriorities }                 from "./lh-priority-engine";
import { getSafeRemediationOrder }                  from "./lh-dependency-engine";
import { getVerificationCoverage }                  from "./lh-verification-engine";
import { getRegressionSummary }                     from "./lh-regression-engine";
import { computeLaunchReadiness, createLaunchSnapshot, fetchLatestSnapshot } from "./lh-launch-readiness-engine";
import type { HardeningSummary }                    from "./types";
import { logger } from "../logger";

export interface HardeningRunResult {
  importResult:      Awaited<ReturnType<typeof importAuditFindings>>;
  prioritiesUpdated: number;
  safeOrder:         Awaited<ReturnType<typeof getSafeRemediationOrder>>;
  verification:      Awaited<ReturnType<typeof getVerificationCoverage>>;
  regression:        Awaited<ReturnType<typeof getRegressionSummary>>;
  readiness:         Awaited<ReturnType<typeof computeLaunchReadiness>>;
  snapshotId:        number;
}

// Full hardening run — import findings, recalculate priorities, build
// dependency graph, and persist a snapshot. Safe to call on every build.
export async function runHardeningImport(triggerBuild?: string): Promise<HardeningRunResult> {
  logger.info({ triggerBuild }, "Launch Hardening: starting full import run");

  const importResult      = await importAuditFindings();
  const { updated }       = await recalculateAllPriorities();
  const safeOrder         = getSafeRemediationOrder();
  const verification      = await getVerificationCoverage();
  const regression        = await getRegressionSummary();
  const readiness         = await computeLaunchReadiness();
  const snapshotId        = await createLaunchSnapshot(triggerBuild);

  logger.info({
    triggerBuild,
    launchStatus:      readiness.launchStatus,
    blockersRemaining: readiness.blockersRemaining,
    launchConfidence:  readiness.launchConfidence,
    snapshotId,
  }, "Launch Hardening: import run complete");

  return {
    importResult,
    prioritiesUpdated: updated,
    safeOrder,
    verification,
    regression,
    readiness,
    snapshotId,
  };
}

// Lightweight EB read — returns the latest snapshot as a HardeningSummary.
export async function fetchHardeningSummary(): Promise<HardeningSummary | null> {
  try {
    const snap = await fetchLatestSnapshot();
    if (!snap) return null;

    return {
      totalFindings:      snap.totalFindings,
      blockersRemaining:  snap.blockersRemaining,
      prelaunchRemaining: snap.prelaunchRemaining ?? 0,
      verifiedFixed:      snap.verifiedFixed,
      launchConfidence:   snap.launchConfidence,
      launchStatus:       snap.launchStatus as HardeningSummary["launchStatus"],
      lastSnapshotAt:     snap.createdAt,
      criticalOpen:       snap.criticalOpen,
      highOpen:           snap.highOpen,
    };
  } catch {
    return null;
  }
}
