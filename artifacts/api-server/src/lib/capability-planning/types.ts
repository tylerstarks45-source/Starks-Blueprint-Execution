// ─────────────────────────────────────────────────────────────────────────────
// Build 022: Capability Planning Engine — Types
// Self-contained: no re-export from external packages.
// ─────────────────────────────────────────────────────────────────────────────

// ── Extension Point IDs ───────────────────────────────────────────────────────
export const EP_CAPABILITY_PLAN_FORMED = "capability-planning.capability-plan-formed";
export const EP_DOMAIN_CLASSIFIED = "capability-planning.capability-domain-classified";
export const EP_REQUIREMENT_IDENTIFIED = "capability-planning.capability-requirement-identified";
export const EP_GAP_DETECTED = "capability-planning.capability-gap-detected";
export const EP_DEPENDENCY_MAPPED = "capability-planning.capability-dependency-mapped";
export const EP_READINESS_EVALUATED = "capability-planning.capability-readiness-evaluated";
export const EP_CAPABILITY_EVALUATED = "capability-planning.capability-evaluated";
export const EP_REPORT_GENERATED = "capability-planning.capability-report-generated";

// ── Domain Types (16) ─────────────────────────────────────────────────────────
export type CapabilityDomainType =
  | "leadership"
  | "people"
  | "technology"
  | "infrastructure"
  | "finance"
  | "operations"
  | "marketing"
  | "sales"
  | "customer"
  | "knowledge"
  | "security"
  | "governance"
  | "compliance"
  | "integrations"
  | "automation"
  | "ai";

// ── Maturity Levels ───────────────────────────────────────────────────────────
export type MaturityLevel = "none" | "basic" | "defined" | "managed" | "optimising";
export type ReadinessLevel = "not_ready" | "developing" | "defined" | "managed" | "optimising";
export type GapType = "existing" | "required" | "deficit" | "surplus" | "missing";
export type GapSeverity = "none" | "low" | "medium" | "high" | "critical";
export type BusinessCriticality = "low" | "medium" | "high" | "critical";
export type DependencyType = "capability" | "technology" | "human" | "platform" | "knowledge";
export type BusinessImpact = "low" | "medium" | "high" | "critical";

// ── Core Objects ──────────────────────────────────────────────────────────────
export interface CapabilityRequirement {
  id: string;
  domainId: string;
  planId: string;
  reportId: string;
  businessId: number;
  programId?: string;
  programType?: string;
  capabilityName: string;
  capabilityDescription: string;
  requiredLevel: MaturityLevel;
  currentLevel: MaturityLevel;
  gapSeverity: GapSeverity;
  businessCriticality: BusinessCriticality;
  isMissing: boolean;
  priority: number;
  gaps: CapabilityGap[];
}

export interface CapabilityGap {
  id: string;
  requirementId: string;
  domainId: string;
  planId: string;
  reportId: string;
  businessId: number;
  gapType: GapType;
  gapTitle: string;
  gapDescription: string;
  currentState: string;
  requiredState: string;
  severity: GapSeverity;
  closureNote?: string;
}

export interface CapabilityDomainReadiness {
  id: string;
  domainId: string;
  planId: string;
  reportId: string;
  businessId: number;
  domainType: CapabilityDomainType;
  maturityScore: number;
  maturityLevel: MaturityLevel;
  availabilityScore: number;
  scalabilityScore: number;
  reliabilityScore: number;
  maintainabilityScore: number;
  governanceScore: number;
  overallReadinessScore: number;
  readinessLevel: ReadinessLevel;
  keyGap?: string;
  recommendation?: string;
}

export interface CapabilityDomain {
  id: string;
  planId: string;
  reportId: string;
  businessId: number;
  domainType: CapabilityDomainType;
  domainName: string;
  domainDescription: string;
  requirementCount: number;
  gapCount: number;
  criticalGapCount: number;
  overallMaturityScore: number;
  overallReadinessScore: number;
  businessImpact: BusinessImpact;
  priority: number;
  requirements: CapabilityRequirement[];
  readiness?: CapabilityDomainReadiness;
}

export interface CapabilityDependency {
  id: string;
  planId: string;
  reportId: string;
  businessId: number;
  dependencyType: DependencyType;
  title: string;
  description: string;
  fromDomainType?: CapabilityDomainType;
  toDomainType?: CapabilityDomainType;
  severity: GapSeverity;
  mitigationNote?: string;
}

export interface CapabilityPlan {
  id: string;
  reportId: string;
  businessId: number;
  userId?: number;
  strategicPlanId?: string;
  planningReportId?: string;
  domainCount: number;
  requirementCount: number;
  gapCount: number;
  criticalGapCount: number;
  missingCapabilityCount: number;
  dependencyCount: number;
  overallReadinessScore: number;
  overallMaturityScore: number;
  coverageScore: number;
  completenessScore: number;
  businessImpactScore: number;
  riskScore: number;
  confidence: number;
  domains: CapabilityDomain[];
  dependencies: CapabilityDependency[];
}

// ── Capability Evaluation ─────────────────────────────────────────────────────
export interface CapabilityEvaluation {
  coverageScore: number;
  completenessScore: number;
  readinessScore: number;
  businessImpactScore: number;
  riskScore: number; // inverted: higher = lower risk
  confidenceScore: number;
  overallScore: number;
  narrative: string;
}

// ── Report ────────────────────────────────────────────────────────────────────
export interface CapabilityReport {
  id: string;
  businessId: number;
  userId?: number;
  planningReportId?: string;
  primaryPlanId: string;
  domainCount: number;
  requirementCount: number;
  gapCount: number;
  criticalGapCount: number;
  missingCapabilityCount: number;
  dependencyCount: number;
  overallReadinessScore: number;
  overallMaturityScore: number;
  overallConfidence: number;
  coverageScore: number;
  completenessScore: number;
  executiveSummary: string;
  capabilityDurationMs: number;
  plan: CapabilityPlan;
  evaluation: CapabilityEvaluation;
}

// ── EB Summary (compact) ─────────────────────────────────────────────────────
export interface CapabilitySummary {
  reportId: string;
  planId: string;
  businessId: number;
  domainCount: number;
  requirementCount: number;
  gapCount: number;
  criticalGapCount: number;
  missingCapabilityCount: number;
  overallReadinessScore: number;
  overallReadinessLevel: ReadinessLevel;
  overallMaturityScore: number;
  overallConfidence: number;
  highestRiskGap?: string;
  topCriticalDomains: string[];
  coverageScore: number;
  executiveSummary: string;
  createdAt: Date;
}
