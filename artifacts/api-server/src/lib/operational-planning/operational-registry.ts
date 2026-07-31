// ─────────────────────────────────────────────────────────────────────────────
// Build 023: Operational Planning Engine — Registry (DB Persistence)
// All database I/O for the 8 operational planning tables.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import {
  operationalReports,
  operationalPlans,
  operationalPhases,
  workPackages,
  executionDependencies,
  executionSequences,
  operationalReadiness,
  operationalRegistry,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import type { OperationalReport, OperationalSummary, OperationalReadinessLevel } from "./types";

function scoreToReadinessLevel(score: number): OperationalReadinessLevel {
  if (score >= 0.85) return "optimising";
  if (score >= 0.70) return "managed";
  if (score >= 0.55) return "defined";
  if (score >= 0.35) return "developing";
  return "not_ready";
}

export async function persistOperationalReport(report: OperationalReport): Promise<void> {
  // 1. Root report row
  await db.insert(operationalReports).values({
    id: report.id,
    businessId: report.businessId,
    userId: report.userId ?? null,
    capabilityReportId: report.capabilityReportId ?? null,
    primaryPlanId: report.primaryPlanId,
    phaseCount: report.phaseCount,
    workPackageCount: report.workPackageCount,
    dependencyCount: report.dependencyCount,
    criticalDependencyCount: report.criticalDependencyCount,
    sequenceCount: report.sequenceCount,
    executionReadinessScore: report.executionReadinessScore,
    executionConfidence: report.executionConfidence,
    overallScore: report.overallScore,
    executiveSummary: report.executiveSummary,
    operationalDurationMs: report.operationalDurationMs,
  });

  const plan = report.plan;

  // 2. Plan row
  await db.insert(operationalPlans).values({
    id: plan.id,
    reportId: report.id,
    businessId: plan.businessId,
    userId: plan.userId ?? null,
    capabilityPlanId: plan.capabilityPlanId ?? null,
    capabilityReportId: plan.capabilityReportId ?? null,
    phaseCount: plan.phaseCount,
    workPackageCount: plan.workPackageCount,
    dependencyCount: plan.dependencyCount,
    criticalDependencyCount: plan.criticalDependencyCount,
    sequenceCount: plan.sequenceCount,
    executionReadinessScore: plan.executionReadinessScore,
    executionConfidence: plan.executionConfidence,
    completenessScore: plan.completenessScore,
    feasibilityScore: plan.feasibilityScore,
    complexityScore: plan.complexityScore,
    riskScore: plan.riskScore,
    readinessScore: plan.readinessScore,
    confidenceScore: plan.confidenceScore,
    overallScore: plan.overallScore,
  });

  // 3. Phases + work packages
  for (const phase of plan.phases) {
    await db.insert(operationalPhases).values({
      id: phase.id,
      planId: plan.id,
      reportId: report.id,
      businessId: phase.businessId,
      phaseType: phase.phaseType,
      phaseName: phase.phaseName,
      phaseDescription: phase.phaseDescription,
      phaseOrder: phase.phaseOrder,
      workPackageCount: phase.workPackageCount,
      criticalWorkPackageCount: phase.criticalWorkPackageCount,
      readinessScore: phase.readinessScore,
      priority: phase.priority,
    });

    for (const wp of phase.workPackages) {
      await db.insert(workPackages).values({
        id: wp.id,
        phaseId: phase.id,
        planId: plan.id,
        reportId: report.id,
        businessId: wp.businessId,
        capabilityRequirementId: wp.capabilityRequirementId ?? null,
        capabilityName: wp.capabilityName,
        packageTitle: wp.packageTitle,
        packageDescription: wp.packageDescription,
        outcomeStatement: wp.outcomeStatement,
        phaseType: wp.phaseType,
        complexityLevel: wp.complexityLevel,
        businessCriticality: wp.businessCriticality,
        effortScore: wp.effortScore,
        sequencePosition: wp.sequencePosition ?? null,
        priority: wp.priority,
      });
    }
  }

  // 4. Execution dependencies (after plan)
  for (const dep of plan.dependencies) {
    await db.insert(executionDependencies).values({
      id: dep.id,
      planId: plan.id,
      reportId: report.id,
      businessId: dep.businessId,
      dependencyType: dep.dependencyType,
      title: dep.title,
      description: dep.description,
      fromPackageId: dep.fromPackageId ?? null,
      toPackageId: dep.toPackageId ?? null,
      fromPhaseType: dep.fromPhaseType ?? null,
      toPhaseType: dep.toPhaseType ?? null,
      severity: dep.severity,
      mitigationNote: dep.mitigationNote ?? null,
    });
  }

  // 5. Execution sequences (after work packages)
  for (const seq of plan.sequences) {
    await db.insert(executionSequences).values({
      id: seq.id,
      planId: plan.id,
      reportId: report.id,
      businessId: seq.businessId,
      workPackageId: seq.workPackageId,
      sequencePosition: seq.sequencePosition,
      phaseOrder: seq.phaseOrder,
      withinPhaseOrder: seq.withinPhaseOrder,
      prerequisitePackageIds: JSON.stringify(seq.prerequisitePackageIds),
      rationale: seq.rationale,
    });
  }

  // 6. Operational readiness
  const r = plan.readiness;
  await db.insert(operationalReadiness).values({
    id: r.id,
    planId: plan.id,
    reportId: report.id,
    businessId: r.businessId,
    capabilityReadinessScore: r.capabilityReadinessScore,
    operationalReadinessScore: r.operationalReadinessScore,
    technologyReadinessScore: r.technologyReadinessScore,
    governanceReadinessScore: r.governanceReadinessScore,
    executionConfidenceScore: r.executionConfidenceScore,
    overallReadinessScore: r.overallReadinessScore,
    readinessLevel: r.readinessLevel,
    keyBlocker: r.keyBlocker ?? null,
    recommendation: r.recommendation ?? null,
  });

  // 7. Upsert registry
  await db
    .insert(operationalRegistry)
    .values({
      id: randomUUID(),
      businessId: report.businessId,
      userId: report.userId ?? null,
      totalPlans: 1,
      totalReports: 1,
      latestReportId: report.id,
      latestPlanId: plan.id,
      latestPhaseCount: report.phaseCount,
      latestWorkPackageCount: report.workPackageCount,
      latestCriticalDependencyCount: report.criticalDependencyCount,
      latestReadinessScore: report.executionReadinessScore,
      latestConfidence: report.executionConfidence,
      latestOverallScore: report.overallScore,
      lastOperationalAt: new Date(),
    })
    .onConflictDoUpdate({
      target: operationalRegistry.businessId,
      set: {
        totalPlans: db.$count(operationalPlans, eq(operationalPlans.businessId, report.businessId)),
        totalReports: db.$count(operationalReports, eq(operationalReports.businessId, report.businessId)),
        latestReportId: report.id,
        latestPlanId: plan.id,
        latestPhaseCount: report.phaseCount,
        latestWorkPackageCount: report.workPackageCount,
        latestCriticalDependencyCount: report.criticalDependencyCount,
        latestReadinessScore: report.executionReadinessScore,
        latestConfidence: report.executionConfidence,
        latestOverallScore: report.overallScore,
        lastOperationalAt: new Date(),
        updatedAt: new Date(),
      },
    });
}

export async function getLatestOperationalSummary(userId: number): Promise<OperationalSummary | null> {
  const regRows = await db
    .select()
    .from(operationalRegistry)
    .orderBy(desc(operationalRegistry.lastOperationalAt))
    .limit(1);

  if (!regRows[0]?.latestReportId || !regRows[0]?.latestPlanId) return null;

  const reg = regRows[0];
  return {
    reportId: reg.latestReportId ?? "",
    planId: reg.latestPlanId ?? "",
    businessId: reg.businessId,
    phaseCount: reg.latestPhaseCount ?? 0,
    workPackageCount: reg.latestWorkPackageCount ?? 0,
    criticalDependencyCount: reg.latestCriticalDependencyCount ?? 0,
    executionReadinessScore: reg.latestReadinessScore ?? 0,
    executionReadinessLevel: scoreToReadinessLevel(reg.latestReadinessScore ?? 0),
    executionConfidence: reg.latestConfidence ?? 0,
    overallScore: reg.latestOverallScore ?? 0,
    executiveSummary: "",
    createdAt: reg.lastOperationalAt ?? reg.updatedAt,
  };
}
