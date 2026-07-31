import { pgTable, text, integer, real, jsonb, timestamp } from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────────────────────────────────────
// Build 022: Capability Planning Engine — 8 tables
// Transforms Strategic Plans into a complete capability inventory.
// Append-only / immutable except capability_registry.
// FK insertion order: capability_reports → capability_plans → capability_domains
//   → capability_requirements → capability_gaps → capability_dependencies
//   → capability_readiness → capability_registry
// ─────────────────────────────────────────────────────────────────────────────

// Root immutable record — persisted FIRST in every run
export const capabilityReports = pgTable("capability_reports", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  userId: integer("user_id"),
  planningReportId: text("planning_report_id"),
  primaryPlanId: text("primary_plan_id"),
  domainCount: integer("domain_count").notNull().default(0),
  requirementCount: integer("requirement_count").notNull().default(0),
  gapCount: integer("gap_count").notNull().default(0),
  criticalGapCount: integer("critical_gap_count").notNull().default(0),
  missingCapabilityCount: integer("missing_capability_count").notNull().default(0),
  dependencyCount: integer("dependency_count").notNull().default(0),
  overallReadinessScore: real("overall_readiness_score"),
  overallMaturityScore: real("overall_maturity_score"),
  overallConfidence: real("overall_confidence"),
  coverageScore: real("coverage_score"),
  completenessScore: real("completeness_score"),
  executiveSummary: text("executive_summary").notNull().default(""),
  capabilityDurationMs: integer("capability_duration_ms").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// One capability plan per report
export const capabilityPlans = pgTable("capability_plans", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull().references(() => capabilityReports.id, { onDelete: "cascade" }),
  businessId: integer("business_id").notNull(),
  userId: integer("user_id"),
  strategicPlanId: text("strategic_plan_id"),
  planningReportId: text("planning_report_id"),
  domainCount: integer("domain_count").notNull().default(0),
  requirementCount: integer("requirement_count").notNull().default(0),
  gapCount: integer("gap_count").notNull().default(0),
  criticalGapCount: integer("critical_gap_count").notNull().default(0),
  missingCapabilityCount: integer("missing_capability_count").notNull().default(0),
  dependencyCount: integer("dependency_count").notNull().default(0),
  overallReadinessScore: real("overall_readiness_score"),
  overallMaturityScore: real("overall_maturity_score"),
  coverageScore: real("coverage_score"),
  completenessScore: real("completeness_score"),
  businessImpactScore: real("business_impact_score"),
  riskScore: real("risk_score"),
  confidence: real("confidence"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Capability domains — one per domain type per plan (up to 16)
export const capabilityDomains = pgTable("capability_domains", {
  id: text("id").primaryKey(),
  planId: text("plan_id").notNull().references(() => capabilityPlans.id, { onDelete: "cascade" }),
  reportId: text("report_id").notNull(),
  businessId: integer("business_id").notNull(),
  domainType: text("domain_type").notNull(),
  domainName: text("domain_name").notNull(),
  domainDescription: text("domain_description").notNull(),
  requirementCount: integer("requirement_count").notNull().default(0),
  gapCount: integer("gap_count").notNull().default(0),
  criticalGapCount: integer("critical_gap_count").notNull().default(0),
  overallMaturityScore: real("overall_maturity_score"),
  overallReadinessScore: real("overall_readiness_score"),
  businessImpact: text("business_impact").notNull().default("medium"),
  priority: integer("priority").notNull().default(5),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Capability requirements — specific capabilities needed within a domain
export const capabilityRequirements = pgTable("capability_requirements", {
  id: text("id").primaryKey(),
  domainId: text("domain_id").notNull().references(() => capabilityDomains.id, { onDelete: "cascade" }),
  planId: text("plan_id").notNull(),
  reportId: text("report_id").notNull(),
  businessId: integer("business_id").notNull(),
  programId: text("program_id"),
  programType: text("program_type"),
  capabilityName: text("capability_name").notNull(),
  capabilityDescription: text("capability_description").notNull(),
  requiredLevel: text("required_level").notNull().default("defined"), // none|basic|defined|managed|optimising
  currentLevel: text("current_level").notNull().default("basic"),
  gapSeverity: text("gap_severity").notNull().default("medium"), // none|low|medium|high|critical
  businessCriticality: text("business_criticality").notNull().default("medium"),
  isMissing: integer("is_missing").notNull().default(0),
  priority: integer("priority").notNull().default(5),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Capability gaps — one per identified gap
export const capabilityGaps = pgTable("capability_gaps", {
  id: text("id").primaryKey(),
  requirementId: text("requirement_id").notNull().references(() => capabilityRequirements.id, { onDelete: "cascade" }),
  domainId: text("domain_id").notNull(),
  planId: text("plan_id").notNull(),
  reportId: text("report_id").notNull(),
  businessId: integer("business_id").notNull(),
  gapType: text("gap_type").notNull(), // existing|required|deficit|surplus|missing
  gapTitle: text("gap_title").notNull(),
  gapDescription: text("gap_description").notNull(),
  currentState: text("current_state").notNull(),
  requiredState: text("required_state").notNull(),
  severity: text("severity").notNull().default("medium"),
  closureNote: text("closure_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Capability dependencies — cross-domain, technology, human, platform, knowledge
export const capabilityDependencies = pgTable("capability_dependencies", {
  id: text("id").primaryKey(),
  planId: text("plan_id").notNull().references(() => capabilityPlans.id, { onDelete: "cascade" }),
  reportId: text("report_id").notNull(),
  businessId: integer("business_id").notNull(),
  dependencyType: text("dependency_type").notNull(), // capability|technology|human|platform|knowledge
  title: text("title").notNull(),
  description: text("description").notNull(),
  fromDomainType: text("from_domain_type"),
  toDomainType: text("to_domain_type"),
  severity: text("severity").notNull().default("medium"),
  mitigationNote: text("mitigation_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Capability readiness — one row per domain (maturity × 6 dimensions)
export const capabilityReadiness = pgTable("capability_readiness", {
  id: text("id").primaryKey(),
  domainId: text("domain_id").notNull().references(() => capabilityDomains.id, { onDelete: "cascade" }),
  planId: text("plan_id").notNull(),
  reportId: text("report_id").notNull(),
  businessId: integer("business_id").notNull(),
  domainType: text("domain_type").notNull(),
  maturityScore: real("maturity_score"),
  maturityLevel: text("maturity_level").notNull().default("basic"),
  availabilityScore: real("availability_score"),
  scalabilityScore: real("scalability_score"),
  reliabilityScore: real("reliability_score"),
  maintainabilityScore: real("maintainability_score"),
  governanceScore: real("governance_score"),
  overallReadinessScore: real("overall_readiness_score"),
  readinessLevel: text("readiness_level").notNull().default("developing"),
  keyGap: text("key_gap"),
  recommendation: text("recommendation"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Capability registry — one row per business (upserted)
export const capabilityRegistry = pgTable("capability_registry", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull().unique(),
  userId: integer("user_id"),
  totalPlans: integer("total_plans").notNull().default(0),
  totalReports: integer("total_reports").notNull().default(0),
  latestReportId: text("latest_report_id"),
  latestPlanId: text("latest_plan_id"),
  latestDomainCount: integer("latest_domain_count"),
  latestRequirementCount: integer("latest_requirement_count"),
  latestGapCount: integer("latest_gap_count"),
  latestCriticalGapCount: integer("latest_critical_gap_count"),
  latestReadinessScore: real("latest_readiness_score"),
  latestConfidence: real("latest_confidence"),
  lastCapabilityAt: timestamp("last_capability_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
