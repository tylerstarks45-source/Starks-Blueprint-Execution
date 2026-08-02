import { pgTable, serial, integer, text, real, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

// ── launch_findings ─────────────────────────────────────────────────────────
// Append-only. One row per audit finding. The audit is immutable — these
// rows are never updated after import.
export const launchFindings = pgTable("launch_findings", (t) => ({
  id:                     serial("id").primaryKey(),
  findingCode:            t.text("finding_code").notNull().unique(),   // e.g., "C-01"
  severity:               t.text("severity").notNull(),                // critical/high/medium/low
  title:                  t.text("title").notNull(),
  whyItMatters:           t.text("why_it_matters").notNull(),
  buildIntroduced:        t.text("build_introduced").notNull(),
  affectedFiles:          t.jsonb("affected_files").notNull().default([]),
  recommendedSolution:    t.text("recommended_solution").notNull(),
  complexity:             t.text("complexity").notNull(),             // trivial/low/medium/high
  fixBeforeLaunch:        t.boolean("fix_before_launch").notNull().default(true),
  category:               t.text("category").notNull(),              // security/correctness/performance/etc.
  auditSection:           t.text("audit_section").notNull(),         // "Part 1 — Critical" etc.
  createdAt:              t.timestamp("created_at").notNull().defaultNow(),
}));

// ── launch_hardening_registry ────────────────────────────────────────────────
// Mutable. One row per finding. Tracks current status and priority.
// Only this table may be updated — all other tables are append-only.
export const launchHardeningRegistry = pgTable("launch_hardening_registry", (t) => ({
  id:           serial("id").primaryKey(),
  findingId:    t.integer("finding_id").notNull(),    // FK → launch_findings.id
  findingCode:  t.text("finding_code").notNull().unique(),
  priority:     t.text("priority").notNull().default("PRE_LAUNCH"), // BLOCKER/PRE_LAUNCH/POST_LAUNCH/OBSERVATION
  status:       t.text("status").notNull().default("open"),         // open/in_progress/fixed/verified/deferred/accepted_risk
  assignedTo:   t.text("assigned_to"),
  targetBuild:  t.text("target_build"),
  dependsOn:    t.jsonb("depends_on").notNull().default([]),         // finding codes that must be fixed first
  notes:        t.text("notes"),
  updatedAt:    t.timestamp("updated_at").notNull().defaultNow(),
  createdAt:    t.timestamp("created_at").notNull().defaultNow(),
}));

// ── launch_remediation ───────────────────────────────────────────────────────
// Append-only. One row per remediation plan linked to a finding.
export const launchRemediation = pgTable("launch_remediation", (t) => ({
  id:                   serial("id").primaryKey(),
  findingId:            t.integer("finding_id").notNull(),
  findingCode:          t.text("finding_code").notNull(),
  planDescription:      t.text("plan_description").notNull(),
  estimatedComplexity:  t.text("estimated_complexity").notNull(),
  dependsOn:            t.jsonb("depends_on").notNull().default([]),  // finding codes
  buildNumber:          t.text("build_number"),                        // e.g., "045B"
  author:               t.text("author"),
  status:               t.text("status").notNull().default("planned"), // planned/in_progress/completed/abandoned
  completedAt:          t.timestamp("completed_at"),
  createdAt:            t.timestamp("created_at").notNull().defaultNow(),
}));

// ── launch_verification ──────────────────────────────────────────────────────
// Append-only. Records verification outcomes for each remediation.
export const launchVerification = pgTable("launch_verification", (t) => ({
  id:                 serial("id").primaryKey(),
  remediationId:      t.integer("remediation_id").notNull(),
  findingCode:        t.text("finding_code").notNull(),
  verificationMethod: t.text("verification_method").notNull(), // typecheck/test/manual/review/automated
  verificationResult: t.text("verification_result").notNull(), // pass/fail/partial
  verifiedBy:         t.text("verified_by").notNull(),
  verificationNotes:  t.text("verification_notes"),
  verifiedAt:         t.timestamp("verified_at").notNull().defaultNow(),
  createdAt:          t.timestamp("created_at").notNull().defaultNow(),
}));

// ── launch_regression ────────────────────────────────────────────────────────
// Append-only. Tracks regression risk analysis for each remediation.
export const launchRegression = pgTable("launch_regression", (t) => ({
  id:                  serial("id").primaryKey(),
  remediationId:       t.integer("remediation_id").notNull(),
  findingCode:         t.text("finding_code").notNull(),
  impactedSubsystems:  t.jsonb("impacted_subsystems").notNull().default([]),
  regressionRisk:      t.text("regression_risk").notNull().default("low"), // low/medium/high/critical
  regressionNotes:     t.text("regression_notes"),
  reviewedBy:          t.text("reviewed_by"),
  reviewedAt:          t.timestamp("reviewed_at"),
  approved:            t.boolean("approved").notNull().default(false),
  createdAt:           t.timestamp("created_at").notNull().defaultNow(),
}));

// ── launch_snapshots ─────────────────────────────────────────────────────────
// Append-only. Point-in-time hardening state after each build cycle.
export const launchSnapshots = pgTable("launch_snapshots", (t) => ({
  id:                   serial("id").primaryKey(),
  totalFindings:        t.integer("total_findings").notNull().default(0),
  criticalOpen:         t.integer("critical_open").notNull().default(0),
  highOpen:             t.integer("high_open").notNull().default(0),
  mediumOpen:           t.integer("medium_open").notNull().default(0),
  lowOpen:              t.integer("low_open").notNull().default(0),
  blockersRemaining:    t.integer("blockers_remaining").notNull().default(0),
  prelaunchRemaining:   t.integer("prelaunching_remaining").notNull().default(0),
  verifiedFixed:        t.integer("verified_fixed").notNull().default(0),
  deferredCount:        t.integer("deferred_count").notNull().default(0),
  acceptedRiskCount:    t.integer("accepted_risk_count").notNull().default(0),
  launchConfidence:     t.real("launch_confidence").notNull().default(0),
  launchStatus:         t.text("launch_status").notNull().default("NOT_READY"), // NOT_READY/CONDITIONAL/READY/LAUNCH_AUTHORIZED
  triggerBuild:         t.text("trigger_build"),
  snapshotData:         t.jsonb("snapshot_data").notNull().default({}),
  createdAt:            t.timestamp("created_at").notNull().defaultNow(),
}));
