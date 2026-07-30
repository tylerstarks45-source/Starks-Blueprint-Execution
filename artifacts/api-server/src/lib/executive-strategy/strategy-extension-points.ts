// ─── Build 020: Executive Strategy — Extension Point Declarations ─────────────

import { declareExtensionPoint } from "../cognitive-foundation";
import {
  EP_STRATEGY_FORMED,
  EP_STRATEGY_PILLAR_DEFINED,
  EP_STRATEGY_OBJECTIVE_DEFINED,
  EP_STRATEGY_DEPENDENCY_IDENTIFIED,
  EP_STRATEGY_CONSTRAINT_EVALUATED,
  EP_STRATEGY_ALIGNMENT_MEASURED,
  EP_STRATEGY_EVALUATED,
  EP_STRATEGY_REPORT_GENERATED,
} from "./types";

export function declareStrategyExtensionPoints(): void {
  declareExtensionPoint({
    id: EP_STRATEGY_FORMED,
    description: "Fired when an Executive Strategy is formed from an executive decision — strategic vision, competitive positioning, and time horizon established.",
    declaredBy: "executive-strategy",
  });

  declareExtensionPoint({
    id: EP_STRATEGY_PILLAR_DEFINED,
    description: "Fired after all strategic pillars are defined for the strategy — each pillar represents a long-term area of business focus with weight and priority.",
    declaredBy: "executive-strategy",
  });

  declareExtensionPoint({
    id: EP_STRATEGY_OBJECTIVE_DEFINED,
    description: "Fired after measurable, outcome-oriented strategic objectives are generated for each pillar — never task-oriented, always outcome-oriented.",
    declaredBy: "executive-strategy",
  });

  declareExtensionPoint({
    id: EP_STRATEGY_DEPENDENCY_IDENTIFIED,
    description: "Fired after strategic dependencies are identified across 5 types: cross-functional, business, technology, financial, and people.",
    declaredBy: "executive-strategy",
  });

  declareExtensionPoint({
    id: EP_STRATEGY_CONSTRAINT_EVALUATED,
    description: "Fired after strategic constraints are evaluated across 6 types: budget, capacity, technology, governance, legal, and time.",
    declaredBy: "executive-strategy",
  });

  declareExtensionPoint({
    id: EP_STRATEGY_ALIGNMENT_MEASURED,
    description: "Fired after strategic alignment is measured across 6 dimensions: business vision, mission, goals, executive decisions, business health, and opportunity portfolio.",
    declaredBy: "executive-strategy",
  });

  declareExtensionPoint({
    id: EP_STRATEGY_EVALUATED,
    description: "Fired after the strategy is scored on 6 dimensions: completeness, alignment, risk, business value, long-term sustainability, and strategic confidence.",
    declaredBy: "executive-strategy",
  });

  declareExtensionPoint({
    id: EP_STRATEGY_REPORT_GENERATED,
    description: "Fired when the full Strategy Report — executive summary, pillars, objectives, dependencies, constraints, alignment, confidence, evidence — is assembled and persisted.",
    declaredBy: "executive-strategy",
  });
}
