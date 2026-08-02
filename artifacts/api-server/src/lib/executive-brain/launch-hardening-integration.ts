// ── Executive Brain ↔ Launch Hardening Integration ────────────────────────
// Build 045A: Passive snapshot read only — the EB never triggers a hardening
// run automatically. Hardening runs are intentional engineering actions tied
// to specific build deployments, not background cycles.
// ────────────────────────────────────────────────────────────────────────────

import { fetchHardeningSummary }  from "../launch-hardening/lh-orchestrator";
import type { HardeningSummary }  from "../launch-hardening/types";
import { logger }                 from "../logger";

export type { HardeningSummary };

// Returns the latest hardening snapshot for EB context. Fail-open.
export async function fetchHardeningView(): Promise<HardeningSummary | null> {
  try {
    return await fetchHardeningSummary();
  } catch (err) {
    logger.warn({ err }, "Executive Brain: fetchHardeningView failed (ignored)");
    return null;
  }
}

// Called each EB cycle — increments an in-memory cycle counter but never
// auto-triggers a hardening run. Hardening is an intentional build action.
let _cycleCount = 0;
export function notifyHardeningCycle(): void {
  _cycleCount++;
}
export function getHardeningCycleCount(): number {
  return _cycleCount;
}

// Builds the EB advisory from a hardening summary. Returns null if no
// hardening run has ever been executed (i.e., the registry is empty).
export function buildHardeningAdvisory(summary: HardeningSummary | null): string | null {
  if (!summary) {
    return "Launch Hardening: No hardening run recorded yet. Run POST /api/launch-hardening/import-audit to initialise the registry.";
  }

  const parts: string[] = [];

  // Launch status headline
  const statusLabel: Record<HardeningSummary["launchStatus"], string> = {
    NOT_READY:         "🔴 NOT READY FOR LAUNCH",
    CONDITIONAL:       "🟡 CONDITIONAL — pre-launch work remaining",
    READY:             "🟢 READY — all blockers resolved",
    LAUNCH_AUTHORIZED: "✅ LAUNCH AUTHORIZED",
  };
  parts.push(`Launch Status: ${statusLabel[summary.launchStatus]} (confidence ${summary.launchConfidence}%)`);

  // Blockers
  if (summary.blockersRemaining > 0) {
    parts.push(`🚫 ${summary.blockersRemaining} BLOCKER finding(s) still open — platform must not launch`);
  }

  // Pre-launch remaining
  if (summary.prelaunchRemaining > 0) {
    parts.push(`⚠️  ${summary.prelaunchRemaining} pre-launch finding(s) unresolved`);
  }

  // Verified progress
  if (summary.verifiedFixed > 0) {
    parts.push(`✓ ${summary.verifiedFixed} of ${summary.totalFindings} findings verified fixed`);
  }

  // Open by severity
  const openParts: string[] = [];
  if (summary.criticalOpen > 0) openParts.push(`${summary.criticalOpen} critical`);
  if (summary.highOpen     > 0) openParts.push(`${summary.highOpen} high`);
  if (openParts.length     > 0) parts.push(`Open: ${openParts.join(", ")}`);

  // Last snapshot time
  if (summary.lastSnapshotAt) {
    const age = Math.floor((Date.now() - new Date(summary.lastSnapshotAt).getTime()) / 60000);
    parts.push(`Snapshot: ${age}m ago`);
  }

  return parts.join(" | ");
}
