// ─── Executive Goal Engine — Types (Build 008) ──────────────────────────────
//
// Self-contained: all types defined locally (no re-exports from DB layer).
// Following the Build 006/007 pattern for application-layer type isolation.

// ─── Enumerated values ───────────────────────────────────────────────────────

export const GOAL_TYPES = [
  "strategic",     // long-term direction
  "operational",   // day-to-day execution
  "milestone",     // significant achievement marker
  "constraint",    // something that must remain true
  "exploratory",   // hypothesis to validate
] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

export const GOAL_CATEGORIES = [
  "growth",       // market expansion, acquisition
  "product",      // features, quality, innovation
  "operations",   // efficiency, process, cost
  "team",         // people, culture, capability
  "financial",    // revenue, profit, cash
  "risk",         // risk reduction, compliance
  "custom",       // user-defined
] as const;
export type GoalCategory = (typeof GOAL_CATEGORIES)[number];

export const GOAL_STATUSES = [
  "not_started",
  "active",
  "blocked",
  "paused",
  "completed",
  "cancelled",
] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export const GOAL_DEPENDENCY_TYPES = [
  "blocks",    // goalId cannot progress until dependsOnGoalId completes
  "enables",   // dependsOnGoalId unlocks goalId
  "requires",  // goalId needs dependsOnGoalId as a precondition
  "related",   // informational soft link
] as const;
export type GoalDependencyType = (typeof GOAL_DEPENDENCY_TYPES)[number];

// ─── Priority dimension weights ───────────────────────────────────────────────

/** Weights for the goal priority scoring formula. Sum = 1.0.
 *  risk is inverted: (100 - risk) * weight → higher risk = lower priority. */
export const GOAL_PRIORITY_WEIGHTS = {
  importance:     0.30,
  urgency:        0.25,
  strategicValue: 0.20,
  opportunity:    0.10,
  risk:           0.10, // inverted
  confidence:     0.05,
} as const;

// ─── Goal model ───────────────────────────────────────────────────────────────

/** The complete Executive Goal object. */
export interface ExecutiveGoal {
  id: string;
  userId: number | null;
  // Hierarchy
  parentGoalId: string | null;
  // Identity
  name: string;
  description: string | null;
  goalType: string;
  category: string;
  // Lifecycle
  status: string;
  version: number;
  // Priority dimensions (all 0–100)
  importance: number;
  urgency: number;
  strategicValue: number;
  risk: number;
  opportunity: number;
  confidence: number;
  priorityScore: number;
  // Progress
  progressPct: number;
  // Brain ownership
  ownerBrain: string | null;
  // Criteria
  successCriteria: string[];
  failureCriteria: string[];
  constraintsData: string[];
  metricsDefinition: Record<string, { unit?: string; target?: number; current?: number }>;
  // Cross-Build soft relationships
  relatedContextIds: string[];
  relatedJudgmentIds: string[];
  relatedArtifactIds: string[];
  relatedClusterIds: string[];
  relatedGoalIds: string[];
  // Dates
  targetDate: Date | null;
  completionDate: Date | null;
  // Forward-compatibility
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/** Hierarchical view of a goal with its children. */
export interface GoalTreeNode {
  goal: ExecutiveGoal;
  children: GoalTreeNode[];
  depth: number;
}

// ─── Dependency model ─────────────────────────────────────────────────────────

export interface GoalDependency {
  id: string;
  goalId: string;
  dependsOnGoalId: string;
  dependencyType: string;
  note: string | null;
  createdAt: Date;
}

// ─── Progress history ─────────────────────────────────────────────────────────

export interface GoalProgressSnapshot {
  id: string;
  goalId: string;
  progressPct: number;
  status: string;
  note: string | null;
  recordedAt: Date;
}

/** Enriched progress summary including velocity estimate. */
export interface GoalProgressReport {
  goalId: string;
  currentProgressPct: number;
  currentStatus: string;
  /** Days of work recorded. */
  daysSinceStart: number;
  /** Progress points per day (may be null if insufficient history). */
  velocityPctPerDay: number | null;
  /** Estimated completion date based on current velocity (null if unknown). */
  estimatedCompletionDate: Date | null;
  history: GoalProgressSnapshot[];
}

// ─── Metric model ─────────────────────────────────────────────────────────────

export interface GoalMetric {
  id: string;
  goalId: string;
  metricKey: string;
  metricValue: number | null;
  unit: string | null;
  targetValue: number | null;
  recordedAt: Date;
}

// ─── Conflict model ───────────────────────────────────────────────────────────

export const CONFLICT_TYPES = [
  "circular_dependency",
  "resource_conflict",
  "deadline_conflict",
  "contradictory_objectives",
] as const;
export type GoalConflictType = (typeof CONFLICT_TYPES)[number];

export const CONFLICT_SEVERITIES = ["critical", "high", "medium", "low"] as const;
export type ConflictSeverity = (typeof CONFLICT_SEVERITIES)[number];

export interface GoalConflict {
  conflictType: GoalConflictType;
  severity: ConflictSeverity;
  affectedGoalIds: string[];
  description: string;
  detectedAt: Date;
}

export interface GoalConflictReport {
  userId: number;
  conflicts: GoalConflict[];
  totalConflicts: number;
  criticalCount: number;
  assessedAt: Date;
}

// ─── Request / Input shapes ───────────────────────────────────────────────────

export interface CreateGoalInput {
  userId: number;
  name: string;
  description?: string;
  goalType?: GoalType;
  category?: GoalCategory;
  parentGoalId?: string;
  importance?: number;
  urgency?: number;
  strategicValue?: number;
  risk?: number;
  opportunity?: number;
  confidence?: number;
  ownerBrain?: string;
  successCriteria?: string[];
  failureCriteria?: string[];
  constraints?: string[];
  metricsDefinition?: Record<string, { unit?: string; target?: number; current?: number }>;
  targetDate?: Date | string;
  // Cross-build links
  relatedContextIds?: string[];
  relatedJudgmentIds?: string[];
  relatedArtifactIds?: string[];
  relatedClusterIds?: string[];
  relatedGoalIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateGoalInput {
  name?: string;
  description?: string;
  goalType?: GoalType;
  category?: GoalCategory;
  parentGoalId?: string;
  status?: GoalStatus;
  importance?: number;
  urgency?: number;
  strategicValue?: number;
  risk?: number;
  opportunity?: number;
  confidence?: number;
  ownerBrain?: string;
  successCriteria?: string[];
  failureCriteria?: string[];
  constraints?: string[];
  metricsDefinition?: Record<string, { unit?: string; target?: number; current?: number }>;
  targetDate?: Date | string | null;
  relatedContextIds?: string[];
  relatedJudgmentIds?: string[];
  relatedArtifactIds?: string[];
  relatedClusterIds?: string[];
  relatedGoalIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateProgressInput {
  progressPct: number;
  status?: GoalStatus;
  note?: string;
}

export interface AddDependencyInput {
  dependsOnGoalId: string;
  dependencyType?: GoalDependencyType;
  note?: string;
}

// ─── Goal diagnostics ─────────────────────────────────────────────────────────

export interface GoalDiagnosticsReport {
  userId: number;
  totalGoals: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  averagePriorityScore: number;
  averageProgress: number;
  conflictCount: number;
  blockedCount: number;
  overdueCount: number;
  topPriorityGoals: Array<{ id: string; name: string; priorityScore: number }>;
  assessedAt: Date;
}

// ─── Extension point IDs ──────────────────────────────────────────────────────

export const GOAL_EXTENSION_POINT_IDS = {
  GOAL_CREATED:           "goal-created",
  GOAL_STATUS_CHANGED:    "goal-status-changed",
  GOAL_PRIORITY_COMPUTED: "goal-priority-computed",
  GOAL_CONFLICT_DETECTED: "goal-conflict-detected",
  GOAL_PROGRESS_UPDATED:  "goal-progress-updated",
  GOAL_HIERARCHY_CHANGED: "goal-hierarchy-changed",
} as const;
export type GoalExtensionPointId =
  (typeof GOAL_EXTENSION_POINT_IDS)[keyof typeof GOAL_EXTENSION_POINT_IDS];
