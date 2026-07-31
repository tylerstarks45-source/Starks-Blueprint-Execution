// ─────────────────────────────────────────────────────────────────────────────
// Build 024: Execution Orchestration Engine — Orchestration Report Engine
// Assembles immutable orchestration reports and EB summaries.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type {
  ExecutionOrchestrationReport,
  ExecutionPlan,
  OrchestrationEvaluation,
  ExecutionOrchestrationSummary,
  ExecutionReadinessLevel,
} from "./types";

function scoreToLevel(score: number): ExecutionReadinessLevel {
  if (score >= 0.85) return "optimising";
  if (score >= 0.70) return "managed";
  if (score >= 0.55) return "defined";
  if (score >= 0.35) return "developing";
  return "not_ready";
}

function buildExecutiveSummary(plan: ExecutionPlan, evaluation: OrchestrationEvaluation): string {
  const readinessLevel = scoreToLevel(plan.executionReadinessScore);
  const confPct = Math.round(plan.executionConfidence * 100);
  const automationPct = plan.assignmentCount > 0
    ? Math.round((plan.automatedCount / plan.assignmentCount) * 100)
    : 0;
  const blockerNote =
    plan.criticalBlockerCount > 0
      ? ` ${plan.criticalBlockerCount} critical blocker(s) require resolution before execution can begin.`
      : " No critical execution blockers identified.";
  const deferredNote =
    plan.deferredCount > 0
      ? ` ${plan.deferredCount} assignment(s) deferred pending capability availability.`
      : "";

  return (
    `Execution orchestration plan: ${plan.assignmentCount} work packages assigned across ${plan.ownerCount} execution owner type(s). ` +
    `Automation ratio: ${automationPct}% (${plan.automatedCount} automated, ${plan.manualCount} manual, ${plan.deferredCount} deferred). ` +
    `Execution readiness: ${readinessLevel} (${Math.round(plan.executionReadinessScore * 100)}%), confidence: ${confPct}%.` +
    blockerNote +
    deferredNote +
    ` ${evaluation.narrative}`
  );
}

export function assembleOrchestrationReport(params: {
  businessId: number;
  userId?: number;
  operationalReportId?: string;
  plan: ExecutionPlan;
  evaluation: OrchestrationEvaluation;
  orchestrationDurationMs: number;
}): ExecutionOrchestrationReport {
  const { businessId, userId, operationalReportId, plan, evaluation, orchestrationDurationMs } = params;
  const reportId = randomUUID();
  const executiveSummary = buildExecutiveSummary(plan, evaluation);

  return {
    id: reportId,
    businessId,
    userId,
    operationalReportId,
    primaryPlanId: plan.id,
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
    overallScore: evaluation.overallScore,
    executiveSummary,
    orchestrationDurationMs,
    plan,
    evaluation,
  };
}

export function buildOrchestrationSummary(report: ExecutionOrchestrationReport): ExecutionOrchestrationSummary {
  return {
    reportId: report.id,
    planId: report.plan.id,
    businessId: report.businessId,
    assignmentCount: report.assignmentCount,
    automatedCount: report.automatedCount,
    manualCount: report.manualCount,
    deferredCount: report.deferredCount,
    blockerCount: report.blockerCount,
    criticalBlockerCount: report.criticalBlockerCount,
    automationRatio: report.automationRatio,
    executionReadinessScore: report.executionReadinessScore,
    executionReadinessLevel: scoreToLevel(report.executionReadinessScore),
    executionConfidence: report.executionConfidence,
    overallScore: report.overallScore,
    executiveSummary: report.executiveSummary,
    createdAt: new Date(),
  };
}
