// ─── Executive Reflection Engine — Types (Build 012) ─────────────────────────
//
// All application-layer types.
// Self-contained — no re-exports from @workspace/db.
// Reflection NEVER changes plans, goals, executions, or memory.
// Reflection ONLY explains completed Executive Cases.

// ── Enumerations ──────────────────────────────────────────────────────────────

export const CASE_COMPLETION_STATUSES = [
  "in_progress",
  "completed",
  "failed",
  "partial",
  "abandoned",
] as const;
export type CaseCompletionStatus = (typeof CASE_COMPLETION_STATUSES)[number];

export const CASE_MEMBER_OBJECT_TYPES = [
  "goal",
  "plan",
  "execution",
  "observation_chain",
  "judgment",
  "context_snapshot",
  "observation",
  "memory_artifact",
] as const;
export type CaseMemberObjectType = (typeof CASE_MEMBER_OBJECT_TYPES)[number];

export const CASE_MEMBER_ROLES = ["primary", "participant", "supporting"] as const;
export type CaseMemberRole = (typeof CASE_MEMBER_ROLES)[number];

export const FACTOR_CATEGORIES = [
  "context",
  "knowledge",
  "goal_priority",
  "planning_strategy",
  "execution_quality",
  "external_factors",
  "timing",
  "business_constraints",
  "confidence",
] as const;
export type FactorCategory = (typeof FACTOR_CATEGORIES)[number];

export const FACTOR_DIRECTIONS = ["positive", "negative", "neutral", "mixed"] as const;
export type FactorDirection = (typeof FACTOR_DIRECTIONS)[number];

export const SCORE_DIMENSIONS = [
  "decision_quality",
  "planning_quality",
  "execution_quality",
  "consistency",
  "goal_alignment",
  "strategic_alignment",
  "resource_efficiency",
  "evidence_quality",
] as const;
export type ScoreDimension = (typeof SCORE_DIMENSIONS)[number];

export const TIMELINE_EVENT_CATEGORIES = [
  "reasoning",
  "context",
  "goal",
  "judgment",
  "planning",
  "execution",
  "observation",
  "system",
] as const;
export type TimelineEventCategory = (typeof TIMELINE_EVENT_CATEGORIES)[number];

export const EVIDENCE_TYPES = [
  "observation",
  "execution_event",
  "plan_decision",
  "goal_change",
  "judgment_record",
  "context_shift",
] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

// ── Extension point IDs ────────────────────────────────────────────────────────

export const REFLECTION_EXTENSION_POINT_IDS = {
  CASE_OPENED:                 "reflection-case-opened",
  CASE_CLOSED:                 "reflection-case-closed",
  REFLECTION_STARTED:          "reflection-started",
  REFLECTION_REPORT_PRODUCED:  "reflection-report-produced",
  CAUSAL_LINK_IDENTIFIED:      "reflection-causal-link-identified",
  QUALITY_THRESHOLD_BREACHED:  "reflection-quality-threshold-breached",
  LEARNING_READY:              "reflection-learning-ready",
  FACTOR_IDENTIFIED:           "reflection-factor-identified",
} as const;

// ── Executive Case ─────────────────────────────────────────────────────────────

export interface ExecutiveCase {
  id: string;
  userId: number | null;
  rootRequest: string | null;
  businessDomain: string | null;
  strategicCategory: string | null;
  primaryGoalId: string | null;
  primaryPlanId: string | null;
  primaryExecutionId: string | null;
  primaryChainId: string | null;
  startedAt: Date;
  endedAt: Date | null;
  durationMs: number | null;
  completionStatus: CaseCompletionStatus;
  primaryOutcome: string | null;
  closedAt: Date | null;
  isClosed: boolean;
  reflectionReportId: string | null;
  version: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface CaseMember {
  id: string;
  caseId: string;
  objectId: string;
  objectType: CaseMemberObjectType;
  role: CaseMemberRole;
  addedAt: Date;
}

export interface CaseTimelineEvent {
  id: string;
  caseId: string;
  sequenceNumber: number;
  eventType: string;
  eventCategory: TimelineEventCategory;
  eventDescription: string | null;
  sourceObjectId: string | null;
  sourceObjectType: string | null;
  observedAt: Date;
  metadata: Record<string, unknown>;
}

// ── Reflection Report ──────────────────────────────────────────────────────────

export interface ReflectionReport {
  id: string;
  caseId: string;
  userId: number | null;
  executiveSummary: string;
  primaryFactors: string[];
  strengths: string[];
  weaknesses: string[];
  missedOpportunities: string[];
  unexpectedOutcomes: string[];
  businessImpact: string | null;
  reflectionConfidence: number;
  evidenceQuality: number;
  overallQualityScore: number;
  producedAt: Date;
  version: number;
  metadata: Record<string, unknown>;
}

export interface ReflectionFactor {
  id: string;
  reportId: string;
  caseId: string;
  userId: number | null;
  factorCategory: FactorCategory;
  factorDescription: string;
  influenceScore: number;
  direction: FactorDirection;
  evidence: Record<string, unknown>[];
  createdAt: Date;
}

export interface ReflectionScore {
  id: string;
  reportId: string;
  caseId: string;
  userId: number | null;
  scoreDimension: ScoreDimension;
  score: number;
  explanation: string;
  evidenceCount: number;
  createdAt: Date;
}

export interface ReflectionEvidence {
  id: string;
  reportId: string;
  caseId: string;
  evidenceType: EvidenceType;
  sourceObjectId: string | null;
  sourceObjectType: string | null;
  summary: string;
  strength: number;
  payload: Record<string, unknown>;
  recordedAt: Date;
}

// ── Decision Reconstruction ────────────────────────────────────────────────────

export interface DecisionTimeline {
  caseId: string;
  events: CaseTimelineEvent[];
  totalEvents: number;
  firstEventAt: Date | null;
  lastEventAt: Date | null;
  categoryCounts: Record<string, number>;
}

// ── Causal Analysis ────────────────────────────────────────────────────────────

export interface CausalLink {
  causeEventId: string;
  causeDescription: string;
  effectEventId: string | null;
  effectDescription: string;
  linkType: "direct" | "indirect" | "enabling" | "inhibiting";
  strength: number;
}

export interface CausalAnalysis {
  caseId: string;
  links: CausalLink[];
  primaryCauses: string[];
  primaryEffects: string[];
}

// ── Quality Assessment ─────────────────────────────────────────────────────────

export interface QualityScoreResult {
  dimension: ScoreDimension;
  score: number;
  explanation: string;
  evidenceCount: number;
}

export interface QualityAssessment {
  scores: QualityScoreResult[];
  overallScore: number;
  confidence: number;
}

// ── Reflection Summary (Executive Brain advisory) ─────────────────────────────

export interface ReflectionSummary {
  recentCaseCount: number;
  completedCaseCount: number;
  failedCaseCount: number;
  averageQualityScore: number;
  latestCaseId: string | null;
  latestReportId: string | null;
  summaryText: string;
}

// ── Service inputs ─────────────────────────────────────────────────────────────

export interface OpenCaseInput {
  userId: number;
  rootRequest?: string;
  businessDomain?: string;
  strategicCategory?: string;
  primaryGoalId?: string;
  primaryPlanId?: string;
  primaryExecutionId?: string;
  primaryChainId?: string;
  metadata?: Record<string, unknown>;
}

export interface ReflectOnCaseInput {
  caseId: string;
  userId: number;
  forceReflect?: boolean;  // reflect even if already has a report
}

// ── Diagnostics ────────────────────────────────────────────────────────────────

export interface ReflectionDiagnostics {
  totalCases: number;
  openCases: number;
  closedCases: number;
  totalReports: number;
  averageQualityScore: number;
  byCompletionStatus: Record<string, number>;
  recentReflections: number;
}
