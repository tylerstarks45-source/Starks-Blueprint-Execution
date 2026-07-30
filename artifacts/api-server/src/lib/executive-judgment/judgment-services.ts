// ─── Shared Judgment Services (Build 007) ────────────────────────────────────
//
// Reusable services that every Brain can call to access judgment capabilities.
// No Brain owns Judgment — Judgment belongs to the Cognitive Operating System.
//
// Services:
//   evaluateJudgment       — main evaluation (from engine)
//   compareOptions         — pure comparison without persistence (from engine)
//   assessRisk             — risk assessment for an existing judgment
//   assessOpportunity      — opportunity assessment for an existing judgment
//   explainRecommendation  — retrieve and format the explanation for a judgment
//   getJudgmentHistory     — paginated history of past judgments
//   getJudgmentDiagnostics — health and quality diagnostics

import { logger } from "../logger";
import { getJudgment, listJudgments } from "./judgment-engine";
import type {
  ExecutiveJudgment,
  JudgmentDiagnosticsReport,
  JudgmentHealthScore,
  JudgmentExplanation,
} from "./types";

export { evaluateJudgment, getJudgment, listJudgments, compareOptions } from "./judgment-engine";

// ─── Risk Assessment ──────────────────────────────────────────────────────────

export interface RiskAssessment {
  judgmentId: string;
  selectedOptionKey: string | null;
  riskScore: number | null;
  riskLevel: "critical" | "high" | "medium" | "low" | "unknown";
  riskDrivers: string[];
  mitigationSuggestions: string[];
}

/** Assess the risk profile of the selected option in a judgment. */
export function assessRisk(judgment: ExecutiveJudgment): RiskAssessment {
  const selectedOption = judgment.options.find((o) => o.wasSelected);
  const riskScore = selectedOption?.rawScores.risk ?? judgment.riskScore ?? null;

  const riskLevel =
    riskScore === null ? "unknown" :
    riskScore >= 80 ? "critical" :
    riskScore >= 60 ? "high" :
    riskScore >= 40 ? "medium" : "low";

  // Risk drivers: dimensions that contribute most to risk
  const riskDrivers: string[] = [];
  if (selectedOption) {
    if (selectedOption.rawScores.risk >= 60) {
      riskDrivers.push(`High inherent risk score (${selectedOption.rawScores.risk}/100)`);
    }
    if (selectedOption.rawScores.reversibility < 40) {
      riskDrivers.push(`Low reversibility (${selectedOption.rawScores.reversibility}/100) — hard to undo`);
    }
    if (selectedOption.rawScores.confidence < 50) {
      riskDrivers.push(`Low confidence (${selectedOption.rawScores.confidence}/100) — uncertain outcome`);
    }
    if (selectedOption.rawScores.complexity >= 70) {
      riskDrivers.push(`High complexity (${selectedOption.rawScores.complexity}/100) — execution risk`);
    }
  }
  if (riskDrivers.length === 0) riskDrivers.push("No specific risk drivers identified");

  // Generic mitigation suggestions based on risk level
  const mitigationSuggestions: string[] = [];
  if (riskLevel === "critical" || riskLevel === "high") {
    mitigationSuggestions.push("Consider a phased rollout to limit exposure");
    mitigationSuggestions.push("Define explicit rollback criteria before proceeding");
    mitigationSuggestions.push("Validate key assumptions with stakeholders before committing");
  } else if (riskLevel === "medium") {
    mitigationSuggestions.push("Monitor early signals and establish review checkpoints");
    mitigationSuggestions.push("Document assumptions for retrospective review");
  } else {
    mitigationSuggestions.push("Standard monitoring appropriate — no heightened mitigation required");
  }

  return {
    judgmentId: judgment.id,
    selectedOptionKey: judgment.selectedOptionKey,
    riskScore,
    riskLevel,
    riskDrivers,
    mitigationSuggestions,
  };
}

// ─── Opportunity Assessment ───────────────────────────────────────────────────

export interface OpportunityAssessment {
  judgmentId: string;
  selectedOptionKey: string | null;
  opportunityScore: number | null;
  opportunityLevel: "exceptional" | "high" | "moderate" | "limited" | "unknown";
  opportunityDrivers: string[];
  captureActions: string[];
}

/** Assess the opportunity profile of the selected option in a judgment. */
export function assessOpportunity(judgment: ExecutiveJudgment): OpportunityAssessment {
  const selectedOption = judgment.options.find((o) => o.wasSelected);
  const opportunityScore = judgment.opportunityScore;

  const opportunityLevel =
    opportunityScore === null ? "unknown" :
    opportunityScore >= 70 ? "exceptional" :
    opportunityScore >= 50 ? "high" :
    opportunityScore >= 30 ? "moderate" : "limited";

  const opportunityDrivers: string[] = [];
  if (selectedOption) {
    if (selectedOption.rawScores.expectedImpact >= 70) {
      opportunityDrivers.push(`High expected impact (${selectedOption.rawScores.expectedImpact}/100)`);
    }
    if (selectedOption.rawScores.strategicValue >= 70) {
      opportunityDrivers.push(`Strong strategic value (${selectedOption.rawScores.strategicValue}/100)`);
    }
    if (selectedOption.rawScores.urgency >= 70) {
      opportunityDrivers.push(`High urgency (${selectedOption.rawScores.urgency}/100) — time-sensitive window`);
    }
  }
  if (opportunityDrivers.length === 0) {
    opportunityDrivers.push("Incremental opportunity — value accumulates over time");
  }

  const captureActions: string[] = [];
  if (opportunityLevel === "exceptional" || opportunityLevel === "high") {
    captureActions.push("Prioritise allocation of resources to this option immediately");
    captureActions.push("Establish success metrics and tracking before launch");
  } else if (opportunityLevel === "moderate") {
    captureActions.push("Sequence this work alongside higher-impact priorities");
  } else {
    captureActions.push("Re-evaluate opportunity if context changes significantly");
  }

  return {
    judgmentId: judgment.id,
    selectedOptionKey: judgment.selectedOptionKey,
    opportunityScore,
    opportunityLevel,
    opportunityDrivers,
    captureActions,
  };
}

// ─── Explanation retrieval ────────────────────────────────────────────────────

/** Retrieve and return the structured explanation for a judgment. */
export async function explainRecommendation(
  judgmentId: string,
): Promise<JudgmentExplanation | null> {
  const judgment = await getJudgment(judgmentId);
  if (!judgment) return null;
  return judgment.explanation;
}

// ─── History ──────────────────────────────────────────────────────────────────

/** Return the judgment history for a user (most recent first). */
export async function getJudgmentHistory(
  userId: number,
  limit = 20,
): Promise<ExecutiveJudgment[]> {
  return listJudgments(userId, limit);
}

// ─── Diagnostics & Health ─────────────────────────────────────────────────────

/** Compute a health score for one judgment. */
function scoreJudgmentHealth(judgment: ExecutiveJudgment): JudgmentHealthScore {
  const explanation = judgment.explanation;

  // Explanation completeness: how many fields of the explanation are non-empty
  const expFields = explanation
    ? [
        explanation.selectionReason ? 1 : 0,
        explanation.topStrengths.length > 0 ? 1 : 0,
        explanation.alternativeRejections.length > 0 ? 1 : 0,
        explanation.confidenceNarrative ? 1 : 0,
        explanation.evidenceCited.length > 0 ? 1 : 0,
      ].reduce((a, b) => a + b, 0) / 5
    : 0;
  const explanationCompleteness = Math.round(expFields * 100);

  // Confidence quality: how high was the confidence score
  const confidenceQuality =
    judgment.confidenceScore !== null ? Math.round(judgment.confidenceScore) : 0;

  // Evidence quality: how many evidence items were cited
  const evidenceQuality = Math.min(100, judgment.supportingEvidence.length * 20);

  // Alternative coverage: were multiple options considered?
  const alternativeCoverage = Math.min(100,
    (judgment.alternativeRankings.length >= 2 ? 100 :
     judgment.alternativeRankings.length === 1 ? 50 : 0));

  // Score consistency: are the scores plausible (non-trivial variance)?
  const scores = Object.values(judgment.compositeScores);
  const scoreConsistency = scores.length >= 2
    ? Math.min(100, Math.round(
        (1 - Math.abs(Math.max(...scores) - Math.min(...scores)) / 100) * 100
      ))
    : 50;

  // Decision traceability: does it have a context snapshot and objective?
  const decisionTraceability =
    (judgment.relatedContextSnapshotId ? 50 : 0) +
    (judgment.decisionObjective ? 50 : 0);

  const overallHealth = Math.round(
    explanationCompleteness * 0.25 +
    confidenceQuality * 0.20 +
    evidenceQuality * 0.15 +
    alternativeCoverage * 0.20 +
    scoreConsistency * 0.10 +
    decisionTraceability * 0.10,
  );

  return {
    judgmentId: judgment.id,
    decisionObjective: judgment.decisionObjective,
    explanationCompleteness,
    confidenceQuality,
    evidenceQuality,
    alternativeCoverage,
    scoreConsistency,
    decisionTraceability,
    overallHealth,
  };
}

/** Return full diagnostics for a user's judgment history. */
export async function getJudgmentDiagnostics(
  userId: number,
): Promise<JudgmentDiagnosticsReport> {
  const judgments = await listJudgments(userId, 100);
  const completed = judgments.filter((j) => j.status === "completed");

  const scores = judgments.map(scoreJudgmentHealth);
  const avgHealth =
    scores.length > 0
      ? Math.round(scores.reduce((s, h) => s + h.overallHealth, 0) / scores.length)
      : 0;

  const avgDecision =
    completed.length > 0 && completed.some((j) => j.decisionScore !== null)
      ? Math.round(
          completed.reduce((s, j) => s + (j.decisionScore ?? 0), 0) / completed.length,
        )
      : 0;

  const avgConfidence =
    completed.length > 0 && completed.some((j) => j.confidenceScore !== null)
      ? Math.round(
          completed.reduce((s, j) => s + (j.confidenceScore ?? 0), 0) / completed.length,
        )
      : 0;

  const issues: string[] = [];
  if (completed.length === 0) {
    issues.push("No completed judgments yet — the Executive Judgment Engine has not been exercised");
  }
  for (const score of scores) {
    if (score.explanationCompleteness < 60) {
      issues.push(`Judgment "${score.decisionObjective.slice(0, 50)}" has incomplete explanation`);
    }
    if (score.alternativeCoverage < 50) {
      issues.push(`Judgment "${score.decisionObjective.slice(0, 50)}" evaluated only one option`);
    }
  }

  return {
    userId,
    totalJudgments: judgments.length,
    completedJudgments: completed.length,
    averageDecisionScore: avgDecision,
    averageConfidenceScore: avgConfidence,
    averageHealth: avgHealth,
    judgmentScores: scores,
    issues,
    assessedAt: new Date(),
  };
}
