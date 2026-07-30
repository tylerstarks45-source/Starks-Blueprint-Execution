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

// ─── Executive Observation Engine (Build 011) ─────────────────────────────────
//
// Observation is the Cognitive Nervous System of ASH.
// Every cognitive subsystem publishes events; Observation transforms them into
// structured executive awareness.  Observations are IMMUTABLE — nothing is ever
// updated or deleted.  Future Reflection and Learning only consume Observations;
// they never consume raw events.
//
// Eight tables:
//   executive_observations      — core observation record (immutable)
//   observation_chains          — named cognitive timelines
//   observation_chain_members   — junction: observation ↔ chain
//   observation_signals         — cognitive signals derived from observations
//   observation_trends          — detected trend records
//   observation_anomalies       — detected anomaly records
//   observation_correlations    — correlation graph edges
//   observation_metrics         — KV metrics per observation window

// ── Enumeration constants ─────────────────────────────────────────────────────

export const OBSERVATION_SEVERITIES = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
] as const;

export const OBSERVATION_SIGNAL_TYPES = [
  "success",
  "failure",
  "opportunity",
  "risk",
  "progress",
  "regression",
  "conflict",
  "delay",
  "bottleneck",
  "novelty",
  "trend",
  "unknown",
] as const;

export const OBSERVATION_EVENT_CATEGORIES = [
  "execution",
  "planning",
  "goal",
  "judgment",
  "context",
  "memory",
  "knowledge",
  "reasoning",
  "system",
  "user",
] as const;

export const TREND_TYPES = [
  "repeated_failures",
  "increasing_success",
  "growing_latency",
  "improving_completion",
  "execution_velocity",
  "goal_completion_velocity",
  "planning_frequency",
  "retry_escalation",
] as const;

export const ANOMALY_TYPES = [
  "unexpected_failure",
  "missing_event",
  "repeated_retries",
  "execution_loop",
  "stalled_progress",
  "impossible_transition",
  "orphaned_execution",
] as const;

export const CORRELATION_TYPES = [
  "same_goal",
  "same_plan",
  "same_execution",
  "same_user_request",
  "time_window",
  "shared_resource",
  "shared_object",
] as const;

// ── executive_observations ─────────────────────────────────────────────────────
// Core observation record — append-only (never updated, never deleted).

export const executiveObservationsTable = pgTable(
  "executive_observations",
  {
    // ── Identity ──────────────────────────────────────────────────────────
    id: text("id").primaryKey(),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),

    // ── Source ────────────────────────────────────────────────────────────
    sourceSystem: text("source_system").notNull(),   // "execution" | "planning" | "goal" | ...
    sourceObjectId: text("source_object_id"),         // FK to the originating record
    sourceObjectType: text("source_object_type"),     // type discriminator

    // ── Event ─────────────────────────────────────────────────────────────
    eventType: text("event_type").notNull(),          // raw event type string
    eventCategory: text("event_category").notNull(),  // high-level category
    severity: text("severity").notNull().default("info"),

    // ── Attention ─────────────────────────────────────────────────────────
    attentionScore: real("attention_score").notNull().default(0),
    attentionDimensions: jsonb("attention_dimensions").notNull().default({})
      .$type<Record<string, number>>(),

    // ── Signal ────────────────────────────────────────────────────────────
    signalType: text("signal_type").notNull().default("unknown"),

    // ── State snapshot ────────────────────────────────────────────────────
    observedState: text("observed_state"),   // current state at time of observation
    previousState: text("previous_state"),   // state before this event (for transition observations)

    // ── Correlation ────────────────────────────────────────────────────────
    // The chain this observation belongs to (derived from correlation logic).
    chainId: text("chain_id"),   // soft FK to observation_chains.id

    // ── Cross-Build soft relationships ─────────────────────────────────────
    relatedGoalId: text("related_goal_id"),
    relatedPlanId: text("related_plan_id"),
    relatedExecutionId: text("related_execution_id"),
    relatedContextId: text("related_context_id"),
    relatedJudgmentId: text("related_judgment_id"),
    relatedMemoryId: text("related_memory_id"),
    relatedKnowledgeId: text("related_knowledge_id"),
    relatedUserRequestId: text("related_user_request_id"),

    // ── Payload ────────────────────────────────────────────────────────────
    payload: jsonb("payload").notNull().default({}).$type<Record<string, unknown>>(),

    // ── Versioning & forward-compat ────────────────────────────────────────
    version: integer("version").notNull().default(1),
    metadata: jsonb("metadata").notNull().default({}).$type<Record<string, unknown>>(),

    // ── Timestamp (immutable — set once at creation) ───────────────────────
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("obs_user_id_idx").on(t.userId),
    index("obs_source_system_idx").on(t.sourceSystem),
    index("obs_event_category_idx").on(t.eventCategory),
    index("obs_severity_idx").on(t.severity),
    index("obs_attention_score_idx").on(t.attentionScore),
    index("obs_signal_type_idx").on(t.signalType),
    index("obs_chain_id_idx").on(t.chainId),
    index("obs_observed_at_idx").on(t.observedAt),
    index("obs_related_execution_idx").on(t.relatedExecutionId),
    index("obs_related_goal_idx").on(t.relatedGoalId),
    index("obs_related_plan_idx").on(t.relatedPlanId),
  ],
);

// ── observation_chains ─────────────────────────────────────────────────────────
// Named cognitive timelines — a chain links all observations for a single
// goal/plan/execution lifecycle in chronological order.

export const observationChainsTable = pgTable(
  "observation_chains",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    description: text("description"),

    // Anchor object — the thing being observed through this chain
    anchorObjectId: text("anchor_object_id"),
    anchorObjectType: text("anchor_object_type"),   // "goal" | "plan" | "execution" | "user_request"

    observationCount: integer("observation_count").notNull().default(0),
    firstObservedAt: timestamp("first_observed_at", { withTimezone: true }),
    lastObservedAt: timestamp("last_observed_at", { withTimezone: true }),

    // Aggregate signals present in this chain
    signalTypes: jsonb("signal_types").notNull().default([]).$type<string[]>(),
    maxSeverity: text("max_severity").notNull().default("info"),
    maxAttentionScore: real("max_attention_score").notNull().default(0),

    isActive: boolean("is_active").notNull().default(true),
    metadata: jsonb("metadata").notNull().default({}).$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("obs_chain_user_id_idx").on(t.userId),
    index("obs_chain_anchor_idx").on(t.anchorObjectId),
    index("obs_chain_max_attention_idx").on(t.maxAttentionScore),
    index("obs_chain_is_active_idx").on(t.isActive),
  ],
);

// ── observation_chain_members ──────────────────────────────────────────────────
// Junction table — one observation may belong to multiple chains.

export const observationChainMembersTable = pgTable(
  "observation_chain_members",
  {
    id: text("id").primaryKey(),
    chainId: text("chain_id").notNull().references(() => observationChainsTable.id, { onDelete: "cascade" }),
    observationId: text("observation_id").notNull().references(() => executiveObservationsTable.id, { onDelete: "cascade" }),
    positionInChain: integer("position_in_chain").notNull().default(0),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("obs_chain_member_chain_idx").on(t.chainId),
    index("obs_chain_member_obs_idx").on(t.observationId),
    index("obs_chain_member_position_idx").on(t.positionInChain),
  ],
);

// ── observation_signals ────────────────────────────────────────────────────────
// Cognitive signals derived from observations.  Immutable once created.

export const observationSignalsTable = pgTable(
  "observation_signals",
  {
    id: text("id").primaryKey(),
    observationId: text("observation_id").notNull().references(() => executiveObservationsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),

    signalType: text("signal_type").notNull(),
    strength: real("strength").notNull().default(0.5),   // 0.0 → 1.0
    description: text("description"),

    // Cross-build references (same as observation soft-FKs)
    relatedGoalId: text("related_goal_id"),
    relatedPlanId: text("related_plan_id"),
    relatedExecutionId: text("related_execution_id"),

    // Signals NEVER contain recommendations (architectural rule)
    payload: jsonb("payload").notNull().default({}).$type<Record<string, unknown>>(),
    emittedAt: timestamp("emitted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("obs_signal_obs_id_idx").on(t.observationId),
    index("obs_signal_user_id_idx").on(t.userId),
    index("obs_signal_type_idx").on(t.signalType),
    index("obs_signal_strength_idx").on(t.strength),
    index("obs_signal_emitted_at_idx").on(t.emittedAt),
  ],
);

// ── observation_trends ─────────────────────────────────────────────────────────

export const observationTrendsTable = pgTable(
  "observation_trends",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),

    trendType: text("trend_type").notNull(),
    direction: text("direction").notNull().default("neutral"),  // "up" | "down" | "neutral" | "volatile"
    magnitude: real("magnitude").notNull().default(0),           // 0.0 → 1.0

    windowStartAt: timestamp("window_start_at", { withTimezone: true }).notNull(),
    windowEndAt: timestamp("window_end_at", { withTimezone: true }).notNull(),

    sampleCount: integer("sample_count").notNull().default(0),
    description: text("description"),
    evidence: jsonb("evidence").notNull().default([]).$type<Record<string, unknown>[]>(),

    // Anchor
    anchorObjectId: text("anchor_object_id"),
    anchorObjectType: text("anchor_object_type"),

    detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("obs_trend_user_id_idx").on(t.userId),
    index("obs_trend_type_idx").on(t.trendType),
    index("obs_trend_direction_idx").on(t.direction),
    index("obs_trend_detected_at_idx").on(t.detectedAt),
  ],
);

// ── observation_anomalies ──────────────────────────────────────────────────────

export const observationAnomaliesTable = pgTable(
  "observation_anomalies",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),

    anomalyType: text("anomaly_type").notNull(),
    severity: text("severity").notNull().default("medium"),
    description: text("description").notNull(),

    // The object that exhibited the anomaly
    sourceObjectId: text("source_object_id"),
    sourceObjectType: text("source_object_type"),

    // Raw evidence collected
    evidence: jsonb("evidence").notNull().default([]).$type<Record<string, unknown>[]>(),

    // Anomaly never fixes itself — this is for reporting only
    isResolved: boolean("is_resolved").notNull().default(false),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),

    detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("obs_anomaly_user_id_idx").on(t.userId),
    index("obs_anomaly_type_idx").on(t.anomalyType),
    index("obs_anomaly_severity_idx").on(t.severity),
    index("obs_anomaly_source_idx").on(t.sourceObjectId),
    index("obs_anomaly_detected_at_idx").on(t.detectedAt),
  ],
);

// ── observation_correlations ───────────────────────────────────────────────────
// Directed graph of correlated observations.

export const observationCorrelationsTable = pgTable(
  "observation_correlations",
  {
    id: text("id").primaryKey(),
    sourceObservationId: text("source_observation_id").notNull().references(() => executiveObservationsTable.id, { onDelete: "cascade" }),
    targetObservationId: text("target_observation_id").notNull().references(() => executiveObservationsTable.id, { onDelete: "cascade" }),
    correlationType: text("correlation_type").notNull().default("same_execution"),
    strength: real("strength").notNull().default(1.0),   // 0.0 → 1.0
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("obs_corr_source_idx").on(t.sourceObservationId),
    index("obs_corr_target_idx").on(t.targetObservationId),
    index("obs_corr_type_idx").on(t.correlationType),
  ],
);

// ── observation_metrics ────────────────────────────────────────────────────────
// KV metrics per observation window for trend analysis.

export const observationMetricsTable = pgTable(
  "observation_metrics",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
    metricKey: text("metric_key").notNull(),
    metricValue: real("metric_value"),
    windowLabel: text("window_label"),   // e.g. "2026-07-30T09:00:00Z/PT1H"
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("obs_metrics_user_id_idx").on(t.userId),
    index("obs_metrics_key_idx").on(t.metricKey),
    index("obs_metrics_recorded_at_idx").on(t.recordedAt),
  ],
);

// ── Row-level type exports ─────────────────────────────────────────────────────

export type ObservationRow = typeof executiveObservationsTable.$inferSelect;
export type ObservationChainRow = typeof observationChainsTable.$inferSelect;
export type ObservationChainMemberRow = typeof observationChainMembersTable.$inferSelect;
export type ObservationSignalRow = typeof observationSignalsTable.$inferSelect;
export type ObservationTrendRow = typeof observationTrendsTable.$inferSelect;
export type ObservationAnomalyRow = typeof observationAnomaliesTable.$inferSelect;
export type ObservationCorrelationRow = typeof observationCorrelationsTable.$inferSelect;
export type ObservationMetricRow = typeof observationMetricsTable.$inferSelect;
