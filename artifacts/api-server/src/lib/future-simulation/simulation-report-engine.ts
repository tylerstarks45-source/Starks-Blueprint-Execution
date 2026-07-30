// ─── Build 018: Simulation Report Engine ─────────────────────────────────────
//
// Assembles the full SimulationReport from all scenarios.
// Produces the EB-facing SimulationSummary.
// Pure function — no DB I/O.

import type {
  FutureScenario, ScenarioSummary, SimulationReport, SimulationSummary,
} from "./types";

function toSummary(s: FutureScenario): ScenarioSummary {
  return {
    id: s.id,
    scenarioName: s.scenarioName,
    scenarioType: s.scenarioType,
    expectedValueScore: s.expectedValueScore,
    overallConfidence: s.overallConfidence,
    riskScore: s.riskScore,
    growthPotential: s.growthPotential,
    automationPotential: s.automationPotential,
    executionComplexity: s.executionComplexity,
  };
}

export function buildSimulationReport(opts: {
  reportId: string;
  businessId: number;
  userId: number;
  scenarios: FutureScenario[];
  durationMs: number;
  analysisReportId: string | null;
  opportunityReportId: string | null;
  now: Date;
}): SimulationReport {
  const { reportId, businessId, userId, scenarios, durationMs, analysisReportId, opportunityReportId, now } = opts;

  const sorted = [...scenarios].sort((a, b) => b.expectedValueScore - a.expectedValueScore);

  const highestConfidence = sorted.reduce((best, s) => !best || s.overallConfidence > best.overallConfidence ? s : best, null as FutureScenario | null);
  const lowestRisk = sorted.reduce((best, s) => !best || s.riskScore < best.riskScore ? s : best, null as FutureScenario | null);
  const highestValue = sorted[0] ?? null;
  const highestGrowth = [...sorted].sort((a, b) => b.growthPotential - a.growthPotential)[0] ?? null;
  const highestAutomation = [...sorted].sort((a, b) => b.automationPotential - a.automationPotential)[0] ?? null;

  const avgConf = scenarios.length > 0 ? scenarios.reduce((s, x) => s + x.overallConfidence, 0) / scenarios.length : null;
  const avgRisk = scenarios.length > 0 ? scenarios.reduce((s, x) => s + x.riskScore, 0) / scenarios.length : null;

  const lines: string[] = [
    `Simulation produced ${scenarios.length} future scenario${scenarios.length !== 1 ? "s" : ""}.`,
  ];
  if (highestValue) lines.push(`Highest-value scenario: "${highestValue.scenarioName}" (score ${(highestValue.expectedValueScore * 100).toFixed(0)}%, confidence ${(highestValue.overallConfidence * 100).toFixed(0)}%).`);
  if (lowestRisk && lowestRisk.id !== highestValue?.id) lines.push(`Lowest-risk scenario: "${lowestRisk.scenarioName}" (risk ${(lowestRisk.riskScore * 100).toFixed(0)}%).`);
  if (highestGrowth && highestGrowth.id !== highestValue?.id) lines.push(`Highest-growth scenario: "${highestGrowth.scenarioName}" (growth ${(highestGrowth.growthPotential * 100).toFixed(0)}%).`);
  if (highestAutomation && highestAutomation.automationPotential > 0.3) lines.push(`Highest-automation scenario: "${highestAutomation.scenarioName}" (automation ${(highestAutomation.automationPotential * 100).toFixed(0)}%).`);

  return {
    id: reportId,
    businessId,
    userId,
    scenarios,
    scenarioCount: scenarios.length,
    highestConfidenceScenarioId: highestConfidence?.id ?? null,
    lowestRiskScenarioId: lowestRisk?.id ?? null,
    highestValueScenarioId: highestValue?.id ?? null,
    highestGrowthScenarioId: highestGrowth?.id ?? null,
    highestAutomationScenarioId: highestAutomation?.id ?? null,
    simulationDurationMs: durationMs,
    executiveSummary: lines.join(" "),
    analysisReportId,
    opportunityReportId,
    avgConfidence: avgConf !== null ? parseFloat(avgConf.toFixed(4)) : null,
    avgRisk: avgRisk !== null ? parseFloat(avgRisk.toFixed(4)) : null,
    createdAt: now,
  };
}

export function buildSimulationSummaryForEB(report: SimulationReport): SimulationSummary {
  const toSumOrNull = (id: string | null): ScenarioSummary | null => {
    if (!id) return null;
    const s = report.scenarios.find((x) => x.id === id);
    return s ? toSummary(s) : null;
  };

  return {
    businessId: report.businessId,
    scenarioCount: report.scenarioCount,
    highestConfidenceScenario: toSumOrNull(report.highestConfidenceScenarioId),
    lowestRiskScenario: toSumOrNull(report.lowestRiskScenarioId),
    highestExpectedValue: toSumOrNull(report.highestValueScenarioId),
    highestGrowthScenario: toSumOrNull(report.highestGrowthScenarioId),
    highestAutomationScenario: toSumOrNull(report.highestAutomationScenarioId),
    avgConfidence: report.avgConfidence,
    avgRisk: report.avgRisk,
    simulatedAt: report.createdAt,
  };
}
