// ─────────────────────────────────────────────────────────────────────────────
// Build 025: Authority Resolution Engine — Public Barrel
// ─────────────────────────────────────────────────────────────────────────────
export { runAuthorityResolution, fetchAuthoritySummaryForEB } from "./authority-orchestrator";
export { declareAuthorityResolutionExtensionPoints } from "./authority-extension-points";
export type {
  AuthoritySummary,
  AuthorityResolutionReport,
  AuthorityPlan,
  AuthorityRequirement,
  AuthorityGrant,
  AuthorityScope,
  AuthorityDependency,
  AuthorityDecision,
  AuthorityEvaluation,
  AuthorityType,
  AuthorityStatus,
  AuthorityScopeType,
  DecisionType,
  ApprovalLevel,
  RiskLevel,
  GrantStatus,
  AuthoritySource,
} from "./types";
