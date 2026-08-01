// ─────────────────────────────────────────────────────────────────────────────
// Build 027: Execution Simulation Engine — Scenario Construction Engine
// Constructs 4 deterministic execution scenarios per assignment.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type { SimulationScenario, ScenarioType } from "./types";

interface ConstructionInput {
  reportId: string;
  simulationId: string;
  businessId: number;
  ownerType: string;
  executionClass: string;
  complexityLevel: string;
  businessCriticality: string;
  packageTitle?: string;
}

interface ScenarioProbabilities {
  best_case:     number;
  expected_case: number;
  worst_case:    number;
  failure_case:  number;
}

// Base probability map by execution class
const CLASS_PROBABILITIES: Record<string, ScenarioProbabilities> = {
  automated:  { best_case: 0.25, expected_case: 0.55, worst_case: 0.15, failure_case: 0.05 },
  ai_driven:  { best_case: 0.20, expected_case: 0.50, worst_case: 0.20, failure_case: 0.10 },
  human:      { best_case: 0.30, expected_case: 0.45, worst_case: 0.18, failure_case: 0.07 },
  external:   { best_case: 0.15, expected_case: 0.45, worst_case: 0.28, failure_case: 0.12 },
  hybrid:     { best_case: 0.22, expected_case: 0.52, worst_case: 0.18, failure_case: 0.08 },
};

const COMPLEXITY_FAILURE_ADDER: Record<string, number> = {
  low: -0.02, medium: 0.00, high: 0.04, very_high: 0.08, extreme: 0.12,
};

const CRITICALITY_WORST_ADDER: Record<string, number> = {
  low: -0.03, medium: 0.00, high: 0.05, critical: 0.10,
};

const SUCCESS_LIKELIHOOD: Record<ScenarioType, (ownerType: string, executionClass: string) => number> = {
  best_case:     () => 0.95,
  expected_case: (ot, ec) => ec === "automated" ? 0.88 : ec === "external" ? 0.72 : 0.80,
  worst_case:    (ot, ec) => ec === "external" ? 0.35 : ec === "ai_driven" ? 0.45 : 0.40,
  failure_case:  () => 0.05,
};

const SCENARIO_TITLES: Record<ScenarioType, (pkg?: string) => string> = {
  best_case:     (p) => `Best Case — ${p ?? "Assignment"} completes ahead of schedule with full success`,
  expected_case: (p) => `Expected Case — ${p ?? "Assignment"} executes on plan with normal variance`,
  worst_case:    (p) => `Worst Case — ${p ?? "Assignment"} encounters significant issues requiring remediation`,
  failure_case:  (p) => `Failure Case — ${p ?? "Assignment"} fails requiring full rollback`,
};

const SCENARIO_DESCRIPTIONS: Record<ScenarioType, (ec: string, cl: string) => string> = {
  best_case:     (ec) => `All prerequisites satisfied, no dependency issues, execution class '${ec}' operates at peak efficiency.`,
  expected_case: (ec, cl) => `Normal execution variance for '${ec}' class at '${cl}' complexity. Minor delays and retries expected.`,
  worst_case:    (ec, cl) => `Compounding issues: dependency delays, resource contention, '${cl}' complexity friction. Remediation required.`,
  failure_case:  (ec) => `Critical failure in '${ec}' class execution. Rollback initiated. Root cause investigation required.`,
};

export function constructScenarios(input: ConstructionInput): SimulationScenario[] {
  const probs = CLASS_PROBABILITIES[input.executionClass] ?? CLASS_PROBABILITIES["automated"]!;

  const failureAdder = COMPLEXITY_FAILURE_ADDER[input.complexityLevel] ?? 0;
  const worstAdder   = CRITICALITY_WORST_ADDER[input.businessCriticality] ?? 0;

  const adjustedFailure  = Math.min(0.30, Math.max(0.02, probs.failure_case + failureAdder));
  const adjustedWorst    = Math.min(0.40, Math.max(0.05, probs.worst_case + worstAdder));
  const adjustedBest     = Math.max(0.10, probs.best_case - failureAdder * 0.5);
  const adjustedExpected = Math.max(0.10, 1 - adjustedBest - adjustedWorst - adjustedFailure);

  const scenarioTypes: ScenarioType[] = ["best_case", "expected_case", "worst_case", "failure_case"];
  const pMap: Record<ScenarioType, number> = {
    best_case:     adjustedBest,
    expected_case: adjustedExpected,
    worst_case:    adjustedWorst,
    failure_case:  adjustedFailure,
  };

  return scenarioTypes.map((st) => ({
    id:                  randomUUID(),
    simulationId:        input.simulationId,
    reportId:            input.reportId,
    businessId:          input.businessId,
    scenarioType:        st,
    scenarioTitle:       SCENARIO_TITLES[st](input.packageTitle),
    scenarioDescription: SCENARIO_DESCRIPTIONS[st](input.executionClass, input.complexityLevel),
    probability:         Math.round(pMap[st] * 1000) / 1000,
    successLikelihood:   Math.round(SUCCESS_LIKELIHOOD[st](input.ownerType, input.executionClass) * 1000) / 1000,
  }));
}
