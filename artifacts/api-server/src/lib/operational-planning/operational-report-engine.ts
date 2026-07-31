// ─────────────────────────────────────────────────────────────────────────────
// Build 023: Operational Planning Engine — Operational Report Engine
// Assembles immutable operational reports and EB summaries.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type { OperationalReport, OperationalPlan, OperationalEvaluation, OperationalSummary, OperationalReadinessLevel } from "./types";

function scoreToReadinessLevel(score: number): OperationalReadinessLevel {
  if (score >= 0.85) return "optimising";
  if (score >= 0.70) return "managed";
  if (score >= 0.55) return "defined";
  if (score >= 0.35) return "developing";
  return "not_ready";
}

function buildExecutiveSummary(plan: OperationalPlan, evaluation: OperationalEvaluation): string {
  const readinessLevel = scoreToReadinessLevel(plan.executionReadinessScore);
  const confPct = Math.round(plan.executionConfidence * 100);
  const overallPct = Math.round(evaluation.overallScore * 100);
  const critDepNote =
    plan.criticalDependencyCount > 0
      ? ` ${plan.criticalDependencyCount} critical execution dependencies require early resolution.`
      : " No critical execution dependencies identified.";

  return (
    `Operational plan across ${plan.phaseCount} phases with ${plan.workPackageCount} outcome-oriented work packages ` +
    `sequenced across ${plan.sequenceCount} execution positions. ` +
    `Execution readiness: ${readinessLevel} (${Math.round(plan.executionReadinessScore * 100)}%), ` +
    `confidence: ${confPct}%, overall score: ${overallPct}%.` +
    critDepNote +
    ` ${evaluation.narrative}`
  );
}

export function assembleOperationalReport(params: {
  businessId: number;
  userId?: number;
  capabilityReportId?: string;
  plan: OperationalPlan;
  evaluation: OperationalEvaluation;
  operationalDurationMs: number;
}): OperationalReport {
  const { businessId, userId, capabilityReportId, plan, evaluation, operationalDurationMs } = params;

  const reportId = randomUUID();
  const executiveSummary = buildExecutiveSummary(plan, evaluation);

  return {
    id: reportId,
    businessId,
    userId,
    capabilityReportId,
    primaryPlanId: plan.id,
    phaseCount: plan.phaseCount,
    workPackageCount: plan.workPackageCount,
    dependencyCount: plan.dependencyCount,
    criticalDependencyCount: plan.criticalDependencyCount,
    sequenceCount: plan.sequenceCount,
    executionReadinessScore: plan.executionReadinessScore,
    executionConfidence: plan.executionConfidence,
    overallScore: evaluation.overallScore,
    executiveSummary,
    operationalDurationMs,
    plan,
    evaluation,
  };
}

export function buildOperationalSummary(report: OperationalReport): OperationalSummary {
  return {
    reportId: report.id,
    planId: report.plan.id,
    businessId: report.businessId,
    phaseCount: report.phaseCount,
    workPackageCount: report.workPackageCount,
    criticalDependencyCount: report.criticalDependencyCount,
    executionReadinessScore: report.executionReadinessScore,
    executionReadinessLevel: scoreToReadinessLevel(report.executionReadinessScore),
    executionConfidence: report.executionConfidence,
    overallScore: report.overallScore,
    executiveSummary: report.executiveSummary,
    createdAt: new Date(),
  };
}
