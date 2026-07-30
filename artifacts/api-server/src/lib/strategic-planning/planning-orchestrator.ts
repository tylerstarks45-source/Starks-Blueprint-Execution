// ─────────────────────────────────────────────────────────────────────────────
// Build 021: Strategic Planning Engine — Orchestrator
// Full run coordinator: reads Executive Strategy → forms programs → creates
// initiatives → defines milestones → identifies dependencies →
// determines sequences → evaluates readiness → scores plan → persists report.
// Fail-open at every stage.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import {
  strategyRegistryTable,
  strategicPillarsTable,
  executiveStrategiesTable,
  strategyReportsTable,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

import { formPrograms } from "./program-formation-engine";
import { createInitiatives } from "./initiative-engine";
import { createMilestones } from "./milestone-engine";
import { identifyDependencies } from "./dependency-engine";
import { determineSequences } from "./sequencing-engine";
import { evaluateReadiness } from "./readiness-engine";
import { evaluatePlan } from "./planning-evaluation-engine";
import { assemblePlanningReport, buildPlanningSummary } from "./planning-report-engine";
import { persistPlanningReport, getLatestPlanningSummary } from "./planning-registry";
import type { PlanHorizon, ProgramType, StrategicProgram, StrategicInitiative, PlanningSummary } from "./types";

const logger = { info: console.info.bind(console), warn: console.warn.bind(console) };

export async function runStrategicPlanning(params: {
  userId: number;
  businessId: number;
}): Promise<PlanningSummary | null> {
  const { userId, businessId } = params;
  const start = Date.now();

  try {
    // ── 1. Fetch active executive strategy ────────────────────────────────────
    const regRows = await db
      .select()
      .from(strategyRegistryTable)
      .where(eq(strategyRegistryTable.businessId, businessId))
      .limit(1);

    if (!regRows[0]?.latestStrategyId) {
      logger.warn({ businessId }, "Strategic Planning: no executive strategy found — skipping");
      return null;
    }

    const stratReg = regRows[0];

    // Fetch pillars from the latest strategy
    const pillarsRows = await db
      .select()
      .from(strategicPillarsTable)
      .where(eq(strategicPillarsTable.strategyId, stratReg.latestStrategyId!))
      .orderBy((await import("drizzle-orm")).asc(strategicPillarsTable.priority));

    if (pillarsRows.length === 0) {
      logger.warn({ businessId }, "Strategic Planning: no pillars found — skipping");
      return null;
    }

    // Fetch strategy-level metadata for alignment + confidence
    const stratRows = await db
      .select({ alignmentScore: executiveStrategiesTable.alignmentScore, confidenceScore: executiveStrategiesTable.confidenceScore })
      .from(executiveStrategiesTable)
      .where(eq(executiveStrategiesTable.id, stratReg.latestStrategyId!))
      .limit(1);

    const strategyAlignmentScore = stratRows[0]?.alignmentScore ?? 0.7;
    const strategyConfidence = stratRows[0]?.confidenceScore ?? 0.7;

    // Strategy report ID
    const stratReportRows = await db
      .select({ id: strategyReportsTable.id })
      .from(strategyReportsTable)
      .where(eq(strategyReportsTable.businessId, businessId))
      .orderBy(desc(strategyReportsTable.createdAt))
      .limit(1);
    const strategyReportId = stratReportRows[0]?.id;

    // ── 2. Form plan scaffold ─────────────────────────────────────────────────
    const planId = randomUUID();
    const reportId = randomUUID(); // placeholder — replaced by assemblePlanningReport

    const planHorizon: PlanHorizon = stratReg.latestScenarioType?.includes("transformation")
      ? "long"
      : stratReg.latestScenarioType?.includes("quick") || stratReg.latestScenarioType?.includes("pivot")
      ? "short"
      : "medium";

    // ── 3. Form programs from pillars ─────────────────────────────────────────
    const programInputs = formPrograms({
      planId,
      reportId,
      businessId,
      pillars: pillarsRows.map((p) => ({
        id: p.id,
        pillarType: p.pillarType,
        pillarName: p.pillarName,
        priority: p.priority,
        alignmentScore: p.alignmentScore ?? 0.7,
      })),
      strategyAlignmentScore,
    });

    // ── 4. Create initiatives for each program ─────────────────────────────────
    let allInitiatives: StrategicInitiative[] = [];
    const programs: StrategicProgram[] = [];

    for (const prog of programInputs) {
      const initiatives = createInitiatives({
        programId: prog.id,
        programType: prog.programType,
        planId,
        reportId,
        businessId,
        programPriority: prog.priority,
        programAlignmentScore: prog.alignmentScore,
      });

      // ── 5. Create milestones for each initiative ───────────────────────────
      const initiativesWithMilestones = initiatives.map((init) => {
        const milestones = createMilestones({ initiative: { ...init } });
        return { ...init, milestoneCount: milestones.length, milestones };
      });

      allInitiatives = allInitiatives.concat(initiativesWithMilestones);
      programs.push({
        ...prog,
        initiativeCount: initiativesWithMilestones.length,
        initiatives: initiativesWithMilestones,
      });
    }

    const programTypes = programs.map((p) => p.programType as ProgramType);

    // ── 6. Identify dependencies ───────────────────────────────────────────────
    const dependencies = identifyDependencies({ planId, reportId, businessId, programTypes });

    // ── 7. Determine sequences ─────────────────────────────────────────────────
    const { sequences, updatedPrograms } = determineSequences({
      planId,
      reportId,
      businessId,
      programs: programs.map((p) => ({
        id: p.id,
        programType: p.programType,
        programName: p.programName,
        priority: p.priority,
      })),
      initiatives: allInitiatives.map((i) => ({
        id: i.id,
        programId: i.programId,
        initiativeName: i.initiativeName,
        priority: i.priority,
        sequencePosition: i.sequencePosition,
      })),
    });

    // Apply updated sequenceLayer back to programs
    const programLayerMap = new Map(updatedPrograms.map((p) => [p.id, p.sequenceLayer]));
    const finalPrograms = programs.map((p) => ({
      ...p,
      sequenceLayer: programLayerMap.get(p.id) ?? 0,
    }));

    const programCount = finalPrograms.length;
    const initiativeCount = allInitiatives.length;
    const milestoneCount = allInitiatives.reduce((s, i) => s + i.milestones.length, 0);
    const dependencyCount = dependencies.length;
    const criticalDependencyCount = dependencies.filter(
      (d) => d.severity === "high" || d.severity === "critical",
    ).length;

    // ── 8. Evaluate readiness ──────────────────────────────────────────────────
    const readiness = evaluateReadiness({
      strategyConfidence,
      strategyAlignmentScore,
      constraintCount: 6, // from executive strategy (always 6)
      dependencyCount,
      criticalDependencyCount,
      pillarCount: pillarsRows.length,
      objectiveCount: initiativeCount, // proxy
    });

    // ── 9. Evaluate plan ───────────────────────────────────────────────────────
    const evaluation = evaluatePlan({
      programCount,
      initiativeCount,
      milestoneCount,
      dependencyCount,
      criticalDependencyCount,
      sequenceCount: sequences.length,
      readinessScore: readiness.overall,
      strategyAlignmentScore,
      strategyConfidence,
      constraintCount: 6,
    });

    // ── 10. Assemble plan object ───────────────────────────────────────────────
    const plan = {
      id: planId,
      reportId,
      businessId,
      userId,
      strategyId: stratReg.latestStrategyId ?? undefined,
      strategyReportId: strategyReportId ?? undefined,
      planName: `Strategic Plan — ${new Date().getFullYear()}`,
      planDescription: `Structured strategic plan derived from executive strategy across ${programCount} programmes and ${initiativeCount} initiatives.`,
      planHorizon,
      programCount,
      initiativeCount,
      milestoneCount,
      dependencyCount,
      readinessScore: readiness.overall,
      completenessScore: evaluation.completenessScore,
      feasibilityScore: evaluation.feasibilityScore,
      alignmentScore: evaluation.alignmentScore,
      complexityScore: evaluation.complexityScore,
      riskScore: evaluation.riskScore,
      confidence: evaluation.confidenceScore,
      programs: finalPrograms,
      dependencies,
      sequences,
    };

    // ── 11. Assemble and persist report ────────────────────────────────────────
    const report = assemblePlanningReport({
      businessId,
      userId,
      strategyReportId: strategyReportId ?? undefined,
      plan,
      readiness,
      evaluation,
      planningDurationMs: Date.now() - start,
    });

    // Update plan + programs with the real reportId from assemblePlanningReport
    report.plan.reportId = report.id;
    for (const prog of report.plan.programs) {
      prog.reportId = report.id;
      for (const init of prog.initiatives) {
        init.reportId = report.id;
        for (const ms of init.milestones) {
          ms.reportId = report.id;
        }
      }
    }
    for (const dep of report.plan.dependencies) dep.reportId = report.id;
    for (const seq of report.plan.sequences) seq.reportId = report.id;

    await persistPlanningReport(report);

    const summary = buildPlanningSummary(report);

    logger.info(
      { businessId, reportId: report.id, programCount, initiativeCount, milestoneCount, confidence: evaluation.confidenceScore },
      "Strategic Planning: run complete",
    );

    return summary;
  } catch (err) {
    logger.warn({ err, businessId }, "Strategic Planning: orchestrator run failed (fail-open)");
    return null;
  }
}

export async function fetchPlanningSummaryForEB(userId: number): Promise<PlanningSummary | null> {
  try {
    return await getLatestPlanningSummary(userId);
  } catch (err) {
    logger.warn({ err }, "Strategic Planning: failed to fetch summary for EB (fail-open)");
    return null;
  }
}
