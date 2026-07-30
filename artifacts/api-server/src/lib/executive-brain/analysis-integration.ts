// ─── Build 016: Executive Brain ↔ Business Analysis Integration ──────────────
//
// Provides:
//   fetchAnalysisSummary    — reads latest analysis for the user's primary business
//   buildAnalysisAdvisory   — converts BusinessAnalysisSummary into EB context text
//   triggerAnalysisRun      — fire-and-forget analysis (throttled every 40 cycles)
//
// Business Analysis explains business reality.
// Executive Brain reasons over analysis summaries.
// Analysis Engine NEVER performs reasoning.
// Executive Brain NEVER owns analysis state.

import { fetchAnalysisSummaryForEB, runBusinessAnalysis } from "../business-analysis/analysis-orchestrator";
import { buildAnalysisSummaryForEB } from "../business-analysis/report-engine";
import type { BusinessAnalysisSummary, BusinessAnalysisReport } from "../business-analysis/types";
import { logger } from "../logger";

// ── Fetch summary ─────────────────────────────────────────────────────────────

export async function fetchAnalysisSummary(userId: number): Promise<BusinessAnalysisSummary | null> {
  try {
    return await fetchAnalysisSummaryForEB(userId);
  } catch (err) {
    logger.warn({ err }, "Executive Brain: fetchAnalysisSummary failed (non-fatal)");
    return null;
  }
}

// ── Fire-and-forget analysis trigger ─────────────────────────────────────────
// Throttled to every 40 brain cycles to avoid expensive analysis on every request.

let analysisCycleCount = 0;
const ANALYSIS_RUN_EVERY = 40;

export function triggerAnalysisRun(userId: number, businessId: number): void {
  analysisCycleCount++;
  if (analysisCycleCount % ANALYSIS_RUN_EVERY !== 0) return;

  void (async () => {
    try {
      await runBusinessAnalysis(businessId, userId);
    } catch (err) {
      logger.warn({ err }, "Executive Brain: background analysis run failed (non-fatal)");
    }
  })();
}

// ── Advisory text for EB context note ────────────────────────────────────────

export function buildAnalysisAdvisory(summary: BusinessAnalysisSummary | null): string | null {
  if (!summary) return null;

  const lines: string[] = [
    `BUSINESS ANALYSIS: maturity=${(summary.maturityScore * 100).toFixed(0)}% complexity=${(summary.complexityScore * 100).toFixed(0)}% stability=${(summary.stabilityScore * 100).toFixed(0)}% confidence=${(summary.confidence * 100).toFixed(0)}%`,
  ];

  if (summary.criticalFindings > 0) {
    lines.push(`CRITICAL: ${summary.criticalFindings} critical finding${summary.criticalFindings > 1 ? "s" : ""}.`);
  }

  if (summary.topBottleneck) {
    lines.push(`Top bottleneck: ${summary.topBottleneck.title} (${(summary.topBottleneck.severity * 100).toFixed(0)}% severity)`);
  }

  if (summary.topConstraint) {
    lines.push(`Top constraint: ${summary.topConstraint.title}`);
  }

  if (summary.topLeverage) {
    lines.push(`Top leverage: ${summary.topLeverage.title} (score: ${(summary.topLeverage.leverageScore * 100).toFixed(0)}%)`);
  }

  if (summary.weakestDimension) {
    lines.push(`Weakest health dimension: ${summary.weakestDimension}`);
  }

  return lines.join("\n");
}
