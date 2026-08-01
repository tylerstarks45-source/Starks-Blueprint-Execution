import { buildSystemsDynamicsSummary, runSystemsDynamicsRebuild } from "../systems-dynamics/sdi-orchestrator";
import type { SystemsDynamicsSummary } from "../systems-dynamics/types";

// ── EB throttle state ─────────────────────────────────────────────────────
let sdiCycleCount = 0;
const SDI_THROTTLE_CYCLES = 240;

// ── Fetch summary for EB context ──────────────────────────────────────────
export async function fetchSystemsDynamicsSummary(
  _userId: number,
): Promise<SystemsDynamicsSummary | null> {
  try {
    return await buildSystemsDynamicsSummary();
  } catch {
    return null;
  }
}

// ── Throttled background rebuild ──────────────────────────────────────────
export function triggerSystemsDynamicsRebuild(_userId: number): void {
  sdiCycleCount++;
  if (sdiCycleCount % SDI_THROTTLE_CYCLES !== 0) return;
  runSystemsDynamicsRebuild("scheduled").catch(() => {/* fail-open */});
}

// ── Advisory for buildContextNote ────────────────────────────────────────
export function buildSystemsDynamicsAdvisory(
  summary: SystemsDynamicsSummary | null,
): string | null {
  if (!summary || summary.totalSystems === 0) return null;

  const parts: string[] = [
    `[SystemsDynamics] ${summary.totalSystems} systems · ${summary.totalSubsystems} subsystems · ${summary.totalFeedbackLoops} feedback loops mapped. Platform systems score: ${(summary.platformSystemsScore * 100).toFixed(1)}%.`,
    `Avg health: ${(summary.averageSystemHealth * 100).toFixed(0)}%. Avg resilience: ${(summary.averageResilience * 100).toFixed(0)}%. Avg stability: ${(summary.averageStability * 100).toFixed(0)}%.`,
  ];

  if (summary.criticalConstraints > 0) {
    const names = summary.criticalConstraintNames.slice(0, 2).join(", ");
    parts.push(`${summary.criticalConstraints} critical constraint(s): ${names}.`);
  }

  if (summary.criticalPropagationPaths.length > 0) {
    const paths = summary.criticalPropagationPaths.slice(0, 2).map(p => `${p.source}→${p.target}`).join(", ");
    parts.push(`Critical propagation risk paths: ${paths}.`);
  }

  if (summary.topLeverageOpportunities.length > 0) {
    const top = summary.topLeverageOpportunities[0];
    parts.push(`Highest leverage: "${top.key}" in ${top.system} (score: ${(top.score * 100).toFixed(0)}%).`);
  }

  if (summary.lowResilienceSystems.length > 0) {
    parts.push(`Low-resilience systems: ${summary.lowResilienceSystems.join(", ")}.`);
  }

  if (summary.highestRiskSystem) {
    parts.push(`Highest propagation risk: ${summary.highestRiskSystem}.`);
  }

  return parts.join(" ");
}
