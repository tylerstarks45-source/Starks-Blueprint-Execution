import { pgTable, serial, text, boolean, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  notificationType: text("notification_type").notNull().default("info"),
  // Optional deep-link the notification bell navigates to (e.g. "/wallet",
  // "/connections", "/business/12") so a paused-automation alert can carry a
  // one-click path to fix it.
  linkUrl: text("link_url"),
  // Optional stable key used to avoid re-notifying about the same ongoing
  // condition (e.g. "credits_paused") while an earlier notification is still
  // unread — see notifyUser() in lib/notify.ts.
  dedupeKey: text("dedupe_key"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("notifications_user_id_idx").on(t.userId),
  index("notifications_user_id_read_idx").on(t.userId, t.read),
  index("notifications_user_id_dedupe_key_idx").on(t.userId, t.dedupeKey),
]);

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;
