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
import { executivePlansTable } from "./executive_plan";

// ─── Executive Execution Engine (Build 010) ──────────────────────────────────
//
// Executions coordinate, track, and record the execution of approved Plans.
// Execution NEVER modifies Plans, Goals, Judgment, or Context.
// Every execution produces a permanent cognitive artifact available to
// future Observation, Reflection, and Learning systems.
//
// Six tables:
//   executive_executions       — execution model (unlimited hierarchy)
//   execution_steps            — per-step execution tracking
//   execution_history          — immutable append-only event log
//   execution_metrics          — flexible KV metrics per execution
//   execution_recovery_points  — checkpoints for suspend/resume
//   execution_relationships    — directed links between executions and external artifacts

export const EXECUTION_STATUSES = [
  "pending",
  "approved",
  "running",
  "waiting",
  "paused",
  "blocked",
  "retrying",
  "completed",
  "failed",
  "cancelled",
] as const;

export const EXECUTION_EVENT_TYPES = [
  "created",
  "approved",
  "started",
  "paused",
  "resumed",
  "blocked",
  "unblocked",
  "waiting",
  "retrying",
  "completed",
  "failed",
  "cancelled",
  "step_started",
  "step_completed",
  "step_failed",
  "step_skipped",
  "step_retried",
  "recovery_point_created",
  "manual_intervention",
  "adapter_dispatched",
  "adapter_result_received",
] as const;

export const EXECUTION_STEP_STATUSES = [
  "pending",
  "running",
  "paused",
  "completed",
  "failed",
  "skipped",
  "retrying",
  "cancelled",
] as const;

// ── executive_executions ──────────────────────────────────────────────────────
// Core execution model.  Unlimited hierarchy via parent_execution_id.

export const executiveExecutionsTable = pgTable(
  "executive_executions",
  {
    // ── Identity ──────────────────────────────────────────────────────────
    id: text("id").primaryKey(),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),

    // ── Soft FKs (no constraint — allows cross-user and future graph references)
    planId: text("plan_id").references(() => executivePlansTable.id, { onDelete: "set null" }),
    goalId: text("goal_id"),         // soft FK to executive_goals.id
    judgmentId: text("judgment_id"), // soft FK to executive_judgments.id
    contextSnapshotId: text("context_snapshot_id"), // soft FK to executive_contexts.id

    // ── Hierarchy (self-referencing for sub-executions) ────────────────────
    parentExecutionId: text("parent_execution_id"), // soft self-ref for unlimited nesting

    // ── Current position ───────────────────────────────────────────────────
    currentMilestoneId: text("current_milestone_id"), // soft FK to plan_milestones.id
    currentStepId: text("current_step_id"),           // soft FK to plan_steps.id

    // ── State machine ──────────────────────────────────────────────────────
    status: text("status").notNull().default("pending"),
    previousStatus: text("previous_status"), // for transition audit

    // ── Progress ──────────────────────────────────────────────────────────
    progressPct: real("progress_pct").notNull().default(0),
    totalSteps: integer("total_steps").notNull().default(0),
    completedSteps: integer("completed_steps").notNull().default(0),
    failedSteps: integer("failed_steps").notNull().default(0),
    skippedSteps: integer("skipped_steps").notNull().default(0),

    // ── Retry tracking ─────────────────────────────────────────────────────
    retryCount: integer("retry_count").notNull().default(0),
    maxRetries: integer("max_retries").notNull().default(3),

    // ── Outcome ────────────────────────────────────────────────────────────
    success: boolean("success"),
    failureReason: text("failure_reason"),
    cancellationReason: text("cancellation_reason"),

    // ── Timestamps ────────────────────────────────────────────────────────
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    pausedAt: timestamp("paused_at", { withTimezone: true }),
    resumedAt: timestamp("resumed_at", { withTimezone: true }),

    // ── Cross-Build soft relationships (JSONB arrays — same pattern as Plans) ─
    relatedMemoryIds: jsonb("related_memory_ids").notNull().default([]).$type<string[]>(),
    relatedContextIds: jsonb("related_context_ids").notNull().default([]).$type<string[]>(),
    relatedJudgmentIds: jsonb("related_judgment_ids").notNull().default([]).$type<string[]>(),
    relatedPlanIds: jsonb("related_plan_ids").notNull().default([]).$type<string[]>(),
    relatedGoalIds: jsonb("related_goal_ids").notNull().default([]).$type<string[]>(),

    // ── Adapter layer ──────────────────────────────────────────────────────
    // Which adapter type should execute this (interface reference, not instance)
    adapterType: text("adapter_type"),   // e.g. "cognitive_task" | "ai_agent" | "human_approval"
    adapterPayload: jsonb("adapter_payload").notNull().default({}).$type<Record<string, unknown>>(),
    adapterResult: jsonb("adapter_result").notNull().default({}).$type<Record<string, unknown>>(),

    // ── Versioning ─────────────────────────────────────────────────────────
    version: integer("version").notNull().default(1),

    // ── Forward-compatibility ──────────────────────────────────────────────
    metadata: jsonb("metadata").notNull().default({}).$type<Record<string, unknown>>(),

    // ── Timestamps ────────────────────────────────────────────────────────
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("exec_exec_user_id_idx").on(t.userId),
    index("exec_exec_plan_id_idx").on(t.planId),
    index("exec_exec_goal_id_idx").on(t.goalId),
    index("exec_exec_status_idx").on(t.status),
    index("exec_exec_parent_idx").on(t.parentExecutionId),
    index("exec_exec_created_at_idx").on(t.createdAt),
  ],
);

// ── execution_steps ────────────────────────────────────────────────────────────
// Per-step execution tracking — one row per plan_step being executed.

export const executionStepsTable = pgTable(
  "execution_steps",
  {
    id: text("id").primaryKey(),
    executionId: text("execution_id").notNull().references(() => executiveExecutionsTable.id, { onDelete: "cascade" }),
    // Soft FK to plan_steps.id — tracking execution of that plan step
    planStepId: text("plan_step_id"),
    milestoneId: text("milestone_id"),   // soft FK to plan_milestones.id

    name: text("name").notNull(),
    description: text("description"),
    status: text("status").notNull().default("pending"),
    orderIndex: integer("order_index").notNull().default(0),

    // Retry tracking per step
    retryCount: integer("retry_count").notNull().default(0),
    maxRetries: integer("max_retries").notNull().default(3),

    // Outcome
    success: boolean("success"),
    failureReason: text("failure_reason"),
    skippedReason: text("skipped_reason"),  // manual only

    // Adapter for this specific step
    adapterType: text("adapter_type"),
    adapterPayload: jsonb("adapter_payload").notNull().default({}).$type<Record<string, unknown>>(),
    adapterResult: jsonb("adapter_result").notNull().default({}).$type<Record<string, unknown>>(),

    // Timestamps
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    pausedAt: timestamp("paused_at", { withTimezone: true }),

    metadata: jsonb("metadata").notNull().default({}).$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("exec_steps_execution_id_idx").on(t.executionId),
    index("exec_steps_plan_step_id_idx").on(t.planStepId),
    index("exec_steps_status_idx").on(t.status),
    index("exec_steps_order_idx").on(t.orderIndex),
  ],
);

// ── execution_history ─────────────────────────────────────────────────────────
// Immutable append-only event log.  Nothing is ever updated or deleted.
// Future Observation and Reflection depend on this record.

export const executionHistoryTable = pgTable(
  "execution_history",
  {
    id: text("id").primaryKey(),
    executionId: text("execution_id").notNull().references(() => executiveExecutionsTable.id, { onDelete: "cascade" }),
    stepId: text("step_id"),       // null = execution-level event; non-null = step-level event

    eventType: text("event_type").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status"),

    note: text("note"),
    triggeredBy: text("triggered_by"),  // "coordinator" | "user" | "adapter" | brain id
    // Full snapshot at event time (optional — only populated for major transitions)
    snapshot: jsonb("snapshot").notNull().default({}).$type<Record<string, unknown>>(),

    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("exec_history_execution_id_idx").on(t.executionId),
    index("exec_history_event_type_idx").on(t.eventType),
    index("exec_history_recorded_at_idx").on(t.recordedAt),
    index("exec_history_step_id_idx").on(t.stepId),
  ],
);

// ── execution_metrics ─────────────────────────────────────────────────────────
// Flexible KV metrics per execution, for performance and outcome analysis.

export const executionMetricsTable = pgTable(
  "execution_metrics",
  {
    id: text("id").primaryKey(),
    executionId: text("execution_id").notNull().references(() => executiveExecutionsTable.id, { onDelete: "cascade" }),
    stepId: text("step_id"),   // null = execution-level metric

    metricKey: text("metric_key").notNull(),
    metricValue: real("metric_value"),
    unit: text("unit"),
    targetValue: real("target_value"),

    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("exec_metrics_execution_id_idx").on(t.executionId),
    index("exec_metrics_key_idx").on(t.metricKey),
  ],
);

// ── execution_recovery_points ─────────────────────────────────────────────────
// Checkpoints taken during execution, enabling resume from a known-good state.

export const executionRecoveryPointsTable = pgTable(
  "execution_recovery_points",
  {
    id: text("id").primaryKey(),
    executionId: text("execution_id").notNull().references(() => executiveExecutionsTable.id, { onDelete: "cascade" }),

    label: text("label").notNull(),   // human-readable checkpoint name
    description: text("description"),
    // Full execution state snapshot at this recovery point
    stateSnapshot: jsonb("state_snapshot").notNull().default({}).$type<Record<string, unknown>>(),
    // Completed step IDs at time of snapshot, for deterministic resume ordering
    completedStepIds: jsonb("completed_step_ids").notNull().default([]).$type<string[]>(),

    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("exec_recovery_execution_id_idx").on(t.executionId),
    index("exec_recovery_is_active_idx").on(t.isActive),
  ],
);

// ── execution_relationships ────────────────────────────────────────────────────
// Directed typed links between executions and other cognitive artifacts.
// Complements the JSONB soft-relationship arrays on the main executions table
// when a fully typed, queryable graph edge is required.

export const executionRelationshipsTable = pgTable(
  "execution_relationships",
  {
    id: text("id").primaryKey(),
    sourceExecutionId: text("source_execution_id").notNull().references(() => executiveExecutionsTable.id, { onDelete: "cascade" }),
    targetId: text("target_id").notNull(),
    targetType: text("target_type").notNull(),   // "execution" | "plan" | "goal" | "artifact" | "memory"
    relationshipType: text("relationship_type").notNull().default("related"),  // "parent" | "child" | "blocked_by" | "enabled_by" | "related"
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("exec_rel_source_idx").on(t.sourceExecutionId),
    index("exec_rel_target_idx").on(t.targetId),
    index("exec_rel_type_idx").on(t.targetType),
  ],
);

// ── Row-level type exports ─────────────────────────────────────────────────────

export type ExecutionRow = typeof executiveExecutionsTable.$inferSelect;
export type ExecutionStepRow = typeof executionStepsTable.$inferSelect;
export type ExecutionHistoryRow = typeof executionHistoryTable.$inferSelect;
export type ExecutionMetricRow = typeof executionMetricsTable.$inferSelect;
export type ExecutionRecoveryPointRow = typeof executionRecoveryPointsTable.$inferSelect;
export type ExecutionRelationshipRow = typeof executionRelationshipsTable.$inferSelect;
