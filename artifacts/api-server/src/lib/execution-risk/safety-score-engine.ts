// ─────────────────────────────────────────────────────────────────────────────
// Build 026: Execution Risk Assessment Engine — Safety Score Engine
// Aggregates risk profiles into a single Execution Safety Score.
// Safety score = 1 - risk; higher is safer.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import type {
  ExecutionSafetyScore,
  ExecutionRiskProfile,
  RiskCategory,
  RiskLevel,
} from "./types";

function scoreToLevel(score: number): RiskLevel {
  if (score < 0.15) return "negligible";
  if (score < 0.30) return "low";
  if (score < 0.50) return "medium";
  if (score < 0.70) return "high";
  return "critical";
}

function findHighestRiskCategory(profiles: ExecutionRiskProfile[]): { category: RiskCategory; riskScore: number } {
  const categoryTotals = new Map<RiskCategory, number>();

  for (const profile of profiles) {
    for (const cat of profile.categories) {
      categoryTotals.set(cat.category, Math.max(categoryTotals.get(cat.category) ?? 0, cat.riskScore));
    }
  }

  let highest: RiskCategory = "operational";
  let highestScore = 0;
  for (const [category, score] of categoryTotals) {
    if (score > highestScore) {
      highestScore = score;
      highest = category;
    }
  }
  return { category: highest, riskScore: highestScore };
}

function buildSafetyNarrative(
  safetyScore: number,
  overallRiskScore: number,
  isSafeToExecute: boolean,
  highestRiskCategory: RiskCategory,
  highestRiskLevel: RiskLevel,
  rollbackReadiness: number
): string {
  const pct = Math.round(safetyScore * 100);
  const riskPct = Math.round(overallRiskScore * 100);
  const rollbackPct = Math.round(rollbackReadiness * 100);
  const safeLabel = isSafeToExecute ? "SAFE TO EXECUTE" : "NOT RECOMMENDED";

  return (
    `Execution safety: ${safeLabel}. Safety score ${pct}% (risk ${riskPct}%). ` +
    `Highest risk: ${highestRiskCategory} (${highestRiskLevel}). ` +
    `Rollback readiness: ${rollbackPct}%. ` +
    (isSafeToExecute
      ? "Proceed with appropriate mitigations applied."
      : "Address high-risk items and apply all critical mitigations before execution.")
  );
}

export function computeSafetyScore(params: {
  reportId: string;
  businessId: number;
  profiles: ExecutionRiskProfile[];
  mitigationCount: number;
}): ExecutionSafetyScore {
  const { reportId, businessId, profiles, mitigationCount } = params;

  if (profiles.length === 0) {
    return {
      id: randomUUID(),
      reportId,
      businessId,
      safetyScore: 0.70,
      rollbackReadiness: 0.70,
      reversibilityScore: 0.70,
      mitigationCoverageScore: 0.80,
      overallRiskScore: 0.30,
      highestRiskCategory: "operational",
      highestRiskLevel: "low",
      isSafeToExecute: true,
      safetyNarrative: "No execution profiles to assess. Proceeding with caution.",
    };
  }

  // Average risk scores across profiles
  const avgOverallRisk = profiles.reduce((s, p) => s + p.overallRiskScore, 0) / profiles.length;
  const avgRollbackReadiness = profiles.reduce((s, p) => {
    // Map reversibility to a score
    const map: Record<string, number> = {
      fully_reversible: 0.95,
      rollback_available: 0.75,
      partially_reversible: 0.50,
      irreversible: 0.10,
    };
    return s + (map[p.reversibilityLevel] ?? 0.50);
  }, 0) / profiles.length;

  const avgReversibility = profiles.reduce((s, p) => {
    const map: Record<string, number> = { fully_reversible: 1.0, rollback_available: 0.75, partially_reversible: 0.45, irreversible: 0.05 };
    return s + (map[p.reversibilityLevel] ?? 0.45);
  }, 0) / profiles.length;

  // Mitigation coverage: ratio of mitigations to profiles (capped at 1)
  const mitigationCoverageScore = Math.min(1, mitigationCount / Math.max(1, profiles.length));

  // Safety = 1 - risk, weighted
  const safetyScore = Math.min(1, Math.max(0,
    (1 - avgOverallRisk) * 0.50 +
    avgRollbackReadiness * 0.25 +
    avgReversibility * 0.15 +
    mitigationCoverageScore * 0.10
  ));

  const { category: highestRiskCategory } = findHighestRiskCategory(profiles);
  const highestRiskLevel = scoreToLevel(Math.max(...profiles.map((p) => p.overallRiskScore)));

  // Safe to execute if overall risk < 0.65 and no profile is critical
  const hasCriticalProfile = profiles.some((p) => p.overallRiskLevel === "critical");
  const isSafeToExecute = avgOverallRisk < 0.65 && !hasCriticalProfile;

  const narrative = buildSafetyNarrative(
    Math.round(safetyScore * 1000) / 1000,
    Math.round(avgOverallRisk * 1000) / 1000,
    isSafeToExecute,
    highestRiskCategory,
    highestRiskLevel,
    Math.round(avgRollbackReadiness * 1000) / 1000
  );

  return {
    id: randomUUID(),
    reportId,
    businessId,
    safetyScore: Math.round(safetyScore * 1000) / 1000,
    rollbackReadiness: Math.round(avgRollbackReadiness * 1000) / 1000,
    reversibilityScore: Math.round(avgReversibility * 1000) / 1000,
    mitigationCoverageScore: Math.round(mitigationCoverageScore * 1000) / 1000,
    overallRiskScore: Math.round(avgOverallRisk * 1000) / 1000,
    highestRiskCategory,
    highestRiskLevel,
    isSafeToExecute,
    safetyNarrative: narrative,
  };
}
