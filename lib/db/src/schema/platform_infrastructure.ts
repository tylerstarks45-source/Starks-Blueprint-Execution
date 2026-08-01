import { pgTable, serial, integer, text, boolean, timestamp, jsonb, real } from "drizzle-orm/pg-core";

// ============================================================
// Build 032 – Platform Infrastructure Intelligence Engine
// Append-only / immutable except platform_infrastructure_registry.
// FK insertion order:
//   platform_infrastructure_registry (no FK) →
//   resource_health → resource_capacity → resource_forecasts →
//   resource_dependencies → resource_alerts →
//   resource_recommendations → platform_performance →
//   infrastructure_snapshots
// ============================================================

// -- Registry (one row per resource key; upserted) -----------
export const platformInfrastructureRegistry = pgTable("platform_infrastructure_registry", {
  id: serial("id").primaryKey(),
  resourceKey: text("resource_key").notNull().unique(), // e.g. "cpu:primary", "ram:system", "storage:disk0"
  resourceType: text("resource_type").notNull(), // cpu | ram | gpu | gpu_memory | storage | database | vector_db | network | execution_queue | adapter_pool | model_provider | api_quota | cache | browser_pool | worker_pool | execution_throughput
  resourceName: text("resource_name").notNull(),
  description: text("description"),
  currentHealth: text("current_health").notNull().default("unknown"),
  currentUtilizationPercent: real("current_utilization_percent").notNull().default(0),
  totalCapacity: real("total_capacity"), // in units appropriate for resource type
  usedCapacity: real("used_capacity"),
  availableCapacity: real("available_capacity"),
  capacityUnit: text("capacity_unit"), // GB | %, requests/min, workers, connections, etc.
  pressureLevel: text("pressure_level").notNull().default("none"), // none | low | medium | high | critical
  isAdminRestricted: boolean("is_admin_restricted").notNull().default(true),
  lastScannedAt: timestamp("last_scanned_at"),
  lastHealthAt: timestamp("last_health_at"),
  meta: jsonb("meta").notNull().default("{}"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// -- Resource health records (append-only) -------------------
export const resourceHealth = pgTable("resource_health", {
  id: serial("id").primaryKey(),
  resourceKey: text("resource_key").notNull(),
  resourceType: text("resource_type").notNull(),
  status: text("status").notNull(), // healthy | warning | degraded | critical | unavailable
  utilizationPercent: real("utilization_percent").notNull().default(0),
  pressureLevel: text("pressure_level").notNull().default("none"),
  latencyMs: real("latency_ms"),
  errorRate: real("error_rate").notNull().default(0),
  observedAt: timestamp("observed_at").notNull().defaultNow(),
  triggeredBy: text("triggered_by").notNull().default("scan"),
  diagnostics: jsonb("diagnostics").notNull().default("{}"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// -- Resource capacity records (append-only) -----------------
export const resourceCapacity = pgTable("resource_capacity", {
  id: serial("id").primaryKey(),
  resourceKey: text("resource_key").notNull(),
  resourceType: text("resource_type").notNull(),
  totalCapacity: real("total_capacity").notNull().default(0),
  usedCapacity: real("used_capacity").notNull().default(0),
  availableCapacity: real("available_capacity").notNull().default(0),
  reservedCapacity: real("reserved_capacity").notNull().default(0),
  peakUsed: real("peak_used").notNull().default(0),
  utilizationPercent: real("utilization_percent").notNull().default(0),
  capacityUnit: text("capacity_unit").notNull().default("%"),
  growthRatePerDay: real("growth_rate_per_day").notNull().default(0),
  daysToExhaustion: real("days_to_exhaustion"), // null = not at risk
  measuredAt: timestamp("measured_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// -- Resource forecasts (append-only) ------------------------
export const resourceForecasts = pgTable("resource_forecasts", {
  id: serial("id").primaryKey(),
  resourceKey: text("resource_key").notNull(),
  resourceType: text("resource_type").notNull(),
  forecastType: text("forecast_type").notNull(), // exhaustion | pressure | degradation | quota_limit | growth_spike
  severity: text("severity").notNull().default("low"),
  probability: real("probability").notNull().default(0),
  expectedAt: timestamp("expected_at"),
  horizonDays: integer("horizon_days").notNull().default(30),
  currentUtilization: real("current_utilization").notNull().default(0),
  projectedUtilization: real("projected_utilization").notNull().default(0),
  triggerCondition: text("trigger_condition").notNull(),
  rationale: text("rationale").notNull(),
  recommendedAction: text("recommended_action").notNull(),
  isAdminOnly: boolean("is_admin_only").notNull().default(true),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// -- Resource dependencies (append-only) ---------------------
export const resourceDependencies = pgTable("resource_dependencies", {
  id: serial("id").primaryKey(),
  resourceKey: text("resource_key").notNull(),
  dependsOnKey: text("depends_on_key").notNull(), // upstream resource key
  dependencyType: text("dependency_type").notNull(), // requires | shares | chains | buffers
  isRequired: boolean("is_required").notNull().default(true),
  dependencyHealth: text("dependency_health").notNull().default("unknown"),
  cascadeRisk: text("cascade_risk").notNull().default("low"),
  sharedConsumers: jsonb("shared_consumers").notNull().default("[]"),
  assessedAt: timestamp("assessed_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// -- Resource alerts (append-only) ---------------------------
export const resourceAlerts = pgTable("resource_alerts", {
  id: serial("id").primaryKey(),
  resourceKey: text("resource_key").notNull(),
  resourceType: text("resource_type").notNull(),
  alertType: text("alert_type").notNull(), // utilization_high | capacity_low | health_degraded | latency_spike | error_spike | exhaustion_imminent
  severity: text("severity").notNull().default("low"),
  message: text("message").notNull(),
  currentValue: real("current_value"),
  thresholdValue: real("threshold_value"),
  isAcknowledged: boolean("is_acknowledged").notNull().default(false),
  acknowledgedAt: timestamp("acknowledged_at"),
  isAdminOnly: boolean("is_admin_only").notNull().default(true),
  triggeredAt: timestamp("triggered_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// -- Resource recommendations (append-only) ------------------
export const resourceRecommendations = pgTable("resource_recommendations", {
  id: serial("id").primaryKey(),
  resourceKey: text("resource_key").notNull(),
  resourceType: text("resource_type").notNull(),
  recommendationType: text("recommendation_type").notNull(), // gpu_expansion | ram_expansion | cpu_scaling | worker_scaling | database_scaling | vector_db_scaling | storage_expansion | model_provider_optimization | queue_optimization | browser_pool_expansion | cache_optimization | search_expansion | inference_migration
  priority: text("priority").notNull().default("low"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  evidence: text("evidence").notNull(),
  currentUtilization: real("current_utilization"),
  historicalTrend: text("historical_trend"),
  predictedExhaustion: text("predicted_exhaustion"),
  expectedImprovement: text("expected_improvement").notNull(),
  estimatedCostImpact: text("estimated_cost_impact"),
  confidence: real("confidence").notNull().default(0),
  alternatives: jsonb("alternatives").notNull().default("[]"),
  risksIfIgnored: text("risks_if_ignored").notNull(),
  isAdminOnly: boolean("is_admin_only").notNull().default(true),
  isApplied: boolean("is_applied").notNull().default(false),
  appliedAt: timestamp("applied_at"),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// -- Platform performance records (append-only) --------------
export const platformPerformance = pgTable("platform_performance", {
  id: serial("id").primaryKey(),
  measurementType: text("measurement_type").notNull(), // throughput | latency | utilization | concurrency | efficiency | bottleneck
  resourceKey: text("resource_key"),
  throughputRpm: real("throughput_rpm"),         // requests per minute
  avgLatencyMs: real("avg_latency_ms"),
  p95LatencyMs: real("p95_latency_ms"),
  p99LatencyMs: real("p99_latency_ms"),
  concurrentWorkers: integer("concurrent_workers"),
  queueDepth: integer("queue_depth"),
  errorRate: real("error_rate").notNull().default(0),
  utilizationPercent: real("utilization_percent").notNull().default(0),
  efficiencyScore: real("efficiency_score").notNull().default(0), // 0-1
  bottleneckResource: text("bottleneck_resource"),
  bottleneckSeverity: text("bottleneck_severity").notNull().default("none"),
  measuredAt: timestamp("measured_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// -- Infrastructure snapshots (append-only full captures) ----
export const infrastructureSnapshots = pgTable("infrastructure_snapshots", {
  id: serial("id").primaryKey(),
  snapshotType: text("snapshot_type").notNull().default("scheduled"),
  totalResources: integer("total_resources").notNull().default(0),
  healthyCount: integer("healthy_count").notNull().default(0),
  warningCount: integer("warning_count").notNull().default(0),
  degradedCount: integer("degraded_count").notNull().default(0),
  criticalCount: integer("critical_count").notNull().default(0),
  unavailableCount: integer("unavailable_count").notNull().default(0),
  avgUtilizationPercent: real("avg_utilization_percent").notNull().default(0),
  overallPressure: text("overall_pressure").notNull().default("none"),
  platformReadiness: text("platform_readiness").notNull().default("unknown"), // ready | limited | at_risk | degraded | unavailable
  openAlerts: integer("open_alerts").notNull().default(0),
  openForecasts: integer("open_forecasts").notNull().default(0),
  adminRecommendationCount: integer("admin_recommendation_count").notNull().default(0),
  resourceDetails: jsonb("resource_details").notNull().default("[]"),
  performanceSummary: jsonb("performance_summary").notNull().default("{}"),
  snapshotAt: timestamp("snapshot_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
