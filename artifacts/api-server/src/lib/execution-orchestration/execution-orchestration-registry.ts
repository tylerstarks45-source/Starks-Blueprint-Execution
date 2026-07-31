// ─────────────────────────────────────────────────────────────────────────────
// Build 024: Execution Orchestration Engine — Registry (DB Persistence)
// All database I/O for the 8 execution orchestration tables.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import {
  executionReports,
  executionPlans,
  executionOwners,
  executionAssignments,
  executionQueues,
  executionPolicies,
  executionReadiness,
  executionOrchestrationRegistry,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import type { ExecutionOrchestrationReport, ExecutionOrchestrationSummary, ExecutionReadinessLevel } from "./types";

function scoreToLevel(score: number): ExecutionReadinessLevel {
  if (score >= 0.85) return "optimising";
  if (score >= 0.70) return "managed";
  if (score >= 0.55) return "defined";
  if (score >= 0.35) return "developing";
  return "not_ready";
}

export async function persistOrchestrationReport(report: ExecutionOrchestrationReport): Promise<void> {
  // 1. Root report
  await db.insert(executionReports).values({
    id: report.id,
    businessId: report.businessId,
    userId: report.userId ?? null,
    operationalReportId: report.operationalReportId ?? null,
    primaryPlanId: report.primaryPlanId,
    assignmentCount: report.assignmentCount,
    ownerCount: report.ownerCount,
    queueCount: report.queueCount,
    blockerCount: report.blockerCount,
    criticalBlockerCount: report.criticalBlockerCount,
    policyCount: report.policyCount,
    automatedCount: report.automatedCount,
    manualCount: report.manualCount,
    deferredCount: report.deferredCount,
    automationRatio: report.automationRatio,
    executionReadinessScore: report.executionReadinessScore,
    executionConfidence: report.executionConfidence,
    overallScore: report.overallScore,
    executiveSummary: report.executiveSummary,
    orchestrationDurationMs: report.orchestrationDurationMs,
  });

  const plan = report.plan;

  // 2. Plan
  await db.insert(executionPlans).values({
    id: plan.id,
    reportId: report.id,
    businessId: plan.businessId,
    userId: plan.userId ?? null,
    operationalPlanId: plan.operationalPlanId ?? null,
    operationalReportId: plan.operationalReportId ?? null,
    assignmentCount: plan.assignmentCount,
    ownerCount: plan.ownerCount,
    queueCount: plan.queueCount,
    blockerCount: plan.blockerCount,
    criticalBlockerCount: plan.criticalBlockerCount,
    policyCount: plan.policyCount,
    automatedCount: plan.automatedCount,
    manualCount: plan.manualCount,
    deferredCount: plan.deferredCount,
    automationRatio: plan.automationRatio,
    executionReadinessScore: plan.executionReadinessScore,
    executionConfidence: plan.executionConfidence,
    overallScore: plan.overallScore,
  });

  // 3. Owners (before assignments — FK dep)
  for (const owner of plan.owners) {
    await db.insert(executionOwners).values({
      id: owner.id,
      planId: plan.id,
      reportId: report.id,
      businessId: owner.businessId,
      ownerType: owner.ownerType,
      ownerName: owner.ownerName,
      ownerDescription: owner.ownerDescription,
      executionClass: owner.executionClass,
      assignmentCount: owner.assignmentCount,
      averageComplexity: owner.averageComplexity,
      readinessScore: owner.readinessScore,
    });
  }

  // 4. Assignments
  for (const a of plan.assignments) {
    await db.insert(executionAssignments).values({
      id: a.id,
      planId: plan.id,
      reportId: report.id,
      businessId: a.businessId,
      ownerId: a.ownerId,
      workPackageId: a.workPackageId,
      packageTitle: a.packageTitle,
      phaseType: a.phaseType,
      ownerType: a.ownerType,
      executionClass: a.executionClass,
      complexityLevel: a.complexityLevel,
      businessCriticality: a.businessCriticality,
      blockerCount: a.blockers.length,
      policyCount: a.policies.length,
      readinessScore: a.readinessScore,
      sequencePosition: a.sequencePosition ?? null,
      rationale: a.rationale,
    });
  }

  // 5. Queues
  for (const q of plan.queues) {
    await db.insert(executionQueues).values({
      id: q.id,
      planId: plan.id,
      reportId: report.id,
      businessId: q.businessId,
      assignmentId: q.assignmentId,
      workPackageId: q.workPackageId,
      queuePosition: q.queuePosition,
      phaseOrder: q.phaseOrder,
      ownerType: q.ownerType,
      executionClass: q.executionClass,
      priorityScore: q.priorityScore,
      isBlocked: q.isBlocked ? 1 : 0,
      blockerSummary: q.blockerSummary ?? null,
    });
  }

  // 6. Policies
  for (const pol of plan.policies) {
    await db.insert(executionPolicies).values({
      id: pol.id,
      planId: plan.id,
      reportId: report.id,
      businessId: pol.businessId,
      assignmentId: pol.assignmentId ?? null,
      policyType: pol.policyType,
      policyTitle: pol.policyTitle,
      policyDescription: pol.policyDescription,
      policyStatus: pol.policyStatus,
      severity: pol.severity,
      requiresApproval: pol.requiresApproval ? 1 : 0,
      mitigationNote: pol.mitigationNote ?? null,
    });
  }

  // 7. Readiness
  const r = plan.readiness;
  await db.insert(executionReadiness).values({
    id: r.id,
    planId: plan.id,
    reportId: report.id,
    businessId: r.businessId,
    operationalReadinessScore: r.operationalReadinessScore,
    capabilityReadinessScore: r.capabilityReadinessScore,
    policyReadinessScore: r.policyReadinessScore,
    dependencyReadinessScore: r.dependencyReadinessScore,
    overallReadinessScore: r.overallReadinessScore,
    readinessLevel: r.readinessLevel,
    executionConfidence: r.executionConfidence,
    keyBlocker: r.keyBlocker ?? null,
    recommendation: r.recommendation ?? null,
  });

  // 8. Upsert registry
  await db
    .insert(executionOrchestrationRegistry)
    .values({
      id: randomUUID(),
      businessId: report.businessId,
      userId: report.userId ?? null,
      totalPlans: 1,
      totalReports: 1,
      latestReportId: report.id,
      latestPlanId: plan.id,
      latestAssignmentCount: report.assignmentCount,
      latestBlockerCount: report.blockerCount,
      latestCriticalBlockerCount: report.criticalBlockerCount,
      latestAutomationRatio: report.automationRatio,
      latestReadinessScore: report.executionReadinessScore,
      latestConfidence: report.executionConfidence,
      latestOverallScore: report.overallScore,
      lastOrchestrationAt: new Date(),
    })
    .onConflictDoUpdate({
      target: executionOrchestrationRegistry.businessId,
      set: {
        totalPlans: db.$count(executionPlans, eq(executionPlans.businessId, report.businessId)),
        totalReports: db.$count(executionReports, eq(executionReports.businessId, report.businessId)),
        latestReportId: report.id,
        latestPlanId: plan.id,
        latestAssignmentCount: report.assignmentCount,
        latestBlockerCount: report.blockerCount,
        latestCriticalBlockerCount: report.criticalBlockerCount,
        latestAutomationRatio: report.automationRatio,
        latestReadinessScore: report.executionReadinessScore,
        latestConfidence: report.executionConfidence,
        latestOverallScore: report.overallScore,
        lastOrchestrationAt: new Date(),
        updatedAt: new Date(),
      },
    });
}

export async function getLatestOrchestrationSummary(userId: number): Promise<ExecutionOrchestrationSummary | null> {
  const regRows = await db
    .select()
    .from(executionOrchestrationRegistry)
    .orderBy(desc(executionOrchestrationRegistry.lastOrchestrationAt))
    .limit(1);

  if (!regRows[0]?.latestReportId || !regRows[0]?.latestPlanId) return null;

  const reg = regRows[0];
  return {
    reportId: reg.latestReportId ?? "",
    planId: reg.latestPlanId ?? "",
    businessId: reg.businessId,
    assignmentCount: reg.latestAssignmentCount ?? 0,
    automatedCount: 0,
    manualCount: 0,
    deferredCount: 0,
    blockerCount: reg.latestBlockerCount ?? 0,
    criticalBlockerCount: reg.latestCriticalBlockerCount ?? 0,
    automationRatio: reg.latestAutomationRatio ?? 0,
    executionReadinessScore: reg.latestReadinessScore ?? 0,
    executionReadinessLevel: scoreToLevel(reg.latestReadinessScore ?? 0),
    executionConfidence: reg.latestConfidence ?? 0,
    overallScore: reg.latestOverallScore ?? 0,
    executiveSummary: "",
    createdAt: reg.lastOrchestrationAt ?? reg.updatedAt,
  };
}
