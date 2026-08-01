// ─────────────────────────────────────────────────────────────────────────────
// Build 030: Universal Execution Adapter Framework — Executive Brain Bridge
// Throttle: every 180 brain cycles.
// Fail-open: any error here must never block the EB request path.
// ─────────────────────────────────────────────────────────────────────────────
import { buildFrameworkSummary } from "../adapter-framework/adapter-orchestrator";
import type { AdapterFrameworkSummary } from "../adapter-framework/types";

const ADAPTER_SCAN_EVERY_N_CYCLES = 180;
const cycleCounts = new Map<number, number>();

const logger = { warn: console.warn.bind(console) };

/**
 * Fetch the current adapter framework summary for the Executive Brain.
 */
export async function fetchAdapterFrameworkSummary(userId: number): Promise<AdapterFrameworkSummary | null> {
  try {
    return await buildFrameworkSummary();
  } catch (err) {
    logger.warn({ err }, "EB adapter-framework-integration: fetch failed (fail-open)");
    return null;
  }
}

/**
 * Trigger a background framework scan every ADAPTER_SCAN_EVERY_N_CYCLES EB cycles.
 * Fire-and-forget — never awaited on the critical path.
 */
export function triggerAdapterFrameworkScan(userId: number): void {
  const prev = cycleCounts.get(userId) ?? 0;
  const next = prev + 1;
  cycleCounts.set(userId, next);

  if (next % ADAPTER_SCAN_EVERY_N_CYCLES !== 0) return;

  buildFrameworkSummary().catch((err) => {
    logger.warn({ err }, "EB adapter-framework-integration: background scan failed (fail-open)");
  });
}

/**
 * Build a compact advisory string for the EB context note.
 */
export function buildAdapterFrameworkAdvisory(summary: AdapterFrameworkSummary | null): string | null {
  if (!summary) return null;

  const coveragePct = Math.round(summary.capabilityCoverage * 100);
  const recommended = summary.recommendedAdapterTypes.slice(0, 3).join(", ");

  return (
    `[Adapters] ${summary.enabledAdapters}/${summary.totalAdapters} adapters enabled. ` +
    `Healthy: ${summary.healthyAdapters}, degraded: ${summary.degradedAdapters}, failed: ${summary.failedAdapters}. ` +
    `Capability coverage: ${coveragePct}%. ` +
    (recommended ? `Recommended next: ${recommended}.` : "Full coverage achieved.")
  );
}
