import { buildInfrastructureSummary, runInfrastructureScan } from "../platform-infrastructure/pii-orchestrator";
import type { PlatformInfrastructureSummary } from "../platform-infrastructure/types";

// ── EB throttle state ────────────────────────────────────────
let piiCycleCount = 0;
const PII_THROTTLE_CYCLES = 200;

// ── Fetch summary for EB context ────────────────────────────
export async function fetchPlatformInfrastructureSummary(
  _userId: number,
): Promise<PlatformInfrastructureSummary | null> {
  try {
    return await buildInfrastructureSummary();
  } catch {
    return null;
  }
}

// ── Throttled background scan ────────────────────────────────
export function triggerPlatformInfrastructureScan(_userId: number): void {
  piiCycleCount++;
  if (piiCycleCount % PII_THROTTLE_CYCLES !== 0) return;
  // Fire-and-forget scan — must not block the EB cycle
  runInfrastructureScan("scheduled").catch(() => {/* fail-open */});
}

// ── Advisory for buildContextNote ───────────────────────────
export function buildPlatformInfrastructureAdvisory(
  summary: PlatformInfrastructureSummary | null,
): string | null {
  if (!summary || summary.totalResources === 0) return null;

  const parts: string[] = [
    `[PlatformInfrastructure] ${summary.totalResources} resources monitored.`,
    `Readiness: ${summary.platformReadiness}. Pressure: ${summary.overallPressure}.`,
    `Health: ${summary.healthyResources} healthy, ${summary.warningResources} warning, ${summary.degradedResources} degraded, ${summary.criticalResources} critical.`,
    `Avg utilization: ${summary.avgUtilizationPercent.toFixed(1)}%.`,
    `Performance efficiency: ${(summary.performanceScore * 100).toFixed(1)}%.`,
  ];

  if (summary.openAlerts > 0) {
    parts.push(`${summary.openAlerts} open infrastructure alert(s).`);
  }

  if (summary.topPressuredResources.length > 0) {
    parts.push(`High-pressure resources: ${summary.topPressuredResources.join(", ")}.`);
  }

  return parts.join(" ");
}
