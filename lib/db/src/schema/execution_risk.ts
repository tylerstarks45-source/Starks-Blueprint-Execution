// ─────────────────────────────────────────────────────────────────────────────
// Build 026: Execution Risk Assessment Engine — Drizzle Schema (8 tables)
// Append-only; immutable except execution_risk_registry (upserted per business).
// ─────────────────────────────────────────────────────────────────────────────
import {
  pgTable,
  text,
  integer,
  boolean,
  numeric,
  timestamp,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";

// 1. execution_risk_reports ────────────────────────────────────────────────────
export const executionRiskReports = pgTable("execution_risk_reports", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  userId: integer("user_id"),
  authorityReportId: text("authority_report_id"),
  orchestrationReportId: text("orchestration_report_id"),
  profileCount: integer("profile_count").notNull().default(0),
  mitigationCount: integer("mitigation_count").notNull().default(0),
  overallRiskScore: numeric("overall_risk_score", { precision: 5, scale: 4 }).notNull().default("0"),
  overallRiskLevel: text("overall_risk_level").notNull().default("low"),
  safetyScore: numeric("safety_score", { precision: 5, scale: 4 }).notNull().default("0"),
  rollbackReadiness: numeric("rollback_readiness", { precision: 5, scale: 4 }).notNull().default("0"),
  highestRiskCategory: text("highest_risk_category").notNull().default("operational"),
  highestRiskLevel: text("highest_risk_level").notNull().default("low"),
  isSafeToExecute: boolean("is_safe_to_execute").notNull().default(false),
  executiveSummary: text("executive_summary").notNull().default(""),
  assessmentDurationMs: integer("assessment_duration_ms").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 2. execution_risk_profiles ───────────────────────────────────────────────────
export const executionRiskProfiles = pgTable("execution_risk_profiles", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull().references(() => executionRiskReports.id),
  businessId: integer("business_id").notNull(),
  assignmentId: text("assignment_id").notNull(),
  workPackageId: text("work_package_id"),
  packageTitle: text("package_title"),
  ownerType: text("owner_type").notNull(),
  executionClass: text("execution_class").notNull(),
  complexityLevel: text("complexity_level").notNull().default("medium"),
  businessCriticality: text("business_criticality").notNull().default("medium"),
  operationalRiskScore: numeric("operational_risk_score", { precision: 5, scale: 4 }).notNull().default("0"),
  financialRiskScore: numeric("financial_risk_score", { precision: 5, scale: 4 }).notNull().default("0"),
  securityRiskScore: numeric("security_risk_score", { precision: 5, scale: 4 }).notNull().default("0"),
  privacyRiskScore: numeric("privacy_risk_score", { precision: 5, scale: 4 }).notNull().default("0"),
  complianceRiskScore: numeric("compliance_risk_score", { precision: 5, scale: 4 }).notNull().default("0"),
  continuityRiskScore: numeric("continuity_risk_score", { precision: 5, scale: 4 }).notNull().default("0"),
  overallRiskScore: numeric("overall_risk_score", { precision: 5, scale: 4 }).notNull().default("0"),
  overallRiskLevel: text("overall_risk_level").notNull().default("low"),
  reversibilityLevel: text("reversibility_level").notNull().default("partially_reversible"),
  rollbackComplexity: text("rollback_complexity").notNull().default("moderate"),
  rollbackNote: text("rollback_note").notNull().default(""),
  categoryData: jsonb("category_data").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 3. execution_risk_categories ─────────────────────────────────────────────────
export const executionRiskCategories = pgTable("execution_risk_categories", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => executionRiskProfiles.id),
  reportId: text("report_id").notNull().references(() => executionRiskReports.id),
  businessId: integer("business_id").notNull(),
  category: text("category").notNull(),
  riskLevel: text("risk_level").notNull().default("low"),
  riskScore: numeric("risk_score", { precision: 5, scale: 4 }).notNull().default("0"),
  factors: jsonb("factors").notNull().default([]),
  rationale: text("rationale").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 4. execution_risk_dependencies ───────────────────────────────────────────────
export const executionRiskDependencies = pgTable("execution_risk_dependencies", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull().references(() => executionRiskReports.id),
  businessId: integer("business_id").notNull(),
  fromCategory: text("from_category").notNull(),
  toCategory: text("to_category").notNull(),
  dependencyReason: text("dependency_reason").notNull().default(""),
  isCritical: boolean("is_critical").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 5. execution_risk_mitigations ────────────────────────────────────────────────
export const executionRiskMitigations = pgTable("execution_risk_mitigations", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull().references(() => executionRiskReports.id),
  businessId: integer("business_id").notNull(),
  profileId: text("profile_id"),
  mitigationType: text("mitigation_type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  priority: text("priority").notNull().default("medium"),
  applicableTo: text("applicable_to").notNull().default("all"),
  riskCategoriesAddressed: jsonb("risk_categories_addressed").notNull().default([]),
  estimatedEffort: text("estimated_effort").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 6. execution_safety_scores ───────────────────────────────────────────────────
export const executionSafetyScores = pgTable("execution_safety_scores", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull().references(() => executionRiskReports.id),
  businessId: integer("business_id").notNull(),
  safetyScore: numeric("safety_score", { precision: 5, scale: 4 }).notNull().default("0"),
  rollbackReadiness: numeric("rollback_readiness", { precision: 5, scale: 4 }).notNull().default("0"),
  reversibilityScore: numeric("reversibility_score", { precision: 5, scale: 4 }).notNull().default("0"),
  mitigationCoverageScore: numeric("mitigation_coverage_score", { precision: 5, scale: 4 }).notNull().default("0"),
  overallRiskScore: numeric("overall_risk_score", { precision: 5, scale: 4 }).notNull().default("0"),
  highestRiskCategory: text("highest_risk_category").notNull().default("operational"),
  highestRiskLevel: text("highest_risk_level").notNull().default("low"),
  isSafeToExecute: boolean("is_safe_to_execute").notNull().default(false),
  safetyNarrative: text("safety_narrative").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 7. execution_risk_registry ───────────────────────────────────────────────────
export const executionRiskRegistry = pgTable(
  "execution_risk_registry",
  {
    id: text("id").primaryKey(),
    businessId: integer("business_id").notNull(),
    latestReportId: text("latest_report_id"),
    totalProfiles: integer("total_profiles").notNull().default(0),
    mitigationCount: integer("mitigation_count").notNull().default(0),
    overallRiskScore: numeric("overall_risk_score", { precision: 5, scale: 4 }).notNull().default("0"),
    overallRiskLevel: text("overall_risk_level").notNull().default("low"),
    safetyScore: numeric("safety_score", { precision: 5, scale: 4 }).notNull().default("0"),
    rollbackReadiness: numeric("rollback_readiness", { precision: 5, scale: 4 }).notNull().default("0"),
    highestRiskCategory: text("highest_risk_category").notNull().default("operational"),
    isSafeToExecute: boolean("is_safe_to_execute").notNull().default(false),
    lastAssessmentAt: timestamp("last_assessment_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("execution_risk_registry_business_unique").on(t.businessId)]
);

// 8. execution_risk_snapshots ──────────────────────────────────────────────────
export const executionRiskSnapshots = pgTable("execution_risk_snapshots", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull().references(() => executionRiskReports.id),
  businessId: integer("business_id").notNull(),
  userId: integer("user_id"),
  snapshotData: jsonb("snapshot_data").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
