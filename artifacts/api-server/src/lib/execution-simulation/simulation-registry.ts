// ─────────────────────────────────────────────────────────────────────────────
// Build 027: Execution Simulation Engine — Registry (DB Persistence)
// FK insertion order: reports → simulations → scenarios → outcomes →
//                     state_changes → rollbacks → registry → snapshots
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import {
  executionSimulationReports,
  executionSimulations,
  simulationScenarios,
  predictedOutcomes,
  predictedStateChanges,
  rollbackSimulations,
  simulationRegistry,
  simulationSnapshots,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import type { ExecutionSimulationReport, ExecutionSimulationSummary } from "./types";

const logger = { warn: console.warn.bind(console), info: console.info.bind(console) };

export async function persistSimulationReport(report: ExecutionSimulationReport): Promise<void> {
  // 1. Insert execution_simulation_reports
  await db.insert(executionSimulationReports).values({
    id:                        report.id,
    businessId:                report.businessId,
    userId:                    report.userId ?? null,
    riskReportId:              report.riskReportId ?? null,
    authorityReportId:         report.authorityReportId ?? null,
    orchestrationReportId:     report.orchestrationReportId ?? null,
    simulationCount:           report.simulationCount,
    scenarioCount:             report.scenarioCount,
    overallConfidence:         String(report.overallConfidence),
    bestCaseConfidence:        String(report.bestCaseConfidence),
    worstCaseConfidence:       String(report.worstCaseConfidence),
    estimatedDurationMin:      String(report.estimatedDurationMin),
    estimatedDurationExpected: String(report.estimatedDurationExpected),
    estimatedDurationMax:      String(report.estimatedDurationMax),
    estimatedDurationUnit:     report.estimatedDurationUnit,
    rollbackConfidence:        String(report.rollbackConfidence),
    isSimulationComplete:      report.isSimulationComplete,
    executiveSummary:          report.executiveSummary,
    simulationDurationMs:      report.simulationDurationMs,
  });

  // 2. Insert execution_simulations
  if (report.simulations.length > 0) {
    await db.insert(executionSimulations).values(
      report.simulations.map((s) => ({
        id:                         s.id,
        reportId:                   report.id,
        businessId:                 report.businessId,
        assignmentId:               s.assignmentId,
        workPackageId:              s.workPackageId ?? null,
        packageTitle:               s.packageTitle ?? null,
        ownerType:                  s.ownerType,
        executionClass:             s.executionClass,
        complexityLevel:            s.complexityLevel,
        businessCriticality:        s.businessCriticality,
        scenarioCount:              s.scenarios.length,
        expectedOutcomeSummary:     s.expectedOutcomeSummary,
        predictedDurationHours:     String(s.predictedDurationHours),
        resourceConsumptionEstimate: s.resourceConsumption,
        confidenceScore:            String(s.confidence.overallConfidence),
        uncertaintyScore:           String(s.confidence.uncertaintyScore),
      }))
    );

    // 3. Insert simulation_scenarios
    const allScenarios = report.simulations.flatMap((s) => s.scenarios);
    if (allScenarios.length > 0) {
      await db.insert(simulationScenarios).values(
        allScenarios.map((sc) => ({
          id:                  sc.id,
          simulationId:        sc.simulationId,
          reportId:            report.id,
          businessId:          report.businessId,
          scenarioType:        sc.scenarioType,
          scenarioTitle:       sc.scenarioTitle,
          scenarioDescription: sc.scenarioDescription,
          probability:         String(sc.probability),
          successLikelihood:   String(sc.successLikelihood),
        }))
      );
    }

    // 4. Insert predicted_outcomes
    const allOutcomes = report.simulations.flatMap((s) => s.outcomes);
    if (allOutcomes.length > 0) {
      await db.insert(predictedOutcomes).values(
        allOutcomes.map((o) => ({
          id:                   o.id,
          scenarioId:           o.scenarioId,
          simulationId:         o.simulationId,
          reportId:             report.id,
          businessId:           report.businessId,
          outcomeType:          o.outcomeType,
          outcomeSummary:       o.outcomeSummary,
          impactSeverity:       o.impactSeverity,
          impactDescription:    o.impactDescription,
          dependenciesAffected: o.dependenciesAffected,
        }))
      );
    }

    // 5. Insert predicted_state_changes
    const allChanges = report.simulations.flatMap((s) => s.stateChanges);
    if (allChanges.length > 0) {
      await db.insert(predictedStateChanges).values(
        allChanges.map((c) => ({
          id:                c.id,
          simulationId:      c.simulationId,
          reportId:          report.id,
          businessId:        report.businessId,
          stateDomain:       c.stateDomain,
          changeType:        c.changeType,
          affectedEntity:    c.affectedEntity,
          changeDescription: c.changeDescription,
          isReversible:      c.isReversible,
          isCritical:        c.isCritical,
        }))
      );
    }

    // 6. Insert rollback_simulations
    const allRollbacks = report.simulations.map((s) => s.rollback);
    if (allRollbacks.length > 0) {
      await db.insert(rollbackSimulations).values(
        allRollbacks.map((r) => ({
          id:                             r.id,
          simulationId:                   r.simulationId,
          reportId:                       report.id,
          businessId:                     report.businessId,
          rollbackConfidence:             String(r.rollbackConfidence),
          recoveryComplexity:             r.recoveryComplexity,
          estimatedRecoveryDurationHours: String(r.estimatedRecoveryDurationHours),
          rollbackSteps:                  r.rollbackSteps,
          rollbackNotes:                  r.rollbackNotes,
          isRollbackFeasible:             r.isRollbackFeasible,
        }))
      );
    }
  }

  // 7. Upsert simulation_registry
  await db
    .insert(simulationRegistry)
    .values({
      id:                   randomUUID(),
      businessId:           report.businessId,
      latestReportId:       report.id,
      simulationCount:      report.simulationCount,
      overallConfidence:    String(report.overallConfidence),
      rollbackConfidence:   String(report.rollbackConfidence),
      isSimulationComplete: report.isSimulationComplete,
      lastSimulationAt:     new Date(),
    })
    .onConflictDoUpdate({
      target: simulationRegistry.businessId,
      set: {
        latestReportId:       report.id,
        simulationCount:      report.simulationCount,
        overallConfidence:    String(report.overallConfidence),
        rollbackConfidence:   String(report.rollbackConfidence),
        isSimulationComplete: report.isSimulationComplete,
        lastSimulationAt:     new Date(),
        updatedAt:            new Date(),
      },
    });

  // 8. Insert simulation_snapshots
  await db.insert(simulationSnapshots).values({
    id:           randomUUID(),
    reportId:     report.id,
    businessId:   report.businessId,
    userId:       report.userId ?? null,
    snapshotData: {
      simulationCount:           report.simulationCount,
      scenarioCount:             report.scenarioCount,
      overallConfidence:         report.overallConfidence,
      rollbackConfidence:        report.rollbackConfidence,
      estimatedDurationExpected: report.estimatedDurationExpected,
      isSimulationComplete:      report.isSimulationComplete,
    },
  });

  logger.info({ businessId: report.businessId, reportId: report.id }, "Simulation report persisted");
}

export async function getLatestSimulationSummary(userId: number): Promise<ExecutionSimulationSummary | null> {
  try {
    const regRows = await db
      .select()
      .from(simulationRegistry)
      .orderBy(simulationRegistry.lastSimulationAt)
      .limit(1);

    if (!regRows[0]?.latestReportId) return null;

    const reportRows = await db
      .select()
      .from(executionSimulationReports)
      .where(eq(executionSimulationReports.id, regRows[0].latestReportId))
      .limit(1);

    if (!reportRows[0]) return null;
    const r = reportRows[0];

    return {
      reportId:                  r.id,
      businessId:                r.businessId,
      simulationCount:           r.simulationCount,
      scenarioCount:             r.scenarioCount,
      overallConfidence:         Number(r.overallConfidence),
      bestCaseConfidence:        Number(r.bestCaseConfidence),
      worstCaseConfidence:       Number(r.worstCaseConfidence),
      estimatedDurationExpected: Number(r.estimatedDurationExpected),
      estimatedDurationUnit:     r.estimatedDurationUnit,
      rollbackConfidence:        Number(r.rollbackConfidence),
      isSimulationComplete:      r.isSimulationComplete,
      executiveSummary:          r.executiveSummary,
      createdAt:                 r.createdAt,
    };
  } catch (err) {
    logger.warn({ err, userId }, "Simulation registry: fetch failed");
    return null;
  }
}
