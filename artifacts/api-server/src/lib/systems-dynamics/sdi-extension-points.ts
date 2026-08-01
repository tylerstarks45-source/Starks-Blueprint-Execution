// ── Build 036: Systems Dynamics Intelligence Engine — Extension Points ────
import { declareExtensionPoint } from "../cognitive-foundation/extension-points";
import { SDI_EP_IDS } from "./types";

export function declareSystemsDynamicsExtensionPoints(): void {
  declareExtensionPoint({
    id: SDI_EP_IDS.SYSTEM_MAPPING,
    description: "Intercept or extend system boundary mapping and component identification",
    declaredBy: "systems-dynamics-intelligence-engine",
  });
  declareExtensionPoint({
    id: SDI_EP_IDS.FEEDBACK_LOOP,
    description: "Intercept or extend feedback loop detection (reinforcing, balancing, delayed, emergent)",
    declaredBy: "systems-dynamics-intelligence-engine",
  });
  declareExtensionPoint({
    id: SDI_EP_IDS.PROPAGATION,
    description: "Intercept or extend propagation path analysis (failure, recovery, performance, change)",
    declaredBy: "systems-dynamics-intelligence-engine",
  });
  declareExtensionPoint({
    id: SDI_EP_IDS.CONSTRAINT,
    description: "Intercept or extend constraint intelligence (execution, technology, business, infrastructure bottlenecks)",
    declaredBy: "systems-dynamics-intelligence-engine",
  });
  declareExtensionPoint({
    id: SDI_EP_IDS.LEVERAGE,
    description: "Intercept or extend leverage point scoring (smallest change, greatest system-wide impact)",
    declaredBy: "systems-dynamics-intelligence-engine",
  });
  declareExtensionPoint({
    id: SDI_EP_IDS.RESILIENCE,
    description: "Intercept or extend system resilience evaluation (robustness, redundancy, fault tolerance, recovery)",
    declaredBy: "systems-dynamics-intelligence-engine",
  });
  declareExtensionPoint({
    id: SDI_EP_IDS.ORCHESTRATION,
    description: "Intercept or extend the full systems dynamics rebuild orchestration pipeline",
    declaredBy: "systems-dynamics-intelligence-engine",
  });
  declareExtensionPoint({
    id: SDI_EP_IDS.ADVISORY,
    description: "Intercept or extend systems dynamics Executive Brain context note advisory generation",
    declaredBy: "systems-dynamics-intelligence-engine",
  });
}
