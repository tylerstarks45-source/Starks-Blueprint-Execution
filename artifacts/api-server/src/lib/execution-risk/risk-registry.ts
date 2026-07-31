// ─────────────────────────────────────────────────────────────────────────────
// Build 026: Execution Risk Assessment Engine — Registry (DB Persistence)
// FK insertion order: reports → profiles → categories → dependencies →
//                     mitigations → safety_scores → registry → snapshots
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import {
  executionRiskReports,
  executionRiskProfiles,
  executionRiskCategories,
  executionRiskDependencies,
  executionRiskMitigations,
  executionSafetyScores,
  executionRiskRegistry,
  executionRiskSnapshots,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import type { ExecutionRiskReport, ExecutionRiskSummary, RiskDependency } from "./types";

const logger = { warn: console.warn.bind(console), info: console.info.bind(console) };

export async function persistRiskReport(
  report: ExecutionRiskReport,
  dependencies: RiskDependency[]
): Promise<void> {
  // 1. Insert execution_risk_reports
  await db.insert(executionRiskReports).values({
    id: report.id,
    businessId: report.businessId,
    userId: report.userId ?? null,
    authorityReportId: report.authorityReportId ?? null,
    orchestrationReportId: report.orchestrationReportId ?? null,
    profileCount: report.profileCount,
    mitigationCount: report.mitigationCount,
    overallRiskScore: String(report.overallRiskScore),
    overallRiskLevel: report.overallRiskLevel,
    safetyScore: String(report.safetyScore),
    rollbackReadiness: String(report.rollbackReadiness),
    highestRiskCategory: report.highestRiskCategory,
    highestRiskLevel: report.highestRiskLevel,
    isSafeToExecute: report.isSafeToExecute,
    executiveSummary: report.executiveSummary,
    assessmentDurationMs: report.assessmentDurationMs,
  });

  // 2. Insert execution_risk_profiles
  if (report.profiles.length > 0) {
    await db.insert(executionRiskProfiles).values(
      report.profiles.map((p) => ({
        id: p.id,
        reportId: report.id,
        businessId: report.businessId,
        assignmentId: p.assignmentId,
        workPackageId: p.workPackageId ?? null,
        packageTitle: p.packageTitle ?? null,
        ownerType: p.ownerType,
        executionClass: p.executionClass,
        complexityLevel: p.complexityLevel,
        businessCriticality: p.businessCriticality,
        operationalRiskScore: String(p.operationalRiskScore),
        financialRiskScore: String(p.financialRiskScore),
        securityRiskScore: String(p.securityRiskScore),
        privacyRiskScore: String(p.privacyRiskScore),
        complianceRiskScore: String(p.complianceRiskScore),
        continuityRiskScore: String(p.continuityRiskScore),
        overallRiskScore: String(p.overallRiskScore),
        overallRiskLevel: p.overallRiskLevel,
        reversibilityLevel: p.reversibilityLevel,
        rollbackComplexity: p.rollbackComplexity,
        rollbackNote: p.rollbackNote,
        categoryData: p.categories,
      }))
    );

    // 3. Insert execution_risk_categories
    const categoryRows = report.profiles.flatMap((p) =>
      p.categories.map((cat) => ({
        id: randomUUID(),
        profileId: p.id,
        reportId: report.id,
        businessId: report.businessId,
        category: cat.category,
        riskLevel: cat.riskLevel,
        riskScore: String(cat.riskScore),
        factors: cat.factors,
        rationale: cat.rationale,
      }))
    );
    if (categoryRows.length > 0) {
      await db.insert(executionRiskCategories).values(categoryRows);
    }
  }

  // 4. Insert execution_risk_dependencies
  if (dependencies.length > 0) {
    await db.insert(executionRiskDependencies).values(
      dependencies.map((d) => ({
        id: randomUUID(),
        reportId: report.id,
        businessId: report.businessId,
        fromCategory: d.fromCategory,
        toCategory: d.toCategory,
        dependencyReason: d.dependencyReason,
        isCritical: d.isCritical,
      }))
    );
  }

  // 5. Insert execution_risk_mitigations
  if (report.mitigations.length > 0) {
    await db.insert(executionRiskMitigations).values(
      report.mitigations.map((m) => ({
        id: m.id,
        reportId: report.id,
        businessId: report.businessId,
        profileId: m.profileId ?? null,
        mitigationType: m.mitigationType,
        title: m.title,
        description: m.description,
        priority: m.priority,
        applicableTo: m.applicableTo,
        riskCategoriesAddressed: m.riskCategoriesAddressed,
        estimatedEffort: m.estimatedEffort,
      }))
    );
  }

  // 6. Insert execution_safety_scores
  const ss = report.safetyScoreRecord;
  await db.insert(executionSafetyScores).values({
    id: ss.id,
    reportId: report.id,
    businessId: report.businessId,
    safetyScore: String(ss.safetyScore),
    rollbackReadiness: String(ss.rollbackReadiness),
    reversibilityScore: String(ss.reversibilityScore),
    mitigationCoverageScore: String(ss.mitigationCoverageScore),
    overallRiskScore: String(ss.overallRiskScore),
    highestRiskCategory: ss.highestRiskCategory,
    highestRiskLevel: ss.highestRiskLevel,
    isSafeToExecute: ss.isSafeToExecute,
    safetyNarrative: ss.safetyNarrative,
  });

  // 7. Upsert execution_risk_registry
  await db
    .insert(executionRiskRegistry)
    .values({
      id: randomUUID(),
      businessId: report.businessId,
      latestReportId: report.id,
      totalProfiles: report.profileCount,
      mitigationCount: report.mitigationCount,
      overallRiskScore: String(report.overallRiskScore),
      overallRiskLevel: report.overallRiskLevel,
      safetyScore: String(report.safetyScore),
      rollbackReadiness: String(report.rollbackReadiness),
      highestRiskCategory: report.highestRiskCategory,
      isSafeToExecute: report.isSafeToExecute,
      lastAssessmentAt: new Date(),
    })
    .onConflictDoUpdate({
      target: executionRiskRegistry.businessId,
      set: {
        latestReportId: report.id,
        totalProfiles: report.profileCount,
        mitigationCount: report.mitigationCount,
        overallRiskScore: String(report.overallRiskScore),
        overallRiskLevel: report.overallRiskLevel,
        safetyScore: String(report.safetyScore),
        rollbackReadiness: String(report.rollbackReadiness),
        highestRiskCategory: report.highestRiskCategory,
        isSafeToExecute: report.isSafeToExecute,
        lastAssessmentAt: new Date(),
        updatedAt: new Date(),
      },
    });

  // 8. Insert execution_risk_snapshots
  await db.insert(executionRiskSnapshots).values({
    id: randomUUID(),
    reportId: report.id,
    businessId: report.businessId,
    userId: report.userId ?? null,
    snapshotData: {
      profileCount: report.profileCount,
      mitigationCount: report.mitigationCount,
      overallRiskScore: report.overallRiskScore,
      overallRiskLevel: report.overallRiskLevel,
      safetyScore: report.safetyScore,
      rollbackReadiness: report.rollbackReadiness,
      highestRiskCategory: report.highestRiskCategory,
      isSafeToExecute: report.isSafeToExecute,
    },
  });

  logger.info({ businessId: report.businessId, reportId: report.id }, "Execution risk report persisted");
}

export async function getLatestRiskSummary(userId: number): Promise<ExecutionRiskSummary | null> {
  try {
    const regRows = await db
      .select()
      .from(executionRiskRegistry)
      .orderBy(executionRiskRegistry.lastAssessmentAt)
      .limit(1);

    if (!regRows[0]?.latestReportId) return null;

    const reportRows = await db
      .select()
      .from(executionRiskReports)
      .where(eq(executionRiskReports.id, regRows[0].latestReportId))
      .limit(1);

    if (!reportRows[0]) return null;
    const r = reportRows[0];

    return {
      reportId: r.id,
      businessId: r.businessId,
      profileCount: r.profileCount,
      mitigationCount: r.mitigationCount,
      overallRiskScore: Number(r.overallRiskScore),
      overallRiskLevel: r.overallRiskLevel as any,
      safetyScore: Number(r.safetyScore),
      rollbackReadiness: Number(r.rollbackReadiness),
      highestRiskCategory: r.highestRiskCategory as any,
      highestRiskLevel: r.highestRiskLevel as any,
      isSafeToExecute: r.isSafeToExecute,
      executiveSummary: r.executiveSummary,
      createdAt: r.createdAt,
    };
  } catch (err) {
    logger.warn({ err, userId }, "Execution risk registry: fetch failed");
    return null;
  }
}
