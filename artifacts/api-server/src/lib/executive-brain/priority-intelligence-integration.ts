import { buildPriorityIntelligenceSummary, runPriorityPlatformRebuild } from "../priority-intelligence/epri-orchestrator";
import type { PriorityIntelligenceSummary } from "../priority-intelligence/types";

// ── EB throttle state ─────────────────────────────────────────────────────
let epriCycleCount = 0;
const EPRI_THROTTLE_CYCLES = 270;

// ── Fetch summary for EB context ──────────────────────────────────────────
export async function fetchPriorityIntelligenceSummary(
  _userId: number,
): Promise<PriorityIntelligenceSummary | null> {
  try {
    return await buildPriorityIntelligenceSummary();
  } catch {
    return null;
  }
}

// ── Throttled background rebuild ──────────────────────────────────────────
export function triggerPriorityIntelligenceRebuild(_userId: number): void {
  epriCycleCount++;
  if (epriCycleCount % EPRI_THROTTLE_CYCLES !== 0) return;
  runPriorityPlatformRebuild("scheduled").catch(() => {/* fail-open */});
}

// ── Advisory for buildContextNote ─────────────────────────────────────────
export function buildPriorityIntelligenceAdvisory(
  summary: PriorityIntelligenceSummary | null,
): string | null {
  if (!summary || summary.totalProfiles === 0) return null;

  const parts: string[] = [
    `[PriorityIntelligence] ${summary.totalProfiles} profile(s), ${summary.totalItems} item(s). Avg health: ${(summary.avgOverallHealth * 100).toFixed(0)}%. Priority Law rate: ${(summary.priorityLawRate * 100).toFixed(0)}%.`,
  ];

  if (summary.totalBlocked > 0) {
    parts.push(`⚠️ ${summary.totalBlocked} item(s) BLOCKED — dependency resolution required.`);
  }
  if (summary.totalStale > 0) {
    parts.push(`${summary.totalStale} stale item(s) — review and retire or re-prioritize.`);
  }
  if (summary.totalCritical > 0) {
    parts.push(`${summary.totalCritical} critical/executive escalation(s) requiring immediate attention.`);
  }
  if (summary.topPlatformPriority) {
    parts.push(`Top platform priority: "${summary.topPlatformPriority}".`);
  }
  if (summary.executiveFocusArea) {
    parts.push(`Executive focus area: ${summary.executiveFocusArea}.`);
  }

  const recent = summary.profileSummaries.slice(0, 3);
  if (recent.length > 0) {
    const recStr = recent.map(p =>
      `"${p.title}"(${(p.overallHealth * 100).toFixed(0)}%${p.blockedItems > 0 ? `,⚠️${p.blockedItems}blk` : ""}${p.criticalEscalations > 0 ? `,${p.criticalEscalations}crit` : ""})`
    ).join("; ");
    parts.push(`Profiles: ${recStr}.`);
  }

  const advisory = parts.join(" ");
  return advisory.length > 600 ? advisory.slice(0, 599) + "…" : advisory;
}
