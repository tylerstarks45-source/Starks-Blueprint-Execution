// ─────────────────────────────────────────────────────────────────────────────
// Build 024: Execution Orchestration Engine — Blocker Detection Engine
// Identifies 5 blocker types per assignment:
//   missing_capability | missing_approval | missing_dependency
//   | missing_integration | missing_resource
// ─────────────────────────────────────────────────────────────────────────────
import type { ExecutionBlocker, ExecutionAssignment, BlockerType, BlockerSeverity } from "./types";

function severityFromComplexity(complexityLevel: string, businessCriticality: string): BlockerSeverity {
  if (businessCriticality === "critical" || complexityLevel === "critical") return "critical";
  if (businessCriticality === "high" || complexityLevel === "high") return "high";
  if (complexityLevel === "medium") return "medium";
  return "low";
}

function detectCapabilityBlockers(assignment: ExecutionAssignment): ExecutionBlocker[] {
  const blockers: ExecutionBlocker[] = [];

  if (assignment.ownerType === "future_capability") {
    blockers.push({
      blockerType: "missing_capability",
      title: `Capability not yet available: ${assignment.packageTitle}`,
      description: `The execution owner for '${assignment.packageTitle}' is classified as 'future capability', meaning the required organisational or technical capability does not yet exist.`,
      severity: severityFromComplexity(assignment.complexityLevel, assignment.businessCriticality),
      mitigationNote: "Build or acquire the capability before this assignment can enter the execution queue.",
    });
  }

  return blockers;
}

function detectApprovalBlockers(assignment: ExecutionAssignment): ExecutionBlocker[] {
  const blockers: ExecutionBlocker[] = [];

  if (assignment.businessCriticality === "critical") {
    blockers.push({
      blockerType: "missing_approval",
      title: `Executive approval required: ${assignment.packageTitle}`,
      description: `'${assignment.packageTitle}' is classified as critical business criticality. An explicit governance approval is required before this assignment can proceed.`,
      severity: "critical",
      mitigationNote: "Obtain approval from the designated governance authority before scheduling execution.",
    });
  }

  if (assignment.ownerType === "ai_agent") {
    blockers.push({
      blockerType: "missing_approval",
      title: `AI agent operational approval required: ${assignment.packageTitle}`,
      description: `AI agent execution of '${assignment.packageTitle}' requires documented safety boundaries and approval from the AI governance function.`,
      severity: "high",
      mitigationNote: "Document AI agent operational boundaries and obtain sign-off from the AI governance function.",
    });
  }

  return blockers;
}

function detectDependencyBlockers(assignment: ExecutionAssignment): ExecutionBlocker[] {
  const blockers: ExecutionBlocker[] = [];

  if (assignment.phaseType === "optimization" && assignment.executionClass !== "deferred") {
    blockers.push({
      blockerType: "missing_dependency",
      title: `Optimization phase dependency: prior phases must complete`,
      description: `'${assignment.packageTitle}' is in the optimization phase and depends on all preparation, foundation, implementation, and validation work being successfully completed.`,
      severity: "medium",
      mitigationNote: "Verify completion of all prerequisite phases before commencing optimization-phase execution.",
    });
  }

  return blockers;
}

function detectIntegrationBlockers(assignment: ExecutionAssignment): ExecutionBlocker[] {
  const blockers: ExecutionBlocker[] = [];

  if (assignment.ownerType === "integration" || assignment.ownerType === "external_system") {
    blockers.push({
      blockerType: "missing_integration",
      title: `Integration confirmation required: ${assignment.packageTitle}`,
      description: `'${assignment.packageTitle}' is assigned to an integration or external system. The target integration endpoint must be confirmed as available and tested before execution.`,
      severity: "medium",
      mitigationNote: "Confirm integration availability, authentication, and data contract before commencing execution.",
    });
  }

  return blockers;
}

function detectResourceBlockers(assignment: ExecutionAssignment): ExecutionBlocker[] {
  const blockers: ExecutionBlocker[] = [];

  if (
    (assignment.ownerType === "human" || assignment.ownerType === "department") &&
    (assignment.complexityLevel === "critical" || assignment.complexityLevel === "high")
  ) {
    blockers.push({
      blockerType: "missing_resource",
      title: `Skilled resource confirmation required: ${assignment.packageTitle}`,
      description: `'${assignment.packageTitle}' requires ${assignment.complexityLevel}-complexity human or department execution. Appropriately skilled resources must be confirmed before this assignment can proceed.`,
      severity: severityFromComplexity(assignment.complexityLevel, assignment.businessCriticality),
      mitigationNote: "Confirm availability of appropriately skilled personnel before this assignment enters the active queue.",
    });
  }

  return blockers;
}

export function detectBlockers(assignment: ExecutionAssignment): ExecutionBlocker[] {
  return [
    ...detectCapabilityBlockers(assignment),
    ...detectApprovalBlockers(assignment),
    ...detectDependencyBlockers(assignment),
    ...detectIntegrationBlockers(assignment),
    ...detectResourceBlockers(assignment),
  ];
}
