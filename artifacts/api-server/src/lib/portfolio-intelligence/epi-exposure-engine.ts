// ── EPI Exposure Intelligence Engine ─────────────────────────────────────
// Detects risk concentrations:
//   Single-point dependency | Vendor concentration | Execution concentration
//   Technology concentration | Financial concentration | Strategic concentration
// Pure computation — no I/O.

import type { PortfolioInitiativeInput, ExposureResult, ExposureType } from "./types";
import { computeBucketRatios, computeTypeRatios, buildDependencyMap } from "./epi-construction-engine";

// Single-point dependency: initiative(s) that everything else depends on
function detectSinglePointDependency(initiatives: PortfolioInitiativeInput[]): ExposureResult | null {
  const dependents = buildDependencyMap(initiatives);
  const criticalBlockers: string[] = [];

  for (const [key, deps] of dependents.entries()) {
    if (deps.length >= Math.max(2, Math.floor(initiatives.length * 0.30))) {
      criticalBlockers.push(key);
    }
  }

  if (criticalBlockers.length === 0) return null;

  const ratio = criticalBlockers.length / initiatives.length;
  const names = criticalBlockers.map(k => initiatives.find(i => i.key === k)?.title ?? k).slice(0, 3);

  return {
    exposureType: "single-point-dependency",
    severity: criticalBlockers.length >= 2 ? "critical" : "high",
    affectedInitiatives: criticalBlockers,
    concentrationRatio: Math.round(ratio * 1000) / 1000,
    description: `${criticalBlockers.length} initiative(s) are single-point dependencies blocking ≥30% of the portfolio: ${names.join(", ")}.`,
    mitigation: "Decouple dependencies by introducing abstraction layers or parallel execution paths.",
    exposureScore: Math.min(1.0, ratio * 2),
  };
}

// Execution concentration: too many initiatives in one type domain
function detectExecutionConcentration(initiatives: PortfolioInitiativeInput[]): ExposureResult | null {
  const typeRatios = computeTypeRatios(initiatives);
  const [topType, topRatio] = Object.entries(typeRatios).sort((a, b) => (b[1] as number) - (a[1] as number))[0] ?? [];

  if (!topType || (topRatio as number) < 0.60) return null;

  const affected = initiatives.filter(i => i.type === topType).map(i => i.key);

  return {
    exposureType: "execution-concentration",
    severity: (topRatio as number) > 0.80 ? "critical" : "high",
    affectedInitiatives: affected,
    concentrationRatio: Math.round((topRatio as number) * 1000) / 1000,
    description: `${((topRatio as number) * 100).toFixed(0)}% of initiatives are in "${topType}" domain — execution bottleneck risk.`,
    mitigation: "Diversify initiative types to reduce single-domain execution risk.",
    exposureScore: Math.round(Math.min(1.0, (topRatio as number)) * 1000) / 1000,
  };
}

// Technology concentration: many initiatives depend on the same underlying technology
function detectTechnologyConcentration(initiatives: PortfolioInitiativeInput[]): ExposureResult | null {
  const techInitiatives = initiatives.filter(i => i.type === "technology" || i.type === "infrastructure");
  if (techInitiatives.length < 3) return null;

  const techRatio = techInitiatives.length / initiatives.length;
  if (techRatio < 0.60) return null;

  return {
    exposureType: "technology-concentration",
    severity: techRatio > 0.75 ? "high" : "medium",
    affectedInitiatives: techInitiatives.map(i => i.key),
    concentrationRatio: Math.round(techRatio * 1000) / 1000,
    description: `${(techRatio * 100).toFixed(0)}% of portfolio is technology-dependent — platform risk concentration.`,
    mitigation: "Introduce non-technology (business, operational) initiatives to diversify platform dependency.",
    exposureScore: Math.round(Math.min(1.0, techRatio) * 1000) / 1000,
  };
}

// Financial concentration: single initiative consuming disproportionate budget
function detectFinancialConcentration(initiatives: PortfolioInitiativeInput[]): ExposureResult | null {
  const active = initiatives.filter(i => i.status !== "completed");
  if (active.length < 2) return null;

  const totalBudget = active.reduce((s, i) => s + (i.resourceDemand.budget ?? 0), 0);
  if (totalBudget === 0) return null;

  const top = [...active].sort((a, b) => (b.resourceDemand.budget ?? 0) - (a.resourceDemand.budget ?? 0))[0];
  const topShare = (top?.resourceDemand.budget ?? 0) / totalBudget;

  if (topShare < 0.50) return null;

  return {
    exposureType: "financial-concentration",
    severity: topShare > 0.75 ? "critical" : "high",
    affectedInitiatives: [top.key],
    concentrationRatio: Math.round(topShare * 1000) / 1000,
    description: `"${top.title}" consumes ${(topShare * 100).toFixed(0)}% of total portfolio budget — single initiative financial risk.`,
    mitigation: "Spread budget allocation more evenly or phase the high-cost initiative to reduce single-point financial exposure.",
    exposureScore: Math.round(Math.min(1.0, topShare) * 1000) / 1000,
  };
}

// Strategic concentration: portfolio over-indexed on one strategic theme
function detectStrategicConcentration(initiatives: PortfolioInitiativeInput[]): ExposureResult | null {
  if (initiatives.length < 4) return null;

  const themeCounts: Record<string, string[]> = {};
  for (const i of initiatives) {
    if (!themeCounts[i.theme]) themeCounts[i.theme] = [];
    themeCounts[i.theme].push(i.key);
  }

  const [topTheme, topKeys] = Object.entries(themeCounts).sort((a, b) => b[1].length - a[1].length)[0] ?? [];
  const topRatio = (topKeys?.length ?? 0) / initiatives.length;

  if (topRatio < 0.60) return null;

  return {
    exposureType: "strategic-concentration",
    severity: topRatio > 0.75 ? "high" : "medium",
    affectedInitiatives: topKeys ?? [],
    concentrationRatio: Math.round(topRatio * 1000) / 1000,
    description: `${(topRatio * 100).toFixed(0)}% of initiatives share "${topTheme}" strategic theme — strategic mono-culture risk.`,
    mitigation: "Introduce initiatives from complementary strategic themes to hedge strategic direction risk.",
    exposureScore: Math.round(Math.min(1.0, topRatio) * 1000) / 1000,
  };
}

// Vendor concentration: high dependency depth (chain length)
function detectVendorConcentration(initiatives: PortfolioInitiativeInput[]): ExposureResult | null {
  const withExternal = initiatives.filter(i => (i.dependencies ?? []).length >= 3);
  if (withExternal.length < 2) return null;

  const ratio = withExternal.length / initiatives.length;
  if (ratio < 0.40) return null;

  return {
    exposureType: "vendor-concentration",
    severity: ratio > 0.60 ? "high" : "medium",
    affectedInitiatives: withExternal.map(i => i.key),
    concentrationRatio: Math.round(ratio * 1000) / 1000,
    description: `${withExternal.length} initiative(s) have 3+ external dependencies — vendor/supply chain concentration risk.`,
    mitigation: "Identify and document external dependencies; build fallback paths for critical vendor relationships.",
    exposureScore: Math.round(Math.min(1.0, ratio * 1.5) * 1000) / 1000,
  };
}

export function detectAllExposures(initiatives: PortfolioInitiativeInput[]): ExposureResult[] {
  const detectors = [
    detectSinglePointDependency,
    detectExecutionConcentration,
    detectTechnologyConcentration,
    detectFinancialConcentration,
    detectStrategicConcentration,
    detectVendorConcentration,
  ];

  return detectors
    .map(fn => fn(initiatives))
    .filter((r): r is ExposureResult => r !== null)
    .sort((a, b) => b.exposureScore - a.exposureScore);
}

// Composite exposure score: worst-case weighted mean across detected exposures
export function computeCompositeExposureScore(exposures: ExposureResult[]): number {
  if (exposures.length === 0) return 0;
  const criticalWeight = 2.0;
  const highWeight = 1.5;

  let weightedSum = 0;
  let totalWeight = 0;
  for (const e of exposures) {
    const w = e.severity === "critical" ? criticalWeight : e.severity === "high" ? highWeight : 1.0;
    weightedSum += e.exposureScore * w;
    totalWeight += w;
  }
  return Math.round(Math.min(1.0, weightedSum / (totalWeight || 1)) * 1000) / 1000;
}
