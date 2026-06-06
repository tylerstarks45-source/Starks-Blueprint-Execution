import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { buildSessionsTable } from "./build_sessions";
import { blueprintStepsTable } from "./blueprint_steps";

export const buildProgressTable = pgTable("build_progress", {
  id: serial("id").primaryKey(),
  buildSessionId: integer("build_session_id").notNull().references(() => buildSessionsTable.id, { onDelete: "cascade" }),
  stepId: integer("step_id").references(() => blueprintStepsTable.id),
  stepNumber: integer("step_number").notNull(),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("build_progress_build_session_id_idx").on(t.buildSessionId),
]);

export const insertBuildProgressSchema = createInsertSchema(buildProgressTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBuildProgress = z.infer<typeof insertBuildProgressSchema>;
export type BuildProgress = typeof buildProgressTable.$inferSelect;
