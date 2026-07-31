// ─────────────────────────────────────────────────────────────────────────────
// Build 024: Execution Orchestration Engine — Orchestration Evaluation Engine
// Scores the execution plan across 6 dimensions:
//   assignmentCompleteness | automationReadiness | blockerResolution
//   | policyCompliance | readiness | confidence
// ─────────────────────────────────────────────────────────────────────────────
import type { OrchestrationEvaluation } from "./types";

export function evaluateOrchestration(params: {
  assignmentCount: number;
  workPackageCount: number;
  automatedCount: number;
  manualCount: number;
  deferredCount: number;
  blockerCount: number;
  criticalBlockerCount: number;
  satisfiedPolicies: number;
  totalPolicies: number;
  overallReadinessScore: number;
  executionConfidence: number;
}): OrchestrationEvaluation {
  const {
    assignmentCount,
    workPackageCount,
    automatedCount,
    manualCount,
    deferredCount,
    blockerCount,
    criticalBlockerCount,
    satisfiedPolicies,
    totalPolicies,
    overallReadinessScore,
    executionConfidence,
  } = params;

  // Assignment completeness: all work packages assigned?
  const assignmentCompletenessScore =
    workPackageCount > 0
      ? Math.round(Math.min(1, assignmentCount / workPackageCount) * 100) / 100
      : 0.5;

  // Automation readiness: higher automated ratio → higher score
  const automationReadinessScore =
    assignmentCount > 0
      ? Math.round(((automatedCount * 1.0 + (assignmentCount - automatedCount - deferredCount) * 0.5) / assignmentCount) * 100) / 100
      : 0.5;

  // Blocker resolution: inverted — fewer/less-severe blockers → higher score
  const criticalPenalty = criticalBlockerCount * 0.10;
  const normalPenalty = (blockerCount - criticalBlockerCount) * 0.03;
  const blockerResolutionScore = Math.round(Math.max(0.2, 1 - criticalPenalty - normalPenalty) * 100) / 100;

  // Policy compliance: fraction satisfied
  const policyComplianceScore =
    totalPolicies > 0
      ? Math.round((satisfiedPolicies / totalPolicies) * 100) / 100
      : 0.7;

  // Readiness: directly from readiness engine
  const readinessScore = Math.round(overallReadinessScore * 100) / 100;

  // Confidence: from readiness engine
  const confidenceScore = Math.round(executionConfidence * 100) / 100;

  // Overall: weighted
  const overallScore = Math.round(
    (assignmentCompletenessScore * 0.20 +
      automationReadinessScore * 0.15 +
      blockerResolutionScore * 0.20 +
      policyComplianceScore * 0.15 +
      readinessScore * 0.15 +
      confidenceScore * 0.15) *
      100
  ) / 100;

  const narrative = buildNarrative({
    assignmentCompletenessScore,
    automationReadinessScore,
    blockerResolutionScore,
    policyComplianceScore,
    readinessScore,
    confidenceScore,
    overallScore,
    assignmentCount,
    automatedCount,
    deferredCount,
    criticalBlockerCount,
  });

  return {
    assignmentCompletenessScore,
    automationReadinessScore,
    blockerResolutionScore,
    policyComplianceScore,
    readinessScore,
    confidenceScore,
    overallScore,
    narrative,
  };
}

function buildNarrative(params: {
  assignmentCompletenessScore: number;
  automationReadinessScore: number;
  blockerResolutionScore: number;
  policyComplianceScore: number;
  readinessScore: number;
  confidenceScore: number;
  overallScore: number;
  assignmentCount: number;
  automatedCount: number;
  deferredCount: number;
  criticalBlockerCount: number;
}): string {
  const {
    overallScore,
    assignmentCount,
    automatedCount,
    deferredCount,
    criticalBlockerCount,
    readinessScore,
    confidenceScore,
  } = params;

  const qualityLabel =
    overallScore >= 0.80 ? "strong" : overallScore >= 0.65 ? "solid" : overallScore >= 0.50 ? "developing" : "early-stage";
  const automationPct = assignmentCount > 0 ? Math.round((automatedCount / assignmentCount) * 100) : 0;
  const blockerNote =
    criticalBlockerCount > 0
      ? `${criticalBlockerCount} critical blocker(s) require resolution before execution.`
      : "No critical execution blockers identified.";
  const deferredNote =
    deferredCount > 0
      ? ` ${deferredCount} assignment(s) are deferred pending future capability availability.`
      : "";

  return (
    `This execution orchestration plan represents a ${qualityLabel} foundation for execution. ` +
    `${assignmentCount} work packages have been assigned with an automation ratio of ${automationPct}%. ` +
    `${blockerNote}${deferredNote} ` +
    `Overall readiness: ${Math.round(readinessScore * 100)}%, execution confidence: ${Math.round(confidenceScore * 100)}%.`
  );
}
