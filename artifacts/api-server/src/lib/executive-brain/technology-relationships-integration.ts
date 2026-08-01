import { buildRelationshipSummary, runGraphRebuild } from "../technology-relationships/tri-orchestrator";
import type { TechnologyRelationshipSummary } from "../technology-relationships/types";

// ── EB throttle state ─────────────────────────────────────────────────────
let triCycleCount = 0;
const TRI_THROTTLE_CYCLES = 220;

// ── Fetch summary for EB context ──────────────────────────────────────────
export async function fetchTechnologyRelationshipSummary(
  _userId: number,
): Promise<TechnologyRelationshipSummary | null> {
  try {
    return await buildRelationshipSummary();
  } catch {
    return null;
  }
}

// ── Throttled background graph rebuild ────────────────────────────────────
export function triggerTechnologyRelationshipRebuild(_userId: number): void {
  triCycleCount++;
  if (triCycleCount % TRI_THROTTLE_CYCLES !== 0) return;
  // Fire-and-forget — must not block the EB cycle
  runGraphRebuild("scheduled").catch(() => {/* fail-open */});
}

// ── Advisory for buildContextNote ────────────────────────────────────────
export function buildTechnologyRelationshipAdvisory(
  summary: TechnologyRelationshipSummary | null,
): string | null {
  if (!summary || summary.totalRelationships === 0) return null;

  const parts: string[] = [
    `[TechRelationships] ${summary.totalRelationships} relationships mapped across ${summary.totalEcosystems} ecosystems.`,
    `Network score: ${(summary.networkScore * 100).toFixed(1)}%. Coverage: ${(summary.relationshipCoverage * 100).toFixed(0)}%.`,
    `${summary.totalDependencies} dependencies, ${summary.totalConflicts} conflicts, ${summary.totalReplacements} migration paths.`,
  ];

  if (summary.conflictAlerts > 0) {
    parts.push(`${summary.conflictAlerts} active high/critical conflict alert(s).`);
  }

  if (summary.synergyOpportunities > 0) {
    parts.push(`${summary.synergyOpportunities} synergy opportunity/opportunities identified.`);
  }

  if (summary.migrationOpportunities > 0) {
    parts.push(`${summary.migrationOpportunities} migration opportunity/opportunities available.`);
  }

  if (summary.topEcosystems.length > 0) {
    parts.push(`Key ecosystems: ${summary.topEcosystems.slice(0, 3).join(", ")}.`);
  }

  return parts.join(" ");
}
