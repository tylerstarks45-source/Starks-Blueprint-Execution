import { pgTable, serial, integer, text, numeric, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { systemInstancesTable } from "./system_instances";

export const creditUsageEventsTable = pgTable("credit_usage_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  systemInstanceId: integer("system_instance_id").references(() => systemInstancesTable.id, { onDelete: "set null" }),
  sessionId: text("session_id"),
  eventType: text("event_type").notNull(), // 'ai_call' | 'browser_action' | 'tool_execution' | 'workflow_generation' | 'blueprint_generation'
  creditsConsumed: integer("credits_consumed").notNull().default(0),
  tokensUsed: integer("tokens_used").default(0),
  openrouterCost: numeric("openrouter_cost", { precision: 10, scale: 6 }),
  model: text("model"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("credit_usage_events_user_id_idx").on(t.userId),
  index("credit_usage_events_system_id_idx").on(t.systemInstanceId),
  index("credit_usage_events_created_at_idx").on(t.createdAt),
  index("credit_usage_events_event_type_idx").on(t.eventType),
]);

export const insertCreditUsageEventSchema = createInsertSchema(creditUsageEventsTable).omit({ id: true, createdAt: true });
export type InsertCreditUsageEvent = z.infer<typeof insertCreditUsageEventSchema>;
export type CreditUsageEvent = typeof creditUsageEventsTable.$inferSelect;
