// ─────────────────────────────────────────────────────────────────────────────
// Build 024: Execution Orchestration Engine — Types
// Self-contained: no re-export from external packages.
// ─────────────────────────────────────────────────────────────────────────────

// ── Extension Point IDs ───────────────────────────────────────────────────────
export const EP_EXECUTION_PLAN_FORMED = "execution-orchestration.execution-plan-formed";
export const EP_ASSIGNMENT_DETERMINED = "execution-orchestration.assignment-determined";
export const EP_OWNER_CLASSIFIED = "execution-orchestration.owner-classified";
export const EP_QUEUE_CONSTRUCTED = "execution-orchestration.queue-constructed";
export const EP_POLICY_VALIDATED = "execution-orchestration.policy-validated";
export const EP_BLOCKER_DETECTED = "execution-orchestration.blocker-detected";
export const EP_READINESS_MEASURED = "execution-orchestration.readiness-measured";
export const EP_ORCHESTRATION_REPORT_GENERATED = "execution-orchestration.orchestration-report-generated";

// ── Owner Types (7) ───────────────────────────────────────────────────────────
export type ExecutionOwnerType =
  | "human"
  | "department"
  | "ai_agent"
  | "automation"
  | "integration"
  | "external_system"
  | "future_capability";

// ── Execution Classes (5) ─────────────────────────────────────────────────────
export type ExecutionClass =
  | "manual"
  | "semi_automated"
  | "automated"
  | "external"
  | "deferred";

// ── Policy Types (5) ──────────────────────────────────────────────────────────
export type ExecutionPolicyType =
  | "governance"
  | "permissions"
  | "security"
  | "approval"
  | "risk";

export type PolicyStatus = "satisfied" | "pending" | "violated" | "deferred";

// ── Blocker Types (5) ─────────────────────────────────────────────────────────
export type BlockerType =
  | "missing_capability"
  | "missing_approval"
  | "missing_dependency"
  | "missing_integration"
  | "missing_resource";

export type BlockerSeverity = "low" | "medium" | "high" | "critical";
export type ComplexityLevel = "low" | "medium" | "high" | "critical";
export type BusinessCriticality = "low" | "medium" | "high" | "critical";
export type ExecutionReadinessLevel = "not_ready" | "developing" | "defined" | "managed" | "optimising";

// ── Core Objects ──────────────────────────────────────────────────────────────
export interface ExecutionOwner {
  id: string;
  planId: string;
  reportId: string;
  businessId: number;
  ownerType: ExecutionOwnerType;
  ownerName: string;
  ownerDescription: string;
  executionClass: ExecutionClass;
  assignmentCount: number;
  averageComplexity: ComplexityLevel;
  readinessScore: number;
}

export interface ExecutionBlocker {
  blockerType: BlockerType;
  title: string;
  description: string;
  severity: BlockerSeverity;
  mitigationNote?: string;
}

export interface ExecutionPolicy {
  id: string;
  planId: string;
  reportId: string;
  businessId: number;
  assignmentId?: string;
  policyType: ExecutionPolicyType;
  policyTitle: string;
  policyDescription: string;
  policyStatus: PolicyStatus;
  severity: BlockerSeverity;
  requiresApproval: boolean;
  mitigationNote?: string;
}

export interface ExecutionAssignment {
  id: string;
  planId: string;
  reportId: string;
  businessId: number;
  ownerId: string;
  workPackageId: string;
  packageTitle: string;
  phaseType: string;
  ownerType: ExecutionOwnerType;
  executionClass: ExecutionClass;
  complexityLevel: ComplexityLevel;
  businessCriticality: BusinessCriticality;
  blockers: ExecutionBlocker[];
  policies: ExecutionPolicy[];
  readinessScore: number;
  sequencePosition?: number;
  rationale: string;
}

export interface ExecutionQueue {
  id: string;
  planId: string;
  reportId: string;
  businessId: number;
  assignmentId: string;
  workPackageId: string;
  queuePosition: number;
  phaseOrder: number;
  ownerType: ExecutionOwnerType;
  executionClass: ExecutionClass;
  priorityScore: number;
  isBlocked: boolean;
  blockerSummary?: string;
}

export interface ExecutionReadinessResult {
  id: string;
  planId: string;
  reportId: string;
  businessId: number;
  operationalReadinessScore: number;
  capabilityReadinessScore: number;
  policyReadinessScore: number;
  dependencyReadinessScore: number;
  overallReadinessScore: number;
  readinessLevel: ExecutionReadinessLevel;
  executionConfidence: number;
  keyBlocker?: string;
  recommendation?: string;
}

export interface ExecutionPlan {
  id: string;
  reportId: string;
  businessId: number;
  userId?: number;
  operationalPlanId?: string;
  operationalReportId?: string;
  assignmentCount: number;
  ownerCount: number;
  queueCount: number;
  blockerCount: number;
  criticalBlockerCount: number;
  policyCount: number;
  automatedCount: number;
  manualCount: number;
  deferredCount: number;
  automationRatio: number;
  executionReadinessScore: number;
  executionConfidence: number;
  overallScore: number;
  owners: ExecutionOwner[];
  assignments: ExecutionAssignment[];
  queues: ExecutionQueue[];
  policies: ExecutionPolicy[];
  readiness: ExecutionReadinessResult;
}

// ── Evaluation ────────────────────────────────────────────────────────────────
export interface OrchestrationEvaluation {
  assignmentCompletenessScore: number;
  automationReadinessScore: number;
  blockerResolutionScore: number;
  policyComplianceScore: number;
  readinessScore: number;
  confidenceScore: number;
  overallScore: number;
  narrative: string;
}

// ── Report ────────────────────────────────────────────────────────────────────
export interface ExecutionOrchestrationReport {
  id: string;
  businessId: number;
  userId?: number;
  operationalReportId?: string;
  primaryPlanId: string;
  assignmentCount: number;
  ownerCount: number;
  queueCount: number;
  blockerCount: number;
  criticalBlockerCount: number;
  policyCount: number;
  automatedCount: number;
  manualCount: number;
  deferredCount: number;
  automationRatio: number;
  executionReadinessScore: number;
  executionConfidence: number;
  overallScore: number;
  executiveSummary: string;
  orchestrationDurationMs: number;
  plan: ExecutionPlan;
  evaluation: OrchestrationEvaluation;
}

// ── EB Summary (compact) ─────────────────────────────────────────────────────
export interface ExecutionOrchestrationSummary {
  reportId: string;
  planId: string;
  businessId: number;
  assignmentCount: number;
  automatedCount: number;
  manualCount: number;
  deferredCount: number;
  blockerCount: number;
  criticalBlockerCount: number;
  automationRatio: number;
  executionReadinessScore: number;
  executionReadinessLevel: ExecutionReadinessLevel;
  executionConfidence: number;
  overallScore: number;
  executiveSummary: string;
  createdAt: Date;
}
