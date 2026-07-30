// ─── Build 020: Strategy Formation Engine ────────────────────────────────────
//
// Transforms an executive decision into one Executive Strategy.
// Deterministic — no AI, no mutation of prior layers.

import type { StrategyFormationInput, TimeHorizon } from "./types";

interface StrategyFrame {
  strategyName: string;
  strategyDescription: string;
  strategicVision: string;
  competitivePositioning: string;
  timeHorizon: TimeHorizon;
}

// Deterministic strategy frames keyed on scenario type
const STRATEGY_FRAMES: Record<string, StrategyFrame> = {
  revenue_growth: {
    strategyName: "Revenue Expansion Strategy",
    strategyDescription: "Drive sustainable revenue growth through market development, pricing optimisation, and conversion acceleration.",
    strategicVision: "Become the preferred revenue-generating engine in our market by maximising customer lifetime value and market penetration.",
    competitivePositioning: "Compete on value delivery, superior conversion, and scalable revenue channels.",
    timeHorizon: "medium",
  },
  cost_reduction: {
    strategyName: "Operational Efficiency Strategy",
    strategyDescription: "Systematically reduce operational costs while preserving service quality and capability.",
    strategicVision: "Operate as a lean, high-efficiency organisation that outcompetes on margin and agility.",
    competitivePositioning: "Compete on cost efficiency, operational speed, and margin advantage.",
    timeHorizon: "short",
  },
  automation: {
    strategyName: "Intelligent Automation Strategy",
    strategyDescription: "Deploy automation across core business processes to multiply capacity, reduce errors, and accelerate output.",
    strategicVision: "Build a business where human effort is amplified by automation, freeing teams to focus on high-value work.",
    competitivePositioning: "Compete on operational scale, speed, and cost efficiency enabled by automation.",
    timeHorizon: "medium",
  },
  marketing: {
    strategyName: "Market Visibility & Demand Strategy",
    strategyDescription: "Elevate brand visibility, generate qualified demand, and build a sustainable pipeline through integrated marketing.",
    strategicVision: "Become the most recognised and trusted brand in our target market segment.",
    competitivePositioning: "Compete on brand authority, audience reach, and lead quality.",
    timeHorizon: "medium",
  },
  sales: {
    strategyName: "Revenue Capture & Sales Excellence Strategy",
    strategyDescription: "Build a high-performance sales engine that converts opportunity into revenue at scale.",
    strategicVision: "Achieve market-leading win rates and customer acquisition efficiency.",
    competitivePositioning: "Compete on consultative selling, sales velocity, and conversion excellence.",
    timeHorizon: "short",
  },
  operations: {
    strategyName: "Operational Excellence Strategy",
    strategyDescription: "Redesign core operations for reliability, scalability, and continuous improvement.",
    strategicVision: "Deliver consistent, high-quality outcomes through world-class operational systems.",
    competitivePositioning: "Compete on reliability, consistency, and operational innovation.",
    timeHorizon: "medium",
  },
  product: {
    strategyName: "Product-Led Growth Strategy",
    strategyDescription: "Build and evolve products that create sustainable competitive advantages and drive organic growth.",
    strategicVision: "Deliver products so compelling that they become the primary driver of business growth.",
    competitivePositioning: "Compete on product quality, user experience, and continuous innovation.",
    timeHorizon: "long",
  },
  infrastructure: {
    strategyName: "Technology Infrastructure Strategy",
    strategyDescription: "Build scalable, resilient technology infrastructure that enables business growth and operational stability.",
    strategicVision: "Operate on a robust, future-proof technology platform that accelerates every business capability.",
    competitivePositioning: "Compete on technology resilience, scalability, and integration capability.",
    timeHorizon: "long",
  },
  finance: {
    strategyName: "Financial Resilience & Growth Strategy",
    strategyDescription: "Strengthen financial health, improve capital efficiency, and build sustainable profitability.",
    strategicVision: "Achieve financial independence and stability that enables bold strategic moves.",
    competitivePositioning: "Compete on financial strength, capital efficiency, and investment capacity.",
    timeHorizon: "medium",
  },
  risk_reduction: {
    strategyName: "Risk Mitigation & Resilience Strategy",
    strategyDescription: "Proactively identify, manage, and reduce business risks to ensure long-term stability.",
    strategicVision: "Build an organisation that can withstand uncertainty and emerge stronger from disruption.",
    competitivePositioning: "Compete on stability, trustworthiness, and risk-adjusted returns.",
    timeHorizon: "long",
  },
  customer_success: {
    strategyName: "Customer Success & Retention Strategy",
    strategyDescription: "Build deep customer relationships that maximise satisfaction, retention, and lifetime value.",
    strategicVision: "Be known as the company that delivers the most consistent, measurable customer success.",
    competitivePositioning: "Compete on customer outcomes, satisfaction scores, and renewal rates.",
    timeHorizon: "medium",
  },
  knowledge: {
    strategyName: "Knowledge & Capability Development Strategy",
    strategyDescription: "Build organisational knowledge, skills, and intellectual assets that create durable competitive advantage.",
    strategicVision: "Become an organisation where knowledge and learning are core competitive assets.",
    competitivePositioning: "Compete on expertise, institutional knowledge, and capability depth.",
    timeHorizon: "long",
  },
};

const DEFAULT_FRAME: StrategyFrame = {
  strategyName: "Business Growth Strategy",
  strategyDescription: "Drive sustained business growth through focused resource allocation and strategic discipline.",
  strategicVision: "Build a resilient, growing business that delivers consistent value to customers and stakeholders.",
  competitivePositioning: "Compete on quality, reliability, and customer value.",
  timeHorizon: "medium",
};

export function formStrategy(input: StrategyFormationInput): StrategyFrame {
  return STRATEGY_FRAMES[input.scenarioType] ?? DEFAULT_FRAME;
}
