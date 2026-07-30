// ─── Goal Conflict Engine (Build 008) ────────────────────────────────────────
//
// Detects (never resolves) conflicts between goals. Four conflict categories:
//
//   1. circular_dependency    — A depends on B which depends on A (DFS cycle check)
//   2. resource_conflict      — Two active goals share an owner_brain and both
//                               have priority_score > 70
//   3. deadline_conflict      — Two sibling goals (same parent) have target dates
//                               within 7 days of each other and both have urgency > 60
//   4. contradictory_objectives — Two active goals in the same category have
//                               mutually exclusive keywords in their names
//
// The engine only reports. It never modifies goals or resolves conflicts.

import type { ExecutiveGoal, GoalDependency, GoalConflict, GoalConflictReport } from "./types";

// ─── Circular dependency detection ───────────────────────────────────────────

/** Perform DFS cycle detection on the dependency graph.
 *  Returns arrays of goal IDs that form cycles. */
function findCircularDependencies(
  goalIds: string[],
  deps: GoalDependency[],
): string[][] {
  // Build adjacency: goalId → Set of goal IDs it depends on
  const adj = new Map<string, Set<string>>();
  for (const id of goalIds) adj.set(id, new Set());
  for (const dep of deps) {
    // Only consider strong dependency types for cycle detection
    if (dep.dependencyType === "related") continue;
    const s = adj.get(dep.goalId);
    if (s) s.add(dep.dependsOnGoalId);
  }

  const cycles: string[][] = [];
  const visited = new Set<string>();
  const stack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string): void {
    if (stack.has(node)) {
      // Found a cycle — extract the cycle portion
      const cycleStart = path.indexOf(node);
      if (cycleStart !== -1) {
        cycles.push([...path.slice(cycleStart), node]);
      }
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    stack.add(node);
    path.push(node);
    for (const neighbor of adj.get(node) ?? []) {
      dfs(neighbor);
    }
    path.pop();
    stack.delete(node);
  }

  for (const id of goalIds) {
    if (!visited.has(id)) dfs(id);
  }

  return cycles;
}

// ─── Resource conflict detection ─────────────────────────────────────────────

function findResourceConflicts(goals: ExecutiveGoal[]): GoalConflict[] {
  const conflicts: GoalConflict[] = [];
  // Group active goals by owner_brain
  const byBrain = new Map<string, ExecutiveGoal[]>();
  for (const g of goals) {
    if (g.status !== "active") continue;
    if (!g.ownerBrain) continue;
    const existing = byBrain.get(g.ownerBrain) ?? [];
    existing.push(g);
    byBrain.set(g.ownerBrain, existing);
  }
  for (const [brain, brainGoals] of byBrain) {
    // Flag when 2+ high-priority goals compete for the same brain
    const highPriority = brainGoals.filter((g) => g.priorityScore >= 70);
    if (highPriority.length >= 2) {
      conflicts.push({
        conflictType: "resource_conflict",
        severity: highPriority.some((g) => g.priorityScore >= 85) ? "critical" : "high",
        affectedGoalIds: highPriority.map((g) => g.id),
        description:
          `Brain "${brain}" has ${highPriority.length} high-priority active goals competing for the same resource. ` +
          `Goals: ${highPriority.map((g) => `"${g.name}" (${g.priorityScore.toFixed(1)})`).join(", ")}.`,
        detectedAt: new Date(),
      });
    }
  }
  return conflicts;
}

// ─── Deadline conflict detection ─────────────────────────────────────────────

function findDeadlineConflicts(goals: ExecutiveGoal[]): GoalConflict[] {
  const conflicts: GoalConflict[] = [];
  // Group active goals by parent
  const byParent = new Map<string | null, ExecutiveGoal[]>();
  for (const g of goals) {
    if (g.status !== "active" || !g.targetDate) continue;
    const key = g.parentGoalId ?? "__root__";
    const existing = byParent.get(key) ?? [];
    existing.push(g);
    byParent.set(key, existing);
  }

  for (const siblings of byParent.values()) {
    if (siblings.length < 2) continue;
    // Sort by target date
    const sorted = [...siblings].sort(
      (a, b) => (a.targetDate?.getTime() ?? 0) - (b.targetDate?.getTime() ?? 0),
    );
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (!a.targetDate || !b.targetDate) continue;
      const gapDays = (b.targetDate.getTime() - a.targetDate.getTime()) / (1000 * 60 * 60 * 24);
      if (gapDays <= 7 && a.urgency > 60 && b.urgency > 60) {
        conflicts.push({
          conflictType: "deadline_conflict",
          severity: gapDays <= 2 ? "critical" : "high",
          affectedGoalIds: [a.id, b.id],
          description:
            `"${a.name}" (due ${a.targetDate.toISOString().slice(0, 10)}) and ` +
            `"${b.name}" (due ${b.targetDate.toISOString().slice(0, 10)}) have deadlines only ` +
            `${Math.round(gapDays)} day(s) apart and both have high urgency.`,
          detectedAt: new Date(),
        });
      }
    }
  }
  return conflicts;
}

// ─── Contradictory objective detection ───────────────────────────────────────

// Pairs of keywords that signal contradictory intent when one goal has the
// first and another goal (same category) has the second.
const CONTRARY_PAIRS: Array<[string, string]> = [
  ["increase", "decrease"],
  ["increase", "reduce"],
  ["expand", "reduce"],
  ["expand", "contract"],
  ["add", "remove"],
  ["add", "eliminate"],
  ["grow", "shrink"],
  ["accelerate", "slow"],
  ["hire", "cut"],
  ["invest", "divest"],
  ["centralise", "decentralise"],
  ["centralize", "decentralize"],
  ["automate", "manual"],
];

function containsKeyword(text: string, keyword: string): boolean {
  return text.toLowerCase().includes(keyword.toLowerCase());
}

function findContradictoryObjectives(goals: ExecutiveGoal[]): GoalConflict[] {
  const conflicts: GoalConflict[] = [];
  const active = goals.filter((g) => g.status === "active");

  // Group by category
  const byCategory = new Map<string, ExecutiveGoal[]>();
  for (const g of active) {
    const existing = byCategory.get(g.category) ?? [];
    existing.push(g);
    byCategory.set(g.category, existing);
  }

  for (const [category, categoryGoals] of byCategory) {
    if (categoryGoals.length < 2) continue;
    for (let i = 0; i < categoryGoals.length; i++) {
      for (let j = i + 1; j < categoryGoals.length; j++) {
        const a = categoryGoals[i];
        const b = categoryGoals[j];
        const aText = `${a.name} ${a.description ?? ""}`;
        const bText = `${b.name} ${b.description ?? ""}`;
        for (const [kw1, kw2] of CONTRARY_PAIRS) {
          const conflict =
            (containsKeyword(aText, kw1) && containsKeyword(bText, kw2)) ||
            (containsKeyword(aText, kw2) && containsKeyword(bText, kw1));
          if (conflict) {
            conflicts.push({
              conflictType: "contradictory_objectives",
              severity: "medium",
              affectedGoalIds: [a.id, b.id],
              description:
                `In category "${category}", "${a.name}" and "${b.name}" appear to have contradictory intent ` +
                `(detected keyword opposition: "${kw1}" vs "${kw2}"). Review whether both goals can coexist.`,
              detectedAt: new Date(),
            });
            break; // one conflict per pair is enough
          }
        }
      }
    }
  }
  return conflicts;
}

// ─── Main conflict detection entry point ─────────────────────────────────────

/** Detect all conflicts for a user's goals.
 *  Returns a GoalConflictReport — never throws, always returns a report. */
export function detectGoalConflicts(
  goals: ExecutiveGoal[],
  dependencies: GoalDependency[],
): GoalConflict[] {
  const conflicts: GoalConflict[] = [];

  // 1. Circular dependencies
  const goalIds = goals.map((g) => g.id);
  const cycles = findCircularDependencies(goalIds, dependencies);
  for (const cycle of cycles) {
    conflicts.push({
      conflictType: "circular_dependency",
      severity: "critical",
      affectedGoalIds: [...new Set(cycle)],
      description: `Circular dependency detected: ${cycle.join(" → ")}. This creates an unresolvable dependency loop.`,
      detectedAt: new Date(),
    });
  }

  // 2. Resource conflicts
  conflicts.push(...findResourceConflicts(goals));

  // 3. Deadline conflicts
  conflicts.push(...findDeadlineConflicts(goals));

  // 4. Contradictory objectives
  conflicts.push(...findContradictoryObjectives(goals));

  return conflicts;
}

export function buildConflictReport(userId: number, conflicts: GoalConflict[]): GoalConflictReport {
  return {
    userId,
    conflicts,
    totalConflicts: conflicts.length,
    criticalCount: conflicts.filter((c) => c.severity === "critical").length,
    assessedAt: new Date(),
  };
}
