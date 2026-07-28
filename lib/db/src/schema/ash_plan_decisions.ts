import { pgTable, serial, integer, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ashProjectsTable, ashTasksTable } from "./executive_brain";

// ─── ASH Brain v2.0 — Decision Engine audit log (Phase 1.3) ────────────────
// One row per "should we execute this task, and how" evaluation, made right
// before a task is handed to the existing AI Orchestrator. Durable so a
// project's plan-adaptation history (retries, escalations, path changes) can
// be inspected later — this is the record Plan Adaptation reasons over.

export const ASH_DECISIONS = ["proceed", "hold", "escalate"] as const;
export type AshDecision = (typeof ASH_DECISIONS)[number];

export const ashPlanDecisionsTable = pgTable(
  "ash_plan_decisions",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id").notNull().references(() => ashProjectsTable.id, { onDelete: "cascade" }),
    taskId: integer("task_id").references(() => ashTasksTable.id, { onDelete: "cascade" }),
    decision: text("decision").notNull().default("proceed"),
    goalAlignmentScore: integer("goal_alignment_score").notNull().default(50), // 0-100
    confidenceScore: integer("confidence_score").notNull().default(50), // 0-100
    riskLevel: text("risk_level").notNull().default("low"), // low | medium | high
    risks: jsonb("risks").notNull().default([]),
    requiredResources: jsonb("required_resources").notNull().default([]),
    selectedPath: text("selected_path"),
    reasoning: text("reasoning"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ash_plan_decisions_project_id_idx").on(t.projectId),
    index("ash_plan_decisions_task_id_idx").on(t.taskId),
  ],
);

export const insertAshPlanDecisionSchema = createInsertSchema(ashPlanDecisionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAshPlanDecision = z.infer<typeof insertAshPlanDecisionSchema>;
export type AshPlanDecision = typeof ashPlanDecisionsTable.$inferSelect;
