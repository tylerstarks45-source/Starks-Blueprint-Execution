// ─────────────────────────────────────────────────────────────────────────────
// Build 027: Execution Simulation Engine — Report Assembly Engine
// Assembles the immutable full report and compact EB summary.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type { ExecutionSimulationReport, ExecutionSimulationSummary, SimulationRecord } from "./types";

interface ReportAssemblyInput {
  businessId:             number;
  userId:                 number;
  riskReportId?:          string;
  authorityReportId?:     string;
  orchestrationReportId?: string;
  simulations:            SimulationRecord[];
  simulationDurationMs:   number;
}

function avg(values: number[]): number {
  if (!values.length) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 1000) / 1000;
}

function buildSummary(simulations: SimulationRecord[]): string {
  const count = simulations.length;
  if (!count) return "No simulations were produced — no execution assignments found.";

  const avgConf = Math.round(avg(simulations.map((s) => s.confidence.overallConfidence)) * 100);
  const maxHours = Math.max(...simulations.map((s) => s.predictedDurationHours));
  const rollbacks = simulations.filter((s) => s.rollback.isRollbackFeasible).length;

  return (
    `${count} execution simulation(s) completed with ${avgConf}% average confidence. ` +
    `Total estimated duration up to ${maxHours.toFixed(1)}h. ` +
    `${rollbacks}/${count} assignments have feasible rollback paths. ` +
    `Simulation complete — review outcomes before proceeding to execution.`
  );
}

export function assembleSimulationReport(input: ReportAssemblyInput): ExecutionSimulationReport {
  const { businessId, userId, riskReportId, authorityReportId, orchestrationReportId, simulations, simulationDurationMs } = input;

  const allScenarios = simulations.flatMap((s) => s.scenarios);
  const bestScenarios = allScenarios.filter((s) => s.scenarioType === "best_case");
  const worstScenarios = allScenarios.filter((s) => s.scenarioType === "worst_case");

  const overallConfidence    = avg(simulations.map((s) => s.confidence.overallConfidence));
  const bestCaseConfidence   = avg(bestScenarios.map((s) => s.successLikelihood));
  const worstCaseConfidence  = avg(worstScenarios.map((s) => s.successLikelihood));

  const durations = simulations.map((s) => s.predictedDurationHours);
  const estimatedDurationExpected = avg(durations);
  const estimatedDurationMin      = Math.round(Math.min(...durations.length ? durations : [0]) * 10) / 10;
  const estimatedDurationMax      = Math.round(Math.max(...durations.length ? durations : [0]) * 10) / 10;

  const rollbackConfidence = avg(simulations.map((s) => s.rollback.rollbackConfidence));
  const isSimulationComplete = simulations.length > 0 && simulations.every((s) => s.scenarios.length > 0);

  return {
    id:                        randomUUID(),
    businessId,
    userId,
    riskReportId,
    authorityReportId,
    orchestrationReportId,
    simulations,
    simulationCount:           simulations.length,
    scenarioCount:             allScenarios.length,
    overallConfidence,
    bestCaseConfidence:        bestCaseConfidence || 0,
    worstCaseConfidence:       worstCaseConfidence || 0,
    estimatedDurationMin,
    estimatedDurationExpected,
    estimatedDurationMax,
    estimatedDurationUnit:     "hours",
    rollbackConfidence,
    isSimulationComplete,
    executiveSummary:          buildSummary(simulations),
    simulationDurationMs,
    createdAt:                 new Date(),
  };
}

export function buildSimulationSummary(report: ExecutionSimulationReport): ExecutionSimulationSummary {
  return {
    reportId:                  report.id,
    businessId:                report.businessId,
    simulationCount:           report.simulationCount,
    scenarioCount:             report.scenarioCount,
    overallConfidence:         report.overallConfidence,
    bestCaseConfidence:        report.bestCaseConfidence,
    worstCaseConfidence:       report.worstCaseConfidence,
    estimatedDurationExpected: report.estimatedDurationExpected,
    estimatedDurationUnit:     report.estimatedDurationUnit,
    rollbackConfidence:        report.rollbackConfidence,
    isSimulationComplete:      report.isSimulationComplete,
    executiveSummary:          report.executiveSummary,
    createdAt:                 report.createdAt,
  };
}
