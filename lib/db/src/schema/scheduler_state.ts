import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Runtime scheduler "last ran at" per sub-task (artifacts/api-server/src/lib/runtime/scheduler.ts).
// Declared here so drizzle-kit treats the table as tracked instead of offering to drop it.
export const schedulerStateTable = pgTable("scheduler_state", {
  taskKey: text("task_key").primaryKey(),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }).notNull().defaultNow(),
});
