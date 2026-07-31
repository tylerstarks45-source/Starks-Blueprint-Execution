// ─────────────────────────────────────────────────────────────────────────────
// Build 024: Execution Orchestration Engine — Assignment Engine
// Maps every Work Package to the most appropriate Execution Owner type.
// Deterministic: phase type + complexity + capability name drive the decision.
// Never provisions resources. Never assigns named individuals.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type { ExecutionAssignment, ExecutionOwnerType, ExecutionClass, ComplexityLevel, BusinessCriticality } from "./types";

export interface WorkPackageInput {
  id: string;
  packageTitle: string;
  capabilityName: string;
  phaseType: string;
  complexityLevel: string;
  businessCriticality: string;
  sequencePosition?: number | null;
}

// Phase + complexity → owner type
function deriveOwnerType(phaseType: string, complexityLevel: string, capabilityName: string): ExecutionOwnerType {
  const name = capabilityName.toLowerCase();

  // Capability-name-specific overrides
  if (name.includes("ai") || name.includes("machine learning") || name.includes("ml")) return "ai_agent";
  if (name.includes("automation") || name.includes("rpa") || name.includes("workflow automation")) return "automation";
  if (name.includes("integration") || name.includes("api") || name.includes("connector")) return "integration";
  if (name.includes("external") || name.includes("vendor") || name.includes("partner")) return "external_system";
  if (name.includes("future") || name.includes("not yet") || name.includes("planned")) return "future_capability";

  // Phase-based defaults
  switch (phaseType) {
    case "preparation":
      // Governance, compliance, leadership — human judgment required
      return complexityLevel === "critical" || complexityLevel === "high" ? "human" : "department";
    case "foundation":
      // Technology, infrastructure — departments with automation
      if (name.includes("platform") || name.includes("infrastructure") || name.includes("cloud")) return "automation";
      return "department";
    case "implementation":
      // Operational delivery — mix of departments and semi-automation
      if (name.includes("analytics") || name.includes("data") || name.includes("reporting")) return "automation";
      return "department";
    case "validation":
      // Quality checks — human oversight
      return "human";
    case "optimization":
      // AI and automation improvement
      return "ai_agent";
    default:
      return complexityLevel === "critical" ? "human" : "department";
  }
}

// Owner type → execution class
export function ownerTypeToClass(ownerType: ExecutionOwnerType): ExecutionClass {
  switch (ownerType) {
    case "human":        return "manual";
    case "department":   return "semi_automated";
    case "ai_agent":     return "automated";
    case "automation":   return "automated";
    case "integration":  return "automated";
    case "external_system": return "external";
    case "future_capability": return "deferred";
  }
}

export function buildOwnerName(ownerType: ExecutionOwnerType, phaseType: string): string {
  switch (ownerType) {
    case "human":           return `Human Lead — ${phaseType.charAt(0).toUpperCase() + phaseType.slice(1)} Phase`;
    case "department":      return `Department Team — ${phaseType.charAt(0).toUpperCase() + phaseType.slice(1)}`;
    case "ai_agent":        return "AI Agent — Autonomous Execution";
    case "automation":      return "Automation System — Scripted Execution";
    case "integration":     return "Integration Layer — API-Driven Execution";
    case "external_system": return "External System / Vendor";
    case "future_capability": return "Deferred — Future Capability Required";
  }
}

export function buildOwnerDescription(ownerType: ExecutionOwnerType): string {
  switch (ownerType) {
    case "human":           return "Work requires human judgment, creativity, or governance authority that cannot be delegated to automated systems.";
    case "department":      return "Work is delivered by a functional department team with defined processes, potentially supported by tooling.";
    case "ai_agent":        return "Work is performed autonomously by an AI agent using natural language instructions and structured outputs.";
    case "automation":      return "Work is executed by a scripted or robotic process automation system without human intervention.";
    case "integration":     return "Work is executed via API or system integration, triggered programmatically with no human interaction required.";
    case "external_system": return "Work is performed by an external vendor, partner, or third-party system outside of direct organizational control.";
    case "future_capability": return "Work cannot currently be executed because the required capability does not yet exist and has been deferred.";
  }
}

export function buildAssignmentRationale(
  ownerType: ExecutionOwnerType,
  executionClass: ExecutionClass,
  phaseType: string,
  complexityLevel: string,
  capabilityName: string,
): string {
  const classLabel = executionClass === "semi_automated" ? "semi-automated" : executionClass;
  return (
    `${capabilityName} is assigned to ${ownerType.replace("_", " ")} as a ${classLabel} ${phaseType}-phase activity ` +
    `(complexity: ${complexityLevel}). ${buildOwnerDescription(ownerType)}`
  );
}

export function buildExecutionAssignments(params: {
  workPackages: WorkPackageInput[];
  planId: string;
  reportId: string;
  businessId: number;
  ownerIds: Map<ExecutionOwnerType, string>;
}): ExecutionAssignment[] {
  const { workPackages, planId, reportId, businessId, ownerIds } = params;

  return workPackages.map((wp) => {
    const ownerType = deriveOwnerType(wp.phaseType, wp.complexityLevel, wp.capabilityName);
    const executionClass = ownerTypeToClass(ownerType);
    const ownerId = ownerIds.get(ownerType) ?? randomUUID();
    const rationale = buildAssignmentRationale(
      ownerType,
      executionClass,
      wp.phaseType,
      wp.complexityLevel,
      wp.capabilityName,
    );

    return {
      id: randomUUID(),
      planId,
      reportId,
      businessId,
      ownerId,
      workPackageId: wp.id,
      packageTitle: wp.packageTitle,
      phaseType: wp.phaseType,
      ownerType,
      executionClass,
      complexityLevel: (wp.complexityLevel as ComplexityLevel) ?? "medium",
      businessCriticality: (wp.businessCriticality as BusinessCriticality) ?? "medium",
      blockers: [],
      policies: [],
      readinessScore: 0,
      sequencePosition: wp.sequencePosition ?? undefined,
      rationale,
    };
  });
}
