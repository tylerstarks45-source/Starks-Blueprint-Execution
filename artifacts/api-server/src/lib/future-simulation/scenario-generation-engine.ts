// ─── Build 018: Scenario Generation Engine ────────────────────────────────────
//
// Generates one FutureScenario candidate per unique opportunity category
// from the top Executive Opportunities (max 8 scenarios per run).
//
// Pure function — no DB I/O. Returns ScenarioInput[].

import type { ExecutiveOpportunity } from "../opportunity-discovery/types";
import type { ScenarioInput, ScenarioType } from "./types";

// Category mapping: opportunity category → scenario type (identical taxonomy)
function toScenarioType(cat: string): ScenarioType {
  const valid: ScenarioType[] = [
    "revenue_growth", "cost_reduction", "automation", "marketing", "sales",
    "operations", "product", "infrastructure", "finance", "risk_reduction",
    "customer_success", "knowledge",
  ];
  return valid.includes(cat as ScenarioType) ? (cat as ScenarioType) : "operations";
}

export function generateScenarioInputs(opportunities: ExecutiveOpportunity[]): ScenarioInput[] {
  // Sort by composite score descending
  const sorted = [...opportunities].sort((a, b) => b.compositeScore - a.compositeScore);

  // Keep one scenario per category (highest-scoring wins), max 8 total
  const seen = new Map<string, ScenarioInput>();
  for (const opp of sorted) {
    if (seen.size >= 8) break;
    const type = toScenarioType(opp.category);
    if (!seen.has(type)) {
      seen.set(type, {
        opportunityId: opp.id,
        opportunityTitle: opp.title,
        category: type,
        compositeScore: opp.compositeScore,
        businessImpact: opp.businessImpact,
        confidence: opp.confidence,
        risk: opp.risk,
        estimatedEffort: opp.estimatedEffort,
        strategicValue: opp.strategicValue,
        discoverySource: opp.discoverySource,
      });
    }
  }

  // Ensure at least a baseline scenario if no opportunities
  if (seen.size === 0) {
    seen.set("operations", {
      opportunityId: "baseline",
      opportunityTitle: "Baseline Operations",
      category: "operations",
      compositeScore: 0.5,
      businessImpact: 0.5,
      confidence: 0.6,
      risk: 0.3,
      estimatedEffort: 0.5,
      strategicValue: 0.5,
      discoverySource: "graph_topology",
    });
  }

  return Array.from(seen.values());
}
