import { pgTable, serial, text, integer, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { systemInstancesTable } from "./system_instances";

export const landingPagesTable = pgTable("landing_pages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  systemInstanceId: integer("system_instance_id").references(() => systemInstancesTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  htmlContent: text("html_content").notNull().default(""),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  isPublished: boolean("is_published").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  pageViews: integer("page_views").notNull().default(0),
  customDomain: text("custom_domain"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex("landing_pages_slug_idx").on(t.slug),
  index("landing_pages_user_id_idx").on(t.userId),
]);

export type LandingPage = typeof landingPagesTable.$inferSelect;
export type InsertLandingPage = typeof landingPagesTable.$inferInsert;
