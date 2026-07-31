// ─────────────────────────────────────────────────────────────────────────────
// Build 023: Operational Planning Engine — Sequencing Engine
// Produces deterministic execution ordering of work packages.
// Logic: phase order → within-phase priority → within-phase complexity (desc)
// NO scheduling. NO calendar dates. Logical ordering only.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type { ExecutionSequence, OperationalPhase, ExecutionDependency } from "./types";

const PHASE_ORDER: Record<string, number> = {
  preparation: 1,
  foundation: 2,
  implementation: 3,
  validation: 4,
  optimization: 5,
};

const COMPLEXITY_WEIGHT: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function produceExecutionSequence(params: {
  planId: string;
  reportId: string;
  businessId: number;
  phases: OperationalPhase[];
  dependencies: ExecutionDependency[];
}): ExecutionSequence[] {
  const { planId, reportId, businessId, phases, dependencies } = params;

  // Sort phases by phase order
  const sortedPhases = [...phases].sort((a, b) => PHASE_ORDER[a.phaseType] - PHASE_ORDER[b.phaseType]);

  // Build package → prerequisite map from package-type dependencies
  const prereqMap = new Map<string, string[]>();
  for (const dep of dependencies) {
    if (dep.dependencyType === "package" && dep.fromPackageId && dep.toPackageId) {
      const existing = prereqMap.get(dep.toPackageId) ?? [];
      existing.push(dep.fromPackageId);
      prereqMap.set(dep.toPackageId, existing);
    }
  }

  const sequences: ExecutionSequence[] = [];
  let globalPosition = 1;

  for (const phase of sortedPhases) {
    // Sort work packages within phase: priority asc, then complexity desc
    const sortedPackages = [...phase.workPackages].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      const cw = (COMPLEXITY_WEIGHT[b.complexityLevel] ?? 2) - (COMPLEXITY_WEIGHT[a.complexityLevel] ?? 2);
      if (cw !== 0) return cw;
      return a.capabilityName.localeCompare(b.capabilityName);
    });

    sortedPackages.forEach((wp, withinPhaseIdx) => {
      const prerequisites = prereqMap.get(wp.id) ?? [];

      // Rationale describes why this package is in this position
      const rationale = buildPositionRationale(wp.phaseType, wp.capabilityName, withinPhaseIdx, prerequisites);

      sequences.push({
        id: randomUUID(),
        planId,
        reportId,
        businessId,
        workPackageId: wp.id,
        sequencePosition: globalPosition,
        phaseOrder: PHASE_ORDER[wp.phaseType] ?? 0,
        withinPhaseOrder: withinPhaseIdx + 1,
        prerequisitePackageIds: prerequisites,
        rationale,
      });

      globalPosition++;
    });
  }

  return sequences;
}

function buildPositionRationale(
  phaseType: string,
  capabilityName: string,
  withinPhaseIdx: number,
  prerequisites: string[],
): string {
  const phaseContext: Record<string, string> = {
    preparation: "positioned in the preparation phase to establish governance and compliance foundations before operational work begins",
    foundation: "positioned in the foundation phase to build core enabling infrastructure and technology before operational delivery",
    implementation: "positioned in the implementation phase as a direct operational capability required for business performance",
    validation: "positioned in the validation phase to confirm capability maturity and readiness before optimization",
    optimization: "positioned in the optimization phase to drive continuous improvement once foundational capabilities are proven",
  };

  const prereqNote =
    prerequisites.length > 0
      ? ` Execution depends on ${prerequisites.length} prerequisite work package(s).`
      : "";

  return `${capabilityName} is ${phaseContext[phaseType] ?? "sequenced based on operational logic"}.${prereqNote}`;
}
