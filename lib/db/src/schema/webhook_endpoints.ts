import { pgTable, serial, text, integer, boolean, timestamp, jsonb, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { systemInstancesTable } from "./system_instances";

export const webhookEndpointsTable = pgTable("webhook_endpoints", {
  id: serial("id").primaryKey(),
  systemInstanceId: integer("system_instance_id").notNull().references(() => systemInstancesTable.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  name: text("name").notNull(),
  actionType: text("action_type").notNull().default("log_event"),
  actionConfig: jsonb("action_config").notNull().$type<Record<string, unknown>>().default({}),
  enabled: boolean("enabled").notNull().default(true),
  lastFiredAt: timestamp("last_fired_at", { withTimezone: true }),
  totalFires: integer("total_fires").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("webhook_endpoints_token_unique").on(t.token),
  index("webhook_endpoints_system_instance_id_idx").on(t.systemInstanceId),
  index("webhook_endpoints_token_idx").on(t.token),
]);

export const insertWebhookEndpointSchema = createInsertSchema(webhookEndpointsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWebhookEndpoint = z.infer<typeof insertWebhookEndpointSchema>;
export type WebhookEndpoint = typeof webhookEndpointsTable.$inferSelect;
