// ─── Build 020: Strategic Pillar Engine ──────────────────────────────────────
//
// Creates long-term strategic pillars for each strategy.
// Selects the most relevant pillars for the scenario type and weights them.
// Deterministic — no AI, no mutation.

import { randomUUID } from "crypto";
import {
  ALL_PILLAR_TYPES,
  type PillarType,
  type StrategicPillar,
  type StrategicObjective,
} from "./types";

interface PillarSpec {
  pillarName: string;
  pillarDescription: string;
}

const PILLAR_SPECS: Record<PillarType, PillarSpec> = {
  revenue_growth:          { pillarName: "Revenue Growth",          pillarDescription: "Drive sustainable revenue expansion through market development, pricing strategies, and channel optimisation." },
  operational_excellence:  { pillarName: "Operational Excellence",  pillarDescription: "Build efficient, reliable operations that deliver consistent quality at scale." },
  customer_experience:     { pillarName: "Customer Experience",     pillarDescription: "Create exceptional customer journeys that build loyalty, advocacy, and long-term value." },
  innovation:              { pillarName: "Innovation",              pillarDescription: "Foster a culture and capability for continuous innovation in products, services, and processes." },
  technology:              { pillarName: "Technology",              pillarDescription: "Deploy and evolve technology platforms that accelerate every business capability." },
  market_expansion:        { pillarName: "Market Expansion",        pillarDescription: "Identify, enter, and capture new markets, segments, and geographies." },
  talent:                  { pillarName: "Talent",                  pillarDescription: "Attract, develop, and retain the people who drive business performance and culture." },
  financial_strength:      { pillarName: "Financial Strength",      pillarDescription: "Build financial resilience, capital efficiency, and profitability that enable strategic investment." },
  governance:              { pillarName: "Governance",              pillarDescription: "Establish the policies, controls, and accountability structures that protect the business." },
};

// Priority pillar sets per scenario type (in priority order — first = highest priority)
const SCENARIO_PILLAR_PRIORITIES: Record<string, PillarType[]> = {
  revenue_growth:    ["revenue_growth", "market_expansion", "customer_experience", "operational_excellence", "financial_strength"],
  cost_reduction:    ["operational_excellence", "financial_strength", "technology", "governance", "talent"],
  automation:        ["technology", "operational_excellence", "innovation", "financial_strength", "talent"],
  marketing:         ["market_expansion", "customer_experience", "revenue_growth", "innovation", "talent"],
  sales:             ["revenue_growth", "customer_experience", "market_expansion", "talent", "operational_excellence"],
  operations:        ["operational_excellence", "technology", "financial_strength", "talent", "governance"],
  product:           ["innovation", "customer_experience", "technology", "revenue_growth", "talent"],
  infrastructure:    ["technology", "operational_excellence", "governance", "financial_strength", "innovation"],
  finance:           ["financial_strength", "operational_excellence", "governance", "revenue_growth", "technology"],
  risk_reduction:    ["governance", "financial_strength", "operational_excellence", "technology", "talent"],
  customer_success:  ["customer_experience", "revenue_growth", "talent", "innovation", "operational_excellence"],
  knowledge:         ["talent", "innovation", "technology", "customer_experience", "operational_excellence"],
};

// Alignment scores per pillar per scenario type
function computePillarAlignment(pillarType: PillarType, scenarioType: string): number {
  const priority = (SCENARIO_PILLAR_PRIORITIES[scenarioType] ?? []).indexOf(pillarType);
  if (priority === 0) return 0.95;
  if (priority === 1) return 0.85;
  if (priority === 2) return 0.75;
  if (priority === 3) return 0.65;
  if (priority === 4) return 0.55;
  return 0.45;
}

// Weights decrease with priority (top pillar gets most focus)
const PILLAR_WEIGHTS = [0.25, 0.20, 0.18, 0.16, 0.12, 0.09];

export function generatePillars(
  strategyId: string,
  reportId: string,
  businessId: number,
  scenarioType: string,
): StrategicPillar[] {
  const orderedTypes = SCENARIO_PILLAR_PRIORITIES[scenarioType] ?? ALL_PILLAR_TYPES.slice(0, 5);
  const selectedTypes = orderedTypes.slice(0, 6);

  return selectedTypes.map((pillarType, idx): StrategicPillar => {
    const spec = PILLAR_SPECS[pillarType];
    return {
      id: randomUUID(),
      strategyId,
      reportId,
      businessId,
      pillarType,
      pillarName: spec.pillarName,
      pillarDescription: spec.pillarDescription,
      priority: idx + 1,
      weight: PILLAR_WEIGHTS[idx] ?? 0.09,
      alignmentScore: computePillarAlignment(pillarType, scenarioType),
      objectives: [],  // populated by objective engine
    };
  });
}
