// ─────────────────────────────────────────────────────────────────────────────
// Build 025: Authority Resolution Engine — Types
// Self-contained: no re-export from external packages.
// ─────────────────────────────────────────────────────────────────────────────

// ── Extension Point IDs ───────────────────────────────────────────────────────
export const EP_AUTHORITY_REQUIREMENTS_DERIVED = "authority-resolution.authority-requirements-derived";
export const EP_SCOPE_RESOLVED = "authority-resolution.scope-resolved";
export const EP_AUTHORITY_VALIDATED = "authority-resolution.authority-validated";
export const EP_DEPENDENCY_MAPPED = "authority-resolution.dependency-mapped";
export const EP_APPROVAL_RESOLVED = "authority-resolution.approval-resolved";
export const EP_AUTHORITY_EVALUATED = "authority-resolution.authority-evaluated";
export const EP_AUTHORITY_REPORT_GENERATED = "authority-resolution.authority-report-generated";
export const EP_AUTHORITY_SNAPSHOT_TAKEN = "authority-resolution.authority-snapshot-taken";

// ── Authority Types (8) ───────────────────────────────────────────────────────
export type AuthorityType =
  | "legal"
  | "operational"
  | "technical"
  | "user_granted"
  | "data_access"
  | "system_access"
  | "external_api"
  | "governance";

// ── Authority Status (5) ──────────────────────────────────────────────────────
export type AuthorityStatus =
  | "granted"
  | "pending"
  | "expired"
  | "denied"
  | "unavailable";

// ── Authority Scope (8) ───────────────────────────────────────────────────────
export type AuthorityScopeType =
  | "user"
  | "business"
  | "project"
  | "workspace"
  | "organization"
  | "device"
  | "cloud_resource"
  | "integration";

// ── Decision Types ────────────────────────────────────────────────────────────
export type DecisionType =
  | "authorized"
  | "pending_approval"
  | "blocked"
  | "deferred";

// ── Approval Levels ───────────────────────────────────────────────────────────
export type ApprovalLevel =
  | "none"
  | "user"
  | "admin"
  | "governance"
  | "executive";

// ── Risk Levels ───────────────────────────────────────────────────────────────
export type RiskLevel = "low" | "medium" | "high" | "critical";

// ── Grant Status ──────────────────────────────────────────────────────────────
export type GrantStatus = "pending" | "active" | "expired" | "revoked";

// ── Authority Source ──────────────────────────────────────────────────────────
export type AuthoritySource =
  | "implicit"
  | "explicit_user"
  | "explicit_admin"
  | "governance_policy"
  | "system_default"
  | "integration_oauth";

// ── Core Objects ──────────────────────────────────────────────────────────────

export interface AuthorityRequirement {
  id: string;
  planId: string;
  reportId: string;
  businessId: number;
  assignmentId?: string;
  workPackageId?: string;
  authorityType: AuthorityType;
  scopeType: AuthorityScopeType;
  title: string;
  description: string;
  status: AuthorityStatus;
  rationale: string;
  requiresApproval: boolean;
  approvalLevel: ApprovalLevel;
  riskLevel: RiskLevel;
}

export interface AuthorityGrant {
  id: string;
  requirementId: string;
  planId: string;
  reportId: string;
  businessId: number;
  grantedBy: string;
  grantStatus: GrantStatus;
  expiresAt?: Date;
  authoritySource: AuthoritySource;
  notes: string;
}

export interface AuthorityScope {
  id: string;
  planId: string;
  reportId: string;
  businessId: number;
  scopeType: AuthorityScopeType;
  scopeTarget: string;
  isResolved: boolean;
  requiresElevation: boolean;
  resolutionNote: string;
}

export interface AuthorityDependency {
  fromAuthorityType: AuthorityType;
  toAuthorityType: AuthorityType;
  dependencyReason: string;
  isCritical: boolean;
}

export interface AuthorityDecision {
  id: string;
  requirementId: string;
  planId: string;
  reportId: string;
  businessId: number;
  decisionType: DecisionType;
  decisionRationale: string;
  requiresApproval: boolean;
  approvalLevel: ApprovalLevel;
  confidence: number;
}

export interface AuthorityPlan {
  id: string;
  reportId: string;
  businessId: number;
  userId?: number;
  orchestrationPlanId?: string;
  scopeCount: number;
  requirementCount: number;
  grantedCount: number;
  pendingCount: number;
  deniedCount: number;
  dependencyCount: number;
  decisionCount: number;
  approvalRequiredCount: number;
  coverageScore: number;
  completenessScore: number;
  riskScore: number;
  trustScore: number;
  readinessScore: number;
  confidenceScore: number;
  overallScore: number;
  requirements: AuthorityRequirement[];
  grants: AuthorityGrant[];
  scopes: AuthorityScope[];
  dependencies: AuthorityDependency[];
  decisions: AuthorityDecision[];
}

// ── Evaluation ────────────────────────────────────────────────────────────────
export interface AuthorityEvaluation {
  coverageScore: number;
  completenessScore: number;
  riskScore: number;
  trustScore: number;
  readinessScore: number;
  confidenceScore: number;
  overallScore: number;
  narrative: string;
}

// ── Report ────────────────────────────────────────────────────────────────────
export interface AuthorityResolutionReport {
  id: string;
  businessId: number;
  userId?: number;
  orchestrationReportId?: string;
  primaryPlanId: string;
  requirementCount: number;
  grantedCount: number;
  pendingCount: number;
  deniedCount: number;
  expiredCount: number;
  unavailableCount: number;
  missingCount: number;
  approvalRequiredCount: number;
  authorizationScore: number;
  authorityConfidence: number;
  overallScore: number;
  isAuthorized: boolean;
  executiveSummary: string;
  resolutionDurationMs: number;
  plan: AuthorityPlan;
  evaluation: AuthorityEvaluation;
}

// ── EB Summary (compact) ─────────────────────────────────────────────────────
export interface AuthoritySummary {
  reportId: string;
  planId: string;
  businessId: number;
  requirementCount: number;
  grantedCount: number;
  pendingCount: number;
  deniedCount: number;
  missingCount: number;
  approvalRequiredCount: number;
  authorizationScore: number;
  authorityConfidence: number;
  overallScore: number;
  isAuthorized: boolean;
  executiveSummary: string;
  createdAt: Date;
}
