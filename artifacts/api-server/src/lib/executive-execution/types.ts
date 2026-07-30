// ─── Executive Execution Engine — Types (Build 010) ─────────────────────────
//
// All application-layer types for the Execution Engine.
// Self-contained: no re-exports from @workspace/db.
// Execution NEVER plans, judges, or changes goals.

// ── Status & event enumerations ───────────────────────────────────────────────

export const EXECUTION_STATUSES = [
  "pending",
  "approved",
  "running",
  "waiting",
  "paused",
  "blocked",
  "retrying",
  "completed",
  "failed",
  "cancelled",
] as const;

export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];

export const EXECUTION_STEP_STATUSES = [
  "pending",
  "running",
  "paused",
  "completed",
  "failed",
  "skipped",
  "retrying",
  "cancelled",
] as const;

export type ExecutionStepStatus = (typeof EXECUTION_STEP_STATUSES)[number];

export const EXECUTION_EVENT_TYPES = [
  "created",
  "approved",
  "started",
  "paused",
  "resumed",
  "blocked",
  "unblocked",
  "waiting",
  "retrying",
  "completed",
  "failed",
  "cancelled",
  "step_started",
  "step_completed",
  "step_failed",
  "step_skipped",
  "step_retried",
  "recovery_point_created",
  "manual_intervention",
  "adapter_dispatched",
  "adapter_result_received",
] as const;

export type ExecutionEventType = (typeof EXECUTION_EVENT_TYPES)[number];

// ── Execution adapter types (interfaces only — not implemented here) ───────────

export const EXECUTION_ADAPTER_TYPES = [
  "cognitive_task",
  "ai_agent",
  "browser_automation",
  "api",
  "filesystem",
  "code_execution",
  "human_approval",
  "external_workflow",
] as const;

export type ExecutionAdapterType = (typeof EXECUTION_ADAPTER_TYPES)[number];

// ── Extension point IDs ────────────────────────────────────────────────────────

export const EXECUTION_EXTENSION_POINT_IDS = {
  EXECUTION_STARTED:       "execution-started",
  EXECUTION_COMPLETED:     "execution-completed",
  EXECUTION_FAILED:        "execution-failed",
  EXECUTION_PAUSED:        "execution-paused",
  EXECUTION_RESUMED:       "execution-resumed",
  EXECUTION_CANCELLED:     "execution-cancelled",
  EXECUTION_STEP_STARTED:  "execution-step-started",
  EXECUTION_STEP_COMPLETED:"execution-step-completed",
  EXECUTION_STEP_FAILED:   "execution-step-failed",
  EXECUTION_RETRY_TRIGGERED: "execution-retry-triggered",
} as const;

// ── Core execution model ───────────────────────────────────────────────────────

export interface ExecutiveExecution {
  id: string;
  userId: number | null;

  // Soft FKs — cross-build relationships
  planId: string | null;
  goalId: string | null;
  judgmentId: string | null;
  contextSnapshotId: string | null;

  // Unlimited hierarchy
  parentExecutionId: string | null;
  childExecutions?: ExecutiveExecution[];

  // Current position within the plan
  currentMilestoneId: string | null;
  currentStepId: string | null;

  // State machine
  status: ExecutionStatus;
  previousStatus: string | null;

  // Progress
  progressPct: number;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  skippedSteps: number;

  // Retry tracking
  retryCount: number;
  maxRetries: number;

  // Outcome
  success: boolean | null;
  failureReason: string | null;
  cancellationReason: string | null;

  // Timestamps
  startedAt: Date | null;
  completedAt: Date | null;
  pausedAt: Date | null;
  resumedAt: Date | null;

  // Cross-build soft relationships
  relatedMemoryIds: string[];
  relatedContextIds: string[];
  relatedJudgmentIds: string[];
  relatedPlanIds: string[];
  relatedGoalIds: string[];

  // Adapter layer (interface-level only — adapters not implemented)
  adapterType: string | null;
  adapterPayload: Record<string, unknown>;
  adapterResult: Record<string, unknown>;

  version: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ── Step execution model ───────────────────────────────────────────────────────

export interface ExecutionStep {
  id: string;
  executionId: string;
  planStepId: string | null;
  milestoneId: string | null;

  name: string;
  description: string | null;
  status: ExecutionStepStatus;
  orderIndex: number;

  retryCount: number;
  maxRetries: number;

  success: boolean | null;
  failureReason: string | null;
  skippedReason: string | null;

  adapterType: string | null;
  adapterPayload: Record<string, unknown>;
  adapterResult: Record<string, unknown>;

  startedAt: Date | null;
  completedAt: Date | null;
  pausedAt: Date | null;

  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ── Execution history event ────────────────────────────────────────────────────

export interface ExecutionHistoryEvent {
  id: string;
  executionId: string;
  stepId: string | null;

  eventType: ExecutionEventType;
  fromStatus: string | null;
  toStatus: string | null;

  note: string | null;
  triggeredBy: string | null;
  snapshot: Record<string, unknown>;

  recordedAt: Date;
}

// ── Execution metric ───────────────────────────────────────────────────────────

export interface ExecutionMetric {
  id: string;
  executionId: string;
  stepId: string | null;
  metricKey: string;
  metricValue: number | null;
  unit: string | null;
  targetValue: number | null;
  recordedAt: Date;
}

// ── Recovery point ─────────────────────────────────────────────────────────────

export interface ExecutionRecoveryPoint {
  id: string;
  executionId: string;
  label: string;
  description: string | null;
  stateSnapshot: Record<string, unknown>;
  completedStepIds: string[];
  isActive: boolean;
  createdAt: Date;
}

// ── Execution relationship ─────────────────────────────────────────────────────

export interface ExecutionRelationship {
  id: string;
  sourceExecutionId: string;
  targetId: string;
  targetType: string;
  relationshipType: string;
  note: string | null;
  createdAt: Date;
}

// ── State machine transition ───────────────────────────────────────────────────

export interface ExecutionTransitionResult {
  ok: boolean;
  newStatus?: ExecutionStatus;
  rejectedReason?: string;
}

// ── Service inputs ─────────────────────────────────────────────────────────────

export interface CreateExecutionInput {
  userId: number;
  planId?: string;
  goalId?: string;
  judgmentId?: string;
  contextSnapshotId?: string;
  parentExecutionId?: string;
  maxRetries?: number;
  adapterType?: ExecutionAdapterType;
  adapterPayload?: Record<string, unknown>;
  relatedMemoryIds?: string[];
  relatedContextIds?: string[];
  relatedJudgmentIds?: string[];
  relatedPlanIds?: string[];
  relatedGoalIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface CreateExecutionStepInput {
  executionId: string;
  planStepId?: string;
  milestoneId?: string;
  name: string;
  description?: string;
  orderIndex?: number;
  maxRetries?: number;
  adapterType?: ExecutionAdapterType;
  adapterPayload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface TransitionExecutionInput {
  executionId: string;
  toStatus: ExecutionStatus;
  triggeredBy?: string;
  note?: string;
  snapshot?: Record<string, unknown>;
}

export interface TransitionStepInput {
  stepId: string;
  toStatus: ExecutionStepStatus;
  triggeredBy?: string;
  note?: string;
  result?: Record<string, unknown>;
  failureReason?: string;
  skippedReason?: string;
}

// ── Coordinator result ─────────────────────────────────────────────────────────

export interface CoordinatorResult {
  executionId: string;
  status: ExecutionStatus;
  completedSteps: number;
  totalSteps: number;
  progressPct: number;
  nextStepId: string | null;
  blockers: string[];
  recoveryPointId: string | null;
}

// ── Diagnostics ────────────────────────────────────────────────────────────────

export interface ExecutionDiagnostics {
  total: number;
  byStatus: Record<string, number>;
  activeCount: number;
  completedCount: number;
  failedCount: number;
  cancelledCount: number;
  averageProgressPct: number;
  retriedCount: number;
}
