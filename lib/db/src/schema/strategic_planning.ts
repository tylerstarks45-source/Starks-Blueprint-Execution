import { pgTable, text, integer, real, jsonb, timestamp } from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────────────────────────────────────
// Build 021: Strategic Planning Engine — 8 tables
// Transforms Executive Strategy into structured strategic plans.
// Append-only / immutable except planning_registry.
// FK insertion order: planning_reports → strategic_plans → strategic_programs
//   → strategic_initiatives → planning_milestones → planning_dependencies
//   → planning_sequences → planning_registry
// ─────────────────────────────────────────────────────────────────────────────

// Root immutable record — persisted FIRST in every run
export const planningReports = pgTable("planning_reports", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  userId: integer("user_id"),
  strategyReportId: text("strategy_report_id"),
  primaryPlanId: text("primary_plan_id"),
  programCount: integer("program_count").notNull().default(0),
  initiativeCount: integer("initiative_count").notNull().default(0),
  milestoneCount: integer("milestone_count").notNull().default(0),
  dependencyCount: integer("dependency_count").notNull().default(0),
  sequenceCount: integer("sequence_count").notNull().default(0),
  overallReadinessScore: real("overall_readiness_score"),
  overallConfidence: real("overall_confidence"),
  completenessScore: real("completeness_score"),
  feasibilityScore: real("feasibility_score"),
  alignmentScore: real("alignment_score"),
  executiveSummary: text("executive_summary").notNull().default(""),
  planningDurationMs: integer("planning_duration_ms").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// One strategic plan per report
export const strategicPlans = pgTable("strategic_plans", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull().references(() => planningReports.id, { onDelete: "cascade" }),
  businessId: integer("business_id").notNull(),
  userId: integer("user_id"),
  strategyId: text("strategy_id"),
  strategyReportId: text("strategy_report_id"),
  planName: text("plan_name").notNull(),
  planDescription: text("plan_description").notNull(),
  planHorizon: text("plan_horizon").notNull().default("medium"), // short | medium | long
  programCount: integer("program_count").notNull().default(0),
  initiativeCount: integer("initiative_count").notNull().default(0),
  milestoneCount: integer("milestone_count").notNull().default(0),
  dependencyCount: integer("dependency_count").notNull().default(0),
  readinessScore: real("readiness_score"),
  completenessScore: real("completeness_score"),
  feasibilityScore: real("feasibility_score"),
  alignmentScore: real("alignment_score"),
  complexityScore: real("complexity_score"),
  riskScore: real("risk_score"),
  confidence: real("confidence"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Strategic programs — one per pillar, major organisational unit
export const strategicPrograms = pgTable("strategic_programs", {
  id: text("id").primaryKey(),
  planId: text("plan_id").notNull().references(() => strategicPlans.id, { onDelete: "cascade" }),
  reportId: text("report_id").notNull(),
  businessId: integer("business_id").notNull(),
  pillarId: text("pillar_id"),
  pillarType: text("pillar_type").notNull(),
  programType: text("program_type").notNull(),
  programName: text("program_name").notNull(),
  programDescription: text("program_description").notNull(),
  priority: integer("priority").notNull().default(5),
  weight: real("weight").notNull().default(0.11),
  expectedDuration: text("expected_duration").notNull().default("medium"), // short | medium | long
  initiativeCount: integer("initiative_count").notNull().default(0),
  sequenceLayer: integer("sequence_layer").notNull().default(0),
  alignmentScore: real("alignment_score"),
  confidence: real("confidence"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Strategic initiatives — major bodies of work beneath each program (never individual tasks)
export const strategicInitiatives = pgTable("strategic_initiatives", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull().references(() => strategicPrograms.id, { onDelete: "cascade" }),
  planId: text("plan_id").notNull(),
  reportId: text("report_id").notNull(),
  businessId: integer("business_id").notNull(),
  initiativeName: text("initiative_name").notNull(),
  initiativeDescription: text("initiative_description").notNull(),
  initiativeType: text("initiative_type").notNull(), // discovery | development | deployment | optimisation | governance
  effort: text("effort").notNull().default("medium"), // low | medium | high
  complexity: text("complexity").notNull().default("medium"), // low | medium | high
  priority: integer("priority").notNull().default(5),
  sequencePosition: integer("sequence_position").notNull().default(0),
  milestoneCount: integer("milestone_count").notNull().default(0),
  alignmentScore: real("alignment_score"),
  confidence: real("confidence"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Planning milestones — outcome checkpoints (not calendar dates)
export const planningMilestones = pgTable("planning_milestones", {
  id: text("id").primaryKey(),
  initiativeId: text("initiative_id").notNull().references(() => strategicInitiatives.id, { onDelete: "cascade" }),
  programId: text("program_id").notNull(),
  planId: text("plan_id").notNull(),
  reportId: text("report_id").notNull(),
  businessId: integer("business_id").notNull(),
  milestoneType: text("milestone_type").notNull(), // foundation | progress | achievement | validation
  milestoneName: text("milestone_name").notNull(),
  milestoneDescription: text("milestone_description").notNull(),
  successCriteria: text("success_criteria").notNull(),
  sequencePosition: integer("sequence_position").notNull().default(0),
  isCriticalPath: integer("is_critical_path").notNull().default(0), // 0=false 1=true
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Planning dependencies — cross-program/initiative/technology/resource/cross-functional
export const planningDependencies = pgTable("planning_dependencies", {
  id: text("id").primaryKey(),
  planId: text("plan_id").notNull().references(() => strategicPlans.id, { onDelete: "cascade" }),
  reportId: text("report_id").notNull(),
  businessId: integer("business_id").notNull(),
  dependencyType: text("dependency_type").notNull(), // program | initiative | technology | resource | cross_functional
  title: text("title").notNull(),
  description: text("description").notNull(),
  fromEntityType: text("from_entity_type"), // program | initiative
  fromEntityId: text("from_entity_id"),
  toEntityType: text("to_entity_type"),
  toEntityId: text("to_entity_id"),
  severity: text("severity").notNull().default("medium"), // low | medium | high | critical
  mitigationNote: text("mitigation_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Planning sequences — logical execution order (dependency-aware, NOT scheduling)
export const planningSequences = pgTable("planning_sequences", {
  id: text("id").primaryKey(),
  planId: text("plan_id").notNull().references(() => strategicPlans.id, { onDelete: "cascade" }),
  reportId: text("report_id").notNull(),
  businessId: integer("business_id").notNull(),
  entityType: text("entity_type").notNull(), // program | initiative
  entityId: text("entity_id").notNull(),
  entityName: text("entity_name").notNull(),
  sequenceLayer: integer("sequence_layer").notNull().default(0), // 0=first, higher=later
  sequencePosition: integer("sequence_position").notNull().default(0), // within layer
  predecessorIds: jsonb("predecessor_ids").notNull().default("[]"),
  canParallelise: integer("can_parallelise").notNull().default(0), // 0=false 1=true
  rationale: text("rationale").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Planning registry — one row per business (upserted), tracks cumulative state
export const planningRegistry = pgTable("planning_registry", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull().unique(),
  userId: integer("user_id"),
  totalPlans: integer("total_plans").notNull().default(0),
  totalReports: integer("total_reports").notNull().default(0),
  latestReportId: text("latest_report_id"),
  latestPlanId: text("latest_plan_id"),
  latestProgramCount: integer("latest_program_count"),
  latestInitiativeCount: integer("latest_initiative_count"),
  latestMilestoneCount: integer("latest_milestone_count"),
  latestReadinessScore: real("latest_readiness_score"),
  latestConfidence: real("latest_confidence"),
  lastPlanningAt: timestamp("last_planning_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
