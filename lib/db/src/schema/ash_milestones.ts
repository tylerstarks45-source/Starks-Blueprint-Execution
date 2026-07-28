import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ashProjectsTable, ashGoalsTable } from "./executive_brain";

// ─── ASH Brain v2.0 — Planning & Decision Engine (Phase 1.3) ───────────────
// A milestone is a generated checkpoint within a project's plan (e.g.
// "Phase 1: Store setup", "Phase 2: Launch marketing"). Tasks (ash_tasks)
// optionally point at one via the new milestoneId column. Kept as its own
// table rather than new ash_projects columns so a project can have many
// milestones without denormalizing the project row.

export const ASH_MILESTONE_STATUSES = ["pending", "active", "completed", "blocked"] as const;
export type AshMilestoneStatus = (typeof ASH_MILESTONE_STATUSES)[number];

export const ashMilestonesTable = pgTable(
  "ash_milestones",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id").notNull().references(() => ashProjectsTable.id, { onDelete: "cascade" }),
    goalId: integer("goal_id").references(() => ashGoalsTable.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description"),
    phase: text("phase"),
    orderIndex: integer("order_index").notNull().default(0),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    index("ash_milestones_project_id_idx").on(t.projectId),
    index("ash_milestones_project_id_order_idx").on(t.projectId, t.orderIndex),
  ],
);

export const insertAshMilestoneSchema = createInsertSchema(ashMilestonesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAshMilestone = z.infer<typeof insertAshMilestoneSchema>;
export type AshMilestone = typeof ashMilestonesTable.$inferSelect;
