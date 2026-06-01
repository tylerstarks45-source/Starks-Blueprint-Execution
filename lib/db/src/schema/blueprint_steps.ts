import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { blueprintsTable } from "./blueprints";

export const blueprintStepsTable = pgTable("blueprint_steps", {
  id: serial("id").primaryKey(),
  blueprintId: integer("blueprint_id").notNull().references(() => blueprintsTable.id),
  stepNumber: integer("step_number").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  actionType: text("action_type").notNull().default("manual"),
  config: text("config"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBlueprintStepSchema = createInsertSchema(blueprintStepsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBlueprintStep = z.infer<typeof insertBlueprintStepSchema>;
export type BlueprintStep = typeof blueprintStepsTable.$inferSelect;
