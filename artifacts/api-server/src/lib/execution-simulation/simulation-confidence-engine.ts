// ─────────────────────────────────────────────────────────────────────────────
// Build 027: Execution Simulation Engine — Simulation Confidence Engine
// Scores: prediction confidence, data completeness, historical similarity,
// determinism, uncertainty.
// ─────────────────────────────────────────────────────────────────────────────
import type { SimulationConfidence } from "./types";

interface ConfidenceInput {
  ownerType:            string;
  executionClass:       string;
  complexityLevel:      string;
  businessCriticality:  string;
  hasRiskData:          boolean; // whether risk assessment data was available
  hasAuthorityData:     boolean; // whether authority resolution data was available
  scenarioCount:        number;
}

// Base prediction confidence by execution class
const CLASS_PREDICTION_CONFIDENCE: Record<string, number> = {
  automated: 0.85, ai_driven: 0.70, human: 0.60, external: 0.50, hybrid: 0.68,
};

// Data completeness boost when upstream analysis is available
const DATA_COMPLETENESS_SCORES: (hasRisk: boolean, hasAuth: boolean) => number =
  (hasRisk, hasAuth) => {
    if (hasRisk && hasAuth) return 0.90;
    if (hasRisk || hasAuth) return 0.70;
    return 0.50;
  };

// Historical similarity by owner type (how similar to known execution patterns)
const HISTORICAL_SIMILARITY: Record<string, number> = {
  ai_agent: 0.65, automation: 0.80, human: 0.75, department: 0.72,
  integration: 0.70, external_system: 0.40, future_capability: 0.30,
};

// Determinism by execution class
const DETERMINISM_SCORES: Record<string, number> = {
  automated: 0.90, ai_driven: 0.55, human: 0.45, external: 0.35, hybrid: 0.65,
};

// Complexity uncertainty penalty
const COMPLEXITY_UNCERTAINTY: Record<string, number> = {
  low: 0.10, medium: 0.20, high: 0.35, very_high: 0.50, extreme: 0.70,
};

export function scoreSimulationConfidence(input: ConfidenceInput): SimulationConfidence {
  const predictionConfidence = Math.round(
    (CLASS_PREDICTION_CONFIDENCE[input.executionClass] ?? 0.65) * 1000
  ) / 1000;

  const dataCompleteness = Math.round(
    DATA_COMPLETENESS_SCORES(input.hasRiskData, input.hasAuthorityData) * 1000
  ) / 1000;

  const historicalSimilarity = Math.round(
    (HISTORICAL_SIMILARITY[input.ownerType] ?? 0.60) * 1000
  ) / 1000;

  const determinism = Math.round(
    (DETERMINISM_SCORES[input.executionClass] ?? 0.60) * 1000
  ) / 1000;

  const uncertaintyScore = Math.round(
    Math.min(0.95, COMPLEXITY_UNCERTAINTY[input.complexityLevel] ?? 0.20) * 1000
  ) / 1000;

  // Weighted composite: prediction(35%) + data(25%) + similarity(15%) + determinism(25%)
  const overallConfidence = Math.round((
    predictionConfidence * 0.35 +
    dataCompleteness * 0.25 +
    historicalSimilarity * 0.15 +
    determinism * 0.25
  ) * 1000) / 1000;

  const confidenceNarrative =
    `Confidence ${Math.round(overallConfidence * 100)}% ` +
    `(prediction: ${Math.round(predictionConfidence * 100)}%, ` +
    `data: ${Math.round(dataCompleteness * 100)}%, ` +
    `determinism: ${Math.round(determinism * 100)}%). ` +
    `Uncertainty: ${Math.round(uncertaintyScore * 100)}% from '${input.complexityLevel}' complexity.`;

  return {
    predictionConfidence,
    dataCompleteness,
    historicalSimilarity,
    determinism,
    uncertaintyScore,
    overallConfidence,
    confidenceNarrative,
  };
}
