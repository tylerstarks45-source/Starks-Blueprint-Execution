import { pgTable, serial, text, integer, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const userAffiliateLinksTable = pgTable("user_affiliate_links", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  cloakedSlug: text("cloaked_slug").notNull(),
  description: text("description"),
  category: text("category"),
  clickCount: integer("click_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex("user_affiliate_links_slug_idx").on(t.cloakedSlug),
  index("user_affiliate_links_user_id_idx").on(t.userId),
]);

export type UserAffiliateLink = typeof userAffiliateLinksTable.$inferSelect;
export type InsertUserAffiliateLink = typeof userAffiliateLinksTable.$inferInsert;
