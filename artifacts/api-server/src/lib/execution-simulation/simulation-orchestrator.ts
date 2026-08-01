// ─────────────────────────────────────────────────────────────────────────────
// Build 027: Execution Simulation Engine — Orchestrator
// Full run: reads execution assignments + risk data → constructs scenarios →
// predicts outcomes → estimates timelines + resources → simulates rollback →
// scores confidence → assembles report → persists.
// Never executes, changes state, or modifies systems.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import {
  executionOrchestrationRegistry,
  executionAssignments as executionAssignmentsTable,
  executionRiskRegistry,
  authorityRegistry,
} from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";

import { constructScenarios } from "./scenario-construction-engine";
import { predictOutcomes } from "./outcome-prediction-engine";
import { predictStateChanges } from "./dependency-impact-engine";
import { estimateTimeline } from "./timeline-estimation-engine";
import { estimateResources } from "./resource-consumption-engine";
import { simulateRollback } from "./rollback-simulation-engine";
import { scoreSimulationConfidence } from "./simulation-confidence-engine";
import { assembleSimulationReport, buildSimulationSummary } from "./simulation-report-engine";
import { persistSimulationReport, getLatestSimulationSummary } from "./simulation-registry";
import type { SimulationRecord, ExecutionSimulationSummary } from "./types";

const logger = { info: console.info.bind(console), warn: console.warn.bind(console) };

export async function runExecutionSimulation(params: {
  userId: number;
  businessId: number;
}): Promise<ExecutionSimulationSummary | null> {
  const { userId, businessId } = params;
  const start = Date.now();

  try {
    // ── 1. Fetch orchestration registry ─────────────────────────────────────
    const eoRegRows = await db
      .select()
      .from(executionOrchestrationRegistry)
      .where(eq(executionOrchestrationRegistry.businessId, businessId))
      .limit(1);

    if (!eoRegRows[0]?.latestPlanId) {
      logger.warn({ businessId }, "Execution Simulation: no orchestration plan — skipping");
      return null;
    }

    const orchestrationPlanId   = eoRegRows[0].latestPlanId;
    const orchestrationReportId = eoRegRows[0].latestReportId ?? undefined;

    // ── 2. Fetch risk registry (for context enrichment) ──────────────────────
    const riskRegRows = await db
      .select()
      .from(executionRiskRegistry)
      .where(eq(executionRiskRegistry.businessId, businessId))
      .limit(1);

    const riskReportId     = riskRegRows[0]?.latestReportId ?? undefined;
    const hasRiskData      = !!riskReportId;

    // ── 3. Fetch authority registry ──────────────────────────────────────────
    const authRegRows = await db
      .select()
      .from(authorityRegistry)
      .where(eq(authorityRegistry.businessId, businessId))
      .limit(1);

    const authorityReportId = authRegRows[0]?.latestReportId ?? undefined;
    const hasAuthorityData  = !!authorityReportId;

    // ── 4. Fetch execution assignments ───────────────────────────────────────
    const assignmentRows = await db
      .select()
      .from(executionAssignmentsTable)
      .where(eq(executionAssignmentsTable.planId, orchestrationPlanId))
      .orderBy(asc(executionAssignmentsTable.sequencePosition));

    if (assignmentRows.length === 0) {
      logger.warn({ businessId }, "Execution Simulation: no assignments — skipping");
      return null;
    }

    // ── 5. Build simulation record per assignment ────────────────────────────
    const reportId = randomUUID();

    const simulations: SimulationRecord[] = assignmentRows.map((row) => {
      const simulationId      = randomUUID();
      const ownerType         = row.ownerType;
      const executionClass    = row.executionClass;
      const complexityLevel   = row.complexityLevel ?? "medium";
      const businessCriticality = row.businessCriticality ?? "medium";
      const packageTitle      = row.packageTitle ?? undefined;

      // Scenarios
      const scenarios = constructScenarios({
        reportId, simulationId, businessId,
        ownerType, executionClass, complexityLevel, businessCriticality, packageTitle,
      });

      // Outcomes
      const outcomes = predictOutcomes(scenarios, {
        reportId, businessId, ownerType, businessCriticality, dependencyCount: 3,
      });

      // State changes
      const stateChanges = predictStateChanges({
        reportId, simulationId, businessId,
        ownerType, executionClass, complexityLevel, businessCriticality, packageTitle,
      });

      // Timeline
      const timeline = estimateTimeline({ ownerType, executionClass, complexityLevel, businessCriticality });

      // Resources
      const resourceConsumption = estimateResources({
        ownerType, executionClass, complexityLevel, businessCriticality,
        estimatedHours: timeline.expectedHours,
      });

      // Rollback
      const rollback = simulateRollback({
        reportId, simulationId, businessId,
        ownerType, executionClass, complexityLevel,
      });

      // Confidence
      const confidence = scoreSimulationConfidence({
        ownerType, executionClass, complexityLevel, businessCriticality,
        hasRiskData, hasAuthorityData,
        scenarioCount: scenarios.length,
      });

      // Expected outcome summary = expected_case scenario outcome
      const expectedOutcome = outcomes.find((o) => {
        const sc = scenarios.find((s) => s.id === o.scenarioId);
        return sc?.scenarioType === "expected_case";
      });

      return {
        id:                     simulationId,
        reportId,
        businessId,
        assignmentId:           row.id,
        workPackageId:          row.workPackageId ?? undefined,
        packageTitle,
        ownerType,
        executionClass,
        complexityLevel,
        businessCriticality,
        scenarios,
        outcomes,
        stateChanges,
        rollback,
        confidence,
        expectedOutcomeSummary: expectedOutcome?.outcomeSummary ?? "Expected case outcome not deterministic.",
        predictedDurationHours: timeline.expectedHours,
        resourceConsumption,
      };
    });

    // ── 6. Assemble report ───────────────────────────────────────────────────
    const simulationDurationMs = Date.now() - start;
    const report = assembleSimulationReport({
      businessId, userId, riskReportId, authorityReportId, orchestrationReportId,
      simulations, simulationDurationMs,
    });
    // Override with pre-assigned reportId
    (report as { id: string }).id = reportId;

    // ── 7. Persist ───────────────────────────────────────────────────────────
    await persistSimulationReport(report);

    const summary = buildSimulationSummary(report);
    logger.info({ businessId, simulationCount: simulations.length, confidence: report.overallConfidence }, "Execution Simulation: run complete");
    return summary;
  } catch (err) {
    logger.warn({ err, businessId }, "Execution Simulation: run failed (fail-open)");
    return null;
  }
}

export async function fetchSimulationSummaryForEB(userId: number): Promise<ExecutionSimulationSummary | null> {
  return getLatestSimulationSummary(userId);
}
