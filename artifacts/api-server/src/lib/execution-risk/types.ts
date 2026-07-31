// ─────────────────────────────────────────────────────────────────────────────
// Build 026: Execution Risk Assessment Engine — Types
// Self-contained: no re-export from external packages.
// ─────────────────────────────────────────────────────────────────────────────

// ── Extension Point IDs ───────────────────────────────────────────────────────
export const EP_OPERATIONAL_RISK_ASSESSED = "execution-risk.operational-risk-assessed";
export const EP_FINANCIAL_RISK_ASSESSED = "execution-risk.financial-risk-assessed";
export const EP_SECURITY_RISK_ASSESSED = "execution-risk.security-risk-assessed";
export const EP_PRIVACY_RISK_ASSESSED = "execution-risk.privacy-risk-assessed";
export const EP_COMPLIANCE_RISK_ASSESSED = "execution-risk.compliance-risk-assessed";
export const EP_REVERSIBILITY_DETERMINED = "execution-risk.reversibility-determined";
export const EP_MITIGATION_PRODUCED = "execution-risk.mitigation-produced";
export const EP_RISK_REPORT_GENERATED = "execution-risk.risk-report-generated";

// ── Risk Categories (6) ───────────────────────────────────────────────────────
export type RiskCategory =
  | "operational"
  | "financial"
  | "security"
  | "privacy"
  | "compliance"
  | "business_continuity";

// ── Risk Level ────────────────────────────────────────────────────────────────
export type RiskLevel = "negligible" | "low" | "medium" | "high" | "critical";

// ── Reversibility ─────────────────────────────────────────────────────────────
export type ReversibilityLevel =
  | "fully_reversible"
  | "partially_reversible"
  | "irreversible"
  | "rollback_available";

// ── Rollback Complexity ───────────────────────────────────────────────────────
export type RollbackComplexity = "none" | "simple" | "moderate" | "complex" | "not_possible";

// ── Mitigation Types ──────────────────────────────────────────────────────────
export type MitigationType =
  | "require_approval"
  | "create_backup"
  | "create_snapshot"
  | "dry_run_first"
  | "human_review"
  | "incremental_rollout"
  | "monitor_closely"
  | "staged_deployment";

// ── Mitigation Priority ───────────────────────────────────────────────────────
export type MitigationPriority = "low" | "medium" | "high" | "critical";

// ── Core Objects ──────────────────────────────────────────────────────────────

export interface RiskFactor {
  factor: string;
  contribution: number; // 0–1
  rationale: string;
}

export interface RiskCategoryAssessment {
  category: RiskCategory;
  riskLevel: RiskLevel;
  riskScore: number; // 0–1; higher = riskier
  factors: RiskFactor[];
  rationale: string;
}

export interface ExecutionRiskProfile {
  id: string;
  reportId: string;
  businessId: number;
  assignmentId: string;
  workPackageId?: string;
  packageTitle?: string;
  ownerType: string;
  executionClass: string;
  complexityLevel: string;
  businessCriticality: string;
  operationalRiskScore: number;
  financialRiskScore: number;
  securityRiskScore: number;
  privacyRiskScore: number;
  complianceRiskScore: number;
  continuityRiskScore: number;
  overallRiskScore: number;
  overallRiskLevel: RiskLevel;
  categories: RiskCategoryAssessment[];
  reversibilityLevel: ReversibilityLevel;
  rollbackComplexity: RollbackComplexity;
  rollbackNote: string;
}

export interface RiskDependency {
  fromCategory: RiskCategory;
  toCategory: RiskCategory;
  dependencyReason: string;
  isCritical: boolean;
}

export interface RiskMitigation {
  id: string;
  reportId: string;
  businessId: number;
  profileId?: string;
  mitigationType: MitigationType;
  title: string;
  description: string;
  priority: MitigationPriority;
  applicableTo: string; // owner type or "all"
  riskCategoriesAddressed: RiskCategory[];
  estimatedEffort: string;
}

export interface ExecutionSafetyScore {
  id: string;
  reportId: string;
  businessId: number;
  safetyScore: number; // 0–1; higher = safer
  rollbackReadiness: number; // 0–1
  reversibilityScore: number; // 0–1
  mitigationCoverageScore: number; // 0–1
  overallRiskScore: number;
  highestRiskCategory: RiskCategory;
  highestRiskLevel: RiskLevel;
  isSafeToExecute: boolean;
  safetyNarrative: string;
}

export interface ExecutionRiskReport {
  id: string;
  businessId: number;
  userId?: number;
  authorityReportId?: string;
  orchestrationReportId?: string;
  profileCount: number;
  mitigationCount: number;
  overallRiskScore: number;
  overallRiskLevel: RiskLevel;
  safetyScore: number;
  rollbackReadiness: number;
  highestRiskCategory: RiskCategory;
  highestRiskLevel: RiskLevel;
  isSafeToExecute: boolean;
  executiveSummary: string;
  assessmentDurationMs: number;
  profiles: ExecutionRiskProfile[];
  mitigations: RiskMitigation[];
  safetyScoreRecord: ExecutionSafetyScore;
}

// ── EB Summary (compact) ─────────────────────────────────────────────────────
export interface ExecutionRiskSummary {
  reportId: string;
  businessId: number;
  profileCount: number;
  mitigationCount: number;
  overallRiskScore: number;
  overallRiskLevel: RiskLevel;
  safetyScore: number;
  rollbackReadiness: number;
  highestRiskCategory: RiskCategory;
  highestRiskLevel: RiskLevel;
  isSafeToExecute: boolean;
  executiveSummary: string;
  createdAt: Date;
}
