// ── Build 045: Cognitive Certification & Launch Readiness Framework — Schema
import { pgTable, serial, integer, text, real, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

// ── certification_runs ────────────────────────────────────────────────────
// A full certification run — triggered by admin, records overall outcome.
export const certificationRuns = pgTable("certification_runs", {
  id:           serial("id").primaryKey(),
  runName:      text("run_name").notNull(),
  status:       text("status").notNull().default("pending"),
  // pending/running/completed/failed
  startedAt:    timestamp("started_at").notNull().defaultNow(),
  completedAt:  timestamp("completed_at"),
  triggeredBy:  integer("triggered_by"),              // admin userId
  totalDomains: integer("total_domains").notNull().default(0),
  passedDomains:integer("passed_domains").notNull().default(0),
  failedDomains:integer("failed_domains").notNull().default(0),
  overallScore: real("overall_score").notNull().default(0),
  metadata:     jsonb("metadata").notNull().default({}),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

// ── certification_domains ─────────────────────────────────────────────────
// Per-domain certification result within a run.
export const certificationDomains = pgTable("certification_domains", {
  id:          serial("id").primaryKey(),
  runId:       integer("run_id").notNull(),
  domainName:  text("domain_name").notNull(),
  status:      text("status").notNull().default("pending"),
  // pass/fail/warning/skipped
  score:       real("score").notNull().default(0),
  findings:    jsonb("findings").notNull().default([]),
  evidence:    jsonb("evidence").notNull().default({}),
  certifiedAt: timestamp("certified_at"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

// ── validation_rules ──────────────────────────────────────────────────────
// Catalog of all validation rules the framework enforces.
export const validationRules = pgTable("validation_rules", {
  id:          serial("id").primaryKey(),
  ruleCode:    text("rule_code").notNull().unique(),
  ruleName:    text("rule_name").notNull(),
  domain:      text("domain").notNull(),
  severity:    text("severity").notNull().default("high"),
  // critical/high/medium/low
  description: text("description").notNull(),
  active:      boolean("active").notNull().default(true),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

// ── health_checks ─────────────────────────────────────────────────────────
// Per-domain health measurement within a certification run.
export const healthChecks = pgTable("health_checks", {
  id:               serial("id").primaryKey(),
  runId:            integer("run_id").notNull(),
  domainName:       text("domain_name").notNull(),
  checkType:        text("check_type").notNull(),        // availability/reliability/performance/coverage/consistency/confidence
  available:        boolean("available").notNull().default(true),
  latencyMs:        integer("latency_ms").notNull().default(0),
  reliabilityScore: real("reliability_score").notNull().default(1.0),
  coverageScore:    real("coverage_score").notNull().default(1.0),
  consistencyScore: real("consistency_score").notNull().default(1.0),
  confidenceScore:  real("confidence_score").notNull().default(1.0),
  healthScore:      real("health_score").notNull().default(1.0),
  details:          jsonb("details").notNull().default({}),
  measuredAt:       timestamp("measured_at").notNull().defaultNow(),
});

// ── compliance_results ────────────────────────────────────────────────────
// Result of checking each permanent architectural law.
export const complianceResults = pgTable("compliance_results", {
  id:         serial("id").primaryKey(),
  runId:      integer("run_id").notNull(),
  lawName:    text("law_name").notNull(),
  lawDomain:  text("law_domain").notNull(),
  compliant:  boolean("compliant").notNull().default(false),
  evidence:   jsonb("evidence").notNull().default({}),
  findings:   text("findings"),
  measuredAt: timestamp("measured_at").notNull().defaultNow(),
});

// ── launch_reports ────────────────────────────────────────────────────────
// Full launch readiness report generated after a certification run.
export const launchReports = pgTable("launch_reports", {
  id:              serial("id").primaryKey(),
  runId:           integer("run_id").notNull().unique(),
  launchScore:     real("launch_score").notNull().default(0),
  readinessLevel:  text("readiness_level").notNull().default("not_ready"),
  // not_ready/conditional/ready/certified
  criticalIssues:  jsonb("critical_issues").notNull().default([]),
  warnings:        jsonb("warnings").notNull().default([]),
  recommendations: jsonb("recommendations").notNull().default([]),
  blockedItems:    jsonb("blocked_items").notNull().default([]),
  certifiedAt:     timestamp("certified_at"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
});

// ── certification_registry ────────────────────────────────────────────────
// Mutable: latest certification state per domain.
export const certificationRegistry = pgTable("certification_registry", {
  id:          serial("id").primaryKey(),
  domain:      text("domain").notNull().unique(),
  lastRunId:   integer("last_run_id"),
  lastStatus:  text("last_status").notNull().default("pending"),
  lastScore:   real("last_score").notNull().default(0),
  lastChecked: timestamp("last_checked"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

// ── certification_snapshots ───────────────────────────────────────────────
// Append-only point-in-time view of the full certification state.
export const certificationSnapshots = pgTable("certification_snapshots", {
  id:                  serial("id").primaryKey(),
  runId:               integer("run_id"),
  totalDomains:        integer("total_domains").notNull().default(0),
  passedDomains:       integer("passed_domains").notNull().default(0),
  failedDomains:       integer("failed_domains").notNull().default(0),
  warnedDomains:       integer("warned_domains").notNull().default(0),
  overallScore:        real("overall_score").notNull().default(0),
  readinessLevel:      text("readiness_level").notNull().default("not_ready"),
  lawComplianceScore:  real("law_compliance_score").notNull().default(0),
  launchReady:         boolean("launch_ready").notNull().default(false),
  snapshotData:        jsonb("snapshot_data").notNull().default({}),
  createdAt:           timestamp("created_at").notNull().defaultNow(),
});

// ── administrator_signoffs ────────────────────────────────────────────────
// Administrator manual approval — final launch authority.
export const administratorSignoffs = pgTable("administrator_signoffs", {
  id:            serial("id").primaryKey(),
  runId:         integer("run_id").notNull(),
  adminId:       integer("admin_id").notNull(),
  signoffStatus: text("signoff_status").notNull().default("pending"),
  // pending/approved/rejected
  notes:         text("notes"),
  signedAt:      timestamp("signed_at"),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
});
