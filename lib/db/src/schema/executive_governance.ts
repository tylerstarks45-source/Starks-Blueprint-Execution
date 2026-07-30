// ─── Build 014: Executive Governance & Adaptation Engine ─────────────────────
//
// 9 tables:
//   executive_policies     — core policy objects (versioned, never deleted)
//   policy_versions        — immutable revision history
//   policy_decisions       — governance decisions per principle evaluation
//   policy_conflicts       — detected conflicts between policies
//   behavior_profiles      — named behavior configurations
//   behavior_snapshots     — pre-adaptation state snapshots (rollback points)
//   adaptation_plans       — approved change plans
//   governance_reports     — immutable cycle output documents
//   governance_metrics     — KV metrics per governance cycle

import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  jsonb,
  timestamp,
  serial,
} from "drizzle-orm/pg-core";

// ── executive_policies ────────────────────────────────────────────────────────

export const executivePolicies = pgTable("executive_policies", {
  id: text("id").primaryKey(),
  userId: integer("user_id"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  sourcePrincipleIds: jsonb("source_principle_ids").notNull().default([]), // string[]
  businessDomains: jsonb("business_domains").notNull().default([]),        // string[]
  strategicCategories: jsonb("strategic_categories").notNull().default([]),// string[]
  policyType: text("policy_type").notNull().default("general"),
  // planning_guidance | execution_guidance | judgment_guidance |
  // goal_prioritization | execution_strategy | context_weighting | general
  priority: integer("priority").notNull().default(5),  // 1 (highest) – 10 (lowest)
  status: text("status").notNull().default("draft"),
  // draft | proposed | approved | rejected | retired
  guidance: text("guidance").notNull().default(""),    // human-readable advisory text
  effectiveDate: timestamp("effective_date", { withTimezone: true }),
  expirationDate: timestamp("expiration_date", { withTimezone: true }),
  version: integer("version").notNull().default(1),
  conflictIds: jsonb("conflict_ids").notNull().default([]),                // string[]
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectedAt: timestamp("rejected_at", { withTimezone: true }),
  retiredAt: timestamp("retired_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  metadata: jsonb("metadata").notNull().default({}),
});

// ── policy_versions ───────────────────────────────────────────────────────────

export const policyVersions = pgTable("policy_versions", {
  id: text("id").primaryKey(),
  policyId: text("policy_id").notNull().references(() => executivePolicies.id, { onDelete: "cascade" }),
  userId: integer("user_id"),
  version: integer("version").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  guidance: text("guidance").notNull(),
  status: text("status").notNull(),
  priority: integer("priority").notNull(),
  changeReason: text("change_reason"),
  snapshotAt: timestamp("snapshot_at", { withTimezone: true }).notNull().defaultNow(),
  payload: jsonb("payload").notNull().default({}),
});

// ── policy_decisions ──────────────────────────────────────────────────────────

export const policyDecisions = pgTable("policy_decisions", {
  id: text("id").primaryKey(),
  policyId: text("policy_id").references(() => executivePolicies.id, { onDelete: "cascade" }),
  principleId: text("principle_id"),                 // executive_principles.id
  userId: integer("user_id"),
  decision: text("decision").notNull(),              // approve | reject | defer | merge | split | supersede
  rationale: text("rationale").notNull(),
  confidenceAtDecision: real("confidence_at_decision"),
  reliabilityAtDecision: real("reliability_at_decision"),
  observationsAtDecision: integer("observations_at_decision"),
  conflictsDetected: integer("conflicts_detected").notNull().default(0),
  supersededPolicyId: text("superseded_policy_id"),  // for supersede decisions
  mergedIntoId: text("merged_into_id"),              // for merge decisions
  decidedAt: timestamp("decided_at", { withTimezone: true }).notNull().defaultNow(),
  payload: jsonb("payload").notNull().default({}),
});

// ── policy_conflicts ──────────────────────────────────────────────────────────

export const policyConflicts = pgTable("policy_conflicts", {
  id: text("id").primaryKey(),
  policyIdA: text("policy_id_a").notNull().references(() => executivePolicies.id, { onDelete: "cascade" }),
  policyIdB: text("policy_id_b").notNull().references(() => executivePolicies.id, { onDelete: "cascade" }),
  userId: integer("user_id"),
  conflictType: text("conflict_type").notNull(),
  // contradicting | overlapping_domain | duplicate_guidance | priority_conflict |
  // deprecated_dependency | cycle
  severity: real("severity").notNull().default(0.5),
  description: text("description").notNull(),
  resolved: boolean("resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedBy: text("resolved_by"),                   // policyId that superseded, or "manual"
  detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
  payload: jsonb("payload").notNull().default({}),
});

// ── behavior_profiles ─────────────────────────────────────────────────────────

export const behaviorProfiles = pgTable("behavior_profiles", {
  id: text("id").primaryKey(),
  userId: integer("user_id"),
  name: text("name").notNull(),
  profileType: text("profile_type").notNull().default("balanced"),
  // conservative | balanced | aggressive | experimental | custom
  description: text("description").notNull(),
  activePolicyIds: jsonb("active_policy_ids").notNull().default([]),  // string[]
  policyCount: integer("policy_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(false),
  version: integer("version").notNull().default(1),
  activatedAt: timestamp("activated_at", { withTimezone: true }),
  deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  metadata: jsonb("metadata").notNull().default({}),
});

// ── behavior_snapshots ────────────────────────────────────────────────────────

export const behaviorSnapshots = pgTable("behavior_snapshots", {
  id: text("id").primaryKey(),
  userId: integer("user_id"),
  profileId: text("profile_id").references(() => behaviorProfiles.id, { onDelete: "set null" }),
  profileType: text("profile_type").notNull(),
  activePolicyIds: jsonb("active_policy_ids").notNull().default([]),   // snapshot of active policy IDs
  adaptationPlanId: text("adaptation_plan_id"),                         // plan that triggered this snapshot
  reason: text("reason").notNull(),                                     // "pre-adaptation" | "manual" | "rollback"
  isRollbackPoint: boolean("is_rollback_point").notNull().default(true),
  rolledBackAt: timestamp("rolled_back_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  payload: jsonb("payload").notNull().default({}),
});

// ── adaptation_plans ──────────────────────────────────────────────────────────

export const adaptationPlans = pgTable("adaptation_plans", {
  id: text("id").primaryKey(),
  userId: integer("user_id"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  policiesToActivate: jsonb("policies_to_activate").notNull().default([]),   // string[]
  policiesToRetire: jsonb("policies_to_retire").notNull().default([]),        // string[]
  targetProfileType: text("target_profile_type").notNull().default("balanced"),
  expectedImpact: text("expected_impact").notNull(),
  affectedCognitiveSystems: jsonb("affected_cognitive_systems").notNull().default([]), // string[]
  rollbackStrategy: text("rollback_strategy").notNull(),
  status: text("status").notNull().default("draft"),
  // draft | approved | executing | executed | rolled_back | failed
  snapshotId: text("snapshot_id"),                   // behavior_snapshots.id created before execution
  executedAt: timestamp("executed_at", { withTimezone: true }),
  rolledBackAt: timestamp("rolled_back_at", { withTimezone: true }),
  governanceReportId: text("governance_report_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  metadata: jsonb("metadata").notNull().default({}),
});

// ── governance_reports ────────────────────────────────────────────────────────

export const governanceReports = pgTable("governance_reports", {
  id: text("id").primaryKey(),
  userId: integer("user_id"),
  evaluatedPrincipleIds: jsonb("evaluated_principle_ids").notNull().default([]),
  approvedPolicyIds: jsonb("approved_policy_ids").notNull().default([]),
  rejectedPolicyIds: jsonb("rejected_policy_ids").notNull().default([]),
  deferredPrincipleIds: jsonb("deferred_principle_ids").notNull().default([]),
  conflictsFound: integer("conflicts_found").notNull().default(0),
  behaviorChanges: jsonb("behavior_changes").notNull().default([]),     // string[]
  rollbackPoints: jsonb("rollback_points").notNull().default([]),       // string[]
  executiveSummary: text("executive_summary").notNull(),
  governanceConfidence: real("governance_confidence").notNull().default(0.5),
  adaptationPlanId: text("adaptation_plan_id"),
  activeProfileId: text("active_profile_id"),
  activeProfileType: text("active_profile_type"),
  cycleVersion: integer("cycle_version").notNull().default(1),
  producedAt: timestamp("produced_at", { withTimezone: true }).notNull().defaultNow(),
  metadata: jsonb("metadata").notNull().default({}),
});

// ── governance_metrics ────────────────────────────────────────────────────────

export const governanceMetrics = pgTable("governance_metrics", {
  id: text("id").primaryKey(),
  userId: integer("user_id"),
  reportId: text("report_id").references(() => governanceReports.id, { onDelete: "cascade" }),
  metricKey: text("metric_key").notNull(),
  metricValue: real("metric_value"),
  windowLabel: text("window_label"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});
