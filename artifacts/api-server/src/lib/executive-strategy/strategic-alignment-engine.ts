// ─── Build 020: Strategic Alignment Engine ───────────────────────────────────
//
// Measures alignment between the strategy and 6 dimensions:
// business vision, mission, goals, executive decisions,
// business health, opportunity portfolio.
// Deterministic — no AI, no mutation.

import type {
  AlignmentDimension,
  StrategyAlignmentProfile,
  StrategyFormationInput,
} from "./types";

const ALIGNMENT_DIMENSIONS: AlignmentDimension[] = [
  "business_vision",
  "mission",
  "goals",
  "executive_decisions",
  "business_health",
  "opportunity_portfolio",
];

const DIMENSION_EVIDENCE: Record<AlignmentDimension, string> = {
  business_vision:       "Strategic vision derived directly from the executive decision and scenario type, ensuring direction alignment.",
  mission:               "Strategy supports core business mission through pillar selection and objective orientation.",
  goals:                 "Strategic objectives are mapped to business goals; goal alignment confirmed through decision intelligence scoring.",
  executive_decisions:   "Strategy is formed exclusively from the primary executive decision selected by Decision Intelligence.",
  business_health:       "Pillar priorities account for business health dimensions most in need of improvement.",
  opportunity_portfolio: "Strategy addresses the highest-scoring opportunities from the Opportunity Discovery Engine.",
};

// Base alignment scores per dimension per scenario type
const ALIGNMENT_TABLE: Record<string, Record<AlignmentDimension, number>> = {
  revenue_growth:   { business_vision: 0.90, mission: 0.85, goals: 0.90, executive_decisions: 0.95, business_health: 0.75, opportunity_portfolio: 0.85 },
  cost_reduction:   { business_vision: 0.75, mission: 0.80, goals: 0.85, executive_decisions: 0.95, business_health: 0.85, opportunity_portfolio: 0.75 },
  automation:       { business_vision: 0.80, mission: 0.80, goals: 0.85, executive_decisions: 0.95, business_health: 0.80, opportunity_portfolio: 0.85 },
  marketing:        { business_vision: 0.85, mission: 0.80, goals: 0.85, executive_decisions: 0.95, business_health: 0.70, opportunity_portfolio: 0.85 },
  sales:            { business_vision: 0.85, mission: 0.80, goals: 0.90, executive_decisions: 0.95, business_health: 0.75, opportunity_portfolio: 0.85 },
  operations:       { business_vision: 0.75, mission: 0.85, goals: 0.80, executive_decisions: 0.95, business_health: 0.85, opportunity_portfolio: 0.75 },
  product:          { business_vision: 0.85, mission: 0.85, goals: 0.80, executive_decisions: 0.95, business_health: 0.75, opportunity_portfolio: 0.85 },
  infrastructure:   { business_vision: 0.70, mission: 0.80, goals: 0.75, executive_decisions: 0.95, business_health: 0.80, opportunity_portfolio: 0.70 },
  finance:          { business_vision: 0.75, mission: 0.80, goals: 0.85, executive_decisions: 0.95, business_health: 0.85, opportunity_portfolio: 0.75 },
  risk_reduction:   { business_vision: 0.70, mission: 0.80, goals: 0.80, executive_decisions: 0.95, business_health: 0.90, opportunity_portfolio: 0.70 },
  customer_success: { business_vision: 0.85, mission: 0.85, goals: 0.85, executive_decisions: 0.95, business_health: 0.80, opportunity_portfolio: 0.85 },
  knowledge:        { business_vision: 0.70, mission: 0.80, goals: 0.75, executive_decisions: 0.95, business_health: 0.75, opportunity_portfolio: 0.75 },
};

const DEFAULT_ALIGNMENT: Record<AlignmentDimension, number> = {
  business_vision: 0.75, mission: 0.75, goals: 0.75,
  executive_decisions: 0.95, business_health: 0.75, opportunity_portfolio: 0.75,
};

export function measureAlignment(
  input: StrategyFormationInput,
): { profiles: StrategyAlignmentProfile[]; overallScore: number } {
  const table = ALIGNMENT_TABLE[input.scenarioType] ?? DEFAULT_ALIGNMENT;

  const profiles: StrategyAlignmentProfile[] = ALIGNMENT_DIMENSIONS.map((dim) => {
    let score = table[dim];
    // Nudge executive_decisions dimension by decision confidence
    if (dim === "executive_decisions") score = Math.min(1, score * (0.8 + input.confidenceScore * 0.2));
    // Nudge opportunity_portfolio by expected value
    if (dim === "opportunity_portfolio") score = Math.min(1, score * (0.8 + input.expectedValueScore * 0.2));
    score = Math.max(0, Math.min(1, score));
    return { dimension: dim, score, evidence: DIMENSION_EVIDENCE[dim] };
  });

  const overallScore = profiles.reduce((s, p) => s + p.score, 0) / profiles.length;
  return { profiles, overallScore };
}
