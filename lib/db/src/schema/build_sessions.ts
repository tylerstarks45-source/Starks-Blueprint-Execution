import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { systemInstancesTable } from "./system_instances";

export const buildSessionsTable = pgTable("build_sessions", {
  id: serial("id").primaryKey(),
  systemInstanceId: integer("system_instance_id").notNull().references(() => systemInstancesTable.id),
  status: text("status").notNull().default("active"),
  currentStepNumber: integer("current_step_number").notNull().default(1),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBuildSessionSchema = createInsertSchema(buildSessionsTable).omit({ id: true, startedAt: true, updatedAt: true });
export type InsertBuildSession = z.infer<typeof insertBuildSessionSchema>;
export type BuildSession = typeof buildSessionsTable.$inferSelect;
