import {
  pgTable,
  text,
  integer,
  real,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// ─── Executive Goal Engine (Build 008) ───────────────────────────────────────
//
// Goals are the permanent purpose layer of the ASH Cognitive Operating System.
// Every future Planning, Execution, Reflection and Learning system depends on
// this schema.
//
// Four tables:
//   executive_goals         — the goal model (hierarchical via parent_goal_id)
//   goal_dependencies       — directed dependency graph (blocks/enables/requires)
//   goal_progress_history   — immutable time-series progress snapshots
//   goal_metrics            — flexible per-goal KV metric records

// ── Goal types and categories ─────────────────────────────────────────────────
export const GOAL_TYPES = ["strategic", "operational", "milestone", "constraint", "exploratory"] as const;
export const GOAL_CATEGORIES = ["growth", "product", "operations", "team", "financial", "risk", "custom"] as const;
export const GOAL_STATUSES = ["not_started", "active", "blocked", "paused", "completed", "cancelled"] as const;
export const GOAL_DEPENDENCY_TYPES = ["blocks", "enables", "requires", "related"] as const;

// ── executive_goals ───────────────────────────────────────────────────────────

export const executiveGoalsTable = pgTable(
  "executive_goals",
  {
    // ── Identity ──────────────────────────────────────────────────────────
    id: text("id").primaryKey(),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),

    // ── Hierarchy (self-referencing) ─────────────────────────────────────
    // No FK constraint on parent_goal_id to allow cross-user goal graphs in
    // future and to avoid cascading complications. Integrity enforced in the
    // service layer.
    parentGoalId: text("parent_goal_id"),

    // ── Goal identity ─────────────────────────────────────────────────────
    name: text("name").notNull(),
    description: text("description"),
    goalType: text("goal_type").notNull().default("operational"),
    category: text("category").notNull().default("custom"),

    // ── Lifecycle ────────────────────────────────────────────────────────
    status: text("status").notNull().default("not_started"),
    version: integer("version").notNull().default(1),

    // ── Priority dimensions (all 0–100) ───────────────────────────────────
    // Stored individually so the priority engine can be replayed, and so
    // dashboards can filter/sort without unpacking JSONB.
    importance: real("importance").notNull().default(50),
    urgency: real("urgency").notNull().default(50),
    strategicValue: real("strategic_value").notNull().default(50),
    risk: real("risk").notNull().default(50),       // higher risk → lower priority (inverted)
    opportunity: real("opportunity").notNull().default(50),
    confidence: real("confidence").notNull().default(50),
    // Computed weighted composite (recomputed whenever dimensions change)
    priorityScore: real("priority_score").notNull().default(50),

    // ── Progress ─────────────────────────────────────────────────────────
    progressPct: real("progress_pct").notNull().default(0),

    // ── Brain ownership ───────────────────────────────────────────────────
    ownerBrain: text("owner_brain"),

    // ── Criteria and constraints ──────────────────────────────────────────
    successCriteria: jsonb("success_criteria").notNull().default([]).$type<string[]>(),
    failureCriteria: jsonb("failure_criteria").notNull().default([]).$type<string[]>(),
    constraintsData: jsonb("constraints_data").notNull().default([]).$type<string[]>(),
    metricsDefinition: jsonb("metrics_definition").notNull().default({}).$type<Record<string, { unit?: string; target?: number; current?: number }>>(),

    // ── Cross-Build relationships (soft links — no FK constraints) ────────
    // Build 006: context snapshots that informed this goal
    relatedContextIds: jsonb("related_context_ids").notNull().default([]).$type<string[]>(),
    // Build 007: judgment IDs that recommended or scored this goal
    relatedJudgmentIds: jsonb("related_judgment_ids").notNull().default([]).$type<string[]>(),
    // Build 004: cognitive artifact IDs associated with this goal
    relatedArtifactIds: jsonb("related_artifact_ids").notNull().default([]).$type<string[]>(),
    // Build 005: knowledge cluster IDs supporting this goal
    relatedClusterIds: jsonb("related_cluster_ids").notNull().default([]).$type<string[]>(),
    // Soft links to related goals (supplementary — formal deps use goal_dependencies)
    relatedGoalIds: jsonb("related_goal_ids").notNull().default([]).$type<string[]>(),

    // ── Dates ─────────────────────────────────────────────────────────────
    targetDate: timestamp("target_date", { withTimezone: true }),
    completionDate: timestamp("completion_date", { withTimezone: true }),

    // ── Forward-compatibility ─────────────────────────────────────────────
    metadata: jsonb("metadata").notNull().default({}).$type<Record<string, unknown>>(),

    // ── Timestamps ───────────────────────────────────────────────────────
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    index("exec_goals_user_id_idx").on(t.userId),
    index("exec_goals_parent_idx").on(t.parentGoalId),
    index("exec_goals_status_idx").on(t.status),
    index("exec_goals_priority_idx").on(t.priorityScore),
    index("exec_goals_owner_brain_idx").on(t.ownerBrain),
    index("exec_goals_target_date_idx").on(t.targetDate),
  ],
);

// ── goal_dependencies ─────────────────────────────────────────────────────────
// Directed graph: goal_id depends on / relates to depends_on_goal_id.
// The conflict engine uses this graph to detect cycles.

export const goalDependenciesTable = pgTable(
  "goal_dependencies",
  {
    id: text("id").primaryKey(),
    goalId: text("goal_id").notNull().references(() => executiveGoalsTable.id, { onDelete: "cascade" }),
    dependsOnGoalId: text("depends_on_goal_id").notNull().references(() => executiveGoalsTable.id, { onDelete: "cascade" }),
    // blocks: goalId cannot progress until dependsOnGoalId is done
    // enables: dependsOnGoalId unlocks goalId
    // requires: goalId needs dependsOnGoalId as a precondition
    // related: informational link only
    dependencyType: text("dependency_type").notNull().default("requires"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("goal_deps_goal_id_idx").on(t.goalId),
    index("goal_deps_depends_on_idx").on(t.dependsOnGoalId),
  ],
);

// ── goal_progress_history ─────────────────────────────────────────────────────
// Immutable time-series. One row per update. Never deleted, only appended.
// Future Planning and Reflection systems read this for velocity / trend analysis.

export const goalProgressHistoryTable = pgTable(
  "goal_progress_history",
  {
    id: text("id").primaryKey(),
    goalId: text("goal_id").notNull().references(() => executiveGoalsTable.id, { onDelete: "cascade" }),
    progressPct: real("progress_pct").notNull(),
    status: text("status").notNull(),
    note: text("note"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("goal_progress_goal_id_idx").on(t.goalId),
    index("goal_progress_recorded_at_idx").on(t.recordedAt),
  ],
);

// ── goal_metrics ──────────────────────────────────────────────────────────────
// Flexible KV metrics attached to goals. Each row is one metric reading.
// Future systems can aggregate these for trend analysis and completion scoring.

export const goalMetricsTable = pgTable(
  "goal_metrics",
  {
    id: text("id").primaryKey(),
    goalId: text("goal_id").notNull().references(() => executiveGoalsTable.id, { onDelete: "cascade" }),
    metricKey: text("metric_key").notNull(),
    metricValue: real("metric_value"),
    unit: text("unit"),
    targetValue: real("target_value"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("goal_metrics_goal_id_idx").on(t.goalId),
    index("goal_metrics_key_idx").on(t.metricKey),
  ],
);

export type GoalRow = typeof executiveGoalsTable.$inferSelect;
export type GoalDependencyRow = typeof goalDependenciesTable.$inferSelect;
export type GoalProgressHistoryRow = typeof goalProgressHistoryTable.$inferSelect;
export type GoalMetricRow = typeof goalMetricsTable.$inferSelect;
