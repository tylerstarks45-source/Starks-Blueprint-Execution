// ─── Build 014: Executive Governance & Adaptation Engine — Types ──────────────

// ── Enumerations ──────────────────────────────────────────────────────────────

export type PolicyStatus = "draft" | "proposed" | "approved" | "rejected" | "retired";

export type PolicyType =
  | "planning_guidance"
  | "execution_guidance"
  | "judgment_guidance"
  | "goal_prioritization"
  | "execution_strategy"
  | "context_weighting"
  | "general";

export type PolicyDecisionType =
  | "approve"
  | "reject"
  | "defer"
  | "merge"
  | "split"
  | "supersede";

export type ConflictType =
  | "contradicting"
  | "overlapping_domain"
  | "duplicate_guidance"
  | "priority_conflict"
  | "deprecated_dependency"
  | "cycle";

export type ProfileType =
  | "conservative"
  | "balanced"
  | "aggressive"
  | "experimental"
  | "custom";

export type AdaptationPlanStatus =
  | "draft"
  | "approved"
  | "executing"
  | "executed"
  | "rolled_back"
  | "failed";

// ── Executive Policy ──────────────────────────────────────────────────────────

export interface ExecutivePolicy {
  id: string;
  userId: number | null;
  title: string;
  description: string;
  sourcePrincipleIds: string[];
  businessDomains: string[];
  strategicCategories: string[];
  policyType: PolicyType;
  priority: number;          // 1 (highest) – 10 (lowest)
  status: PolicyStatus;
  guidance: string;          // human-readable advisory text for EB
  effectiveDate: Date | null;
  expirationDate: Date | null;
  version: number;
  conflictIds: string[];
  approvedAt: Date | null;
  rejectedAt: Date | null;
  retiredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

// ── Policy Evaluation Result ──────────────────────────────────────────────────

export interface PolicyEvaluationResult {
  decision: PolicyDecisionType;
  rationale: string;
  proposedPolicy?: Omit<ExecutivePolicy, "id" | "createdAt" | "updatedAt">;
  supersededPolicyId?: string;
  mergedIntoId?: string;
  conflictsDetected: number;
}

// Evaluation thresholds
export const POLICY_THRESHOLDS = {
  MIN_CONFIDENCE_FOR_APPROVAL: 0.65,
  MIN_RELIABILITY_FOR_APPROVAL: 0.55,
  MIN_OBSERVATIONS_FOR_APPROVAL: 3,
  MAX_CONTRADICTION_RATE_FOR_APPROVAL: 0.30,
  REJECT_BELOW_CONFIDENCE: 0.35,
  HIGH_PRIORITY_CONFIDENCE: 0.80,   // confidence needed for priority ≤ 3
} as const;

// ── Policy Conflict ───────────────────────────────────────────────────────────

export interface PolicyConflict {
  id: string;
  policyIdA: string;
  policyIdB: string;
  userId: number | null;
  conflictType: ConflictType;
  severity: number;
  description: string;
  resolved: boolean;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  detectedAt: Date;
  payload: Record<string, unknown>;
}

export interface ConflictReport {
  totalConflicts: number;
  byType: Record<ConflictType, number>;
  highSeverityCount: number;
  affectedPolicies: string[];
  hasCycle: boolean;
}

// ── Behavior Profile ──────────────────────────────────────────────────────────

export interface BehaviorProfile {
  id: string;
  userId: number | null;
  name: string;
  profileType: ProfileType;
  description: string;
  activePolicyIds: string[];
  policyCount: number;
  isActive: boolean;
  version: number;
  activatedAt: Date | null;
  deactivatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

// Profile trait: how the EB should reason under this profile
export interface ProfileTraits {
  riskTolerance: "low" | "medium" | "high";        // conservative vs aggressive
  planningHorizon: "short" | "medium" | "long";
  confidenceThreshold: number;                       // min confidence before acting
  decisionSpeed: "deliberate" | "balanced" | "fast";
  explorationRate: number;                           // 0-1, how much to deviate from known paths
}

export const PROFILE_TRAITS: Record<ProfileType, ProfileTraits> = {
  conservative: {
    riskTolerance: "low",
    planningHorizon: "medium",
    confidenceThreshold: 0.75,
    decisionSpeed: "deliberate",
    explorationRate: 0.1,
  },
  balanced: {
    riskTolerance: "medium",
    planningHorizon: "medium",
    confidenceThreshold: 0.60,
    decisionSpeed: "balanced",
    explorationRate: 0.3,
  },
  aggressive: {
    riskTolerance: "high",
    planningHorizon: "long",
    confidenceThreshold: 0.45,
    decisionSpeed: "fast",
    explorationRate: 0.6,
  },
  experimental: {
    riskTolerance: "high",
    planningHorizon: "long",
    confidenceThreshold: 0.35,
    decisionSpeed: "fast",
    explorationRate: 0.9,
  },
  custom: {
    riskTolerance: "medium",
    planningHorizon: "medium",
    confidenceThreshold: 0.60,
    decisionSpeed: "balanced",
    explorationRate: 0.3,
  },
};

// ── Behavior Snapshot ─────────────────────────────────────────────────────────

export interface BehaviorSnapshot {
  id: string;
  userId: number | null;
  profileId: string | null;
  profileType: string;
  activePolicyIds: string[];
  adaptationPlanId: string | null;
  reason: string;
  isRollbackPoint: boolean;
  rolledBackAt: Date | null;
  createdAt: Date;
  payload: Record<string, unknown>;
}

// ── Adaptation Plan ───────────────────────────────────────────────────────────

export interface AdaptationPlan {
  id: string;
  userId: number | null;
  title: string;
  description: string;
  policiesToActivate: string[];
  policiesToRetire: string[];
  targetProfileType: ProfileType;
  expectedImpact: string;
  affectedCognitiveSystems: string[];
  rollbackStrategy: string;
  status: AdaptationPlanStatus;
  snapshotId: string | null;
  executedAt: Date | null;
  rolledBackAt: Date | null;
  governanceReportId: string | null;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

// ── Governance Report ─────────────────────────────────────────────────────────

export interface GovernanceReport {
  id: string;
  userId: number | null;
  evaluatedPrincipleIds: string[];
  approvedPolicyIds: string[];
  rejectedPolicyIds: string[];
  deferredPrincipleIds: string[];
  conflictsFound: number;
  behaviorChanges: string[];
  rollbackPoints: string[];
  executiveSummary: string;
  governanceConfidence: number;
  adaptationPlanId: string | null;
  activeProfileId: string | null;
  activeProfileType: string | null;
  cycleVersion: number;
  producedAt: Date;
  metadata: Record<string, unknown>;
}

// ── Governance Cycle Result ───────────────────────────────────────────────────

export interface GovernanceCycleResult {
  report: GovernanceReport;
  approvedPolicies: ExecutivePolicy[];
  rejectedPolicies: ExecutivePolicy[];
  deferredCount: number;
  conflictsFound: PolicyConflict[];
  adaptationPlan: AdaptationPlan | null;
  activeProfile: BehaviorProfile | null;
  snapshotId: string | null;
}

// ── Governance Summary (for EB) ───────────────────────────────────────────────

export interface GovernanceSummary {
  activeProfileType: ProfileType | null;
  activeProfileId: string | null;
  activePolicyCount: number;
  approvedPolicies: Pick<ExecutivePolicy, "id" | "title" | "policyType" | "guidance" | "priority">[];
  lastCycleAt: Date | null;
  cycleCount: number;
  profileTraits: ProfileTraits | null;
}

// ── Diagnostics ───────────────────────────────────────────────────────────────

export interface GovernanceDiagnostics {
  userId: number;
  totalPolicies: number;
  byStatus: Record<PolicyStatus, number>;
  totalConflicts: number;
  unresolvedConflicts: number;
  totalProfiles: number;
  activeProfileType: string | null;
  totalPlans: number;
  totalReports: number;
  totalSnapshots: number;
  lastCycleAt: Date | null;
}

// ── Extension Point IDs ───────────────────────────────────────────────────────

export const GOVERNANCE_EXTENSION_POINT_IDS = {
  POLICY_PROPOSED:              "policy-proposed",
  POLICY_APPROVED:              "policy-approved",
  POLICY_REJECTED:              "policy-rejected",
  POLICY_CONFLICT_DETECTED:     "policy-conflict-detected",
  BEHAVIOR_PROFILE_ACTIVATED:   "behavior-profile-activated",
  ADAPTATION_PLAN_EXECUTED:     "adaptation-plan-executed",
  BEHAVIOR_SNAPSHOT_CREATED:    "behavior-snapshot-created",
  GOVERNANCE_REPORT_PRODUCED:   "governance-report-produced",
} as const;
