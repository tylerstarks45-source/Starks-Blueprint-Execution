// ─── Build 020: Executive Strategy Schema ────────────────────────────────────
//
// 8 tables. All append-only/immutable except strategy_registry (upserted).
// strategy_reports is the FK anchor — persisted FIRST every run.

import { pgTable, text, integer, real, jsonb, timestamp } from "drizzle-orm/pg-core";

// ── strategy_reports ──────────────────────────────────────────────────────────
// Root report per strategy run. Persisted BEFORE executive_strategies.

export const strategyReportsTable = pgTable("strategy_reports", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  userId: integer("user_id"),
  decisionReportId: text("decision_report_id"),
  primaryStrategyId: text("primary_strategy_id"),         // set after strategies inserted
  strategyCount: integer("strategy_count").notNull().default(0),
  pillarCount: integer("pillar_count").notNull().default(0),
  objectiveCount: integer("objective_count").notNull().default(0),
  dependencyCount: integer("dependency_count").notNull().default(0),
  constraintCount: integer("constraint_count").notNull().default(0),
  overallAlignmentScore: real("overall_alignment_score"),
  overallConfidence: real("overall_confidence"),
  completenessScore: real("completeness_score"),
  businessValueScore: real("business_value_score"),
  sustainabilityScore: real("sustainability_score"),
  executiveSummary: text("executive_summary").notNull().default(""),
  strategyDurationMs: integer("strategy_duration_ms").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── executive_strategies ──────────────────────────────────────────────────────
// One per decision run — derived from the primary executive decision.

export const executiveStrategiesTable = pgTable("executive_strategies", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull(),
  businessId: integer("business_id").notNull(),
  userId: integer("user_id"),
  decisionId: text("decision_id"),                        // source executive_decision.id
  scenarioType: text("scenario_type").notNull(),
  strategyName: text("strategy_name").notNull(),
  strategyDescription: text("strategy_description").notNull(),
  strategicVision: text("strategic_vision").notNull(),
  competitivePositioning: text("competitive_positioning").notNull(),
  timeHorizon: text("time_horizon").notNull().default("medium"),  // short | medium | long
  alignmentScore: real("alignment_score").notNull().default(0),
  confidenceScore: real("confidence_score").notNull().default(0),
  completenessScore: real("completeness_score").notNull().default(0),
  businessValueScore: real("business_value_score").notNull().default(0),
  sustainabilityScore: real("sustainability_score").notNull().default(0),
  riskScore: real("risk_score").notNull().default(0),
  pillarCount: integer("pillar_count").notNull().default(0),
  objectiveCount: integer("objective_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── strategic_pillars ─────────────────────────────────────────────────────────

export const strategicPillarsTable = pgTable("strategic_pillars", {
  id: text("id").primaryKey(),
  strategyId: text("strategy_id").notNull(),
  reportId: text("report_id").notNull(),
  businessId: integer("business_id").notNull(),
  pillarType: text("pillar_type").notNull(),               // revenue_growth | operational_excellence | customer_experience | innovation | technology | market_expansion | talent | financial_strength | governance
  pillarName: text("pillar_name").notNull(),
  pillarDescription: text("pillar_description").notNull(),
  priority: integer("priority").notNull().default(5),     // 1 (highest) – 9
  weight: real("weight").notNull().default(0.11),         // proportion of overall strategy focus
  alignmentScore: real("alignment_score").notNull().default(0),
  objectiveCount: integer("objective_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── strategic_objectives ──────────────────────────────────────────────────────

export const strategicObjectivesTable = pgTable("strategic_objectives", {
  id: text("id").primaryKey(),
  pillarId: text("pillar_id").notNull(),
  strategyId: text("strategy_id").notNull(),
  reportId: text("report_id").notNull(),
  businessId: integer("business_id").notNull(),
  objectiveName: text("objective_name").notNull(),
  objectiveDescription: text("objective_description").notNull(),
  successCriteria: text("success_criteria").notNull(),
  timeframe: text("timeframe").notNull().default("medium"),  // short | medium | long
  priority: integer("priority").notNull().default(3),       // 1 highest
  alignmentScore: real("alignment_score").notNull().default(0),
  confidence: real("confidence").notNull().default(0.7),
  businessImpact: text("business_impact").notNull().default("medium"),  // low | medium | high
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── strategic_dependencies ────────────────────────────────────────────────────

export const strategicDependenciesTable = pgTable("strategic_dependencies", {
  id: text("id").primaryKey(),
  strategyId: text("strategy_id").notNull(),
  reportId: text("report_id").notNull(),
  businessId: integer("business_id").notNull(),
  dependencyType: text("dependency_type").notNull(),      // cross_functional | business | technology | financial | people
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull().default("medium"), // low | medium | high | critical
  mitigationNote: text("mitigation_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── strategic_constraints ─────────────────────────────────────────────────────

export const strategicConstraintsTable = pgTable("strategic_constraints", {
  id: text("id").primaryKey(),
  strategyId: text("strategy_id").notNull(),
  reportId: text("report_id").notNull(),
  businessId: integer("business_id").notNull(),
  constraintType: text("constraint_type").notNull(),      // budget | capacity | technology | governance | legal | time
  title: text("title").notNull(),
  description: text("description").notNull(),
  impact: text("impact").notNull().default("medium"),     // low | medium | high | blocking
  adaptationNote: text("adaptation_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── strategy_snapshots ────────────────────────────────────────────────────────

export const strategySnapshotsTable = pgTable("strategy_snapshots", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  reportId: text("report_id").notNull(),
  primaryStrategyId: text("primary_strategy_id"),
  pillarCount: integer("pillar_count").notNull().default(0),
  objectiveCount: integer("objective_count").notNull().default(0),
  overallConfidence: real("overall_confidence"),
  overallAlignmentScore: real("overall_alignment_score"),
  pillarTypeDistribution: jsonb("pillar_type_distribution").notNull().default("{}"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── strategy_registry ─────────────────────────────────────────────────────────
// One row per business. Mutable roll-up. UNIQUE on business_id.

export const strategyRegistryTable = pgTable("strategy_registry", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull().unique(),
  userId: integer("user_id"),
  totalStrategies: integer("total_strategies").notNull().default(0),
  totalReports: integer("total_reports").notNull().default(0),
  latestReportId: text("latest_report_id"),
  latestStrategyId: text("latest_strategy_id"),
  latestScenarioType: text("latest_scenario_type"),
  latestConfidence: real("latest_confidence"),
  latestAlignmentScore: real("latest_alignment_score"),
  latestPillarCount: integer("latest_pillar_count"),
  latestObjectiveCount: integer("latest_objective_count"),
  lastStrategyAt: timestamp("last_strategy_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
