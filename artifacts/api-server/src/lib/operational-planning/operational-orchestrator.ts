// ─────────────────────────────────────────────────────────────────────────────
// Build 023: Operational Planning Engine — Orchestrator
// Full run: reads Capability Plan requirements → builds work packages →
// organizes into phases → resolves dependencies → sequences →
// verifies readiness → evaluates → persists report.
// Fail-open at every stage.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import {
  capabilityRegistry,
  capabilityRequirements,
  capabilityReadiness as capabilityReadinessTable,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

import { buildWorkPackages } from "./work-package-engine";
import { buildOperationalPhases, ALL_PHASE_TYPES } from "./operational-phase-engine";
import { resolveExecutionDependencies } from "./dependency-resolution-engine";
import { produceExecutionSequence } from "./sequencing-engine";
import { verifyOperationalReadiness } from "./readiness-verification-engine";
import { evaluateOperationalPlan } from "./operational-evaluation-engine";
import { assembleOperationalReport, buildOperationalSummary } from "./operational-report-engine";
import { persistOperationalReport, getLatestOperationalSummary } from "./operational-registry";
import type { OperationalPlan, OperationalSummary } from "./types";

const logger = { info: console.info.bind(console), warn: console.warn.bind(console) };

export async function runOperationalPlanning(params: {
  userId: number;
  businessId: number;
}): Promise<OperationalSummary | null> {
  const { userId, businessId } = params;
  const start = Date.now();

  try {
    // ── 1. Fetch capability plan for this business ────────────────────────────
    const capRegRows = await db
      .select()
      .from(capabilityRegistry)
      .where(eq(capabilityRegistry.businessId, businessId))
      .limit(1);

    if (!capRegRows[0]?.latestPlanId) {
      logger.warn({ businessId }, "Operational Planning: no capability plan found — skipping");
      return null;
    }

    const capabilityPlanId = capRegRows[0].latestPlanId;
    const capabilityReportId = capRegRows[0].latestReportId ?? undefined;
    const capabilityConfidence = capRegRows[0].latestConfidence ?? 0.7;
    const capabilityReadinessScore = capRegRows[0].latestReadinessScore ?? 0.6;

    // ── 2. Fetch capability requirements for the plan ─────────────────────────
    const reqRows = await db
      .select()
      .from(capabilityRequirements)
      .where(eq(capabilityRequirements.planId, capabilityPlanId))
      .orderBy(capabilityRequirements.priority);

    if (reqRows.length === 0) {
      logger.warn({ businessId }, "Operational Planning: no capability requirements found — skipping");
      return null;
    }

    // Fetch domain readiness for overall capability readiness
    const domainReadinessRows = await db
      .select()
      .from(capabilityReadinessTable)
      .where(eq(capabilityReadinessTable.planId, capabilityPlanId))
      .orderBy(desc(capabilityReadinessTable.overallReadinessScore));

    const avgCapReadiness =
      domainReadinessRows.length > 0
        ? domainReadinessRows.reduce((s, r) => s + (r.overallReadinessScore ?? 0), 0) / domainReadinessRows.length
        : capabilityReadinessScore;

    // ── 3. Build phases (pre-IDs) ─────────────────────────────────────────────
    const planId = randomUUID();
    const reportId = randomUUID(); // placeholder — replaced after assembly

    // First pass: build phase IDs (work packages need phase IDs before assignment)
    const phaseIds = new Map<import("./types").OperationalPhaseType, string>();
    for (const pt of ALL_PHASE_TYPES()) {
      phaseIds.set(pt, randomUUID());
    }

    // ── 4. Build work packages from capability requirements ───────────────────
    const reqInputs = reqRows.map((r) => ({
      id: r.id,
      capabilityName: r.capabilityName,
      capabilityDescription: r.capabilityDescription,
      domainType: r.programType ?? "operations",
      requiredLevel: r.requiredLevel,
      gapSeverity: r.gapSeverity,
      businessCriticality: r.businessCriticality,
      isMissing: r.isMissing === 1,
      priority: r.priority,
    }));

    const rawWorkPackages = buildWorkPackages({
      requirements: reqInputs,
      planId,
      reportId,
      businessId,
      phaseIds,
    });

    // ── 5. Organize into phases ───────────────────────────────────────────────
    const { phases, phaseIds: finalPhaseIds } = buildOperationalPhases({
      planId,
      reportId,
      businessId,
      workPackages: rawWorkPackages,
    });

    // Reassign work packages to correct phase objects (phase engine rebuilt them with correct IDs)
    const allWorkPackages = phases.flatMap((p) => p.workPackages);

    // ── 6. Resolve dependencies ───────────────────────────────────────────────
    const activePhaseTypes = phases.filter((p) => p.workPackageCount > 0).map((p) => p.phaseType);
    const dependencies = resolveExecutionDependencies({
      planId,
      reportId,
      businessId,
      workPackages: allWorkPackages,
      activePhaseTypes,
    });
    const criticalDependencyCount = dependencies.filter((d) => d.severity === "critical").length;

    // ── 7. Sequence execution ─────────────────────────────────────────────────
    const sequences = produceExecutionSequence({
      planId,
      reportId,
      businessId,
      phases,
      dependencies,
    });

    // Update sequence positions on work packages
    const seqMap = new Map(sequences.map((s) => [s.workPackageId, s.sequencePosition]));
    for (const wp of allWorkPackages) {
      wp.sequencePosition = seqMap.get(wp.id);
    }

    // ── 8. Verify readiness ───────────────────────────────────────────────────
    const readiness = verifyOperationalReadiness({
      planId,
      reportId,
      businessId,
      capabilityReadinessScore: avgCapReadiness,
      workPackageCount: allWorkPackages.length,
      criticalDependencyCount,
      phaseCount: phases.length,
      capabilityConfidence,
    });

    // ── 9. Evaluate ───────────────────────────────────────────────────────────
    const evaluation = evaluateOperationalPlan({
      phaseCount: phases.length,
      workPackageCount: allWorkPackages.length,
      dependencyCount: dependencies.length,
      criticalDependencyCount,
      sequenceCount: sequences.length,
      overallReadinessScore: readiness.overallReadinessScore,
      executionConfidenceScore: readiness.executionConfidenceScore,
      capabilityConfidence,
    });

    // ── 10. Assemble plan ──────────────────────────────────────────────────────
    const plan: OperationalPlan = {
      id: planId,
      reportId,
      businessId,
      userId,
      capabilityPlanId,
      capabilityReportId,
      phaseCount: phases.length,
      workPackageCount: allWorkPackages.length,
      dependencyCount: dependencies.length,
      criticalDependencyCount,
      sequenceCount: sequences.length,
      executionReadinessScore: readiness.overallReadinessScore,
      executionConfidence: readiness.executionConfidenceScore,
      completenessScore: evaluation.completenessScore,
      feasibilityScore: evaluation.feasibilityScore,
      complexityScore: evaluation.complexityScore,
      riskScore: evaluation.riskScore,
      readinessScore: evaluation.readinessScore,
      confidenceScore: evaluation.confidenceScore,
      overallScore: evaluation.overallScore,
      phases,
      dependencies,
      sequences,
      readiness,
    };

    // ── 11. Assemble and persist report ───────────────────────────────────────
    const report = assembleOperationalReport({
      businessId,
      userId,
      capabilityReportId,
      plan,
      evaluation,
      operationalDurationMs: Date.now() - start,
    });

    // Propagate the real reportId
    report.plan.reportId = report.id;
    for (const phase of report.plan.phases) {
      phase.reportId = report.id;
      for (const wp of phase.workPackages) wp.reportId = report.id;
    }
    for (const dep of report.plan.dependencies) dep.reportId = report.id;
    for (const seq of report.plan.sequences) seq.reportId = report.id;
    report.plan.readiness.reportId = report.id;

    await persistOperationalReport(report);
    const summary = buildOperationalSummary(report);

    logger.info(
      {
        businessId,
        reportId: report.id,
        phaseCount: phases.length,
        workPackageCount: allWorkPackages.length,
        dependencyCount: dependencies.length,
        criticalDependencyCount,
        sequenceCount: sequences.length,
        readinessScore: readiness.overallReadinessScore,
      },
      "Operational Planning: run complete",
    );

    return summary;
  } catch (err) {
    logger.warn({ err, businessId }, "Operational Planning: orchestrator run failed (fail-open)");
    return null;
  }
}

export async function fetchOperationalSummaryForEB(userId: number): Promise<OperationalSummary | null> {
  try {
    return await getLatestOperationalSummary(userId);
  } catch (err) {
    logger.warn({ err }, "Operational Planning: failed to fetch summary for EB (fail-open)");
    return null;
  }
}
