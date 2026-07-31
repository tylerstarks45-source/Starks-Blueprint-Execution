// ─────────────────────────────────────────────────────────────────────────────
// Build 025: Authority Resolution Engine — Authority Report Engine
// Produces immutable authority resolution reports and compact EB summaries.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type {
  AuthorityResolutionReport,
  AuthoritySummary,
  AuthorityPlan,
  AuthorityEvaluation,
  AuthorityRequirement,
  AuthorityGrant,
  AuthorityScope,
  AuthorityDependency,
  AuthorityDecision,
} from "./types";

export function assembleAuthorityReport(params: {
  businessId: number;
  userId?: number;
  orchestrationReportId?: string;
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
  plan: AuthorityPlan;
  evaluation: AuthorityEvaluation;
  resolutionDurationMs: number;
}): AuthorityResolutionReport {
  const {
    businessId, userId, orchestrationReportId,
    grantedCount, pendingCount, deniedCount, expiredCount, unavailableCount,
    missingCount, approvalRequiredCount, authorizationScore, authorityConfidence,
    overallScore, plan, evaluation, resolutionDurationMs,
  } = params;

  const requirementCount = plan.requirements.length;
  const isAuthorized = overallScore >= 0.60 && missingCount === 0 && deniedCount === 0;

  const executiveSummary = buildExecutiveSummary({
    requirementCount,
    grantedCount,
    pendingCount,
    deniedCount,
    missingCount,
    approvalRequiredCount,
    authorizationScore,
    isAuthorized,
  });

  return {
    id: randomUUID(),
    businessId,
    userId,
    orchestrationReportId,
    primaryPlanId: plan.id,
    requirementCount,
    grantedCount,
    pendingCount,
    deniedCount,
    expiredCount,
    unavailableCount,
    missingCount,
    approvalRequiredCount,
    authorizationScore,
    authorityConfidence,
    overallScore,
    isAuthorized,
    executiveSummary,
    resolutionDurationMs,
    plan,
    evaluation,
  };
}

function buildExecutiveSummary(params: {
  requirementCount: number;
  grantedCount: number;
  pendingCount: number;
  deniedCount: number;
  missingCount: number;
  approvalRequiredCount: number;
  authorizationScore: number;
  isAuthorized: boolean;
}): string {
  const {
    requirementCount, grantedCount, pendingCount, deniedCount,
    missingCount, approvalRequiredCount, authorizationScore, isAuthorized,
  } = params;

  const pct = Math.round(authorizationScore * 100);
  const status = isAuthorized ? "AUTHORIZED" : "NOT AUTHORIZED";

  let summary = `Authority Resolution: ${status}. `;
  summary += `${requirementCount} authority requirement(s) evaluated: `;
  summary += `${grantedCount} granted, ${pendingCount} pending, ${deniedCount} denied. `;

  if (missingCount > 0) {
    summary += `${missingCount} authority requirement(s) are missing (denied or unavailable). `;
  }
  if (approvalRequiredCount > 0) {
    summary += `${approvalRequiredCount} requirement(s) need explicit approval before execution can proceed. `;
  }
  summary += `Authorization score: ${pct}%.`;

  return summary;
}

export function buildAuthoritySummary(
  report: AuthorityResolutionReport
): AuthoritySummary {
  return {
    reportId: report.id,
    planId: report.primaryPlanId,
    businessId: report.businessId,
    requirementCount: report.requirementCount,
    grantedCount: report.grantedCount,
    pendingCount: report.pendingCount,
    deniedCount: report.deniedCount,
    missingCount: report.missingCount,
    approvalRequiredCount: report.approvalRequiredCount,
    authorizationScore: report.authorizationScore,
    authorityConfidence: report.authorityConfidence,
    overallScore: report.overallScore,
    isAuthorized: report.isAuthorized,
    executiveSummary: report.executiveSummary,
    createdAt: new Date(),
  };
}
