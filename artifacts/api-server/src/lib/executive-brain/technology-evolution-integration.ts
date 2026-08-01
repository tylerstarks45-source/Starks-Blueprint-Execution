import { buildEvolutionSummary, runEvolutionRebuild } from "../technology-evolution/tei-orchestrator";
import type { TechnologyEvolutionSummary } from "../technology-evolution/types";

// ── EB throttle state ─────────────────────────────────────────────────────
let teiCycleCount = 0;
const TEI_THROTTLE_CYCLES = 230;

// ── Fetch summary for EB context ──────────────────────────────────────────
export async function fetchTechnologyEvolutionSummary(
  _userId: number,
): Promise<TechnologyEvolutionSummary | null> {
  try {
    return await buildEvolutionSummary();
  } catch {
    return null;
  }
}

// ── Throttled background rebuild ──────────────────────────────────────────
export function triggerTechnologyEvolutionRebuild(_userId: number): void {
  teiCycleCount++;
  if (teiCycleCount % TEI_THROTTLE_CYCLES !== 0) return;
  runEvolutionRebuild("scheduled").catch(() => {/* fail-open */});
}

// ── Advisory for buildContextNote ────────────────────────────────────────
export function buildTechnologyEvolutionAdvisory(
  summary: TechnologyEvolutionSummary | null,
): string | null {
  if (!summary || summary.totalTechnologies === 0) return null;

  const parts: string[] = [
    `[TechEvolution] ${summary.totalTechnologies} technologies tracked. Platform evolution score: ${(summary.platformEvolutionScore * 100).toFixed(1)}%.`,
    `Avg maturity: ${(summary.averageMaturityScore * 100).toFixed(0)}%. Avg stability: ${(summary.averageStabilityScore * 100).toFixed(0)}%. Avg confidence: ${(summary.averageConfidenceScore * 100).toFixed(0)}%.`,
  ];

  if (summary.deprecationAlerts > 0) {
    parts.push(`${summary.deprecationAlerts} deprecation alert(s): ${summary.deprecationCandidates.slice(0, 3).join(", ")}.`);
  }

  if (summary.upgradePriorities > 0) {
    const urgent = summary.migrationPriorities.slice(0, 2).map(m => `${m.key} (${m.urgency})`).join(", ");
    parts.push(`${summary.upgradePriorities} upgrade priorit(y/ies). Urgent: ${urgent}.`);
  }

  if (summary.emergingTechnologies > 0) {
    parts.push(`${summary.emergingTechnologies} emerging technology/technologies: ${summary.emergingOpportunities.slice(0, 3).join(", ")}.`);
  }

  if (summary.trendLeaders.length > 0) {
    parts.push(`Accelerating leaders: ${summary.trendLeaders.slice(0, 4).join(", ")}.`);
  }

  return parts.join(" ");
}
