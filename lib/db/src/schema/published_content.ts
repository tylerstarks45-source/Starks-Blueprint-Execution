import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { systemInstancesTable } from "./system_instances";

export const publishedContentTable = pgTable("published_content", {
  id: serial("id").primaryKey(),
  systemInstanceId: integer("system_instance_id").notNull().references(() => systemInstancesTable.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(),
  contentType: text("content_type").notNull().default("post"),
  title: text("title"),
  content: text("content").notNull(),
  publishedUrl: text("published_url"),
  status: text("status").notNull().default("pending"),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").notNull().default(0),
  credentialKey: text("credential_key"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("published_content_system_instance_id_idx").on(t.systemInstanceId),
  index("published_content_status_idx").on(t.status),
  index("published_content_created_at_idx").on(t.createdAt),
]);

export const insertPublishedContentSchema = createInsertSchema(publishedContentTable).omit({ id: true, createdAt: true });
export type InsertPublishedContent = z.infer<typeof insertPublishedContentSchema>;
export type PublishedContent = typeof publishedContentTable.$inferSelect;
