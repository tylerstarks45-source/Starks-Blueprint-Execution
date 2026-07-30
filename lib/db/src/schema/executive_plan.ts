import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// ─── Executive Planning Engine (Build 009) ───────────────────────────────────
//
// Plans are structured execution strategies derived from Goals.
// Every future Execution, Reflection, and Learning system depends on this
// schema.  Planning NEVER executes.  Planning NEVER changes Goals or Judgments.
//
// Six tables:
//   executive_plans     — plan model (hierarchical via parent_plan_id)
//   plan_milestones     — milestones within a plan (hierarchical)
//   plan_steps          — ordered work steps within a milestone
//   plan_dependencies   — directed dependency graph across plans/milestones/steps
//   plan_history        — immutable revision / decision / event log
//   plan_metrics        — flexible KV metric readings per plan

export const PLAN_STATUSES = [
  "draft",
  "active",
  "approved",
  "paused",
  "archived",
  "rejected",
] as const;

export const PLANNING_STRATEGIES = [
  "top_down",
  "bottom_up",
  "iterative",
  "agile",
  "waterfall",
] as const;

export const PLAN_DEPENDENCY_TYPES = [
  "requires",   // source cannot start until target is complete
  "blocks",     // source blocks target from starting
  "enables",    // target completion unlocks source
  "related",    // informational soft link
] as const;

export const MILESTONE_STATUSES = [
  "pending",
  "active",
  "completed",
  "skipped",
  "blocked",
] as const;

export const PLAN_EVENT_TYPES = [
  "revision",       // plan content changed
  "decision",       // explicit planning decision recorded
  "alternative",    // an alternative plan was proposed
  "rejection",      // a plan or alternative was rejected
  "approval",       // a plan was approved for execution
  "scoring",        // scoring engine updated scores
] as const;

// ── executive_plans ───────────────────────────────────────────────────────────

export const executivePlansTable = pgTable(
  "executive_plans",
  {
    // ── Identity ──────────────────────────────────────────────────────────
    id: text("id").primaryKey(),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),

    // ── Soft FK to goal (no constraint — allows cross-user graphs in future) ─
    goalId: text("goal_id"),

    // ── Hierarchy (self-referencing) ─────────────────────────────────────
    // Also used for alternative plans: set is_alternative=true and
    // parent_plan_id → the primary plan this is an alternative to.
    parentPlanId: text("parent_plan_id"),

    // ── Plan identity ─────────────────────────────────────────────────────
    name: text("name").notNull(),
    description: text("description"),
    status: text("status").notNull().default("draft"),
    planningStrategy: text("planning_strategy").notNull().default("top_down"),

    // ── Estimates (all from the deterministic planning engine) ────────────
    estimatedDurationDays: real("estimated_duration_days"),
    estimatedComplexity: real("estimated_complexity").notNull().default(50),
    estimatedCost: real("estimated_cost"),
    estimatedRisk: real("estimated_risk").notNull().default(50),
    estimatedConfidence: real("estimated_confidence").notNull().default(50),
    priority: real("priority").notNull().default(50),
    successProbability: real("success_probability").notNull().default(50),

    // ── Composite plan score from the Plan Scoring Engine ─────────────────
    overallScore: real("overall_score").notNull().default(50),
    // 7-dimension breakdown stored for dashboard rendering
    scoreDimensions: jsonb("score_dimensions").notNull().default({})
      .$type<Record<string, number>>(),

    // ── Alternative flag ─────────────────────────────────────────────────
    isAlternative: boolean("is_alternative").notNull().default(false),

    // ── Strategy metadata ─────────────────────────────────────────────────
    assumptions: jsonb("assumptions").notNull().default([]).$type<string[]>(),
    constraintsData: jsonb("constraints_data").notNull().default([]).$type<string[]>(),
    requiredResources: jsonb("required_resources").notNull().default([]).$type<string[]>(),

    // ── Cross-Build soft relationships ────────────────────────────────────
    relatedContextIds: jsonb("related_context_ids").notNull().default([]).$type<string[]>(),
    relatedJudgmentIds: jsonb("related_judgment_ids").notNull().default([]).$type<string[]>(),
    relatedGoalIds: jsonb("related_goal_ids").notNull().default([]).$type<string[]>(),
    relatedArtifactIds: jsonb("related_artifact_ids").notNull().default([]).$type<string[]>(),
    relatedKnowledgeIds: jsonb("related_knowledge_ids").notNull().default([]).$type<string[]>(),

    // ── Versioning ────────────────────────────────────────────────────────
    version: integer("version").notNull().default(1),

    // ── Forward-compatibility ─────────────────────────────────────────────
    metadata: jsonb("metadata").notNull().default({}).$type<Record<string, unknown>>(),

    // ── Timestamps ────────────────────────────────────────────────────────
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("exec_plans_user_id_idx").on(t.userId),
    index("exec_plans_goal_id_idx").on(t.goalId),
    index("exec_plans_status_idx").on(t.status),
    index("exec_plans_parent_plan_idx").on(t.parentPlanId),
    index("exec_plans_score_idx").on(t.overallScore),
    index("exec_plans_is_alternative_idx").on(t.isAlternative),
  ],
);

// ── plan_milestones ───────────────────────────────────────────────────────────
// Hierarchical: unlimited nesting via parent_milestone_id.

export const planMilestonesTable = pgTable(
  "plan_milestones",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id").notNull().references(() => executivePlansTable.id, { onDelete: "cascade" }),
    parentMilestoneId: text("parent_milestone_id"),    // self-ref — no FK to allow re-parenting
    name: text("name").notNull(),
    description: text("description"),
    status: text("status").notNull().default("pending"),
    orderIndex: integer("order_index").notNull().default(0),
    progressPct: real("progress_pct").notNull().default(0),
    estimatedDurationDays: real("estimated_duration_days"),
    // Milestone-level soft dependency list (milestone ids)
    dependencies: jsonb("dependencies").notNull().default([]).$type<string[]>(),
    metadata: jsonb("metadata").notNull().default({}).$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("plan_milestones_plan_id_idx").on(t.planId),
    index("plan_milestones_parent_idx").on(t.parentMilestoneId),
    index("plan_milestones_order_idx").on(t.orderIndex),
  ],
);

// ── plan_steps ────────────────────────────────────────────────────────────────
// Ordered atomic work steps within a milestone.

export const planStepsTable = pgTable(
  "plan_steps",
  {
    id: text("id").primaryKey(),
    milestoneId: text("milestone_id").notNull().references(() => planMilestonesTable.id, { onDelete: "cascade" }),
    planId: text("plan_id").notNull().references(() => executivePlansTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status").notNull().default("pending"),
    orderIndex: integer("order_index").notNull().default(0),
    estimatedEffortHours: real("estimated_effort_hours"),
    requiredCapabilities: jsonb("required_capabilities").notNull().default([]).$type<string[]>(),
    dependsOnStepIds: jsonb("depends_on_step_ids").notNull().default([]).$type<string[]>(),
    assignedBrain: text("assigned_brain"),
    metadata: jsonb("metadata").notNull().default({}).$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("plan_steps_milestone_id_idx").on(t.milestoneId),
    index("plan_steps_plan_id_idx").on(t.planId),
    index("plan_steps_order_idx").on(t.orderIndex),
  ],
);

// ── plan_dependencies ─────────────────────────────────────────────────────────
// Directed graph across plans, milestones, and steps.

export const planDependenciesTable = pgTable(
  "plan_dependencies",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id").notNull(),
    targetId: text("target_id").notNull(),
    sourceType: text("source_type").notNull().default("plan"),   // plan | milestone | step
    dependencyType: text("dependency_type").notNull().default("requires"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("plan_deps_source_idx").on(t.sourceId),
    index("plan_deps_target_idx").on(t.targetId),
    index("plan_deps_source_type_idx").on(t.sourceType),
  ],
);

// ── plan_history ──────────────────────────────────────────────────────────────
// Immutable append-only event log.  Nothing is overwritten.
// Future Reflection and Learning systems depend on this record.

export const planHistoryTable = pgTable(
  "plan_history",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id").notNull().references(() => executivePlansTable.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull().default("revision"),
    version: integer("version").notNull().default(1),
    // Full snapshot of the plan at this point in time
    snapshot: jsonb("snapshot").notNull().default({}).$type<Record<string, unknown>>(),
    note: text("note"),
    decidedBy: text("decided_by"),   // brain id or "user"
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("plan_history_plan_id_idx").on(t.planId),
    index("plan_history_recorded_at_idx").on(t.recordedAt),
    index("plan_history_event_type_idx").on(t.eventType),
  ],
);

// ── plan_metrics ──────────────────────────────────────────────────────────────
// Flexible KV metrics per plan, for trend analysis and completion scoring.

export const planMetricsTable = pgTable(
  "plan_metrics",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id").notNull().references(() => executivePlansTable.id, { onDelete: "cascade" }),
    metricKey: text("metric_key").notNull(),
    metricValue: real("metric_value"),
    unit: text("unit"),
    targetValue: real("target_value"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("plan_metrics_plan_id_idx").on(t.planId),
    index("plan_metrics_key_idx").on(t.metricKey),
  ],
);

// ── Row-level type exports ─────────────────────────────────────────────────────

export type PlanRow = typeof executivePlansTable.$inferSelect;
export type PlanMilestoneRow = typeof planMilestonesTable.$inferSelect;
export type PlanStepRow = typeof planStepsTable.$inferSelect;
export type PlanDependencyRow = typeof planDependenciesTable.$inferSelect;
export type PlanHistoryRow = typeof planHistoryTable.$inferSelect;
export type PlanMetricRow = typeof planMetricsTable.$inferSelect;
