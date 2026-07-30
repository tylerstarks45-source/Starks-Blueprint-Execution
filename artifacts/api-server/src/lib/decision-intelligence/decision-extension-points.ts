// ─── Build 019: Decision Intelligence — Extension Point Declarations ─────────

import { declareExtensionPoint } from "../cognitive-foundation";
import {
  EP_DECISION_SCENARIO_COMPARED,
  EP_DECISION_MATRIX_COMPUTED,
  EP_DECISION_ALIGNMENT_SCORED,
  EP_DECISION_TRADEOFF_ANALYZED,
  EP_DECISION_CONFIDENCE_COMPUTED,
  EP_DECISION_SELECTED,
  EP_DECISION_REPORT_GENERATED,
  EP_DECISION_REGISTRY_UPDATED,
} from "./types";

export function declareDecisionExtensionPoints(): void {
  declareExtensionPoint({
    id: EP_DECISION_SCENARIO_COMPARED,
    description: "Fired after all scenarios have been compared pairwise across 6 dimensions (expected value, risk, confidence, complexity, resource demand, time horizon).",
    declaredBy: "decision-intelligence",
  });

  declareExtensionPoint({
    id: EP_DECISION_MATRIX_COMPUTED,
    description: "Fired after the weighted decision matrix has been computed across all 7 criteria (goals, policies, governance, risk tolerance, resources, financial capacity, user priorities).",
    declaredBy: "decision-intelligence",
  });

  declareExtensionPoint({
    id: EP_DECISION_ALIGNMENT_SCORED,
    description: "Fired after strategic alignment has been scored across 7 business dimensions (revenue growth, profitability, automation, scalability, customer growth, operational stability, long-term vision).",
    declaredBy: "decision-intelligence",
  });

  declareExtensionPoint({
    id: EP_DECISION_TRADEOFF_ANALYZED,
    description: "Fired after trade-offs have been catalogued across 6 categories (benefits, costs, risks, compromises, dependencies, opportunity costs) for each candidate decision.",
    declaredBy: "decision-intelligence",
  });

  declareExtensionPoint({
    id: EP_DECISION_CONFIDENCE_COMPUTED,
    description: "Fired after the 5-dimension confidence profile (decision confidence, evidence score, data completeness, assumption stability, policy compliance) is computed for each candidate.",
    declaredBy: "decision-intelligence",
  });

  declareExtensionPoint({
    id: EP_DECISION_SELECTED,
    description: "Fired when the primary executive decision, alternative decisions, and rejected decisions are finalised and ranked.",
    declaredBy: "decision-intelligence",
  });

  declareExtensionPoint({
    id: EP_DECISION_REPORT_GENERATED,
    description: "Fired when the full Decision Report — executive summary, selected decision, rejection rationales, evidence, trade-offs, confidence — is assembled.",
    declaredBy: "decision-intelligence",
  });

  declareExtensionPoint({
    id: EP_DECISION_REGISTRY_UPDATED,
    description: "Fired after the decision registry is upserted with the latest primary decision and confidence scores for the business.",
    declaredBy: "decision-intelligence",
  });
}
