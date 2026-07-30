// ─── Build 020: Strategic Objective Engine ───────────────────────────────────
//
// Generates measurable, outcome-oriented strategic objectives for each pillar.
// NEVER task-oriented. Always outcome-oriented.
// Deterministic — no AI, no mutation.

import { randomUUID } from "crypto";
import type {
  PillarType,
  StrategicObjective,
  TimeHorizon,
  BusinessImpact,
} from "./types";

interface ObjectiveSpec {
  objectiveName: string;
  objectiveDescription: string;
  successCriteria: string;
  timeframe: TimeHorizon;
  businessImpact: BusinessImpact;
}

// 2–3 objectives per pillar type — outcome-oriented, measurable
const PILLAR_OBJECTIVES: Record<PillarType, ObjectiveSpec[]> = {
  revenue_growth: [
    {
      objectiveName: "Increase Total Revenue",
      objectiveDescription: "Achieve measurable year-over-year revenue growth through market expansion, pricing optimisation, and conversion improvement.",
      successCriteria: "Revenue increases by a meaningful percentage over the strategy horizon, with growth sustained across multiple periods.",
      timeframe: "medium",
      businessImpact: "high",
    },
    {
      objectiveName: "Improve Revenue Quality",
      objectiveDescription: "Shift revenue composition toward higher-margin, more predictable, and more recurring revenue streams.",
      successCriteria: "Proportion of recurring or high-margin revenue increases as a share of total revenue.",
      timeframe: "medium",
      businessImpact: "high",
    },
    {
      objectiveName: "Expand Revenue Channels",
      objectiveDescription: "Identify and activate new revenue channels that diversify income and reduce concentration risk.",
      successCriteria: "At least one new significant revenue channel contributes meaningfully to total revenue.",
      timeframe: "long",
      businessImpact: "medium",
    },
  ],
  operational_excellence: [
    {
      objectiveName: "Improve Operational Efficiency",
      objectiveDescription: "Reduce waste, rework, and process friction across core operational workflows.",
      successCriteria: "Key operational metrics (cycle time, error rate, cost per unit) improve measurably.",
      timeframe: "medium",
      businessImpact: "high",
    },
    {
      objectiveName: "Build Scalable Operations",
      objectiveDescription: "Develop operational capacity that scales without proportional cost increases.",
      successCriteria: "Business handles higher volumes without requiring proportional headcount or cost growth.",
      timeframe: "long",
      businessImpact: "high",
    },
  ],
  customer_experience: [
    {
      objectiveName: "Achieve Industry-Leading Customer Satisfaction",
      objectiveDescription: "Deliver customer experiences that consistently exceed expectations and drive loyalty.",
      successCriteria: "Customer satisfaction scores reach or exceed best-in-class benchmarks for the industry.",
      timeframe: "medium",
      businessImpact: "high",
    },
    {
      objectiveName: "Increase Customer Retention",
      objectiveDescription: "Reduce churn and extend customer lifetime through proactive success management.",
      successCriteria: "Customer retention rate improves meaningfully over the strategy horizon.",
      timeframe: "medium",
      businessImpact: "high",
    },
  ],
  innovation: [
    {
      objectiveName: "Build an Innovation Pipeline",
      objectiveDescription: "Establish a structured process for identifying, testing, and scaling new ideas.",
      successCriteria: "A measurable set of innovations reach production within the strategy horizon.",
      timeframe: "long",
      businessImpact: "high",
    },
    {
      objectiveName: "Increase Innovation Velocity",
      objectiveDescription: "Reduce the time from idea to validated outcome across all innovation efforts.",
      successCriteria: "Innovation cycle time decreases measurably without reducing success rates.",
      timeframe: "medium",
      businessImpact: "medium",
    },
  ],
  technology: [
    {
      objectiveName: "Modernise Core Technology Stack",
      objectiveDescription: "Replace or upgrade legacy systems with scalable, maintainable technology.",
      successCriteria: "Critical legacy systems are retired or upgraded; technical debt measurably reduced.",
      timeframe: "long",
      businessImpact: "high",
    },
    {
      objectiveName: "Achieve Technology Reliability",
      objectiveDescription: "Deliver consistently high availability and performance across all technology systems.",
      successCriteria: "System availability meets or exceeds defined SLAs; incident frequency and severity decrease.",
      timeframe: "medium",
      businessImpact: "high",
    },
  ],
  market_expansion: [
    {
      objectiveName: "Enter New Markets",
      objectiveDescription: "Identify and establish presence in new customer segments, geographies, or verticals.",
      successCriteria: "Meaningful revenue or customer acquisition achieved in at least one new market.",
      timeframe: "long",
      businessImpact: "high",
    },
    {
      objectiveName: "Increase Market Share",
      objectiveDescription: "Capture a larger share of the existing addressable market through differentiation and execution.",
      successCriteria: "Market share increases measurably within the primary operating market.",
      timeframe: "medium",
      businessImpact: "high",
    },
  ],
  talent: [
    {
      objectiveName: "Build a High-Performance Team",
      objectiveDescription: "Attract, develop, and retain the talent required to execute the business strategy.",
      successCriteria: "Key roles are filled; employee performance and retention metrics improve.",
      timeframe: "medium",
      businessImpact: "high",
    },
    {
      objectiveName: "Develop Critical Organisational Capabilities",
      objectiveDescription: "Build the skills and competencies that are most critical to long-term competitive advantage.",
      successCriteria: "Identified capability gaps are closed; teams demonstrate measurable competency improvement.",
      timeframe: "long",
      businessImpact: "high",
    },
  ],
  financial_strength: [
    {
      objectiveName: "Improve Profitability",
      objectiveDescription: "Increase profit margins through revenue growth, cost management, and capital efficiency.",
      successCriteria: "Net profit margin improves measurably over the strategy horizon.",
      timeframe: "medium",
      businessImpact: "high",
    },
    {
      objectiveName: "Strengthen Cash Position",
      objectiveDescription: "Build a cash reserve and improve cash flow that enables investment and resilience.",
      successCriteria: "Cash runway and operating cash flow improve measurably.",
      timeframe: "medium",
      businessImpact: "high",
    },
  ],
  governance: [
    {
      objectiveName: "Establish Robust Risk Management",
      objectiveDescription: "Implement policies and controls that identify, assess, and mitigate key business risks.",
      successCriteria: "Risk register maintained; critical risks have documented mitigations; incidents decrease.",
      timeframe: "short",
      businessImpact: "high",
    },
    {
      objectiveName: "Achieve Regulatory Compliance",
      objectiveDescription: "Ensure the business meets all relevant regulatory and legal obligations.",
      successCriteria: "Zero material compliance violations; all regulatory requirements documented and met.",
      timeframe: "short",
      businessImpact: "high",
    },
  ],
};

export function generateObjectives(
  pillar: { id: string; strategyId: string; reportId: string; businessId: number; pillarType: PillarType; priority: number },
): StrategicObjective[] {
  const specs = PILLAR_OBJECTIVES[pillar.pillarType] ?? [];

  return specs.map((spec, idx): StrategicObjective => ({
    id: randomUUID(),
    pillarId: pillar.id,
    strategyId: pillar.strategyId,
    reportId: pillar.reportId,
    businessId: pillar.businessId,
    objectiveName: spec.objectiveName,
    objectiveDescription: spec.objectiveDescription,
    successCriteria: spec.successCriteria,
    timeframe: spec.timeframe,
    priority: pillar.priority * 10 + idx + 1,  // inherit pillar priority, then sub-rank
    alignmentScore: Math.max(0.5, 0.95 - idx * 0.1),
    confidence: 0.75,
    businessImpact: spec.businessImpact,
  }));
}
