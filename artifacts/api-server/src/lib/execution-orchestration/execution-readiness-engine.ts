// ─────────────────────────────────────────────────────────────────────────────
// Build 024: Execution Orchestration Engine — Execution Readiness Engine
// Measures readiness across 5 dimensions:
//   operational | capability | policy | dependency | overall
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type { ExecutionReadinessResult, ExecutionReadinessLevel, ExecutionAssignment, ExecutionPolicy } from "./types";

function scoreToLevel(score: number): ExecutionReadinessLevel {
  if (score >= 0.85) return "optimising";
  if (score >= 0.70) return "managed";
  if (score >= 0.55) return "defined";
  if (score >= 0.35) return "developing";
  return "not_ready";
}

function deriveKeyBlocker(scores: Record<string, number>): string | undefined {
  const entries = Object.entries(scores);
  const lowest = entries.reduce((a, b) => (a[1] < b[1] ? a : b));
  if (lowest[1] < 0.5) {
    return `${lowest[0]} is the primary execution readiness blocker (score: ${Math.round(lowest[1] * 100)}%).`;
  }
  return undefined;
}

function buildRecommendation(level: ExecutionReadinessLevel, keyBlocker?: string): string {
  switch (level) {
    case "optimising":
      return "Execution readiness is excellent. All assignments are well-positioned for execution. Proceed with confidence.";
    case "managed":
      return "Execution readiness is strong. Resolve any pending policy approvals and integration confirmations before commencing.";
    case "defined":
      return keyBlocker
        ? `Execution readiness is defined but not fully managed. ${keyBlocker} Address this before full execution commences.`
        : "Execution readiness is defined. Confirm all capability, policy, and resource requirements before execution.";
    case "developing":
      return keyBlocker
        ? `Execution readiness is still developing. ${keyBlocker} Significant preparation is required before execution can safely begin.`
        : "Execution readiness is developing. Focus on resolving critical blockers and policy gaps before proceeding.";
    case "not_ready":
      return "Execution is not ready. Critical blockers, missing capabilities, or violated policies must be resolved before any execution commences.";
  }
}

export function measureExecutionReadiness(params: {
  planId: string;
  reportId: string;
  businessId: number;
  assignments: ExecutionAssignment[];
  policies: ExecutionPolicy[];
  operationalReadinessScore: number;
  capabilityReadinessScore: number;
}): ExecutionReadinessResult {
  const { planId, reportId, businessId, assignments, policies, operationalReadinessScore, capabilityReadinessScore } = params;

  // Operational readiness: from upstream operational planning layer
  const operationalScore = Math.min(1, Math.max(0, operationalReadinessScore));

  // Capability readiness: from upstream capability planning layer
  const capabilityScore = Math.min(1, Math.max(0, capabilityReadinessScore));

  // Policy readiness: fraction of satisfied + non-violated policies
  const totalPolicies = policies.length;
  const satisfiedPolicies = policies.filter((p) => p.policyStatus === "satisfied").length;
  const violatedPolicies = policies.filter((p) => p.policyStatus === "violated").length;
  const policyScore =
    totalPolicies > 0
      ? Math.round(((satisfiedPolicies - violatedPolicies * 2) / totalPolicies) * 100) / 100
      : 0.7;
  const cappedPolicyScore = Math.min(1, Math.max(0.1, policyScore));

  // Dependency readiness: fraction of assignments with no critical blockers
  const criticalBlockerAssignments = assignments.filter((a) =>
    a.blockers.some((b) => b.severity === "critical")
  ).length;
  const depScore =
    assignments.length > 0
      ? Math.round(Math.max(0.1, 1 - (criticalBlockerAssignments / assignments.length) * 1.5) * 100) / 100
      : 0.7;

  // Overall: weighted composite
  const overallScore = Math.round(
    (operationalScore * 0.25 + capabilityScore * 0.25 + cappedPolicyScore * 0.25 + depScore * 0.25) * 100
  ) / 100;

  const readinessLevel = scoreToLevel(overallScore);
  const keyBlocker = deriveKeyBlocker({
    "Operational readiness": operationalScore,
    "Capability readiness": capabilityScore,
    "Policy readiness": cappedPolicyScore,
    "Dependency readiness": depScore,
  });
  const recommendation = buildRecommendation(readinessLevel, keyBlocker);

  return {
    id: randomUUID(),
    planId,
    reportId,
    businessId,
    operationalReadinessScore: operationalScore,
    capabilityReadinessScore: capabilityScore,
    policyReadinessScore: cappedPolicyScore,
    dependencyReadinessScore: depScore,
    overallReadinessScore: overallScore,
    readinessLevel,
    executionConfidence: Math.round((overallScore * 0.7 + capabilityScore * 0.3) * 100) / 100,
    keyBlocker,
    recommendation,
  };
}
