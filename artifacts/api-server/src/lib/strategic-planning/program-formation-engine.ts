// ─────────────────────────────────────────────────────────────────────────────
// Build 021: Strategic Planning Engine — Program Formation Engine
// Transforms strategic pillars into Strategic Programs.
// One program per pillar. Program type maps 1:1 to pillar type.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type { StrategicProgram, ProgramType, PlanHorizon } from "./types";

// ── Pillar type → program type mapping ───────────────────────────────────────
const PILLAR_TO_PROGRAM_TYPE: Record<string, ProgramType> = {
  revenue_growth: "revenue_program",
  operational_excellence: "operations_program",
  customer_experience: "customer_program",
  innovation: "innovation_program",
  technology: "technology_program",
  market_expansion: "market_program",
  talent: "talent_program",
  financial_strength: "finance_program",
  governance: "governance_program",
};

// ── Program specs per type ────────────────────────────────────────────────────
interface ProgramSpec {
  nameTemplate: string;
  descriptionTemplate: string;
  expectedDuration: PlanHorizon;
  baseConfidence: number;
}

const PROGRAM_SPECS: Record<ProgramType, ProgramSpec> = {
  revenue_program: {
    nameTemplate: "Revenue Growth Programme",
    descriptionTemplate:
      "Organised body of work to expand revenue through market development, product expansion, and conversion optimisation.",
    expectedDuration: "medium",
    baseConfidence: 0.75,
  },
  operations_program: {
    nameTemplate: "Operational Excellence Programme",
    descriptionTemplate:
      "Organised body of work to build efficient, reliable, and scalable operational capabilities across the business.",
    expectedDuration: "long",
    baseConfidence: 0.8,
  },
  customer_program: {
    nameTemplate: "Customer Experience Programme",
    descriptionTemplate:
      "Organised body of work to design and deliver customer journeys that build loyalty, satisfaction, and lifetime value.",
    expectedDuration: "medium",
    baseConfidence: 0.78,
  },
  innovation_program: {
    nameTemplate: "Innovation Programme",
    descriptionTemplate:
      "Organised body of work to explore, prototype, and deploy new products, services, and business model innovations.",
    expectedDuration: "long",
    baseConfidence: 0.65,
  },
  technology_program: {
    nameTemplate: "Technology Platform Programme",
    descriptionTemplate:
      "Organised body of work to build and mature the technology platforms that accelerate all business capabilities.",
    expectedDuration: "long",
    baseConfidence: 0.72,
  },
  market_program: {
    nameTemplate: "Market Expansion Programme",
    descriptionTemplate:
      "Organised body of work to enter new markets, segments, and geographies aligned with the strategic vision.",
    expectedDuration: "long",
    baseConfidence: 0.68,
  },
  talent_program: {
    nameTemplate: "Talent & People Programme",
    descriptionTemplate:
      "Organised body of work to attract, develop, and retain the people who drive business performance and culture.",
    expectedDuration: "medium",
    baseConfidence: 0.76,
  },
  finance_program: {
    nameTemplate: "Financial Strength Programme",
    descriptionTemplate:
      "Organised body of work to build capital efficiency, financial resilience, and sustainable profitability.",
    expectedDuration: "medium",
    baseConfidence: 0.8,
  },
  governance_program: {
    nameTemplate: "Governance & Compliance Programme",
    descriptionTemplate:
      "Organised body of work to establish the policies, controls, and accountability structures required for the strategy.",
    expectedDuration: "short",
    baseConfidence: 0.82,
  },
};

// ── Weight curve (mirrors executive-strategy pillar pattern) ─────────────────
function computeWeight(rank: number): number {
  const weights = [0.25, 0.20, 0.17, 0.14, 0.12, 0.09, 0.02];
  return weights[Math.min(rank, weights.length - 1)];
}

// ── Pillar input shape (what strategy-registry provides) ─────────────────────
export interface PillarInput {
  id: string;
  pillarType: string;
  pillarName: string;
  priority: number;
  alignmentScore: number;
}

// ── Main formation function ───────────────────────────────────────────────────
export function formPrograms(params: {
  planId: string;
  reportId: string;
  businessId: number;
  pillars: PillarInput[];
  strategyAlignmentScore: number;
}): Omit<StrategicProgram, "initiatives">[] {
  const { planId, reportId, businessId, pillars, strategyAlignmentScore } = params;

  // Sort by pillar priority ascending (lower priority number = higher importance)
  const sorted = [...pillars].sort((a, b) => a.priority - b.priority);

  return sorted.map((pillar, rank) => {
    const programType: ProgramType =
      PILLAR_TO_PROGRAM_TYPE[pillar.pillarType] ?? "operations_program";
    const spec = PROGRAM_SPECS[programType];
    const weight = computeWeight(rank);
    const alignmentScore =
      Math.round((pillar.alignmentScore * 0.7 + strategyAlignmentScore * 0.3) * 100) / 100;
    const confidence = Math.round(spec.baseConfidence * 100) / 100;

    return {
      id: randomUUID(),
      planId,
      reportId,
      businessId,
      pillarId: pillar.id,
      pillarType: pillar.pillarType,
      programType,
      programName: spec.nameTemplate,
      programDescription: spec.descriptionTemplate,
      priority: rank + 1,
      weight,
      expectedDuration: spec.expectedDuration,
      initiativeCount: 0,
      sequenceLayer: 0, // updated by sequencing engine
      alignmentScore,
      confidence,
    };
  });
}
