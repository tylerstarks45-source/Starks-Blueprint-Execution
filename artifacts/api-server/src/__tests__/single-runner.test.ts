import { describe, it, expect, afterAll } from "vitest";
import { pool } from "@workspace/db";
import { runIfLockAcquired } from "../lib/runtime/single-runner";

const KEY = 0x5342ff01;

describe("runIfLockAcquired", () => {
  afterAll(async () => {
    await pool.query("SELECT pg_advisory_unlock_all()");
  });

  it("runs only one of two concurrent callers", async () => {
    let calls = 0;
    const slow = async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 150));
      return "done";
    };
    const [a, b] = await Promise.all([runIfLockAcquired(KEY, slow), runIfLockAcquired(KEY, slow)]);
    expect(calls).toBe(1);
    expect([a.ran, b.ran].sort()).toEqual([false, true]);
  });

  it("skips while another connection (another replica) holds the lock", async () => {
    const other = await pool.connect();
    try {
      await other.query("SELECT pg_advisory_lock($1)", [KEY]);
      const res = await runIfLockAcquired(KEY, async () => "ran");
      expect(res.ran).toBe(false);
      await other.query("SELECT pg_advisory_unlock($1)", [KEY]);
      const after = await runIfLockAcquired(KEY, async () => "ran");
      expect(after).toEqual({ ran: true, result: "ran" });
    } finally {
      other.release();
    }
  });

  it("releases the lock when the task throws", async () => {
    await expect(runIfLockAcquired(KEY, async () => { throw new Error("boom"); })).rejects.toThrow("boom");
    const next = await runIfLockAcquired(KEY, async () => 1);
    expect(next.ran).toBe(true);
  });
});
