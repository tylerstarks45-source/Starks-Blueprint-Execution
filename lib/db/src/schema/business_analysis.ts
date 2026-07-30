// ─── Build 016: Business Analysis Engine — DB Schema ─────────────────────────
//
// 8 append-only, immutable tables.
// All reference the existing `businesses` table (serial integer PK).

import {
  pgTable,
  text,
  integer,
  real,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { businessesTable } from "./businesses";

// ── business_analysis_reports ─────────────────────────────────────────────────
// Immutable. One report per analysis run per business.

export const businessAnalysisReportsTable = pgTable("business_analysis_reports", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id"),
  reportVersion: integer("report_version").notNull().default(1),
  executiveSummary: text("executive_summary").notNull().default(""),
  businessOverview: jsonb("business_overview").notNull().default({}),
  graphAnalysis: jsonb("graph_analysis").notNull().default({}),
  kpiAnalysis: jsonb("kpi_analysis").notNull().default({}),
  healthAnalysis: jsonb("health_analysis").notNull().default({}),
  bottlenecks: jsonb("bottlenecks").notNull().default([]),
  constraints: jsonb("constraints").notNull().default([]),
  leveragePoints: jsonb("leverage_points").notNull().default([]),
  businessStability: real("business_stability").notNull().default(0.5),
  businessComplexityScore: real("business_complexity_score").notNull().default(0.5),
  businessMaturityScore: real("business_maturity_score").notNull().default(0.5),
  businessConfidence: real("business_confidence").notNull().default(0.5),
  findingCount: integer("finding_count").notNull().default(0),
  criticalFindingCount: integer("critical_finding_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── business_findings ─────────────────────────────────────────────────────────
// Immutable executive findings derived from graph, KPIs, health, deps.

export const businessFindingsTable = pgTable("business_findings", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  reportId: text("report_id").notNull().references(() => businessAnalysisReportsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id"),
  category: text("category").notNull(),
  // graph | kpi | health | bottleneck | constraint | leverage | dependency | execution | operational | growth
  severity: text("severity").notNull().default("medium"),
  // info | low | medium | high | critical
  title: text("title").notNull(),
  description: text("description").notNull(),
  evidence: jsonb("evidence").notNull().default([]),        // string[]
  confidence: real("confidence").notNull().default(0.7),
  businessDomains: jsonb("business_domains").notNull().default([]), // string[]
  relatedNodeIds: jsonb("related_node_ids").notNull().default([]),  // string[]
  relatedKpiIds: jsonb("related_kpi_ids").notNull().default([]),    // string[]
  relatedHealthDimensions: jsonb("related_health_dimensions").notNull().default([]), // string[]
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── business_bottlenecks ──────────────────────────────────────────────────────

export const businessBottlenecksTable = pgTable("business_bottlenecks", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  reportId: text("report_id").notNull().references(() => businessAnalysisReportsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id"),
  bottleneckType: text("bottleneck_type").notNull(),
  // execution | operational | marketing | sales | automation | dependency
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: real("severity").notNull().default(0.5),
  evidence: jsonb("evidence").notNull().default([]),
  businessImpact: text("business_impact").notNull().default(""),
  confidence: real("confidence").notNull().default(0.7),
  affectedNodeIds: jsonb("affected_node_ids").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── business_constraints ──────────────────────────────────────────────────────

export const businessConstraintsTable = pgTable("business_constraints", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  reportId: text("report_id").notNull().references(() => businessAnalysisReportsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id"),
  constraintType: text("constraint_type").notNull(),
  // resource | financial | time | workflow | technology | capacity | priority_conflict | goal_conflict
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: real("severity").notNull().default(0.5),
  affectedDomains: jsonb("affected_domains").notNull().default([]),
  affectedNodeIds: jsonb("affected_node_ids").notNull().default([]),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── business_leverage_points ──────────────────────────────────────────────────

export const businessLeveragePointsTable = pgTable("business_leverage_points", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  reportId: text("report_id").notNull().references(() => businessAnalysisReportsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id"),
  leverageType: text("leverage_type").notNull(),
  // kpi_multiplier | project_multiplier | automation_remover | dependency_resolver | shared_asset | cross_functional
  title: text("title").notNull(),
  description: text("description").notNull(),
  leverageScore: real("leverage_score").notNull().default(0.5),
  affectedNodeIds: jsonb("affected_node_ids").notNull().default([]),
  affectedKpiIds: jsonb("affected_kpi_ids").notNull().default([]),
  evidenceCount: integer("evidence_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── analysis_snapshots ────────────────────────────────────────────────────────
// Immutable snapshot of graph inputs at the time of analysis.

export const analysisSnapshotsTable = pgTable("analysis_snapshots", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  reportId: text("report_id").notNull().references(() => businessAnalysisReportsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id"),
  nodeCount: integer("node_count").notNull().default(0),
  edgeCount: integer("edge_count").notNull().default(0),
  kpiCount: integer("kpi_count").notNull().default(0),
  healthScore: real("health_score"),
  depCount: integer("dep_count").notNull().default(0),
  graphState: jsonb("graph_state").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── analysis_metrics ──────────────────────────────────────────────────────────

export const analysisMetricsTable = pgTable("analysis_metrics", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  reportId: text("report_id").notNull().references(() => businessAnalysisReportsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id"),
  findingCount: integer("finding_count").notNull().default(0),
  criticalFindings: integer("critical_findings").notNull().default(0),
  highFindings: integer("high_findings").notNull().default(0),
  bottleneckCount: integer("bottleneck_count").notNull().default(0),
  constraintCount: integer("constraint_count").notNull().default(0),
  leverageCount: integer("leverage_count").notNull().default(0),
  complexityScore: real("complexity_score").notNull().default(0.5),
  maturityScore: real("maturity_score").notNull().default(0.5),
  confidenceScore: real("confidence_score").notNull().default(0.7),
  stabilityScore: real("stability_score").notNull().default(0.5),
  computedMs: integer("computed_ms").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── analysis_registry ─────────────────────────────────────────────────────────
// One row per business. Mutable roll-up.

export const analysisRegistryTable = pgTable("analysis_registry", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull().unique().references(() => businessesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id"),
  reportCount: integer("report_count").notNull().default(0),
  latestReportId: text("latest_report_id"),
  latestComplexity: real("latest_complexity"),
  latestMaturity: real("latest_maturity"),
  latestConfidence: real("latest_confidence"),
  latestStability: real("latest_stability"),
  lastAnalyzedAt: timestamp("last_analyzed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
