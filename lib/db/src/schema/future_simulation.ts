// ─── Build 018: Future State Simulation Schema ────────────────────────────────
//
// 8 tables. All append-only/immutable except simulation_registry (upserted).
// future_scenarios and scenario_branches track lifecycle via status field.

import { pgTable, text, integer, real, jsonb, timestamp } from "drizzle-orm/pg-core";

// ── future_scenarios ──────────────────────────────────────────────────────────

export const futureScenariosTable = pgTable("future_scenarios", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  reportId: text("report_id").notNull(),
  userId: integer("user_id"),
  opportunityId: text("opportunity_id"),
  scenarioName: text("scenario_name").notNull(),
  scenarioDescription: text("scenario_description").notNull(),
  scenarioType: text("scenario_type").notNull(),
  status: text("status").notNull().default("generated"),
  businessImpactSummary: jsonb("business_impact_summary").notNull().default("{}"),
  kpiProjectionSummary: jsonb("kpi_projection_summary").notNull().default("{}"),
  healthProjectionSummary: jsonb("health_projection_summary").notNull().default("{}"),
  outcomeSummary: jsonb("outcome_summary").notNull().default("{}"),
  riskSummary: jsonb("risk_summary").notNull().default("{}"),
  overallConfidence: real("overall_confidence").notNull().default(0.7),
  expectedValueScore: real("expected_value_score").notNull().default(0.5),
  growthPotential: real("growth_potential").notNull().default(0.5),
  automationPotential: real("automation_potential").notNull().default(0.5),
  riskScore: real("risk_score").notNull().default(0.3),
  executionComplexity: real("execution_complexity").notNull().default(0.5),
  assumptionCount: integer("assumption_count").notNull().default(0),
  evidenceCount: integer("evidence_count").notNull().default(0),
  analysisReportId: text("analysis_report_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── scenario_branches ─────────────────────────────────────────────────────────

export const scenarioBranchesTable = pgTable("scenario_branches", {
  id: text("id").primaryKey(),
  scenarioId: text("scenario_id").notNull(),
  businessId: integer("business_id").notNull(),
  branchType: text("branch_type").notNull(),          // best_case/expected_case/worst_case/most_likely
  description: text("description").notNull(),
  probability: real("probability").notNull().default(0.5),
  valueScore: real("value_score").notNull().default(0.5),
  keyDrivers: jsonb("key_drivers").notNull().default("[]"),
  keyRisks: jsonb("key_risks").notNull().default("[]"),
  kpiImpact: jsonb("kpi_impact").notNull().default("{}"),
  healthImpact: jsonb("health_impact").notNull().default("{}"),
  financialImpact: jsonb("financial_impact").notNull().default("{}"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── simulation_reports ────────────────────────────────────────────────────────

export const simulationReportsTable = pgTable("simulation_reports", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  userId: integer("user_id"),
  scenarioCount: integer("scenario_count").notNull().default(0),
  highestConfidenceScenarioId: text("highest_confidence_scenario_id"),
  lowestRiskScenarioId: text("lowest_risk_scenario_id"),
  highestValueScenarioId: text("highest_value_scenario_id"),
  highestGrowthScenarioId: text("highest_growth_scenario_id"),
  highestAutomationScenarioId: text("highest_automation_scenario_id"),
  simulationDurationMs: integer("simulation_duration_ms").notNull().default(0),
  executiveSummary: text("executive_summary").notNull().default(""),
  analysisReportId: text("analysis_report_id"),
  opportunityReportId: text("opportunity_report_id"),
  avgConfidence: real("avg_confidence"),
  avgRisk: real("avg_risk"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── simulation_assumptions ────────────────────────────────────────────────────

export const simulationAssumptionsTable = pgTable("simulation_assumptions", {
  id: text("id").primaryKey(),
  scenarioId: text("scenario_id").notNull(),
  businessId: integer("business_id").notNull(),
  assumptionType: text("assumption_type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  confidence: real("confidence").notNull().default(0.8),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── simulation_evidence ───────────────────────────────────────────────────────

export const simulationEvidenceTable = pgTable("simulation_evidence", {
  id: text("id").primaryKey(),
  scenarioId: text("scenario_id").notNull(),
  businessId: integer("business_id").notNull(),
  evidenceType: text("evidence_type").notNull(),
  referenceId: text("reference_id").notNull(),
  referenceType: text("reference_type").notNull(),
  description: text("description").notNull(),
  weight: real("weight").notNull().default(0.5),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── simulation_outcomes ───────────────────────────────────────────────────────

export const simulationOutcomesTable = pgTable("simulation_outcomes", {
  id: text("id").primaryKey(),
  scenarioId: text("scenario_id").notNull(),
  businessId: integer("business_id").notNull(),
  outcomeType: text("outcome_type").notNull(),          // best_case/expected_case/worst_case/most_likely
  probability: real("probability").notNull().default(0.5),
  kpiImpact: jsonb("kpi_impact").notNull().default("{}"),
  healthImpact: jsonb("health_impact").notNull().default("{}"),
  financialImpact: jsonb("financial_impact").notNull().default("{}"),
  operationalImpact: jsonb("operational_impact").notNull().default("{}"),
  riskImpact: jsonb("risk_impact").notNull().default("{}"),
  confidence: real("confidence").notNull().default(0.7),
  knownUnknowns: jsonb("known_unknowns").notNull().default("[]"),
  valueScore: real("value_score").notNull().default(0.5),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── simulation_snapshots ──────────────────────────────────────────────────────

export const simulationSnapshotsTable = pgTable("simulation_snapshots", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  reportId: text("report_id").notNull(),
  scenarioCount: integer("scenario_count").notNull().default(0),
  avgConfidence: real("avg_confidence"),
  avgRisk: real("avg_risk"),
  highestValueScenarioId: text("highest_value_scenario_id"),
  scenarioTypeDistribution: jsonb("scenario_type_distribution").notNull().default("{}"),
  statusDistribution: jsonb("status_distribution").notNull().default("{}"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── simulation_registry ───────────────────────────────────────────────────────
// One row per business. Mutable roll-up.

export const simulationRegistryTable = pgTable("simulation_registry", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull().unique(),
  userId: integer("user_id"),
  totalScenarios: integer("total_scenarios").notNull().default(0),
  totalReports: integer("total_reports").notNull().default(0),
  latestReportId: text("latest_report_id"),
  latestHighestValueScenarioId: text("latest_highest_value_scenario_id"),
  latestConfidence: real("latest_confidence"),
  latestAvgRisk: real("latest_avg_risk"),
  lastSimulatedAt: timestamp("last_simulated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
