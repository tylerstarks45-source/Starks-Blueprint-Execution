// ── Build 037: Executive Trade-off Intelligence Engine — Extension Points ──
import { declareExtensionPoint } from "../cognitive-foundation/extension-points";
import { ETI_EP_IDS } from "./types";

export function declareTradeoffIntelligenceExtensionPoints(): void {
  declareExtensionPoint({
    id: ETI_EP_IDS.CONSTRAINT_MODELING,
    description: "Intercept or extend constraint modeling — add custom constraint types or validation rules",
    declaredBy: "executive-tradeoff-intelligence-engine",
  });
  declareExtensionPoint({
    id: ETI_EP_IDS.OBJECTIVE_OPTIMIZATION,
    description: "Intercept or extend multi-objective weighted optimization scoring",
    declaredBy: "executive-tradeoff-intelligence-engine",
  });
  declareExtensionPoint({
    id: ETI_EP_IDS.MATRIX_BUILDING,
    description: "Intercept or extend trade-off matrix construction and explainability scoring",
    declaredBy: "executive-tradeoff-intelligence-engine",
  });
  declareExtensionPoint({
    id: ETI_EP_IDS.FRONTIER_DETECTION,
    description: "Intercept or extend Pareto-optimal frontier detection across objective dimensions",
    declaredBy: "executive-tradeoff-intelligence-engine",
  });
  declareExtensionPoint({
    id: ETI_EP_IDS.SENSITIVITY_ANALYSIS,
    description: "Intercept or extend sensitivity analysis — how recommendations change when constraints change",
    declaredBy: "executive-tradeoff-intelligence-engine",
  });
  declareExtensionPoint({
    id: ETI_EP_IDS.RECOMMENDATION,
    description: "Intercept or extend executive recommendation synthesis (winner, runner-up, rejection reasons, assumptions)",
    declaredBy: "executive-tradeoff-intelligence-engine",
  });
  declareExtensionPoint({
    id: ETI_EP_IDS.ORCHESTRATION,
    description: "Intercept or extend the full trade-off evaluation orchestration pipeline",
    declaredBy: "executive-tradeoff-intelligence-engine",
  });
  declareExtensionPoint({
    id: ETI_EP_IDS.ADVISORY,
    description: "Intercept or extend the Executive Brain trade-off context note advisory generation",
    declaredBy: "executive-tradeoff-intelligence-engine",
  });
}
