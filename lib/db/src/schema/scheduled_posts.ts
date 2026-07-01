import { pgTable, serial, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { systemInstancesTable } from "./system_instances";

export const SOCIAL_PLATFORMS = ["twitter", "linkedin", "instagram", "tiktok", "facebook"] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const SOCIAL_POST_STATUSES = ["draft", "scheduled", "publishing", "published", "failed"] as const;
export type SocialPostStatus = (typeof SOCIAL_POST_STATUSES)[number];

export const scheduledPostsTable = pgTable("scheduled_posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  systemInstanceId: integer("system_instance_id").references(() => systemInstancesTable.id, { onDelete: "set null" }),
  platform: text("platform").notNull(),
  content: text("content").notNull(),
  mediaUrls: jsonb("media_urls").notNull().default([]).$type<string[]>(),
  linkUrl: text("link_url"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  status: text("status").notNull().default("scheduled"),
  platformPostId: text("platform_post_id"),
  publishedUrl: text("published_url"),
  errorMessage: text("error_message"),
  clickCount: integer("click_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("scheduled_posts_status_scheduled_at_idx").on(t.status, t.scheduledAt),
  index("scheduled_posts_user_id_idx").on(t.userId),
  index("scheduled_posts_system_instance_id_idx").on(t.systemInstanceId),
]);

export const insertScheduledPostSchema = createInsertSchema(scheduledPostsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertScheduledPost = z.infer<typeof insertScheduledPostSchema>;
export type ScheduledPost = typeof scheduledPostsTable.$inferSelect;
