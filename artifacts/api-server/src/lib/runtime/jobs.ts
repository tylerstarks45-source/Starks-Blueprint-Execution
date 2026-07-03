import { randomUUID } from "crypto";
import { pool, db, runtimeJobsTable, systemConnectorsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { logger } from "../logger";

export type JobType =
  | "connector_test"
  | "system_startup"
  | "health_check"
  | "system_shutdown"
  | "scheduled_task"
  | "ash_task"
  | "send_email"
  | "media_gen_video"
  | "media_gen_audio"
  | "business_health_analysis"
  | "business_improvement_pass";

export type JobStatus = "queued" | "active" | "completed" | "failed" | "retrying" | "cancelled";

export interface JobPayload {
  systemInstanceId?: number;
  connectorId?: string;
  credentials?: Record<string, string>;
  [key: string]: unknown;
}

export interface RuntimeJob {
  id: number;
  jobId: string;
  systemInstanceId: number | null;
  jobType: string;
  status: string;
  priority: number;
  payload: JobPayload | null;
  result: unknown;
  attempt: number;
  maxAttempts: number;
  error: string | null;
  runAfter: Date;
  queuedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

export async function enqueue(
  jobType: JobType,
  payload: JobPayload,
  opts: { priority?: number; runAfterMs?: number; maxAttempts?: number; systemInstanceId?: number | null } = {},
): Promise<string> {
  const jobId = randomUUID();
  const runAfter = new Date(Date.now() + (opts.runAfterMs ?? 0));

  await db.insert(runtimeJobsTable).values({
    jobId,
    systemInstanceId: opts.systemInstanceId ?? payload.systemInstanceId ?? null,
    jobType,
    status: "queued",
    priority: opts.priority ?? 10,
    payload: payload as Record<string, unknown>,
    attempt: 0,
    maxAttempts: opts.maxAttempts ?? 3,
    runAfter,
  });

  logger.debug({ jobId, jobType, systemInstanceId: opts.systemInstanceId }, "Job enqueued");
  return jobId;
}

// Map a raw PostgreSQL snake_case row to our camelCase RuntimeJob interface.
function mapRow(row: Record<string, unknown>): RuntimeJob {
  return {
    id: row["id"] as number,
    jobId: row["job_id"] as string,
    systemInstanceId: row["system_instance_id"] as number | null,
    jobType: row["job_type"] as string,
    status: row["status"] as string,
    priority: row["priority"] as number,
    payload: row["payload"] as JobPayload | null,
    result: row["result"],
    attempt: row["attempt"] as number,
    maxAttempts: row["max_attempts"] as number,
    error: row["error"] as string | null,
    runAfter: row["run_after"] as Date,
    queuedAt: row["queued_at"] as Date,
    startedAt: row["started_at"] as Date | null,
    completedAt: row["completed_at"] as Date | null,
  };
}

// Claim the next available job atomically using SKIP LOCKED.
// This prevents multiple workers from picking the same job.
export async function claimNextJob(): Promise<RuntimeJob | null> {
  const result = await pool.query(`
    UPDATE runtime_jobs
    SET status = 'active',
        started_at = NOW(),
        attempt = attempt + 1
    WHERE id = (
      SELECT id FROM runtime_jobs
      WHERE status IN ('queued', 'retrying')
        AND run_after <= NOW()
      ORDER BY priority ASC, queued_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `);
  const raw = result.rows[0];
  return raw ? mapRow(raw) : null;
}

export async function completeJob(jobId: string, result: unknown): Promise<void> {
  await pool.query(
    `UPDATE runtime_jobs SET status = 'completed', result = $1, completed_at = NOW() WHERE job_id = $2`,
    [JSON.stringify(result), jobId],
  );
}

export async function failJob(jobId: string, error: string, attempt: number, maxAttempts: number): Promise<void> {
  if (attempt >= maxAttempts) {
    await pool.query(
      `UPDATE runtime_jobs SET status = 'failed', error = $1, completed_at = NOW() WHERE job_id = $2`,
      [error, jobId],
    );
    logger.warn({ jobId, attempt, maxAttempts }, "Job permanently failed");
  } else {
    // Exponential backoff: 30s × 2^attempt
    const backoffMs = 30_000 * Math.pow(2, attempt - 1);
    await pool.query(
      `UPDATE runtime_jobs SET status = 'retrying', error = $1, run_after = NOW() + $2 * INTERVAL '1 millisecond' WHERE job_id = $3`,
      [error, backoffMs, jobId],
    );
    logger.info({ jobId, attempt, maxAttempts, backoffMs }, "Job scheduled for retry");
  }
}

export async function cancelSystemJobs(systemInstanceId: number): Promise<void> {
  await db
    .update(runtimeJobsTable)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(runtimeJobsTable.systemInstanceId, systemInstanceId),
        inArray(runtimeJobsTable.status, ["queued", "retrying"] as string[]),
      ),
    );
}

export async function getJobsBySystem(systemInstanceId: number, limit = 50) {
  return db
    .select()
    .from(runtimeJobsTable)
    .where(eq(runtimeJobsTable.systemInstanceId, systemInstanceId))
    .limit(limit);
}

// Reset orphaned "active" jobs left by a previous crashed process.
// Safe to call at startup — the old process is already gone.
export async function resetOrphanedJobs(): Promise<number> {
  // Standard worker jobs (now including media_gen_audio, which runs as a real
  // queued worker job — Task #283): reset active → queued so the worker picks
  // them up again after a crash/restart. Only media_gen_video is excluded.
  const workerResult = await pool.query(`
    UPDATE runtime_jobs
    SET status = 'queued', started_at = NULL
    WHERE status = 'active'
      AND job_type != 'media_gen_video'
  `);

  // HeyGen / Runway video jobs have external provider-side job IDs stored in
  // their payload. They remain 'active' so the next client poll can resume
  // status from the provider without losing the providerJobId.

  return workerResult.rowCount ?? 0;
}

// ─── Hung-job watchdog ────────────────────────────────────────────────────────
// Finds jobs that have been in 'active' status longer than their per-type
// timeout (indicating the handler hung indefinitely) and reclaims them:
//   • attempt < max_attempts → status = 'retrying' with exponential backoff
//   • attempt >= max_attempts → status = 'failed'
// media_gen_* jobs are intentionally excluded — they run outside the worker
// loop and have their own polling/status-recovery paths.

export interface ReclaimResult {
  reclaimed: number;
  finalFailed: number;
}

export async function reclaimHungJobs(): Promise<ReclaimResult> {
  const result = await pool.query<{ job_id: string; status: string }>(`
    UPDATE runtime_jobs
    SET
      status       = CASE WHEN attempt >= max_attempts THEN 'failed'   ELSE 'retrying' END,
      error        = 'Watchdog: job exceeded its per-type timeout and was automatically reclaimed',
      completed_at = CASE WHEN attempt >= max_attempts THEN NOW()      ELSE NULL END,
      started_at   = NULL,
      run_after    = CASE
                       WHEN attempt >= max_attempts THEN run_after
                       ELSE NOW() + make_interval(secs => 30.0 * POWER(2.0, GREATEST(attempt - 1, 0)))
                     END
    WHERE status = 'active'
      AND started_at IS NOT NULL
      AND (
        (job_type IN ('connector_test', 'system_startup', 'send_email')
          AND started_at < NOW() - INTERVAL '2 minutes')
        OR (job_type IN ('health_check', 'ash_task')
          AND started_at < NOW() - INTERVAL '5 minutes')
        OR (job_type IN ('scheduled_task', 'business_health_analysis', 'business_improvement_pass')
          AND started_at < NOW() - INTERVAL '10 minutes')
        OR (job_type = 'media_gen_audio'
          AND started_at < NOW() - INTERVAL '5 minutes')
      )
    RETURNING job_id, status
  `);

  const rows = result.rows;
  const finalFailed = rows.filter((r) => r.status === "failed").length;
  const reclaimed = rows.length - finalFailed;
  return { reclaimed, finalFailed };
}

export async function getJobById(jobId: string) {
  const [job] = await db
    .select()
    .from(runtimeJobsTable)
    .where(eq(runtimeJobsTable.jobId, jobId))
    .limit(1);
  return job ?? null;
}

export async function upsertConnectorStatus(
  systemInstanceId: number,
  connectorId: string,
  status: string,
  errorMessage?: string | null,
): Promise<void> {
  const existing = await db
    .select({ id: systemConnectorsTable.id })
    .from(systemConnectorsTable)
    .where(
      and(
        eq(systemConnectorsTable.systemInstanceId, systemInstanceId),
        eq(systemConnectorsTable.connector, connectorId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(systemConnectorsTable)
      .set({ status, lastTestedAt: new Date(), errorMessage: errorMessage ?? null })
      .where(
        and(
          eq(systemConnectorsTable.systemInstanceId, systemInstanceId),
          eq(systemConnectorsTable.connector, connectorId),
        ),
      );
  } else {
    await db.insert(systemConnectorsTable).values({
      systemInstanceId,
      connector: connectorId,
      status,
      lastTestedAt: new Date(),
      errorMessage: errorMessage ?? null,
    });
  }
}
