import { pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { blueprintCategoriesTable } from "./blueprint_categories";
import { usersTable } from "./users";

export const blueprintsTable = pgTable("blueprints", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  categoryId: integer("category_id").references(() => blueprintCategoriesTable.id),
  description: text("description"),
  difficulty: text("difficulty").notNull().default("beginner"),
  estimatedCost: text("estimated_cost"),
  estimatedTime: text("estimated_time"),
  status: text("status").notNull().default("active"),
  version: text("version").notNull().default("1.0"),
  // Marketplace fields
  authorUserId: integer("author_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  priceCredits: integer("price_credits").notNull().default(0),
  source: text("source").notNull().default("admin"),
  reviewStatus: text("review_status").notNull().default("approved"),
  salesCount: integer("sales_count").notNull().default(0),
  ratingAvg: real("rating_avg").notNull().default(0),
  ratingCount: integer("rating_count").notNull().default(0),
  rejectionReason: text("rejection_reason"),
  estimatedEarnings: text("estimated_earnings"),
  requiredTools: text("required_tools"),
  setupSteps: text("setup_steps"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBlueprintSchema = createInsertSchema(blueprintsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBlueprint = z.infer<typeof insertBlueprintSchema>;
export type Blueprint = typeof blueprintsTable.$inferSelect;
