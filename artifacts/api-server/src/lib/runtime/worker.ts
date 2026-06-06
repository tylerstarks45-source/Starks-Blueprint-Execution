import { claimNextJob, completeJob, failJob, upsertConnectorStatus, resetOrphanedJobs } from "./jobs";
import { getConnector } from "../connectors/registry";
import { db, systemInstancesTable, userCredentialsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { decrypt } from "../crypto";
import { logger } from "../logger";

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
      default:
        throw new Error(`Unknown job type: ${job.jobType}`);
    }

    await completeJob(job.jobId, result);
    logger.info({ jobId: job.jobId, jobType: job.jobType }, "Job completed");
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    await failJob(job.jobId, error, job.attempt, job.maxAttempts);
    logger.warn({ jobId: job.jobId, error, attempt: job.attempt }, "Job failed");
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
