// ─────────────────────────────────────────────────────────────────────────────
// Build 025: Authority Resolution Engine — Authority Evaluation Engine
// 6-dimension scoring: coverage · completeness · risk · trust · readiness · confidence
// Produces an AuthorityEvaluation with an overall score and narrative.
// ─────────────────────────────────────────────────────────────────────────────
import type { AuthorityEvaluation, AuthorityRequirement, AuthorityDecision } from "./types";

interface EvaluationInput {
  requirements: AuthorityRequirement[];
  decisions: AuthorityDecision[];
  grantedCount: number;
  pendingCount: number;
  deniedCount: number;
  missingCount: number;
  approvalRequiredCount: number;
  totalRequirements: number;
  scopeCount: number;
  dependencyCount: number;
}

// ── Coverage: proportion of requirements that have any resolution (not unavailable) ─────────
function computeCoverageScore(input: EvaluationInput): number {
  if (input.totalRequirements === 0) return 1.0;
  const covered = input.totalRequirements - input.requirements.filter((r) => r.status === "unavailable").length;
  return Math.min(1, covered / input.totalRequirements);
}

// ── Completeness: proportion of requirements that are granted (fully authorized) ─────────────
function computeCompletenessScore(input: EvaluationInput): number {
  if (input.totalRequirements === 0) return 1.0;
  return Math.min(1, input.grantedCount / input.totalRequirements);
}

// ── Risk: inverse of the proportion of high/critical-risk requirements ─────────────────────
function computeRiskScore(input: EvaluationInput): number {
  if (input.totalRequirements === 0) return 1.0;
  const highRiskCount = input.requirements.filter(
    (r) => r.riskLevel === "high" || r.riskLevel === "critical"
  ).length;
  // Lower high-risk → higher risk score (score = safety, not danger)
  return Math.max(0, 1 - highRiskCount / input.totalRequirements);
}

// ── Trust: proportion of decisions that are "authorized" (no pending approval needed) ────────
function computeTrustScore(input: EvaluationInput): number {
  if (input.decisions.length === 0) return 0.5;
  const authorizedDecisions = input.decisions.filter((d) => d.decisionType === "authorized").length;
  return Math.min(1, authorizedDecisions / input.decisions.length);
}

// ── Readiness: penalise by approval requirements and missing authorities ─────────────────────
function computeReadinessScore(input: EvaluationInput): number {
  if (input.totalRequirements === 0) return 1.0;
  const approvalPenalty = (input.approvalRequiredCount * 0.10);
  const missingPenalty = (input.missingCount * 0.20);
  return Math.max(0, 1 - approvalPenalty - missingPenalty);
}

// ── Confidence: average decision confidence ───────────────────────────────────────────────────
function computeConfidenceScore(input: EvaluationInput): number {
  if (input.decisions.length === 0) return 0.5;
  const totalConf = input.decisions.reduce((s, d) => s + d.confidence, 0);
  return Math.min(1, totalConf / input.decisions.length);
}

function buildNarrative(
  coverage: number,
  completeness: number,
  risk: number,
  trust: number,
  readiness: number,
  confidence: number,
  overall: number
): string {
  const grade =
    overall >= 0.85 ? "strong" :
    overall >= 0.70 ? "adequate" :
    overall >= 0.50 ? "partial" : "insufficient";

  return (
    `Authority resolution: ${grade} (${Math.round(overall * 100)}%). ` +
    `Coverage ${Math.round(coverage * 100)}%, completeness ${Math.round(completeness * 100)}%, ` +
    `risk safety ${Math.round(risk * 100)}%, trust ${Math.round(trust * 100)}%, ` +
    `readiness ${Math.round(readiness * 100)}%, confidence ${Math.round(confidence * 100)}%. ` +
    (overall < 0.70
      ? "Unresolved authorities must be addressed before execution can be safely authorized."
      : "Authority posture is sufficient to proceed with execution under normal governance controls.")
  );
}

export function evaluateAuthority(input: EvaluationInput): AuthorityEvaluation {
  const coverage = computeCoverageScore(input);
  const completeness = computeCompletenessScore(input);
  const risk = computeRiskScore(input);
  const trust = computeTrustScore(input);
  const readiness = computeReadinessScore(input);
  const confidence = computeConfidenceScore(input);

  // Equal weights across 6 dimensions
  const overall = (coverage + completeness + risk + trust + readiness + confidence) / 6;

  return {
    coverageScore: coverage,
    completenessScore: completeness,
    riskScore: risk,
    trustScore: trust,
    readinessScore: readiness,
    confidenceScore: confidence,
    overallScore: Math.round(overall * 1000) / 1000,
    narrative: buildNarrative(coverage, completeness, risk, trust, readiness, confidence, overall),
  };
}
