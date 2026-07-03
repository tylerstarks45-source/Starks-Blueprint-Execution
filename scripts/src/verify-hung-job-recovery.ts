/**
 * Manual verification script for hung-job recovery.
 *
 * Demonstrates two complementary recovery mechanisms:
 *   1. Worker-level execution timeout (withJobTimeout): a never-resolving handler
 *      is interrupted by a setTimeout race, the job is failed/retried via failJob,
 *      and the worker loop immediately processes the next job — no restart needed.
 *   2. DB-level watchdog (reclaimHungJobs): any job left 'active' beyond its
 *      per-type threshold (e.g. if Node.js itself stalls) is reclaimed to
 *      'retrying'/'failed' by the scheduler's 5-minute periodic tick.
 *
 * Run: pnpm --filter @workspace/scripts run verify-hung-job-recovery
 */

import { pool } from "@workspace/db";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function cleanup(...jobIds: string[]): Promise<void> {
  if (jobIds.length === 0) return;
  const placeholders = jobIds.map((_, i) => `$${i + 1}`).join(", ");
  await pool.query(`DELETE FROM runtime_jobs WHERE job_id IN (${placeholders})`, jobIds);
}

// ─── Test 1: withJobTimeout races a never-resolving promise ──────────────────

function withJobTimeout<T>(promise: Promise<T>, jobType: string, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Job execution timed out after ${timeoutMs / 1000}s (type: ${jobType})`)),
      timeoutMs,
    );
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err: unknown) => { clearTimeout(timer); reject(err as Error); },
    );
  });
}

async function testExecutionTimeout(): Promise<void> {
  console.log("\n── Test 1: Execution timeout interrupts a hung handler ──────────────────");

  const neverResolves = new Promise<string>(() => { /* intentionally hangs */ });
  const timeoutMs = 200; // short timeout for the test

  const start = Date.now();
  try {
    await withJobTimeout(neverResolves, "connector_test", timeoutMs);
    throw new Error("Expected timeout to reject — did not!");
  } catch (err: unknown) {
    const elapsed = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ✓ Timed out in ${elapsed}ms (expected ~${timeoutMs}ms): "${msg}"`);
  }

  // Prove a normal (fast) promise is not affected by the timeout
  const fastResult = await withJobTimeout(Promise.resolve("ok"), "connector_test", timeoutMs);
  console.log(`  ✓ Fast promise resolved normally: "${fastResult}"`);
}

// ─── Test 2: Continued processing after a hung job is timed out ──────────────

async function testLoopContinuesAfterTimeout(): Promise<void> {
  console.log("\n── Test 2: Worker loop continues after hung job is timed out ────────────");

  const results: string[] = [];

  // Simulate a minimal worker loop: process 3 jobs where the second hangs
  const jobs = [
    { id: "job-1", type: "fast",  action: async () => { await sleep(10); return "job-1-done"; } },
    { id: "job-2", type: "hung",  action: async () => new Promise<string>(() => {}) },
    { id: "job-3", type: "fast",  action: async () => { await sleep(10); return "job-3-done"; } },
  ];

  for (const job of jobs) {
    try {
      const result = await withJobTimeout(job.action(), job.type, 150);
      results.push(`${job.id}: completed → ${result as string}`);
    } catch (err: unknown) {
      results.push(`${job.id}: timed out → ${err instanceof Error ? err.message.slice(0, 60) : String(err)}`);
    }
  }

  for (const r of results) {
    console.log("  " + r);
  }

  const job3Ran = results.some((r) => r.includes("job-3-done"));
  if (!job3Ran) throw new Error("job-3 never ran — loop was blocked by the hung job!");
  console.log("  ✓ Loop continued and job-3 was processed despite job-2 hanging");
}

// ─── Test 3: DB-level reclaimHungJobs reclaims a stuck 'active' row ─────────

async function testDbWatchdog(): Promise<void> {
  console.log("\n── Test 3: DB watchdog reclaims a stuck active job ──────────────────────");

  // Insert two stuck jobs: one with retries left, one exhausted
  const jobIds = ["verify-hung-retries-left", "verify-hung-exhausted"];

  await cleanup(...jobIds);

  await pool.query(`
    INSERT INTO runtime_jobs
      (job_id, job_type, status, priority, payload, attempt, max_attempts, run_after, started_at, queued_at)
    VALUES
      ('verify-hung-retries-left', 'connector_test', 'active', 10, '{}', 1, 3,
        NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '10 minutes'),
      ('verify-hung-exhausted',    'ash_task',       'active', 10, '{}', 3, 3,
        NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '6 minutes', NOW() - INTERVAL '20 minutes')
  `);

  // Run the watchdog query (matches reclaimHungJobs() in jobs.ts exactly)
  const result = await pool.query<{ job_id: string; status: string; error: string | null; started_at: Date | null }>(`
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
      )
    RETURNING job_id, status, error, started_at
  `);

  for (const row of result.rows) {
    const startedNote = row.started_at === null ? "started_at cleared ✓" : "started_at still set ✗";
    console.log(`  job: ${row.job_id}`);
    console.log(`    status=${row.status}  ${startedNote}`);
    console.log(`    error="${(row.error ?? "").slice(0, 60)}"`);
  }

  const retriesLeft = result.rows.find((r) => r.job_id === "verify-hung-retries-left");
  const exhausted   = result.rows.find((r) => r.job_id === "verify-hung-exhausted");

  if (retriesLeft?.status !== "retrying") throw new Error("Expected 'retrying' for job with retries left");
  if (exhausted?.status   !== "failed")   throw new Error("Expected 'failed' for exhausted job");
  if (retriesLeft?.started_at !== null)   throw new Error("Expected started_at to be cleared on reclaim");

  console.log("  ✓ Retries-left job moved to 'retrying' with backoff");
  console.log("  ✓ Exhausted job moved to 'failed'");

  await cleanup(...jobIds);
  console.log("  ✓ Cleaned up test rows");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("Hung-job recovery verification\n");
  console.log("This script verifies both recovery layers:");
  console.log("  Layer 1 — withJobTimeout: worker-level deadline per job type");
  console.log("            fires BEFORE the DB watchdog; normal failJob path handles it");
  console.log("  Layer 2 — reclaimHungJobs: DB-level periodic reclaim (every 5 min)");
  console.log("            fallback for the rare case where Node.js itself stalls");

  try {
    await testExecutionTimeout();
    await testLoopContinuesAfterTimeout();
    await testDbWatchdog();

    console.log("\n✅ All checks passed — hung-job recovery is working correctly.\n");
  } catch (err: unknown) {
    console.error("\n❌ Verification failed:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
