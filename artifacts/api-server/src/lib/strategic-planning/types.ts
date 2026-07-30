// ─────────────────────────────────────────────────────────────────────────────
// Build 021: Strategic Planning Engine — Types
// Self-contained: no re-export from external packages.
// ─────────────────────────────────────────────────────────────────────────────

// ── Extension Point IDs ───────────────────────────────────────────────────────
export const EP_PLANNING_FORMED = "strategic-planning.planning-formed";
export const EP_PROGRAM_DEFINED = "strategic-planning.planning-program-defined";
export const EP_INITIATIVE_DEFINED = "strategic-planning.planning-initiative-defined";
export const EP_MILESTONE_DEFINED = "strategic-planning.planning-milestone-defined";
export const EP_DEPENDENCY_IDENTIFIED = "strategic-planning.planning-dependency-identified";
export const EP_SEQUENCE_DETERMINED = "strategic-planning.planning-sequence-determined";
export const EP_READINESS_EVALUATED = "strategic-planning.planning-readiness-evaluated";
export const EP_REPORT_GENERATED = "strategic-planning.planning-report-generated";

// ── Program Types ─────────────────────────────────────────────────────────────
export type ProgramType =
  | "revenue_program"
  | "operations_program"
  | "customer_program"
  | "innovation_program"
  | "technology_program"
  | "market_program"
  | "talent_program"
  | "finance_program"
  | "governance_program";

// ── Initiative Types ──────────────────────────────────────────────────────────
export type InitiativeType =
  | "discovery"
  | "development"
  | "deployment"
  | "optimisation"
  | "governance";

// ── Effort / Complexity / Severity enums ─────────────────────────────────────
export type EffortLevel = "low" | "medium" | "high";
export type ComplexityLevel = "low" | "medium" | "high";
export type SeverityLevel = "low" | "medium" | "high" | "critical";
export type ReadinessLevel = "not_ready" | "low" | "medium" | "high" | "ready";
export type PlanHorizon = "short" | "medium" | "long";
export type MilestoneType = "foundation" | "progress" | "achievement" | "validation";
export type DependencyType = "program" | "initiative" | "technology" | "resource" | "cross_functional";
export type SequenceEntityType = "program" | "initiative";
export type ReadinessDimension = "resource" | "technology" | "business" | "financial" | "governance";

// ── Core Objects ──────────────────────────────────────────────────────────────
export interface StrategicProgram {
  id: string;
  planId: string;
  reportId: string;
  businessId: number;
  pillarId?: string;
  pillarType: string;
  programType: ProgramType;
  programName: string;
  programDescription: string;
  priority: number;
  weight: number;
  expectedDuration: PlanHorizon;
  initiativeCount: number;
  sequenceLayer: number;
  alignmentScore: number;
  confidence: number;
  initiatives: StrategicInitiative[];
}

export interface StrategicInitiative {
  id: string;
  programId: string;
  planId: string;
  reportId: string;
  businessId: number;
  initiativeName: string;
  initiativeDescription: string;
  initiativeType: InitiativeType;
  effort: EffortLevel;
  complexity: ComplexityLevel;
  priority: number;
  sequencePosition: number;
  milestoneCount: number;
  alignmentScore: number;
  confidence: number;
  milestones: PlanningMilestone[];
}

export interface PlanningMilestone {
  id: string;
  initiativeId: string;
  programId: string;
  planId: string;
  reportId: string;
  businessId: number;
  milestoneType: MilestoneType;
  milestoneName: string;
  milestoneDescription: string;
  successCriteria: string;
  sequencePosition: number;
  isCriticalPath: boolean;
}

export interface PlanningDependency {
  id: string;
  planId: string;
  reportId: string;
  businessId: number;
  dependencyType: DependencyType;
  title: string;
  description: string;
  fromEntityType?: string;
  fromEntityId?: string;
  toEntityType?: string;
  toEntityId?: string;
  severity: SeverityLevel;
  mitigationNote?: string;
}

export interface PlanningSequence {
  id: string;
  planId: string;
  reportId: string;
  businessId: number;
  entityType: SequenceEntityType;
  entityId: string;
  entityName: string;
  sequenceLayer: number;
  sequencePosition: number;
  predecessorIds: string[];
  canParallelise: boolean;
  rationale: string;
}

export interface StrategicPlan {
  id: string;
  reportId: string;
  businessId: number;
  userId?: number;
  strategyId?: string;
  strategyReportId?: string;
  planName: string;
  planDescription: string;
  planHorizon: PlanHorizon;
  programCount: number;
  initiativeCount: number;
  milestoneCount: number;
  dependencyCount: number;
  readinessScore: number;
  completenessScore: number;
  feasibilityScore: number;
  alignmentScore: number;
  complexityScore: number;
  riskScore: number;
  confidence: number;
  programs: StrategicProgram[];
  dependencies: PlanningDependency[];
  sequences: PlanningSequence[];
}

// ── Readiness ─────────────────────────────────────────────────────────────────
export interface ReadinessDimensionScore {
  dimension: ReadinessDimension;
  score: number;
  level: ReadinessLevel;
  gap: string;
  recommendation: string;
}

export interface ReadinessProfile {
  overall: number;
  overallLevel: ReadinessLevel;
  dimensions: ReadinessDimensionScore[];
  criticalGaps: string[];
}

// ── Evaluation ────────────────────────────────────────────────────────────────
export interface PlanningEvaluation {
  completenessScore: number;
  feasibilityScore: number;
  alignmentScore: number;
  complexityScore: number; // 1=very complex, lower=more complex
  riskScore: number; // inverted: higher=less risky
  confidenceScore: number;
  overallScore: number;
  narrative: string;
}

// ── Report ────────────────────────────────────────────────────────────────────
export interface PlanningReport {
  id: string;
  businessId: number;
  userId?: number;
  strategyReportId?: string;
  primaryPlanId: string;
  programCount: number;
  initiativeCount: number;
  milestoneCount: number;
  dependencyCount: number;
  sequenceCount: number;
  overallReadinessScore: number;
  overallConfidence: number;
  completenessScore: number;
  feasibilityScore: number;
  alignmentScore: number;
  executiveSummary: string;
  planningDurationMs: number;
  plan: StrategicPlan;
  readiness: ReadinessProfile;
  evaluation: PlanningEvaluation;
}

// ── EB Summary (compact) ─────────────────────────────────────────────────────
export interface PlanningSummary {
  reportId: string;
  planId: string;
  businessId: number;
  programCount: number;
  initiativeCount: number;
  milestoneCount: number;
  overallReadinessScore: number;
  overallReadinessLevel: ReadinessLevel;
  overallConfidence: number;
  topProgramNames: string[];
  criticalDependencyCount: number;
  feasibilityScore: number;
  executiveSummary: string;
  createdAt: Date;
}
