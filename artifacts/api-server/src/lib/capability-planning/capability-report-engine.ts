// ─────────────────────────────────────────────────────────────────────────────
// Build 022: Capability Planning Engine — Report Engine
// Assembles full CapabilityReport and compact CapabilitySummary for EB advisory.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type { CapabilityReport, CapabilitySummary, CapabilityPlan, CapabilityEvaluation, ReadinessLevel } from "./types";

function readinessLevelFromScore(s: number): ReadinessLevel {
  if (s >= 0.80) return "optimising";
  if (s >= 0.60) return "managed";
  if (s >= 0.40) return "defined";
  if (s >= 0.20) return "developing";
  return "not_ready";
}

export function assembleCapabilityReport(params: {
  businessId: number;
  userId?: number;
  planningReportId?: string;
  plan: CapabilityPlan;
  evaluation: CapabilityEvaluation;
  capabilityDurationMs: number;
}): CapabilityReport {
  const { businessId, userId, planningReportId, plan, evaluation, capabilityDurationMs } = params;

  const reportId = randomUUID();

  const readinessLabel = readinessLevelFromScore(plan.overallReadinessScore);
  const readinessPct = Math.round(plan.overallReadinessScore * 100);
  const confPct = Math.round(evaluation.confidenceScore * 100);
  const gapNote =
    plan.criticalGapCount > 0
      ? ` ${plan.criticalGapCount} critical gaps require priority investment before execution is viable.`
      : plan.missingCapabilityCount > 0
      ? ` ${plan.missingCapabilityCount} capabilities must be built from scratch.`
      : " No critical capability gaps identified.";

  const executiveSummary =
    `Capability assessment across ${plan.domainCount} domains, ${plan.requirementCount} requirements, ${plan.gapCount} gaps. ` +
    `Overall capability readiness: ${readinessLabel} (${readinessPct}%), confidence: ${confPct}%.` +
    gapNote;

  return {
    id: reportId,
    businessId,
    userId,
    planningReportId,
    primaryPlanId: plan.id,
    domainCount: plan.domainCount,
    requirementCount: plan.requirementCount,
    gapCount: plan.gapCount,
    criticalGapCount: plan.criticalGapCount,
    missingCapabilityCount: plan.missingCapabilityCount,
    dependencyCount: plan.dependencyCount,
    overallReadinessScore: plan.overallReadinessScore,
    overallMaturityScore: plan.overallMaturityScore,
    overallConfidence: evaluation.confidenceScore,
    coverageScore: evaluation.coverageScore,
    completenessScore: evaluation.completenessScore,
    executiveSummary,
    capabilityDurationMs,
    plan,
    evaluation,
  };
}

export function buildCapabilitySummary(report: CapabilityReport): CapabilitySummary {
  // Top 3 domains with critical/high gaps
  const criticalDomains = (report.plan.domains ?? [])
    .filter((d) => d.criticalGapCount > 0)
    .sort((a, b) => b.criticalGapCount - a.criticalGapCount)
    .slice(0, 3)
    .map((d) => d.domainName);

  // Highest risk gap — first critical gap from most impactful domain
  let highestRiskGap: string | undefined;
  for (const domain of report.plan.domains ?? []) {
    for (const req of domain.requirements ?? []) {
      for (const gap of req.gaps ?? []) {
        if (gap.severity === "critical") {
          highestRiskGap = gap.gapTitle;
          break;
        }
      }
      if (highestRiskGap) break;
    }
    if (highestRiskGap) break;
  }

  return {
    reportId: report.id,
    planId: report.primaryPlanId,
    businessId: report.businessId,
    domainCount: report.domainCount,
    requirementCount: report.requirementCount,
    gapCount: report.gapCount,
    criticalGapCount: report.criticalGapCount,
    missingCapabilityCount: report.missingCapabilityCount,
    overallReadinessScore: report.overallReadinessScore,
    overallReadinessLevel: readinessLevelFromScore(report.overallReadinessScore),
    overallMaturityScore: report.overallMaturityScore,
    overallConfidence: report.overallConfidence,
    highestRiskGap,
    topCriticalDomains: criticalDomains,
    coverageScore: report.coverageScore,
    executiveSummary: report.executiveSummary,
    createdAt: new Date(),
  };
}
