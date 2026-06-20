import { pool, db, scheduledTasksTable, systemInstancesTable, systemActivityEventsTable, notificationsTable, publishedContentTable, abTestsTable, abVariantsTable } from "@workspace/db";
import { eq, and, lte, sql } from "drizzle-orm";
import { logger } from "../logger";
import { getConnector } from "../connectors/registry";
import { decrypt } from "../crypto";
import { computeNextRunAt as _computeNextRunAt } from "../../routes/scheduled-tasks";
import { publish, PUBLISHING_CHANNELS } from "../publishing";

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

  if (task.actionType === "publish") {
    const channel     = (actionParams["channel"] as string | undefined) ?? "";
    const contentType = (actionParams["contentType"] as string | undefined) ?? "post";
    const title       = (actionParams["title"] as string | undefined) ?? undefined;
    const content     = (actionParams["content"] as string | undefined) ?? "";
    const imageUrl    = (actionParams["imageUrl"] as string | undefined) ?? undefined;
    const listId      = (actionParams["listId"] as string | undefined) ?? undefined;
    const siteUrl     = (actionParams["siteUrl"] as string | undefined) ?? undefined;
    const videoId     = (actionParams["videoId"] as string | undefined) ?? undefined;
    const tags        = (actionParams["tags"] as string[] | undefined) ?? undefined;
    const categoryId  = (actionParams["categoryId"] as string | undefined) ?? undefined;

    if (!channel) return { ok: false, output: "publish action requires actionParams.channel" };
    if (!content) return { ok: false, output: "publish action requires actionParams.content" };

    const creds = await loadUserCredentials(task.userId);
    const result = await publish(channel, creds, { channel, contentType, title, content, imageUrl, listId, siteUrl, videoId, tags, categoryId });

    // Reconcile: find the pre-created scheduled record (if any) that was inserted
    // when the task was created via ASH create_schedule. We match on scheduledTaskId
    // stored in metadata. If found, UPDATE that row; otherwise INSERT a new one.
    const now = new Date();
    const existingRows = await pool.query<{ id: number }>(
      `SELECT id FROM published_content
       WHERE system_instance_id = $1
         AND status = 'scheduled'
         AND metadata::jsonb->>'scheduledTaskId' = $2
       LIMIT 1`,
      [task.systemInstanceId, String(task.id)],
    );

    const resultMeta = JSON.stringify({
      ...(imageUrl   ? { imageUrl }   : {}),
      ...(listId     ? { listId }     : {}),
      ...(siteUrl    ? { siteUrl }    : {}),
      ...(videoId    ? { videoId }    : {}),
      ...(tags       ? { tags }       : {}),
      ...(categoryId ? { categoryId } : {}),
      scheduledTaskId: task.id,
      ...(result.data ?? {}),
    });

    if (existingRows.rowCount && existingRows.rowCount > 0) {
      // Update the pre-created scheduled row
      await pool.query(
        `UPDATE published_content SET
           status = $1, published_url = $2, published_at = $3,
           error_message = $4, metadata = $5, retry_count = $6
         WHERE id = $7`,
        [
          result.ok ? "published" : "failed",
          result.publishedUrl ?? null,
          result.ok ? now : null,
          result.ok ? null : (result.error ?? "Unknown error"),
          resultMeta,
          0,
          existingRows.rows[0]!.id,
        ],
      ).catch(() => {});
    } else {
      // No pre-created record — insert fresh
      await db.insert(publishedContentTable).values({
        systemInstanceId: task.systemInstanceId,
        channel,
        contentType,
        title: title ?? null,
        content,
        status: result.ok ? "published" : "failed",
        publishedUrl: result.publishedUrl ?? null,
        publishedAt: result.ok ? now : null,
        errorMessage: result.ok ? null : (result.error ?? "Unknown error"),
        metadata: resultMeta,
      }).catch(() => {});
    }

    if (result.ok) {
      return { ok: true, output: `Published to ${PUBLISHING_CHANNELS[channel]?.displayName ?? channel}${result.publishedUrl ? ": " + result.publishedUrl : ""}` };
    }
    return { ok: false, output: result.error ?? `Publish to ${channel} failed` };
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

// ─── A/B Test winner selection (runs nightly) ─────────────────────────────────

const AB_TEST_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
let lastAbTestCheck = 0;

async function processABTests(): Promise<void> {
  const now = Date.now();
  if (now - lastAbTestCheck < AB_TEST_CHECK_INTERVAL_MS) return;
  lastAbTestCheck = now;

  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  // Find running tests that either have 100+ total visits OR are older than 7 days
  const candidateTests = await pool.query<{
    id: number;
    user_id: number;
    system_instance_id: number;
    name: string;
    created_at: Date;
    total_visits: string;
  }>(
    `SELECT t.id, t.user_id, t.system_instance_id, t.name, t.created_at,
            COALESCE(SUM(v.visits), 0) AS total_visits
     FROM ab_tests t
     LEFT JOIN ab_variants v ON v.test_id = t.id
     WHERE t.status = 'running'
     GROUP BY t.id
     HAVING COALESCE(SUM(v.visits), 0) >= 100 OR t.created_at <= $1`,
    [sevenDaysAgo],
  );

  if (candidateTests.rowCount === 0) return;

  logger.info({ count: candidateTests.rowCount }, "A/B test winner selection running");

  for (const row of candidateTests.rows) {
    const variants = await pool.query<{
      id: number;
      name: string;
      visits: number;
      conversions: number;
    }>(
      `SELECT id, name, visits, conversions FROM ab_variants WHERE test_id = $1 ORDER BY id`,
      [row.id],
    );

    if (variants.rowCount === 0) continue;

    // Pick variant with highest conversion rate (conversions / max(visits, 1))
    let winnerVariant = variants.rows[0]!;
    for (const v of variants.rows) {
      const vRate = v.conversions / Math.max(v.visits, 1);
      const wRate = winnerVariant.conversions / Math.max(winnerVariant.visits, 1);
      if (vRate > wRate) winnerVariant = v;
    }

    const concludedAt = new Date();
    await pool.query(
      `UPDATE ab_tests SET status = 'concluded', winner_variant_id = $1, concluded_at = $2 WHERE id = $3`,
      [winnerVariant.id, concludedAt, row.id],
    );

    await db.insert(systemActivityEventsTable).values({
      systemInstanceId: row.system_instance_id,
      eventType: "info",
      description: `A/B Test "${row.name}" concluded — winner: ${winnerVariant.name} (${winnerVariant.conversions}/${Math.max(winnerVariant.visits, 1)} conversions)`,
      metadata: JSON.stringify({
        testId: row.id,
        winnerVariantId: winnerVariant.id,
        winnerName: winnerVariant.name,
        visits: winnerVariant.visits,
        conversions: winnerVariant.conversions,
      }),
    });

    await db.insert(notificationsTable).values({
      userId: row.user_id,
      title: `A/B Test Complete: ${row.name}`,
      message: `Your A/B test "${row.name}" has concluded. Winner: "${winnerVariant.name}" with a ${((winnerVariant.conversions / Math.max(winnerVariant.visits, 1)) * 100).toFixed(1)}% conversion rate.`,
      notificationType: "info",
      read: false,
    });

    logger.info({ testId: row.id, winnerId: winnerVariant.id, winnerName: winnerVariant.name }, "A/B test concluded");
  }
}

// ─── Main scheduler loop ──────────────────────────────────────────────────────

export function startScheduler(): void {
  if (running) return;
  running = true;

  async function loop(): Promise<void> {
    try {
      await processDueTasks();
      await processABTests();
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
