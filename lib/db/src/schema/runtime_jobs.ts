import { pgTable, serial, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { systemInstancesTable } from "./system_instances";

export const runtimeJobsTable = pgTable("runtime_jobs", {
  id: serial("id").primaryKey(),
  jobId: text("job_id").notNull().unique(),
  systemInstanceId: integer("system_instance_id")
    .references(() => systemInstancesTable.id, { onDelete: "cascade" }),
  jobType: text("job_type").notNull(),
  status: text("status").notNull().default("queued"),
  priority: integer("priority").notNull().default(10),
  payload: jsonb("payload"),
  result: jsonb("result"),
  attempt: integer("attempt").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  error: text("error"),
  // Counts self-healing requeues specifically (distinct from `attempt`,
  // which retryFailedJob() resets to 0 on each requeue so the worker's
  // normal per-run retry/backoff logic re-runs fresh). This field is never
  // reset, so self-healing can bound itself to one requeue per job and
  // escalate to Pending Approval instead of looping forever.
  selfHealRetryCount: integer("self_heal_retry_count").notNull().default(0),
  runAfter: timestamp("run_after", { withTimezone: true }).notNull().defaultNow(),
  queuedAt: timestamp("queued_at", { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (t) => [
  index("runtime_jobs_status_run_after_idx").on(t.status, t.runAfter),
  index("runtime_jobs_instance_id_idx").on(t.systemInstanceId),
]);

export const insertRuntimeJobSchema = createInsertSchema(runtimeJobsTable).omit({
  id: true, queuedAt: true,
});
export type InsertRuntimeJob = z.infer<typeof insertRuntimeJobSchema>;
export type RuntimeJob = typeof runtimeJobsTable.$inferSelect;
