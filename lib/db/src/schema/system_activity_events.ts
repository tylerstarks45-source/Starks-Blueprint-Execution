import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSystemActivityEventSchema = createInsertSchema(systemActivityEventsTable).omit({ id: true, createdAt: true });
export type InsertSystemActivityEvent = z.infer<typeof insertSystemActivityEventSchema>;
export type SystemActivityEvent = typeof systemActivityEventsTable.$inferSelect;
