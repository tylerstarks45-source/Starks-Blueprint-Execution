// ── Build 039: Executive Priority Intelligence Engine — Extension Points ──
import { declareExtensionPoint } from "../cognitive-foundation/extension-points";
import { EPRI_EP_IDS } from "./types";

export function declarePriorityIntelligenceExtensionPoints(): void {
  declareExtensionPoint({
    id: EPRI_EP_IDS.PRIORITY_SCORING,
    description: "Intercept or extend priority scoring — strategic value, business impact, urgency, dependency criticality, resource availability, risk reduction, confidence, time sensitivity",
    declaredBy: "executive-priority-intelligence-engine",
  });
  declareExtensionPoint({
    id: EPRI_EP_IDS.DEPENDENCY_PRIORITY,
    description: "Intercept or extend dependency priority analysis — upstream/downstream relationships, critical path detection, delay risk assessment",
    declaredBy: "executive-priority-intelligence-engine",
  });
  declareExtensionPoint({
    id: EPRI_EP_IDS.ATTENTION_ALLOCATION,
    description: "Intercept or extend executive attention allocation — load, saturation, focus drift, critical window utilization",
    declaredBy: "executive-priority-intelligence-engine",
  });
  declareExtensionPoint({
    id: EPRI_EP_IDS.ESCALATION_INTELLIGENCE,
    description: "Intercept or extend escalation classification — normal, important, high, critical, executive levels; classification only, never execution",
    declaredBy: "executive-priority-intelligence-engine",
  });
  declareExtensionPoint({
    id: EPRI_EP_IDS.PRIORITY_AGING,
    description: "Intercept or extend priority aging analysis — neglected work, recurring postponement, priority decay, stale recommendations",
    declaredBy: "executive-priority-intelligence-engine",
  });
  declareExtensionPoint({
    id: EPRI_EP_IDS.RECOMMENDATION,
    description: "Intercept or extend executive priority recommendations — execute_now, prepare, monitor, delegate, delay, retire with evidence/impact/cost/risk/confidence/trace",
    declaredBy: "executive-priority-intelligence-engine",
  });
  declareExtensionPoint({
    id: EPRI_EP_IDS.ORCHESTRATION,
    description: "Intercept or extend the full priority intelligence orchestration pipeline",
    declaredBy: "executive-priority-intelligence-engine",
  });
  declareExtensionPoint({
    id: EPRI_EP_IDS.ADVISORY,
    description: "Intercept or extend the Executive Brain priority context note advisory generation",
    declaredBy: "executive-priority-intelligence-engine",
  });
}
