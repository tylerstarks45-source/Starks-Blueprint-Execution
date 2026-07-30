// ─────────────────────────────────────────────────────────────────────────────
// Build 021: Strategic Planning Engine — Registry (DB Persistence Layer)
// All INSERT / UPSERT for all 8 tables.
// FK insertion order: planning_reports → strategic_plans → strategic_programs
//   → strategic_initiatives → planning_milestones → planning_dependencies
//   → planning_sequences → planning_registry
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@workspace/db";
import {
  planningReports,
  strategicPlans,
  strategicPrograms,
  strategicInitiatives,
  planningMilestones,
  planningDependencies,
  planningSequences,
  planningRegistry,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import type { PlanningReport, PlanningSummary, StrategicProgram, StrategicInitiative, PlanningMilestone, PlanningDependency, PlanningSequence } from "./types";

// ── Persist full report in FK order ──────────────────────────────────────────
export async function persistPlanningReport(report: PlanningReport): Promise<void> {
  const { plan } = report;

  // 1. planning_reports (root — first)
  await db.insert(planningReports).values({
    id: report.id,
    businessId: report.businessId,
    userId: report.userId ?? null,
    strategyReportId: report.strategyReportId ?? null,
    primaryPlanId: report.primaryPlanId,
    programCount: report.programCount,
    initiativeCount: report.initiativeCount,
    milestoneCount: report.milestoneCount,
    dependencyCount: report.dependencyCount,
    sequenceCount: report.sequenceCount,
    overallReadinessScore: report.overallReadinessScore,
    overallConfidence: report.overallConfidence,
    completenessScore: report.completenessScore,
    feasibilityScore: report.feasibilityScore,
    alignmentScore: report.alignmentScore,
    executiveSummary: report.executiveSummary,
    planningDurationMs: report.planningDurationMs,
  });

  // 2. strategic_plans
  await db.insert(strategicPlans).values({
    id: plan.id,
    reportId: report.id,
    businessId: plan.businessId,
    userId: plan.userId ?? null,
    strategyId: plan.strategyId ?? null,
    strategyReportId: plan.strategyReportId ?? null,
    planName: plan.planName,
    planDescription: plan.planDescription,
    planHorizon: plan.planHorizon,
    programCount: plan.programCount,
    initiativeCount: plan.initiativeCount,
    milestoneCount: plan.milestoneCount,
    dependencyCount: plan.dependencyCount,
    readinessScore: plan.readinessScore,
    completenessScore: plan.completenessScore,
    feasibilityScore: plan.feasibilityScore,
    alignmentScore: plan.alignmentScore,
    complexityScore: plan.complexityScore,
    riskScore: plan.riskScore,
    confidence: plan.confidence,
  });

  // 3. strategic_programs
  for (const prog of plan.programs) {
    await db.insert(strategicPrograms).values({
      id: prog.id,
      planId: prog.planId,
      reportId: prog.reportId,
      businessId: prog.businessId,
      pillarId: prog.pillarId ?? null,
      pillarType: prog.pillarType,
      programType: prog.programType,
      programName: prog.programName,
      programDescription: prog.programDescription,
      priority: prog.priority,
      weight: prog.weight,
      expectedDuration: prog.expectedDuration,
      initiativeCount: prog.initiativeCount,
      sequenceLayer: prog.sequenceLayer,
      alignmentScore: prog.alignmentScore,
      confidence: prog.confidence,
    });

    // 4. strategic_initiatives (within each program)
    for (const init of prog.initiatives) {
      await db.insert(strategicInitiatives).values({
        id: init.id,
        programId: init.programId,
        planId: init.planId,
        reportId: init.reportId,
        businessId: init.businessId,
        initiativeName: init.initiativeName,
        initiativeDescription: init.initiativeDescription,
        initiativeType: init.initiativeType,
        effort: init.effort,
        complexity: init.complexity,
        priority: init.priority,
        sequencePosition: init.sequencePosition,
        milestoneCount: init.milestoneCount,
        alignmentScore: init.alignmentScore,
        confidence: init.confidence,
      });

      // 5. planning_milestones (within each initiative)
      for (const ms of init.milestones) {
        await db.insert(planningMilestones).values({
          id: ms.id,
          initiativeId: ms.initiativeId,
          programId: ms.programId,
          planId: ms.planId,
          reportId: ms.reportId,
          businessId: ms.businessId,
          milestoneType: ms.milestoneType,
          milestoneName: ms.milestoneName,
          milestoneDescription: ms.milestoneDescription,
          successCriteria: ms.successCriteria,
          sequencePosition: ms.sequencePosition,
          isCriticalPath: ms.isCriticalPath ? 1 : 0,
        });
      }
    }
  }

  // 6. planning_dependencies
  for (const dep of plan.dependencies) {
    await db.insert(planningDependencies).values({
      id: dep.id,
      planId: dep.planId,
      reportId: dep.reportId,
      businessId: dep.businessId,
      dependencyType: dep.dependencyType,
      title: dep.title,
      description: dep.description,
      fromEntityType: dep.fromEntityType ?? null,
      fromEntityId: dep.fromEntityId ?? null,
      toEntityType: dep.toEntityType ?? null,
      toEntityId: dep.toEntityId ?? null,
      severity: dep.severity,
      mitigationNote: dep.mitigationNote ?? null,
    });
  }

  // 7. planning_sequences
  for (const seq of plan.sequences) {
    await db.insert(planningSequences).values({
      id: seq.id,
      planId: seq.planId,
      reportId: seq.reportId,
      businessId: seq.businessId,
      entityType: seq.entityType,
      entityId: seq.entityId,
      entityName: seq.entityName,
      sequenceLayer: seq.sequenceLayer,
      sequencePosition: seq.sequencePosition,
      predecessorIds: seq.predecessorIds,
      canParallelise: seq.canParallelise ? 1 : 0,
      rationale: seq.rationale,
    });
  }

  // 8. planning_registry (upsert — last)
  const existing = await db.select().from(planningRegistry).where(eq(planningRegistry.businessId, report.businessId)).limit(1);
  const registryId = existing[0]?.id ?? require("crypto").randomUUID();
  const totalReports = (existing[0]?.totalReports ?? 0) + 1;
  const totalPlans = (existing[0]?.totalPlans ?? 0) + 1;

  await db
    .insert(planningRegistry)
    .values({
      id: registryId,
      businessId: report.businessId,
      userId: report.userId ?? null,
      totalPlans,
      totalReports,
      latestReportId: report.id,
      latestPlanId: report.primaryPlanId,
      latestProgramCount: report.programCount,
      latestInitiativeCount: report.initiativeCount,
      latestMilestoneCount: report.milestoneCount,
      latestReadinessScore: report.overallReadinessScore,
      latestConfidence: report.overallConfidence,
      lastPlanningAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: planningRegistry.businessId,
      set: {
        totalPlans,
        totalReports,
        latestReportId: report.id,
        latestPlanId: report.primaryPlanId,
        latestProgramCount: report.programCount,
        latestInitiativeCount: report.initiativeCount,
        latestMilestoneCount: report.milestoneCount,
        latestReadinessScore: report.overallReadinessScore,
        latestConfidence: report.overallConfidence,
        lastPlanningAt: new Date(),
        updatedAt: new Date(),
      },
    });
}

// ── Read helpers ──────────────────────────────────────────────────────────────
export async function getLatestPlanningReport(businessId: number): Promise<{ reportId: string; planId: string } | null> {
  const rows = await db
    .select({ id: planningReports.id, primaryPlanId: planningReports.primaryPlanId })
    .from(planningReports)
    .where(eq(planningReports.businessId, businessId))
    .orderBy(desc(planningReports.createdAt))
    .limit(1);
  if (!rows[0]) return null;
  return { reportId: rows[0].id, planId: rows[0].primaryPlanId ?? "" };
}

export async function listPlanningReports(businessId: number) {
  return db
    .select()
    .from(planningReports)
    .where(eq(planningReports.businessId, businessId))
    .orderBy(desc(planningReports.createdAt));
}

export async function getStrategicPlan(planId: string) {
  const rows = await db.select().from(strategicPlans).where(eq(strategicPlans.id, planId)).limit(1);
  return rows[0] ?? null;
}

export async function getPrograms(planId: string) {
  const { asc } = await import("drizzle-orm");
  return db
    .select()
    .from(strategicPrograms)
    .where(eq(strategicPrograms.planId, planId))
    .orderBy(asc(strategicPrograms.priority));
}

export async function getInitiatives(programId: string) {
  const { asc } = await import("drizzle-orm");
  return db
    .select()
    .from(strategicInitiatives)
    .where(eq(strategicInitiatives.programId, programId))
    .orderBy(asc(strategicInitiatives.sequencePosition));
}

export async function getMilestones(initiativeId: string) {
  const { asc } = await import("drizzle-orm");
  return db
    .select()
    .from(planningMilestones)
    .where(eq(planningMilestones.initiativeId, initiativeId))
    .orderBy(asc(planningMilestones.sequencePosition));
}

export async function getDependencies(planId: string) {
  return db.select().from(planningDependencies).where(eq(planningDependencies.planId, planId));
}

export async function getSequences(planId: string) {
  const { asc } = await import("drizzle-orm");
  return db
    .select()
    .from(planningSequences)
    .where(eq(planningSequences.planId, planId))
    .orderBy(asc(planningSequences.sequenceLayer), asc(planningSequences.sequencePosition));
}

export async function getRegistry(businessId: number) {
  const rows = await db.select().from(planningRegistry).where(eq(planningRegistry.businessId, businessId)).limit(1);
  return rows[0] ?? null;
}

export async function getLatestPlanningSummary(userId: number): Promise<PlanningSummary | null> {
  // Find the most recent report for any business owned by this user
  const rows = await db
    .select()
    .from(planningReports)
    .where(eq(planningReports.userId, userId))
    .orderBy(desc(planningReports.createdAt))
    .limit(1);

  if (!rows[0]) return null;
  const r = rows[0];

  // Fetch top programs for advisory
  const progs = r.primaryPlanId
    ? await db
        .select({ programName: strategicPrograms.programName, priority: strategicPrograms.priority })
        .from(strategicPrograms)
        .where(eq(strategicPrograms.planId, r.primaryPlanId))
        .orderBy((await import("drizzle-orm")).asc(strategicPrograms.priority))
        .limit(3)
    : [];

  const deps = r.primaryPlanId
    ? await db
        .select({ severity: planningDependencies.severity })
        .from(planningDependencies)
        .where(eq(planningDependencies.planId, r.primaryPlanId))
    : [];

  const criticalDependencyCount = deps.filter((d) => d.severity === "high" || d.severity === "critical").length;

  return {
    reportId: r.id,
    planId: r.primaryPlanId ?? "",
    businessId: r.businessId,
    programCount: r.programCount,
    initiativeCount: r.initiativeCount,
    milestoneCount: r.milestoneCount,
    overallReadinessScore: r.overallReadinessScore ?? 0,
    overallReadinessLevel: readinessLevelFromScore(r.overallReadinessScore ?? 0),
    overallConfidence: r.overallConfidence ?? 0,
    topProgramNames: progs.map((p) => p.programName),
    criticalDependencyCount,
    feasibilityScore: r.feasibilityScore ?? 0,
    executiveSummary: r.executiveSummary,
    createdAt: r.createdAt,
  };
}

function readinessLevelFromScore(s: number) {
  if (s >= 0.85) return "ready" as const;
  if (s >= 0.70) return "high" as const;
  if (s >= 0.55) return "medium" as const;
  if (s >= 0.35) return "low" as const;
  return "not_ready" as const;
}
