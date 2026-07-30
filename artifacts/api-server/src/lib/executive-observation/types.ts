// ─── Executive Observation Engine — Types (Build 011) ────────────────────────
//
// All application-layer types for the Observation Engine.
// Self-contained: no re-exports from @workspace/db.
// Observation NEVER changes state. Observation ONLY records, correlates,
// classifies and summarizes.

// ── Enumerations ──────────────────────────────────────────────────────────────

export const OBSERVATION_SEVERITIES = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
] as const;
export type ObservationSeverity = (typeof OBSERVATION_SEVERITIES)[number];

export const OBSERVATION_SIGNAL_TYPES = [
  "success",
  "failure",
  "opportunity",
  "risk",
  "progress",
  "regression",
  "conflict",
  "delay",
  "bottleneck",
  "novelty",
  "trend",
  "unknown",
] as const;
export type ObservationSignalType = (typeof OBSERVATION_SIGNAL_TYPES)[number];

export const OBSERVATION_EVENT_CATEGORIES = [
  "execution",
  "planning",
  "goal",
  "judgment",
  "context",
  "memory",
  "knowledge",
  "reasoning",
  "system",
  "user",
] as const;
export type ObservationEventCategory = (typeof OBSERVATION_EVENT_CATEGORIES)[number];

export const TREND_TYPES = [
  "repeated_failures",
  "increasing_success",
  "growing_latency",
  "improving_completion",
  "execution_velocity",
  "goal_completion_velocity",
  "planning_frequency",
  "retry_escalation",
] as const;
export type TrendType = (typeof TREND_TYPES)[number];

export const ANOMALY_TYPES = [
  "unexpected_failure",
  "missing_event",
  "repeated_retries",
  "execution_loop",
  "stalled_progress",
  "impossible_transition",
  "orphaned_execution",
] as const;
export type AnomalyType = (typeof ANOMALY_TYPES)[number];

export const CORRELATION_TYPES = [
  "same_goal",
  "same_plan",
  "same_execution",
  "same_user_request",
  "time_window",
  "shared_resource",
  "shared_object",
] as const;
export type CorrelationType = (typeof CORRELATION_TYPES)[number];

// ── Extension point IDs ────────────────────────────────────────────────────────

export const OBSERVATION_EXTENSION_POINT_IDS = {
  OBSERVATION_RECORDED:       "observation-recorded",
  OBSERVATION_CHAIN_UPDATED:  "observation-chain-updated",
  ATTENTION_THRESHOLD_EXCEEDED: "attention-threshold-exceeded",
  SIGNAL_EMITTED:             "signal-emitted",
  ANOMALY_DETECTED:           "anomaly-detected",
  TREND_DETECTED:             "trend-detected",
  REFLECTION_READY:           "reflection-ready",
  CORRELATION_FOUND:          "observation-correlation-found",
} as const;

// ── Core observation model ─────────────────────────────────────────────────────

export interface ExecutiveObservation {
  id: string;
  userId: number | null;

  // Source
  sourceSystem: string;
  sourceObjectId: string | null;
  sourceObjectType: string | null;

  // Event
  eventType: string;
  eventCategory: ObservationEventCategory;
  severity: ObservationSeverity;

  // Attention
  attentionScore: number;
  attentionDimensions: Record<string, number>;

  // Signal
  signalType: ObservationSignalType;

  // State snapshot
  observedState: string | null;
  previousState: string | null;

  // Correlation
  chainId: string | null;

  // Cross-build soft relationships
  relatedGoalId: string | null;
  relatedPlanId: string | null;
  relatedExecutionId: string | null;
  relatedContextId: string | null;
  relatedJudgmentId: string | null;
  relatedMemoryId: string | null;
  relatedKnowledgeId: string | null;
  relatedUserRequestId: string | null;

  payload: Record<string, unknown>;
  version: number;
  metadata: Record<string, unknown>;
  observedAt: Date;
}

// ── Observation chain ──────────────────────────────────────────────────────────

export interface ObservationChain {
  id: string;
  userId: number | null;
  name: string;
  description: string | null;
  anchorObjectId: string | null;
  anchorObjectType: string | null;
  observationCount: number;
  firstObservedAt: Date | null;
  lastObservedAt: Date | null;
  signalTypes: string[];
  maxSeverity: string;
  maxAttentionScore: number;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ── Cognitive signal ───────────────────────────────────────────────────────────

export interface ObservationSignal {
  id: string;
  observationId: string;
  userId: number | null;
  signalType: ObservationSignalType;
  strength: number;
  description: string | null;
  relatedGoalId: string | null;
  relatedPlanId: string | null;
  relatedExecutionId: string | null;
  payload: Record<string, unknown>;
  emittedAt: Date;
}

// ── Trend record ───────────────────────────────────────────────────────────────

export interface ObservationTrend {
  id: string;
  userId: number | null;
  trendType: TrendType;
  direction: "up" | "down" | "neutral" | "volatile";
  magnitude: number;
  windowStartAt: Date;
  windowEndAt: Date;
  sampleCount: number;
  description: string | null;
  evidence: Record<string, unknown>[];
  anchorObjectId: string | null;
  anchorObjectType: string | null;
  detectedAt: Date;
}

// ── Anomaly record ─────────────────────────────────────────────────────────────

export interface ObservationAnomaly {
  id: string;
  userId: number | null;
  anomalyType: AnomalyType;
  severity: ObservationSeverity;
  description: string;
  sourceObjectId: string | null;
  sourceObjectType: string | null;
  evidence: Record<string, unknown>[];
  isResolved: boolean;
  resolvedAt: Date | null;
  detectedAt: Date;
}

// ── Correlation edge ───────────────────────────────────────────────────────────

export interface ObservationCorrelation {
  id: string;
  sourceObservationId: string;
  targetObservationId: string;
  correlationType: CorrelationType;
  strength: number;
  createdAt: Date;
}

// ── Service inputs ─────────────────────────────────────────────────────────────

export interface IngestObservationInput {
  userId: number;
  sourceSystem: string;
  sourceObjectId?: string;
  sourceObjectType?: string;
  eventType: string;
  eventCategory: ObservationEventCategory;
  severity?: ObservationSeverity;
  observedState?: string;
  previousState?: string;
  // Cross-build relationships
  relatedGoalId?: string;
  relatedPlanId?: string;
  relatedExecutionId?: string;
  relatedContextId?: string;
  relatedJudgmentId?: string;
  relatedMemoryId?: string;
  relatedKnowledgeId?: string;
  relatedUserRequestId?: string;
  // Attention override inputs
  goalPriority?: number;
  failureCount?: number;
  isNovel?: boolean;
  businessImpact?: "high" | "medium" | "low" | "unknown";
  urgency?: "immediate" | "soon" | "deferred" | "unknown";
  strategicImportance?: "critical" | "high" | "medium" | "low";
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// ── Attention score breakdown ──────────────────────────────────────────────────

export interface AttentionScoreResult {
  score: number;   // 0.00 → 1.00
  dimensions: {
    severity: number;
    goalPriority: number;
    executionState: number;
    failureCount: number;
    novelty: number;
    businessImpact: number;
    urgency: number;
    strategicImportance: number;
  };
}

// ── Observation summary (Executive Brain advisory) ────────────────────────────

export interface ObservationSummary {
  recentCount: number;
  highAttentionCount: number;
  topSignals: ObservationSignalType[];
  activeAnomalyCount: number;
  activeTrendCount: number;
  latestChainId: string | null;
  summaryText: string;
}

// ── Dashboard feeds ────────────────────────────────────────────────────────────

export interface ObservationDiagnostics {
  totalObservations: number;
  bySeverity: Record<string, number>;
  bySignalType: Record<string, number>;
  byEventCategory: Record<string, number>;
  activeChainCount: number;
  unresolved_anomalies: number;
  recentTrends: number;
  averageAttentionScore: number;
}
