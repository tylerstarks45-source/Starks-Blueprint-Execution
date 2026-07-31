// ─────────────────────────────────────────────────────────────────────────────
// Build 023: Operational Planning Engine — Operational Evaluation Engine
// Scores the operational plan across 6 dimensions:
//   completeness | feasibility | complexity | risk | readiness | confidence
// ─────────────────────────────────────────────────────────────────────────────
import type { OperationalEvaluation } from "./types";

export function evaluateOperationalPlan(params: {
  phaseCount: number;
  workPackageCount: number;
  dependencyCount: number;
  criticalDependencyCount: number;
  sequenceCount: number;
  overallReadinessScore: number;
  executionConfidenceScore: number;
  capabilityConfidence: number;
}): OperationalEvaluation {
  const {
    phaseCount,
    workPackageCount,
    dependencyCount,
    criticalDependencyCount,
    sequenceCount,
    overallReadinessScore,
    executionConfidenceScore,
    capabilityConfidence,
  } = params;

  // Completeness: how thoroughly the plan covers all phases and work packages
  const phaseCompleteness = Math.min(1, phaseCount / 5);
  const packageCompleteness = Math.min(1, workPackageCount / 15);
  const sequenceCompleteness = sequenceCount > 0 && workPackageCount > 0
    ? Math.min(1, sequenceCount / workPackageCount)
    : 0.5;
  const completenessScore = Math.round((phaseCompleteness * 0.4 + packageCompleteness * 0.35 + sequenceCompleteness * 0.25) * 100) / 100;

  // Feasibility: how achievable is the plan given its complexity and readiness
  const depPenalty = Math.min(0.3, criticalDependencyCount * 0.06);
  const feasibilityScore = Math.round(Math.max(0.3, overallReadinessScore - depPenalty) * 100) / 100;

  // Complexity: inverted — more packages and critical deps → lower score (higher complexity)
  const rawComplexity = (workPackageCount / 30) + (criticalDependencyCount / 10) + (dependencyCount / 20);
  const complexityScore = Math.round(Math.max(0.2, 1 - Math.min(0.7, rawComplexity)) * 100) / 100;

  // Risk: inverted — critical deps and low readiness → lower score (higher risk)
  const riskBase = 1 - (criticalDependencyCount * 0.07) - ((1 - overallReadinessScore) * 0.3);
  const riskScore = Math.round(Math.max(0.2, Math.min(1, riskBase)) * 100) / 100;

  // Readiness: directly from readiness verification
  const readinessScore = Math.round(overallReadinessScore * 100) / 100;

  // Confidence: weighted composite from execution confidence + capability confidence
  const confidenceScore = Math.round(
    (executionConfidenceScore * 0.6 + capabilityConfidence * 0.4) * 100
  ) / 100;

  // Overall: weighted combination
  const overallScore = Math.round(
    (completenessScore * 0.20 +
      feasibilityScore * 0.20 +
      complexityScore * 0.15 +
      riskScore * 0.15 +
      readinessScore * 0.15 +
      confidenceScore * 0.15) *
      100
  ) / 100;

  const narrative = buildNarrative({
    completenessScore,
    feasibilityScore,
    complexityScore,
    riskScore,
    readinessScore,
    confidenceScore,
    overallScore,
    workPackageCount,
    phaseCount,
    criticalDependencyCount,
  });

  return {
    completenessScore,
    feasibilityScore,
    complexityScore,
    riskScore,
    readinessScore,
    confidenceScore,
    overallScore,
    narrative,
  };
}

function buildNarrative(params: {
  completenessScore: number;
  feasibilityScore: number;
  complexityScore: number;
  riskScore: number;
  readinessScore: number;
  confidenceScore: number;
  overallScore: number;
  workPackageCount: number;
  phaseCount: number;
  criticalDependencyCount: number;
}): string {
  const {
    completenessScore,
    feasibilityScore,
    complexityScore,
    riskScore,
    readinessScore,
    confidenceScore,
    overallScore,
    workPackageCount,
    phaseCount,
    criticalDependencyCount,
  } = params;

  const qualityLabel = overallScore >= 0.80 ? "strong" : overallScore >= 0.65 ? "solid" : overallScore >= 0.50 ? "developing" : "early-stage";
  const completenessNote = completenessScore >= 0.75 ? "comprehensive coverage" : "partial coverage";
  const riskNote = criticalDependencyCount > 0
    ? `${criticalDependencyCount} critical dependencies require early resolution`
    : "no critical dependencies identified";
  const feasibilityNote = feasibilityScore >= 0.70 ? "feasible" : "requires readiness improvement before execution";

  return (
    `This operational plan represents a ${qualityLabel} foundation for execution. ` +
    `Across ${phaseCount} phases and ${workPackageCount} work packages, the plan achieves ${completenessNote} (${Math.round(completenessScore * 100)}%). ` +
    `Execution is ${feasibilityNote} (feasibility: ${Math.round(feasibilityScore * 100)}%). ` +
    `${riskNote.charAt(0).toUpperCase() + riskNote.slice(1)}. ` +
    `Overall readiness is ${Math.round(readinessScore * 100)}% with execution confidence at ${Math.round(confidenceScore * 100)}%.`
  );
}
