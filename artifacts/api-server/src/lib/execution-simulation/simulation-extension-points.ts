// ─────────────────────────────────────────────────────────────────────────────
// Build 027: Execution Simulation Engine — Extension Points (8)
// ─────────────────────────────────────────────────────────────────────────────
import { declareExtensionPoint } from "../cognitive-foundation/extension-points";
import {
  EP_SCENARIO_CONSTRUCTED,
  EP_OUTCOME_PREDICTED,
  EP_DEPENDENCY_IMPACT_ASSESSED,
  EP_TIMELINE_ESTIMATED,
  EP_RESOURCE_CONSUMPTION_ESTIMATED,
  EP_ROLLBACK_SIMULATED,
  EP_SIMULATION_CONFIDENCE_SCORED,
  EP_SIMULATION_REPORT_GENERATED,
} from "./types";

export function declareExecutionSimulationExtensionPoints(): void {
  declareExtensionPoint({
    id: EP_SCENARIO_CONSTRUCTED,
    description: "Fired after a simulation scenario (best/expected/worst/failure) is constructed for an execution assignment.",
    declaredBy: "execution-simulation",
  });
  declareExtensionPoint({
    id: EP_OUTCOME_PREDICTED,
    description: "Fired after expected, best-case, and worst-case outcomes are predicted for a simulation scenario.",
    declaredBy: "execution-simulation",
  });
  declareExtensionPoint({
    id: EP_DEPENDENCY_IMPACT_ASSESSED,
    description: "Fired after downstream dependency impacts are predicted for a simulation.",
    declaredBy: "execution-simulation",
  });
  declareExtensionPoint({
    id: EP_TIMELINE_ESTIMATED,
    description: "Fired after execution timeline (min/expected/max duration) is estimated with confidence intervals.",
    declaredBy: "execution-simulation",
  });
  declareExtensionPoint({
    id: EP_RESOURCE_CONSUMPTION_ESTIMATED,
    description: "Fired after compute, storage, bandwidth, API usage, financial, and human oversight resources are estimated.",
    declaredBy: "execution-simulation",
  });
  declareExtensionPoint({
    id: EP_ROLLBACK_SIMULATED,
    description: "Fired after rollback path is validated: rollback confidence, recovery complexity, recovery duration.",
    declaredBy: "execution-simulation",
  });
  declareExtensionPoint({
    id: EP_SIMULATION_CONFIDENCE_SCORED,
    description: "Fired after simulation confidence is scored across prediction confidence, data completeness, historical similarity, determinism, and uncertainty.",
    declaredBy: "execution-simulation",
  });
  declareExtensionPoint({
    id: EP_SIMULATION_REPORT_GENERATED,
    description: "Fired when the complete execution simulation report is assembled and persisted.",
    declaredBy: "execution-simulation",
  });
}
