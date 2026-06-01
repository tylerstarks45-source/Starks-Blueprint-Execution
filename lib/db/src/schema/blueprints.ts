import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { blueprintCategoriesTable } from "./blueprint_categories";

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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBlueprintSchema = createInsertSchema(blueprintsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBlueprint = z.infer<typeof insertBlueprintSchema>;
export type Blueprint = typeof blueprintsTable.$inferSelect;
