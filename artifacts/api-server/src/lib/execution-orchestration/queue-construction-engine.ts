// ─────────────────────────────────────────────────────────────────────────────
// Build 024: Execution Orchestration Engine — Queue Construction Engine
// Produces a deterministic execution queue from assignments.
// Ordering: phase order → execution class priority → assignment sequence position
// No scheduling. No calendar dates. Logical execution order only.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type { ExecutionQueue, ExecutionAssignment, ExecutionOwnerType, ExecutionClass } from "./types";

const PHASE_ORDER: Record<string, number> = {
  preparation: 1,
  foundation: 2,
  implementation: 3,
  validation: 4,
  optimization: 5,
};

// Execution class priority: automated work should generally run before manual
const CLASS_PRIORITY: Record<ExecutionClass, number> = {
  automated: 1,
  semi_automated: 2,
  manual: 3,
  external: 4,
  deferred: 5,
};

function buildBlockerSummary(assignment: ExecutionAssignment): string | undefined {
  if (assignment.blockers.length === 0) return undefined;
  const critical = assignment.blockers.filter((b) => b.severity === "critical");
  const high = assignment.blockers.filter((b) => b.severity === "high");
  if (critical.length > 0) return `${critical.length} critical blocker(s): ${critical[0]!.title}`;
  if (high.length > 0) return `${high.length} high-severity blocker(s): ${high[0]!.title}`;
  return `${assignment.blockers.length} blocker(s) identified`;
}

function computePriorityScore(
  phaseOrder: number,
  executionClass: ExecutionClass,
  sequencePosition: number | undefined,
  businessCriticality: string,
): number {
  // Lower score = higher priority
  const phaseWeight = phaseOrder * 1000;
  const classWeight = (CLASS_PRIORITY[executionClass] ?? 3) * 100;
  const seqWeight = (sequencePosition ?? 99) * 10;
  const criticalBonus = businessCriticality === "critical" ? -5 : businessCriticality === "high" ? -3 : 0;
  return phaseWeight + classWeight + seqWeight + criticalBonus;
}

export function constructExecutionQueue(params: {
  assignments: ExecutionAssignment[];
  planId: string;
  reportId: string;
  businessId: number;
}): ExecutionQueue[] {
  const { assignments, planId, reportId, businessId } = params;

  // Sort assignments into deterministic queue order
  const sorted = [...assignments].sort((a, b) => {
    const phaseA = PHASE_ORDER[a.phaseType] ?? 3;
    const phaseB = PHASE_ORDER[b.phaseType] ?? 3;
    if (phaseA !== phaseB) return phaseA - phaseB;

    const classA = CLASS_PRIORITY[a.executionClass] ?? 3;
    const classB = CLASS_PRIORITY[b.executionClass] ?? 3;
    if (classA !== classB) return classA - classB;

    const seqA = a.sequencePosition ?? 999;
    const seqB = b.sequencePosition ?? 999;
    if (seqA !== seqB) return seqA - seqB;

    return a.packageTitle.localeCompare(b.packageTitle);
  });

  return sorted.map((assignment, idx) => {
    const phaseOrder = PHASE_ORDER[assignment.phaseType] ?? 3;
    const priorityScore = computePriorityScore(
      phaseOrder,
      assignment.executionClass,
      assignment.sequencePosition,
      assignment.businessCriticality,
    );
    const isBlocked = assignment.blockers.some((b) => b.severity === "critical" || b.severity === "high");
    const blockerSummary = buildBlockerSummary(assignment);

    return {
      id: randomUUID(),
      planId,
      reportId,
      businessId,
      assignmentId: assignment.id,
      workPackageId: assignment.workPackageId,
      queuePosition: idx + 1,
      phaseOrder,
      ownerType: assignment.ownerType,
      executionClass: assignment.executionClass,
      priorityScore,
      isBlocked,
      blockerSummary,
    };
  });
}
