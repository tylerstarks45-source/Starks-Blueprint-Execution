// ─── Build 020: Strategic Dependency Engine ──────────────────────────────────
//
// Identifies strategic dependencies across 5 types for each strategy.
// Deterministic — no AI, no mutation.

import { randomUUID } from "crypto";
import type {
  StrategicDependency,
  DependencyType,
  SeverityLevel,
} from "./types";

interface DependencySpec {
  dependencyType: DependencyType;
  title: string;
  description: (scenarioType: string) => string;
  severity: SeverityLevel;
  mitigationNote: string;
}

const UNIVERSAL_DEPENDENCIES: DependencySpec[] = [
  {
    dependencyType: "financial",
    title: "Capital Availability",
    description: (t) => `The ${t.replace(/_/g, " ")} strategy requires adequate capital allocation to fund strategic initiatives. Financial dependency is present for all major strategic directions.`,
    severity: "high",
    mitigationNote: "Maintain a strategic investment budget separate from operating funds. Prioritise initiatives by ROI and available runway.",
  },
  {
    dependencyType: "people",
    title: "Leadership Alignment",
    description: (t) => `Executing the ${t.replace(/_/g, " ")} strategy requires full alignment across the leadership team on priorities and trade-offs.`,
    severity: "high",
    mitigationNote: "Conduct a strategy alignment session before execution begins. Establish shared OKRs for leadership.",
  },
  {
    dependencyType: "cross_functional",
    title: "Cross-Functional Coordination",
    description: (_t) => "The strategy spans multiple business functions and requires coordinated effort across departments.",
    severity: "medium",
    mitigationNote: "Assign a strategy owner and establish a cross-functional steering committee.",
  },
  {
    dependencyType: "technology",
    title: "Core Technology Readiness",
    description: (_t) => "Strategic execution depends on the readiness and reliability of core technology systems.",
    severity: "medium",
    mitigationNote: "Audit technology readiness before committing to strategy timelines.",
  },
  {
    dependencyType: "business",
    title: "Market Conditions Stability",
    description: (_t) => "Strategic outcomes are partially dependent on stable market conditions within the planning horizon.",
    severity: "medium",
    mitigationNote: "Build scenario sensitivity into the strategy; define trigger points for strategic pivots.",
  },
];

// Type-specific additional dependencies
const SCENARIO_EXTRA_DEPENDENCIES: Partial<Record<string, DependencySpec[]>> = {
  revenue_growth: [
    { dependencyType: "business", title: "Market Demand",  description: () => "Revenue growth requires sustained or growing market demand for the business's products or services.", severity: "high", mitigationNote: "Validate market demand signals before committing to growth targets." },
  ],
  automation: [
    { dependencyType: "technology", title: "Integration Infrastructure", description: () => "Automation initiatives depend on integration capability between existing systems.", severity: "high", mitigationNote: "Conduct an integration feasibility assessment before automation planning." },
  ],
  marketing: [
    { dependencyType: "cross_functional", title: "Sales & Marketing Alignment", description: () => "Marketing strategies depend on tight alignment with sales on ideal customer profile and pipeline conversion.", severity: "high", mitigationNote: "Establish shared revenue goals and joint pipeline review cadences." },
  ],
  infrastructure: [
    { dependencyType: "financial", title: "Infrastructure Investment Commitment", description: () => "Infrastructure strategies require sustained multi-period investment commitments.", severity: "high", mitigationNote: "Secure multi-year budget approval before beginning infrastructure transformation." },
  ],
  talent: [
    { dependencyType: "people", title: "Talent Market Availability", description: () => "Talent strategies depend on the availability of qualified candidates in relevant markets.", severity: "medium", mitigationNote: "Develop talent pipelines and internal development paths to reduce market dependency." },
  ],
};

export function generateDependencies(
  strategyId: string,
  reportId: string,
  businessId: number,
  scenarioType: string,
): StrategicDependency[] {
  const extras = SCENARIO_EXTRA_DEPENDENCIES[scenarioType] ?? [];
  const all = [...UNIVERSAL_DEPENDENCIES, ...extras];

  return all.map((spec): StrategicDependency => ({
    id: randomUUID(),
    strategyId,
    reportId,
    businessId,
    dependencyType: spec.dependencyType,
    title: spec.title,
    description: spec.description(scenarioType),
    severity: spec.severity,
    mitigationNote: spec.mitigationNote,
  }));
}
