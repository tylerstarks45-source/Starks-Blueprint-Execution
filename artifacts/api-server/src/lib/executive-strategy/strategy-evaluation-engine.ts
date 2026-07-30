// ─── Build 020: Strategy Evaluation Engine ───────────────────────────────────
//
// Scores the strategy on 6 dimensions:
// completeness, alignment, risk, business value,
// long-term sustainability, strategic confidence.
// Deterministic — no AI, no mutation.

import type {
  StrategicPillar,
  StrategicDependency,
  StrategicConstraint,
  StrategyFormationInput,
  StrategyEvaluation,
} from "./types";

function clamp(v: number): number { return Math.max(0, Math.min(1, v)); }

export function evaluateStrategy(
  input: StrategyFormationInput,
  pillars: StrategicPillar[],
  dependencies: StrategicDependency[],
  constraints: StrategicConstraint[],
  alignmentScore: number,
): StrategyEvaluation {
  // 1. Completeness — based on number of pillars and objectives
  const totalObjectives = pillars.reduce((s, p) => s + p.objectives.length, 0);
  const completenessScore = clamp(
    (pillars.length / 6) * 0.5 + Math.min(1, totalObjectives / 12) * 0.5,
  );

  // 2. Alignment — from the alignment engine
  const alignmentScoreNorm = clamp(alignmentScore);

  // 3. Risk — weighted combination of decision risk and constraint severity
  const blockingConstraints = constraints.filter((c) => c.impact === "blocking").length;
  const highConstraints = constraints.filter((c) => c.impact === "high").length;
  const highDependencies = dependencies.filter((d) => d.severity === "high" || d.severity === "critical").length;
  const riskScore = clamp(
    input.riskScore * 0.5 +
    (blockingConstraints * 0.15 + highConstraints * 0.05 + highDependencies * 0.05),
  );

  // 4. Business Value — from decision expected value and growth potential
  const businessValueScore = clamp(
    input.expectedValueScore * 0.55 + input.growthPotential * 0.30 + input.automationPotential * 0.15,
  );

  // 5. Sustainability — long-horizon pillars + risk-adjusted confidence
  const longHorizonPillars = pillars.filter((_, i) => i >= 3).length;
  const sustainabilityScore = clamp(
    (1 - input.riskScore) * 0.45 +
    (longHorizonPillars / Math.max(1, pillars.length)) * 0.30 +
    input.growthPotential * 0.25,
  );

  // 6. Confidence — blended from decision confidence, alignment, and completeness
  const confidenceScore = clamp(
    input.confidenceScore  * 0.40 +
    alignmentScoreNorm     * 0.30 +
    completenessScore      * 0.20 +
    (1 - riskScore)        * 0.10,
  );

  // Overall
  const overallScore = clamp(
    completenessScore  * 0.15 +
    alignmentScoreNorm * 0.25 +
    (1 - riskScore)    * 0.15 +
    businessValueScore * 0.25 +
    sustainabilityScore * 0.10 +
    confidenceScore    * 0.10,
  );

  const evaluationNarrative = buildNarrative(
    completenessScore, alignmentScoreNorm, riskScore,
    businessValueScore, sustainabilityScore, confidenceScore,
  );

  return {
    completenessScore,
    alignmentScore: alignmentScoreNorm,
    riskScore,
    businessValueScore,
    sustainabilityScore,
    confidenceScore,
    overallScore,
    evaluationNarrative,
  };
}

function buildNarrative(
  completeness: number,
  alignment: number,
  risk: number,
  value: number,
  sustainability: number,
  confidence: number,
): string {
  const level = confidence >= 0.80 ? "High" : confidence >= 0.60 ? "Moderate" : "Low";
  const valueNote = value >= 0.75 ? "strong" : value >= 0.55 ? "moderate" : "developing";
  const riskNote = risk > 0.65 ? " Risk levels are elevated and should be monitored closely." : "";
  return (
    `${level} confidence strategy (${(confidence * 100).toFixed(0)}%). ` +
    `Business value potential is ${valueNote} (${(value * 100).toFixed(0)}%). ` +
    `Alignment score: ${(alignment * 100).toFixed(0)}%, ` +
    `completeness: ${(completeness * 100).toFixed(0)}%, ` +
    `sustainability: ${(sustainability * 100).toFixed(0)}%.` +
    riskNote
  );
}
