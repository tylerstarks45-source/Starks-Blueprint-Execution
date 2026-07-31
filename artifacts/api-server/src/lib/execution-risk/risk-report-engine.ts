// ─────────────────────────────────────────────────────────────────────────────
// Build 026: Execution Risk Assessment Engine — Risk Report Engine
// Assembles the immutable execution risk report and compact EB summary.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type {
  ExecutionRiskReport,
  ExecutionRiskSummary,
  ExecutionRiskProfile,
  RiskMitigation,
  ExecutionSafetyScore,
  RiskCategory,
  RiskLevel,
} from "./types";

export function assembleRiskReport(params: {
  businessId: number;
  userId?: number;
  authorityReportId?: string;
  orchestrationReportId?: string;
  profiles: ExecutionRiskProfile[];
  mitigations: RiskMitigation[];
  safetyScoreRecord: ExecutionSafetyScore;
  assessmentDurationMs: number;
}): ExecutionRiskReport {
  const { businessId, userId, authorityReportId, orchestrationReportId, profiles, mitigations, safetyScoreRecord, assessmentDurationMs } = params;

  const id = safetyScoreRecord.reportId;
  const overallRiskScore = safetyScoreRecord.overallRiskScore;
  const overallRiskLevel = safetyScoreRecord.highestRiskLevel;
  const highestRiskCategory = safetyScoreRecord.highestRiskCategory;
  const highestRiskLevel = safetyScoreRecord.highestRiskLevel;

  const executiveSummary = buildExecutiveSummary({
    profileCount: profiles.length,
    mitigationCount: mitigations.length,
    overallRiskScore,
    overallRiskLevel,
    safetyScore: safetyScoreRecord.safetyScore,
    rollbackReadiness: safetyScoreRecord.rollbackReadiness,
    highestRiskCategory,
    isSafeToExecute: safetyScoreRecord.isSafeToExecute,
  });

  return {
    id,
    businessId,
    userId,
    authorityReportId,
    orchestrationReportId,
    profileCount: profiles.length,
    mitigationCount: mitigations.length,
    overallRiskScore,
    overallRiskLevel,
    safetyScore: safetyScoreRecord.safetyScore,
    rollbackReadiness: safetyScoreRecord.rollbackReadiness,
    highestRiskCategory,
    highestRiskLevel,
    isSafeToExecute: safetyScoreRecord.isSafeToExecute,
    executiveSummary,
    assessmentDurationMs,
    profiles,
    mitigations,
    safetyScoreRecord,
  };
}

function buildExecutiveSummary(params: {
  profileCount: number;
  mitigationCount: number;
  overallRiskScore: number;
  overallRiskLevel: RiskLevel;
  safetyScore: number;
  rollbackReadiness: number;
  highestRiskCategory: RiskCategory;
  isSafeToExecute: boolean;
}): string {
  const {
    profileCount, mitigationCount, overallRiskScore, overallRiskLevel,
    safetyScore, rollbackReadiness, highestRiskCategory, isSafeToExecute,
  } = params;

  const riskPct = Math.round(overallRiskScore * 100);
  const safetyPct = Math.round(safetyScore * 100);
  const rollbackPct = Math.round(rollbackReadiness * 100);
  const verdict = isSafeToExecute ? "SAFE TO EXECUTE" : "EXECUTION NOT RECOMMENDED";

  return (
    `Execution Risk Assessment: ${verdict}. ` +
    `${profileCount} assignment(s) assessed. Overall risk: ${overallRiskLevel} (${riskPct}%). ` +
    `Safety score: ${safetyPct}%. Rollback readiness: ${rollbackPct}%. ` +
    `Highest risk category: ${highestRiskCategory}. ` +
    `${mitigationCount} mitigation action(s) identified.`
  );
}

export function buildRiskSummary(report: ExecutionRiskReport): ExecutionRiskSummary {
  return {
    reportId: report.id,
    businessId: report.businessId,
    profileCount: report.profileCount,
    mitigationCount: report.mitigationCount,
    overallRiskScore: report.overallRiskScore,
    overallRiskLevel: report.overallRiskLevel,
    safetyScore: report.safetyScore,
    rollbackReadiness: report.rollbackReadiness,
    highestRiskCategory: report.highestRiskCategory,
    highestRiskLevel: report.highestRiskLevel,
    isSafeToExecute: report.isSafeToExecute,
    executiveSummary: report.executiveSummary,
    createdAt: new Date(),
  };
}
