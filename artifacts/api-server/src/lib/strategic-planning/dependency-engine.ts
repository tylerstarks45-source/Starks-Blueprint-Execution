// ─────────────────────────────────────────────────────────────────────────────
// Build 021: Strategic Planning Engine — Dependency Engine
// Maps: program, initiative, technology, resource, and cross-functional
// dependencies. 5 universal + type-specific extras per plan.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type { PlanningDependency, DependencyType, SeverityLevel } from "./types";
import type { ProgramType } from "./types";

interface DependencyTemplate {
  dependencyType: DependencyType;
  title: string;
  description: string;
  severity: SeverityLevel;
  mitigationNote: string;
}

// ── 5 universal dependencies present in every plan ───────────────────────────
const UNIVERSAL_DEPENDENCIES: DependencyTemplate[] = [
  {
    dependencyType: "program",
    title: "Cross-Programme Sequencing Dependency",
    description:
      "Multiple strategic programmes share overlapping resources, capabilities, and leadership attention. Delivery sequencing must respect these constraints.",
    severity: "high",
    mitigationNote:
      "Establish a programme sequencing board to monitor cross-programme dependencies and surface conflicts early.",
  },
  {
    dependencyType: "technology",
    title: "Core Technology Platform Readiness",
    description:
      "Strategic initiatives across programmes depend on foundational technology platforms being available and stable before deployment.",
    severity: "high",
    mitigationNote:
      "Prioritise technology programme delivery and confirm platform readiness gates before dependent initiative launches.",
  },
  {
    dependencyType: "resource",
    title: "Leadership & Talent Availability",
    description:
      "Key initiatives require senior leadership sponsorship and skilled talent that may be constrained across concurrent programmes.",
    severity: "medium",
    mitigationNote:
      "Map resource requirements across all programmes before committing initiative timelines; identify critical talent gaps early.",
  },
  {
    dependencyType: "cross_functional",
    title: "Executive Alignment & Decision Authority",
    description:
      "Strategic plan execution requires sustained executive alignment and clear decision authority across programme boundaries.",
    severity: "high",
    mitigationNote:
      "Establish a strategic governance forum with defined decision rights and an escalation path for cross-programme conflicts.",
  },
  {
    dependencyType: "resource",
    title: "Capital Allocation Dependency",
    description:
      "Strategic programmes depend on committed capital allocation. Budget uncertainty or reallocation creates cascading delivery risk.",
    severity: "high",
    mitigationNote:
      "Lock programme budgets to the strategic plan cycle. Establish a change-control process for capital reallocation requests.",
  },
];

// ── Type-specific extras ──────────────────────────────────────────────────────
const TYPE_EXTRAS: Partial<Record<ProgramType, DependencyTemplate[]>> = {
  technology_program: [
    {
      dependencyType: "technology",
      title: "Technology Vendor & Partnership Dependencies",
      description:
        "Technology programme delivery depends on vendor commitments, platform stability, and partnership agreements.",
      severity: "medium",
      mitigationNote: "Confirm key vendor contracts and SLAs before committing to technology programme milestones.",
    },
  ],
  market_program: [
    {
      dependencyType: "initiative",
      title: "Market Intelligence Pre-Requisite",
      description:
        "Market expansion initiatives depend on validated market intelligence before launch decisions are made.",
      severity: "medium",
      mitigationNote:
        "Complete market intelligence initiative before committing to market entry initiative launch.",
    },
  ],
  talent_program: [
    {
      dependencyType: "cross_functional",
      title: "Talent Market Availability Dependency",
      description:
        "Talent programme delivery depends on external talent market conditions that may constrain acquisition timelines.",
      severity: "medium",
      mitigationNote:
        "Build contingency into talent acquisition timelines and develop internal capability-build pathways in parallel.",
    },
  ],
  innovation_program: [
    {
      dependencyType: "program",
      title: "Innovation-to-Operations Handoff Dependency",
      description:
        "Innovation programme outcomes depend on operational programme readiness to absorb and scale validated innovations.",
      severity: "medium",
      mitigationNote:
        "Establish a structured handoff protocol between innovation and operational programmes before the pipeline is active.",
    },
  ],
};

export function identifyDependencies(params: {
  planId: string;
  reportId: string;
  businessId: number;
  programTypes: ProgramType[];
}): PlanningDependency[] {
  const { planId, reportId, businessId, programTypes } = params;

  const templates: DependencyTemplate[] = [...UNIVERSAL_DEPENDENCIES];

  for (const pt of programTypes) {
    const extras = TYPE_EXTRAS[pt];
    if (extras) {
      templates.push(...extras);
    }
  }

  return templates.map((tmpl) => ({
    id: randomUUID(),
    planId,
    reportId,
    businessId,
    dependencyType: tmpl.dependencyType,
    title: tmpl.title,
    description: tmpl.description,
    severity: tmpl.severity,
    mitigationNote: tmpl.mitigationNote,
    fromEntityType: undefined,
    fromEntityId: undefined,
    toEntityType: undefined,
    toEntityId: undefined,
  }));
}
