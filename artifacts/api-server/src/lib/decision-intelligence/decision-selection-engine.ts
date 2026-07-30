// ─── Build 019: Decision Selection Engine ────────────────────────────────────
//
// Produces: Primary Decision, Alternative Decisions, Rejected Decisions,
// and Decision Ranking from scored + evaluated scenarios.
// No planning. No execution. Only selection.

import { randomUUID } from "crypto";
import type {
  ScoredScenario,
  DecisionType,
  AlignmentProfile,
  TradeoffSummary,
  DecisionRationale,
  DecisionTradeoff,
  DecisionConfidenceRecord,
  ExecutiveDecision,
} from "./types";

const SELECTION_WEIGHTS = {
  compositeScore:       0.35,
  matrixScore:          0.25,
  alignmentScore:       0.20,
  confidenceScore:      0.12,
  riskPenalty:          0.08,  // subtracted
};

export function computeSelectionScore(scenario: ScoredScenario): number {
  return Math.max(0, Math.min(1,
    scenario.compositeScore    * SELECTION_WEIGHTS.compositeScore +
    scenario.matrixScore       * SELECTION_WEIGHTS.matrixScore +
    scenario.alignmentScore    * SELECTION_WEIGHTS.alignmentScore +
    scenario.overallConfidence * SELECTION_WEIGHTS.confidenceScore -
    scenario.riskScore         * SELECTION_WEIGHTS.riskPenalty,
  ));
}

// A scenario is rejected if: governance non-compliant OR selection score < 0.30
const REJECTION_THRESHOLD = 0.30;

function buildRejectionReason(scenario: ScoredScenario): string | undefined {
  if (!scenario.governanceCompliant) return "Rejected: governance policy compliance not confirmed.";
  if (scenario.compositeScore < REJECTION_THRESHOLD) return `Rejected: composite score (${(scenario.compositeScore * 100).toFixed(0)}%) is below the minimum selection threshold.`;
  return undefined;
}

function buildRationales(
  scenario: ScoredScenario,
  decisionId: string,
  reportId: string,
  businessId: number,
  decisionType: DecisionType,
): DecisionRationale[] {
  const rationales: DecisionRationale[] = [];

  if (decisionType === "primary") {
    rationales.push({
      id: randomUUID(), decisionId, reportId, businessId,
      rationaleType: "selection",
      dimension: "composite_score",
      title: "Highest Composite Score",
      explanation: `Selected as primary because it achieved the highest composite selection score (${(scenario.compositeScore * 100).toFixed(0)}%) across expected value, strategic alignment, matrix criteria, and risk weighting.`,
      weight: 0.90,
      supportingEvidence: ["Expected value score", "Strategic alignment score", "Decision matrix weighted total"],
    });
    rationales.push({
      id: randomUUID(), decisionId, reportId, businessId,
      rationaleType: "preference",
      dimension: "governance",
      title: "Governance Policy Compliant",
      explanation: "This scenario was evaluated as fully compliant with active governance rules and executive policies.",
      weight: 0.80,
      supportingEvidence: ["Governance compliance flag", "Risk tolerance assessment"],
    });
  }

  if (decisionType === "alternative") {
    rationales.push({
      id: randomUUID(), decisionId, reportId, businessId,
      rationaleType: "preference",
      dimension: "alternative_value",
      title: "Strong Alternative Path",
      explanation: `Retained as alternative: selection score of ${(scenario.compositeScore * 100).toFixed(0)}% exceeds the rejection threshold but was outranked by the primary decision.`,
      weight: 0.60,
      supportingEvidence: ["Selection score above threshold", "Risk and alignment scores"],
    });
  }

  if (decisionType === "rejected") {
    rationales.push({
      id: randomUUID(), decisionId, reportId, businessId,
      rationaleType: "rejection",
      dimension: scenario.governanceCompliant ? "score_threshold" : "governance",
      title: scenario.governanceCompliant ? "Below Selection Threshold" : "Governance Non-Compliance",
      explanation: scenario.rejectionReason ?? "Rejected.",
      weight: 0.95,
      supportingEvidence: [],
    });
  }

  // Concern rationale for high risk
  if (scenario.riskScore > 0.65) {
    rationales.push({
      id: randomUUID(), decisionId, reportId, businessId,
      rationaleType: "concern",
      dimension: "risk",
      title: "Elevated Risk Profile",
      explanation: `Risk score of ${(scenario.riskScore * 100).toFixed(0)}% is above the 65% concern threshold. Proceed with enhanced risk monitoring if selected.`,
      weight: 0.60,
      supportingEvidence: ["Risk score", "Assumption stability"],
    });
  }

  return rationales;
}

export function selectDecisions(
  scenarios: ScoredScenario[],
  reportId: string,
  businessId: number,
  userId: number | undefined,
  alignmentMap: Map<string, number>,
  matrixMap: Map<string, number>,
  confidenceMap: Map<string, DecisionConfidenceRecord>,
  tradeoffMap: Map<string, DecisionTradeoff[]>,
  alignmentProfileMap: Map<string, AlignmentProfile[]>,
): ExecutiveDecision[] {
  // Enrich scenarios with matrix + alignment scores
  const enriched = scenarios.map((s) => ({
    ...s,
    matrixScore:    matrixMap.get(s.scenarioId)    ?? 0,
    alignmentScore: alignmentMap.get(s.scenarioId) ?? 0,
  }));

  // Compute selection scores
  const withSelectionScore = enriched.map((s) => ({
    ...s,
    selectionScore: computeSelectionScore(s),
    rejectionReason: buildRejectionReason(s),
  }));

  // Partition
  const passed   = withSelectionScore.filter((s) => !s.rejectionReason);
  const rejected = withSelectionScore.filter((s) => !!s.rejectionReason);

  // Sort passed by selection score DESC
  passed.sort((a, b) => b.selectionScore - a.selectionScore);

  const decisions: ExecutiveDecision[] = [];

  passed.forEach((s, idx) => {
    const decisionType: DecisionType = idx === 0 ? "primary" : "alternative";
    const decisionId = randomUUID();
    const conf = confidenceMap.get(s.scenarioId)!;
    const tradeoffSummary = buildSummary(tradeoffMap.get(s.scenarioId) ?? []);
    const rationales = buildRationales(s, decisionId, reportId, businessId, decisionType);
    decisions.push({
      id: decisionId, reportId, businessId, userId,
      scenarioId: s.scenarioId, scenarioName: s.scenarioName, scenarioType: s.scenarioType,
      decisionType, rankPosition: idx + 1, selectionScore: s.selectionScore,
      expectedValueScore: s.expectedValueScore, strategicAlignmentScore: s.alignmentScore,
      riskScore: s.riskScore, confidenceScore: conf?.overallConfidence ?? s.overallConfidence,
      complexityScore: s.executionComplexity, resourceDemand: s.resourceDemand,
      governanceCompliant: s.governanceCompliant, goalAlignmentScore: s.alignmentScore,
      rejectionReason: undefined,
      alignmentProfile: alignmentProfileMap.get(s.scenarioId) ?? [],
      tradeoffSummary, rationales,
      tradeoffs: tradeoffMap.get(s.scenarioId) ?? [],
      confidence: conf,
      createdAt: new Date(),
    });
  });

  rejected.forEach((s, idx) => {
    const decisionId = randomUUID();
    const conf = confidenceMap.get(s.scenarioId)!;
    const tradeoffSummary = buildSummary(tradeoffMap.get(s.scenarioId) ?? []);
    const rationales = buildRationales(s, decisionId, reportId, businessId, "rejected");
    decisions.push({
      id: decisionId, reportId, businessId, userId,
      scenarioId: s.scenarioId, scenarioName: s.scenarioName, scenarioType: s.scenarioType,
      decisionType: "rejected", rankPosition: passed.length + idx + 1, selectionScore: s.selectionScore,
      expectedValueScore: s.expectedValueScore, strategicAlignmentScore: s.alignmentScore ?? 0,
      riskScore: s.riskScore, confidenceScore: conf?.overallConfidence ?? s.overallConfidence,
      complexityScore: s.executionComplexity, resourceDemand: s.resourceDemand,
      governanceCompliant: s.governanceCompliant, goalAlignmentScore: s.alignmentScore ?? 0,
      rejectionReason: s.rejectionReason,
      alignmentProfile: alignmentProfileMap.get(s.scenarioId) ?? [],
      tradeoffSummary, rationales,
      tradeoffs: tradeoffMap.get(s.scenarioId) ?? [],
      confidence: conf,
      createdAt: new Date(),
    });
  });

  return decisions;
}

function buildSummary(tradeoffs: DecisionTradeoff[]): TradeoffSummary {
  const by = (cat: string) => tradeoffs.filter((t) => t.tradeoffCategory === cat).map((t) => t.title);
  return {
    benefits:         by("benefit"),
    costs:            by("cost"),
    risks:            by("risk"),
    compromises:      by("compromise"),
    dependencies:     by("dependency"),
    opportunityCosts: by("opportunity_cost"),
  };
}
