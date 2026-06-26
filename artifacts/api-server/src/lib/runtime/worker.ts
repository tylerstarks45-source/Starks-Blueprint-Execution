import { claimNextJob, completeJob, failJob, upsertConnectorStatus, resetOrphanedJobs } from "./jobs";
import { getConnector } from "../connectors/registry";
import { db, pool, systemInstancesTable, userCredentialsTable, systemActivityEventsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { decrypt } from "../crypto";
import { logger } from "../logger";
import { complete } from "../openrouter";
import { sendPushNotification } from "../push";

const POLL_INTERVAL_MS = 5_000;
let running = false;

// Decrypt credentials for a system instance's tools.
async function loadCredentials(systemInstanceId: number): Promise<Record<string, string>> {
  const rows = await db
    .select()
    .from(userCredentialsTable)
    .where(eq(userCredentialsTable.userId, systemInstanceId));

  const creds: Record<string, string> = {};
  for (const row of rows) {
    if (row.encryptedValue) {
      try {
        creds[row.credentialKey] = await decrypt(row.encryptedValue);
      } catch {
        // Skip malformed entries — don't crash the worker
      }
    }
  }
  return creds;
}

// ─── Job Handlers ─────────────────────────────────────────────────────────────

async function handleConnectorTest(payload: Record<string, unknown>): Promise<unknown> {
  const connectorId = payload["connectorId"] as string;
  const systemInstanceId = payload["systemInstanceId"] as number | undefined;
  const rawCreds = (payload["credentials"] as Record<string, string>) ?? {};

  const connector = getConnector(connectorId, rawCreds);
  if (!connector) throw new Error(`Unknown connector: ${connectorId}`);

  const result = await connector.testConnection();

  if (systemInstanceId) {
    await upsertConnectorStatus(
      systemInstanceId,
      connectorId,
      result.ok ? "connected" : "error",
      result.ok ? null : result.message,
    );
  }

  return result;
}

async function handleSystemStartup(payload: Record<string, unknown>): Promise<unknown> {
  const systemInstanceId = payload["systemInstanceId"] as number;

  await db
    .update(systemInstancesTable)
    .set({ buildStatus: "running", healthStatus: "healthy" })
    .where(eq(systemInstancesTable.id, systemInstanceId));

  logger.info({ systemInstanceId }, "System started — marked running");
  return { started: true, systemInstanceId };
}

async function handleHealthCheck(payload: Record<string, unknown>): Promise<unknown> {
  const systemInstanceId = payload["systemInstanceId"] as number;
  const connectorIds = (payload["connectors"] as string[]) ?? [];

  const creds = await loadCredentials(systemInstanceId);
  const results: Record<string, boolean> = {};
  let allOk = true;

  for (const connectorId of connectorIds) {
    const connector = getConnector(connectorId, creds);
    if (!connector) continue;

    try {
      const res = await connector.testConnection();
      results[connectorId] = res.ok;
      if (!res.ok) allOk = false;
      await upsertConnectorStatus(
        systemInstanceId,
        connectorId,
        res.ok ? "connected" : "degraded",
        res.ok ? null : res.message,
      );
    } catch (err: unknown) {
      results[connectorId] = false;
      allOk = false;
      await upsertConnectorStatus(systemInstanceId, connectorId, "error", String(err));
    }
  }

  const health = allOk ? "healthy" : "degraded";
  await db
    .update(systemInstancesTable)
    .set({ healthStatus: health })
    .where(eq(systemInstancesTable.id, systemInstanceId));

  return { health, connectors: results };
}

// ─── Credential loader ────────────────────────────────────────────────────────

async function loadUserCredentialsByUserId(userId: number): Promise<Record<string, string>> {
  const rows = await pool.query<{ credential_key: string; encrypted_value: string | null }>(
    `SELECT credential_key, encrypted_value FROM user_credentials WHERE user_id = $1`,
    [userId],
  );
  const creds: Record<string, string> = {};
  for (const row of rows.rows) {
    if (row.encrypted_value) {
      try { creds[row.credential_key] = await decrypt(row.encrypted_value); } catch { /* skip malformed */ }
    }
  }
  return creds;
}

// ─── ash_task handler ─────────────────────────────────────────────────────────
// Calls the OpenRouter LLM with the provided prompt and logs the AI response
// as a system activity event so it surfaces in the user's activity feed.

async function handleAshTask(payload: Record<string, unknown>): Promise<unknown> {
  const systemInstanceId = payload["systemInstanceId"] as number;
  const userId = payload["userId"] as number | undefined;
  const prompt = (payload["prompt"] as string | undefined) ?? "Process this webhook-triggered task.";

  const result = await complete({
    prompt,
    systemPrompt:
      "You are ASH, an AI automation assistant. A webhook has triggered a task for the user's automation system. " +
      "Process the request concisely and report what you did or recommend.",
    model: "openai/gpt-4o-mini",
    userId,
  });

  const response = result.content?.slice(0, 1000) ?? "(no response)";

  await db.insert(systemActivityEventsTable).values({
    systemInstanceId,
    eventType: "action",
    description: `ASH task completed (webhook): ${response.slice(0, 200)}`,
    metadata: JSON.stringify({ triggeredBy: "webhook_ash_task", prompt, response }),
  });

  return { ok: true, response };
}

// ─── send_email handler ───────────────────────────────────────────────────────
// Loads user credentials and calls the sendgrid or email connector to deliver
// the message. Falls back to logging the intent if no API key is configured.

async function handleSendEmail(payload: Record<string, unknown>): Promise<unknown> {
  const systemInstanceId = payload["systemInstanceId"] as number;
  const userId = payload["userId"] as number | undefined;
  const to = (payload["to"] as string | undefined) ?? "";
  const subject = (payload["subject"] as string | undefined) ?? "Webhook notification";
  const body = (payload["body"] as string | undefined) ?? "Webhook triggered this email.";

  if (!to) throw new Error("send_email job missing required field: to");

  const creds = userId != null ? await loadUserCredentialsByUserId(userId) : {};

  // Prefer SendGrid when the user has a key configured; otherwise use the
  // EmailConnector which calls Resend via the RESEND_API_KEY env var.
  const hasSendGrid = !!(creds["SENDGRID_API_KEY"] ?? creds["sendgrid_api_key"]);
  const preferredId = hasSendGrid ? "sendgrid" : "email";
  const connector = getConnector(preferredId, creds);
  if (!connector) throw new Error(`No email connector available (tried ${preferredId})`);

  const result = await connector.execute("sendEmail", { to, subject, body, html: body });

  await db.insert(systemActivityEventsTable).values({
    systemInstanceId,
    eventType: result.ok ? "action" : "error",
    description: result.ok
      ? `Email sent to ${to}: "${subject}"`
      : `Email to ${to} failed: ${(result.error ?? "unknown").slice(0, 150)}`,
    metadata: JSON.stringify({ triggeredBy: "webhook_send_email", to, subject, result: result.data ?? result.error }),
  });

  if (!result.ok) throw new Error(result.error ?? "Email send failed");
  return { ok: true, to, subject };
}

// ─── Main Worker Loop ─────────────────────────────────────────────────────────

async function processJob(): Promise<void> {
  const job = await claimNextJob();
  if (!job) return;

  logger.info({ jobId: job.jobId, jobType: job.jobType, attempt: job.attempt }, "Worker claimed job");

  try {
    const payload = (job.payload ?? {}) as Record<string, unknown>;
    let result: unknown;

    switch (job.jobType) {
      case "connector_test":
        result = await handleConnectorTest(payload);
        break;
      case "system_startup":
        result = await handleSystemStartup(payload);
        break;
      case "health_check":
        result = await handleHealthCheck(payload);
        break;
      case "ash_task":
        result = await handleAshTask(payload);
        break;
      case "send_email":
        result = await handleSendEmail(payload);
        break;
      default:
        throw new Error(`Unknown job type: ${job.jobType}`);
    }

    await completeJob(job.jobId, result);
    logger.info({ jobId: job.jobId, jobType: job.jobType }, "Job completed");
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    await failJob(job.jobId, error, job.attempt, job.maxAttempts);
    logger.warn({ jobId: job.jobId, error, attempt: job.attempt }, "Job failed");

    // Push notification when all retries are exhausted and job has a system owner
    const finalFailure = job.attempt >= job.maxAttempts;
    if (finalFailure && job.systemInstanceId) {
      (async () => {
        try {
          const [instance] = await db
            .select({ userId: systemInstancesTable.userId, name: systemInstancesTable.name })
            .from(systemInstancesTable)
            .where(eq(systemInstancesTable.id, job.systemInstanceId!))
            .limit(1);
          if (!instance) return;
          const [user] = await db
            .select({ expoPushToken: usersTable.expoPushToken, notifyBuild: usersTable.notifyBuild })
            .from(usersTable)
            .where(eq(usersTable.id, instance.userId))
            .limit(1);
          if (user?.notifyBuild && user.expoPushToken) {
            await sendPushNotification(
              user.expoPushToken,
              "⚠️ System Error",
              `${instance.name ?? "Your system"} encountered an error: ${error.slice(0, 100)}`,
              { type: "system_error", systemInstanceId: job.systemInstanceId, jobType: job.jobType },
            );
          }
        } catch { /* non-fatal */ }
      })();
    }
  }
}

async function recoverOrphanedJobs(): Promise<void> {
  const count = await resetOrphanedJobs();
  if (count > 0) {
    logger.warn({ count }, "Reset orphaned active jobs to queued on startup");
  }
}

export function startWorker(): void {
  if (running) return;
  running = true;

  async function loop(): Promise<void> {
    try {
      await processJob();
    } catch (err) {
      logger.error({ err }, "Worker loop error");
    } finally {
      if (running) setTimeout(loop, POLL_INTERVAL_MS);
    }
  }

  // Recover before polling
  recoverOrphanedJobs()
    .then(() => loop())
    .catch((err) => {
      logger.error({ err }, "Worker startup recovery failed");
      loop();
    });

  logger.info({ pollIntervalMs: POLL_INTERVAL_MS }, "Runtime worker started");
}

export function stopWorker(): void {
  running = false;
  logger.info("Runtime worker stopped");
}
