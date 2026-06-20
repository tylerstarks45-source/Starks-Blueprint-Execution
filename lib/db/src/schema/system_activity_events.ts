import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { systemInstancesTable } from "./system_instances";

export const systemActivityEventsTable = pgTable("system_activity_events", {
  id: serial("id").primaryKey(),
  systemInstanceId: integer("system_instance_id").notNull().references(() => systemInstancesTable.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull().default("action"),
  amountCents: integer("amount_cents"),
  description: text("description").notNull(),
  metadata: text("metadata"),
  externalTxId: text("external_tx_id"),
  revenueProvider: text("revenue_provider"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("system_activity_events_system_instance_id_idx").on(t.systemInstanceId),
  index("system_activity_events_created_at_idx").on(t.createdAt),
  index("system_activity_events_external_tx_id_idx").on(t.externalTxId),
]);

export const insertSystemActivityEventSchema = createInsertSchema(systemActivityEventsTable).omit({ id: true, createdAt: true });
export type InsertSystemActivityEvent = z.infer<typeof insertSystemActivityEventSchema>;
export type SystemActivityEvent = typeof systemActivityEventsTable.$inferSelect;
