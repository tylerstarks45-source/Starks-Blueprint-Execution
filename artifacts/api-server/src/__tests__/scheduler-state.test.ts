import { describe, it, expect, afterAll } from "vitest";
import { pool } from "@workspace/db";
import { __schedulerStateForTests as state } from "../lib/runtime/scheduler";

const KEY = `test:scheduler-state:${process.pid}`;

describe("scheduler state reload", () => {
  afterAll(async () => {
    await pool.query("DELETE FROM scheduler_state WHERE task_key = $1", [KEY]);
  });

  it("does not roll a newer local run back to an older stored timestamp", async () => {
    await state.ensureSchedulerStateTable();
    const now = Date.now();
    await state.setState(KEY, now);
    // Simulate the write having failed: the DB still holds an older value.
    await pool.query("UPDATE scheduler_state SET last_run_at = $2 WHERE task_key = $1", [KEY, new Date(now - 7 * 864e5)]);
    await state.loadSchedulerState();
    expect(state.getState(KEY)).toBe(now);
  });

  it("adopts a newer timestamp written by another replica", async () => {
    const later = Date.now() + 60_000;
    await pool.query("UPDATE scheduler_state SET last_run_at = $2 WHERE task_key = $1", [KEY, new Date(later)]);
    await state.loadSchedulerState();
    expect(state.getState(KEY)).toBe(later);
  });
});
