import { db, ashTasksTable, ashProjectsTable, type AshTask } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../logger";
import { notifyUser } from "../notify";
import { addProjectMemory } from "../memory-engine/project-memory";
import { reprioritizeProject } from "./prioritization";
import { unlockDependentTasks } from "./dependency-manager";

// ─── Plan Adaptation (Phase 1.3) ───────────────────────────────────────────
// "If execution fails: analyze failure, adjust plan, retry when appropriate,
// escalate to user only when necessary." Called whenever a task transitions
// to `failed` (see index.ts's `reportTaskOutcome`, the new write path this
// phase adds since Phase 1.1 never exposed one).

const MAX_AUTO_RETRIES = 2;

type FailureClass = "transient" | "missing_resource" | "logic_error";

function classifyFailure(errorMessage: string): FailureClass {
  const lower = errorMessage.toLowerCase();
  if (/timeout|timed out|rate limit|429|503|network|econnreset|temporarily/.test(lower)) return "transient";
  if (/credential|api key|unauthorized|401|403|not connected|missing/.test(lower)) return "missing_resource";
  return "logic_error";
}

export async function handleTaskFailure(params: {
  taskId: number;
  userId: number;
  errorMessage: string;
}): Promise<{ action: "retried" | "blocked" | "escalated"; task: AshTask }> {
  const { taskId, userId, errorMessage } = params;

  const [task] = await db.select().from(ashTasksTable).where(eq(ashTasksTable.id, taskId));
  if (!task) throw new Error(`Planning Engine: cannot adapt — task ${taskId} not found`);

  const failureClass = classifyFailure(errorMessage);
  const attempts = task.attempts + 1;

  // Retry when appropriate: transient failures are worth another try, up to
  // a small cap, so a flaky upstream call doesn't need a human.
  if (failureClass === "transient" && attempts <= MAX_AUTO_RETRIES) {
    const [retried] = await db.update(ashTasksTable).set({
      status: "pending",
      attempts,
      lastFailureReason: errorMessage.slice(0, 500),
    }).where(eq(ashTasksTable.id, taskId)).returning();

    await reprioritizeProject(task.projectId);
    logger.info({ taskId, attempts }, "Planning Engine: transient failure, retrying task");
    return { action: "retried", task: retried };
  }

  // Missing a resource (credential/approval/file) — this is what plan
  // validation is for; re-block the task so the next validation pass surfaces
  // the real, specific reason instead of a generic retry loop.
  if (failureClass === "missing_resource") {
    const [blocked] = await db.update(ashTasksTable).set({
      status: "blocked",
      attempts,
      lastFailureReason: errorMessage.slice(0, 500),
      blockedReason: `Failed due to a missing resource: ${errorMessage.slice(0, 300)}`,
    }).where(eq(ashTasksTable.id, taskId)).returning();

    await reprioritizeProject(task.projectId);
    await recordLesson(task.projectId, `Task "${task.description.slice(0, 80)}" failed: ${errorMessage.slice(0, 200)}`);
    return { action: "blocked", task: blocked };
  }

  // Logic error, or a transient failure that's already exhausted its
  // retries — escalate to the user rather than looping forever.
  const [failed] = await db.update(ashTasksTable).set({
    status: "failed",
    attempts,
    lastFailureReason: errorMessage.slice(0, 500),
    completedAt: new Date(),
  }).where(eq(ashTasksTable.id, taskId)).returning();

  const [project] = await db.select({ name: ashProjectsTable.name }).from(ashProjectsTable).where(eq(ashProjectsTable.id, task.projectId));
  await notifyUser({
    userId,
    title: "ASH needs your input",
    message: `A task in "${project?.name ?? "your project"}" couldn't complete after ${attempts} attempt(s): ${task.description.slice(0, 120)}`,
    notificationType: "warn",
  }).catch((err) => logger.warn({ err, taskId }, "Planning Engine: failed to notify user of escalated task"));

  await reprioritizeProject(task.projectId);
  await recordLesson(task.projectId, `Task "${task.description.slice(0, 80)}" failed and was escalated: ${errorMessage.slice(0, 200)}`);

  return { action: "escalated", task: failed };
}

/**
 * "Automatically reprioritize when tasks are completed or blocked" +
 * "automatically unlock dependent tasks when prerequisites finish" — the
 * success-path counterpart to handleTaskFailure above.
 */
export async function handleTaskCompletion(params: { taskId: number }): Promise<AshTask> {
  const { taskId } = params;
  const [task] = await db.update(ashTasksTable).set({ status: "completed", completedAt: new Date() }).where(eq(ashTasksTable.id, taskId)).returning();
  if (!task) throw new Error(`Planning Engine: cannot complete — task ${taskId} not found`);

  await unlockDependentTasks(task.projectId, task.id);
  await reprioritizeProject(task.projectId);
  return task;
}

async function recordLesson(projectId: number, content: string): Promise<void> {
  try {
    await addProjectMemory({ projectId, type: "lesson_learned", content, importanceScore: 60 });
  } catch (err) {
    logger.warn({ err, projectId }, "Planning Engine: failed to record adaptation lesson");
  }
}
