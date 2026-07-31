// ─────────────────────────────────────────────────────────────────────────────
// Build 023: Operational Planning Engine — Work Package Engine
// Transforms capability requirements into outcome-oriented work packages.
// Work packages are NEVER individual tasks — they represent capability outcomes.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type { WorkPackage, OperationalPhaseType, ComplexityLevel, BusinessCriticality } from "./types";

export interface CapabilityRequirementInput {
  id: string;
  capabilityName: string;
  capabilityDescription: string;
  domainType: string;
  requiredLevel: string;
  gapSeverity: string;
  businessCriticality: string;
  isMissing: boolean;
  priority: number;
}

// Maps domain types to operational phases
const DOMAIN_TO_PHASE: Record<string, OperationalPhaseType> = {
  governance: "preparation",
  compliance: "preparation",
  leadership: "preparation",
  security: "preparation",
  infrastructure: "foundation",
  technology: "foundation",
  integrations: "foundation",
  finance: "foundation",
  people: "foundation",
  operations: "implementation",
  sales: "implementation",
  marketing: "implementation",
  customer: "implementation",
  knowledge: "implementation",
  automation: "optimization",
  ai: "optimization",
};

// Gap severity → complexity level
const GAP_SEVERITY_TO_COMPLEXITY: Record<string, ComplexityLevel> = {
  critical: "critical",
  high: "high",
  medium: "medium",
  low: "low",
  none: "low",
};

// Effort scores by complexity
const COMPLEXITY_EFFORT: Record<ComplexityLevel, number> = {
  critical: 0.95,
  high: 0.75,
  medium: 0.5,
  low: 0.25,
};

// Outcome statement templates per required level
function buildOutcomeStatement(capabilityName: string, requiredLevel: string, isMissing: boolean): string {
  if (isMissing) {
    return `${capabilityName} capability is built from scratch and operational at ${requiredLevel} maturity, enabling the business to perform this function reliably.`;
  }
  switch (requiredLevel) {
    case "optimising":
      return `${capabilityName} is continuously improved and operating at optimising maturity, delivering measurable competitive advantage.`;
    case "managed":
      return `${capabilityName} is measurably managed with quantified performance targets and proactive management practices established.`;
    case "defined":
      return `${capabilityName} is formally defined with documented processes, clear ownership, and consistent repeatable execution.`;
    case "basic":
      return `${capabilityName} is established at a basic operational level with foundational practices and initial governance in place.`;
    default:
      return `${capabilityName} capability is delivered at the required maturity level, meeting the operational standards for this business.`;
  }
}

export function buildWorkPackages(params: {
  requirements: CapabilityRequirementInput[];
  planId: string;
  reportId: string;
  businessId: number;
  phaseIds: Map<OperationalPhaseType, string>;
}): WorkPackage[] {
  const { requirements, planId, reportId, businessId, phaseIds } = params;

  return requirements.map((req, idx) => {
    const phaseType = DOMAIN_TO_PHASE[req.domainType] ?? "implementation";
    const phaseId = phaseIds.get(phaseType) ?? "";
    const complexityLevel: ComplexityLevel = GAP_SEVERITY_TO_COMPLEXITY[req.gapSeverity] ?? "medium";
    const businessCrit: BusinessCriticality = (req.businessCriticality as BusinessCriticality) ?? "medium";
    const effortScore = COMPLEXITY_EFFORT[complexityLevel];

    return {
      id: randomUUID(),
      phaseId,
      planId,
      reportId,
      businessId,
      capabilityRequirementId: req.id,
      capabilityName: req.capabilityName,
      packageTitle: `Deliver: ${req.capabilityName}`,
      packageDescription: req.capabilityDescription,
      outcomeStatement: buildOutcomeStatement(req.capabilityName, req.requiredLevel, req.isMissing),
      phaseType,
      complexityLevel,
      businessCriticality: businessCrit,
      effortScore,
      sequencePosition: undefined,
      priority: req.priority + idx,
    };
  });
}
