// ─────────────────────────────────────────────────────────────────────────────
// Build 023: Operational Planning Engine — Dependency Resolution Engine
// Maps execution dependencies across 5 types:
//   package | capability | technology | cross_functional | external
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type { ExecutionDependency, ExecutionDependencyType, OperationalPhaseType, DependencySeverity } from "./types";

interface WorkPackageInput {
  id: string;
  phaseType: OperationalPhaseType;
  complexityLevel: string;
  businessCriticality: string;
  capabilityName: string;
}

// Universal cross-phase dependencies — always generated
const UNIVERSAL_PHASE_DEPS: Array<{
  fromPhase: OperationalPhaseType;
  toPhase: OperationalPhaseType;
  type: ExecutionDependencyType;
  title: string;
  description: string;
  severity: DependencySeverity;
}> = [
  {
    fromPhase: "preparation",
    toPhase: "foundation",
    type: "capability",
    title: "Governance readiness gates foundation build",
    description: "Foundation phase cannot begin until governance frameworks, security baseline, and leadership alignment from the preparation phase are confirmed.",
    severity: "critical",
  },
  {
    fromPhase: "foundation",
    toPhase: "implementation",
    type: "technology",
    title: "Technology infrastructure gates operational delivery",
    description: "Implementation phase requires core technology, infrastructure, and integration capabilities from the foundation phase to be operational.",
    severity: "critical",
  },
  {
    fromPhase: "implementation",
    toPhase: "validation",
    type: "package",
    title: "Implementation completion gates validation",
    description: "Validation cannot begin until all implementation-phase work packages have delivered their stated outcomes.",
    severity: "high",
  },
  {
    fromPhase: "validation",
    toPhase: "optimization",
    type: "capability",
    title: "Validated capability maturity gates optimization",
    description: "Optimization phase begins only after validation confirms all prior capabilities meet their required maturity levels.",
    severity: "high",
  },
  {
    fromPhase: "preparation",
    toPhase: "implementation",
    type: "cross_functional",
    title: "Compliance approval gates operational execution",
    description: "Operational implementation requires compliance sign-off completed during the preparation phase.",
    severity: "medium",
  },
];

// Capability-type-specific dependencies
function resolveCapabilityDeps(
  workPackages: WorkPackageInput[],
  planId: string,
  reportId: string,
  businessId: number,
): ExecutionDependency[] {
  const deps: ExecutionDependency[] = [];

  // Technology packages depend on infrastructure packages
  const infraPackages = workPackages.filter((wp) =>
    ["infrastructure", "technology"].some((d) => wp.capabilityName.toLowerCase().includes(d))
  );
  const techPackages = workPackages.filter(
    (wp) => wp.phaseType === "foundation" && !infraPackages.find((i) => i.id === wp.id)
  );

  if (infraPackages.length > 0 && techPackages.length > 0) {
    deps.push({
      id: randomUUID(),
      planId,
      reportId,
      businessId,
      dependencyType: "technology",
      title: "Technology capability depends on infrastructure readiness",
      description: "Technology capabilities in the foundation phase require core infrastructure capabilities to be established first.",
      fromPackageId: infraPackages[0]!.id,
      toPackageId: techPackages[0]!.id,
      fromPhaseType: "foundation",
      toPhaseType: "foundation",
      severity: "high",
      mitigationNote: "Ensure infrastructure work packages are prioritised ahead of technology platform work packages within the foundation phase.",
    });
  }

  // AI/automation packages depend on data/knowledge packages
  const knowledgePackages = workPackages.filter((wp) =>
    wp.capabilityName.toLowerCase().includes("knowledge") || wp.capabilityName.toLowerCase().includes("data")
  );
  const aiPackages = workPackages.filter(
    (wp) => wp.phaseType === "optimization"
  );
  if (knowledgePackages.length > 0 && aiPackages.length > 0) {
    deps.push({
      id: randomUUID(),
      planId,
      reportId,
      businessId,
      dependencyType: "capability",
      title: "AI/automation depends on knowledge and data foundations",
      description: "Optimization-phase AI and automation capabilities require knowledge management and data platform capabilities to be operational.",
      fromPackageId: knowledgePackages[0]!.id,
      toPackageId: aiPackages[0]!.id,
      fromPhaseType: knowledgePackages[0]!.phaseType,
      toPhaseType: "optimization",
      severity: "medium",
      mitigationNote: "Prioritise knowledge and data capability delivery before commencing AI and automation work packages.",
    });
  }

  // External dependency — for any critical work package without a clear internal enabler
  const criticalPackages = workPackages.filter((wp) => wp.businessCriticality === "critical");
  if (criticalPackages.length > 0) {
    deps.push({
      id: randomUUID(),
      planId,
      reportId,
      businessId,
      dependencyType: "external",
      title: "Critical capabilities may depend on external service providers",
      description: `${criticalPackages.length} critical capability work package(s) may require external vendor, partner, or system integration support.`,
      fromPhaseType: undefined,
      toPhaseType: criticalPackages[0]!.phaseType,
      severity: "medium",
      mitigationNote: "Identify and engage external providers early in the preparation phase to avoid blocking the critical path.",
    });
  }

  return deps;
}

export function resolveExecutionDependencies(params: {
  planId: string;
  reportId: string;
  businessId: number;
  workPackages: WorkPackageInput[];
  activePhaseTypes: OperationalPhaseType[];
}): ExecutionDependency[] {
  const { planId, reportId, businessId, workPackages, activePhaseTypes } = params;

  const deps: ExecutionDependency[] = [];

  // Universal phase-gating dependencies
  for (const ud of UNIVERSAL_PHASE_DEPS) {
    if (activePhaseTypes.includes(ud.fromPhase) && activePhaseTypes.includes(ud.toPhase)) {
      deps.push({
        id: randomUUID(),
        planId,
        reportId,
        businessId,
        dependencyType: ud.type,
        title: ud.title,
        description: ud.description,
        fromPhaseType: ud.fromPhase,
        toPhaseType: ud.toPhase,
        severity: ud.severity,
        mitigationNote: undefined,
      });
    }
  }

  // Capability-specific deps
  const capDeps = resolveCapabilityDeps(workPackages, planId, reportId, businessId);
  deps.push(...capDeps);

  // Cross-functional: any multi-phase plan needs coordination dependency
  if (activePhaseTypes.length >= 3) {
    deps.push({
      id: randomUUID(),
      planId,
      reportId,
      businessId,
      dependencyType: "cross_functional",
      title: "Multi-phase coordination requires operational oversight",
      description: "A plan spanning multiple phases requires a cross-functional coordination mechanism to track progress, resolve blockers, and manage handoffs between phases.",
      fromPhaseType: "preparation",
      toPhaseType: "optimization",
      severity: "medium",
      mitigationNote: "Establish an operational planning oversight function during the preparation phase.",
    });
  }

  return deps;
}
