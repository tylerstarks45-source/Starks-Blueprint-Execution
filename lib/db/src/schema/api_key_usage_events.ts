import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { apiKeysTable } from "./api_keys";
import { usersTable } from "./users";

export const apiKeyUsageEventsTable = pgTable("api_key_usage_events", {
  id: serial("id").primaryKey(),
  apiKeyId: integer("api_key_id").notNull().references(() => apiKeysTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull().default("POST"),
  statusCode: integer("status_code").notNull().default(200),
  responseTimeMs: integer("response_time_ms"),
  tokenUsage: integer("token_usage").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("api_key_usage_events_api_key_id_idx").on(t.apiKeyId),
  index("api_key_usage_events_user_id_idx").on(t.userId),
  index("api_key_usage_events_created_at_idx").on(t.createdAt),
]);

export const insertApiKeyUsageEventSchema = createInsertSchema(apiKeyUsageEventsTable).omit({ id: true, createdAt: true });
export type InsertApiKeyUsageEvent = z.infer<typeof insertApiKeyUsageEventSchema>;
export type ApiKeyUsageEvent = typeof apiKeyUsageEventsTable.$inferSelect;
