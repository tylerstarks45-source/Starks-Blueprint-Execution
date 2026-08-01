// ── Build 040: Unified Cognitive Orchestration Engine — Extension Points ──
import { declareExtensionPoint } from "../cognitive-foundation/extension-points";
import { UCOS_EP_IDS } from "./types";

export function declareUnifiedOrchestrationExtensionPoints(): void {
  declareExtensionPoint({
    id: UCOS_EP_IDS.DEPENDENCY_RESOLUTION,
    description: "Intercept or extend dependency resolution — determines which engines must execute first based on evidence and context dependencies",
    declaredBy: "unified-cognitive-orchestration-engine",
  });
  declareExtensionPoint({
    id: UCOS_EP_IDS.EXECUTION_SCHEDULER,
    description: "Intercept or extend execution scheduling — creates deterministic execution waves with parallel groups and sequential barriers",
    declaredBy: "unified-cognitive-orchestration-engine",
  });
  declareExtensionPoint({
    id: UCOS_EP_IDS.SYNCHRONIZATION,
    description: "Intercept or extend synchronization — coordinates all engine outputs before Executive Brain synthesis through synchronization barriers",
    declaredBy: "unified-cognitive-orchestration-engine",
  });
  declareExtensionPoint({
    id: UCOS_EP_IDS.EVIDENCE_PROPAGATION,
    description: "Intercept or extend evidence propagation — ensures downstream engines receive upstream evidence without duplication",
    declaredBy: "unified-cognitive-orchestration-engine",
  });
  declareExtensionPoint({
    id: UCOS_EP_IDS.CONFIDENCE_PROPAGATION,
    description: "Intercept or extend confidence propagation — carries certainty through the complete cognitive pipeline so final recommendations reflect cumulative confidence",
    declaredBy: "unified-cognitive-orchestration-engine",
  });
  declareExtensionPoint({
    id: UCOS_EP_IDS.EXECUTION_DIAGNOSTICS,
    description: "Intercept or extend execution diagnostics — records execution time, engine participation, dependency satisfaction, health, confidence variance, pipeline completeness",
    declaredBy: "unified-cognitive-orchestration-engine",
  });
  declareExtensionPoint({
    id: UCOS_EP_IDS.ORCHESTRATION,
    description: "Intercept or extend the full unified cognitive orchestration pipeline — the single authoritative execution coordinator for the Cognitive Operating System",
    declaredBy: "unified-cognitive-orchestration-engine",
  });
  declareExtensionPoint({
    id: UCOS_EP_IDS.ADVISORY,
    description: "Intercept or extend the Executive Brain unified orchestration context note advisory generation",
    declaredBy: "unified-cognitive-orchestration-engine",
  });
}
