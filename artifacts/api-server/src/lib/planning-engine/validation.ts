import { db, ashTasksTable, type AshTask } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../logger";
import { runValidationEngine } from "./validation-engine";
import type { ValidationResult } from "./types";

// ─── Plan Validation (Phase 1.3, upgraded Phase 1.4) ───────────────────────
// "Before execution, verify required APIs, credentials, files, user
// approvals, integrations. If something is missing: mark the task blocked,
// explain why, continue with any tasks that are not blocked." Runs once per
// newly-planned task; re-run is not needed unless the task's description
// changes, since validation failures are unblocked explicitly (credential
// connected → re-check on next turn's readiness pass) or via dependency
// completion (dependency-manager.ts).
//
// The actual rule logic (credentials, APIs, tools, files, approvals,
// integrations, risk) lives in ./validation-engine — a modular, rule-based
// registry designed to be extended without touching this file. This module
// is now just the thin adapter between a task and that engine, plus the
// blocked/unblocked persistence loop below.
export async function validateTask(task: AshTask, userId: number, systemInstanceId: number | null): Promise<ValidationResult> {
  return runValidationEngine({ task, userId, systemInstanceId });
}

/**
 * Validates every "pending" task among `newTasks` and persists status=blocked
 * + blockedReason for any that fail. Also re-checks every task in the
 * project that is CURRENTLY `blocked` for a resource reason (credential/
 * file/approval) — if the user has since connected the credential, uploaded
 * the file, or approved the action, the task is flipped back to `pending` so
 * it re-enters the ready/waiting pool. This is the resource-availability
 * counterpart to dependency-manager.ts's unlockDependentTasks(). Never
 * throws — a validation bug should never stop unrelated tasks from running.
 */
export async function validateProjectTasks(params: {
  projectId: number;
  newTasks: AshTask[];
  userId: number;
  systemInstanceId: number | null;
}): Promise<AshTask[]> {
  const { projectId, newTasks, userId, systemInstanceId } = params;
  const newTaskIds = new Set(newTasks.map((t) => t.id));

  const previouslyBlocked = await db
    .select()
    .from(ashTasksTable)
    .where(and(eq(ashTasksTable.projectId, projectId), eq(ashTasksTable.status, "blocked")));

  const toCheck = [...newTasks.filter((t) => t.status === "pending"), ...previouslyBlocked.filter((t) => !newTaskIds.has(t.id))];
  const updated: AshTask[] = [];

  for (const task of toCheck) {
    try {
      const result = await validateTask(task, userId, systemInstanceId);
      if (result.ok) {
        if (task.status === "blocked") {
          const [row] = await db.update(ashTasksTable).set({ status: "pending", blockedReason: null }).where(eq(ashTasksTable.id, task.id)).returning();
          logger.info({ taskId: task.id }, "Planning Engine: previously-blocked task revalidated and unblocked");
          updated.push(row);
        } else {
          updated.push(task);
        }
        continue;
      }
      const reason = result.issues.map((i) => i.reason).join(" ");
      const [row] = await db.update(ashTasksTable).set({ status: "blocked", blockedReason: reason }).where(eq(ashTasksTable.id, task.id)).returning();
      updated.push(row);
    } catch (err) {
      logger.warn({ err, taskId: task.id }, "Planning Engine: task validation failed, leaving task as-is");
      updated.push(task);
    }
  }

  return updated;
}
