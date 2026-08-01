import { buildTechnologySummary, runCatalogRefresh } from "../global-technology/gti-orchestrator";
import type { GlobalTechnologySummary } from "../global-technology/types";

// ── EB throttle state ─────────────────────────────────────────────────────
let gtiCycleCount = 0;
const GTI_THROTTLE_CYCLES = 210;

// ── Fetch summary for EB context ──────────────────────────────────────────
export async function fetchGlobalTechnologySummary(
  _userId: number,
): Promise<GlobalTechnologySummary | null> {
  try {
    return await buildTechnologySummary();
  } catch {
    return null;
  }
}

// ── Throttled background catalog refresh ──────────────────────────────────
export function triggerGlobalTechnologyScan(_userId: number): void {
  gtiCycleCount++;
  if (gtiCycleCount % GTI_THROTTLE_CYCLES !== 0) return;
  // Fire-and-forget — must not block the EB cycle
  runCatalogRefresh("scheduled").catch(() => {/* fail-open */});
}

// ── Advisory for buildContextNote ────────────────────────────────────────
export function buildGlobalTechnologyAdvisory(
  summary: GlobalTechnologySummary | null,
): string | null {
  if (!summary || summary.totalTechnologies === 0) return null;

  const parts: string[] = [
    `[GlobalTechnology] ${summary.totalTechnologies} technologies cataloged across ${Object.keys(summary.categoryCounts).length} categories.`,
    `Technology readiness: ${summary.technologyReadiness}. Innovation score: ${(summary.innovationScore * 100).toFixed(1)}%.`,
    `Compatibility: ${summary.compatibleCount} compatible, ${summary.partialCount} partial, ${summary.incompatibleCount} incompatible.`,
    `Avg benchmark composite: ${(summary.avgCompositeScore * 100).toFixed(1)}%.`,
  ];

  if (summary.openRecommendations > 0) {
    parts.push(`${summary.openRecommendations} open administrator technology recommendation(s).`);
  }

  if (summary.topOpportunities.length > 0) {
    const names = summary.topOpportunities.slice(0, 3).map(o => o.name).join(", ");
    parts.push(`Top opportunities: ${names}.`);
  }

  return parts.join(" ");
}
