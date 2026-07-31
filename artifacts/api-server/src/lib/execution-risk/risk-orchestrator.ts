// ─────────────────────────────────────────────────────────────────────────────
// Build 026: Execution Risk Assessment Engine — Orchestrator
// Full run: reads execution assignments → builds risk profiles per assignment →
// maps risk dependencies → produces mitigations → computes safety score →
// assembles report → persists.
// Fail-open at every stage.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import {
  authorityRegistry,
  executionOrchestrationRegistry,
  executionAssignments as executionAssignmentsTable,
} from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";

import { assessOperationalRisk } from "./operational-risk-engine";
import { assessFinancialRisk } from "./financial-risk-engine";
import { assessSecurityRisk } from "./security-risk-engine";
import { assessPrivacyRisk } from "./privacy-risk-engine";
import { assessComplianceRisk } from "./compliance-risk-engine";
import { assessBusinessContinuityRisk } from "./business-continuity-risk-engine";
import { assessReversibility } from "./reversibility-engine";
import { produceMitigations } from "./mitigation-engine";
import { computeSafetyScore } from "./safety-score-engine";
import { assembleRiskReport, buildRiskSummary } from "./risk-report-engine";
import { persistRiskReport, getLatestRiskSummary } from "./risk-registry";
import type {
  ExecutionRiskProfile,
  ExecutionRiskSummary,
  RiskCategory,
  RiskCategoryAssessment,
  RiskDependency,
  RiskLevel,
} from "./types";

const logger = { info: console.info.bind(console), warn: console.warn.bind(console) };

// ── Risk dependency rules ──────────────────────────────────────────────────────
const RISK_DEPENDENCIES: RiskDependency[] = [
  { fromCategory: "security", toCategory: "compliance", dependencyReason: "Security breaches create compliance violations.", isCritical: true },
  { fromCategory: "security", toCategory: "privacy", dependencyReason: "Security failures expose private data.", isCritical: true },
  { fromCategory: "operational", toCategory: "business_continuity", dependencyReason: "Operational disruption threatens continuity.", isCritical: false },
  { fromCategory: "financial", toCategory: "operational", dependencyReason: "Financial overruns constrain operational capacity.", isCritical: false },
  { fromCategory: "compliance", toCategory: "financial", dependencyReason: "Compliance failures incur financial penalties.", isCritical: true },
  { fromCategory: "privacy", toCategory: "compliance", dependencyReason: "Privacy violations create compliance obligations.", isCritical: true },
];

function scoreToLevel(score: number): RiskLevel {
  if (score < 0.15) return "negligible";
  if (score < 0.30) return "low";
  if (score < 0.50) return "medium";
  if (score < 0.70) return "high";
  return "critical";
}

function buildProfile(params: {
  reportId: string;
  businessId: number;
  assignmentId: string;
  workPackageId?: string;
  packageTitle?: string;
  ownerType: string;
  executionClass: string;
  complexityLevel: string;
  businessCriticality: string;
}): ExecutionRiskProfile {
  const { reportId, businessId, assignmentId, workPackageId, packageTitle, ownerType, executionClass, complexityLevel, businessCriticality } = params;
  const input = { ownerType, executionClass, complexityLevel, businessCriticality, packageTitle };

  const opRisk = assessOperationalRisk(input);
  const finRisk = assessFinancialRisk(input);
  const secRisk = assessSecurityRisk(input);
  const privRisk = assessPrivacyRisk(input);
  const compRisk = assessComplianceRisk(input);
  const contRisk = assessBusinessContinuityRisk(input);
  const categories: RiskCategoryAssessment[] = [opRisk, finRisk, secRisk, privRisk, compRisk, contRisk];

  // Overall risk = weighted average (security + operational weighted higher)
  const overallRiskScore = Math.round((
    opRisk.riskScore * 0.20 +
    finRisk.riskScore * 0.15 +
    secRisk.riskScore * 0.22 +
    privRisk.riskScore * 0.18 +
    compRisk.riskScore * 0.15 +
    contRisk.riskScore * 0.10
  ) * 1000) / 1000;

  const rev = assessReversibility(input);

  return {
    id: randomUUID(),
    reportId,
    businessId,
    assignmentId,
    workPackageId,
    packageTitle,
    ownerType,
    executionClass,
    complexityLevel,
    businessCriticality,
    operationalRiskScore: opRisk.riskScore,
    financialRiskScore: finRisk.riskScore,
    securityRiskScore: secRisk.riskScore,
    privacyRiskScore: privRisk.riskScore,
    complianceRiskScore: compRisk.riskScore,
    continuityRiskScore: contRisk.riskScore,
    overallRiskScore,
    overallRiskLevel: scoreToLevel(overallRiskScore),
    categories,
    reversibilityLevel: rev.reversibilityLevel,
    rollbackComplexity: rev.rollbackComplexity,
    rollbackNote: rev.rollbackNote,
  };
}

export async function runRiskAssessment(params: {
  userId: number;
  businessId: number;
}): Promise<ExecutionRiskSummary | null> {
  const { userId, businessId } = params;
  const start = Date.now();

  try {
    // ── 1. Fetch execution orchestration registry ──────────────────────────────
    const eoRegRows = await db
      .select()
      .from(executionOrchestrationRegistry)
      .where(eq(executionOrchestrationRegistry.businessId, businessId))
      .limit(1);

    if (!eoRegRows[0]?.latestPlanId) {
      logger.warn({ businessId }, "Risk Assessment: no orchestration plan found — skipping");
      return null;
    }

    const orchestrationPlanId = eoRegRows[0].latestPlanId;
    const orchestrationReportId = eoRegRows[0].latestReportId ?? undefined;

    // ── 2. Fetch authority registry (for authorityReportId linkage) ────────────
    const authRegRows = await db
      .select()
      .from(authorityRegistry)
      .where(eq(authorityRegistry.businessId, businessId))
      .limit(1);
    const authorityReportId = authRegRows[0]?.latestReportId ?? undefined;

    // ── 3. Fetch execution assignments ─────────────────────────────────────────
    const assignmentRows = await db
      .select()
      .from(executionAssignmentsTable)
      .where(eq(executionAssignmentsTable.planId, orchestrationPlanId))
      .orderBy(asc(executionAssignmentsTable.sequencePosition));

    if (assignmentRows.length === 0) {
      logger.warn({ businessId }, "Risk Assessment: no assignments found — skipping");
      return null;
    }

    // ── 4. Build risk profiles ─────────────────────────────────────────────────
    const reportId = randomUUID();

    const profiles: ExecutionRiskProfile[] = assignmentRows.map((row) =>
      buildProfile({
        reportId,
        businessId,
        assignmentId: row.id,
        workPackageId: row.workPackageId ?? undefined,
        packageTitle: row.packageTitle ?? undefined,
        ownerType: row.ownerType,
        executionClass: row.executionClass,
        complexityLevel: row.complexityLevel ?? "medium",
        businessCriticality: row.businessCriticality ?? "medium",
      })
    );

    // ── 5. Produce mitigations ─────────────────────────────────────────────────
    const mitigationInputs = profiles.map((p) => ({
      reportId,
      businessId,
      profileId: p.id,
      ownerType: p.ownerType,
      executionClass: p.executionClass,
      complexityLevel: p.complexityLevel,
      businessCriticality: p.businessCriticality,
      overallRiskScore: p.overallRiskScore,
      overallRiskLevel: p.overallRiskLevel,
      reversibilityLevel: p.reversibilityLevel,
      highestRiskCategory: p.categories.reduce((a, b) => a.riskScore > b.riskScore ? a : b).category as RiskCategory,
    }));
    const mitigations = produceMitigations(mitigationInputs);

    // ── 6. Compute safety score ────────────────────────────────────────────────
    const safetyScoreRecord = computeSafetyScore({
      reportId,
      businessId,
      profiles,
      mitigationCount: mitigations.length,
    });

    // ── 7. Assemble report ─────────────────────────────────────────────────────
    const assessmentDurationMs = Date.now() - start;
    const report = assembleRiskReport({
      businessId,
      userId,
      authorityReportId,
      orchestrationReportId,
      profiles,
      mitigations,
      safetyScoreRecord,
      assessmentDurationMs,
    });
    // Override with pre-assigned reportId
    (report as { id: string }).id = reportId;
    safetyScoreRecord.reportId = reportId;

    // ── 8. Persist ─────────────────────────────────────────────────────────────
    await persistRiskReport(report, RISK_DEPENDENCIES);

    const summary = buildRiskSummary(report);
    logger.info({ businessId, profileCount: profiles.length, isSafeToExecute: report.isSafeToExecute }, "Risk Assessment: run complete");
    return summary;
  } catch (err) {
    logger.warn({ err, businessId }, "Risk Assessment: run failed (fail-open)");
    return null;
  }
}

export async function fetchRiskSummaryForEB(userId: number): Promise<ExecutionRiskSummary | null> {
  return getLatestRiskSummary(userId);
}
