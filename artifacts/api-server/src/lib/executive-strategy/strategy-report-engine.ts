// ─── Build 020: Strategy Report Engine ───────────────────────────────────────
//
// Assembles the full StrategyReport and the compact StrategySummary for EB.
// No AI. No mutation. Pure assembly.

import type {
  StrategyReport,
  StrategySummary,
  ExecutiveStrategy,
  PillarType,
} from "./types";

export function buildStrategyReport(
  reportId: string,
  businessId: number,
  userId: number | undefined,
  decisionReportId: string | undefined,
  strategy: ExecutiveStrategy,
  durationMs: number,
): StrategyReport {
  const totalPillars    = strategy.pillars.length;
  const totalObjectives = strategy.pillars.reduce((s, p) => s + p.objectives.length, 0);
  const { evaluation } = strategy;

  const executiveSummary = buildExecutiveSummary(strategy, totalPillars, totalObjectives);

  return {
    id: reportId,
    businessId,
    userId,
    decisionReportId,
    strategy,
    overallAlignmentScore:  evaluation.alignmentScore,
    overallConfidence:      evaluation.confidenceScore,
    completenessScore:      evaluation.completenessScore,
    businessValueScore:     evaluation.businessValueScore,
    sustainabilityScore:    evaluation.sustainabilityScore,
    executiveSummary,
    strategyDurationMs: durationMs,
    createdAt: new Date(),
  };
}

function buildExecutiveSummary(
  strategy: ExecutiveStrategy,
  pillarCount: number,
  objectiveCount: number,
): string {
  const type  = strategy.scenarioType.replace(/_/g, " ");
  const conf  = (strategy.evaluation.confidenceScore * 100).toFixed(0);
  const align = (strategy.evaluation.alignmentScore * 100).toFixed(0);
  const topPillars = strategy.pillars.slice(0, 3).map((p) => p.pillarName).join(", ");

  return (
    `The Executive Strategy Engine has formed a '${strategy.strategyName}' ` +
    `directed at the '${type}' opportunity (confidence: ${conf}%, alignment: ${align}%). ` +
    `The strategy is built on ${pillarCount} strategic pillars (${topPillars}) ` +
    `with ${objectiveCount} measurable outcome-oriented objectives. ` +
    `Strategic vision: ${strategy.strategicVision}`
  );
}

export function buildStrategySummaryForEB(report: StrategyReport): StrategySummary {
  const { strategy } = report;
  const topPillarTypes = strategy.pillars
    .slice(0, 3)
    .map((p) => p.pillarType as PillarType);

  return {
    businessId: report.businessId,
    scenarioType: strategy.scenarioType,
    strategyName: strategy.strategyName,
    topPillarTypes,
    alignmentScore: report.overallAlignmentScore,
    confidenceScore: report.overallConfidence,
    objectiveCount: strategy.pillars.reduce((s, p) => s + p.objectives.length, 0),
    pillarCount: strategy.pillars.length,
    latestReportId: report.id,
    strategicVisionSummary:
      strategy.strategicVision.length > 120
        ? strategy.strategicVision.slice(0, 119) + "…"
        : strategy.strategicVision,
    lastStrategyAt: report.createdAt,
  };
}
