// ── Build 040: Unified Cognitive Orchestration Engine — Schema ────────────
import { pgTable, serial, integer, text, real, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

// ── cognitive_cycles ──────────────────────────────────────────────────────
// One row per unified cognitive cycle executed by the orchestrator.
export const cognitiveCycles = pgTable("cognitive_cycles", {
  id:              serial("id").primaryKey(),
  userId:          integer("user_id"),
  totalEngines:    integer("total_engines").notNull().default(0),
  wavesExecuted:   integer("waves_executed").notNull().default(0),
  successCount:    integer("success_count").notNull().default(0),
  failureCount:    integer("failure_count").notNull().default(0),
  durationMs:      integer("duration_ms").notNull().default(0),
  confidenceScore: real("confidence_score").notNull().default(0),  // 0-1 composite
  evidenceItems:   integer("evidence_items").notNull().default(0),
  lawApplied:      boolean("law_applied").notNull().default(true),  // Unified Cognition Law
  pipelineComplete:boolean("pipeline_complete").notNull().default(false),
  topEngineId:     text("top_engine_id"),                           // highest-confidence engine
  notes:           text("notes"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
});

// ── execution_graphs ──────────────────────────────────────────────────────
// Engine participation record for each cognitive cycle.
export const executionGraphs = pgTable("execution_graphs", {
  id:           serial("id").primaryKey(),
  cycleId:      integer("cycle_id").notNull().references(() => cognitiveCycles.id),
  engineId:     text("engine_id").notNull(),
  engineTitle:  text("engine_title").notNull(),
  waveNumber:   integer("wave_number").notNull().default(1),
  executed:     boolean("executed").notNull().default(false),
  succeeded:    boolean("succeeded").notNull().default(false),
  durationMs:   integer("duration_ms").notNull().default(0),
  errorMessage: text("error_message"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

// ── orchestration_dependencies ────────────────────────────────────────────
// Declared dependency edges between cognitive engines (static, not per-cycle).
export const orchestrationDependencies = pgTable("orchestration_dependencies", {
  id:             serial("id").primaryKey(),
  engineId:       text("engine_id").notNull(),
  dependsOnId:    text("depends_on_id").notNull(),
  dependencyType: text("dependency_type").notNull().default("evidence"),  // evidence|context|confidence
  description:    text("description").notNull().default(""),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
});

// ── execution_waves ───────────────────────────────────────────────────────
// Execution wave records — each wave is a parallel execution group.
export const executionWaves = pgTable("execution_waves", {
  id:           serial("id").primaryKey(),
  cycleId:      integer("cycle_id").notNull().references(() => cognitiveCycles.id),
  waveNumber:   integer("wave_number").notNull(),
  engineIds:    jsonb("engine_ids").notNull().default([]),    // string[]
  startedAt:    timestamp("started_at").notNull().defaultNow(),
  durationMs:   integer("duration_ms").notNull().default(0),
  successCount: integer("success_count").notNull().default(0),
  failureCount: integer("failure_count").notNull().default(0),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

// ── execution_diagnostics ─────────────────────────────────────────────────
// Per-engine diagnostic record per cycle.
export const executionDiagnostics = pgTable("execution_diagnostics", {
  id:                   serial("id").primaryKey(),
  cycleId:              integer("cycle_id").notNull().references(() => cognitiveCycles.id),
  engineId:             text("engine_id").notNull(),
  waveNumber:           integer("wave_number").notNull().default(1),
  durationMs:           integer("duration_ms").notNull().default(0),
  succeeded:            boolean("succeeded").notNull().default(false),
  hasSummary:           boolean("has_summary").notNull().default(false),   // returned non-null summary
  dependencySatisfied:  boolean("dependency_satisfied").notNull().default(true),
  confidenceValue:      real("confidence_value"),                          // extracted from summary
  errorMessage:         text("error_message"),
  createdAt:            timestamp("created_at").notNull().defaultNow(),
});

// ── confidence_flows ──────────────────────────────────────────────────────
// Confidence propagation records — how certainty flows through the pipeline.
export const confidenceFlows = pgTable("confidence_flows", {
  id:               serial("id").primaryKey(),
  cycleId:          integer("cycle_id").notNull().references(() => cognitiveCycles.id),
  sourceEngineId:   text("source_engine_id").notNull(),
  targetEngineId:   text("target_engine_id").notNull(),
  sourceConfidence: real("source_confidence").notNull().default(0),
  propagatedValue:  real("propagated_value").notNull().default(0),
  attenuation:      real("attenuation").notNull().default(0),   // reduction applied
  notes:            text("notes"),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
});

// ── evidence_flows ────────────────────────────────────────────────────────
// Evidence propagation — upstream results consumed by downstream engines.
export const evidenceFlows = pgTable("evidence_flows", {
  id:               serial("id").primaryKey(),
  cycleId:          integer("cycle_id").notNull().references(() => cognitiveCycles.id),
  sourceEngineId:   text("source_engine_id").notNull(),
  targetEngineId:   text("target_engine_id").notNull(),
  evidenceType:     text("evidence_type").notNull(),  // summary|id|businessId|health
  evidenceKey:      text("evidence_key").notNull(),
  evidenceAvailable:boolean("evidence_available").notNull().default(false),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
});

// ── orchestration_registry ────────────────────────────────────────────────
// Authoritative record of every registered cognitive engine — one row per engine.
export const orchestrationRegistry = pgTable("orchestration_registry", {
  id:           serial("id").primaryKey(),
  engineId:     text("engine_id").notNull().unique(),
  engineTitle:  text("engine_title").notNull(),
  buildNumber:  integer("build_number").notNull().default(0),
  waveNumber:   integer("wave_number").notNull().default(1),
  dependencies: jsonb("dependencies").notNull().default([]),  // string[] of engineIds
  description:  text("description").notNull().default(""),
  lawCompliant: boolean("law_compliant").notNull().default(true),
  lastSeenAt:   timestamp("last_seen_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
});

// ── orchestration_snapshots ───────────────────────────────────────────────
// Platform-level aggregate snapshot per background rebuild — append-only.
export const orchestrationSnapshots = pgTable("orchestration_snapshots", {
  id:               serial("id").primaryKey(),
  totalEngines:     integer("total_engines").notNull().default(0),
  totalCycles:      integer("total_cycles").notNull().default(0),
  avgConfidence:    real("avg_confidence").notNull().default(0),
  avgDurationMs:    integer("avg_duration_ms").notNull().default(0),
  avgSuccessRate:   real("avg_success_rate").notNull().default(0),
  topEngineId:      text("top_engine_id"),
  lawComplianceRate:real("law_compliance_rate").notNull().default(1),
  waveCount:        integer("wave_count").notNull().default(0),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
});
