// ─────────────────────────────────────────────────────────────────────────────
// Build 027: Execution Simulation Engine — Database Schema (8 tables)
// Append-only except simulation_registry (upserted).
// ─────────────────────────────────────────────────────────────────────────────
import {
  pgTable, text, integer, boolean, timestamp, numeric, jsonb,
} from "drizzle-orm/pg-core";

export const executionSimulationReports = pgTable("execution_simulation_reports", {
  id:                        text("id").primaryKey(),
  businessId:                integer("business_id").notNull(),
  userId:                    integer("user_id"),
  riskReportId:              text("risk_report_id"),
  authorityReportId:         text("authority_report_id"),
  orchestrationReportId:     text("orchestration_report_id"),
  simulationCount:           integer("simulation_count").notNull().default(0),
  scenarioCount:             integer("scenario_count").notNull().default(0),
  overallConfidence:         numeric("overall_confidence", { precision: 5, scale: 4 }).notNull().default("0"),
  bestCaseConfidence:        numeric("best_case_confidence", { precision: 5, scale: 4 }).notNull().default("0"),
  worstCaseConfidence:       numeric("worst_case_confidence", { precision: 5, scale: 4 }).notNull().default("0"),
  estimatedDurationMin:      numeric("estimated_duration_min", { precision: 8, scale: 2 }).notNull().default("0"),
  estimatedDurationExpected: numeric("estimated_duration_expected", { precision: 8, scale: 2 }).notNull().default("0"),
  estimatedDurationMax:      numeric("estimated_duration_max", { precision: 8, scale: 2 }).notNull().default("0"),
  estimatedDurationUnit:     text("estimated_duration_unit").notNull().default("hours"),
  rollbackConfidence:        numeric("rollback_confidence", { precision: 5, scale: 4 }).notNull().default("0"),
  isSimulationComplete:      boolean("is_simulation_complete").notNull().default(false),
  executiveSummary:          text("executive_summary").notNull().default(""),
  simulationDurationMs:      integer("simulation_duration_ms").notNull().default(0),
  createdAt:                 timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const executionSimulations = pgTable("execution_simulations", {
  id:                         text("id").primaryKey(),
  reportId:                   text("report_id").notNull().references(() => executionSimulationReports.id),
  businessId:                 integer("business_id").notNull(),
  assignmentId:               text("assignment_id").notNull(),
  workPackageId:              text("work_package_id"),
  packageTitle:               text("package_title"),
  ownerType:                  text("owner_type").notNull(),
  executionClass:             text("execution_class").notNull(),
  complexityLevel:            text("complexity_level").notNull().default("medium"),
  businessCriticality:        text("business_criticality").notNull().default("medium"),
  scenarioCount:              integer("scenario_count").notNull().default(0),
  expectedOutcomeSummary:     text("expected_outcome_summary").notNull().default(""),
  predictedDurationHours:     numeric("predicted_duration_hours", { precision: 8, scale: 2 }).notNull().default("0"),
  resourceConsumptionEstimate: jsonb("resource_consumption_estimate").notNull().default("{}"),
  confidenceScore:            numeric("confidence_score", { precision: 5, scale: 4 }).notNull().default("0"),
  uncertaintyScore:           numeric("uncertainty_score", { precision: 5, scale: 4 }).notNull().default("0"),
  createdAt:                  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const simulationScenarios = pgTable("simulation_scenarios", {
  id:                 text("id").primaryKey(),
  simulationId:       text("simulation_id").notNull().references(() => executionSimulations.id),
  reportId:           text("report_id").notNull().references(() => executionSimulationReports.id),
  businessId:         integer("business_id").notNull(),
  scenarioType:       text("scenario_type").notNull(), // best_case | expected_case | worst_case | failure_case
  scenarioTitle:      text("scenario_title").notNull().default(""),
  scenarioDescription: text("scenario_description").notNull().default(""),
  probability:        numeric("probability", { precision: 5, scale: 4 }).notNull().default("0"),
  successLikelihood:  numeric("success_likelihood", { precision: 5, scale: 4 }).notNull().default("0"),
  createdAt:          timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const predictedOutcomes = pgTable("predicted_outcomes", {
  id:                   text("id").primaryKey(),
  scenarioId:           text("scenario_id").notNull().references(() => simulationScenarios.id),
  simulationId:         text("simulation_id").notNull().references(() => executionSimulations.id),
  reportId:             text("report_id").notNull().references(() => executionSimulationReports.id),
  businessId:           integer("business_id").notNull(),
  outcomeType:          text("outcome_type").notNull(), // success | partial_success | degraded | failure
  outcomeSummary:       text("outcome_summary").notNull().default(""),
  impactSeverity:       text("impact_severity").notNull().default("low"), // none | low | medium | high | critical
  impactDescription:    text("impact_description").notNull().default(""),
  dependenciesAffected: jsonb("dependencies_affected").notNull().default("[]"),
  createdAt:            timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const predictedStateChanges = pgTable("predicted_state_changes", {
  id:               text("id").primaryKey(),
  simulationId:     text("simulation_id").notNull().references(() => executionSimulations.id),
  reportId:         text("report_id").notNull().references(() => executionSimulationReports.id),
  businessId:       integer("business_id").notNull(),
  stateDomain:      text("state_domain").notNull(), // system | data | process | external | compliance
  changeType:       text("change_type").notNull(),  // create | update | delete | transform | trigger
  affectedEntity:   text("affected_entity").notNull().default(""),
  changeDescription: text("change_description").notNull().default(""),
  isReversible:     boolean("is_reversible").notNull().default(true),
  isCritical:       boolean("is_critical").notNull().default(false),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rollbackSimulations = pgTable("rollback_simulations", {
  id:                          text("id").primaryKey(),
  simulationId:                text("simulation_id").notNull().references(() => executionSimulations.id),
  reportId:                    text("report_id").notNull().references(() => executionSimulationReports.id),
  businessId:                  integer("business_id").notNull(),
  rollbackConfidence:          numeric("rollback_confidence", { precision: 5, scale: 4 }).notNull().default("0"),
  recoveryComplexity:          text("recovery_complexity").notNull().default("moderate"),
  estimatedRecoveryDurationHours: numeric("estimated_recovery_duration_hours", { precision: 8, scale: 2 }).notNull().default("0"),
  rollbackSteps:               jsonb("rollback_steps").notNull().default("[]"),
  rollbackNotes:               text("rollback_notes").notNull().default(""),
  isRollbackFeasible:          boolean("is_rollback_feasible").notNull().default(true),
  createdAt:                   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const simulationRegistry = pgTable("simulation_registry", {
  id:                   text("id").primaryKey(),
  businessId:           integer("business_id").notNull().unique(),
  latestReportId:       text("latest_report_id"),
  simulationCount:      integer("simulation_count").notNull().default(0),
  overallConfidence:    numeric("overall_confidence", { precision: 5, scale: 4 }).notNull().default("0"),
  rollbackConfidence:   numeric("rollback_confidence", { precision: 5, scale: 4 }).notNull().default("0"),
  isSimulationComplete: boolean("is_simulation_complete").notNull().default(false),
  lastSimulationAt:     timestamp("last_simulation_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt:            timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:            timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const simulationSnapshots = pgTable("simulation_snapshots", {
  id:           text("id").primaryKey(),
  reportId:     text("report_id").notNull().references(() => executionSimulationReports.id),
  businessId:   integer("business_id").notNull(),
  userId:       integer("user_id"),
  snapshotData: jsonb("snapshot_data").notNull().default("{}"),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
