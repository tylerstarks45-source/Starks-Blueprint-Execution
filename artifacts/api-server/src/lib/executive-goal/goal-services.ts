// ─── Shared Goal Services (Build 008) ────────────────────────────────────────
//
// Every Brain that needs to create, query, or manipulate goals calls these
// services. No Brain owns Goal Management — it belongs to the COS.

export {
  // CRUD
  createGoal,
  getGoal,
  listGoals,
  listActiveGoals,
  listRootGoals,
  listChildGoals,
  updateGoal,
  updateGoalProgress,
  archiveGoal,
  // Linking
  linkGoals,
  // Dependencies
  addDependency,
  getDependencies,
  getAllDependencies,
  removeDependency,
  // Hierarchy
  getGoalHierarchy,
  getGoalAncestry,
  // Metrics
  addMetric,
  getMetrics,
  // Diagnostics
  buildGoalDiagnostics,
} from "./goal-registry";

export {
  // Priority
  computePriorityScore,
  scoreGoalPriority,
} from "./goal-priority";

export {
  // Conflict detection
  detectGoalConflicts,
  buildConflictReport,
} from "./goal-conflict";

export {
  // Progress
  recordProgressSnapshot,
  getProgressHistory,
  buildProgressReport,
} from "./goal-progress";

// ─── Convenience: goal conflict report for a user ─────────────────────────────

import { listGoals, getAllDependencies } from "./goal-registry";
import { detectGoalConflicts, buildConflictReport } from "./goal-conflict";
import type { GoalConflictReport } from "./types";

export async function getGoalConflictReport(userId: number): Promise<GoalConflictReport> {
  const goals = await listGoals(userId);
  const goalIds = goals.map((g) => g.id);
  const dependencies = await getAllDependencies(goalIds);
  const conflicts = detectGoalConflicts(goals, dependencies);
  const report = buildConflictReport(userId, conflicts);
  return report;
}
