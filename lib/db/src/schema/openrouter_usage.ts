import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { systemInstancesTable } from "./system_instances";

export const openrouterUsageTable = pgTable("openrouter_usage", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  systemInstanceId: integer("system_instance_id").references(() => systemInstancesTable.id),
  model: text("model").notNull(),
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  estimatedCost: numeric("estimated_cost", { precision: 10, scale: 6 }),
  success: text("success").notNull().default("true"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOpenrouterUsageSchema = createInsertSchema(openrouterUsageTable).omit({ id: true, createdAt: true });
export type InsertOpenrouterUsage = z.infer<typeof insertOpenrouterUsageSchema>;
export type OpenrouterUsage = typeof openrouterUsageTable.$inferSelect;
