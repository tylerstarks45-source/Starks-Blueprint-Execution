// ============================================================
// Build 031 – Adaptive Capability Intelligence Engine
// All types defined locally — no circular imports.
// ============================================================

// ── Capability Health Status ────────────────────────────────
export type CapabilityHealthStatus = "healthy" | "warning" | "degraded" | "critical" | "unavailable" | "unknown";

// ── Connectivity Status ─────────────────────────────────────
export type ConnectivityStatus = "connected" | "degraded" | "disconnected";

// ── Dependency Types ─────────────────────────────────────────
export type DependencyType = "adapter" | "service" | "credential" | "network" | "database" | "api";

// ── Risk / Impact Levels ────────────────────────────────────
export type RiskLevel = "low" | "medium" | "high" | "critical";

// ── Forecast Types ───────────────────────────────────────────
export type ForecastType =
  | "degradation"
  | "capacity_exhaustion"
  | "rate_limit"
  | "credential_expiry"
  | "cert_expiry"
  | "version_incompatibility";

// ── Optimization Types ───────────────────────────────────────
export type OptimizationType =
  | "upgrade_adapter"
  | "rotate_credentials"
  | "increase_quota"
  | "install_newer"
  | "replace_deprecated"
  | "enable_caching"
  | "reduce_volume"
  | "other";

// ── Admin Recommendation Categories ─────────────────────────
export type AdminRecommendationCategory =
  | "gpu"
  | "cpu"
  | "ram"
  | "storage"
  | "database"
  | "vector_db"
  | "search"
  | "browser"
  | "model_provider"
  | "inference"
  | "adapter"
  | "credential"
  | "quota";

// ── Extension Point IDs ─────────────────────────────────────
export const EP_CI_HEALTH_EVALUATED = "capability-intelligence:health-evaluated";
export const EP_CI_RELIABILITY_MEASURED = "capability-intelligence:reliability-measured";
export const EP_CI_AVAILABILITY_TRACKED = "capability-intelligence:availability-tracked";
export const EP_CI_DEPENDENCY_ASSESSED = "capability-intelligence:dependency-assessed";
export const EP_CI_FORECAST_GENERATED = "capability-intelligence:forecast-generated";
export const EP_CI_OPTIMIZATION_PRODUCED = "capability-intelligence:optimization-produced";
export const EP_CI_ADMIN_RECOMMENDATION_GENERATED = "capability-intelligence:admin-recommendation-generated";
export const EP_CI_SNAPSHOT_TAKEN = "capability-intelligence:snapshot-taken";

// ── Per-capability evaluation input ─────────────────────────
export interface CapabilityEvaluationRequest {
  capabilityKey: string;
  adapterType: string;
  adapterIds: string[];
  triggeredBy?: string;
}

// ── Health result ────────────────────────────────────────────
export interface CapabilityHealthResult {
  capabilityKey: string;
  adapterType: string;
  status: CapabilityHealthStatus;
  successRate: number;
  errorRate: number;
  latencyMs: number;
  errorMessage?: string;
  diagnostics: Record<string, unknown>;
}

// ── Reliability result ───────────────────────────────────────
export interface CapabilityReliabilityResult {
  capabilityKey: string;
  adapterType: string;
  windowDays: number;
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  failureRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  recoveryRate: number;
  consistencyScore: number;
  confidence: number;
}

// ── Availability result ──────────────────────────────────────
export interface CapabilityAvailabilityResult {
  capabilityKey: string;
  adapterType: string;
  uptimePercent: number;
  downtimeMinutes: number;
  connectivityStatus: ConnectivityStatus;
  interruptionCount: number;
  serviceLevel: string;
  hasScheduledMaintenance: boolean;
}

// ── Dependency result ────────────────────────────────────────
export interface CapabilityDependencyResult {
  capabilityKey: string;
  adapterType: string;
  dependencyKey: string;
  dependencyType: DependencyType;
  isRequired: boolean;
  dependencyHealth: CapabilityHealthStatus;
  upstreamRisk: RiskLevel;
  downstreamImpact: RiskLevel;
  sharedWith: string[];
}

// ── Forecast result ──────────────────────────────────────────
export interface CapabilityForecastResult {
  capabilityKey: string;
  adapterType: string;
  forecastType: ForecastType;
  severity: RiskLevel;
  probability: number;
  expectedAt?: Date;
  horizonDays: number;
  triggerCondition: string;
  currentValue?: number;
  thresholdValue?: number;
  rationale: string;
  recommendedAction: string;
  isAdminOnly: boolean;
}

// ── Optimization result ──────────────────────────────────────
export interface CapabilityOptimizationResult {
  capabilityKey: string;
  adapterType: string;
  optimizationType: OptimizationType;
  priority: RiskLevel;
  title: string;
  description: string;
  expectedImpact: string;
  effort: "low" | "medium" | "high";
  isAdminRecommendation: boolean;
  adminCategory?: AdminRecommendationCategory;
}

// ── Capability profile (snapshot entry per capability) ───────
export interface CapabilityProfile {
  capabilityKey: string;
  adapterType: string;
  health: CapabilityHealthStatus;
  readiness: string;
  confidence: number;
  successRate: number;
  avgLatencyMs: number;
  totalExecutions: number;
  openForecasts: number;
  openOptimizations: number;
}

// ── Full evaluation result ───────────────────────────────────
export interface CapabilityEvaluationResult {
  capabilityKey: string;
  adapterType: string;
  health: CapabilityHealthResult;
  reliability: CapabilityReliabilityResult;
  availability: CapabilityAvailabilityResult;
  dependencies: CapabilityDependencyResult[];
  forecasts: CapabilityForecastResult[];
  optimizations: CapabilityOptimizationResult[];
}

// ── Summary (for EB bridge) ──────────────────────────────────
export interface CapabilityIntelligenceSummary {
  totalCapabilities: number;
  healthyCapabilities: number;
  warningCapabilities: number;
  degradedCapabilities: number;
  criticalCapabilities: number;
  unavailableCapabilities: number;
  avgConfidence: number;
  avgSuccessRate: number;
  openForecasts: number;
  openOptimizations: number;
  adminRecommendationCount: number;
  topRisks: string[];          // top capability keys at risk
  topOptimizations: string[];  // top optimization titles (non-admin only)
  evaluatedAt: Date;
}
