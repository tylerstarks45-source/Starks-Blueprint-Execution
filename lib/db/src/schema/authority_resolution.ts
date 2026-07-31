// ─────────────────────────────────────────────────────────────────────────────
// Build 025: Authority Resolution Engine — Drizzle Schema (8 tables)
// Append-only; immutable except authority_registry (upserted per business).
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

// 1. authority_reports ─────────────────────────────────────────────────────────
export const authorityReports = pgTable("authority_reports", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  userId: integer("user_id"),
  orchestrationReportId: text("orchestration_report_id"),
  requirementCount: integer("requirement_count").notNull().default(0),
  grantedCount: integer("granted_count").notNull().default(0),
  pendingCount: integer("pending_count").notNull().default(0),
  deniedCount: integer("denied_count").notNull().default(0),
  expiredCount: integer("expired_count").notNull().default(0),
  unavailableCount: integer("unavailable_count").notNull().default(0),
  missingCount: integer("missing_count").notNull().default(0),
  approvalRequiredCount: integer("approval_required_count").notNull().default(0),
  authorizationScore: numeric("authorization_score", { precision: 5, scale: 4 }).notNull().default("0"),
  authorityConfidence: numeric("authority_confidence", { precision: 5, scale: 4 }).notNull().default("0"),
  overallScore: numeric("overall_score", { precision: 5, scale: 4 }).notNull().default("0"),
  isAuthorized: boolean("is_authorized").notNull().default(false),
  executiveSummary: text("executive_summary").notNull().default(""),
  resolutionDurationMs: integer("resolution_duration_ms").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 2. authority_plans ───────────────────────────────────────────────────────────
export const authorityPlans = pgTable("authority_plans", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull().references(() => authorityReports.id),
  businessId: integer("business_id").notNull(),
  userId: integer("user_id"),
  orchestrationPlanId: text("orchestration_plan_id"),
  scopeCount: integer("scope_count").notNull().default(0),
  requirementCount: integer("requirement_count").notNull().default(0),
  grantedCount: integer("granted_count").notNull().default(0),
  pendingCount: integer("pending_count").notNull().default(0),
  deniedCount: integer("denied_count").notNull().default(0),
  dependencyCount: integer("dependency_count").notNull().default(0),
  decisionCount: integer("decision_count").notNull().default(0),
  approvalRequiredCount: integer("approval_required_count").notNull().default(0),
  coverageScore: numeric("coverage_score", { precision: 5, scale: 4 }).notNull().default("0"),
  completenessScore: numeric("completeness_score", { precision: 5, scale: 4 }).notNull().default("0"),
  riskScore: numeric("risk_score", { precision: 5, scale: 4 }).notNull().default("0"),
  trustScore: numeric("trust_score", { precision: 5, scale: 4 }).notNull().default("0"),
  readinessScore: numeric("readiness_score", { precision: 5, scale: 4 }).notNull().default("0"),
  confidenceScore: numeric("confidence_score", { precision: 5, scale: 4 }).notNull().default("0"),
  overallScore: numeric("overall_score", { precision: 5, scale: 4 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 3. authority_requirements ────────────────────────────────────────────────────
export const authorityRequirements = pgTable("authority_requirements", {
  id: text("id").primaryKey(),
  planId: text("plan_id").notNull().references(() => authorityPlans.id),
  reportId: text("report_id").notNull().references(() => authorityReports.id),
  businessId: integer("business_id").notNull(),
  assignmentId: text("assignment_id"),
  workPackageId: text("work_package_id"),
  authorityType: text("authority_type").notNull(),
  scopeType: text("scope_type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("pending"),
  rationale: text("rationale").notNull().default(""),
  requiresApproval: boolean("requires_approval").notNull().default(false),
  approvalLevel: text("approval_level").notNull().default("none"),
  riskLevel: text("risk_level").notNull().default("low"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 4. authority_grants ──────────────────────────────────────────────────────────
export const authorityGrants = pgTable("authority_grants", {
  id: text("id").primaryKey(),
  requirementId: text("requirement_id").notNull().references(() => authorityRequirements.id),
  planId: text("plan_id").notNull().references(() => authorityPlans.id),
  reportId: text("report_id").notNull().references(() => authorityReports.id),
  businessId: integer("business_id").notNull(),
  grantedBy: text("granted_by").notNull().default("system"),
  grantStatus: text("grant_status").notNull().default("pending"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  authoritySource: text("authority_source").notNull().default("implicit"),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 5. authority_scopes ──────────────────────────────────────────────────────────
export const authorityScopes = pgTable("authority_scopes", {
  id: text("id").primaryKey(),
  planId: text("plan_id").notNull().references(() => authorityPlans.id),
  reportId: text("report_id").notNull().references(() => authorityReports.id),
  businessId: integer("business_id").notNull(),
  scopeType: text("scope_type").notNull(),
  scopeTarget: text("scope_target").notNull().default(""),
  isResolved: boolean("is_resolved").notNull().default(false),
  requiresElevation: boolean("requires_elevation").notNull().default(false),
  resolutionNote: text("resolution_note").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 6. authority_decisions ───────────────────────────────────────────────────────
export const authorityDecisions = pgTable("authority_decisions", {
  id: text("id").primaryKey(),
  requirementId: text("requirement_id").notNull().references(() => authorityRequirements.id),
  planId: text("plan_id").notNull().references(() => authorityPlans.id),
  reportId: text("report_id").notNull().references(() => authorityReports.id),
  businessId: integer("business_id").notNull(),
  decisionType: text("decision_type").notNull(),
  decisionRationale: text("decision_rationale").notNull().default(""),
  requiresApproval: boolean("requires_approval").notNull().default(false),
  approvalLevel: text("approval_level").notNull().default("none"),
  confidence: numeric("confidence", { precision: 5, scale: 4 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 7. authority_registry ────────────────────────────────────────────────────────
// One row per business; upserted on conflict.
export const authorityRegistry = pgTable(
  "authority_registry",
  {
    id: text("id").primaryKey(),
    businessId: integer("business_id").notNull(),
    latestReportId: text("latest_report_id"),
    latestPlanId: text("latest_plan_id"),
    totalRequirements: integer("total_requirements").notNull().default(0),
    grantedCount: integer("granted_count").notNull().default(0),
    pendingCount: integer("pending_count").notNull().default(0),
    deniedCount: integer("denied_count").notNull().default(0),
    missingCount: integer("missing_count").notNull().default(0),
    authorizationScore: numeric("authorization_score", { precision: 5, scale: 4 }).notNull().default("0"),
    authorityConfidence: numeric("authority_confidence", { precision: 5, scale: 4 }).notNull().default("0"),
    isAuthorized: boolean("is_authorized").notNull().default(false),
    lastResolutionAt: timestamp("last_resolution_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("authority_registry_business_unique").on(t.businessId)]
);

// 8. authority_snapshots ───────────────────────────────────────────────────────
export const authoritySnapshots = pgTable("authority_snapshots", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull().references(() => authorityReports.id),
  businessId: integer("business_id").notNull(),
  userId: integer("user_id"),
  snapshotData: jsonb("snapshot_data").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
