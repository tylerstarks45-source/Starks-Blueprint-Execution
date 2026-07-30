// ─── Build 019: Decision Intelligence Schema ──────────────────────────────────
//
// 8 tables. All append-only/immutable except decision_registry (upserted).
// decision_reports is the FK anchor — persisted FIRST every run.

import { pgTable, text, integer, real, jsonb, boolean, timestamp } from "drizzle-orm/pg-core";

// ── decision_reports ──────────────────────────────────────────────────────────
// Root report per decision run. Persisted BEFORE executive_decisions.

export const decisionReportsTable = pgTable("decision_reports", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  userId: integer("user_id"),
  simulationReportId: text("simulation_report_id"),
  primaryDecisionId: text("primary_decision_id"),            // set after decisions inserted
  decisionCount: integer("decision_count").notNull().default(0),
  alternativeCount: integer("alternative_count").notNull().default(0),
  rejectedCount: integer("rejected_count").notNull().default(0),
  overallConfidence: real("overall_confidence"),
  strategicAlignmentScore: real("strategic_alignment_score"),
  executiveSummary: text("executive_summary").notNull().default(""),
  decisionDurationMs: integer("decision_duration_ms").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── executive_decisions ───────────────────────────────────────────────────────
// One row per evaluated scenario — primary, alternative, or rejected.

export const executiveDecisionsTable = pgTable("executive_decisions", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull(),
  businessId: integer("business_id").notNull(),
  userId: integer("user_id"),
  scenarioId: text("scenario_id").notNull(),
  scenarioName: text("scenario_name").notNull(),
  scenarioType: text("scenario_type").notNull(),
  decisionType: text("decision_type").notNull(),              // primary | alternative | rejected
  rankPosition: integer("rank_position").notNull().default(0),
  selectionScore: real("selection_score").notNull().default(0),
  expectedValueScore: real("expected_value_score").notNull().default(0),
  strategicAlignmentScore: real("strategic_alignment_score").notNull().default(0),
  riskScore: real("risk_score").notNull().default(0),
  confidenceScore: real("confidence_score").notNull().default(0),
  complexityScore: real("complexity_score").notNull().default(0),
  resourceDemand: real("resource_demand").notNull().default(0),
  governanceCompliant: boolean("governance_compliant").notNull().default(true),
  goalAlignmentScore: real("goal_alignment_score").notNull().default(0),
  rejectionReason: text("rejection_reason"),                  // populated for rejected decisions
  alignmentProfile: jsonb("alignment_profile").notNull().default("{}"),
  tradeoffSummary: jsonb("tradeoff_summary").notNull().default("{}"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── decision_rationales ───────────────────────────────────────────────────────
// Explainable reasoning for each decision.

export const decisionRationalesTable = pgTable("decision_rationales", {
  id: text("id").primaryKey(),
  decisionId: text("decision_id").notNull(),
  reportId: text("report_id").notNull(),
  businessId: integer("business_id").notNull(),
  rationaleType: text("rationale_type").notNull(),           // selection | rejection | preference | concern
  dimension: text("dimension").notNull(),                    // which scoring dimension this explains
  title: text("title").notNull(),
  explanation: text("explanation").notNull(),
  weight: real("weight").notNull().default(0.5),
  supportingEvidence: jsonb("supporting_evidence").notNull().default("[]"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── decision_matrices ─────────────────────────────────────────────────────────
// Weighted comparison matrix entries — one row per criterion per scenario pair.

export const decisionMatricesTable = pgTable("decision_matrices", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull(),
  businessId: integer("business_id").notNull(),
  criterion: text("criterion").notNull(),                    // business_goals | executive_policies | governance_rules | risk_tolerance | resource_availability | financial_capacity | user_priorities
  criterionWeight: real("criterion_weight").notNull().default(0.14),
  scenarioId: text("scenario_id").notNull(),
  scenarioType: text("scenario_type").notNull(),
  rawScore: real("raw_score").notNull().default(0),
  weightedScore: real("weighted_score").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── decision_tradeoffs ─────────────────────────────────────────────────────────
// Explicit tradeoff catalog — one row per tradeoff category per decision.

export const decisionTradeoffsTable = pgTable("decision_tradeoffs", {
  id: text("id").primaryKey(),
  decisionId: text("decision_id").notNull(),
  reportId: text("report_id").notNull(),
  businessId: integer("business_id").notNull(),
  tradeoffCategory: text("tradeoff_category").notNull(),     // benefit | cost | risk | compromise | dependency | opportunity_cost
  title: text("title").notNull(),
  description: text("description").notNull(),
  magnitude: real("magnitude").notNull().default(0.5),       // 0..1 impact magnitude
  certainty: real("certainty").notNull().default(0.7),       // 0..1 how certain we are
  timeHorizon: text("time_horizon").notNull().default("medium"), // short | medium | long
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── decision_confidence ───────────────────────────────────────────────────────
// 5-dimension confidence record per decision.

export const decisionConfidenceTable = pgTable("decision_confidence", {
  id: text("id").primaryKey(),
  decisionId: text("decision_id").notNull(),
  reportId: text("report_id").notNull(),
  businessId: integer("business_id").notNull(),
  decisionConfidence: real("decision_confidence").notNull().default(0.7),
  evidenceScore: real("evidence_score").notNull().default(0.7),
  dataCompleteness: real("data_completeness").notNull().default(0.7),
  assumptionStability: real("assumption_stability").notNull().default(0.7),
  policyCompliance: real("policy_compliance").notNull().default(1.0),
  overallConfidence: real("overall_confidence").notNull().default(0.7),
  confidenceNarrative: text("confidence_narrative").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── decision_snapshots ────────────────────────────────────────────────────────
// Append-only point-in-time snapshot after each report.

export const decisionSnapshotsTable = pgTable("decision_snapshots", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  reportId: text("report_id").notNull(),
  primaryDecisionId: text("primary_decision_id"),
  decisionCount: integer("decision_count").notNull().default(0),
  overallConfidence: real("overall_confidence"),
  strategicAlignmentScore: real("strategic_alignment_score"),
  typeDistribution: jsonb("type_distribution").notNull().default("{}"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── decision_registry ─────────────────────────────────────────────────────────
// One row per business. Mutable roll-up. UNIQUE on business_id.

export const decisionRegistryTable = pgTable("decision_registry", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull().unique(),
  userId: integer("user_id"),
  totalDecisions: integer("total_decisions").notNull().default(0),
  totalReports: integer("total_reports").notNull().default(0),
  latestReportId: text("latest_report_id"),
  latestPrimaryDecisionId: text("latest_primary_decision_id"),
  latestPrimaryScenarioType: text("latest_primary_scenario_type"),
  latestConfidence: real("latest_confidence"),
  latestAlignmentScore: real("latest_alignment_score"),
  lastDecidedAt: timestamp("last_decided_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
