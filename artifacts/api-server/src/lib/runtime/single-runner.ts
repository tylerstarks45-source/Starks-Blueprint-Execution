import { pool } from "@workspace/db";

// Postgres advisory-lock keys for loops that must run on one replica at a time.
// (The job worker does not need one: claimNextJob uses FOR UPDATE SKIP LOCKED.)
export const SCHEDULER_LOCK_KEY = 0x53420001;
export const REVENUE_SYNC_LOCK_KEY = 0x53420002;

/**
 * Runs `fn` only if this process can take the session-level advisory lock `key`;
 * otherwise returns `{ ran: false }` immediately. The lock is held on a dedicated
 * connection for the duration of `fn` and always released afterwards.
 */
export async function runIfLockAcquired<T>(key: number, fn: () => Promise<T>): Promise<{ ran: true; result: T } | { ran: false }> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query<{ ok: boolean }>("SELECT pg_try_advisory_lock($1) AS ok", [key]);
    if (!rows[0]?.ok) return { ran: false };
    try {
      return { ran: true, result: await fn() };
    } finally {
      await client.query("SELECT pg_advisory_unlock($1)", [key]);
    }
  } finally {
    client.release();
  }
}
