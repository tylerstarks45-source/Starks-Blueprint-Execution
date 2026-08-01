// ============================================================
// Build 032 – Platform Infrastructure Intelligence Engine
// All types defined locally — no circular imports.
// ============================================================

// ── Resource Types ───────────────────────────────────────────
export type ResourceType =
  | "cpu"
  | "ram"
  | "gpu"
  | "gpu_memory"
  | "storage"
  | "database"
  | "vector_db"
  | "network"
  | "execution_queue"
  | "adapter_pool"
  | "model_provider"
  | "api_quota"
  | "cache"
  | "browser_pool"
  | "worker_pool"
  | "execution_throughput";

export const ALL_RESOURCE_TYPES: ResourceType[] = [
  "cpu", "ram", "gpu", "gpu_memory", "storage", "database", "vector_db",
  "network", "execution_queue", "adapter_pool", "model_provider", "api_quota",
  "cache", "browser_pool", "worker_pool", "execution_throughput",
];

// ── Health / Pressure ────────────────────────────────────────
export type InfraHealthStatus = "healthy" | "warning" | "degraded" | "critical" | "unavailable" | "unknown";
export type PressureLevel = "none" | "low" | "medium" | "high" | "critical";
export type PlatformReadiness = "ready" | "limited" | "at_risk" | "degraded" | "unavailable" | "unknown";

// ── Forecast / Alert Types ───────────────────────────────────
export type ForecastType = "exhaustion" | "pressure" | "degradation" | "quota_limit" | "growth_spike";
export type AlertType =
  | "utilization_high"
  | "capacity_low"
  | "health_degraded"
  | "latency_spike"
  | "error_spike"
  | "exhaustion_imminent";

// ── Recommendation Types ─────────────────────────────────────
export type RecommendationType =
  | "gpu_expansion"
  | "ram_expansion"
  | "cpu_scaling"
  | "worker_scaling"
  | "database_scaling"
  | "vector_db_scaling"
  | "storage_expansion"
  | "model_provider_optimization"
  | "queue_optimization"
  | "browser_pool_expansion"
  | "cache_optimization"
  | "search_expansion"
  | "inference_migration";

// ── Dependency Relationship Types ───────────────────────────
export type DependencyRelationship = "requires" | "shares" | "chains" | "buffers";

// ── Extension Point IDs ─────────────────────────────────────
export const EP_PII_RESOURCE_DISCOVERED = "platform-infrastructure:resource-discovered";
export const EP_PII_HEALTH_EVALUATED = "platform-infrastructure:health-evaluated";
export const EP_PII_CAPACITY_ASSESSED = "platform-infrastructure:capacity-assessed";
export const EP_PII_FORECAST_GENERATED = "platform-infrastructure:forecast-generated";
export const EP_PII_DEPENDENCY_MAPPED = "platform-infrastructure:dependency-mapped";
export const EP_PII_PERFORMANCE_MEASURED = "platform-infrastructure:performance-measured";
export const EP_PII_ALERT_TRIGGERED = "platform-infrastructure:alert-triggered";
export const EP_PII_RECOMMENDATION_PRODUCED = "platform-infrastructure:recommendation-produced";

// ── Observation result per resource ─────────────────────────
export interface ResourceObservation {
  resourceKey: string;
  resourceType: ResourceType;
  resourceName: string;
  health: InfraHealthStatus;
  utilizationPercent: number;
  totalCapacity?: number;
  usedCapacity?: number;
  availableCapacity?: number;
  capacityUnit?: string;
  pressureLevel: PressureLevel;
  latencyMs?: number;
  errorRate: number;
  diagnostics: Record<string, unknown>;
}

// ── Capacity assessment result ───────────────────────────────
export interface CapacityAssessment {
  resourceKey: string;
  resourceType: ResourceType;
  totalCapacity: number;
  usedCapacity: number;
  availableCapacity: number;
  utilizationPercent: number;
  growthRatePerDay: number;
  daysToExhaustion?: number;
}

// ── Forecast result ──────────────────────────────────────────
export interface InfraForecastResult {
  resourceKey: string;
  resourceType: ResourceType;
  forecastType: ForecastType;
  severity: PressureLevel;
  probability: number;
  horizonDays: number;
  currentUtilization: number;
  projectedUtilization: number;
  triggerCondition: string;
  rationale: string;
  recommendedAction: string;
  isAdminOnly: boolean;
}

// ── Alert result ─────────────────────────────────────────────
export interface InfraAlertResult {
  resourceKey: string;
  resourceType: ResourceType;
  alertType: AlertType;
  severity: PressureLevel;
  message: string;
  currentValue?: number;
  thresholdValue?: number;
  isAdminOnly: boolean;
}

// ── Recommendation result (always admin-only) ────────────────
export interface InfraRecommendationResult {
  resourceKey: string;
  resourceType: ResourceType;
  recommendationType: RecommendationType;
  priority: PressureLevel;
  title: string;
  description: string;
  evidence: string;
  currentUtilization?: number;
  historicalTrend?: string;
  predictedExhaustion?: string;
  expectedImprovement: string;
  estimatedCostImpact?: string;
  confidence: number;
  alternatives: string[];
  risksIfIgnored: string;
}

// ── Performance measurement ──────────────────────────────────
export interface PerformanceMeasurement {
  measurementType: string;
  resourceKey?: string;
  throughputRpm?: number;
  avgLatencyMs?: number;
  p95LatencyMs?: number;
  p99LatencyMs?: number;
  concurrentWorkers?: number;
  queueDepth?: number;
  errorRate: number;
  utilizationPercent: number;
  efficiencyScore: number;
  bottleneckResource?: string;
  bottleneckSeverity: string;
}

// ── Full scan result ─────────────────────────────────────────
export interface InfrastructureScanResult {
  resources: ResourceObservation[];
  capacities: CapacityAssessment[];
  forecasts: InfraForecastResult[];
  alerts: InfraAlertResult[];
  recommendations: InfraRecommendationResult[];
  performance: PerformanceMeasurement;
  platformReadiness: PlatformReadiness;
  overallPressure: PressureLevel;
}

// ── Summary (for EB bridge) ──────────────────────────────────
export interface PlatformInfrastructureSummary {
  totalResources: number;
  healthyResources: number;
  warningResources: number;
  degradedResources: number;
  criticalResources: number;
  avgUtilizationPercent: number;
  overallPressure: PressureLevel;
  platformReadiness: PlatformReadiness;
  openAlerts: number;
  openForecasts: number;
  adminRecommendationCount: number;
  topPressuredResources: string[];
  performanceScore: number;
  scannedAt: Date;
}
