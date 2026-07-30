// ─── Quality Assessment Engine (Build 012) ───────────────────────────────────
//
// Scores 8 dimensions of executive quality deterministically.
// Every score is explained.
// No AI. No inference beyond recorded evidence.
// Pure computation.

import type {
  CaseTimelineEvent,
  QualityScoreResult,
  QualityAssessment,
  ScoreDimension,
  ExecutiveCase,
} from "./types";

// ── Score dimension weights (for overall score) ────────────────────────────────

const DIMENSION_WEIGHTS: Record<ScoreDimension, number> = {
  decision_quality:    0.20,
  planning_quality:    0.15,
  execution_quality:   0.20,
  consistency:         0.10,
  goal_alignment:      0.15,
  strategic_alignment: 0.10,
  resource_efficiency: 0.05,
  evidence_quality:    0.05,
};

// ── Individual dimension scorers ──────────────────────────────────────────────

function scoreDecisionQuality(events: CaseTimelineEvent[]): QualityScoreResult {
  const judgmentEvents = events.filter((e) => e.eventCategory === "judgment");
  const reasoningEvents = events.filter((e) => e.eventCategory === "reasoning");
  const total = judgmentEvents.length + reasoningEvents.length;

  if (total === 0) {
    return {
      dimension: "decision_quality",
      score: 0.4,
      explanation: "No judgment or reasoning events recorded — decision quality cannot be fully assessed",
      evidenceCount: 0,
    };
  }

  // Higher score when both judgment AND reasoning events are present
  const score = Math.min(1.0,
    0.5
    + (judgmentEvents.length > 0 ? 0.25 : 0)
    + (reasoningEvents.length > 0 ? 0.25 : 0),
  );
  return {
    dimension: "decision_quality",
    score: Math.round(score * 1000) / 1000,
    explanation: `${reasoningEvents.length} reasoning event(s) and ${judgmentEvents.length} judgment event(s) recorded`,
    evidenceCount: total,
  };
}

function scorePlanningQuality(
  events: CaseTimelineEvent[],
  completionStatus: string,
): QualityScoreResult {
  const planEvents = events.filter((e) => e.eventCategory === "planning");
  const generated = planEvents.filter((e) => e.eventType.includes("generated")).length;
  const approved  = planEvents.filter((e) => e.eventType.includes("approved")).length;

  if (planEvents.length === 0) {
    return {
      dimension: "planning_quality",
      score: 0.3,
      explanation: "No planning events recorded — planning quality cannot be assessed",
      evidenceCount: 0,
    };
  }

  let score = 0.5;
  if (approved > 0) score += 0.2;
  if (generated === 1) score += 0.2;                    // one plan = clear direction
  if (generated > 2) score -= 0.1;                      // many plans = difficulty
  if (completionStatus === "completed") score += 0.1;
  if (completionStatus === "failed") score -= 0.2;

  return {
    dimension: "planning_quality",
    score: Math.min(1.0, Math.max(0.0, Math.round(score * 1000) / 1000)),
    explanation: `${generated} plan(s) generated, ${approved} approved; case outcome: ${completionStatus}`,
    evidenceCount: planEvents.length,
  };
}

function scoreExecutionQuality(
  events: CaseTimelineEvent[],
  completionStatus: string,
): QualityScoreResult {
  const execEvents = events.filter((e) => e.eventCategory === "execution");
  const failures   = execEvents.filter((e) => e.eventType.includes("failed")).length;
  const retries    = execEvents.filter((e) => e.eventType.includes("retry")).length;
  const completed  = execEvents.filter((e) => e.eventType.includes("completed")).length;

  if (execEvents.length === 0) {
    return {
      dimension: "execution_quality",
      score: 0.3,
      explanation: "No execution events recorded",
      evidenceCount: 0,
    };
  }

  let score = 0.5;
  if (failures === 0) score += 0.2;
  if (retries === 0) score += 0.15;
  if (completed > 0) score += 0.15;
  score -= failures * 0.1;
  score -= retries * 0.05;
  if (completionStatus === "completed") score += 0.1;
  if (completionStatus === "failed") score -= 0.3;

  return {
    dimension: "execution_quality",
    score: Math.min(1.0, Math.max(0.0, Math.round(score * 1000) / 1000)),
    explanation: `${completed} completion(s), ${failures} failure(s), ${retries} retry event(s); outcome: ${completionStatus}`,
    evidenceCount: execEvents.length,
  };
}

function scoreConsistency(events: CaseTimelineEvent[]): QualityScoreResult {
  const categories = new Set(events.map((e) => e.eventCategory));
  const expectedFlow = ["reasoning", "goal", "planning", "execution"];
  const presentExpected = expectedFlow.filter((c) => categories.has(c as any));

  // Penalise for missing intermediate steps
  const score = Math.min(1.0, 0.3 + presentExpected.length * 0.175);

  return {
    dimension: "consistency",
    score: Math.round(score * 1000) / 1000,
    explanation: `${presentExpected.length}/${expectedFlow.length} expected pipeline stages present: ${presentExpected.join(", ")}`,
    evidenceCount: events.length,
  };
}

function scoreGoalAlignment(
  events: CaseTimelineEvent[],
  completionStatus: string,
): QualityScoreResult {
  const goalEvents  = events.filter((e) => e.eventCategory === "goal");
  const execSuccess = completionStatus === "completed";
  const execFailed  = completionStatus === "failed";

  if (goalEvents.length === 0) {
    return {
      dimension: "goal_alignment",
      score: 0.3,
      explanation: "No goal events recorded — goal alignment cannot be assessed",
      evidenceCount: 0,
    };
  }

  let score = 0.5;
  if (execSuccess) score += 0.4;
  if (execFailed) score -= 0.3;
  if (goalEvents.length > 0) score += 0.1;

  return {
    dimension: "goal_alignment",
    score: Math.min(1.0, Math.max(0.0, Math.round(score * 1000) / 1000)),
    explanation: `${goalEvents.length} goal event(s); execution ${execSuccess ? "succeeded" : execFailed ? "failed" : "in progress"}`,
    evidenceCount: goalEvents.length,
  };
}

function scoreStrategicAlignment(
  ec: ExecutiveCase,
  events: CaseTimelineEvent[],
): QualityScoreResult {
  const hasStrategy = !!ec.strategicCategory;
  const hasDomain   = !!ec.businessDomain;
  const reasoningOk = events.some((e) => e.eventCategory === "reasoning");

  let score = 0.4;
  if (hasStrategy) score += 0.2;
  if (hasDomain) score += 0.2;
  if (reasoningOk) score += 0.2;

  return {
    dimension: "strategic_alignment",
    score: Math.round(score * 1000) / 1000,
    explanation: `Domain: ${ec.businessDomain ?? "unknown"}, strategy: ${ec.strategicCategory ?? "unknown"}; reasoning present: ${reasoningOk}`,
    evidenceCount: events.filter((e) => e.eventCategory === "reasoning").length,
  };
}

function scoreResourceEfficiency(
  ec: ExecutiveCase,
  events: CaseTimelineEvent[],
): QualityScoreResult {
  const execRetries  = events.filter((e) => e.eventCategory === "execution" && e.eventType.includes("retry")).length;
  const planAttempts = events.filter((e) => e.eventCategory === "planning" && e.eventType.includes("generated")).length;
  const durationHrs  = ec.durationMs != null ? ec.durationMs / 3_600_000 : null;

  let score = 0.6;
  score -= execRetries * 0.1;
  if (planAttempts > 2) score -= 0.1;
  if (durationHrs != null && durationHrs > 24) score -= 0.1;

  return {
    dimension: "resource_efficiency",
    score: Math.min(1.0, Math.max(0.0, Math.round(score * 1000) / 1000)),
    explanation: `${execRetries} retry event(s), ${planAttempts} plan(s) generated${durationHrs != null ? `, duration ${durationHrs.toFixed(1)}h` : ""}`,
    evidenceCount: events.length,
  };
}

function scoreEvidenceQuality(events: CaseTimelineEvent[]): QualityScoreResult {
  // More categories covered = better evidence quality
  const categories = new Set(events.map((e) => e.eventCategory)).size;
  const total = events.length;
  const score = Math.min(1.0, 0.2 + (categories / 8) * 0.5 + Math.min(total, 20) / 20 * 0.3);

  return {
    dimension: "evidence_quality",
    score: Math.round(score * 1000) / 1000,
    explanation: `${total} total event(s) across ${categories} category(-ies)`,
    evidenceCount: total,
  };
}

// ── Master quality assessment ──────────────────────────────────────────────────

export function assessQuality(
  ec: ExecutiveCase,
  events: CaseTimelineEvent[],
): QualityAssessment {
  const scores: QualityScoreResult[] = [
    scoreDecisionQuality(events),
    scorePlanningQuality(events, ec.completionStatus),
    scoreExecutionQuality(events, ec.completionStatus),
    scoreConsistency(events),
    scoreGoalAlignment(events, ec.completionStatus),
    scoreStrategicAlignment(ec, events),
    scoreResourceEfficiency(ec, events),
    scoreEvidenceQuality(events),
  ];

  // Weighted overall score
  const overallScore = scores.reduce((sum, s) => {
    return sum + s.score * (DIMENSION_WEIGHTS[s.dimension] ?? 0.125);
  }, 0);

  // Confidence based on evidence quantity
  const totalEvidence = scores.reduce((sum, s) => sum + s.evidenceCount, 0);
  const confidence = Math.min(1.0, 0.3 + Math.min(totalEvidence, 30) / 30 * 0.7);

  return {
    scores,
    overallScore: Math.round(overallScore * 1000) / 1000,
    confidence: Math.round(confidence * 1000) / 1000,
  };
}

export const QUALITY_LOW_THRESHOLD = 0.4;
