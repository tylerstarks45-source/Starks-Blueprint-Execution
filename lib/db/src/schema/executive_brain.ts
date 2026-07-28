import { pgTable, serial, integer, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { systemInstancesTable } from "./system_instances";

// ─── ASH Brain v2.0 — Executive Brain Foundation (Phase 1.1) ───────────────
// Additive layer that sits ABOVE the existing AI Orchestrator / OpenRouter
// pipeline. It never replaces them — it decides *what* the orchestrator
// should work on next (which project, which goal, which task) before
// handing off to the existing execution pipeline unchanged.
//
// Naming note: this is unrelated to `ash_lessons.ts` ("ASH brain" = the
// SQL-distillation lessons engine). Kept as separate tables/modules to avoid
// colliding with that existing concept.

export const ASH_PROJECT_STATUSES = ["active", "paused", "completed", "archived"] as const;
export type AshProjectStatus = (typeof ASH_PROJECT_STATUSES)[number];

export const ashProjectsTable = pgTable(
  "ash_projects",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    // Linked once a real buildable system exists for this project. Nullable
    // because a project can exist purely at the planning stage.
    systemInstanceId: integer("system_instance_id").references(() => systemInstancesTable.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    status: text("status").notNull().default("active"),
    objective: text("objective"),
    currentPhase: text("current_phase"),
    // Denormalized pointer to the task currently being worked (plain int, no
    // FK — ash_tasks references this project, avoiding a circular constraint).
    currentTaskId: integer("current_task_id"),
    businessType: text("business_type"),
    revenueGoal: text("revenue_goal"),
    connectedServices: jsonb("connected_services").notNull().default([]),
    aiToolStack: jsonb("ai_tool_stack").notNull().default([]),
    // 0-100
    progress: integer("progress").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    index("ash_projects_user_id_idx").on(t.userId),
    index("ash_projects_user_id_status_idx").on(t.userId, t.status),
    index("ash_projects_system_instance_id_idx").on(t.systemInstanceId),
  ],
);

export const insertAshProjectSchema = createInsertSchema(ashProjectsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAshProject = z.infer<typeof insertAshProjectSchema>;
export type AshProject = typeof ashProjectsTable.$inferSelect;

export const ASH_GOAL_PRIORITIES = ["low", "medium", "high", "critical"] as const;
export type AshGoalPriority = (typeof ASH_GOAL_PRIORITIES)[number];

export const ASH_GOAL_STATUSES = ["pending", "active", "completed", "blocked"] as const;
export type AshGoalStatus = (typeof ASH_GOAL_STATUSES)[number];

export const ashGoalsTable = pgTable(
  "ash_goals",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id").notNull().references(() => ashProjectsTable.id, { onDelete: "cascade" }),
    goalText: text("goal_text").notNull(),
    priority: text("priority").notNull().default("medium"),
    status: text("status").notNull().default("pending"),
    // Array of other ash_goals.id this goal depends on.
    dependencies: jsonb("dependencies").notNull().default([]),
    estimatedCompletion: text("estimated_completion"),
    completionCriteria: text("completion_criteria"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    index("ash_goals_project_id_idx").on(t.projectId),
    index("ash_goals_project_id_status_idx").on(t.projectId, t.status),
  ],
);

export const insertAshGoalSchema = createInsertSchema(ashGoalsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAshGoal = z.infer<typeof insertAshGoalSchema>;
export type AshGoal = typeof ashGoalsTable.$inferSelect;

export const ASH_TASK_PRIORITIES = ["low", "medium", "high", "critical"] as const;
export type AshTaskPriority = (typeof ASH_TASK_PRIORITIES)[number];

export const ASH_TASK_STATUSES = ["pending", "in_progress", "completed", "failed", "blocked"] as const;
export type AshTaskStatus = (typeof ASH_TASK_STATUSES)[number];

// Which existing execution surface a task is handed off to. Purely
// descriptive/routing metadata — does not change how that engine works.
export const ASH_TASK_ENGINES = [
  "ai_orchestrator",
  "build_engine",
  "browser_agent",
  "media_gen",
  "research",
  "runtime_job",
  "manual",
] as const;
export type AshTaskEngine = (typeof ASH_TASK_ENGINES)[number];

export const ashTasksTable = pgTable(
  "ash_tasks",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id").notNull().references(() => ashProjectsTable.id, { onDelete: "cascade" }),
    goalId: integer("goal_id").references(() => ashGoalsTable.id, { onDelete: "set null" }),
    // Nullable FK added in Phase 1.3 (Planning & Decision Engine) — a task
    // may belong to a generated milestone/phase, or exist standalone
    // (short/simple requests still get a task with no milestone, as before).
    milestoneId: integer("milestone_id"),
    description: text("description").notNull(),
    status: text("status").notNull().default("pending"),
    priority: text("priority").notNull().default("medium"),
    assignedEngine: text("assigned_engine").notNull().default("ai_orchestrator"),
    // Array of other ash_tasks.id this task depends on.
    dependencies: jsonb("dependencies").notNull().default([]),
    result: jsonb("result"),
    // ── Phase 1.3 — Planning & Decision Engine scoring/tracking fields ──
    // All nullable/defaulted so every existing row and every Phase 1.1/1.2
    // write path (which never sets these) keeps working unchanged.
    priorityScore: integer("priority_score").notNull().default(50), // 0-100, numeric complement to `priority`
    complexityScore: integer("complexity_score").notNull().default(50), // 0-100
    dependencyScore: integer("dependency_score").notNull().default(0), // 0-100, higher = more tasks depend on this one
    estimatedDurationMinutes: integer("estimated_duration_minutes"),
    executionOrder: integer("execution_order"),
    // Why a task is currently "blocked" (validation failure) — distinct from
    // simply waiting on an incomplete dependency, which is derived, not stored.
    blockedReason: text("blocked_reason"),
    attempts: integer("attempts").notNull().default(0),
    lastFailureReason: text("last_failure_reason"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    index("ash_tasks_project_id_idx").on(t.projectId),
    index("ash_tasks_project_id_status_idx").on(t.projectId, t.status),
    index("ash_tasks_goal_id_idx").on(t.goalId),
    index("ash_tasks_milestone_id_idx").on(t.milestoneId),
  ],
);

export const insertAshTaskSchema = createInsertSchema(ashTasksTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAshTask = z.infer<typeof insertAshTaskSchema>;
export type AshTask = typeof ashTasksTable.$inferSelect;
