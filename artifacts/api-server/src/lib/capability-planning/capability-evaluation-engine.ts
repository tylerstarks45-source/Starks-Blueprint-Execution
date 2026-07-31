// ─────────────────────────────────────────────────────────────────────────────
// Build 022: Capability Planning Engine — Capability Evaluation Engine
// 6-dimension scoring: coverage, completeness, readiness, business impact,
// risk (inverted), confidence. All deterministic.
// ─────────────────────────────────────────────────────────────────────────────
import type { CapabilityEvaluation } from "./types";

interface EvalInput {
  domainCount: number;
  requirementCount: number;
  gapCount: number;
  criticalGapCount: number;
  missingCapabilityCount: number;
  overallReadinessScore: number;
  overallMaturityScore: number;
  planningConfidence: number;
  strategyConfidence: number;
  dependencyCount: number;
}

// Weights: coverage(0.15) | completeness(0.20) | readiness(0.25) |
//          businessImpact(0.15) | risk(0.15) | confidence(0.10)
const W = { coverage: 0.15, completeness: 0.20, readiness: 0.25, businessImpact: 0.15, risk: 0.15, confidence: 0.10 };

function clamp(v: number): number {
  return Math.round(Math.max(0, Math.min(1, v)) * 100) / 100;
}

export function evaluateCapabilityPlan(input: EvalInput): CapabilityEvaluation {
  const {
    domainCount, requirementCount, gapCount, criticalGapCount,
    missingCapabilityCount, overallReadinessScore, overallMaturityScore,
    planningConfidence, strategyConfidence, dependencyCount,
  } = input;

  // Coverage: domains identified as % of 16 possible
  const coverageScore = clamp(domainCount / 16);

  // Completeness: requirements per domain (expect ~5 per domain)
  const expectedReqs = domainCount * 5;
  const completenessScore = clamp(requirementCount / Math.max(expectedReqs, 1));

  // Readiness: directly from domain readiness average
  const readinessScore = clamp(overallReadinessScore);

  // Business Impact: derived from maturity + coverage
  const businessImpactScore = clamp(overallMaturityScore * 0.6 + coverageScore * 0.4);

  // Risk (inverted): fewer critical gaps + fewer missing = lower risk
  const critGapPenalty = Math.min(criticalGapCount * 0.05, 0.35);
  const missingPenalty = Math.min(missingCapabilityCount * 0.04, 0.25);
  const depPenalty = Math.min(dependencyCount * 0.02, 0.15);
  const riskScore = clamp(planningConfidence * 0.40 + overallReadinessScore * 0.35 - critGapPenalty - missingPenalty - depPenalty + 0.25);

  // Confidence: composite
  const confidenceScore = clamp(
    coverageScore * 0.15 + completenessScore * 0.20 + readinessScore * 0.25 +
    businessImpactScore * 0.15 + riskScore * 0.15 + strategyConfidence * 0.10,
  );

  const overallScore = clamp(
    coverageScore * W.coverage + completenessScore * W.completeness + readinessScore * W.readiness +
    businessImpactScore * W.businessImpact + riskScore * W.risk + confidenceScore * W.confidence,
  );

  const qualityLabel = overallScore >= 0.75 ? "strong" : overallScore >= 0.55 ? "adequate" : "developing";
  const gapNote = criticalGapCount > 0
    ? ` ${criticalGapCount} critical capability gaps require priority investment.`
    : missingCapabilityCount > 0
    ? ` ${missingCapabilityCount} capabilities must be built from scratch.`
    : " No critical gaps identified.";
  const narrative =
    `Capability plan quality is ${qualityLabel} (overall: ${Math.round(overallScore * 100)}%). ` +
    `${domainCount} domains assessed, ${requirementCount} requirements, ${gapCount} gaps.` +
    gapNote;

  return {
    coverageScore,
    completenessScore,
    readinessScore,
    businessImpactScore,
    riskScore,
    confidenceScore,
    overallScore,
    narrative,
  };
}
