// ─── Build 019: Decision Report Engine ───────────────────────────────────────
//
// Assembles the full DecisionReport and the compact DecisionSummary for EB.
// No AI. No mutation. Pure assembly.

import type {
  DecisionReport,
  DecisionSummary,
  ExecutiveDecision,
} from "./types";

export function buildDecisionReport(
  reportId: string,
  businessId: number,
  userId: number | undefined,
  simulationReportId: string | undefined,
  decisions: ExecutiveDecision[],
  durationMs: number,
): DecisionReport {
  const primary    = decisions.find((d) => d.decisionType === "primary");
  const alts       = decisions.filter((d) => d.decisionType === "alternative");
  const rejected   = decisions.filter((d) => d.decisionType === "rejected");

  if (!primary) {
    // Should never happen — orchestrator guarantees at least one decision
    throw new Error("Decision Report: no primary decision found.");
  }

  const overallConfidence = primary.confidence?.overallConfidence ?? primary.confidenceScore;

  const strategicAlignmentScore =
    decisions.filter((d) => d.decisionType !== "rejected")
      .reduce((sum, d) => sum + d.strategicAlignmentScore, 0) /
    Math.max(1, decisions.filter((d) => d.decisionType !== "rejected").length);

  const executiveSummary = buildExecutiveSummary(primary, alts, rejected, overallConfidence);

  return {
    id: reportId,
    businessId,
    userId,
    simulationReportId,
    primaryDecision: primary,
    alternativeDecisions: alts,
    rejectedDecisions: rejected,
    overallConfidence,
    strategicAlignmentScore,
    executiveSummary,
    decisionDurationMs: durationMs,
    createdAt: new Date(),
  };
}

function buildExecutiveSummary(
  primary: ExecutiveDecision,
  alts: ExecutiveDecision[],
  rejected: ExecutiveDecision[],
  confidence: number,
): string {
  const type = primary.scenarioType.replace(/_/g, " ");
  const score = (primary.selectionScore * 100).toFixed(0);
  const conf = (confidence * 100).toFixed(0);
  const altNote = alts.length > 0
    ? ` ${alts.length} alternative path${alts.length > 1 ? "s" : ""} identified.`
    : "";
  const rejNote = rejected.length > 0
    ? ` ${rejected.length} scenario${rejected.length > 1 ? "s" : ""} rejected.`
    : "";

  return (
    `The Decision Intelligence Engine selected the '${type}' scenario as the primary executive decision ` +
    `(selection score: ${score}%, confidence: ${conf}%). ` +
    `This decision best aligns with the business's goals, governance policies, and risk tolerance.` +
    `${altNote}${rejNote}`
  );
}

export function buildDecisionSummaryForEB(report: DecisionReport): DecisionSummary {
  const { primaryDecision: p } = report;
  const topTradeoffSummary =
    p.tradeoffSummary.benefits[0]
      ? `Key benefit: ${p.tradeoffSummary.benefits[0]}. Key risk: ${p.tradeoffSummary.risks[0] ?? "none identified"}.`
      : "No tradeoff summary available.";

  return {
    businessId: report.businessId,
    primaryScenarioType: p.scenarioType,
    primaryScenarioName: p.scenarioName,
    primarySelectionScore: p.selectionScore,
    primaryAlignmentScore: p.strategicAlignmentScore,
    primaryConfidence: report.overallConfidence,
    alternativeCount: report.alternativeDecisions.length,
    rejectedCount: report.rejectedDecisions.length,
    latestReportId: report.id,
    topTradeoffSummary,
    lastDecidedAt: report.createdAt,
  };
}
