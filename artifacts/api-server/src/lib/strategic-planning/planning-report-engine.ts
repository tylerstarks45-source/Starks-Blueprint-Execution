// ─────────────────────────────────────────────────────────────────────────────
// Build 021: Strategic Planning Engine — Planning Report Engine
// Assembles full PlanningReport and compact PlanningSummary for EB advisory.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type {
  PlanningReport,
  PlanningSummary,
  StrategicPlan,
  ReadinessProfile,
  PlanningEvaluation,
  SeverityLevel,
} from "./types";

function isHighSeverity(s: string): s is SeverityLevel {
  return s === "high" || s === "critical";
}

export function assemblePlanningReport(params: {
  businessId: number;
  userId?: number;
  strategyReportId?: string;
  plan: StrategicPlan;
  readiness: ReadinessProfile;
  evaluation: PlanningEvaluation;
  planningDurationMs: number;
}): PlanningReport {
  const {
    businessId, userId, strategyReportId, plan, readiness, evaluation, planningDurationMs,
  } = params;

  const reportId = randomUUID();

  const programCountStr = `${plan.programCount} programme${plan.programCount !== 1 ? "s" : ""}`;
  const initiativeCountStr = `${plan.initiativeCount} initiative${plan.initiativeCount !== 1 ? "s" : ""}`;
  const milestoneCountStr = `${plan.milestoneCount} milestone${plan.milestoneCount !== 1 ? "s" : ""}`;
  const readinessNote =
    readiness.overallLevel === "ready" || readiness.overallLevel === "high"
      ? "Organisation is well-positioned to begin programme execution."
      : readiness.overallLevel === "medium"
      ? "Moderate readiness — targeted preparation required before programme launch."
      : "Readiness gaps require resolution before execution is viable.";

  const executiveSummary =
    `Strategic plan organised into ${programCountStr}, ${initiativeCountStr}, and ${milestoneCountStr}. ` +
    `Overall planning confidence: ${Math.round((evaluation.confidenceScore ?? 0) * 100)}%. ` +
    `Readiness: ${readiness.overallLevel} (${Math.round(readiness.overall * 100)}%). ` +
    readinessNote;

  return {
    id: reportId,
    businessId,
    userId,
    strategyReportId,
    primaryPlanId: plan.id,
    programCount: plan.programCount,
    initiativeCount: plan.initiativeCount,
    milestoneCount: plan.milestoneCount,
    dependencyCount: plan.dependencyCount,
    sequenceCount: plan.sequences.length,
    overallReadinessScore: readiness.overall,
    overallConfidence: evaluation.confidenceScore,
    completenessScore: evaluation.completenessScore,
    feasibilityScore: evaluation.feasibilityScore,
    alignmentScore: evaluation.alignmentScore,
    executiveSummary,
    planningDurationMs,
    plan,
    readiness,
    evaluation,
  };
}

export function buildPlanningSummary(report: PlanningReport): PlanningSummary {
  const topProgramNames = (report.plan.programs ?? [])
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3)
    .map((p) => p.programName);

  const criticalDependencyCount = (report.plan.dependencies ?? []).filter((d) =>
    isHighSeverity(d.severity),
  ).length;

  return {
    reportId: report.id,
    planId: report.primaryPlanId,
    businessId: report.businessId,
    programCount: report.programCount,
    initiativeCount: report.initiativeCount,
    milestoneCount: report.milestoneCount,
    overallReadinessScore: report.overallReadinessScore,
    overallReadinessLevel: report.readiness.overallLevel,
    overallConfidence: report.overallConfidence,
    topProgramNames,
    criticalDependencyCount,
    feasibilityScore: report.feasibilityScore,
    executiveSummary: report.executiveSummary,
    createdAt: new Date(),
  };
}
