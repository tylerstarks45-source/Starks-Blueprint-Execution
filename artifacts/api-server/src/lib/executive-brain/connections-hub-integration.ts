// ── Build 044: Connections Hub — Executive Brain Integration ──────────────
import { logger } from "../logger";
import { fetchConnectionHubSummary, initializeConnectionsHub } from "../connections-hub/hub-orchestrator";
import { generateRecommendations } from "../connections-hub/hub-compatibility-engine";
import type { ConnectionHubSummary } from "../connections-hub/types";
import { HUB_THROTTLE_CYCLES } from "../connections-hub/types";

export type { ConnectionHubSummary };

// Fetch the latest connections hub summary for EB context (read-only).
export async function fetchConnectionsHubView(userId: number): Promise<ConnectionHubSummary | null> {
  try {
    return await fetchConnectionHubSummary(userId);
  } catch (err) {
    logger.warn({ err }, "Connections Hub: fetchConnectionsHubView failed (fail-open)");
    return null;
  }
}

// Fire-and-forget init — triggered every HUB_THROTTLE_CYCLES EB cycles.
let _hubCycleCounter = 0;
export function triggerConnectionsHubInit(userId: number): void {
  _hubCycleCounter++;
  if (_hubCycleCounter % HUB_THROTTLE_CYCLES !== 0) return;
  initializeConnectionsHub(userId).catch((err) =>
    logger.warn({ err }, "Connections Hub: background init failed (ignored)"),
  );
}

// Build the EB advisory section for the connections hub.
export function buildConnectionsHubAdvisory(summary: ConnectionHubSummary | null): string {
  if (!summary) return "";
  const parts: string[] = [];
  parts.push(
    `Integration Hub: ${summary.totalProviders} providers | ${summary.totalConnections} active connections | ${summary.domainsRegistered} domains | avg health ${(summary.avgHealthScore * 100).toFixed(0)}% | risk flags: ${summary.riskFlags}.`,
  );
  if (summary.riskFlags > 0) {
    parts.push(`${summary.riskFlags} connection(s) below health threshold — review credentials or quota limits.`);
  }
  if (!summary.lawApplied) {
    parts.push("WARNING: Unified Connection Law breach — a connector may be operating without a canonical provider record.");
  }
  return parts.join(" ");
}
