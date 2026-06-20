import { pgTable, serial, text, integer, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { systemInstancesTable } from "./system_instances";
import { usersTable } from "./users";

export const scheduledTasksTable = pgTable("scheduled_tasks", {
  id: serial("id").primaryKey(),
  systemInstanceId: integer("system_instance_id").notNull().references(() => systemInstancesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  scheduleType: text("schedule_type").notNull(),
  scheduleConfig: jsonb("schedule_config").notNull().$type<Record<string, unknown>>(),
  actionType: text("action_type").notNull().default("connector"),
  actionParams: jsonb("action_params").notNull().$type<Record<string, unknown>>(),
  enabled: boolean("enabled").notNull().default(true),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  lastRunStatus: text("last_run_status"),
  lastRunError: text("last_run_error"),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }),
  failureCount: integer("failure_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("scheduled_tasks_system_instance_id_idx").on(t.systemInstanceId),
  index("scheduled_tasks_user_id_idx").on(t.userId),
  index("scheduled_tasks_next_run_at_enabled_idx").on(t.nextRunAt, t.enabled),
]);

export const insertScheduledTaskSchema = createInsertSchema(scheduledTasksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertScheduledTask = z.infer<typeof insertScheduledTaskSchema>;
export type ScheduledTask = typeof scheduledTasksTable.$inferSelect;
