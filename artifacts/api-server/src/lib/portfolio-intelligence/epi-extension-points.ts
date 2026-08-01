// ── Build 038: Executive Portfolio Intelligence Engine — Extension Points ──
import { declareExtensionPoint } from "../cognitive-foundation/extension-points";
import { EPI_EP_IDS } from "./types";

export function declarePortfolioIntelligenceExtensionPoints(): void {
  declareExtensionPoint({
    id: EPI_EP_IDS.PORTFOLIO_CONSTRUCTION,
    description: "Intercept or extend portfolio construction — add custom initiative grouping or classification rules",
    declaredBy: "executive-portfolio-intelligence-engine",
  });
  declareExtensionPoint({
    id: EPI_EP_IDS.ALLOCATION_INTELLIGENCE,
    description: "Intercept or extend resource allocation intelligence — budget, people, infrastructure, compute, time, attention",
    declaredBy: "executive-portfolio-intelligence-engine",
  });
  declareExtensionPoint({
    id: EPI_EP_IDS.BALANCE_INTELLIGENCE,
    description: "Intercept or extend portfolio balance analysis across strategic, execution, technology, business, and operational dimensions",
    declaredBy: "executive-portfolio-intelligence-engine",
  });
  declareExtensionPoint({
    id: EPI_EP_IDS.EXPOSURE_INTELLIGENCE,
    description: "Intercept or extend risk exposure detection — single-point dependencies, vendor/execution/technology/financial concentration",
    declaredBy: "executive-portfolio-intelligence-engine",
  });
  declareExtensionPoint({
    id: EPI_EP_IDS.CAPACITY_INTELLIGENCE,
    description: "Intercept or extend capacity intelligence — utilization, headroom, constraint pressure, expansion readiness",
    declaredBy: "executive-portfolio-intelligence-engine",
  });
  declareExtensionPoint({
    id: EPI_EP_IDS.RECOMMENDATION,
    description: "Intercept or extend portfolio recommendation synthesis — rebalance, delay, accelerate, consolidate, retire, expand",
    declaredBy: "executive-portfolio-intelligence-engine",
  });
  declareExtensionPoint({
    id: EPI_EP_IDS.ORCHESTRATION,
    description: "Intercept or extend the full portfolio intelligence orchestration pipeline",
    declaredBy: "executive-portfolio-intelligence-engine",
  });
  declareExtensionPoint({
    id: EPI_EP_IDS.ADVISORY,
    description: "Intercept or extend the Executive Brain portfolio context note advisory generation",
    declaredBy: "executive-portfolio-intelligence-engine",
  });
}
