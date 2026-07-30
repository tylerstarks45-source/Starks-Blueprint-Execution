// ─── Build 017: Executive Brain ↔ Opportunity Discovery Integration ───────────
//
// Provides:
//   fetchOpportunitySummary   — compact summary of top opportunities for EB
//   triggerOpportunityRun     — fire-and-forget discovery (throttled)
//   buildOpportunityAdvisory  — converts OpportunityDiscoverySummary → EB text
//
// Opportunity Discovery identifies value.
// Executive Brain reasons over summaries.
// Discovery Engine NEVER performs reasoning.
// Executive Brain NEVER owns opportunity state.

import { fetchOpportunitySummaryForEB, runOpportunityDiscovery } from "../opportunity-discovery/opportunity-orchestrator";
import type { OpportunityDiscoverySummary } from "../opportunity-discovery/types";
import { logger } from "../logger";

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetchOpportunitySummary(userId: number): Promise<OpportunityDiscoverySummary | null> {
  try {
    return await fetchOpportunitySummaryForEB(userId);
  } catch (err) {
    logger.warn({ err }, "Executive Brain: fetchOpportunitySummary failed (non-fatal)");
    return null;
  }
}

// ── Throttled trigger ─────────────────────────────────────────────────────────
// Fires every 50 brain cycles — discovery is expensive, runs less often than analysis.

let discoveryCycleCount = 0;
const DISCOVERY_RUN_EVERY = 50;

export function triggerOpportunityRun(userId: number, businessId: number): void {
  discoveryCycleCount++;
  if (discoveryCycleCount % DISCOVERY_RUN_EVERY !== 0) return;

  void (async () => {
    try {
      await runOpportunityDiscovery(businessId, userId);
    } catch (err) {
      logger.warn({ err }, "Executive Brain: background opportunity discovery failed (non-fatal)");
    }
  })();
}

// ── Advisory ──────────────────────────────────────────────────────────────────

export function buildOpportunityAdvisory(summary: OpportunityDiscoverySummary | null): string | null {
  if (!summary) return null;

  const lines: string[] = [
    `OPPORTUNITIES: ${summary.totalOpportunities} total — ${summary.criticalCount} critical, ${summary.highCount} high priority.`,
  ];

  if (summary.topCategory) {
    lines.push(`Top category: ${summary.topCategory}.`);
  }

  if (summary.highestScore != null) {
    lines.push(`Highest score: ${(summary.highestScore * 100).toFixed(0)}%.`);
  }

  if (summary.topOpportunities.length > 0) {
    const top = summary.topOpportunities[0]!;
    lines.push(`#1 opportunity: "${top.title}" (${top.category}, impact ${(top.businessImpact * 100).toFixed(0)}%, confidence ${(top.confidence * 100).toFixed(0)}%)`);
  }

  if (summary.topOpportunities.length > 1) {
    const rest = summary.topOpportunities.slice(1).map((o) => `"${o.title}" [${o.priorityGroup}]`).join("; ");
    lines.push(`Also: ${rest}`);
  }

  return lines.join("\n");
}
