import { db, ashTasksTable, type AshTask } from "@workspace/db";
import { eq, and, ne } from "drizzle-orm";
import { logger } from "../logger";
import type { TaskReadiness } from "./types";

// ─── Dependency Management (Phase 1.3) ─────────────────────────────────────
// Tracks blocked / waiting / ready / completed / failed / in_progress as a
// DERIVED classification over the persisted `status` + `dependencies` — no
// separate "waiting" status is stored, so this never conflicts with the
// existing pending/in_progress/completed/failed/blocked statuses from
// Phase 1.1. "blocked" here still means the persisted status (a validation
// failure); "waiting" means pending-but-a-dependency-isn't-done-yet.

export function classifyReadiness(task: AshTask, allTasksById: Map<number, AshTask>): TaskReadiness["readiness"] {
  if (task.status === "completed") return "completed";
  if (task.status === "failed") return "failed";
  if (task.status === "in_progress") return "in_progress";
  if (task.status === "blocked") return "blocked";

  // status === "pending" — check dependencies
  const deps = Array.isArray(task.dependencies) ? (task.dependencies as number[]) : [];
  const allDepsComplete = deps.every((id) => allTasksById.get(id)?.status === "completed");
  return allDepsComplete ? "ready" : "waiting";
}

export async function classifyProjectTasks(projectId: number): Promise<TaskReadiness[]> {
  const tasks = await db.select().from(ashTasksTable).where(eq(ashTasksTable.projectId, projectId));
  const byId = new Map(tasks.map((t) => [t.id, t]));
  return tasks.map((task) => ({ task, readiness: classifyReadiness(task, byId) }));
}

/**
 * Picks the single best task to hand to the orchestrator this turn: the
 * highest-executionOrder-ranked "ready" task, preferring the one already
 * marked as the project's currentTaskId. Returns null if nothing is ready
 * (everything is waiting, blocked, or done) — the caller falls back to
 * ordinary chat with no specific task focus.
 */
export function pickNextReadyTask(classified: TaskReadiness[], currentTaskId: number | null): AshTask | null {
  const ready = classified.filter((c) => c.readiness === "ready").map((c) => c.task);
  if (ready.length === 0) return null;
  if (currentTaskId != null) {
    const current = ready.find((t) => t.id === currentTaskId);
    if (current) return current;
  }
  ready.sort((a, b) => (a.executionOrder ?? 999) - (b.executionOrder ?? 999));
  return ready[0];
}

/**
 * "Automatically unlock dependent tasks when prerequisites finish." Since
 * readiness is derived (see above), there's nothing to unlock for ordinary
 * waiting tasks — they become "ready" automatically the moment
 * classifyReadiness() re-evaluates them. The one real state change needed is
 * for tasks that were explicitly `blocked` with blockedReason
 * "waiting_on_dependency" (set by validation.ts when a hard dependency
 * wasn't done yet) — those get flipped back to `pending` so they re-enter
 * the ready/waiting pool.
 */
export async function unlockDependentTasks(projectId: number, completedTaskId: number): Promise<number> {
  const blockedOnDeps = await db
    .select()
    .from(ashTasksTable)
    .where(and(eq(ashTasksTable.projectId, projectId), eq(ashTasksTable.status, "blocked")));

  const byId = new Map((await db.select().from(ashTasksTable).where(eq(ashTasksTable.projectId, projectId))).map((t) => [t.id, t]));

  let unlocked = 0;
  for (const task of blockedOnDeps) {
    if (!task.blockedReason?.startsWith("waiting_on_dependency")) continue;
    const deps = Array.isArray(task.dependencies) ? (task.dependencies as number[]) : [];
    if (!deps.includes(completedTaskId)) continue;
    const allDepsComplete = deps.every((id) => byId.get(id)?.status === "completed");
    if (!allDepsComplete) continue;

    await db.update(ashTasksTable).set({ status: "pending", blockedReason: null }).where(eq(ashTasksTable.id, task.id));
    unlocked++;
  }

  if (unlocked > 0) {
    logger.info({ projectId, completedTaskId, unlocked }, "Planning Engine: unlocked dependent tasks");
  }
  return unlocked;
}
