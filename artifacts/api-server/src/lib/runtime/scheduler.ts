import { pool, db, usersTable, scheduledTasksTable, systemInstancesTable, systemActivityEventsTable, notificationsTable, publishedContentTable, abTestsTable, abVariantsTable, emailSequencesTable, emailSequenceStepsTable, emailSubscribersTable, emailDeliveriesTable, scheduledPostsTable } from "@workspace/db";
import { eq, and, lte, sql, gt } from "drizzle-orm";
import { logger } from "../logger";
import { getConnector } from "../connectors/registry";
import { decrypt } from "../crypto";
import { complete } from "../openrouter";
import { sendWeeklyDigestEmail } from "../email";
import { sendPushNotification } from "../push";
import { computeNextRunAt as _computeNextRunAt } from "../../routes/scheduled-tasks";
import { publish, PUBLISHING_CHANNELS } from "../publishing";
import { sendEmailViaCredentials, getBaseUrl as getSocialBaseUrl } from "../sendgrid";
import { recomputeAllActiveSystemsHealth, recomputeAllActiveBusinessesHealth } from "../health-monitor";
import { attemptSelfHeal } from "../self-healing";
import { loadCredentials as loadSystemCredentials, notifyOutOfCredits } from "./worker";
import { businessesTable } from "@workspace/db";
import { enqueue, reclaimHungJobs } from "./jobs";
import { notifyUser } from "../notify";
import { credentialDisplayName } from "../connectors/catalog-map";
import { OutOfCreditsError } from "../credits";
import { createPendingApproval } from "../approvals";
import { hasOperationsModeAccess } from "../operations-gate";
import { distillAshBrain } from "../ash-brain";
import { runScheduledResearch } from "../research-engine/scheduled";
import { runMemoryMaintenance } from "../memory-engine";
import { initializeBusinessDna, publishBusinessEvent } from "../business-intelligence";
// A-03 fix: expire stale DOL execution sessions on a regular interval
import { expireStaleSessionsLocal } from "../digital-operating-layer/dol-session-engine";

const POLL_INTERVAL_MS = 60_000;
let running = false;

// ─── Persistent scheduler state ───────────────────────────────────────────────
// Each sub-task's "last ran at" timestamp is stored in a small DB table so it
// survives process restarts. An in-memory cache (populated at startup) keeps
// every tick fast — the DB is only written when a task actually fires.

const stateCache = new Map<string, number>();

async function ensureSchedulerStateTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS scheduler_state (
      task_key   TEXT        PRIMARY KEY,
      last_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function loadSchedulerState(): Promise<void> {
  try {
    const rows = await pool.query<{ task_key: string; last_run_at: Date }>(
      `SELECT task_key, last_run_at FROM scheduler_state`,
    );
    for (const row of rows.rows) {
      stateCache.set(row.task_key, new Date(row.last_run_at).getTime());
    }
    logger.info({ keys: rows.rowCount }, "Scheduler state loaded from DB");
  } catch (err) {
    logger.warn({ err }, "Failed to load scheduler state from DB — all tasks will start fresh");
  }
}

function getState(key: string): number {
  return stateCache.get(key) ?? 0;
}

async function setState(key: string, ts: number): Promise<void> {
  stateCache.set(key, ts);
  try {
    await pool.query(
      `INSERT INTO scheduler_state (task_key, last_run_at)
       VALUES ($1, $2)
       ON CONFLICT (task_key) DO UPDATE SET last_run_at = EXCLUDED.last_run_at`,
      [key, new Date(ts)],
    );
  } catch (err) {
    logger.warn({ err, key }, "Failed to persist scheduler state to DB");
  }
}

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

// Real exponential backoff for scheduled tasks (Task #283) — replaces the old
// 2-strike disable. A transient failure no longer permanently kills automation:
// the task is retried up to MAX_TASK_ATTEMPTS times with 5min × 2^(n-1) backoff
// (capped), and only disabled after all retries are exhausted.
const MAX_TASK_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 5 * 60 * 1000; // 5 minutes
const MAX_BACKOFF_MS = 6 * 60 * 60 * 1000; // 6 hours

function backoffDelayMs(attempt: number): number {
  // attempt is 1-based (1 = first failure). 5m, 10m, 20m, 40m, …
  return Math.min(BASE_BACKOFF_MS * 2 ** (attempt - 1), MAX_BACKOFF_MS);
}

function formatDelay(ms: number): string {
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"}`;
  const hours = Math.round(mins / 60);
  return `${hours} hour${hours === 1 ? "" : "s"}`;
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

  if (newFailureCount < MAX_TASK_ATTEMPTS) {
    // Retry with exponential backoff.
    const delayMs = backoffDelayMs(newFailureCount);
    const retryAt = new Date(Date.now() + delayMs);
    const delayLabel = formatDelay(delayMs);

    await pool.query(
      `UPDATE scheduled_tasks SET last_run_status = 'retrying', last_run_error = $1, failure_count = $2, next_run_at = $3 WHERE id = $4`,
      [errorMsg.slice(0, 500), newFailureCount, retryAt, taskId],
    );

    await db.insert(systemActivityEventsTable).values({
      systemInstanceId,
      eventType: "error",
      description: `Scheduled: ${taskName} failed (attempt ${newFailureCount}/${MAX_TASK_ATTEMPTS}) — retrying in ${delayLabel}. Error: ${errorMsg.slice(0, 150)}`,
      metadata: JSON.stringify({ scheduledTaskId: taskId, status: "retrying", attempt: newFailureCount, error: errorMsg }),
    });

    logger.warn({ taskId, taskName, attempt: newFailureCount, delayMs, errorMsg }, "Scheduled task failed — backing off");
  } else {
    // Retries exhausted — disable and notify the user with a one-click link.
    await pool.query(
      `UPDATE scheduled_tasks SET last_run_status = 'failed', last_run_error = $1, failure_count = $2, enabled = false WHERE id = $3`,
      [errorMsg.slice(0, 500), newFailureCount, taskId],
    );

    await db.insert(systemActivityEventsTable).values({
      systemInstanceId,
      eventType: "error",
      description: `Scheduled: ${taskName} failed ${newFailureCount} times and was disabled. Error: ${errorMsg.slice(0, 150)}`,
      metadata: JSON.stringify({ scheduledTaskId: taskId, status: "failed", attempt: newFailureCount, error: errorMsg }),
    });

    await notifyUser({
      userId,
      notificationType: "error",
      title: `Scheduled Task Disabled: ${taskName}`,
      message: `Your scheduled task "${taskName}" failed ${newFailureCount} times (with automatic retries) and has been disabled. Last error: ${errorMsg.slice(0, 200)}. Fix the issue and re-enable it from the system page.`,
      linkUrl: systemInstanceId ? `/systems/${systemInstanceId}` : "/dashboard",
      dedupeKey: `task_disabled_${taskId}`,
    });

    logger.error({ taskId, taskName, attempts: newFailureCount, errorMsg }, "Scheduled task disabled after exhausting retries — user notified");
  }
}

// ─── Weekly digest (runs once per week) ──────────────────────────────────────

const WEEKLY_DIGEST_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

async function processWeeklyDigest(): Promise<void> {
  const now = Date.now();
  if (now - getState("weekly_digest") < WEEKLY_DIGEST_INTERVAL_MS) return;
  await setState("weekly_digest", now);

  const weekAgo = new Date(now - 7 * 86_400_000);

  const users = await pool.query<{ id: number; name: string | null; email: string; expo_push_token: string | null }>(
    `SELECT u.id, u.name, u.email, u.expo_push_token
     FROM users u
     JOIN system_instances si ON si.user_id = u.id
     WHERE u.active = true
     GROUP BY u.id`,
  );

  if (users.rowCount === 0) return;

  logger.info({ userCount: users.rowCount }, "Weekly digest: sending");

  let sent = 0;
  for (const user of users.rows) {
    try {
      const instances = await pool.query<{ id: number; name: string; build_status: string }>(
        `SELECT id, name, build_status FROM system_instances WHERE user_id = $1`,
        [user.id],
      );

      const instanceIds = instances.rows.map((i) => i.id);
      const revenueRow = await pool.query<{ total: number; count: number }>(
        `SELECT COALESCE(SUM(amount_cents), 0)::int AS total, COUNT(*)::int AS count
         FROM system_activity_events
         WHERE system_instance_id = ANY($1)
           AND event_type = 'revenue'
           AND created_at >= $2`,
        [instanceIds.length > 0 ? instanceIds : [-1], weekAgo],
      );

      const activeSystems        = instances.rows.filter((i) => i.build_status === "active").length;
      const weeklyRevenueDollars = (revenueRow.rows[0]?.total ?? 0) / 100;
      const context = `User: ${user.name ?? user.email}. Active systems: ${activeSystems}/${instances.rowCount}. Revenue last 7 days: $${weeklyRevenueDollars.toFixed(2)} (${revenueRow.rows[0]?.count ?? 0} events).`;

      const result = await complete({
        userId: user.id,
        prompt: `Write a concise, motivating 2–3 sentence "What's Working" weekly digest for this SBEP user. Mention a specific win if there is revenue, and suggest one concrete next action. Context: ${context}`,
        model: "openai/gpt-4o-mini",
        systemPrompt: "You are the SBEP AI advisor. Write short, encouraging, actionable weekly digests. Be specific and upbeat. No fluff.",
      });

      if (!result.content) continue;

      // In-app notification
      await db.insert(notificationsTable).values({
        userId: user.id,
        title: "Your Weekly Digest — What's Working",
        message: result.content,
        notificationType: "info",
        read: false,
      });

      // Email (fire-and-forget)
      sendWeeklyDigestEmail(
        user.email,
        user.name ?? user.email,
        result.content,
        { activeSystems, weeklyRevenueDollars },
      ).catch((err: unknown) => {
        logger.warn({ userId: user.id, err }, "Scheduled weekly digest email failed");
      });

      // Push (fire-and-forget)
      if (user.expo_push_token) {
        sendPushNotification(
          user.expo_push_token,
          "📊 Your Weekly Digest",
          result.content.slice(0, 150) + (result.content.length > 150 ? "…" : ""),
          { screen: "dashboard" },
        ).catch((err: unknown) => {
          logger.warn({ userId: user.id, err }, "Scheduled weekly digest push failed");
        });
      }

      sent++;
    } catch (err: unknown) {
      if (err instanceof OutOfCreditsError) {
        await notifyOutOfCredits(user.id, "Your weekly digest");
      }
      logger.warn({ userId: user.id, err }, "Weekly digest failed for user");
    }
  }

  logger.info({ sent, total: users.rowCount }, "Weekly digest: complete");
}

// ─── A/B Test winner selection (runs nightly) ─────────────────────────────────

const AB_TEST_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

async function processABTests(): Promise<void> {
  const now = Date.now();
  if (now - getState("ab_test_check") < AB_TEST_CHECK_INTERVAL_MS) return;
  await setState("ab_test_check", now);

  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const fortyEightHoursAgo = new Date(now - 48 * 60 * 60 * 1000);

  // Find running tests ready to conclude:
  // landing_page: 100+ total visits OR 7 days old
  // email_subject: 48 hours old (subject line open rate window)
  const candidateTests = await pool.query<{
    id: number;
    user_id: number;
    system_instance_id: number;
    name: string;
    type: string;
    created_at: Date;
    config: Record<string, unknown>;
    total_visits: string;
  }>(
    `SELECT t.id, t.user_id, t.system_instance_id, t.name, t.type, t.created_at, t.config,
            COALESCE(SUM(v.visits), 0) AS total_visits
     FROM ab_tests t
     LEFT JOIN ab_variants v ON v.test_id = t.id
     WHERE t.status = 'running'
     GROUP BY t.id
     HAVING
       (t.type = 'landing_page' AND (COALESCE(SUM(v.visits), 0) >= 100 OR t.created_at <= $1))
       OR
       (t.type = 'email_subject' AND t.created_at <= $2)`,
    [sevenDaysAgo, fortyEightHoursAgo],
  );

  if (candidateTests.rowCount === 0) return;

  logger.info({ count: candidateTests.rowCount }, "A/B test winner selection running");

  for (const row of candidateTests.rows) {
    const variants = await pool.query<{
      id: number;
      name: string;
      visits: number;
      conversions: number;
      content_ref: string;
      conversion_events: Record<string, number> | null;
    }>(
      `SELECT id, name, visits, conversions, content_ref, conversion_events FROM ab_variants WHERE test_id = $1 ORDER BY id`,
      [row.id],
    );

    if (variants.rowCount === 0) continue;

    // Pick winning variant.
    // - landing_page tests: highest conversion rate (conversions / max(visits, 1))
    // - email_subject tests: highest open rate (email_open events / max(visits, 1))
    let winnerVariant = variants.rows[0]!;
    for (const v of variants.rows) {
      const scoreOf = (variant: typeof v): number => {
        if (row.type === "email_subject") {
          const opens = (variant.conversion_events?.email_open ?? 0);
          return opens / Math.max(variant.visits, 1);
        }
        return variant.conversions / Math.max(variant.visits, 1);
      };
      if (scoreOf(v) > scoreOf(winnerVariant)) winnerVariant = v;
    }

    const concludedAt = new Date();
    await pool.query(
      `UPDATE ab_tests SET status = 'concluded', winner_variant_id = $1, concluded_at = $2 WHERE id = $3`,
      [winnerVariant.id, concludedAt, row.id],
    );

    // Archive all losing variants
    await pool.query(
      `UPDATE ab_variants SET status = 'archived' WHERE test_id = $1 AND id != $2`,
      [row.id, winnerVariant.id],
    ).catch((err: unknown) => {
      logger.warn({ err, testId: row.id }, "Failed to archive losing variants");
    });

    // For landing_page tests: promote the winning variant's HTML to the landing
    // page. This is an autonomous, user-facing change. For businesses running
    // under ASH Operations Mode we don't apply it silently — we queue a pending
    // approval (logged + reversible via lib/approval-executor.ts) so the owner
    // signs off first. Otherwise (no linked business / not on Operations Mode)
    // we keep the original auto-promote behavior.
    let promotionGated = false;
    if (row.type === "landing_page") {
      const landingPageId = (row.config as Record<string, unknown>)?.landingPageId as number | undefined;
      if (landingPageId && winnerVariant.content_ref.length > 200) {
        const [biz] = await db
          .select({ id: businessesTable.id, ownerId: businessesTable.ownerId })
          .from(businessesTable)
          .where(eq(businessesTable.systemInstanceId, row.system_instance_id))
          .limit(1);

        if (biz) {
          const [owner] = await db
            .select({ membershipTier: usersTable.membershipTier, role: usersTable.role })
            .from(usersTable)
            .where(eq(usersTable.id, biz.ownerId));

          if (hasOperationsModeAccess(owner?.membershipTier, owner?.role)) {
            promotionGated = true;
            const convRate = ((winnerVariant.conversions / Math.max(winnerVariant.visits, 1)) * 100).toFixed(1);
            await createPendingApproval({
              businessId: biz.id,
              userId: biz.ownerId,
              category: "schedulePosts",
              riskLevel: "high",
              title: `Promote A/B winner "${winnerVariant.name}" to your landing page`,
              description: `ASH selected "${winnerVariant.name}" as the winning variant for "${row.name}" (${convRate}% conversion rate). Approve to publish it live — you can undo this afterwards.`,
              payload: {
                action: "promote_ab_variant",
                landingPageId,
                winnerHtml: winnerVariant.content_ref,
                systemInstanceId: row.system_instance_id,
                winnerName: winnerVariant.name,
              },
            });
          }
        }

        if (!promotionGated) {
          await pool.query(
            `UPDATE landing_pages SET html_content = $1 WHERE id = $2`,
            [winnerVariant.content_ref, landingPageId],
          ).catch((err: unknown) => {
            logger.error({ err, testId: row.id, landingPageId }, "Failed to promote winning variant to landing page");
          });
        }
      }
    }

    await db.insert(systemActivityEventsTable).values({
      systemInstanceId: row.system_instance_id,
      eventType: "info",
      description: `A/B Test "${row.name}" concluded — winner: ${winnerVariant.name} (${winnerVariant.conversions} conv / ${winnerVariant.visits} visits)`,
      metadata: JSON.stringify({
        testId: row.id,
        testType: row.type,
        winnerVariantId: winnerVariant.id,
        winnerName: winnerVariant.name,
        visits: winnerVariant.visits,
        conversions: winnerVariant.conversions,
      }),
    });

    const landingSuffix =
      row.type !== "landing_page"
        ? ""
        : promotionGated
          ? " ASH needs your approval before publishing the winner — review it in your approvals queue."
          : " Your landing page has been updated to show the winning variant.";
    await db.insert(notificationsTable).values({
      userId: row.user_id,
      title: `A/B Test Complete: ${row.name}`,
      message: `Your ${row.type === "email_subject" ? "email subject" : "landing page"} A/B test "${row.name}" has concluded. Winner: "${winnerVariant.name}" (${((winnerVariant.conversions / Math.max(winnerVariant.visits, 1)) * 100).toFixed(1)}% conversion rate).${landingSuffix}`,
      notificationType: "info",
      read: false,
    });

    logger.info({ testId: row.id, type: row.type, winnerId: winnerVariant.id, winnerName: winnerVariant.name }, "A/B test concluded");
  }
}

// ─── Email sequence delivery engine ──────────────────────────────────────────
// Runs every 5 minutes. Finds active sequences and delivers steps that are due
// to subscribers based on their subscription date + step delayDays.

const EMAIL_SEQUENCE_INTERVAL_MS = 5 * 60 * 1000;

async function processEmailSequences(): Promise<void> {
  const now = Date.now();
  if (now - getState("email_sequence") < EMAIL_SEQUENCE_INTERVAL_MS) return;
  await setState("email_sequence", now);

  // Get all active sequences that have a linked list
  const sequences = await pool.query<{
    id: number;
    user_id: number;
    list_id: number;
  }>(
    `SELECT id, user_id, list_id FROM email_sequences WHERE status = 'active' AND list_id IS NOT NULL`,
  );
  if (sequences.rowCount === 0) return;

  for (const seq of sequences.rows) {
    try {
      // Get all steps for this sequence, ordered by delay
      const stepsRes = await pool.query<{
        id: number;
        step_number: number;
        subject: string;
        body: string;
        delay_days: number;
      }>(
        `SELECT id, step_number, subject, body, delay_days FROM email_sequence_steps WHERE sequence_id = $1 ORDER BY step_number`,
        [seq.id],
      );
      if (stepsRes.rowCount === 0) continue;
      const steps = stepsRes.rows;

      // Get active subscribers in the linked list
      const subsRes = await pool.query<{
        id: number;
        email: string;
        first_name: string | null;
        last_name: string | null;
        created_at: Date;
      }>(
        `SELECT id, email, first_name, last_name, created_at FROM email_subscribers WHERE list_id = $1 AND status = 'active'`,
        [seq.list_id],
      );
      if (subsRes.rowCount === 0) continue;

      const nowDate = new Date();

      for (const sub of subsRes.rows) {
        // Determine which step(s) this subscriber is due for
        // A step is due when: subscribedAt + delayDays <= now
        // AND the subscriber hasn't received this step yet
        for (const step of steps) {
          const dueAt = new Date(sub.created_at);
          dueAt.setDate(dueAt.getDate() + step.delay_days);
          if (dueAt > nowDate) continue; // not due yet

          // Check if already delivered
          const alreadySent = await pool.query<{ count: string }>(
            `SELECT COUNT(*) AS count FROM email_deliveries WHERE sequence_id = $1 AND step_id = $2 AND subscriber_id = $3`,
            [seq.id, step.id, sub.id],
          );
          if (parseInt(alreadySent.rows[0]?.count ?? "0", 10) > 0) continue;

          // Send the email
          const vars: Record<string, string> = {
            firstName: sub.first_name ?? "",
            lastName: sub.last_name ?? "",
            email: sub.email,
          };
          const { buildUnsubscribeUrl: buildUrl, getBaseUrl: getBase } = await import("../sendgrid");
          const result = await sendEmailViaCredentials({
            userId: seq.user_id,
            to: sub.email,
            subject: step.subject,
            body: step.body,
            vars,
            unsubscribeUrl: buildUrl(getBase(), sub.id, sub.email),
          });

          // Record delivery
          await db.insert(emailDeliveriesTable).values({
            userId: seq.user_id,
            subscriberId: sub.id,
            sequenceId: seq.id,
            stepId: step.id,
            toEmail: sub.email,
            subject: step.subject,
            status: result.ok ? "sent" : "failed",
            messageId: result.messageId ?? null,
            sentAt: result.ok ? new Date() : null,
            errorMessage: result.error ?? null,
          }).catch((err: unknown) => {
            logger.warn({ err, subId: sub.id, stepId: step.id }, "Failed to record sequence delivery");
          });

          if (!result.ok) {
            logger.warn({ seqId: seq.id, stepId: step.id, subId: sub.id, error: result.error }, "Sequence step delivery failed");
          }
        }
      }
    } catch (err: unknown) {
      logger.warn({ err, seqId: seq.id }, "Error processing email sequence delivery");
    }
  }
}

// ─── Social post scheduler ────────────────────────────────────────────────────
// Runs every 5 minutes. Publishes due scheduled_posts rows to their target
// platform via the publishing dispatcher, mirroring processEmailSequences().

const SOCIAL_POSTS_INTERVAL_MS = 5 * 60 * 1000;

async function processDuePosts(): Promise<void> {
  const now = Date.now();
  if (now - getState("social_posts") < SOCIAL_POSTS_INTERVAL_MS) return;
  await setState("social_posts", now);

  const nowDate = new Date();

  // Claim due posts atomically — flip to 'publishing' immediately to prevent double-firing.
  const claimed = await pool.query<{
    id: number;
    user_id: number;
    system_instance_id: number | null;
    platform: string;
    content: string;
    media_urls: string[];
    link_url: string | null;
  }>(
    `UPDATE scheduled_posts
     SET status = 'publishing', updated_at = NOW()
     WHERE id IN (
       SELECT id FROM scheduled_posts
       WHERE status = 'scheduled' AND scheduled_at <= $1
       ORDER BY scheduled_at
       LIMIT 25
       FOR UPDATE SKIP LOCKED
     )
     RETURNING id, user_id, system_instance_id, platform, content, media_urls, link_url`,
    [nowDate],
  );

  if (claimed.rowCount === 0) return;

  logger.info({ count: claimed.rowCount }, "Scheduler processing due social posts");

  for (const row of claimed.rows) {
    try {
      const creds = await loadUserCredentials(row.user_id);
      const mediaUrls = Array.isArray(row.media_urls) ? row.media_urls : [];
      // Route the outbound link through the click-tracking redirect so
      // clicks are counted before landing on the destination page.
      const trackedLink = row.link_url ? `${getSocialBaseUrl()}/api/r/${row.id}` : null;
      const result = await publish(row.platform, creds, {
        channel: row.platform,
        contentType: "post",
        content: trackedLink ? `${row.content}\n\n${trackedLink}` : row.content,
        imageUrl: mediaUrls[0],
      });

      if (result.ok) {
        await pool.query(
          `UPDATE scheduled_posts
           SET status = 'published', published_at = $1, platform_post_id = $2, published_url = $3, error_message = NULL
           WHERE id = $4`,
          [nowDate, result.externalId ?? null, result.publishedUrl ?? null, row.id],
        );
      } else {
        await pool.query(
          `UPDATE scheduled_posts SET status = 'failed', error_message = $1 WHERE id = $2`,
          [(result.error ?? "Unknown error").slice(0, 500), row.id],
        );
        await db.insert(notificationsTable).values({
          userId: row.user_id,
          title: `Scheduled ${row.platform} post failed`,
          message: `Your ${row.platform} post scheduled for ${nowDate.toLocaleString()} failed to publish: ${(result.error ?? "Unknown error").slice(0, 200)}. Edit and reschedule it from the Content Calendar.`,
          notificationType: "error",
          read: false,
        }).catch(() => {});
      }

      if (row.system_instance_id != null) {
        await db.insert(systemActivityEventsTable).values({
          systemInstanceId: row.system_instance_id,
          eventType: result.ok ? "action" : "error",
          description: result.ok
            ? `Scheduled post published to ${PUBLISHING_CHANNELS[row.platform]?.displayName ?? row.platform}`
            : `Scheduled post to ${PUBLISHING_CHANNELS[row.platform]?.displayName ?? row.platform} failed: ${(result.error ?? "").slice(0, 150)}`,
          metadata: JSON.stringify({ scheduledPostId: row.id, platform: row.platform, ok: result.ok }),
        }).catch(() => {});
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await pool.query(
        `UPDATE scheduled_posts SET status = 'failed', error_message = $1 WHERE id = $2`,
        [errorMsg.slice(0, 500), row.id],
      ).catch(() => {});
      logger.error({ err, postId: row.id }, "Scheduled post publish threw an error");
    }
  }
}

// ─── Continuous monitoring & self-healing tick (Task #246) ───────────────────
// Runs every 5 minutes: recomputes per-dimension health scores for every
// active system instance and business, then runs the whitelisted low-risk
// self-healing pass for each active system instance. Elevated-risk fixes are
// escalated to a Pending Approval inside attemptSelfHeal() rather than run
// here — this tick never applies anything outside the low-risk whitelist.

const HEALTH_MONITOR_INTERVAL_MS = 5 * 60 * 1000;

async function processHealthMonitoring(): Promise<void> {
  const now = Date.now();
  if (now - getState("health_monitor") < HEALTH_MONITOR_INTERVAL_MS) return;
  await setState("health_monitor", now);

  try {
    const systemCount = await recomputeAllActiveSystemsHealth();
    const businessCount = await recomputeAllActiveBusinessesHealth();
    const businesses = await db.select({ id: businessesTable.id }).from(businessesTable);
    await Promise.allSettled(businesses.map((business) => publishBusinessEvent({
      businessId: business.id,
      eventType: "health.monitoring_recomputed",
      source: "health_monitor",
      payload: { description: "Business monitoring health was recomputed." },
      dedupeKey: `health.monitoring_recomputed:${business.id}:${Math.floor(now / HEALTH_MONITOR_INTERVAL_MS)}`,
    })));
    logger.info({ systemCount, businessCount }, "Health monitoring recompute complete");
  } catch (err) {
    logger.warn({ err }, "Health monitoring recompute failed");
  }

  try {
    const activeInstances = await db
      .select({ id: systemInstancesTable.id })
      .from(systemInstancesTable)
      .where(sql`${systemInstancesTable.buildStatus} in ('running', 'building')`);

    for (const { id } of activeInstances) {
      try {
        const healResults = await attemptSelfHeal(id, loadSystemCredentials);
        // Notify the system owner when self-heal explicitly tried and failed to fix an issue.
        // Dedupe is enforced against ALL notifications with the same key in the past 24h
        // (regardless of read status) so a user who dismisses the alert won't be re-notified
        // within the same day.
        const unfixedCount = healResults.filter((r) => r.attempted && !r.fixed).length;
        if (unfixedCount > 0) {
          const [sys] = await db
            .select({ name: systemInstancesTable.name, userId: systemInstancesTable.userId })
            .from(systemInstancesTable)
            .where(eq(systemInstancesTable.id, id))
            .limit(1);
          if (sys?.userId) {
            const dedupeKey = `system_unhealthy_${id}`;
            const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
            // Read-status-independent dedupe: check without filtering on read=false
            const [recent] = await db
              .select({ id: notificationsTable.id })
              .from(notificationsTable)
              .where(
                and(
                  eq(notificationsTable.userId, sys.userId),
                  eq(notificationsTable.dedupeKey, dedupeKey),
                  gt(notificationsTable.createdAt, windowStart),
                ),
              )
              .limit(1);
            if (!recent) {
              await db.insert(notificationsTable).values({
                userId: sys.userId,
                title: `System needs attention: ${sys.name ?? "Your system"}`,
                message: `ASH attempted to repair "${sys.name}" automatically but could not fix ${unfixedCount === 1 ? "an issue" : `${unfixedCount} issues`}. Open the system detail page to review.`,
                notificationType: "error",
                linkUrl: `/systems/${id}`,
                dedupeKey,
              }).catch((err: unknown) => {
                logger.warn({ err, systemInstanceId: id }, "Failed to insert system-unhealthy notification");
              });
            }
          }
        }
      } catch (err) {
        logger.warn({ err, systemInstanceId: id }, "Self-healing pass failed for system instance");
      }
    }
  } catch (err) {
    logger.warn({ err }, "Self-healing tick failed");
  }
}

const BI_RECONCILIATION_INTERVAL_MS = 60 * 60 * 1000;

async function processBusinessIntelligenceReconciliation(): Promise<void> {
  const now = Date.now();
  if (now - getState("bi_reconciliation") < BI_RECONCILIATION_INTERVAL_MS) return;
  await setState("bi_reconciliation", now);
  try {
    const businesses = await db.select({ id: businessesTable.id }).from(businessesTable);
    const results = await Promise.allSettled(businesses.map((business) => initializeBusinessDna(business.id)));
    const failures = results.filter((result) => result.status === "rejected").length;
    logger.info({ businessCount: businesses.length, failures }, "Business Intelligence reconciliation complete");
  } catch (err) {
    logger.warn({ err }, "Business Intelligence reconciliation failed");
  }
}

// ─── Hung-job watchdog tick ───────────────────────────────────────────────────
// Runs every 5 minutes. Finds jobs that have been stuck in 'active' status
// longer than their per-type timeout (e.g. a handler awaiting a call that
// never resolves) and resets them to 'retrying' with exponential backoff, or
// permanently fails them if all attempts are exhausted. This closes the gap
// where startup-only orphan recovery misses jobs that hang mid-run.

const HUNG_JOB_WATCHDOG_INTERVAL_MS = 5 * 60 * 1000;

async function processHungJobWatchdog(): Promise<void> {
  const now = Date.now();
  if (now - getState("hung_job_watchdog") < HUNG_JOB_WATCHDOG_INTERVAL_MS) return;
  await setState("hung_job_watchdog", now);

  try {
    const { reclaimed, finalFailed } = await reclaimHungJobs();
    if (reclaimed > 0 || finalFailed > 0) {
      logger.warn({ reclaimed, finalFailed }, "Hung job watchdog: reclaimed stuck active jobs");
    } else {
      logger.debug("Hung job watchdog: no stuck jobs found");
    }
  } catch (err) {
    logger.warn({ err }, "Hung job watchdog failed");
  }
}

// ─── AI Improvement Engine tick (Task #248) ──────────────────────────────────
// Runs once per day: enqueues a business_improvement_pass job for every
// active business. Each pass analyzes the business, checks the Marketplace
// catalog first, and writes fresh business_recommendations rows consumed by
// the Growth Recommendations panel.

const IMPROVEMENT_PASS_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function processImprovementPasses(): Promise<void> {
  const now = Date.now();
  if (now - getState("improvement_pass") < IMPROVEMENT_PASS_INTERVAL_MS) return;
  await setState("improvement_pass", now);

  try {
    const activeBusinesses = await db
      .select({ id: businessesTable.id })
      .from(businessesTable)
      .where(eq(businessesTable.status, "active"));

    for (const { id } of activeBusinesses) {
      try {
        await enqueue("business_improvement_pass", { businessId: id }, { priority: 8 });
      } catch (err) {
        logger.warn({ err, businessId: id }, "Failed to enqueue improvement pass");
      }
    }
    logger.info({ count: activeBusinesses.length }, "Improvement pass tick: enqueued jobs for active businesses");
  } catch (err) {
    logger.warn({ err }, "Improvement pass tick failed");
  }
}

// ─── ASH brain distillation tick (Task #312) ─────────────────────────────────
// Runs once per day: distills real outcomes (revenue, health, tools, niches)
// into durable "lessons" ASH retrieves at plan/build/recommend time. Purely
// deterministic SQL aggregation — no AI cost, no fabricated claims.

const BRAIN_DISTILL_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function processBrainDistillation(): Promise<void> {
  const now = Date.now();
  if (now - getState("brain_distill") < BRAIN_DISTILL_INTERVAL_MS) return;
  await setState("brain_distill", now);

  try {
    const result = await distillAshBrain();
    logger.info(result, "ASH brain distillation tick complete");
  } catch (err) {
    logger.warn({ err }, "ASH brain distillation tick failed");
  }
}

// ─── Scheduled research tick ─────────────────────────────────────────────────
// Daily check; each Operations Mode business gets market research once a week.

const SCHEDULED_RESEARCH_TICK_MS = 24 * 60 * 60 * 1000;

async function processScheduledResearch(): Promise<void> {
  const now = Date.now();
  if (now - getState("scheduled_research") < SCHEDULED_RESEARCH_TICK_MS) return;
  await setState("scheduled_research", now);
  try {
    const result = await runScheduledResearch({ now, lastRun: getState, markRun: setState });
    logger.info(result, "Scheduled research tick complete");
  } catch (err) {
    logger.warn({ err }, "Scheduled research tick failed");
  }
}

// ─── Credential-expiry warnings ───────────────────────────────────────────────
// Proactively warn users before a connected credential expires so their
// automations don't silently break. Skips keys that auto-refresh on their own
// (handled by social-oauth's refreshExpiringCredentials); the prime target is
// LinkedIn, whose ~60-day token cannot be refreshed and must be reconnected.

const EXPIRY_WARNING_INTERVAL_MS = 6 * 60 * 60 * 1000; // check ~4×/day (7-day window applied in SQL)
const EXPIRY_WARNING_DEDUPE_MS = 3 * 24 * 60 * 60 * 1000; // at most once / 3 days

// Credentials whose tokens are refreshed automatically elsewhere — no warning.
const AUTO_REFRESHABLE_KEYS = new Set([
  "TWITTER_BEARER_TOKEN",
  "TIKTOK_ACCESS_TOKEN",
  "META_ACCESS_TOKEN",
]);

async function processExpiringCredentialWarnings(): Promise<void> {
  const now = Date.now();
  if (now - getState("expiry_warning") < EXPIRY_WARNING_INTERVAL_MS) return;
  await setState("expiry_warning", now);

  try {
    const result = await pool.query(
      `SELECT id, user_id, credential_key, expires_at
         FROM user_credentials
        WHERE status = 'connected'
          AND expires_at IS NOT NULL
          AND expires_at > NOW()
          AND expires_at <= NOW() + INTERVAL '7 days'`,
    );
    const rows = result.rows as {
      id: number;
      user_id: number;
      credential_key: string;
      expires_at: Date;
    }[];

    let warned = 0;
    for (const row of rows) {
      if (AUTO_REFRESHABLE_KEYS.has(row.credential_key)) continue;
      const expiresMs = new Date(row.expires_at).getTime();
      const days = Math.max(1, Math.ceil((expiresMs - now) / (24 * 60 * 60 * 1000)));
      const name = credentialDisplayName(row.credential_key);
      const inserted = await notifyUser({
        userId: row.user_id,
        title: `${name} connection expires soon`,
        message: `Your ${name} credential expires in ${days} day${days === 1 ? "" : "s"}. Reconnect it in the Connections Hub to keep your automations running.`,
        notificationType: "warn",
        linkUrl: "/connections",
        dedupeKey: `cred_expiry_${row.id}`,
        dedupeWindowMs: EXPIRY_WARNING_DEDUPE_MS,
      });
      if (inserted) warned++;
    }
    if (warned > 0) {
      logger.info({ warned, scanned: rows.length }, "Credential-expiry warnings sent");
    }
  } catch (err) {
    logger.warn({ err }, "Credential-expiry warning tick failed");
  }
}

// ─── Memory Engine maintenance (ASH Brain v2.0 — Phase 1.2) ────────────────
// Cleanup/dedup/compression sweep. Runs a few times a day — this is
// housekeeping, not latency-sensitive, and each run is idempotent.
const MEMORY_MAINTENANCE_INTERVAL_MS = 4 * 60 * 60 * 1000;

async function processMemoryMaintenance(): Promise<void> {
  const now = Date.now();
  if (now - getState("memory_maintenance") < MEMORY_MAINTENANCE_INTERVAL_MS) return;
  await setState("memory_maintenance", now);

  try {
    await runMemoryMaintenance();
  } catch (err) {
    logger.warn({ err }, "Memory Engine maintenance tick failed");
  }
}

// ─── A-03: DOL session expiry ─────────────────────────────────────────────────
// Scans all "active" DOL execution sessions and expires any whose expiresAt is in
// the past. Runs every 5 minutes to keep the sessions table clean.
const DOL_SESSION_EXPIRY_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

async function processDolSessionExpiry(): Promise<void> {
  const now = Date.now();
  if (now - getState("dol_session_expiry") < DOL_SESSION_EXPIRY_INTERVAL_MS) return;
  try {
    const expired = await expireStaleSessionsLocal();
    await setState("dol_session_expiry", now);
    if (expired > 0) logger.info({ expired }, "A-03: expired stale DOL execution sessions");
  } catch (err) {
    logger.warn({ err }, "A-03: DOL session expiry tick failed — will retry next cycle");
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
      await processWeeklyDigest();
      await processEmailSequences();
      await processDuePosts();
      await processHealthMonitoring();
      await processHungJobWatchdog();
      await processImprovementPasses();
      await processBrainDistillation();
      await processScheduledResearch();
      await processExpiringCredentialWarnings();
      await processMemoryMaintenance();
      await processBusinessIntelligenceReconciliation();
      await processDolSessionExpiry(); // A-03: DOL stale session cleanup, every 5 min
    } catch (err) {
      logger.error({ err }, "Scheduler loop error");
    } finally {
      if (running) setTimeout(loop, POLL_INTERVAL_MS);
    }
  }

  // Ensure the state table exists and hydrate the in-memory cache from DB
  // before the first tick so no task fires spuriously after a restart.
  ensureSchedulerStateTable()
    .then(() => loadSchedulerState())
    .then(() => {
      if (running) setTimeout(loop, POLL_INTERVAL_MS);
    })
    .catch((err) => {
      logger.error({ err }, "Scheduler state init failed — starting without persisted state");
      if (running) setTimeout(loop, POLL_INTERVAL_MS);
    });

  logger.info({ pollIntervalMs: POLL_INTERVAL_MS }, "Scheduler started");
}

export function stopScheduler(): void {
  running = false;
  logger.info("Scheduler stopped");
}
