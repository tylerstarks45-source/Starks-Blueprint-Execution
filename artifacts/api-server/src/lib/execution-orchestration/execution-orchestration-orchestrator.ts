// ─────────────────────────────────────────────────────────────────────────────
// Build 024: Execution Orchestration Engine — Orchestrator
// Full run: reads Operational Plan work packages → assigns owners →
// classifies owners → constructs queue → validates policies →
// detects blockers → measures readiness → evaluates → persists report.
// Fail-open at every stage.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import {
  operationalRegistry,
  workPackages as workPackagesTable,
  executionSequences as executionSequencesTable,
} from "@workspace/db/schema";
import { eq, desc, asc } from "drizzle-orm";

import { buildExecutionAssignments } from "./assignment-engine";
import { classifyOwners } from "./owner-classification-engine";
import { constructExecutionQueue } from "./queue-construction-engine";
import { validateExecutionPolicies } from "./policy-engine";
import { detectBlockers } from "./blocker-detection-engine";
import { measureExecutionReadiness } from "./execution-readiness-engine";
import { evaluateOrchestration } from "./orchestration-evaluation-engine";
import { assembleOrchestrationReport, buildOrchestrationSummary } from "./orchestration-report-engine";
import { persistOrchestrationReport, getLatestOrchestrationSummary } from "./execution-orchestration-registry";
import type { ExecutionPlan, ExecutionOrchestrationSummary, ExecutionOwnerType } from "./types";

const logger = { info: console.info.bind(console), warn: console.warn.bind(console) };

export async function runExecutionOrchestration(params: {
  userId: number;
  businessId: number;
}): Promise<ExecutionOrchestrationSummary | null> {
  const { userId, businessId } = params;
  const start = Date.now();

  try {
    // ── 1. Fetch operational plan ─────────────────────────────────────────────
    const opRegRows = await db
      .select()
      .from(operationalRegistry)
      .where(eq(operationalRegistry.businessId, businessId))
      .limit(1);

    if (!opRegRows[0]?.latestPlanId) {
      logger.warn({ businessId }, "Execution Orchestration: no operational plan found — skipping");
      return null;
    }

    const operationalPlanId = opRegRows[0].latestPlanId;
    const operationalReportId = opRegRows[0].latestReportId ?? undefined;
    const opReadinessScore = opRegRows[0].latestReadinessScore ?? 0.6;
    const opConfidence = opRegRows[0].latestConfidence ?? 0.65;

    // ── 2. Fetch work packages ────────────────────────────────────────────────
    const wpRows = await db
      .select()
      .from(workPackagesTable)
      .where(eq(workPackagesTable.planId, operationalPlanId))
      .orderBy(asc(workPackagesTable.sequencePosition), asc(workPackagesTable.priority));

    if (wpRows.length === 0) {
      logger.warn({ businessId }, "Execution Orchestration: no work packages found — skipping");
      return null;
    }

    // Fetch sequence positions for ordering
    const seqRows = await db
      .select()
      .from(executionSequencesTable)
      .where(eq(executionSequencesTable.planId, operationalPlanId))
      .orderBy(asc(executionSequencesTable.sequencePosition));

    const seqPosMap = new Map(seqRows.map((s) => [s.workPackageId, s.sequencePosition]));

    const planId = randomUUID();
    const reportId = randomUUID(); // placeholder

    // ── 3. Build initial assignments (owner IDs determined after classification) ─
    const wpInputs = wpRows.map((wp) => ({
      id: wp.id,
      packageTitle: wp.packageTitle,
      capabilityName: wp.capabilityName,
      phaseType: wp.phaseType,
      complexityLevel: wp.complexityLevel,
      businessCriticality: wp.businessCriticality,
      sequencePosition: seqPosMap.get(wp.id) ?? wp.sequencePosition,
    }));

    // First pass: classify owners from a temporary assignment list to get owner IDs
    const tempAssignments = buildExecutionAssignments({
      workPackages: wpInputs,
      planId,
      reportId,
      businessId,
      ownerIds: new Map<ExecutionOwnerType, string>(), // empty — IDs assigned below
    });

    // Classify unique owners
    const { owners, ownerIds } = classifyOwners({
      assignments: tempAssignments,
      planId,
      reportId,
      businessId,
    });

    // Second pass: rebuild assignments with correct owner IDs
    const assignments = buildExecutionAssignments({
      workPackages: wpInputs,
      planId,
      reportId,
      businessId,
      ownerIds,
    });

    // ── 4. Detect blockers per assignment ─────────────────────────────────────
    for (const assignment of assignments) {
      assignment.blockers = detectBlockers(assignment);
    }

    // ── 5. Validate policies ──────────────────────────────────────────────────
    const policies = validateExecutionPolicies({
      planId,
      reportId,
      businessId,
      assignments,
    });

    // Attach assignment-level policies back to assignments
    for (const policy of policies) {
      if (policy.assignmentId) {
        const assignment = assignments.find((a) => a.id === policy.assignmentId);
        if (assignment) assignment.policies.push(policy);
      }
    }

    // ── 6. Construct execution queue ──────────────────────────────────────────
    const queues = constructExecutionQueue({ assignments, planId, reportId, businessId });

    // ── 7. Measure readiness ──────────────────────────────────────────────────
    const satisfiedPolicies = policies.filter((p) => p.policyStatus === "satisfied").length;
    const capReadiness = opConfidence; // best proxy without re-fetching capability layer

    const readiness = measureExecutionReadiness({
      planId,
      reportId,
      businessId,
      assignments,
      policies,
      operationalReadinessScore: opReadinessScore,
      capabilityReadinessScore: capReadiness,
    });

    // Compute aggregates
    const automatedCount = assignments.filter((a) => a.executionClass === "automated").length;
    const manualCount = assignments.filter((a) => a.executionClass === "manual").length;
    const semiCount = assignments.filter((a) => a.executionClass === "semi_automated").length;
    const externalCount = assignments.filter((a) => a.executionClass === "external").length;
    const deferredCount = assignments.filter((a) => a.executionClass === "deferred").length;
    const blockerCount = assignments.reduce((s, a) => s + a.blockers.length, 0);
    const criticalBlockerCount = assignments.reduce(
      (s, a) => s + a.blockers.filter((b) => b.severity === "critical").length,
      0,
    );
    const automationRatio =
      assignments.length > 0
        ? Math.round((automatedCount / assignments.length) * 100) / 100
        : 0;

    // Update readiness score on each assignment
    for (const a of assignments) {
      const aBlockers = a.blockers.filter((b) => b.severity === "critical").length;
      a.readinessScore = Math.round(Math.max(0.2, readiness.overallReadinessScore - aBlockers * 0.1) * 100) / 100;
    }

    // ── 8. Evaluate ───────────────────────────────────────────────────────────
    const evaluation = evaluateOrchestration({
      assignmentCount: assignments.length,
      workPackageCount: wpRows.length,
      automatedCount,
      manualCount,
      deferredCount,
      blockerCount,
      criticalBlockerCount,
      satisfiedPolicies,
      totalPolicies: policies.length,
      overallReadinessScore: readiness.overallReadinessScore,
      executionConfidence: readiness.executionConfidence,
    });

    // ── 9. Assemble plan ──────────────────────────────────────────────────────
    const plan: ExecutionPlan = {
      id: planId,
      reportId,
      businessId,
      userId,
      operationalPlanId,
      operationalReportId,
      assignmentCount: assignments.length,
      ownerCount: owners.length,
      queueCount: queues.length,
      blockerCount,
      criticalBlockerCount,
      policyCount: policies.length,
      automatedCount,
      manualCount,
      deferredCount,
      automationRatio,
      executionReadinessScore: readiness.overallReadinessScore,
      executionConfidence: readiness.executionConfidence,
      overallScore: evaluation.overallScore,
      owners,
      assignments,
      queues,
      policies,
      readiness,
    };

    // ── 10. Assemble and persist report ───────────────────────────────────────
    const report = assembleOrchestrationReport({
      businessId,
      userId,
      operationalReportId,
      plan,
      evaluation,
      orchestrationDurationMs: Date.now() - start,
    });

    // Propagate real reportId
    report.plan.reportId = report.id;
    for (const o of report.plan.owners) o.reportId = report.id;
    for (const a of report.plan.assignments) {
      a.reportId = report.id;
      for (const pol of a.policies) pol.reportId = report.id;
    }
    for (const q of report.plan.queues) q.reportId = report.id;
    for (const pol of report.plan.policies) pol.reportId = report.id;
    report.plan.readiness.reportId = report.id;

    await persistOrchestrationReport(report);
    const summary = buildOrchestrationSummary(report);

    logger.info(
      {
        businessId,
        reportId: report.id,
        assignmentCount: assignments.length,
        ownerCount: owners.length,
        automatedCount,
        deferredCount,
        blockerCount,
        criticalBlockerCount,
        readinessScore: readiness.overallReadinessScore,
        automationRatio,
      },
      "Execution Orchestration: run complete",
    );

    return summary;
  } catch (err) {
    logger.warn({ err, businessId }, "Execution Orchestration: orchestrator run failed (fail-open)");
    return null;
  }
}

export async function fetchOrchestrationSummaryForEB(userId: number): Promise<ExecutionOrchestrationSummary | null> {
  try {
    return await getLatestOrchestrationSummary(userId);
  } catch (err) {
    logger.warn({ err }, "Execution Orchestration: failed to fetch summary for EB (fail-open)");
    return null;
  }
}
