import { buildIntelligenceSummary, takeIntelligenceSnapshot } from "../capability-intelligence/ci-orchestrator";
import type { CapabilityIntelligenceSummary } from "../capability-intelligence/types";

// ── EB throttle state ────────────────────────────────────────
let ciCycleCount = 0;
const CI_THROTTLE_CYCLES = 190;

// ── Fetch summary for EB context ────────────────────────────
export async function fetchCapabilityIntelligenceSummary(
  _userId: number,
): Promise<CapabilityIntelligenceSummary | null> {
  try {
    return await buildIntelligenceSummary();
  } catch {
    return null;
  }
}

// ── Throttled background scan ────────────────────────────────
export function triggerCapabilityIntelligenceScan(_userId: number): void {
  ciCycleCount++;
  if (ciCycleCount % CI_THROTTLE_CYCLES !== 0) return;
  // Fire-and-forget snapshot — must not block the EB cycle
  takeIntelligenceSnapshot("scheduled").catch(() => {/* fail-open */});
}

// ── Advisory for buildContextNote ───────────────────────────
export function buildCapabilityIntelligenceAdvisory(
  summary: CapabilityIntelligenceSummary | null,
): string | null {
  if (!summary || summary.totalCapabilities === 0) return null;

  const parts: string[] = [
    `[CapabilityIntelligence] ${summary.totalCapabilities} capabilities evaluated.`,
    `Health: ${summary.healthyCapabilities} healthy, ${summary.warningCapabilities} warning, ${summary.degradedCapabilities} degraded, ${summary.criticalCapabilities} critical.`,
    `Avg confidence: ${(summary.avgConfidence * 100).toFixed(1)}%, avg success: ${(summary.avgSuccessRate * 100).toFixed(1)}%.`,
  ];

  if (summary.openOptimizations > 0) {
    parts.push(`${summary.openOptimizations} open optimization(s).`);
  }

  if (summary.topRisks.length > 0) {
    parts.push(`Top risks: ${summary.topRisks.join(", ")}.`);
  }

  if (summary.topOptimizations.length > 0) {
    parts.push(`Top optimizations: ${summary.topOptimizations.join("; ")}.`);
  }

  return parts.join(" ");
}
