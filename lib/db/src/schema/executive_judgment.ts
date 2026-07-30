import {
  pgTable,
  text,
  integer,
  real,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

// ─── Executive Judgment Engine (Build 007) ───────────────────────────────────
//
// The Executive Judgment Engine is the first system that allows ASH to
// exercise executive judgment: evaluating options, scoring trade-offs, and
// selecting the best course of action. This is the cognitive layer that sits
// between Reasoning ("what can I conclude?") and future Execution ("do it").
//
// One table: executive_judgments
//
// Every judgment is stored as one row. Options, scores, and the explanation
// are stored as JSONB because they are always read and written together as
// an atomic unit — they are the judgment, not relational records.

// ── Judgment statuses ─────────────────────────────────────────────────────────
export const JUDGMENT_STATUSES = ["pending", "completed", "superseded"] as const;
export type JudgmentStatus = (typeof JUDGMENT_STATUSES)[number];

// ── executive_judgments ───────────────────────────────────────────────────────
// Each row represents one complete judgment: a decision objective, the set of
// options that were evaluated, the scoring applied, and the final recommendation
// with its explanation.
//
// Design note: aggregate scores (decision_score, confidence_score, etc.) are
// stored as REAL columns so dashboards can sort/filter without parsing JSONB.
// The full per-dimension breakdown is in the options JSONB.
export const executiveJudgmentsTable = pgTable(
  "executive_judgments",
  {
    // ── Identity ───────────────────────────────────────────────────────────
    id: text("id").primaryKey(),

    // ── Ownership ─────────────────────────────────────────────────────────
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),

    // ── Decision objective ─────────────────────────────────────────────────
    decisionObjective: text("decision_objective").notNull(),

    // ── Lifecycle ─────────────────────────────────────────────────────────
    status: text("status").notNull().default("completed"),
    version: integer("version").notNull().default(1),

    // ── Options array ──────────────────────────────────────────────────────
    // Each element is a ScoredJudgmentOption (see types.ts for the shape).
    // Includes both the caller-provided raw scores and the engine-computed
    // normalised + composite scores.
    options: jsonb("options").notNull().default([]).$type<unknown[]>(),

    // ── Recommendation ────────────────────────────────────────────────────
    selectedOptionKey: text("selected_option_key"),
    // Map of {optionKey → compositeScore (0-100)}
    compositeScores: jsonb("composite_scores").notNull().default({}).$type<Record<string, number>>(),

    // ── Aggregate judgment scores (0–100) ──────────────────────────────────
    // Stored as REAL for indexed ordering. Derived from the selected option.
    decisionScore: real("decision_score"),       // composite score of the winner
    confidenceScore: real("confidence_score"),   // confidence dimension of the winner
    riskScore: real("risk_score"),               // risk dimension of the winner
    opportunityScore: real("opportunity_score"), // expectedImpact * confidence/100
    complexityScore: real("complexity_score"),   // complexity of the winner

    // ── Strategic context ─────────────────────────────────────────────────
    strategicAlignment: text("strategic_alignment"),

    // ── Supporting context (from prior Builds) ────────────────────────────
    supportingEvidence: jsonb("supporting_evidence").notNull().default([]).$type<string[]>(),
    // FK to context_snapshots.id (Build 006) — no foreign-key constraint to
    // avoid a hard dependency; the relationship is navigated by the service layer.
    relatedContextSnapshotId: text("related_context_snapshot_id"),
    relatedArtifactIds: jsonb("related_artifact_ids").notNull().default([]).$type<string[]>(),
    relatedClusterIds: jsonb("related_cluster_ids").notNull().default([]).$type<string[]>(),

    // ── Judgment inputs ────────────────────────────────────────────────────
    assumptions: jsonb("assumptions").notNull().default([]).$type<string[]>(),
    constraintsUsed: jsonb("constraints_used").notNull().default([]).$type<string[]>(),
    // The weights applied during scoring — preserved for future replay and audit.
    scoringWeights: jsonb("scoring_weights").notNull().default({}).$type<Record<string, number>>(),

    // ── Judgment outputs ───────────────────────────────────────────────────
    decisionRationale: text("decision_rationale"),
    // [{key, rank, compositeScore, rejectionReason}]
    alternativeRankings: jsonb("alternative_rankings").notNull().default([]).$type<unknown[]>(),
    // Structured explanation (see JudgmentExplanation in types.ts)
    explanation: jsonb("explanation").notNull().default({}).$type<Record<string, unknown>>(),

    // ── Forward-compatibility ─────────────────────────────────────────────
    metadata: jsonb("metadata").notNull().default({}).$type<Record<string, unknown>>(),

    // ── Timestamps ────────────────────────────────────────────────────────
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    index("exec_judgments_user_id_idx").on(t.userId),
    index("exec_judgments_status_idx").on(t.status),
    index("exec_judgments_created_at_idx").on(t.createdAt),
    // For sorting judgments by quality
    index("exec_judgments_decision_score_idx").on(t.decisionScore),
    // For linking judgments back to their context snapshots (Build 006)
    index("exec_judgments_context_snapshot_idx").on(t.relatedContextSnapshotId),
  ],
);

export const insertExecutiveJudgmentSchema = createInsertSchema(executiveJudgmentsTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertExecutiveJudgment = z.infer<typeof insertExecutiveJudgmentSchema>;
export type ExecutiveJudgmentRow = typeof executiveJudgmentsTable.$inferSelect;
