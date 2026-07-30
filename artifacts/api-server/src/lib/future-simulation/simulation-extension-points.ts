// ─── Build 018: Future State Simulation Extension Points ─────────────────────

import { declareExtensionPoint } from "../cognitive-foundation";
import {
  EP_SIMULATION_SCENARIO_GENERATED,
  EP_SIMULATION_IMPACT_ESTIMATED,
  EP_SIMULATION_KPI_PROJECTED,
  EP_SIMULATION_HEALTH_PROJECTED,
  EP_SIMULATION_RISK_PROJECTED,
  EP_SIMULATION_OUTCOME_COMPUTED,
  EP_SIMULATION_REPORT_GENERATED,
  EP_SIMULATION_SCENARIO_SELECTED,
} from "./types";

export function declareSimulationExtensionPoints(): void {
  declareExtensionPoint({
    id: EP_SIMULATION_SCENARIO_GENERATED,
    description: "Seam for post-generation scenario enrichment or external scenario injection",
    declaredBy: "future-simulation-engine",
  });
  declareExtensionPoint({
    id: EP_SIMULATION_IMPACT_ESTIMATED,
    description: "Seam for custom business impact estimation models or calibration",
    declaredBy: "future-simulation-engine",
  });
  declareExtensionPoint({
    id: EP_SIMULATION_KPI_PROJECTED,
    description: "Seam for KPI projection model replacement or time-series integration",
    declaredBy: "future-simulation-engine",
  });
  declareExtensionPoint({
    id: EP_SIMULATION_HEALTH_PROJECTED,
    description: "Seam for health projection model replacement or external dimension data",
    declaredBy: "future-simulation-engine",
  });
  declareExtensionPoint({
    id: EP_SIMULATION_RISK_PROJECTED,
    description: "Seam for risk model integration or industry-specific risk calibration",
    declaredBy: "future-simulation-engine",
  });
  declareExtensionPoint({
    id: EP_SIMULATION_OUTCOME_COMPUTED,
    description: "Seam for outcome probability model replacement or Monte Carlo integration",
    declaredBy: "future-simulation-engine",
  });
  declareExtensionPoint({
    id: EP_SIMULATION_REPORT_GENERATED,
    description: "Seam for post-report processing, export, or downstream system notification",
    declaredBy: "future-simulation-engine",
  });
  declareExtensionPoint({
    id: EP_SIMULATION_SCENARIO_SELECTED,
    description: "Seam for scenario selection events; triggers Decision Intelligence in Build 019",
    declaredBy: "future-simulation-engine",
  });
}
