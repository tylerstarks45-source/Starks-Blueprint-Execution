import { pgTable, serial, integer, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { systemInstancesTable } from "./system_instances";
import { businessesTable } from "./businesses";

// Interim shared log sink for continuous-monitoring and self-healing
// actions, modeled after `system_activity_events`. Once the Logging Center
// (separate task) formalizes a unified schema, this table's rows should be
// migrated there and writers switched over. Until then this is the single
// place every health recompute / self-heal attempt is recorded, for either a
// system instance or a business (or both, when a business is backed by one).
export const MONITORING_EVENT_TYPES = ["health_check", "self_heal", "escalated"] as const;
export type MonitoringEventType = (typeof MONITORING_EVENT_TYPES)[number];

export const MONITORING_EVENT_STATUSES = ["success", "failed", "skipped", "escalated"] as const;
export type MonitoringEventStatus = (typeof MONITORING_EVENT_STATUSES)[number];

export const monitoringLogEventsTable = pgTable("monitoring_log_events", {
  id: serial("id").primaryKey(),
  systemInstanceId: integer("system_instance_id").references(() => systemInstancesTable.id, { onDelete: "cascade" }),
  businessId: integer("business_id").references(() => businessesTable.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull().default("health_check"),
  action: text("action"),
  status: text("status").notNull().default("success"),
  message: text("message").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("monitoring_log_events_system_instance_id_idx").on(t.systemInstanceId),
  index("monitoring_log_events_business_id_idx").on(t.businessId),
  index("monitoring_log_events_created_at_idx").on(t.createdAt),
]);

export const insertMonitoringLogEventSchema = createInsertSchema(monitoringLogEventsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertMonitoringLogEvent = z.infer<typeof insertMonitoringLogEventSchema>;
export type MonitoringLogEvent = typeof monitoringLogEventsTable.$inferSelect;
