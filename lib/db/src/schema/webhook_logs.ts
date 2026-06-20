import { pgTable, serial, integer, timestamp, jsonb, text, index } from "drizzle-orm/pg-core";
import { webhookEndpointsTable } from "./webhook_endpoints";

export const webhookLogsTable = pgTable("webhook_logs", {
  id: serial("id").primaryKey(),
  endpointId: integer("endpoint_id").notNull().references(() => webhookEndpointsTable.id, { onDelete: "cascade" }),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  payload: jsonb("payload").$type<Record<string, unknown>>(),
  responseStatus: integer("response_status").notNull().default(200),
  responseBody: text("response_body"),
  processingMs: integer("processing_ms"),
  error: text("error"),
}, (t) => [
  index("webhook_logs_endpoint_id_idx").on(t.endpointId),
  index("webhook_logs_received_at_idx").on(t.receivedAt),
]);

export type WebhookLog = typeof webhookLogsTable.$inferSelect;
