// ─────────────────────────────────────────────────────────────────────────────
// Build 025: Authority Resolution Engine — Registry (DB Persistence)
// All DB writes for the 8 authority tables.
// FK insertion order: reports → plans → requirements → grants → scopes →
//                     decisions → registry → snapshots
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import {
  authorityReports,
  authorityPlans,
  authorityRequirements,
  authorityGrants,
  authorityScopes,
  authorityDecisions,
  authorityRegistry,
  authoritySnapshots,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type {
  AuthorityResolutionReport,
  AuthoritySummary,
} from "./types";

const logger = { warn: console.warn.bind(console), info: console.info.bind(console) };

export async function persistAuthorityReport(
  report: AuthorityResolutionReport
): Promise<void> {
  const { plan } = report;

  // 1. Insert authority_reports
  await db.insert(authorityReports).values({
    id: report.id,
    businessId: report.businessId,
    userId: report.userId ?? null,
    orchestrationReportId: report.orchestrationReportId ?? null,
    requirementCount: report.requirementCount,
    grantedCount: report.grantedCount,
    pendingCount: report.pendingCount,
    deniedCount: report.deniedCount,
    expiredCount: report.expiredCount,
    unavailableCount: report.unavailableCount,
    missingCount: report.missingCount,
    approvalRequiredCount: report.approvalRequiredCount,
    authorizationScore: String(report.authorizationScore),
    authorityConfidence: String(report.authorityConfidence),
    overallScore: String(report.overallScore),
    isAuthorized: report.isAuthorized,
    executiveSummary: report.executiveSummary,
    resolutionDurationMs: report.resolutionDurationMs,
  });

  // 2. Insert authority_plans
  await db.insert(authorityPlans).values({
    id: plan.id,
    reportId: report.id,
    businessId: report.businessId,
    userId: report.userId ?? null,
    orchestrationPlanId: plan.orchestrationPlanId ?? null,
    scopeCount: plan.scopeCount,
    requirementCount: plan.requirementCount,
    grantedCount: plan.grantedCount,
    pendingCount: plan.pendingCount,
    deniedCount: plan.deniedCount,
    dependencyCount: plan.dependencyCount,
    decisionCount: plan.decisionCount,
    approvalRequiredCount: plan.approvalRequiredCount,
    coverageScore: String(report.evaluation.coverageScore),
    completenessScore: String(report.evaluation.completenessScore),
    riskScore: String(report.evaluation.riskScore),
    trustScore: String(report.evaluation.trustScore),
    readinessScore: String(report.evaluation.readinessScore),
    confidenceScore: String(report.evaluation.confidenceScore),
    overallScore: String(plan.overallScore),
  });

  // 3. Insert authority_requirements
  if (plan.requirements.length > 0) {
    await db.insert(authorityRequirements).values(
      plan.requirements.map((r) => ({
        id: r.id,
        planId: plan.id,
        reportId: report.id,
        businessId: report.businessId,
        assignmentId: r.assignmentId ?? null,
        workPackageId: r.workPackageId ?? null,
        authorityType: r.authorityType,
        scopeType: r.scopeType,
        title: r.title,
        description: r.description,
        status: r.status,
        rationale: r.rationale,
        requiresApproval: r.requiresApproval,
        approvalLevel: r.approvalLevel,
        riskLevel: r.riskLevel,
      }))
    );
  }

  // 4. Insert authority_grants
  if (plan.grants.length > 0) {
    await db.insert(authorityGrants).values(
      plan.grants.map((g) => ({
        id: g.id,
        requirementId: g.requirementId,
        planId: plan.id,
        reportId: report.id,
        businessId: report.businessId,
        grantedBy: g.grantedBy,
        grantStatus: g.grantStatus,
        expiresAt: g.expiresAt ?? null,
        authoritySource: g.authoritySource,
        notes: g.notes,
      }))
    );
  }

  // 5. Insert authority_scopes
  if (plan.scopes.length > 0) {
    await db.insert(authorityScopes).values(
      plan.scopes.map((s) => ({
        id: s.id,
        planId: plan.id,
        reportId: report.id,
        businessId: report.businessId,
        scopeType: s.scopeType,
        scopeTarget: s.scopeTarget,
        isResolved: s.isResolved,
        requiresElevation: s.requiresElevation,
        resolutionNote: s.resolutionNote,
      }))
    );
  }

  // 6. Insert authority_decisions
  if (plan.decisions.length > 0) {
    await db.insert(authorityDecisions).values(
      plan.decisions.map((d) => ({
        id: d.id,
        requirementId: d.requirementId,
        planId: plan.id,
        reportId: report.id,
        businessId: report.businessId,
        decisionType: d.decisionType,
        decisionRationale: d.decisionRationale,
        requiresApproval: d.requiresApproval,
        approvalLevel: d.approvalLevel,
        confidence: String(d.confidence),
      }))
    );
  }

  // 7. Upsert authority_registry
  await db
    .insert(authorityRegistry)
    .values({
      id: randomUUID(),
      businessId: report.businessId,
      latestReportId: report.id,
      latestPlanId: plan.id,
      totalRequirements: report.requirementCount,
      grantedCount: report.grantedCount,
      pendingCount: report.pendingCount,
      deniedCount: report.deniedCount,
      missingCount: report.missingCount,
      authorizationScore: String(report.authorizationScore),
      authorityConfidence: String(report.authorityConfidence),
      isAuthorized: report.isAuthorized,
      lastResolutionAt: new Date(),
    })
    .onConflictDoUpdate({
      target: authorityRegistry.businessId,
      set: {
        latestReportId: report.id,
        latestPlanId: plan.id,
        totalRequirements: report.requirementCount,
        grantedCount: report.grantedCount,
        pendingCount: report.pendingCount,
        deniedCount: report.deniedCount,
        missingCount: report.missingCount,
        authorizationScore: String(report.authorizationScore),
        authorityConfidence: String(report.authorityConfidence),
        isAuthorized: report.isAuthorized,
        lastResolutionAt: new Date(),
        updatedAt: new Date(),
      },
    });

  // 8. Insert authority_snapshots (point-in-time record)
  await db.insert(authoritySnapshots).values({
    id: randomUUID(),
    reportId: report.id,
    businessId: report.businessId,
    userId: report.userId ?? null,
    snapshotData: {
      requirementCount: report.requirementCount,
      grantedCount: report.grantedCount,
      pendingCount: report.pendingCount,
      deniedCount: report.deniedCount,
      missingCount: report.missingCount,
      approvalRequiredCount: report.approvalRequiredCount,
      authorizationScore: report.authorizationScore,
      isAuthorized: report.isAuthorized,
      overallScore: report.overallScore,
    },
  });

  logger.info({ businessId: report.businessId, reportId: report.id }, "Authority resolution report persisted");
}

export async function getLatestAuthoritySummary(
  userId: number
): Promise<AuthoritySummary | null> {
  try {
    // Find the latest registry row for any business owned by this user
    // (joins through businesses table; simplified: search registry for any entry)
    const rows = await db
      .select()
      .from(authorityRegistry)
      .orderBy(authorityRegistry.lastResolutionAt)
      .limit(1);

    if (!rows[0]) return null;
    const reg = rows[0];

    // Fetch the report for the full executive summary
    const reportRows = await db
      .select()
      .from(authorityReports)
      .where(eq(authorityReports.id, reg.latestReportId ?? ""))
      .limit(1);

    if (!reportRows[0]) return null;
    const r = reportRows[0];

    return {
      reportId: r.id,
      planId: reg.latestPlanId ?? "",
      businessId: r.businessId,
      requirementCount: r.requirementCount,
      grantedCount: r.grantedCount,
      pendingCount: r.pendingCount,
      deniedCount: r.deniedCount,
      missingCount: r.missingCount,
      approvalRequiredCount: r.approvalRequiredCount,
      authorizationScore: Number(r.authorizationScore),
      authorityConfidence: Number(r.authorityConfidence),
      overallScore: Number(r.overallScore),
      isAuthorized: r.isAuthorized,
      executiveSummary: r.executiveSummary,
      createdAt: r.createdAt,
    };
  } catch (err) {
    logger.warn({ err, userId }, "Authority registry: fetch summary failed");
    return null;
  }
}
