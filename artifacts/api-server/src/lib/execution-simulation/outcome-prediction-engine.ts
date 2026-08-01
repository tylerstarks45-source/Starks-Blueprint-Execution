// ─────────────────────────────────────────────────────────────────────────────
// Build 027: Execution Simulation Engine — Outcome Prediction Engine
// Predicts expected outcome type and impact severity per scenario.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type { SimulationScenario, PredictedOutcome, OutcomeType, ImpactSeverity } from "./types";

const SCENARIO_OUTCOME_MAP: Record<string, OutcomeType> = {
  best_case:     "success",
  expected_case: "partial_success",
  worst_case:    "degraded",
  failure_case:  "failure",
};

const SCENARIO_SEVERITY_MAP: Record<string, ImpactSeverity> = {
  best_case:     "none",
  expected_case: "low",
  worst_case:    "high",
  failure_case:  "critical",
};

const OUTCOME_SUMMARIES: Record<string, (title: string) => string> = {
  success:         (t) => `${t} completes with all objectives met, no remediation needed.`,
  partial_success: (t) => `${t} completes with primary objectives met; secondary tasks may require follow-up.`,
  degraded:        (t) => `${t} completes in degraded state; performance below expected; manual remediation required.`,
  failure:         (t) => `${t} fails to complete; state is inconsistent; rollback to last stable checkpoint required.`,
};

const IMPACT_DESCRIPTIONS: Record<string, (ownerType: string, criticality: string) => string> = {
  none:     () => "No downstream impact; all systems remain in expected state.",
  low:      (ot) => `Minor performance degradation possible for '${ot}' owned resources.`,
  medium:   (ot) => `Moderate impact on '${ot}' owned services; retry strategies activated.`,
  high:     (ot, c) => `Significant impact on '${c}' criticality systems; downstream dependencies stalled.`,
  critical: (ot, c) => `Critical failure in '${c}' criticality context owned by '${ot}'; full dependency chain disruption.`,
};

export function predictOutcomes(
  scenarios: SimulationScenario[],
  context: {
    reportId: string;
    businessId: number;
    ownerType: string;
    businessCriticality: string;
    dependencyCount: number;
  }
): PredictedOutcome[] {
  return scenarios.map((sc) => {
    const outcomeType   = SCENARIO_OUTCOME_MAP[sc.scenarioType] ?? "partial_success";
    const impactSeverity = SCENARIO_SEVERITY_MAP[sc.scenarioType] ?? "medium";

    const affectedCount = sc.scenarioType === "failure_case"
      ? context.dependencyCount
      : sc.scenarioType === "worst_case"
        ? Math.ceil(context.dependencyCount * 0.5)
        : 0;

    const deps = Array.from({ length: affectedCount }, (_, i) => `dependency_${i + 1}`);

    return {
      id:                   randomUUID(),
      scenarioId:           sc.id,
      simulationId:         sc.simulationId,
      reportId:             context.reportId,
      businessId:           context.businessId,
      outcomeType,
      outcomeSummary:       OUTCOME_SUMMARIES[outcomeType](sc.scenarioTitle),
      impactSeverity,
      impactDescription:    IMPACT_DESCRIPTIONS[impactSeverity](context.ownerType, context.businessCriticality),
      dependenciesAffected: deps,
    };
  });
}
