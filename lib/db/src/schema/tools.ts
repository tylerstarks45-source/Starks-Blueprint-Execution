import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { toolCategoriesTable } from "./tool_categories";

export const toolsTable = pgTable("tools", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => toolCategoriesTable.id),
  name: text("name").notNull(),
  description: text("description"),
  affiliateLink: text("affiliate_link"),
  signupUrl: text("signup_url"),
  pricing: text("pricing"),
  requiredCredentials: text("required_credentials").array(),
  oauthRequired: boolean("oauth_required").notNull().default(false),
  activeStatus: boolean("active_status").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertToolSchema = createInsertSchema(toolsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTool = z.infer<typeof insertToolSchema>;
export type Tool = typeof toolsTable.$inferSelect;
