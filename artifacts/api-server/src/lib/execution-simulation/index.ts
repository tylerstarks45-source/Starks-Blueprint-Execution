// ─────────────────────────────────────────────────────────────────────────────
// Build 027: Execution Simulation Engine — Public Barrel
// ─────────────────────────────────────────────────────────────────────────────
export { runExecutionSimulation, fetchSimulationSummaryForEB } from "./simulation-orchestrator";
export { declareExecutionSimulationExtensionPoints } from "./simulation-extension-points";
export type {
  ExecutionSimulationSummary,
  ExecutionSimulationReport,
  SimulationRecord,
  SimulationScenario,
  PredictedOutcome,
  PredictedStateChange,
  RollbackSimulationRecord,
  SimulationConfidence,
  ResourceConsumptionEstimate,
  ScenarioType,
  OutcomeType,
  ImpactSeverity,
  StateDomain,
  ChangeType,
  RecoveryComplexity,
} from "./types";
