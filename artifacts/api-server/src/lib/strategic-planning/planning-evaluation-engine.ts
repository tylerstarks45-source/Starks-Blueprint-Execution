// ─────────────────────────────────────────────────────────────────────────────
// Build 021: Strategic Planning Engine — Planning Evaluation Engine
// 6-dimension scoring: completeness, feasibility, alignment, complexity,
// risk, confidence. All deterministic.
// ─────────────────────────────────────────────────────────────────────────────
import type { PlanningEvaluation } from "./types";

interface EvaluationInput {
  programCount: number;
  initiativeCount: number;
  milestoneCount: number;
  dependencyCount: number;
  criticalDependencyCount: number;
  sequenceCount: number;
  readinessScore: number;         // 0-1 overall readiness
  strategyAlignmentScore: number; // 0-1 from executive strategy
  strategyConfidence: number;     // 0-1 from executive strategy
  constraintCount: number;        // from strategy constraints
}

// ── Weight table ──────────────────────────────────────────────────────────────
// completeness: 0.15 | feasibility: 0.25 | alignment: 0.20 |
// complexity(inverted): 0.10 | risk(inverted): 0.15 | confidence: 0.15
const WEIGHTS = {
  completeness: 0.15,
  feasibility: 0.25,
  alignment: 0.20,
  complexity: 0.10,  // higher score = lower complexity = better
  risk: 0.15,        // higher score = lower risk = better
  confidence: 0.15,
};

function clamp(v: number): number {
  return Math.round(Math.max(0, Math.min(1, v)) * 100) / 100;
}

export function evaluatePlan(input: EvaluationInput): PlanningEvaluation {
  const {
    programCount,
    initiativeCount,
    milestoneCount,
    dependencyCount,
    criticalDependencyCount,
    readinessScore,
    strategyAlignmentScore,
    strategyConfidence,
    constraintCount,
  } = input;

  // ── Completeness: programs × initiatives × milestones coverage ─────────────
  const programCoverage = Math.min(programCount / 5, 1);          // expect 5+ programs
  const initiativeCoverage = Math.min(initiativeCount / 12, 1);   // expect 12+ initiatives
  const milestoneCoverage = Math.min(milestoneCount / 24, 1);     // expect 24+ milestones
  const completeness = clamp((programCoverage * 0.30 + initiativeCoverage * 0.40 + milestoneCoverage * 0.30));

  // ── Feasibility: derived from readiness ────────────────────────────────────
  const feasibility = clamp(readinessScore * 0.75 + strategyConfidence * 0.25);

  // ── Alignment: from strategy alignment + dependency coverage ───────────────
  const depCoverage = Math.min(dependencyCount / 6, 1);
  const alignment = clamp(strategyAlignmentScore * 0.75 + depCoverage * 0.25);

  // ── Complexity: inverted — more initiatives/sequences = more complex ───────
  // score of 1 = least complex (simple plan), 0 = most complex (very large plan)
  const rawComplexity = Math.min(initiativeCount / 20, 1);
  const complexity = clamp(1 - rawComplexity * 0.6 - (constraintCount / 10) * 0.4);

  // ── Risk: inverted — fewer critical deps + lower constraint count = lower risk
  const critDepPenalty = Math.min(criticalDependencyCount * 0.06, 0.30);
  const constraintPenalty = Math.min(constraintCount * 0.03, 0.20);
  const risk = clamp(strategyConfidence * 0.50 + readinessScore * 0.30 - critDepPenalty - constraintPenalty + 0.20);

  // ── Confidence: composite of all dimensions ────────────────────────────────
  const confidence = clamp(
    completeness * 0.15 +
    feasibility * 0.25 +
    alignment * 0.20 +
    complexity * 0.10 +
    risk * 0.15 +
    strategyConfidence * 0.15,
  );

  // ── Overall weighted score ──────────────────────────────────────────────────
  const overallScore = clamp(
    completeness * WEIGHTS.completeness +
    feasibility * WEIGHTS.feasibility +
    alignment * WEIGHTS.alignment +
    complexity * WEIGHTS.complexity +
    risk * WEIGHTS.risk +
    confidence * WEIGHTS.confidence,
  );

  // ── Narrative ──────────────────────────────────────────────────────────────
  const qualityLabel = overallScore >= 0.80 ? "strong" : overallScore >= 0.65 ? "adequate" : "developing";
  const feasibilityNote = feasibility < 0.60 ? " Feasibility is the primary concern — readiness gaps must be addressed." : "";
  const alignmentNote = alignment >= 0.75 ? " Alignment with executive strategy is strong." : " Strategy alignment should be confirmed before programme launch.";
  const narrative =
    `Strategic plan quality is ${qualityLabel} (overall: ${Math.round(overallScore * 100)}%). ` +
    `${programCount} programmes, ${initiativeCount} initiatives, ${milestoneCount} milestones.` +
    feasibilityNote + alignmentNote;

  return {
    completenessScore: completeness,
    feasibilityScore: feasibility,
    alignmentScore: alignment,
    complexityScore: complexity,
    riskScore: risk,
    confidenceScore: confidence,
    overallScore,
    narrative,
  };
}
