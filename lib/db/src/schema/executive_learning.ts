// ─── Build 013: Executive Principle Learning Engine ──────────────────────────
//
// 9 tables:
//   executive_principles       — core principle objects (versioned, never deleted)
//   principle_evidence         — supporting and contradictory evidence per principle
//   principle_versions         — immutable revision history
//   learning_reports           — immutable learning-cycle output documents
//   learning_metrics           — KV metrics per learning cycle
//   principle_contradictions   — contradiction tracking between principles and cases
//   principle_validation_hist  — validation decisions log (immutable)
//   principle_categories       — domain/category taxonomy seed and extension surface
//   principle_relationships    — Executive Principle Graph: typed directed edges

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

// ── executive_principles ──────────────────────────────────────────────────────

export const executivePrinciples = pgTable("executive_principles", {
  id: text("id").primaryKey(),
  userId: integer("user_id"),                         // owner (null = platform-wide)
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull().default("general"),
  businessDomain: text("business_domain").notNull().default("general"),
  strategicCategory: text("strategic_category").notNull().default("general"),
  originCases: jsonb("origin_cases").notNull().default([]),   // string[]
  supportingEvidence: real("supporting_evidence").notNull().default(0),     // 0-1
  contradictoryEvidence: real("contradictory_evidence").notNull().default(0), // 0-1
  confidence: real("confidence").notNull().default(0.5),                    // 0-1
  reliability: real("reliability").notNull().default(0.5),                  // 0-1
  novelty: real("novelty").notNull().default(0.5),                          // 0-1
  generality: real("generality").notNull().default(0.5),                    // 0-1
  applicability: real("applicability").notNull().default(0.5),              // 0-1
  successRate: real("success_rate").notNull().default(0),                   // 0-1
  failureRate: real("failure_rate").notNull().default(0),                   // 0-1
  timesObserved: integer("times_observed").notNull().default(0),
  timesConfirmed: integer("times_confirmed").notNull().default(0),
  timesContradicted: integer("times_contradicted").notNull().default(0),
  status: text("status").notNull().default("draft"),
  // draft | candidate | validated | deprecated | archived
  version: integer("version").notNull().default(1),
  patternType: text("pattern_type"),                  // source pattern type
  patternFrequency: integer("pattern_frequency").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  validatedAt: timestamp("validated_at", { withTimezone: true }),
  deprecatedAt: timestamp("deprecated_at", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  metadata: jsonb("metadata").notNull().default({}),
});

// ── principle_evidence ────────────────────────────────────────────────────────

export const principleEvidence = pgTable("principle_evidence", {
  id: text("id").primaryKey(),
  principleId: text("principle_id").notNull().references(() => executivePrinciples.id, { onDelete: "cascade" }),
  userId: integer("user_id"),
  caseId: text("case_id"),                            // executive_cases.id
  reportId: text("report_id"),                        // reflection_reports.id
  evidenceType: text("evidence_type").notNull(),      // supporting | contradictory | neutral
  summary: text("summary").notNull(),
  strength: real("strength").notNull().default(0.5),  // 0-1
  businessDomain: text("business_domain"),
  qualityScore: real("quality_score"),                // overall reflection quality at time
  outcomeStatus: text("outcome_status"),              // completed | failed | partial
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  payload: jsonb("payload").notNull().default({}),
});

// ── principle_versions ────────────────────────────────────────────────────────

export const principleVersions = pgTable("principle_versions", {
  id: text("id").primaryKey(),
  principleId: text("principle_id").notNull().references(() => executivePrinciples.id, { onDelete: "cascade" }),
  userId: integer("user_id"),
  version: integer("version").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull(),
  confidence: real("confidence").notNull(),
  timesObserved: integer("times_observed").notNull().default(0),
  timesConfirmed: integer("times_confirmed").notNull().default(0),
  timesContradicted: integer("times_contradicted").notNull().default(0),
  changeReason: text("change_reason"),
  snapshotAt: timestamp("snapshot_at", { withTimezone: true }).notNull().defaultNow(),
  payload: jsonb("payload").notNull().default({}),
});

// ── learning_reports ──────────────────────────────────────────────────────────

export const learningReports = pgTable("learning_reports", {
  id: text("id").primaryKey(),
  userId: integer("user_id"),
  newPrincipleIds: jsonb("new_principle_ids").notNull().default([]),
  strengthenedPrincipleIds: jsonb("strengthened_principle_ids").notNull().default([]),
  weakeningPrincipleIds: jsonb("weakening_principle_ids").notNull().default([]),
  deprecatedPrincipleIds: jsonb("deprecated_principle_ids").notNull().default([]),
  evidenceSummary: text("evidence_summary").notNull(),
  confidenceChanges: jsonb("confidence_changes").notNull().default({}), // { principleId: delta }
  businessImpact: text("business_impact"),
  learningConfidence: real("learning_confidence").notNull().default(0.5),
  casesAnalyzed: integer("cases_analyzed").notNull().default(0),
  reportsAnalyzed: integer("reports_analyzed").notNull().default(0),
  patternsDiscovered: integer("patterns_discovered").notNull().default(0),
  principlesExtracted: integer("principles_extracted").notNull().default(0),
  principlesValidated: integer("principles_validated").notNull().default(0),
  cycleVersion: integer("cycle_version").notNull().default(1),
  producedAt: timestamp("produced_at", { withTimezone: true }).notNull().defaultNow(),
  metadata: jsonb("metadata").notNull().default({}),
});

// ── learning_metrics ──────────────────────────────────────────────────────────

export const learningMetrics = pgTable("learning_metrics", {
  id: text("id").primaryKey(),
  userId: integer("user_id"),
  reportId: text("report_id").references(() => learningReports.id, { onDelete: "cascade" }),
  metricKey: text("metric_key").notNull(),
  metricValue: real("metric_value"),
  windowLabel: text("window_label"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── principle_contradictions ──────────────────────────────────────────────────

export const principleContradictions = pgTable("principle_contradictions", {
  id: text("id").primaryKey(),
  principleId: text("principle_id").notNull().references(() => executivePrinciples.id, { onDelete: "cascade" }),
  userId: integer("user_id"),
  contradictingCaseId: text("contradicting_case_id"),    // executive_cases.id
  contradictingReportId: text("contradicting_report_id"), // reflection_reports.id
  contradictionType: text("contradiction_type").notNull(), // direct | partial | domain_drift | assumption_expired
  severity: real("severity").notNull().default(0.5),       // 0-1
  description: text("description").notNull(),
  confidenceImpact: real("confidence_impact").notNull().default(-0.05), // negative
  resolved: boolean("resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  payload: jsonb("payload").notNull().default({}),
});

// ── principle_validation_hist ─────────────────────────────────────────────────

export const principleValidationHist = pgTable("principle_validation_hist", {
  id: text("id").primaryKey(),
  principleId: text("principle_id").notNull().references(() => executivePrinciples.id, { onDelete: "cascade" }),
  userId: integer("user_id"),
  validationResult: text("validation_result").notNull(), // passed | failed | deferred
  previousStatus: text("previous_status").notNull(),
  newStatus: text("new_status").notNull(),
  minObservationsMet: boolean("min_observations_met").notNull().default(false),
  minSupportMet: boolean("min_support_met").notNull().default(false),
  maxContradictionMet: boolean("max_contradiction_met").notNull().default(false),
  minConfidenceMet: boolean("min_confidence_met").notNull().default(false),
  businessSignificanceMet: boolean("business_significance_met").notNull().default(false),
  strategicSignificanceMet: boolean("strategic_significance_met").notNull().default(false),
  confidenceAtValidation: real("confidence_at_validation").notNull().default(0),
  observationsAtValidation: integer("observations_at_validation").notNull().default(0),
  failureReasons: jsonb("failure_reasons").notNull().default([]),
  validatedAt: timestamp("validated_at", { withTimezone: true }).notNull().defaultNow(),
  payload: jsonb("payload").notNull().default({}),
});

// ── principle_categories ──────────────────────────────────────────────────────

export const principleCategories = pgTable("principle_categories", {
  id: serial("id").primaryKey(),
  categoryKey: text("category_key").notNull().unique(),
  categoryType: text("category_type").notNull(), // business_domain | strategic_category | principle_category
  label: text("label").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── principle_relationships (Executive Principle Graph) ───────────────────────

export const principleRelationships = pgTable("principle_relationships", {
  id: text("id").primaryKey(),
  fromPrincipleId: text("from_principle_id").notNull().references(() => executivePrinciples.id, { onDelete: "cascade" }),
  toPrincipleId: text("to_principle_id").notNull().references(() => executivePrinciples.id, { onDelete: "cascade" }),
  relationType: text("relation_type").notNull(),
  // supports | contradicts | generalizes | specializes | depends_on | supersedes | related_to
  strength: real("strength").notNull().default(0.5),   // 0-1
  userId: integer("user_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
