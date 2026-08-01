// ─────────────────────────────────────────────────────────────────────────────
// Build 027: Execution Simulation Engine — Types (self-contained)
// ─────────────────────────────────────────────────────────────────────────────

// ── Extension Point IDs ───────────────────────────────────────────────────────
export const EP_SCENARIO_CONSTRUCTED          = "execution-simulation.scenario-constructed";
export const EP_OUTCOME_PREDICTED             = "execution-simulation.outcome-predicted";
export const EP_DEPENDENCY_IMPACT_ASSESSED    = "execution-simulation.dependency-impact-assessed";
export const EP_TIMELINE_ESTIMATED            = "execution-simulation.timeline-estimated";
export const EP_RESOURCE_CONSUMPTION_ESTIMATED = "execution-simulation.resource-consumption-estimated";
export const EP_ROLLBACK_SIMULATED            = "execution-simulation.rollback-simulated";
export const EP_SIMULATION_CONFIDENCE_SCORED  = "execution-simulation.simulation-confidence-scored";
export const EP_SIMULATION_REPORT_GENERATED   = "execution-simulation.simulation-report-generated";

// ── Scenario Types ────────────────────────────────────────────────────────────
export type ScenarioType = "best_case" | "expected_case" | "worst_case" | "failure_case";

// ── Outcome Types ─────────────────────────────────────────────────────────────
export type OutcomeType = "success" | "partial_success" | "degraded" | "failure";

// ── Impact Severity ───────────────────────────────────────────────────────────
export type ImpactSeverity = "none" | "low" | "medium" | "high" | "critical";

// ── State Domains ─────────────────────────────────────────────────────────────
export type StateDomain = "system" | "data" | "process" | "external" | "compliance";

// ── Change Types ──────────────────────────────────────────────────────────────
export type ChangeType = "create" | "update" | "delete" | "transform" | "trigger";

// ── Recovery Complexity ───────────────────────────────────────────────────────
export type RecoveryComplexity = "none" | "simple" | "moderate" | "complex" | "not_possible";

// ── Resource Consumption Estimate ─────────────────────────────────────────────
export interface ResourceConsumptionEstimate {
  compute:          string; // e.g. "low" | "medium" | "high"
  storage:          string;
  bandwidth:        string;
  apiUsage:         string;
  financialCost:    string; // e.g. "$0-5" or "negligible"
  humanOversight:   string; // e.g. "none" | "light" | "moderate" | "full"
  estimateNarrative: string;
}

// ── Simulation Confidence ─────────────────────────────────────────────────────
export interface SimulationConfidence {
  predictionConfidence:  number; // 0-1
  dataCompleteness:      number; // 0-1
  historicalSimilarity:  number; // 0-1
  determinism:           number; // 0-1
  uncertaintyScore:      number; // 0-1 (inverse of confidence)
  overallConfidence:     number; // composite
  confidenceNarrative:   string;
}

// ── Rollback Plan ─────────────────────────────────────────────────────────────
export interface RollbackSimulationRecord {
  id:                             string;
  simulationId:                   string;
  reportId:                       string;
  businessId:                     number;
  rollbackConfidence:             number;
  recoveryComplexity:             RecoveryComplexity;
  estimatedRecoveryDurationHours: number;
  rollbackSteps:                  string[];
  rollbackNotes:                  string;
  isRollbackFeasible:             boolean;
}

// ── Simulation Scenario ───────────────────────────────────────────────────────
export interface SimulationScenario {
  id:                  string;
  simulationId:        string;
  reportId:            string;
  businessId:          number;
  scenarioType:        ScenarioType;
  scenarioTitle:       string;
  scenarioDescription: string;
  probability:         number;
  successLikelihood:   number;
}

// ── Predicted Outcome ─────────────────────────────────────────────────────────
export interface PredictedOutcome {
  id:                   string;
  scenarioId:           string;
  simulationId:         string;
  reportId:             string;
  businessId:           number;
  outcomeType:          OutcomeType;
  outcomeSummary:       string;
  impactSeverity:       ImpactSeverity;
  impactDescription:    string;
  dependenciesAffected: string[];
}

// ── Predicted State Change ────────────────────────────────────────────────────
export interface PredictedStateChange {
  id:                string;
  simulationId:      string;
  reportId:          string;
  businessId:        number;
  stateDomain:       StateDomain;
  changeType:        ChangeType;
  affectedEntity:    string;
  changeDescription: string;
  isReversible:      boolean;
  isCritical:        boolean;
}

// ── Simulation Record (one per assignment) ────────────────────────────────────
export interface SimulationRecord {
  id:                          string;
  reportId:                    string;
  businessId:                  number;
  assignmentId:                string;
  workPackageId?:              string;
  packageTitle?:               string;
  ownerType:                   string;
  executionClass:              string;
  complexityLevel:             string;
  businessCriticality:         string;
  scenarios:                   SimulationScenario[];
  outcomes:                    PredictedOutcome[];
  stateChanges:                PredictedStateChange[];
  rollback:                    RollbackSimulationRecord;
  confidence:                  SimulationConfidence;
  expectedOutcomeSummary:      string;
  predictedDurationHours:      number;
  resourceConsumption:         ResourceConsumptionEstimate;
}

// ── Full Report ───────────────────────────────────────────────────────────────
export interface ExecutionSimulationReport {
  id:                        string;
  businessId:                number;
  userId:                    number;
  riskReportId?:             string;
  authorityReportId?:        string;
  orchestrationReportId?:    string;
  simulations:               SimulationRecord[];
  simulationCount:           number;
  scenarioCount:             number;
  overallConfidence:         number;
  bestCaseConfidence:        number;
  worstCaseConfidence:       number;
  estimatedDurationMin:      number;
  estimatedDurationExpected: number;
  estimatedDurationMax:      number;
  estimatedDurationUnit:     string;
  rollbackConfidence:        number;
  isSimulationComplete:      boolean;
  executiveSummary:          string;
  simulationDurationMs:      number;
  createdAt:                 Date;
}

// ── EB Summary ────────────────────────────────────────────────────────────────
export interface ExecutionSimulationSummary {
  reportId:                  string;
  businessId:                number;
  simulationCount:           number;
  scenarioCount:             number;
  overallConfidence:         number;
  bestCaseConfidence:        number;
  worstCaseConfidence:       number;
  estimatedDurationExpected: number;
  estimatedDurationUnit:     string;
  rollbackConfidence:        number;
  isSimulationComplete:      boolean;
  executiveSummary:          string;
  createdAt:                 Date;
}
