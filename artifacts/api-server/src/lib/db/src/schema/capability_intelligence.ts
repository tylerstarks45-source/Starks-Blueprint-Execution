import { pgTable, serial, integer, text, boolean, timestamp, jsonb, real } from "drizzle-orm/pg-core";

// ============================================================
// Build 031 – Adaptive Capability Intelligence Engine
// Append-only / immutable except ci_capability_registry.
// FK order: ci_capability_registry (no FK) first; then:
//   → ci_capability_health → capability_reliability
//   → capability_availability → ci_capability_dependencies
//   → capability_forecasts → capability_optimizations
//   → capability_snapshots
// ============================================================

// -- Registry (one row per capability key; upserted) ---------
export const ciCapabilityRegistry = pgTable("ci_capability_registry", {
  id: serial("id").primaryKey(),
  capabilityKey: text("capability_key").notNull().unique(), // e.g. "browser:navigate"
  adapterType: text("adapter_type").notNull(),
  adapterIds: jsonb("adapter_ids").notNull().default("[]"), // text[] JSON
  currentHealth: text("current_health").notNull().default("unknown"),
  currentReadiness: text("current_readiness").notNull().default("unknown"),
  overallConfidence: real("overall_confidence").notNull().default(0),
  successRate: real("success_rate").notNull().default(0),
  avgLatencyMs: real("avg_latency_ms").notNull().default(0),
  totalExecutions: integer("total_executions").notNull().default(0),
  totalFailures: integer("total_failures").notNull().default(0),
  lastEvaluatedAt: timestamp("last_evaluated_at"),
  lastHealthAt: timestamp("last_health_at"),
  isAdminRestricted: boolean("is_admin_restricted").notNull().default(false),
  meta: jsonb("meta").notNull().default("{}"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// -- Health records (append-only) ----------------------------
export const ciCapabilityHealth = pgTable("ci_capability_health", {
  id: serial("id").primaryKey(),
  capabilityKey: text("capability_key").notNull(),
  adapterType: text("adapter_type").notNull(),
  status: text("status").notNull(), // healthy | warning | degraded | critical | unavailable
  latencyMs: real("latency_ms"),
  successRate: real("success_rate").notNull().default(0),
  errorRate: real("error_rate").notNull().default(0),
  checkedAt: timestamp("checked_at").notNull().defaultNow(),
  checkDuration: real("check_duration_ms"),
  errorMessage: text("error_message"),
  diagnostics: jsonb("diagnostics").notNull().default("{}"),
  triggeredBy: text("triggered_by").notNull().default("scheduler"), // scheduler | evaluate | manual
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// -- Reliability records (append-only) -----------------------
export const capabilityReliability = pgTable("capability_reliability", {
  id: serial("id").primaryKey(),
  capabilityKey: text("capability_key").notNull(),
  adapterType: text("adapter_type").notNull(),
  windowDays: integer("window_days").notNull().default(7), // rolling window
  totalExecutions: integer("total_executions").notNull().default(0),
  successCount: integer("success_count").notNull().default(0),
  failureCount: integer("failure_count").notNull().default(0),
  successRate: real("success_rate").notNull().default(0),
  failureRate: real("failure_rate").notNull().default(0),
  avgLatencyMs: real("avg_latency_ms").notNull().default(0),
  p95LatencyMs: real("p95_latency_ms").notNull().default(0),
  p99LatencyMs: real("p99_latency_ms").notNull().default(0),
  recoveryRate: real("recovery_rate").notNull().default(0), // % of failures recovered
  consistencyScore: real("consistency_score").notNull().default(0), // 0-1 latency variance score
  confidence: real("confidence").notNull().default(0),
  measuredAt: timestamp("measured_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// -- Availability records (append-only) ----------------------
export const capabilityAvailability = pgTable("capability_availability", {
  id: serial("id").primaryKey(),
  capabilityKey: text("capability_key").notNull(),
  adapterType: text("adapter_type").notNull(),
  windowDays: integer("window_days").notNull().default(30),
  uptimePercent: real("uptime_percent").notNull().default(100),
  downtimeMinutes: real("downtime_minutes").notNull().default(0),
  maintenanceWindowStart: timestamp("maintenance_window_start"),
  maintenanceWindowEnd: timestamp("maintenance_window_end"),
  hasScheduledMaintenance: boolean("has_scheduled_maintenance").notNull().default(false),
  connectivityStatus: text("connectivity_status").notNull().default("connected"), // connected | degraded | disconnected
  interruptionCount: integer("interruption_count").notNull().default(0),
  lastInterruptionAt: timestamp("last_interruption_at"),
  lastRestorationAt: timestamp("last_restoration_at"),
  serviceLevel: text("service_level").notNull().default("standard"), // standard | degraded | minimal | none
  measuredAt: timestamp("measured_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// -- Dependency records (append-only) ------------------------
export const ciCapabilityDependencies = pgTable("ci_capability_dependencies", {
  id: serial("id").primaryKey(),
  capabilityKey: text("capability_key").notNull(),
  adapterType: text("adapter_type").notNull(),
  dependencyKey: text("dependency_key").notNull(), // the depended-upon capability/resource
  dependencyType: text("dependency_type").notNull(), // adapter | service | credential | network | database | api
  isRequired: boolean("is_required").notNull().default(true),
  dependencyHealth: text("dependency_health").notNull().default("unknown"),
  upstreamRisk: text("upstream_risk").notNull().default("low"), // low | medium | high | critical
  downstreamImpact: text("downstream_impact").notNull().default("low"),
  sharedWith: jsonb("shared_with").notNull().default("[]"), // other capability keys sharing this dep
  assessedAt: timestamp("assessed_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// -- Forecasts (append-only) ----------------------------------
export const capabilityForecasts = pgTable("capability_forecasts", {
  id: serial("id").primaryKey(),
  capabilityKey: text("capability_key").notNull(),
  adapterType: text("adapter_type").notNull(),
  forecastType: text("forecast_type").notNull(), // degradation | capacity_exhaustion | rate_limit | credential_expiry | cert_expiry | version_incompatibility
  severity: text("severity").notNull().default("low"), // low | medium | high | critical
  probability: real("probability").notNull().default(0), // 0-1
  expectedAt: timestamp("expected_at"), // predicted event time (null = indeterminate)
  horizonDays: integer("horizon_days").notNull().default(30),
  triggerCondition: text("trigger_condition").notNull(),
  currentValue: real("current_value"), // e.g. current quota usage %
  thresholdValue: real("threshold_value"), // e.g. quota limit
  rationale: text("rationale").notNull(),
  recommendedAction: text("recommended_action").notNull(),
  isAdminOnly: boolean("is_admin_only").notNull().default(false),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// -- Optimizations (append-only) ------------------------------
export const capabilityOptimizations = pgTable("capability_optimizations", {
  id: serial("id").primaryKey(),
  capabilityKey: text("capability_key").notNull(),
  adapterType: text("adapter_type").notNull(),
  optimizationType: text("optimization_type").notNull(), // upgrade_adapter | rotate_credentials | increase_quota | install_newer | replace_deprecated | enable_caching | reduce_volume | other
  priority: text("priority").notNull().default("low"), // low | medium | high | critical
  title: text("title").notNull(),
  description: text("description").notNull(),
  expectedImpact: text("expected_impact").notNull(), // e.g. "+15% success rate"
  effort: text("effort").notNull().default("low"), // low | medium | high
  isAdminRecommendation: boolean("is_admin_recommendation").notNull().default(false),
  adminCategory: text("admin_category"), // gpu | cpu | ram | storage | database | vector_db | search | browser | model_provider | inference | adapter | credential | quota
  isApplied: boolean("is_applied").notNull().default(false),
  appliedAt: timestamp("applied_at"),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// -- Snapshots (append-only full state captures) -------------
export const capabilitySnapshots = pgTable("capability_snapshots", {
  id: serial("id").primaryKey(),
  snapshotType: text("snapshot_type").notNull().default("scheduled"), // scheduled | evaluate | manual
  totalCapabilities: integer("total_capabilities").notNull().default(0),
  healthyCount: integer("healthy_count").notNull().default(0),
  warningCount: integer("warning_count").notNull().default(0),
  degradedCount: integer("degraded_count").notNull().default(0),
  criticalCount: integer("critical_count").notNull().default(0),
  unavailableCount: integer("unavailable_count").notNull().default(0),
  avgConfidence: real("avg_confidence").notNull().default(0),
  avgSuccessRate: real("avg_success_rate").notNull().default(0),
  avgLatencyMs: real("avg_latency_ms").notNull().default(0),
  openForecasts: integer("open_forecasts").notNull().default(0),
  openOptimizations: integer("open_optimizations").notNull().default(0),
  adminRecommendationCount: integer("admin_recommendation_count").notNull().default(0),
  capabilityDetails: jsonb("capability_details").notNull().default("[]"),
  snapshotAt: timestamp("snapshot_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
