import { pool, db, scheduledTasksTable, systemInstancesTable, systemActivityEventsTable, notificationsTable } from "@workspace/db";
import { eq, and, lte, sql } from "drizzle-orm";
import { logger } from "../logger";
import { getConnector } from "../connectors/registry";
import { decrypt } from "../crypto";
import { computeNextRunAt as _computeNextRunAt } from "../../routes/scheduled-tasks";

const POLL_INTERVAL_MS = 60_000;
let running = false;

type ScheduleType = "every_n_minutes" | "every_n_hours" | "daily" | "weekly";

function computeNextRunAt(scheduleType: ScheduleType, scheduleConfig: Record<string, unknown>): Date {
  return _computeNextRunAt(scheduleType, scheduleConfig, new Date());
}

// Load decrypted credentials for a user
async function loadUserCredentials(userId: number): Promise<Record<string, string>> {
  const rows = await pool.query(
    `SELECT credential_key, encrypted_value FROM user_credentials WHERE user_id = $1`,
    [userId],
  );
  const creds: Record<string, string> = {};
  for (const row of rows.rows as { credential_key: string; encrypted_value: string | null }[]) {
    if (row.encrypted_value) {
      try {
        creds[row.credential_key] = await decrypt(row.encrypted_value);
      } catch {
        // Skip malformed entries
      }
    }
  }
  return creds;
}

// Execute a single scheduled task
async function executeTask(task: typeof scheduledTasksTable.$inferSelect): Promise<{ ok: boolean; output: string }> {
  const actionParams = (task.actionParams ?? {}) as Record<string, unknown>;

  if (task.actionType === "connector") {
    const connectorId = actionParams["connectorId"] as string;
    const action = actionParams["action"] as string;
    const params = (actionParams["params"] ?? {}) as Record<string, unknown>;

    if (!connectorId || !action) {
      return { ok: false, output: "Missing connectorId or action in actionParams" };
    }

    const creds = await loadUserCredentials(task.userId);
    const connector = getConnector(connectorId, creds);
    if (!connector) {
      return { ok: false, output: `Unknown connector: ${connectorId}` };
    }

    const result = await connector.execute(action, params);
    if (result.ok) {
      return { ok: true, output: JSON.stringify(result.data ?? { success: true }) };
    }
    return { ok: false, output: result.error ?? "Connector execution failed" };
  }

  if (task.actionType === "activity_log") {
    const description = (actionParams["description"] as string) ?? "Scheduled task ran";
    return { ok: true, output: description };
  }

  return { ok: false, output: `Unknown action type: ${task.actionType}` };
}

// Run all tasks that are due
async function processDueTasks(): Promise<void> {
  const now = new Date();

  // Claim due tasks atomically — update next_run_at immediately to prevent double-firing
  const dueTasks = await pool.query<{
    id: number;
    system_instance_id: number;
    user_id: number;
    name: string;
    schedule_type: string;
    schedule_config: Record<string, unknown>;
    action_type: string;
    action_params: Record<string, unknown>;
    failure_count: number;
    last_run_status: string | null;
  }>(
    `SELECT id, system_instance_id, user_id, name, schedule_type, schedule_config, action_type, action_params, failure_count, last_run_status
     FROM scheduled_tasks
     WHERE enabled = true AND next_run_at <= $1
     LIMIT 50`,
    [now],
  );

  if (dueTasks.rowCount === 0) return;

  logger.info({ count: dueTasks.rowCount }, "Scheduler processing due tasks");

  for (const row of dueTasks.rows) {
    const scheduleType = row.schedule_type as ScheduleType;
    const nextRun = computeNextRunAt(scheduleType, row.schedule_config);

    // Advance next_run_at before executing to prevent re-fire on slow executions
    await pool.query(
      `UPDATE scheduled_tasks SET next_run_at = $1, last_run_at = $2, updated_at = NOW() WHERE id = $3`,
      [nextRun, now, row.id],
    );

    try {
      const task = {
        id: row.id,
        systemInstanceId: row.system_instance_id,
        userId: row.user_id,
        name: row.name,
        scheduleType: row.schedule_type,
        scheduleConfig: row.schedule_config,
        actionType: row.action_type,
        actionParams: row.action_params,
        failureCount: row.failure_count,
        lastRunStatus: row.last_run_status,
        enabled: true,
        lastRunAt: null,
        lastRunError: null,
        nextRunAt: nextRun,
        createdAt: now,
        updatedAt: now,
      } as typeof scheduledTasksTable.$inferSelect;

      const result = await executeTask(task);

      if (result.ok) {
        // Success — reset failure count
        await pool.query(
          `UPDATE scheduled_tasks SET last_run_status = 'success', last_run_error = NULL, failure_count = 0 WHERE id = $1`,
          [row.id],
        );

        // Log activity event
        await db.insert(systemActivityEventsTable).values({
          systemInstanceId: row.system_instance_id,
          eventType: "action",
          description: `Scheduled: ${row.name} — ${result.output.slice(0, 200)}`,
          metadata: JSON.stringify({ scheduledTaskId: row.id, scheduleType, status: "success" }),
        });

        logger.info({ taskId: row.id, name: row.name }, "Scheduled task succeeded");
      } else {
        await handleTaskFailure(row.id, row.system_instance_id, row.user_id, row.name, row.failure_count, result.output);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await handleTaskFailure(row.id, row.system_instance_id, row.user_id, row.name, row.failure_count, errorMsg);
    }
  }
}

async function handleTaskFailure(
  taskId: number,
  systemInstanceId: number,
  userId: number,
  taskName: string,
  previousFailureCount: number,
  errorMsg: string,
): Promise<void> {
  const newFailureCount = previousFailureCount + 1;

  if (newFailureCount === 1) {
    // First failure — schedule a retry in 5 minutes
    const retryAt = new Date(Date.now() + 5 * 60 * 1000);
    await pool.query(
      `UPDATE scheduled_tasks SET last_run_status = 'retrying', last_run_error = $1, failure_count = $2, next_run_at = $3 WHERE id = $4`,
      [errorMsg.slice(0, 500), newFailureCount, retryAt, taskId],
    );

    await db.insert(systemActivityEventsTable).values({
      systemInstanceId,
      eventType: "error",
      description: `Scheduled: ${taskName} failed — retrying in 5 minutes. Error: ${errorMsg.slice(0, 150)}`,
      metadata: JSON.stringify({ scheduledTaskId: taskId, status: "retrying", error: errorMsg }),
    });

    logger.warn({ taskId, taskName, errorMsg }, "Scheduled task failed — retry in 5 min");
  } else {
    // Second failure — mark as failed and send user notification
    await pool.query(
      `UPDATE scheduled_tasks SET last_run_status = 'failed', last_run_error = $1, failure_count = $2, enabled = false WHERE id = $3`,
      [errorMsg.slice(0, 500), newFailureCount, taskId],
    );

    await db.insert(systemActivityEventsTable).values({
      systemInstanceId,
      eventType: "error",
      description: `Scheduled: ${taskName} failed twice and was disabled. Error: ${errorMsg.slice(0, 150)}`,
      metadata: JSON.stringify({ scheduledTaskId: taskId, status: "failed", error: errorMsg }),
    });

    // Create user notification
    await db.insert(notificationsTable).values({
      userId,
      title: `Scheduled Task Failed: ${taskName}`,
      message: `Your scheduled task "${taskName}" failed twice and has been disabled. Last error: ${errorMsg.slice(0, 200)}. Re-enable it from the system detail page once you've fixed the issue.`,
      notificationType: "error",
      read: false,
    });

    logger.error({ taskId, taskName, errorMsg }, "Scheduled task failed twice — disabled + user notified");
  }
}

// ─── Main scheduler loop ──────────────────────────────────────────────────────

export function startScheduler(): void {
  if (running) return;
  running = true;

  async function loop(): Promise<void> {
    try {
      await processDueTasks();
    } catch (err) {
      logger.error({ err }, "Scheduler loop error");
    } finally {
      if (running) setTimeout(loop, POLL_INTERVAL_MS);
    }
  }

  setTimeout(loop, POLL_INTERVAL_MS);
  logger.info({ pollIntervalMs: POLL_INTERVAL_MS }, "Scheduler started");
}

export function stopScheduler(): void {
  running = false;
  logger.info("Scheduler stopped");
}
