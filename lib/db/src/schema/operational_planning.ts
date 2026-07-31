import { pgTable, text, integer, real, timestamp } from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────────────────────────────────────
// Build 023: Operational Planning Engine — 8 tables
// Transforms Capability Plans into executable operational work structures.
// Append-only / immutable except operational_registry.
// FK insertion order:
//   operational_reports → operational_plans → operational_phases
//   → work_packages → execution_dependencies → execution_sequences
//   → operational_readiness → operational_registry
// ─────────────────────────────────────────────────────────────────────────────

// Root immutable record — persisted FIRST in every run
export const operationalReports = pgTable("operational_reports", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  userId: integer("user_id"),
  capabilityReportId: text("capability_report_id"),
  primaryPlanId: text("primary_plan_id"),
  phaseCount: integer("phase_count").notNull().default(0),
  workPackageCount: integer("work_package_count").notNull().default(0),
  dependencyCount: integer("dependency_count").notNull().default(0),
  criticalDependencyCount: integer("critical_dependency_count").notNull().default(0),
  sequenceCount: integer("sequence_count").notNull().default(0),
  executionReadinessScore: real("execution_readiness_score"),
  executionConfidence: real("execution_confidence"),
  overallScore: real("overall_score"),
  executiveSummary: text("executive_summary").notNull().default(""),
  operationalDurationMs: integer("operational_duration_ms").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// One operational plan per report
export const operationalPlans = pgTable("operational_plans", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull().references(() => operationalReports.id, { onDelete: "cascade" }),
  businessId: integer("business_id").notNull(),
  userId: integer("user_id"),
  capabilityPlanId: text("capability_plan_id"),
  capabilityReportId: text("capability_report_id"),
  phaseCount: integer("phase_count").notNull().default(0),
  workPackageCount: integer("work_package_count").notNull().default(0),
  dependencyCount: integer("dependency_count").notNull().default(0),
  criticalDependencyCount: integer("critical_dependency_count").notNull().default(0),
  sequenceCount: integer("sequence_count").notNull().default(0),
  executionReadinessScore: real("execution_readiness_score"),
  executionConfidence: real("execution_confidence"),
  completenessScore: real("completeness_score"),
  feasibilityScore: real("feasibility_score"),
  complexityScore: real("complexity_score"),
  riskScore: real("risk_score"),
  readinessScore: real("readiness_score"),
  confidenceScore: real("confidence_score"),
  overallScore: real("overall_score"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Operational phases — 5 per plan (preparation / foundation / implementation / validation / optimization)
export const operationalPhases = pgTable("operational_phases", {
  id: text("id").primaryKey(),
  planId: text("plan_id").notNull().references(() => operationalPlans.id, { onDelete: "cascade" }),
  reportId: text("report_id").notNull(),
  businessId: integer("business_id").notNull(),
  phaseType: text("phase_type").notNull(), // preparation|foundation|implementation|validation|optimization
  phaseName: text("phase_name").notNull(),
  phaseDescription: text("phase_description").notNull(),
  phaseOrder: integer("phase_order").notNull(),
  workPackageCount: integer("work_package_count").notNull().default(0),
  criticalWorkPackageCount: integer("critical_work_package_count").notNull().default(0),
  readinessScore: real("readiness_score"),
  priority: integer("priority").notNull().default(5),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Work packages — outcome-oriented (never individual tasks)
export const workPackages = pgTable("work_packages", {
  id: text("id").primaryKey(),
  phaseId: text("phase_id").notNull().references(() => operationalPhases.id, { onDelete: "cascade" }),
  planId: text("plan_id").notNull(),
  reportId: text("report_id").notNull(),
  businessId: integer("business_id").notNull(),
  capabilityRequirementId: text("capability_requirement_id"),
  capabilityName: text("capability_name").notNull(),
  packageTitle: text("package_title").notNull(),
  packageDescription: text("package_description").notNull(),
  outcomeStatement: text("outcome_statement").notNull(),
  phaseType: text("phase_type").notNull(),
  complexityLevel: text("complexity_level").notNull().default("medium"), // low|medium|high|critical
  businessCriticality: text("business_criticality").notNull().default("medium"),
  effortScore: real("effort_score"),
  sequencePosition: integer("sequence_position"),
  priority: integer("priority").notNull().default(5),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Execution dependencies — 5 types
export const executionDependencies = pgTable("execution_dependencies", {
  id: text("id").primaryKey(),
  planId: text("plan_id").notNull().references(() => operationalPlans.id, { onDelete: "cascade" }),
  reportId: text("report_id").notNull(),
  businessId: integer("business_id").notNull(),
  dependencyType: text("dependency_type").notNull(), // package|capability|technology|cross_functional|external
  title: text("title").notNull(),
  description: text("description").notNull(),
  fromPackageId: text("from_package_id"),
  toPackageId: text("to_package_id"),
  fromPhaseType: text("from_phase_type"),
  toPhaseType: text("to_phase_type"),
  severity: text("severity").notNull().default("medium"), // low|medium|high|critical
  mitigationNote: text("mitigation_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Execution sequences — deterministic ordering of work packages
export const executionSequences = pgTable("execution_sequences", {
  id: text("id").primaryKey(),
  planId: text("plan_id").notNull().references(() => operationalPlans.id, { onDelete: "cascade" }),
  reportId: text("report_id").notNull(),
  businessId: integer("business_id").notNull(),
  workPackageId: text("work_package_id").notNull(),
  sequencePosition: integer("sequence_position").notNull(),
  phaseOrder: integer("phase_order").notNull(),
  withinPhaseOrder: integer("within_phase_order").notNull(),
  prerequisitePackageIds: text("prerequisite_package_ids").notNull().default("[]"), // JSON array
  rationale: text("rationale").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Operational readiness — 5-dimension assessment
export const operationalReadiness = pgTable("operational_readiness", {
  id: text("id").primaryKey(),
  planId: text("plan_id").notNull().references(() => operationalPlans.id, { onDelete: "cascade" }),
  reportId: text("report_id").notNull(),
  businessId: integer("business_id").notNull(),
  capabilityReadinessScore: real("capability_readiness_score"),
  operationalReadinessScore: real("operational_readiness_score"),
  technologyReadinessScore: real("technology_readiness_score"),
  governanceReadinessScore: real("governance_readiness_score"),
  executionConfidenceScore: real("execution_confidence_score"),
  overallReadinessScore: real("overall_readiness_score"),
  readinessLevel: text("readiness_level").notNull().default("developing"), // not_ready|developing|defined|managed|optimising
  keyBlocker: text("key_blocker"),
  recommendation: text("recommendation"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Operational registry — one row per business (upserted)
export const operationalRegistry = pgTable("operational_registry", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull().unique(),
  userId: integer("user_id"),
  totalPlans: integer("total_plans").notNull().default(0),
  totalReports: integer("total_reports").notNull().default(0),
  latestReportId: text("latest_report_id"),
  latestPlanId: text("latest_plan_id"),
  latestPhaseCount: integer("latest_phase_count"),
  latestWorkPackageCount: integer("latest_work_package_count"),
  latestCriticalDependencyCount: integer("latest_critical_dependency_count"),
  latestReadinessScore: real("latest_readiness_score"),
  latestConfidence: real("latest_confidence"),
  latestOverallScore: real("latest_overall_score"),
  lastOperationalAt: timestamp("last_operational_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
