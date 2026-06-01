import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { systemInstancesTable } from "./system_instances";
import { toolsTable } from "./tools";

export const userToolSelectionsTable = pgTable("user_tool_selections", {
  id: serial("id").primaryKey(),
  systemInstanceId: integer("system_instance_id").notNull().references(() => systemInstancesTable.id),
  toolId: integer("tool_id").notNull().references(() => toolsTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserToolSelectionSchema = createInsertSchema(userToolSelectionsTable).omit({ id: true, createdAt: true });
export type InsertUserToolSelection = z.infer<typeof insertUserToolSelectionSchema>;
export type UserToolSelection = typeof userToolSelectionsTable.$inferSelect;
