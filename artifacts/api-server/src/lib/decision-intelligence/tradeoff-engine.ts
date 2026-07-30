// ─── Build 019: Trade-Off Engine ─────────────────────────────────────────────
//
// Explicitly identifies benefits, costs, risks, compromises, dependencies,
// and opportunity costs for each candidate decision.
// Deterministic — no AI, no mutation.

import { randomUUID } from "crypto";
import type {
  DecisionTradeoff,
  ScoredScenario,
  TradeoffCategory,
  TradeoffSummary,
} from "./types";

interface TradeoffTemplate {
  category: TradeoffCategory;
  title: string;
  description: (s: ScoredScenario) => string;
  magnitude: (s: ScoredScenario) => number;
  certainty: number;
  timeHorizon: "short" | "medium" | "long";
}

const UNIVERSAL_TRADEOFFS: TradeoffTemplate[] = [
  {
    category: "benefit",
    title: "Expected Value Realisation",
    description: (s) => `Pursuing the ${s.scenarioType.replace(/_/g, " ")} scenario is projected to deliver an expected value score of ${(s.expectedValueScore * 100).toFixed(0)}%.`,
    magnitude: (s) => s.expectedValueScore,
    certainty: 0.80,
    timeHorizon: "medium",
  },
  {
    category: "cost",
    title: "Implementation Complexity",
    description: (s) => `Execution complexity is rated ${(s.executionComplexity * 100).toFixed(0)}%, requiring proportional resource and time investment.`,
    magnitude: (s) => s.executionComplexity,
    certainty: 0.85,
    timeHorizon: "short",
  },
  {
    category: "risk",
    title: "Execution Risk",
    description: (s) => `Risk score of ${(s.riskScore * 100).toFixed(0)}% across execution, market, financial, and operational dimensions.`,
    magnitude: (s) => s.riskScore,
    certainty: 0.75,
    timeHorizon: "medium",
  },
  {
    category: "benefit",
    title: "Growth Potential",
    description: (s) => `Growth potential of ${(s.growthPotential * 100).toFixed(0)}% signals strong long-term scalability.`,
    magnitude: (s) => s.growthPotential,
    certainty: 0.70,
    timeHorizon: "long",
  },
  {
    category: "cost",
    title: "Resource Demand",
    description: (s) => `Resource demand index of ${(s.resourceDemand * 100).toFixed(0)}% — capital, personnel, and time allocation required.`,
    magnitude: (s) => s.resourceDemand,
    certainty: 0.80,
    timeHorizon: "short",
  },
  {
    category: "opportunity_cost",
    title: "Displaced Alternatives",
    description: (s) => `Selecting this path means forgoing investment in alternative scenarios. Opportunity cost is proportional to the number of high-scoring alternatives.`,
    magnitude: (_s) => 0.50,
    certainty: 0.65,
    timeHorizon: "medium",
  },
];

// Type-specific tradeoff templates
const TYPE_TRADEOFFS: Partial<Record<string, TradeoffTemplate[]>> = {
  revenue_growth: [
    { category: "compromise", title: "Short-Term Margin Compression", description: () => "Revenue growth investment may compress near-term margins before scale benefits materialise.", magnitude: () => 0.55, certainty: 0.70, timeHorizon: "short" },
    { category: "dependency", title: "Market Demand Dependency", description: () => "Outcome depends on sustained market demand and effective conversion.", magnitude: () => 0.60, certainty: 0.65, timeHorizon: "medium" },
  ],
  cost_reduction: [
    { category: "risk", title: "Operational Disruption Risk", description: () => "Cost reduction initiatives can disrupt existing workflows during transition.", magnitude: () => 0.50, certainty: 0.75, timeHorizon: "short" },
    { category: "compromise", title: "Capability Trade-Off", description: () => "Some cost reductions may reduce capability or service quality in the short term.", magnitude: () => 0.45, certainty: 0.70, timeHorizon: "medium" },
  ],
  automation: [
    { category: "benefit", title: "Compounding Efficiency Gains", description: () => "Automation investments compound over time — early implementation accelerates returns.", magnitude: () => 0.80, certainty: 0.75, timeHorizon: "long" },
    { category: "dependency", title: "Technology Stack Dependency", description: () => "Automation success depends on underlying technology infrastructure stability.", magnitude: () => 0.55, certainty: 0.70, timeHorizon: "medium" },
  ],
  marketing: [
    { category: "compromise", title: "Attribution Lag", description: () => "Marketing outcomes take time to attribute — short-term ROI measurement is imprecise.", magnitude: () => 0.45, certainty: 0.65, timeHorizon: "medium" },
  ],
  sales: [
    { category: "dependency", title: "Talent & Capacity Dependency", description: () => "Sales growth is constrained by team capacity, training, and pipeline quality.", magnitude: () => 0.60, certainty: 0.75, timeHorizon: "short" },
  ],
  risk_reduction: [
    { category: "benefit", title: "Governance Resilience", description: () => "Reduces regulatory and operational risk exposure, improving long-term resilience.", magnitude: () => 0.75, certainty: 0.85, timeHorizon: "long" },
  ],
};

export function computeTradeoffs(
  scenario: ScoredScenario,
  decisionId: string,
  reportId: string,
  businessId: number,
): DecisionTradeoff[] {
  const templates: TradeoffTemplate[] = [
    ...UNIVERSAL_TRADEOFFS,
    ...(TYPE_TRADEOFFS[scenario.scenarioType] ?? []),
  ];

  return templates.map((t): DecisionTradeoff => ({
    id: randomUUID(),
    decisionId,
    reportId,
    businessId,
    tradeoffCategory: t.category,
    title: t.title,
    description: t.description(scenario),
    magnitude: t.magnitude(scenario),
    certainty: t.certainty,
    timeHorizon: t.timeHorizon,
  }));
}

export function buildTradeoffSummary(tradeoffs: DecisionTradeoff[]): TradeoffSummary {
  const by = (cat: TradeoffCategory) =>
    tradeoffs.filter((t) => t.tradeoffCategory === cat).map((t) => t.title);
  return {
    benefits:         by("benefit"),
    costs:            by("cost"),
    risks:            by("risk"),
    compromises:      by("compromise"),
    dependencies:     by("dependency"),
    opportunityCosts: by("opportunity_cost"),
  };
}
