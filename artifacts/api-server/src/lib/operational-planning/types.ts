// ─────────────────────────────────────────────────────────────────────────────
// Build 023: Operational Planning Engine — Types
// Self-contained: no re-export from external packages.
// ─────────────────────────────────────────────────────────────────────────────

// ── Extension Point IDs ───────────────────────────────────────────────────────
export const EP_OPERATIONAL_PLAN_FORMED = "operational-planning.operational-plan-formed";
export const EP_WORK_PACKAGE_CREATED = "operational-planning.work-package-created";
export const EP_PHASE_ORGANIZED = "operational-planning.phase-organized";
export const EP_DEPENDENCY_RESOLVED = "operational-planning.dependency-resolved";
export const EP_EXECUTION_SEQUENCE_PRODUCED = "operational-planning.execution-sequence-produced";
export const EP_READINESS_VERIFIED = "operational-planning.readiness-verified";
export const EP_OPERATIONAL_EVALUATED = "operational-planning.operational-evaluated";
export const EP_OPERATIONAL_REPORT_GENERATED = "operational-planning.operational-report-generated";

// ── Phase Types (5) ───────────────────────────────────────────────────────────
export type OperationalPhaseType =
  | "preparation"
  | "foundation"
  | "implementation"
  | "validation"
  | "optimization";

// ── Complexity, Readiness, and Dependency Levels ──────────────────────────────
export type ComplexityLevel = "low" | "medium" | "high" | "critical";
export type BusinessCriticality = "low" | "medium" | "high" | "critical";
export type DependencySeverity = "low" | "medium" | "high" | "critical";
export type OperationalReadinessLevel = "not_ready" | "developing" | "defined" | "managed" | "optimising";
export type ExecutionDependencyType =
  | "package"
  | "capability"
  | "technology"
  | "cross_functional"
  | "external";

// ── Core Objects ──────────────────────────────────────────────────────────────
export interface WorkPackage {
  id: string;
  phaseId: string;
  planId: string;
  reportId: string;
  businessId: number;
  capabilityRequirementId?: string;
  capabilityName: string;
  packageTitle: string;
  packageDescription: string;
  outcomeStatement: string;
  phaseType: OperationalPhaseType;
  complexityLevel: ComplexityLevel;
  businessCriticality: BusinessCriticality;
  effortScore: number;
  sequencePosition?: number;
  priority: number;
}

export interface OperationalPhase {
  id: string;
  planId: string;
  reportId: string;
  businessId: number;
  phaseType: OperationalPhaseType;
  phaseName: string;
  phaseDescription: string;
  phaseOrder: number;
  workPackageCount: number;
  criticalWorkPackageCount: number;
  readinessScore: number;
  priority: number;
  workPackages: WorkPackage[];
}

export interface ExecutionDependency {
  id: string;
  planId: string;
  reportId: string;
  businessId: number;
  dependencyType: ExecutionDependencyType;
  title: string;
  description: string;
  fromPackageId?: string;
  toPackageId?: string;
  fromPhaseType?: OperationalPhaseType;
  toPhaseType?: OperationalPhaseType;
  severity: DependencySeverity;
  mitigationNote?: string;
}

export interface ExecutionSequence {
  id: string;
  planId: string;
  reportId: string;
  businessId: number;
  workPackageId: string;
  sequencePosition: number;
  phaseOrder: number;
  withinPhaseOrder: number;
  prerequisitePackageIds: string[];
  rationale: string;
}

export interface OperationalReadiness {
  id: string;
  planId: string;
  reportId: string;
  businessId: number;
  capabilityReadinessScore: number;
  operationalReadinessScore: number;
  technologyReadinessScore: number;
  governanceReadinessScore: number;
  executionConfidenceScore: number;
  overallReadinessScore: number;
  readinessLevel: OperationalReadinessLevel;
  keyBlocker?: string;
  recommendation?: string;
}

export interface OperationalPlan {
  id: string;
  reportId: string;
  businessId: number;
  userId?: number;
  capabilityPlanId?: string;
  capabilityReportId?: string;
  phaseCount: number;
  workPackageCount: number;
  dependencyCount: number;
  criticalDependencyCount: number;
  sequenceCount: number;
  executionReadinessScore: number;
  executionConfidence: number;
  completenessScore: number;
  feasibilityScore: number;
  complexityScore: number;
  riskScore: number;
  readinessScore: number;
  confidenceScore: number;
  overallScore: number;
  phases: OperationalPhase[];
  dependencies: ExecutionDependency[];
  sequences: ExecutionSequence[];
  readiness: OperationalReadiness;
}

// ── Evaluation ────────────────────────────────────────────────────────────────
export interface OperationalEvaluation {
  completenessScore: number;
  feasibilityScore: number;
  complexityScore: number; // inverted: higher = lower complexity
  riskScore: number;       // inverted: higher = lower risk
  readinessScore: number;
  confidenceScore: number;
  overallScore: number;
  narrative: string;
}

// ── Report ────────────────────────────────────────────────────────────────────
export interface OperationalReport {
  id: string;
  businessId: number;
  userId?: number;
  capabilityReportId?: string;
  primaryPlanId: string;
  phaseCount: number;
  workPackageCount: number;
  dependencyCount: number;
  criticalDependencyCount: number;
  sequenceCount: number;
  executionReadinessScore: number;
  executionConfidence: number;
  overallScore: number;
  executiveSummary: string;
  operationalDurationMs: number;
  plan: OperationalPlan;
  evaluation: OperationalEvaluation;
}

// ── EB Summary (compact) ─────────────────────────────────────────────────────
export interface OperationalSummary {
  reportId: string;
  planId: string;
  businessId: number;
  phaseCount: number;
  workPackageCount: number;
  criticalDependencyCount: number;
  executionReadinessScore: number;
  executionReadinessLevel: OperationalReadinessLevel;
  executionConfidence: number;
  overallScore: number;
  executiveSummary: string;
  createdAt: Date;
}
