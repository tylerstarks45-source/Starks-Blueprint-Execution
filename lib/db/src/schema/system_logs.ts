import { pgTable, serial, integer, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { systemInstancesTable } from "./system_instances";
import { businessesTable } from "./businesses";
import { usersTable } from "./users";

// Unified logging center. Every meaningful event across builds, deploys,
// automation, browser activity, connections, hosting, API calls, errors,
// recovery actions, and maintenance/optimization work is recorded here via the
// shared `logEvent()` helper. Rows are scoped to a system instance and/or a
// business (and, when derivable, an owning user for the admin-wide view).
export const LOG_CATEGORIES = [
  "build",
  "deploy",
  "automation",
  "browser",
  "connection",
  "hosting",
  "api",
  "error",
  "recovery",
  "maintenance",
  "optimization",
  "scaling",
] as const;
export type LogCategory = (typeof LOG_CATEGORIES)[number];

export const LOG_SEVERITIES = ["info", "warning", "error", "critical"] as const;
export type LogSeverity = (typeof LOG_SEVERITIES)[number];

export const systemLogsTable = pgTable("system_logs", {
  id: serial("id").primaryKey(),
  systemInstanceId: integer("system_instance_id").references(() => systemInstancesTable.id, { onDelete: "cascade" }),
  businessId: integer("business_id").references(() => businessesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  category: text("category").notNull().default("automation"),
  severity: text("severity").notNull().default("info"),
  component: text("component"),
  action: text("action"),
  message: text("message").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("system_logs_system_instance_id_created_at_idx").on(t.systemInstanceId, t.createdAt),
  index("system_logs_business_id_created_at_idx").on(t.businessId, t.createdAt),
  index("system_logs_user_id_created_at_idx").on(t.userId, t.createdAt),
  index("system_logs_created_at_idx").on(t.createdAt),
  index("system_logs_severity_idx").on(t.severity),
  index("system_logs_category_idx").on(t.category),
]);

export const insertSystemLogSchema = createInsertSchema(systemLogsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertSystemLog = z.infer<typeof insertSystemLogSchema>;
export type SystemLog = typeof systemLogsTable.$inferSelect;
