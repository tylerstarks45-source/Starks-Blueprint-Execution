// ─────────────────────────────────────────────────────────────────────────────
// Build 021: Strategic Planning Engine — Initiative Engine
// Creates Strategic Initiatives beneath each program.
// Initiatives describe major bodies of work — never individual tasks.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type { StrategicInitiative, InitiativeType, EffortLevel, ComplexityLevel } from "./types";
import type { ProgramType } from "./types";

interface InitiativeTemplate {
  initiativeName: string;
  initiativeDescription: string;
  initiativeType: InitiativeType;
  effort: EffortLevel;
  complexity: ComplexityLevel;
}

// 2–3 initiative templates per program type
const PROGRAM_INITIATIVES: Record<ProgramType, InitiativeTemplate[]> = {
  revenue_program: [
    {
      initiativeName: "Revenue Channel Development",
      initiativeDescription: "Develop and optimise primary and secondary revenue channels to expand addressable market coverage.",
      initiativeType: "development",
      effort: "high",
      complexity: "medium",
    },
    {
      initiativeName: "Conversion Optimisation Initiative",
      initiativeDescription: "Systematically identify and remove conversion friction across the customer acquisition funnel.",
      initiativeType: "optimisation",
      effort: "medium",
      complexity: "medium",
    },
    {
      initiativeName: "Market Penetration Initiative",
      initiativeDescription: "Deepen penetration in existing markets through targeted campaigns, partnerships, and product positioning.",
      initiativeType: "deployment",
      effort: "high",
      complexity: "high",
    },
  ],
  operations_program: [
    {
      initiativeName: "Process Excellence Initiative",
      initiativeDescription: "Map, analyse, and redesign core operational processes to eliminate waste and reduce cycle times.",
      initiativeType: "optimisation",
      effort: "high",
      complexity: "high",
    },
    {
      initiativeName: "Operational Infrastructure Initiative",
      initiativeDescription: "Build the operational infrastructure — systems, workflows, and controls — required to scale efficiently.",
      initiativeType: "development",
      effort: "high",
      complexity: "high",
    },
  ],
  customer_program: [
    {
      initiativeName: "Customer Journey Redesign Initiative",
      initiativeDescription: "Redesign end-to-end customer journeys to remove friction, build loyalty, and increase lifetime value.",
      initiativeType: "development",
      effort: "high",
      complexity: "medium",
    },
    {
      initiativeName: "Customer Intelligence Initiative",
      initiativeDescription: "Build systematic capabilities to understand, segment, and anticipate customer needs.",
      initiativeType: "discovery",
      effort: "medium",
      complexity: "medium",
    },
    {
      initiativeName: "Retention & Loyalty Programme",
      initiativeDescription: "Design and deploy customer retention and loyalty mechanisms aligned with the strategic vision.",
      initiativeType: "deployment",
      effort: "medium",
      complexity: "medium",
    },
  ],
  innovation_program: [
    {
      initiativeName: "Innovation Discovery Initiative",
      initiativeDescription: "Structured exploration of new product, service, and business model opportunities with commercial potential.",
      initiativeType: "discovery",
      effort: "medium",
      complexity: "high",
    },
    {
      initiativeName: "Innovation Pipeline Development",
      initiativeDescription: "Build a repeatable innovation pipeline: ideation, validation, prototyping, and scaling frameworks.",
      initiativeType: "development",
      effort: "high",
      complexity: "high",
    },
  ],
  technology_program: [
    {
      initiativeName: "Core Platform Initiative",
      initiativeDescription: "Design and build the foundational technology platforms that underpin all key business capabilities.",
      initiativeType: "development",
      effort: "high",
      complexity: "high",
    },
    {
      initiativeName: "Technology Modernisation Initiative",
      initiativeDescription: "Systematically modernise legacy systems and technical debt to reduce operational risk and enable scale.",
      initiativeType: "optimisation",
      effort: "high",
      complexity: "high",
    },
    {
      initiativeName: "Data & Analytics Initiative",
      initiativeDescription: "Build the data infrastructure and analytics capabilities required for informed decision-making at every level.",
      initiativeType: "development",
      effort: "medium",
      complexity: "medium",
    },
  ],
  market_program: [
    {
      initiativeName: "Market Entry Initiative",
      initiativeDescription: "Conduct structured market entry activities including research, positioning, partnership development, and go-to-market launch.",
      initiativeType: "deployment",
      effort: "high",
      complexity: "high",
    },
    {
      initiativeName: "Market Intelligence Initiative",
      initiativeDescription: "Build ongoing capabilities to monitor competitive dynamics, customer trends, and market opportunities.",
      initiativeType: "discovery",
      effort: "medium",
      complexity: "medium",
    },
  ],
  talent_program: [
    {
      initiativeName: "Talent Acquisition Initiative",
      initiativeDescription: "Design and execute a talent acquisition strategy to attract the capabilities required for strategic delivery.",
      initiativeType: "deployment",
      effort: "medium",
      complexity: "medium",
    },
    {
      initiativeName: "Capability Development Initiative",
      initiativeDescription: "Build the internal capability development programmes required to grow talent aligned with the strategy.",
      initiativeType: "development",
      effort: "medium",
      complexity: "medium",
    },
  ],
  finance_program: [
    {
      initiativeName: "Capital Efficiency Initiative",
      initiativeDescription: "Identify and implement capital efficiency improvements across investment allocation and cost structure.",
      initiativeType: "optimisation",
      effort: "medium",
      complexity: "medium",
    },
    {
      initiativeName: "Financial Resilience Initiative",
      initiativeDescription: "Build financial buffers, scenario planning capabilities, and risk management frameworks.",
      initiativeType: "governance",
      effort: "medium",
      complexity: "medium",
    },
  ],
  governance_program: [
    {
      initiativeName: "Governance Framework Initiative",
      initiativeDescription: "Establish the governance frameworks, policies, and accountability structures required by the strategy.",
      initiativeType: "governance",
      effort: "medium",
      complexity: "medium",
    },
    {
      initiativeName: "Compliance & Risk Initiative",
      initiativeDescription: "Build compliance monitoring and risk management capabilities aligned with strategic and regulatory requirements.",
      initiativeType: "governance",
      effort: "low",
      complexity: "medium",
    },
  ],
};

export function createInitiatives(params: {
  programId: string;
  programType: string;
  planId: string;
  reportId: string;
  businessId: number;
  programPriority: number;
  programAlignmentScore: number;
}): StrategicInitiative[] {
  const { programId, programType, planId, reportId, businessId, programPriority, programAlignmentScore } = params;

  const templates = PROGRAM_INITIATIVES[programType as ProgramType] ?? PROGRAM_INITIATIVES.operations_program;

  return templates.map((tmpl, idx) => {
    const priority = programPriority * 10 + idx + 1;
    const alignmentScore = Math.round((programAlignmentScore * 0.85 + 0.15 * (1 - idx * 0.1)) * 100) / 100;
    const confidence = tmpl.complexity === "high" ? 0.65 : tmpl.complexity === "medium" ? 0.75 : 0.85;

    return {
      id: randomUUID(),
      programId,
      planId,
      reportId,
      businessId,
      initiativeName: tmpl.initiativeName,
      initiativeDescription: tmpl.initiativeDescription,
      initiativeType: tmpl.initiativeType,
      effort: tmpl.effort,
      complexity: tmpl.complexity,
      priority,
      sequencePosition: idx,
      milestoneCount: 0,
      alignmentScore,
      confidence,
      milestones: [],
    };
  });
}
