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

// ─── Executive Reflection Engine (Build 012) ─────────────────────────────────
//
// Reflection is ASH's Executive Review System.
// Observation records reality.  Reflection EXPLAINS reality.
//
// All records are IMMUTABLE after closure / creation.
// Reflection NEVER changes plans, goals, executions, or memory.
//
// Eight tables:
//   executive_cases         — complete cognitive episode (immutable after closure)
//   case_members            — objects that belong to a case
//   case_timelines          — decision timeline events (append-only)
//   reflection_reports      — immutable reflection report
//   reflection_factors      — factor records with influence scores
//   reflection_scores       — quality dimension scores
//   reflection_evidence     — evidence items linked to a reflection
//   reflection_metrics      — KV metrics per case/reflection

// ── executive_cases ────────────────────────────────────────────────────────────
// A case represents one complete cognitive episode.
// Immutable after closedAt is set.

export const executiveCasesTable = pgTable(
  "executive_cases",
  {
    // ── Identity ──────────────────────────────────────────────────────────
    id: text("id").primaryKey(),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),

    // ── Origin ────────────────────────────────────────────────────────────
    rootRequest: text("root_request"),               // original user message
    businessDomain: text("business_domain"),
    strategicCategory: text("strategic_category"),

    // ── Linked cognitive objects (soft FKs) ──────────────────────────────
    primaryGoalId: text("primary_goal_id"),
    primaryPlanId: text("primary_plan_id"),
    primaryExecutionId: text("primary_execution_id"),
    primaryChainId: text("primary_chain_id"),       // observation chain

    // ── Timeline ──────────────────────────────────────────────────────────
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationMs: integer("duration_ms"),

    // ── Outcome ────────────────────────────────────────────────────────────
    completionStatus: text("completion_status").notNull().default("in_progress"),
    // "in_progress" | "completed" | "failed" | "partial" | "abandoned"
    primaryOutcome: text("primary_outcome"),         // one-sentence summary

    // ── Closure (immutable after set) ─────────────────────────────────────
    closedAt: timestamp("closed_at", { withTimezone: true }),
    isClosed: boolean("is_closed").notNull().default(false),

    // ── Reflection linkage ─────────────────────────────────────────────────
    reflectionReportId: text("reflection_report_id"),  // populated after reflection

    version: integer("version").notNull().default(1),
    metadata: jsonb("metadata").notNull().default({}).$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ec_user_id_idx").on(t.userId),
    index("ec_completion_status_idx").on(t.completionStatus),
    index("ec_primary_execution_idx").on(t.primaryExecutionId),
    index("ec_primary_goal_idx").on(t.primaryGoalId),
    index("ec_primary_chain_idx").on(t.primaryChainId),
    index("ec_is_closed_idx").on(t.isClosed),
    index("ec_started_at_idx").on(t.startedAt),
  ],
);

// ── case_members ───────────────────────────────────────────────────────────────
// Objects that participate in a case.

export const caseMembersTable = pgTable(
  "case_members",
  {
    id: text("id").primaryKey(),
    caseId: text("case_id").notNull().references(() => executiveCasesTable.id, { onDelete: "cascade" }),
    objectId: text("object_id").notNull(),
    objectType: text("object_type").notNull(),
    // "goal" | "plan" | "execution" | "observation_chain" | "judgment" |
    // "context_snapshot" | "observation" | "memory_artifact"
    role: text("role").notNull().default("participant"),
    // "primary" | "participant" | "supporting"
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("cm_case_id_idx").on(t.caseId),
    index("cm_object_id_idx").on(t.objectId),
    index("cm_object_type_idx").on(t.objectType),
  ],
);

// ── case_timelines ─────────────────────────────────────────────────────────────
// Decision timeline events — append-only reconstruction from recorded history.
// No inference. Recorded events only.

export const caseTimelinesTable = pgTable(
  "case_timelines",
  {
    id: text("id").primaryKey(),
    caseId: text("case_id").notNull().references(() => executiveCasesTable.id, { onDelete: "cascade" }),
    sequenceNumber: integer("sequence_number").notNull().default(0),

    eventType: text("event_type").notNull(),
    // e.g. "reasoning_completed", "context_resolved", "goal_created",
    //      "judgment_evaluated", "plan_generated", "execution_started",
    //      "observation_recorded", "execution_completed"
    eventCategory: text("event_category").notNull(),
    eventDescription: text("event_description"),

    // Source object
    sourceObjectId: text("source_object_id"),
    sourceObjectType: text("source_object_type"),

    observedAt: timestamp("observed_at", { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb("metadata").notNull().default({}).$type<Record<string, unknown>>(),
  },
  (t) => [
    index("ct_case_id_idx").on(t.caseId),
    index("ct_sequence_idx").on(t.sequenceNumber),
    index("ct_event_category_idx").on(t.eventCategory),
    index("ct_observed_at_idx").on(t.observedAt),
  ],
);

// ── reflection_reports ─────────────────────────────────────────────────────────
// Immutable reflection report — created once per case, never updated.

export const reflectionReportsTable = pgTable(
  "reflection_reports",
  {
    id: text("id").primaryKey(),
    caseId: text("case_id").notNull().references(() => executiveCasesTable.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),

    // ── Report content ────────────────────────────────────────────────────
    executiveSummary: text("executive_summary").notNull(),
    primaryFactors: jsonb("primary_factors").notNull().default([]).$type<string[]>(),
    strengths: jsonb("strengths").notNull().default([]).$type<string[]>(),
    weaknesses: jsonb("weaknesses").notNull().default([]).$type<string[]>(),
    missedOpportunities: jsonb("missed_opportunities").notNull().default([]).$type<string[]>(),
    unexpectedOutcomes: jsonb("unexpected_outcomes").notNull().default([]).$type<string[]>(),
    businessImpact: text("business_impact"),

    // ── Confidence ─────────────────────────────────────────────────────────
    reflectionConfidence: real("reflection_confidence").notNull().default(0.5),
    evidenceQuality: real("evidence_quality").notNull().default(0.5),

    // ── Quality overview (summary; full scores in reflection_scores) ──────
    overallQualityScore: real("overall_quality_score").notNull().default(0.5),

    // ── Immutability ──────────────────────────────────────────────────────
    producedAt: timestamp("produced_at", { withTimezone: true }).notNull().defaultNow(),
    version: integer("version").notNull().default(1),
    metadata: jsonb("metadata").notNull().default({}).$type<Record<string, unknown>>(),
  },
  (t) => [
    index("rr_case_id_idx").on(t.caseId),
    index("rr_user_id_idx").on(t.userId),
    index("rr_overall_quality_idx").on(t.overallQualityScore),
    index("rr_produced_at_idx").on(t.producedAt),
  ],
);

// ── reflection_factors ─────────────────────────────────────────────────────────

export const reflectionFactorsTable = pgTable(
  "reflection_factors",
  {
    id: text("id").primaryKey(),
    reportId: text("report_id").notNull().references(() => reflectionReportsTable.id, { onDelete: "cascade" }),
    caseId: text("case_id").notNull().references(() => executiveCasesTable.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),

    factorCategory: text("factor_category").notNull(),
    // "context" | "knowledge" | "goal_priority" | "planning_strategy" |
    // "execution_quality" | "external_factors" | "timing" |
    // "business_constraints" | "confidence"
    factorDescription: text("factor_description").notNull(),
    influenceScore: real("influence_score").notNull().default(0.5),  // 0.00–1.00
    direction: text("direction").notNull().default("neutral"),
    // "positive" | "negative" | "neutral" | "mixed"
    evidence: jsonb("evidence").notNull().default([]).$type<Record<string, unknown>[]>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("rf_report_id_idx").on(t.reportId),
    index("rf_case_id_idx").on(t.caseId),
    index("rf_factor_category_idx").on(t.factorCategory),
    index("rf_influence_score_idx").on(t.influenceScore),
  ],
);

// ── reflection_scores ──────────────────────────────────────────────────────────

export const reflectionScoresTable = pgTable(
  "reflection_scores",
  {
    id: text("id").primaryKey(),
    reportId: text("report_id").notNull().references(() => reflectionReportsTable.id, { onDelete: "cascade" }),
    caseId: text("case_id").notNull().references(() => executiveCasesTable.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),

    scoreDimension: text("score_dimension").notNull(),
    // "decision_quality" | "planning_quality" | "execution_quality" |
    // "consistency" | "goal_alignment" | "strategic_alignment" |
    // "resource_efficiency" | "evidence_quality"
    score: real("score").notNull().default(0.5),           // 0.00–1.00
    explanation: text("explanation").notNull(),
    evidenceCount: integer("evidence_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("rs_report_id_idx").on(t.reportId),
    index("rs_case_id_idx").on(t.caseId),
    index("rs_dimension_idx").on(t.scoreDimension),
    index("rs_score_idx").on(t.score),
  ],
);

// ── reflection_evidence ────────────────────────────────────────────────────────

export const reflectionEvidenceTable = pgTable(
  "reflection_evidence",
  {
    id: text("id").primaryKey(),
    reportId: text("report_id").notNull().references(() => reflectionReportsTable.id, { onDelete: "cascade" }),
    caseId: text("case_id").notNull().references(() => executiveCasesTable.id, { onDelete: "cascade" }),

    evidenceType: text("evidence_type").notNull(),
    // "observation" | "execution_event" | "plan_decision" |
    // "goal_change" | "judgment_record" | "context_shift"
    sourceObjectId: text("source_object_id"),
    sourceObjectType: text("source_object_type"),
    summary: text("summary").notNull(),
    strength: real("strength").notNull().default(0.5),   // 0.00–1.00
    payload: jsonb("payload").notNull().default({}).$type<Record<string, unknown>>(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("re_report_id_idx").on(t.reportId),
    index("re_case_id_idx").on(t.caseId),
    index("re_evidence_type_idx").on(t.evidenceType),
    index("re_strength_idx").on(t.strength),
  ],
);

// ── reflection_metrics ─────────────────────────────────────────────────────────

export const reflectionMetricsTable = pgTable(
  "reflection_metrics",
  {
    id: text("id").primaryKey(),
    caseId: text("case_id").references(() => executiveCasesTable.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
    metricKey: text("metric_key").notNull(),
    metricValue: real("metric_value"),
    windowLabel: text("window_label"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("rmet_case_id_idx").on(t.caseId),
    index("rmet_user_id_idx").on(t.userId),
    index("rmet_key_idx").on(t.metricKey),
    index("rmet_recorded_at_idx").on(t.recordedAt),
  ],
);

// ── Row-level type exports ─────────────────────────────────────────────────────

export type ExecutiveCaseRow = typeof executiveCasesTable.$inferSelect;
export type CaseMemberRow = typeof caseMembersTable.$inferSelect;
export type CaseTimelineRow = typeof caseTimelinesTable.$inferSelect;
export type ReflectionReportRow = typeof reflectionReportsTable.$inferSelect;
export type ReflectionFactorRow = typeof reflectionFactorsTable.$inferSelect;
export type ReflectionScoreRow = typeof reflectionScoresTable.$inferSelect;
export type ReflectionEvidenceRow = typeof reflectionEvidenceTable.$inferSelect;
export type ReflectionMetricRow = typeof reflectionMetricsTable.$inferSelect;
