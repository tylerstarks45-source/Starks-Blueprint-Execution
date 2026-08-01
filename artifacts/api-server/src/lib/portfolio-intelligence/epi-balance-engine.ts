// ── EPI Balance Intelligence Engine ──────────────────────────────────────
// Measures portfolio balance across 5 dimensions:
//   Strategic | Execution | Technology | Business | Operational
// Portfolio Optimization Law: local gains must never reduce overall portfolio performance.
// Pure computation — no I/O.

import type {
  PortfolioInitiativeInput,
  InvestmentBucket,
  Horizon,
  StrategicTheme,
  BalanceResult,
} from "./types";
import {
  computeBucketRatios,
  computeHorizonRatios,
  computeThemeRatios,
  computeTypeRatios,
} from "./epi-construction-engine";

// Gini coefficient: 0=perfect equality, 1=maximum concentration
function giniCoefficient(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  let numerator = 0;
  for (let i = 0; i < n; i++) numerator += (2 * (i + 1) - n - 1) * sorted[i];
  const denominator = n * sorted.reduce((s, v) => s + v, 0);
  return denominator === 0 ? 0 : Math.abs(numerator / denominator);
}

// Balance score from a ratio distribution (1=even spread, 0=concentrated)
function balanceFromRatios(ratios: Record<string, number>): number {
  const values = Object.values(ratios);
  const gini = giniCoefficient(values);
  return Math.round((1 - gini) * 1000) / 1000;
}

// Strategic balance: maintain/innovate/grow/infrastructure spread
// Ideal: ~30% maintain, ~25% innovate, ~25% grow, ~20% infrastructure
function computeStrategicBalance(initiatives: PortfolioInitiativeInput[]): { score: number; warnings: string[] } {
  const ratios = computeBucketRatios(initiatives);
  const score = balanceFromRatios(ratios);
  const warnings: string[] = [];

  if ((ratios.maintain ?? 0) > 0.60) warnings.push(`Maintenance-heavy portfolio: ${(ratios.maintain * 100).toFixed(0)}% of initiatives are maintain — innovation may stagnate.`);
  if ((ratios.innovate ?? 0) > 0.55) warnings.push(`Innovation-heavy portfolio: ${(ratios.innovate * 100).toFixed(0)}% are innovation — stability may suffer.`);
  if ((ratios.infrastructure ?? 0) < 0.05 && initiatives.length > 5) warnings.push("No infrastructure investment detected — foundation may degrade over time.");
  if ((ratios.grow ?? 0) < 0.10 && initiatives.length > 5) warnings.push("Minimal growth investment — portfolio may be under-investing in scale.");

  return { score, warnings };
}

// Execution balance: short/medium/long horizon spread
function computeExecutionBalance(initiatives: PortfolioInitiativeInput[]): { score: number; warnings: string[] } {
  const ratios = computeHorizonRatios(initiatives);
  const score = balanceFromRatios(ratios);
  const warnings: string[] = [];

  if ((ratios.short ?? 0) > 0.70) warnings.push(`Short-term overload: ${(ratios.short * 100).toFixed(0)}% of initiatives are short-horizon — long-term competitiveness at risk.`);
  if ((ratios.long ?? 0) > 0.60) warnings.push(`Long-horizon heavy: ${(ratios.long * 100).toFixed(0)}% of initiatives are long — near-term delivery may suffer.`);

  return { score, warnings };
}

// Technology balance: spread across types
function computeTechnologyBalance(initiatives: PortfolioInitiativeInput[]): { score: number; warnings: string[] } {
  const typeRatios = computeTypeRatios(initiatives);
  const score = balanceFromRatios(typeRatios as Record<string, number>);
  const warnings: string[] = [];

  const techRatio = typeRatios.technology ?? 0;
  if (techRatio > 0.70) warnings.push(`Technology-concentrated portfolio: ${(techRatio * 100).toFixed(0)}% of initiatives are technology — business and operational coverage is thin.`);

  return { score, warnings };
}

// Business balance: alignment distribution and risk spread
function computeBusinessBalance(initiatives: PortfolioInitiativeInput[]): { score: number; warnings: string[] } {
  const alignments = initiatives.map(i => i.strategicAlignment);
  const avgAlignment = alignments.length > 0 ? alignments.reduce((s, v) => s + v, 0) / alignments.length : 0;
  const warnings: string[] = [];

  if (avgAlignment < 0.50) warnings.push(`Low average strategic alignment (${(avgAlignment * 100).toFixed(0)}%) — many initiatives may not serve primary strategy.`);

  const highRisk = initiatives.filter(i => i.riskLevel === "high" || i.riskLevel === "critical").length;
  const riskRatio = initiatives.length > 0 ? highRisk / initiatives.length : 0;
  if (riskRatio > 0.50) warnings.push(`High-risk concentration: ${(riskRatio * 100).toFixed(0)}% of initiatives are high or critical risk.`);

  const score = Math.round(((avgAlignment + (1 - riskRatio)) / 2) * 1000) / 1000;
  return { score, warnings };
}

// Operational balance: theme spread + no single-theme dominance
function computeOperationalBalance(initiatives: PortfolioInitiativeInput[]): { score: number; warnings: string[] } {
  const themeRatios = computeThemeRatios(initiatives);
  const score = balanceFromRatios(themeRatios as Record<string, number>);
  const warnings: string[] = [];

  const [topTheme, topRatio] = Object.entries(themeRatios).sort((a, b) => (b[1] as number) - (a[1] as number))[0] ?? [];
  if (topRatio as number > 0.60) warnings.push(`Single-theme dominance: "${topTheme}" accounts for ${((topRatio as number) * 100).toFixed(0)}% of the portfolio.`);

  return { score, warnings };
}

export function computePortfolioBalance(initiatives: PortfolioInitiativeInput[]): BalanceResult {
  const strategic  = computeStrategicBalance(initiatives);
  const execution  = computeExecutionBalance(initiatives);
  const technology = computeTechnologyBalance(initiatives);
  const business   = computeBusinessBalance(initiatives);
  const operational= computeOperationalBalance(initiatives);

  const allWarnings = [
    ...strategic.warnings,
    ...execution.warnings,
    ...technology.warnings,
    ...business.warnings,
    ...operational.warnings,
  ];

  const overallBalance = Math.round(
    (strategic.score + execution.score + technology.score + business.score + operational.score) / 5 * 1000
  ) / 1000;

  const bucketRatios = computeBucketRatios(initiatives);
  const horizonRatios = computeHorizonRatios(initiatives);
  const themeRatios = computeThemeRatios(initiatives);

  const balanceExplanation = [
    `Portfolio balance: ${(overallBalance * 100).toFixed(0)}% across 5 dimensions.`,
    `Strategic: ${(strategic.score * 100).toFixed(0)}% | Execution: ${(execution.score * 100).toFixed(0)}% | Technology: ${(technology.score * 100).toFixed(0)}% | Business: ${(business.score * 100).toFixed(0)}% | Operational: ${(operational.score * 100).toFixed(0)}%.`,
    allWarnings.length > 0 ? `${allWarnings.length} balance warning(s) detected.` : "No critical balance issues detected.",
  ].join(" ");

  return {
    strategicBalance:   strategic.score,
    executionBalance:   execution.score,
    technologyBalance:  technology.score,
    businessBalance:    business.score,
    operationalBalance: operational.score,
    overallBalance,
    bucketRatios,
    horizonRatios,
    themeRatios,
    balanceExplanation,
    balanceWarnings: allWarnings,
  };
}
