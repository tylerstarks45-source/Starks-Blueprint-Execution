// ─────────────────────────────────────────────────────────────────────────────
// Build 023: Operational Planning Engine — Readiness Verification Engine
// Evaluates execution readiness across 5 dimensions:
//   capability | operational | technology | governance | execution_confidence
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type { OperationalReadiness, OperationalReadinessLevel } from "./types";

function scoreToLevel(score: number): OperationalReadinessLevel {
  if (score >= 0.85) return "optimising";
  if (score >= 0.70) return "managed";
  if (score >= 0.55) return "defined";
  if (score >= 0.35) return "developing";
  return "not_ready";
}

function deriveKeyBlocker(params: {
  capabilityScore: number;
  operationalScore: number;
  technologyScore: number;
  governanceScore: number;
  confidenceScore: number;
}): string | undefined {
  const scores = [
    { name: "Capability readiness", score: params.capabilityScore },
    { name: "Operational process readiness", score: params.operationalScore },
    { name: "Technology readiness", score: params.technologyScore },
    { name: "Governance readiness", score: params.governanceScore },
    { name: "Execution confidence", score: params.confidenceScore },
  ];

  const lowest = scores.reduce((a, b) => (a.score < b.score ? a : b));
  if (lowest.score < 0.5) {
    return `${lowest.name} is the primary readiness blocker (score: ${Math.round(lowest.score * 100)}%).`;
  }
  return undefined;
}

function deriveRecommendation(readinessLevel: OperationalReadinessLevel, keyBlocker?: string): string {
  switch (readinessLevel) {
    case "optimising":
      return "All readiness dimensions are strong. Proceed with execution confidence and establish continuous improvement feedback loops.";
    case "managed":
      return "Readiness is well-managed. Address any remaining gaps before full execution commences, particularly in critical capabilities.";
    case "defined":
      return keyBlocker
        ? `Readiness is defined but not yet managed. ${keyBlocker} Resolve this blocker before progressing beyond the foundation phase.`
        : "Readiness is defined but further capability maturation is required before execution begins at scale.";
    case "developing":
      return keyBlocker
        ? `Readiness is still developing. ${keyBlocker} Focus on this dimension before committing to implementation-phase work.`
        : "Readiness is developing. Prioritise capability-building in the preparation and foundation phases before advancing.";
    case "not_ready":
      return "Critical readiness gaps exist. The plan requires significant capability and governance investment before execution can begin.";
  }
}

export function verifyOperationalReadiness(params: {
  planId: string;
  reportId: string;
  businessId: number;
  capabilityReadinessScore: number;  // from capability planning
  workPackageCount: number;
  criticalDependencyCount: number;
  phaseCount: number;
  capabilityConfidence: number;
}): OperationalReadiness {
  const {
    planId,
    reportId,
    businessId,
    capabilityReadinessScore,
    workPackageCount,
    criticalDependencyCount,
    phaseCount,
    capabilityConfidence,
  } = params;

  // Capability readiness: directly from capability planning layer
  const capReadiness = Math.min(1, Math.max(0, capabilityReadinessScore));

  // Operational readiness: derived from work package density and phase coverage
  const packageDensityScore = Math.min(1, workPackageCount / 20); // more packages → more thorough
  const phaseCoverageScore = Math.min(1, phaseCount / 5);
  const operationalReadiness = Math.round(((packageDensityScore * 0.4 + phaseCoverageScore * 0.6)) * 100) / 100;

  // Technology readiness: derived from foundation-phase coverage
  const techReadiness = Math.round((capReadiness * 0.7 + capabilityConfidence * 0.3) * 100) / 100;

  // Governance readiness: derived from preparation phase + compliance
  const critDepPenalty = Math.min(0.3, criticalDependencyCount * 0.05);
  const governanceReadiness = Math.round(Math.max(0.3, capabilityConfidence - critDepPenalty) * 100) / 100;

  // Execution confidence: weighted composite
  const executionConfidence = Math.round(
    (capReadiness * 0.30 + operationalReadiness * 0.25 + techReadiness * 0.20 + governanceReadiness * 0.25) * 100
  ) / 100;

  // Overall readiness: weighted average
  const overallReadiness = Math.round(
    (capReadiness * 0.30 + operationalReadiness * 0.20 + techReadiness * 0.20 + governanceReadiness * 0.15 + executionConfidence * 0.15) * 100
  ) / 100;

  const readinessLevel = scoreToLevel(overallReadiness);
  const keyBlocker = deriveKeyBlocker({
    capabilityScore: capReadiness,
    operationalScore: operationalReadiness,
    technologyScore: techReadiness,
    governanceScore: governanceReadiness,
    confidenceScore: executionConfidence,
  });
  const recommendation = deriveRecommendation(readinessLevel, keyBlocker);

  return {
    id: randomUUID(),
    planId,
    reportId,
    businessId,
    capabilityReadinessScore: capReadiness,
    operationalReadinessScore: operationalReadiness,
    technologyReadinessScore: techReadiness,
    governanceReadinessScore: governanceReadiness,
    executionConfidenceScore: executionConfidence,
    overallReadinessScore: overallReadiness,
    readinessLevel,
    keyBlocker,
    recommendation,
  };
}
