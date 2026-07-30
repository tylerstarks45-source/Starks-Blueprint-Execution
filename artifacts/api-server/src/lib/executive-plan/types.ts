// ─── Executive Planning Engine — Types (Build 009) ───────────────────────────
//
// Self-contained: all types defined locally (no re-exports from DB layer).
// Following the Build 006/007/008 pattern for application-layer type isolation.

// ─── Enumerated values ────────────────────────────────────────────────────────

export const PLAN_STATUSES = [
  "draft",
  "active",
  "approved",
  "paused",
  "archived",
  "rejected",
] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const PLANNING_STRATEGIES = [
  "top_down",
  "bottom_up",
  "iterative",
  "agile",
  "waterfall",
] as const;
export type PlanningStrategy = (typeof PLANNING_STRATEGIES)[number];

export const PLAN_DEPENDENCY_TYPES = [
  "requires",
  "blocks",
  "enables",
  "related",
] as const;
export type PlanDependencyType = (typeof PLAN_DEPENDENCY_TYPES)[number];

export const MILESTONE_STATUSES = [
  "pending",
  "active",
  "completed",
  "skipped",
  "blocked",
] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export const PLAN_EVENT_TYPES = [
  "revision",
  "decision",
  "alternative",
  "rejection",
  "approval",
  "scoring",
] as const;
export type PlanEventType = (typeof PLAN_EVENT_TYPES)[number];

// ─── Score dimension weights (sum = 1.0) ─────────────────────────────────────
// complexity, risk, cost, duration, resource_demand are inverted (lower = better score).

export const PLAN_SCORE_WEIGHTS = {
  complexity:         0.15,  // inverted
  risk:               0.25,  // inverted
  cost:               0.10,  // inverted (relative)
  duration:           0.15,  // inverted (relative)
  resource_demand:    0.10,  // inverted (step count proxy)
  strategic_alignment: 0.15, // direct (goal priority or 75 default)
  confidence:         0.10,  // direct
} as const;

// ─── Extension point IDs ─────────────────────────────────────────────────────

export const PLAN_EXTENSION_POINT_IDS = {
  PLAN_GENERATED:             "plan-generated",
  PLAN_STATUS_CHANGED:        "plan-status-changed",
  PLAN_SCORED:                "plan-scored",
  PLAN_DEPENDENCY_DETECTED:   "plan-dependency-detected",
  PLAN_MILESTONE_COMPLETED:   "plan-milestone-completed",
  PLAN_ARCHIVED:              "plan-archived",
} as const;

// ─── Core models ─────────────────────────────────────────────────────────────

export interface PlanStep {
  id: string;
  milestoneId: string;
  planId: string;
  name: string;
  description: string | null;
  status: string;
  orderIndex: number;
  estimatedEffortHours: number | null;
  requiredCapabilities: string[];
  dependsOnStepIds: string[];
  assignedBrain: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface PlanMilestone {
  id: string;
  planId: string;
  parentMilestoneId: string | null;
  name: string;
  description: string | null;
  status: string;
  orderIndex: number;
  progressPct: number;
  estimatedDurationDays: number | null;
  dependencies: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  // Populated on-demand (not in DB row)
  steps?: PlanStep[];
  children?: PlanMilestone[];
}

export interface ExecutivePlan {
  id: string;
  userId: number | null;
  goalId: string | null;
  parentPlanId: string | null;
  name: string;
  description: string | null;
  status: string;
  planningStrategy: string;
  estimatedDurationDays: number | null;
  estimatedComplexity: number;
  estimatedCost: number | null;
  estimatedRisk: number;
  estimatedConfidence: number;
  priority: number;
  successProbability: number;
  overallScore: number;
  scoreDimensions: Record<string, number>;
  isAlternative: boolean;
  assumptions: string[];
  constraintsData: string[];
  requiredResources: string[];
  relatedContextIds: string[];
  relatedJudgmentIds: string[];
  relatedGoalIds: string[];
  relatedArtifactIds: string[];
  relatedKnowledgeIds: string[];
  version: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanDependency {
  id: string;
  sourceId: string;
  targetId: string;
  sourceType: string;
  dependencyType: string;
  note: string | null;
  createdAt: Date;
}

export interface PlanHistoryEntry {
  id: string;
  planId: string;
  eventType: string;
  version: number;
  snapshot: Record<string, unknown>;
  note: string | null;
  decidedBy: string | null;
  recordedAt: Date;
}

export interface PlanMetric {
  id: string;
  planId: string;
  metricKey: string;
  metricValue: number | null;
  unit: string | null;
  targetValue: number | null;
  recordedAt: Date;
}

// ─── Plan Score ───────────────────────────────────────────────────────────────

export interface PlanScore {
  overallScore: number;    // 0-100
  dimensions: {
    complexity: number;         // 0-100 (inverted: 100 = simplest)
    risk: number;               // 0-100 (inverted: 100 = safest)
    cost: number;               // 0-100 (inverted: 100 = free/lowest)
    duration: number;           // 0-100 (inverted: 100 = fastest)
    resource_demand: number;    // 0-100 (inverted: 100 = least resource-intensive)
    strategic_alignment: number; // 0-100 (direct: 100 = perfect goal alignment)
    confidence: number;         // 0-100 (direct)
  };
}

// ─── Dependency issue ─────────────────────────────────────────────────────────

export const DEPENDENCY_ISSUE_TYPES = [
  "circular_dependency",
  "missing_prerequisite",
  "resource_conflict",
  "invalid_ordering",
  "blocked_milestone",
] as const;
export type DependencyIssueType = (typeof DEPENDENCY_ISSUE_TYPES)[number];

export interface PlanDependencyIssue {
  type: DependencyIssueType;
  severity: "error" | "warning" | "info";
  affectedIds: string[];
  description: string;
}

export interface PlanDependencyReport {
  planId: string;
  issues: PlanDependencyIssue[];
  hasErrors: boolean;
  hasWarnings: boolean;
  analyzedAt: Date;
}

// ─── Plan comparison ──────────────────────────────────────────────────────────

export interface PlanComparisonResult {
  plans: Array<{
    planId: string;
    name: string;
    overallScore: number;
    rank: number;
    strengths: string[];
    weaknesses: string[];
    dimensions: Record<string, number>;
  }>;
  recommendedPlanId: string | null;
  analyzedAt: Date;
}

// ─── Generation result ────────────────────────────────────────────────────────

export interface GeneratedPlanResult {
  plan: ExecutivePlan;
  milestones: PlanMilestone[];
  score: PlanScore;
  dependencyReport: PlanDependencyReport;
}

// ─── Plan diagnostics ─────────────────────────────────────────────────────────

export interface PlanDiagnostics {
  userId: number | null;
  totalPlans: number;
  byStatus: Record<string, number>;
  byStrategy: Record<string, number>;
  averageScore: number;
  averageSuccessProbability: number;
  alternativePlansCount: number;
  mostRecentPlanId: string | null;
  analysedAt: Date;
}

// ─── Input shapes ─────────────────────────────────────────────────────────────

export interface CreatePlanInput {
  userId: number;
  goalId?: string;
  parentPlanId?: string;
  name: string;
  description?: string;
  planningStrategy?: PlanningStrategy;
  estimatedComplexity?: number;
  estimatedRisk?: number;
  estimatedConfidence?: number;
  estimatedCost?: number;
  estimatedDurationDays?: number;
  priority?: number;
  assumptions?: string[];
  constraintsData?: string[];
  requiredResources?: string[];
  relatedContextIds?: string[];
  relatedJudgmentIds?: string[];
  relatedGoalIds?: string[];
  isAlternative?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdatePlanInput {
  name?: string;
  description?: string;
  status?: PlanStatus;
  planningStrategy?: PlanningStrategy;
  estimatedComplexity?: number;
  estimatedRisk?: number;
  estimatedConfidence?: number;
  estimatedCost?: number;
  estimatedDurationDays?: number;
  priority?: number;
  successProbability?: number;
  assumptions?: string[];
  constraintsData?: string[];
  requiredResources?: string[];
  relatedContextIds?: string[];
  relatedJudgmentIds?: string[];
  relatedGoalIds?: string[];
  relatedArtifactIds?: string[];
  relatedKnowledgeIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface GeneratePlanInput {
  userId: number;
  goalId: string;
  goalName: string;
  goalDescription?: string | null;
  successCriteria?: string[];
  constraintsData?: string[];
  estimatedComplexity?: number;
  estimatedRisk?: number;
  contextSnapshotId?: string;
  judgmentId?: string;
  goalPriorityScore?: number;
  strategies?: PlanningStrategy[];   // Generate one plan per strategy
}

export interface AddPlanDependencyInput {
  sourceId: string;
  targetId: string;
  sourceType: "plan" | "milestone" | "step";
  dependencyType?: PlanDependencyType;
  note?: string;
}

export interface RecordPlanHistoryInput {
  planId: string;
  eventType: PlanEventType;
  version: number;
  snapshot: Record<string, unknown>;
  note?: string;
  decidedBy?: string;
}

export interface AddPlanMetricInput {
  planId: string;
  metricKey: string;
  metricValue?: number;
  unit?: string;
  targetValue?: number;
}
