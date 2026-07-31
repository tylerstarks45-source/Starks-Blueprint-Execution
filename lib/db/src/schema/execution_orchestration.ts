import { pgTable, text, integer, real, timestamp } from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────────────────────────────────────
// Build 024: Execution Orchestration Engine — 8 tables
// Transforms Operational Plans into execution-ready assignments.
// Append-only / immutable except execution_registry.
// FK insertion order:
//   execution_reports → execution_plans → execution_owners → execution_assignments
//   → execution_queues → execution_policies → execution_readiness → execution_registry
// ─────────────────────────────────────────────────────────────────────────────

// Root immutable record — persisted FIRST in every run
export const executionReports = pgTable("execution_reports", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  userId: integer("user_id"),
  operationalReportId: text("operational_report_id"),
  primaryPlanId: text("primary_plan_id"),
  assignmentCount: integer("assignment_count").notNull().default(0),
  ownerCount: integer("owner_count").notNull().default(0),
  queueCount: integer("queue_count").notNull().default(0),
  blockerCount: integer("blocker_count").notNull().default(0),
  criticalBlockerCount: integer("critical_blocker_count").notNull().default(0),
  policyCount: integer("policy_count").notNull().default(0),
  automatedCount: integer("automated_count").notNull().default(0),
  manualCount: integer("manual_count").notNull().default(0),
  deferredCount: integer("deferred_count").notNull().default(0),
  automationRatio: real("automation_ratio"),
  executionReadinessScore: real("execution_readiness_score"),
  executionConfidence: real("execution_confidence"),
  overallScore: real("overall_score"),
  executiveSummary: text("executive_summary").notNull().default(""),
  orchestrationDurationMs: integer("orchestration_duration_ms").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// One execution plan per report
export const executionPlans = pgTable("execution_plans", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull().references(() => executionReports.id, { onDelete: "cascade" }),
  businessId: integer("business_id").notNull(),
  userId: integer("user_id"),
  operationalPlanId: text("operational_plan_id"),
  operationalReportId: text("operational_report_id"),
  assignmentCount: integer("assignment_count").notNull().default(0),
  ownerCount: integer("owner_count").notNull().default(0),
  queueCount: integer("queue_count").notNull().default(0),
  blockerCount: integer("blocker_count").notNull().default(0),
  criticalBlockerCount: integer("critical_blocker_count").notNull().default(0),
  policyCount: integer("policy_count").notNull().default(0),
  automatedCount: integer("automated_count").notNull().default(0),
  manualCount: integer("manual_count").notNull().default(0),
  deferredCount: integer("deferred_count").notNull().default(0),
  automationRatio: real("automation_ratio"),
  executionReadinessScore: real("execution_readiness_score"),
  executionConfidence: real("execution_confidence"),
  overallScore: real("overall_score"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Execution owners — one per unique owner type per plan
export const executionOwners = pgTable("execution_owners", {
  id: text("id").primaryKey(),
  planId: text("plan_id").notNull().references(() => executionPlans.id, { onDelete: "cascade" }),
  reportId: text("report_id").notNull(),
  businessId: integer("business_id").notNull(),
  ownerType: text("owner_type").notNull(), // human|department|ai_agent|automation|integration|external_system|future_capability
  ownerName: text("owner_name").notNull(),
  ownerDescription: text("owner_description").notNull(),
  executionClass: text("execution_class").notNull(), // manual|semi_automated|automated|external|deferred
  assignmentCount: integer("assignment_count").notNull().default(0),
  averageComplexity: text("average_complexity").notNull().default("medium"),
  readinessScore: real("readiness_score"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Execution assignments — one per work package
export const executionAssignments = pgTable("execution_assignments", {
  id: text("id").primaryKey(),
  planId: text("plan_id").notNull().references(() => executionPlans.id, { onDelete: "cascade" }),
  reportId: text("report_id").notNull(),
  businessId: integer("business_id").notNull(),
  ownerId: text("owner_id").notNull(),
  workPackageId: text("work_package_id").notNull(),
  packageTitle: text("package_title").notNull(),
  phaseType: text("phase_type").notNull(),
  ownerType: text("owner_type").notNull(),
  executionClass: text("execution_class").notNull(),
  complexityLevel: text("complexity_level").notNull().default("medium"),
  businessCriticality: text("business_criticality").notNull().default("medium"),
  blockerCount: integer("blocker_count").notNull().default(0),
  policyCount: integer("policy_count").notNull().default(0),
  readinessScore: real("readiness_score"),
  sequencePosition: integer("sequence_position"),
  rationale: text("rationale").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Execution queues — ordered execution queue entries
export const executionQueues = pgTable("execution_queues", {
  id: text("id").primaryKey(),
  planId: text("plan_id").notNull().references(() => executionPlans.id, { onDelete: "cascade" }),
  reportId: text("report_id").notNull(),
  businessId: integer("business_id").notNull(),
  assignmentId: text("assignment_id").notNull(),
  workPackageId: text("work_package_id").notNull(),
  queuePosition: integer("queue_position").notNull(),
  phaseOrder: integer("phase_order").notNull(),
  ownerType: text("owner_type").notNull(),
  executionClass: text("execution_class").notNull(),
  priorityScore: real("priority_score"),
  isBlocked: integer("is_blocked").notNull().default(0),
  blockerSummary: text("blocker_summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Execution policies — governance, security, approval, risk thresholds
export const executionPolicies = pgTable("execution_policies", {
  id: text("id").primaryKey(),
  planId: text("plan_id").notNull().references(() => executionPlans.id, { onDelete: "cascade" }),
  reportId: text("report_id").notNull(),
  businessId: integer("business_id").notNull(),
  assignmentId: text("assignment_id"),
  policyType: text("policy_type").notNull(), // governance|permissions|security|approval|risk
  policyTitle: text("policy_title").notNull(),
  policyDescription: text("policy_description").notNull(),
  policyStatus: text("policy_status").notNull().default("satisfied"), // satisfied|pending|violated|deferred
  severity: text("severity").notNull().default("medium"),
  requiresApproval: integer("requires_approval").notNull().default(0),
  mitigationNote: text("mitigation_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Execution readiness — 5-dimension assessment
export const executionReadiness = pgTable("execution_readiness", {
  id: text("id").primaryKey(),
  planId: text("plan_id").notNull().references(() => executionPlans.id, { onDelete: "cascade" }),
  reportId: text("report_id").notNull(),
  businessId: integer("business_id").notNull(),
  operationalReadinessScore: real("operational_readiness_score"),
  capabilityReadinessScore: real("capability_readiness_score"),
  policyReadinessScore: real("policy_readiness_score"),
  dependencyReadinessScore: real("dependency_readiness_score"),
  overallReadinessScore: real("overall_readiness_score"),
  readinessLevel: text("readiness_level").notNull().default("developing"),
  executionConfidence: real("execution_confidence"),
  keyBlocker: text("key_blocker"),
  recommendation: text("recommendation"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Execution registry — one row per business (upserted)
export const executionOrchestrationRegistry = pgTable("execution_orchestration_registry", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull().unique(),
  userId: integer("user_id"),
  totalPlans: integer("total_plans").notNull().default(0),
  totalReports: integer("total_reports").notNull().default(0),
  latestReportId: text("latest_report_id"),
  latestPlanId: text("latest_plan_id"),
  latestAssignmentCount: integer("latest_assignment_count"),
  latestBlockerCount: integer("latest_blocker_count"),
  latestCriticalBlockerCount: integer("latest_critical_blocker_count"),
  latestAutomationRatio: real("latest_automation_ratio"),
  latestReadinessScore: real("latest_readiness_score"),
  latestConfidence: real("latest_confidence"),
  latestOverallScore: real("latest_overall_score"),
  lastOrchestrationAt: timestamp("last_orchestration_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
