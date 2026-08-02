// ── Build 047: UWPS → Executive Brain integration ────────────────────────────
import { buildUWPSSummary, runUWPSMaintenance } from "../unified-workspace/uwps-orchestrator";
import { logger } from "../logger";
import type { UWPSSummary } from "../unified-workspace/types";
import { UWPS_THROTTLE_CYCLES } from "../unified-workspace/types";

export type { UWPSSummary };

let _cycleCount = 0;

/** Fetch UWPS summary — called on every EB cycle (pre-warm pattern) */
export async function fetchUWPSView(userId: number): Promise<UWPSSummary | undefined> {
  try {
    return await buildUWPSSummary(userId);
  } catch (err) {
    logger.warn({ err }, "UWPS EB: fetchUWPSView failed (non-fatal)");
    return undefined;
  }
}

/** Trigger background maintenance — throttled to every UWPS_THROTTLE_CYCLES EB cycles */
export async function triggerUWPSMaintenance(userId: number): Promise<void> {
  _cycleCount++;
  if (_cycleCount % UWPS_THROTTLE_CYCLES !== 0) return;
  try {
    await runUWPSMaintenance(userId);
  } catch (err) {
    logger.warn({ err }, "UWPS EB: background maintenance failed (non-fatal)");
  }
}

/** Build advisory text for EB context note */
export function buildUWPSAdvisory(summary: UWPSSummary | null): string | null {
  if (!summary) return null;
  const parts: string[] = [];

  parts.push(
    `Workspace: ${summary.totalWorkspaces} workspace(s) | ` +
    `${summary.totalProjects} project(s) (${summary.activeProjects} active) | ` +
    `${summary.totalAssets} assets (${summary.deployedAssets} deployed) | ` +
    `avg health ${summary.avgHealthScore}/100`,
  );

  if (summary.recentActivity > 0) {
    parts.push(`Activity: ${summary.recentActivity} events in last 7 days`);
  }

  if (summary.projectsSummary.length > 0) {
    const low = summary.projectsSummary.filter((p: any) => (p.health_score ?? p.healthScore ?? 0) < 40);
    if (low.length > 0) {
      parts.push(`Low-health projects (need attention): ${low.map((p: any) => `${p.project_name ?? p.projectName} (${p.health_score ?? p.healthScore ?? 0}/100)`).join(", ")}`);
    }
  }

  if (!summary.lawApplied) {
    parts.push("WARNING: Unified Workspace Law breach — assets exist without project ownership.");
  }

  return `UWPS — ${parts.join(" | ")}`;
}
