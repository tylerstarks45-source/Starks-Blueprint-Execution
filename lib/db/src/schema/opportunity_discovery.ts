// ─── Build 017: Opportunity Discovery Schema ──────────────────────────────────
//
// 7 tables. All immutable (append-only) except opportunity_registry (upserted).
// executive_opportunities and opportunity_evidence track lifecycle via status.

import { pgTable, text, integer, real, jsonb, timestamp, serial } from "drizzle-orm/pg-core";

// ── executive_opportunities ───────────────────────────────────────────────────

export const executiveOpportunitiesTable = pgTable("executive_opportunities", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  reportId: text("report_id").notNull(),
  userId: integer("user_id"),
  category: text("category").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  discoverySource: text("discovery_source").notNull(),
  status: text("status").notNull().default("active"),
  businessImpact: real("business_impact").notNull().default(0.5),
  estimatedReach: real("estimated_reach").notNull().default(0.5),
  estimatedEffort: real("estimated_effort").notNull().default(0.5),
  risk: real("risk").notNull().default(0.3),
  confidence: real("confidence").notNull().default(0.7),
  strategicValue: real("strategic_value").notNull().default(0.5),
  compositeScore: real("composite_score").notNull().default(0.5),
  rankPosition: integer("rank_position"),
  priorityGroup: text("priority_group").notNull().default("medium"),
  evidenceCount: integer("evidence_count").notNull().default(0),
  analysisReportId: text("analysis_report_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── opportunity_reports ───────────────────────────────────────────────────────

export const opportunityReportsTable = pgTable("opportunity_reports", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  analysisReportId: text("analysis_report_id"),
  userId: integer("user_id"),
  totalOpportunities: integer("total_opportunities").notNull().default(0),
  criticalOpportunities: integer("critical_opportunities").notNull().default(0),
  highPriorityOpportunities: integer("high_priority_opportunities").notNull().default(0),
  topCategory: text("top_category"),
  highestScore: real("highest_score"),
  avgConfidence: real("avg_confidence"),
  discoveryDurationMs: integer("discovery_duration_ms").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── opportunity_evidence ──────────────────────────────────────────────────────

export const opportunityEvidenceTable = pgTable("opportunity_evidence", {
  id: text("id").primaryKey(),
  opportunityId: text("opportunity_id").notNull(),
  businessId: integer("business_id").notNull(),
  evidenceType: text("evidence_type").notNull(),
  referenceId: text("reference_id").notNull(),
  referenceType: text("reference_type").notNull(),
  description: text("description").notNull(),
  weight: real("weight").notNull().default(0.5),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── opportunity_scores ────────────────────────────────────────────────────────

export const opportunityScoresTable = pgTable("opportunity_scores", {
  id: text("id").primaryKey(),
  opportunityId: text("opportunity_id").notNull(),
  businessId: integer("business_id").notNull(),
  reportId: text("report_id").notNull(),
  businessImpact: real("business_impact").notNull().default(0.5),
  estimatedReach: real("estimated_reach").notNull().default(0.5),
  estimatedEffort: real("estimated_effort").notNull().default(0.5),
  risk: real("risk").notNull().default(0.3),
  confidence: real("confidence").notNull().default(0.7),
  strategicValue: real("strategic_value").notNull().default(0.5),
  compositeScore: real("composite_score").notNull().default(0.5),
  scoringVersion: integer("scoring_version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── opportunity_rankings ──────────────────────────────────────────────────────

export const opportunityRankingsTable = pgTable("opportunity_rankings", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull(),
  businessId: integer("business_id").notNull(),
  opportunityId: text("opportunity_id").notNull(),
  rankPosition: integer("rank_position").notNull(),
  priorityGroup: text("priority_group").notNull(),
  scoreAtRank: real("score_at_rank").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── opportunity_snapshots ─────────────────────────────────────────────────────

export const opportunitySnapshotsTable = pgTable("opportunity_snapshots", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  reportId: text("report_id").notNull(),
  totalOpportunities: integer("total_opportunities").notNull().default(0),
  topOpportunityId: text("top_opportunity_id"),
  highestScore: real("highest_score"),
  categoryDistribution: jsonb("category_distribution").notNull().default("{}"),
  priorityDistribution: jsonb("priority_distribution").notNull().default("{}"),
  sourceDistribution: jsonb("source_distribution").notNull().default("{}"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── opportunity_registry ──────────────────────────────────────────────────────
// One row per business. Mutable roll-up.

export const opportunityRegistryTable = pgTable("opportunity_registry", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull().unique(),
  userId: integer("user_id"),
  totalDiscovered: integer("total_discovered").notNull().default(0),
  activeCount: integer("active_count").notNull().default(0),
  resolvedCount: integer("resolved_count").notNull().default(0),
  dismissedCount: integer("dismissed_count").notNull().default(0),
  latestReportId: text("latest_report_id"),
  highestScore: real("highest_score"),
  highestConfidence: real("highest_confidence"),
  highestBusinessValue: real("highest_business_value"),
  lastDiscoveredAt: timestamp("last_discovered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
