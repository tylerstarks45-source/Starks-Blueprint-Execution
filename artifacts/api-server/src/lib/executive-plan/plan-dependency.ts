// ─── Plan Dependency Engine (Build 009) ──────────────────────────────────────
//
// Detects dependency issues within plans.
// Pure computation — no I/O, no AI calls, no plan modifications.
// Produces reports only.  Never modifies plans automatically.
//
// Detectors:
//   1. Circular dependencies  — DFS cycle detection on the dependency graph
//   2. Missing prerequisites  — dependency targets that don't exist in the plan
//   3. Resource conflicts     — steps competing for the same assigned brain
//   4. Invalid ordering       — step A depends on B but A.orderIndex < B.orderIndex
//   5. Blocked milestones     — milestones where all dependencies are unresolved

import type {
  PlanMilestone,
  PlanStep,
  PlanDependency,
  PlanDependencyReport,
  PlanDependencyIssue,
} from "./types";

// ─── 1. Circular dependency detection (DFS) ──────────────────────────────────

function detectCircularDependencies(
  items: Array<{ id: string; dependsOn: string[] }>,
): PlanDependencyIssue[] {
  const issues: PlanDependencyIssue[] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const adjMap = new Map(items.map((i) => [i.id, i.dependsOn]));

  function dfs(id: string, path: string[]): void {
    if (inStack.has(id)) {
      const cycleStart = path.indexOf(id);
      const cycle = path.slice(cycleStart);
      issues.push({
        type: "circular_dependency",
        severity: "error",
        affectedIds: [...cycle, id],
        description: `Circular dependency detected: ${[...cycle, id].join(" → ")}`,
      });
      return;
    }
    if (visited.has(id)) return;
    visited.add(id);
    inStack.add(id);
    for (const dep of adjMap.get(id) ?? []) {
      dfs(dep, [...path, id]);
    }
    inStack.delete(id);
  }

  for (const item of items) {
    dfs(item.id, []);
  }
  return issues;
}

// ─── 2. Missing prerequisites ─────────────────────────────────────────────────

function detectMissingPrerequisites(
  items: Array<{ id: string; name: string; dependsOn: string[] }>,
  allIds: Set<string>,
): PlanDependencyIssue[] {
  const issues: PlanDependencyIssue[] = [];
  for (const item of items) {
    for (const depId of item.dependsOn) {
      if (!allIds.has(depId)) {
        issues.push({
          type: "missing_prerequisite",
          severity: "error",
          affectedIds: [item.id, depId],
          description: `Step/milestone "${item.name}" (${item.id}) depends on missing item "${depId}".`,
        });
      }
    }
  }
  return issues;
}

// ─── 3. Resource conflicts ────────────────────────────────────────────────────
// Two or more steps in the same plan assigned to the same brain with no ordering
// dependency between them — they'd compete for the same resource simultaneously.

function detectResourceConflicts(steps: PlanStep[]): PlanDependencyIssue[] {
  const issues: PlanDependencyIssue[] = [];
  const byBrain = new Map<string, PlanStep[]>();

  for (const step of steps) {
    if (!step.assignedBrain) continue;
    if (!byBrain.has(step.assignedBrain)) byBrain.set(step.assignedBrain, []);
    byBrain.get(step.assignedBrain)!.push(step);
  }

  for (const [brain, conflictSteps] of byBrain.entries()) {
    if (conflictSteps.length <= 1) continue;
    // Only flag as conflict if none of the steps depend on each other
    // (ordered sequential steps are fine for a single brain)
    const ids = new Set(conflictSteps.map((s) => s.id));
    const hasOrdering = conflictSteps.some((s) =>
      s.dependsOnStepIds.some((d) => ids.has(d)),
    );
    if (!hasOrdering) {
      issues.push({
        type: "resource_conflict",
        severity: "warning",
        affectedIds: conflictSteps.map((s) => s.id),
        description:
          `Brain "${brain}" is assigned to ${conflictSteps.length} unordered steps: ` +
          conflictSteps.map((s) => `"${s.name}"`).join(", "),
      });
    }
  }

  return issues;
}

// ─── 4. Invalid ordering ──────────────────────────────────────────────────────
// Step A depends on step B but A.orderIndex < B.orderIndex (A comes first in
// sequence but is blocked by B).

function detectInvalidOrdering(steps: PlanStep[]): PlanDependencyIssue[] {
  const issues: PlanDependencyIssue[] = [];
  const indexById = new Map(steps.map((s) => [s.id, s.orderIndex]));

  for (const step of steps) {
    for (const depId of step.dependsOnStepIds) {
      const depIndex = indexById.get(depId);
      if (depIndex !== undefined && step.orderIndex <= depIndex) {
        issues.push({
          type: "invalid_ordering",
          severity: "warning",
          affectedIds: [step.id, depId],
          description:
            `Step "${step.name}" (order ${step.orderIndex}) depends on a step with equal or ` +
            `later order index (${depIndex}). The dependency would never be satisfied.`,
        });
      }
    }
  }

  return issues;
}

// ─── 5. Blocked milestones ────────────────────────────────────────────────────
// A milestone is "blocked" if it has dependencies that are neither completed nor
// active (still pending or also blocked) and the milestone itself is active.

function detectBlockedMilestones(milestones: PlanMilestone[]): PlanDependencyIssue[] {
  const issues: PlanDependencyIssue[] = [];
  const statusById = new Map(milestones.map((m) => [m.id, m.status]));

  for (const ms of milestones) {
    if (ms.status !== "active") continue;  // only analyse active milestones
    const blockers: string[] = [];
    for (const depId of ms.dependencies) {
      const depStatus = statusById.get(depId);
      if (depStatus && depStatus !== "completed" && depStatus !== "skipped") {
        blockers.push(depId);
      }
    }
    if (blockers.length > 0) {
      issues.push({
        type: "blocked_milestone",
        severity: "warning",
        affectedIds: [ms.id, ...blockers],
        description:
          `Milestone "${ms.name}" is active but has ${blockers.length} incomplete ` +
          `dependency milestone(s): ${blockers.join(", ")}.`,
      });
    }
  }

  return issues;
}

// ─── Public entrypoint ────────────────────────────────────────────────────────

export interface DependencyAnalysisInput {
  planId: string;
  milestones: PlanMilestone[];
  steps: PlanStep[];
  planDependencies: PlanDependency[];
}

/** Run all five dependency detectors and produce a structured report.
 *  Never throws — returns an empty report on unexpected errors. */
export function analyzePlanDependencies(input: DependencyAnalysisInput): PlanDependencyReport {
  try {
    const { planId, milestones, steps } = input;

    // Build adjacency lists for each category
    const milestoneAdj = milestones.map((m) => ({
      id: m.id,
      name: m.name,
      dependsOn: m.dependencies,
    }));
    const stepAdj = steps.map((s) => ({
      id: s.id,
      name: s.name,
      dependsOn: s.dependsOnStepIds,
    }));

    const allIds = new Set([
      ...milestones.map((m) => m.id),
      ...steps.map((s) => s.id),
    ]);

    const issues: PlanDependencyIssue[] = [
      ...detectCircularDependencies([...milestoneAdj, ...stepAdj]),
      ...detectMissingPrerequisites([...milestoneAdj, ...stepAdj], allIds),
      ...detectResourceConflicts(steps),
      ...detectInvalidOrdering(steps),
      ...detectBlockedMilestones(milestones),
    ];

    return {
      planId,
      issues,
      hasErrors:   issues.some((i) => i.severity === "error"),
      hasWarnings: issues.some((i) => i.severity === "warning"),
      analyzedAt: new Date(),
    };
  } catch {
    return {
      planId: input.planId,
      issues: [],
      hasErrors: false,
      hasWarnings: false,
      analyzedAt: new Date(),
    };
  }
}
