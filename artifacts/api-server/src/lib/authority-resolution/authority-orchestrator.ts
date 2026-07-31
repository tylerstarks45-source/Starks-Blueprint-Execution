// ─────────────────────────────────────────────────────────────────────────────
// Build 025: Authority Resolution Engine — Orchestrator
// Full run: reads execution assignments → derives requirements →
// resolves scopes → validates authorities → maps dependencies →
// resolves approvals → builds grants → evaluates → persists report.
// Fail-open at every stage.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import {
  executionOrchestrationRegistry,
  executionAssignments as executionAssignmentsTable,
} from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";

import { deriveAuthorityRequirements } from "./authority-discovery-engine";
import { resolveAuthorityScopes } from "./scope-resolution-engine";
import { validateAuthorities, computeValidationStats } from "./authority-validation-engine";
import { mapPermissionDependencies } from "./permission-dependency-engine";
import { resolveApprovals } from "./approval-resolution-engine";
import { buildAuthorityGrants } from "./authority-grant-engine";
import { evaluateAuthority } from "./authority-evaluation-engine";
import { assembleAuthorityReport, buildAuthoritySummary } from "./authority-report-engine";
import { persistAuthorityReport, getLatestAuthoritySummary } from "./authority-registry";
import type { AuthoritySummary, AuthorityPlan } from "./types";

const logger = {
  info: console.info.bind(console),
  warn: console.warn.bind(console),
};

export async function runAuthorityResolution(params: {
  userId: number;
  businessId: number;
}): Promise<AuthoritySummary | null> {
  const { userId, businessId } = params;
  const start = Date.now();

  try {
    // ── 1. Fetch execution orchestration registry ──────────────────────────────
    const eoRegRows = await db
      .select()
      .from(executionOrchestrationRegistry)
      .where(eq(executionOrchestrationRegistry.businessId, businessId))
      .limit(1);

    if (!eoRegRows[0]?.latestPlanId) {
      logger.warn({ businessId }, "Authority Resolution: no execution plan found — skipping");
      return null;
    }

    const orchestrationPlanId = eoRegRows[0].latestPlanId;
    const orchestrationReportId = eoRegRows[0].latestReportId ?? undefined;

    // ── 2. Fetch execution assignments ─────────────────────────────────────────
    const assignmentRows = await db
      .select()
      .from(executionAssignmentsTable)
      .where(eq(executionAssignmentsTable.planId, orchestrationPlanId))
      .orderBy(asc(executionAssignmentsTable.sequencePosition));

    const assignments = assignmentRows.map((row) => ({
      id: row.id,
      workPackageId: row.workPackageId ?? undefined,
      packageTitle: row.packageTitle ?? undefined,
      ownerType: row.ownerType,
      executionClass: row.executionClass,
      complexityLevel: row.complexityLevel ?? undefined,
      businessCriticality: row.businessCriticality ?? undefined,
    }));

    if (assignments.length === 0) {
      logger.warn({ businessId }, "Authority Resolution: no execution assignments found — skipping");
      return null;
    }

    // ── 3. Derive authority requirements ──────────────────────────────────────
    const reportId = randomUUID();
    const planId = randomUUID();

    const rawRequirements = deriveAuthorityRequirements({
      planId,
      reportId,
      businessId,
      assignments,
    });

    // ── 4. Validate authorities ────────────────────────────────────────────────
    const validatedRequirements = validateAuthorities(rawRequirements);
    const stats = computeValidationStats(validatedRequirements);

    // ── 5. Resolve scopes ──────────────────────────────────────────────────────
    const scopes = resolveAuthorityScopes({
      planId,
      reportId,
      businessId,
      requirements: validatedRequirements,
    });

    // ── 6. Map permission dependencies ────────────────────────────────────────
    const dependencies = mapPermissionDependencies(validatedRequirements);

    // ── 7. Resolve approvals → decisions ──────────────────────────────────────
    const approvalResult = resolveApprovals({
      planId,
      reportId,
      businessId,
      requirements: validatedRequirements,
    });

    // ── 8. Build grants ────────────────────────────────────────────────────────
    const grants = buildAuthorityGrants({
      planId,
      reportId,
      businessId,
      requirements: validatedRequirements,
    });

    // ── 9. Evaluate ────────────────────────────────────────────────────────────
    const evaluation = evaluateAuthority({
      requirements: validatedRequirements,
      decisions: approvalResult.decisions,
      grantedCount: stats.grantedCount,
      pendingCount: stats.pendingCount,
      deniedCount: stats.deniedCount,
      missingCount: stats.missingCount,
      approvalRequiredCount: approvalResult.approvalRequiredCount,
      totalRequirements: validatedRequirements.length,
      scopeCount: scopes.length,
      dependencyCount: dependencies.length,
    });

    // Authorization score = weighted average of granted fraction + evaluation score
    const grantedFraction = validatedRequirements.length > 0
      ? stats.grantedCount / validatedRequirements.length
      : 0;
    const authorizationScore = (grantedFraction * 0.60) + (evaluation.overallScore * 0.40);
    const authorityConfidence = evaluation.confidenceScore;

    // ── 10. Assemble plan ──────────────────────────────────────────────────────
    const plan: AuthorityPlan = {
      id: planId,
      reportId,
      businessId,
      userId,
      orchestrationPlanId,
      scopeCount: scopes.length,
      requirementCount: validatedRequirements.length,
      grantedCount: stats.grantedCount,
      pendingCount: stats.pendingCount,
      deniedCount: stats.deniedCount,
      dependencyCount: dependencies.length,
      decisionCount: approvalResult.decisions.length,
      approvalRequiredCount: approvalResult.approvalRequiredCount,
      coverageScore: evaluation.coverageScore,
      completenessScore: evaluation.completenessScore,
      riskScore: evaluation.riskScore,
      trustScore: evaluation.trustScore,
      readinessScore: evaluation.readinessScore,
      confidenceScore: evaluation.confidenceScore,
      overallScore: evaluation.overallScore,
      requirements: validatedRequirements,
      grants,
      scopes,
      dependencies,
      decisions: approvalResult.decisions,
    };

    // ── 11. Assemble + persist report ──────────────────────────────────────────
    const resolutionDurationMs = Date.now() - start;

    const report = assembleAuthorityReport({
      businessId,
      userId,
      orchestrationReportId,
      grantedCount: stats.grantedCount,
      pendingCount: stats.pendingCount,
      deniedCount: stats.deniedCount,
      expiredCount: stats.expiredCount,
      unavailableCount: stats.unavailableCount,
      missingCount: stats.missingCount,
      approvalRequiredCount: approvalResult.approvalRequiredCount,
      authorizationScore: Math.round(authorizationScore * 1000) / 1000,
      authorityConfidence: Math.round(authorityConfidence * 1000) / 1000,
      overallScore: evaluation.overallScore,
      plan,
      evaluation,
      resolutionDurationMs,
    });

    // Override the report id that was pre-assigned during assembly
    (report as { id: string }).id = reportId;

    await persistAuthorityReport(report);

    const summary = buildAuthoritySummary(report);
    logger.info(
      { businessId, requirementCount: report.requirementCount, isAuthorized: report.isAuthorized },
      "Authority Resolution: run complete"
    );
    return summary;
  } catch (err) {
    logger.warn({ err, businessId }, "Authority Resolution: run failed (fail-open)");
    return null;
  }
}

export async function fetchAuthoritySummaryForEB(
  userId: number
): Promise<AuthoritySummary | null> {
  return getLatestAuthoritySummary(userId);
}
