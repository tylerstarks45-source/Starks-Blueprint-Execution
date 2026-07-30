// ─── Build 015: Executive Brain ↔ Business Graph Integration ─────────────────
//
// Provides:
//   fetchBusinessSummary    — reads primary business graph for this user
//   triggerGraphRefresh     — fire-and-forget refresh (async, throttled)
//   buildBusinessAdvisory   — converts BusinessGraphSummary into context note fragment
//
// Executive Brain receives business-aware context.
// Business Graph NEVER performs reasoning.
// Executive Brain NEVER owns business state.
// Strict separation.

import { getGraphSummaryForEB, refreshBusinessGraph } from "../business-graph/business-orchestrator";
import { buildBizContextAdvisory } from "../business-graph/business-context";
import type { BusinessGraphSummary } from "../business-graph/types";
import { logger } from "../logger";

// ── Fetch summary ─────────────────────────────────────────────────────────────

export async function fetchBusinessSummary(userId: number): Promise<BusinessGraphSummary | null> {
  try {
    return await getGraphSummaryForEB(userId);
  } catch (err) {
    logger.warn({ err }, "Executive Brain: fetchBusinessSummary failed (non-fatal)");
    return null;
  }
}

// ── Fire-and-forget graph refresh ─────────────────────────────────────────────
// Throttled to every 30 brain cycles.

let bizCycleCount = 0;
const BIZ_REFRESH_EVERY = 30;

export function triggerGraphRefresh(userId: number): void {
  bizCycleCount++;
  if (bizCycleCount % BIZ_REFRESH_EVERY !== 0) return;

  void refreshBusinessGraph(userId, userId).catch((err) => {
    logger.warn({ err }, "Executive Brain: background graph refresh failed (non-fatal)");
  });
}

// ── Advisory text ─────────────────────────────────────────────────────────────

export function buildBusinessAdvisory(summary: BusinessGraphSummary | null): string | null {
  return buildBizContextAdvisory(summary);
}
