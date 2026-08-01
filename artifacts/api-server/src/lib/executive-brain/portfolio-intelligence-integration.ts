import { buildPortfolioIntelligenceSummary, runPortfolioPlatformRebuild } from "../portfolio-intelligence/epi-orchestrator";
import type { PortfolioIntelligenceSummary } from "../portfolio-intelligence/types";

// ── EB throttle state ─────────────────────────────────────────────────────
let epiCycleCount = 0;
const EPI_THROTTLE_CYCLES = 260;

// ── Fetch summary for EB context ──────────────────────────────────────────
export async function fetchPortfolioIntelligenceSummary(
  _userId: number,
): Promise<PortfolioIntelligenceSummary | null> {
  try {
    return await buildPortfolioIntelligenceSummary();
  } catch {
    return null;
  }
}

// ── Throttled background rebuild ──────────────────────────────────────────
export function triggerPortfolioIntelligenceRebuild(_userId: number): void {
  epiCycleCount++;
  if (epiCycleCount % EPI_THROTTLE_CYCLES !== 0) return;
  runPortfolioPlatformRebuild("scheduled").catch(() => {/* fail-open */});
}

// ── Advisory for buildContextNote ─────────────────────────────────────────
export function buildPortfolioIntelligenceAdvisory(
  summary: PortfolioIntelligenceSummary | null,
): string | null {
  if (!summary || summary.totalPortfolios === 0) return null;

  const parts: string[] = [
    `[PortfolioIntelligence] ${summary.totalPortfolios} portfolio(s), ${summary.totalInitiatives} initiative(s). Avg health: ${(summary.averageHealthScore * 100).toFixed(0)}%. Balance: ${(summary.averageBalanceScore * 100).toFixed(0)}%. Portfolio Law compliance: ${(summary.portfolioLawCompliance * 100).toFixed(0)}%.`,
  ];

  if (summary.overcommittedPortfolios > 0) {
    parts.push(`⚠️ ${summary.overcommittedPortfolios} portfolio(s) OVERCOMMITTED on resources.`);
  }
  if (summary.criticalExposures > 0) {
    parts.push(`${summary.criticalExposures} critical risk exposure(s) detected across portfolios.`);
  }
  if (summary.highPriorityRecs > 0) {
    parts.push(`${summary.highPriorityRecs} high-priority portfolio recommendation(s) pending action.`);
  }
  if (summary.topRisk) {
    parts.push(`Top risk: ${summary.topRisk}.`);
  }
  if (summary.topOpportunity) {
    parts.push(`Top opportunity: ${summary.topOpportunity}.`);
  }

  const recent = summary.portfolioSummaries.slice(0, 3);
  if (recent.length > 0) {
    const recStr = recent.map(p =>
      `"${p.title}"(${(p.overallScore * 100).toFixed(0)}%${p.overcommitted ? ",⚠️OC" : ""})`
    ).join("; ");
    parts.push(`Portfolios: ${recStr}.`);
  }

  const advisory = parts.join(" ");
  return advisory.length > 600 ? advisory.slice(0, 599) + "…" : advisory;
}
