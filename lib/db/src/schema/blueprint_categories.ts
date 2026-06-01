import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const blueprintCategoriesTable = pgTable("blueprint_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBlueprintCategorySchema = createInsertSchema(blueprintCategoriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBlueprintCategory = z.infer<typeof insertBlueprintCategorySchema>;
export type BlueprintCategory = typeof blueprintCategoriesTable.$inferSelect;
