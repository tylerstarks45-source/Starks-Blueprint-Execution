// ── Build 043: Digital Operating Layer — Executive Brain Integration ──────
import { logger } from "../logger";
import {
  fetchOperatingLayerSummary,
  initializeOperatingLayer,
} from "../digital-operating-layer/dol-orchestrator";
import type { OperatingLayerSummary } from "../digital-operating-layer/types";
import { DOL_THROTTLE_CYCLES } from "../digital-operating-layer/types";

export type { OperatingLayerSummary };

// Fetch the latest operating layer summary for the EB context note (read-only).
export async function fetchOperatingLayerView(userId: number): Promise<OperatingLayerSummary | null> {
  try {
    return await fetchOperatingLayerSummary(userId);
  } catch (err) {
    logger.warn({ err }, "Digital Operating Layer: fetchOperatingLayerView failed (fail-open)");
    return null;
  }
}

// Fire-and-forget initialization — triggered every DOL_THROTTLE_CYCLES EB cycles.
let _dolCycleCounter = 0;
export function triggerOperatingLayerInit(userId: number): void {
  _dolCycleCounter++;
  if (_dolCycleCounter % DOL_THROTTLE_CYCLES !== 0) return;
  initializeOperatingLayer(userId).catch((err) =>
    logger.warn({ err }, "Digital Operating Layer: background init failed (ignored)"),
  );
}

// Build the EB advisory section for the operating layer.
export function buildOperatingLayerAdvisory(summary: OperatingLayerSummary | null): string {
  if (!summary) return "";
  const parts: string[] = [];
  parts.push(
    `Operating Layer: ${summary.activeSessions} active sessions | ${summary.totalChannels} channels | ${summary.totalReceipts} receipts | ${summary.registeredDomains} domains | health: ${summary.overallHealth} | avg latency: ${summary.avgLatencyMs}ms.`,
  );
  if (!summary.lawApplied) {
    parts.push("WARNING: Unified Operating Law breach — an external operation may have bypassed the operating layer.");
  }
  if (summary.overallHealth === "degraded") {
    parts.push("Runtime health degraded — some channels may have elevated latency or reduced reliability.");
  }
  if (summary.overallHealth === "failed") {
    parts.push("CRITICAL: Runtime health failure — operating layer channels are unavailable.");
  }
  return parts.join(" ");
}
