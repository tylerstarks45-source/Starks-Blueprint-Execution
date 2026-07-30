// ─── Build 016: Health Analysis Engine ───────────────────────────────────────
//
// Consumes the BusinessHealth object from Build 015's Health Engine.
// Produces: trends, weakest/strongest dimension, stability, drift, confidence.
// No recalculation. No graph access. Pure.

import type { BusinessHealth } from "../business-graph/types";
import type { HealthAnalysisResult } from "./types";

const DIMENSION_KEYS: Array<keyof Pick<BusinessHealth,
  "financialHealth" | "marketingHealth" | "salesHealth" | "operationalHealth" |
  "productHealth" | "growthHealth" | "executiveHealth">> = [
  "financialHealth", "marketingHealth", "salesHealth",
  "operationalHealth", "productHealth", "growthHealth", "executiveHealth",
];

const DIMENSION_LABELS: Record<string, string> = {
  financialHealth: "Financial",
  marketingHealth: "Marketing",
  salesHealth: "Sales",
  operationalHealth: "Operational",
  productHealth: "Product",
  growthHealth: "Growth",
  executiveHealth: "Executive",
};

export function analyzeHealth(
  health: BusinessHealth | null,
  previousHealth: BusinessHealth | null,
): HealthAnalysisResult {
  if (!health) {
    return {
      overallHealth: 0,
      weakestDimension: "unknown",
      weakestScore: 0,
      strongestDimension: "unknown",
      strongestScore: 0,
      healthStability: 0,
      healthDrift: "unknown",
      healthConfidence: 0,
      dimensionScores: {},
      criticalDimensions: [],
      warningDimensions: [],
      healthyDimensions: [],
    };
  }

  // Build dimension score map
  const dimensionScores: Record<string, number> = {};
  for (const key of DIMENSION_KEYS) {
    const label = DIMENSION_LABELS[key]!;
    dimensionScores[label] = parseFloat((health[key] as number).toFixed(3));
  }

  const entries = Object.entries(dimensionScores);
  const scores = entries.map(([, v]) => v);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);

  const weakestEntry = entries.find(([, v]) => v === minScore)!;
  const strongestEntry = entries.find(([, v]) => v === maxScore)!;

  // Stability: 1 - (spread between min and max)
  const stability = parseFloat((1 - (maxScore - minScore)).toFixed(3));

  // Drift: compare overall health vs previous
  let drift: HealthAnalysisResult["healthDrift"] = "unknown";
  if (previousHealth) {
    const delta = health.overallHealth - previousHealth.overallHealth;
    if (Math.abs(delta) < 0.02) drift = "stable";
    else drift = delta > 0 ? "improving" : "declining";
  } else {
    drift = "stable"; // no history = assume stable
  }

  // Confidence: based on how many nodes/KPIs fed into health
  const nodeConfidence = Math.min(1, health.nodeCount / 10);
  const kpiConfidence = Math.min(1, health.kpiCount / 5);
  const confidence = parseFloat(((nodeConfidence * 0.6 + kpiConfidence * 0.4)).toFixed(3));

  // Categorize dimensions
  const criticalDimensions = entries.filter(([, v]) => v < 0.4).map(([k]) => k);
  const warningDimensions = entries.filter(([, v]) => v >= 0.4 && v < 0.6).map(([k]) => k);
  const healthyDimensions = entries.filter(([, v]) => v >= 0.6).map(([k]) => k);

  return {
    overallHealth: health.overallHealth,
    weakestDimension: weakestEntry[0]!,
    weakestScore: weakestEntry[1]!,
    strongestDimension: strongestEntry[0]!,
    strongestScore: strongestEntry[1]!,
    healthStability: stability,
    healthDrift: drift,
    healthConfidence: confidence,
    dimensionScores,
    criticalDimensions,
    warningDimensions,
    healthyDimensions,
  };
}
