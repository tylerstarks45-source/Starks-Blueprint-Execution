// ─── Build 013: Contradiction Engine ─────────────────────────────────────────
//
// Detects contradictions between existing principles and new evidence.
// Monitors: direct contradiction, partial contradiction, domain drift,
// declining confidence, and expired assumptions.
// Pure: no DB access (receives data, returns contradiction records).

import { randomUUID } from "crypto";
import type {
  ContradictionType,
  ExecutivePrinciple,
  PrincipleContradiction,
} from "./types";
import type { CaseForMining, ReportForMining } from "./pattern-discovery";

// ── CONTRADICTION THRESHOLD ───────────────────────────────────────────────────
// A principle is "contradicted" by a case when:
// - The case's outcome is opposite to the principle's dominant outcome (direct)
// - The case is in the same domain but with very different quality (partial)
// - The case is in a domain not represented in origin cases (domain_drift)

function makeid(): string {
  return `cont_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

// ── Direct contradiction ──────────────────────────────────────────────────────
// A "repeated_success" principle is contradicted by a failed case in same domain.
// A "repeated_failure" principle is contradicted by a completed case in same domain.

export function checkDirectContradiction(
  principle: ExecutivePrinciple,
  ec: CaseForMining,
): PrincipleContradiction | null {
  if ((ec.businessDomain ?? "general") !== principle.businessDomain) return null;
  const caseOutcome = ec.completionStatus ?? "unknown";

  const isSuccessPrinciple =
    principle.patternType === "repeated_success" || principle.successRate > 0.75;
  const isFailurePrinciple =
    principle.patternType === "repeated_failure" || principle.failureRate > 0.75;

  let shouldContradict = false;
  if (isSuccessPrinciple && caseOutcome === "failed") shouldContradict = true;
  if (isFailurePrinciple && caseOutcome === "completed") shouldContradict = true;

  if (!shouldContradict) return null;

  const severity = isSuccessPrinciple ? 0.75 : 0.65;
  return {
    id: makeid(),
    principleId: principle.id,
    userId: principle.userId,
    contradictingCaseId: ec.id,
    contradictingReportId: null,
    contradictionType: "direct",
    severity,
    description: `Case ${ec.id} produced ${caseOutcome} outcome in ${ec.businessDomain} domain, contradicting the ${principle.patternType} principle.`,
    confidenceImpact: -(severity * 0.12),
    resolved: false,
    resolvedAt: null,
    recordedAt: new Date(),
    payload: {
      caseOutcome,
      principleDomain: principle.businessDomain,
      principleSuccessRate: principle.successRate,
    },
  };
}

// ── Partial contradiction ─────────────────────────────────────────────────────
// Same domain, same category, but quality score diverges significantly from
// principle's expected quality (averageQualityScore proxy).

export function checkPartialContradiction(
  principle: ExecutivePrinciple,
  ec: CaseForMining,
  report: ReportForMining | undefined,
): PrincipleContradiction | null {
  if (!report) return null;
  if ((ec.businessDomain ?? "general") !== principle.businessDomain) return null;

  const expectedQuality = principle.averageQualityScore ?? principle.confidence;
  const actualQuality = report.overallQualityScore;
  const divergence = Math.abs(expectedQuality - actualQuality);

  // Only flag if divergence is substantial (>0.35) AND actual is lower
  if (divergence < 0.35 || actualQuality >= expectedQuality) return null;

  const severity = Math.min(0.9, divergence * 1.5);
  return {
    id: makeid(),
    principleId: principle.id,
    userId: principle.userId,
    contradictingCaseId: ec.id,
    contradictingReportId: report.id,
    contradictionType: "partial",
    severity,
    description: `Case quality ${actualQuality.toFixed(2)} significantly below expected ${expectedQuality.toFixed(2)} for principle "${principle.title}" in ${principle.businessDomain} domain.`,
    confidenceImpact: -(severity * 0.07),
    resolved: false,
    resolvedAt: null,
    recordedAt: new Date(),
    payload: { expectedQuality, actualQuality, divergence },
  };
}

// ── Domain drift contradiction ────────────────────────────────────────────────
// Principle was learned in domain A; a case in domain B with opposite outcome
// applied the same strategy. This indicates domain over-generalization.

export function checkDomainDrift(
  principle: ExecutivePrinciple,
  ec: CaseForMining,
): PrincipleContradiction | null {
  // Only relevant when the principle claims high generality
  if (principle.generality < 0.6) return null;
  const caseDomain = ec.businessDomain ?? "general";
  if (caseDomain === principle.businessDomain) return null;

  const isOppositeOutcome =
    (principle.successRate > 0.7 && ec.completionStatus === "failed") ||
    (principle.failureRate > 0.7 && ec.completionStatus === "completed");

  if (!isOppositeOutcome) return null;

  return {
    id: makeid(),
    principleId: principle.id,
    userId: principle.userId,
    contradictingCaseId: ec.id,
    contradictingReportId: null,
    contradictionType: "domain_drift",
    severity: 0.45,
    description: `Principle learned in "${principle.businessDomain}" produced opposite outcome in "${caseDomain}" domain — potential over-generalization.`,
    confidenceImpact: -0.04,
    resolved: false,
    resolvedAt: null,
    recordedAt: new Date(),
    payload: { principleDomain: principle.businessDomain, caseDomain, caseOutcome: ec.completionStatus },
  };
}

// ── Declining confidence / assumption expiry ──────────────────────────────────
// If a principle has not been confirmed in a long time (>30 processed cases),
// flag assumption as potentially expired.

export function checkAssumptionExpiry(
  principle: ExecutivePrinciple,
  totalCasesSinceValidation: number,
): PrincipleContradiction | null {
  if (principle.status !== "validated") return null;
  if (totalCasesSinceValidation < 30) return null;
  if (principle.timesConfirmed === 0 && totalCasesSinceValidation >= 30) {
    return {
      id: makeid(),
      principleId: principle.id,
      userId: principle.userId,
      contradictingCaseId: null,
      contradictingReportId: null,
      contradictionType: "assumption_expired",
      severity: 0.35,
      description: `Principle "${principle.title}" has not been confirmed in ${totalCasesSinceValidation} recent cases — assumption may be stale.`,
      confidenceImpact: -0.05,
      resolved: false,
      resolvedAt: null,
      recordedAt: new Date(),
      payload: { totalCasesSinceValidation },
    };
  }
  return null;
}

// ── Run full contradiction scan against a batch of new cases ──────────────────

export function runContradictionScan(
  existingPrinciples: ExecutivePrinciple[],
  newCases: CaseForMining[],
  reportMap: Map<string, ReportForMining>,
  casesSinceValidationMap: Map<string, number>,
): PrincipleContradiction[] {
  const contradictions: PrincipleContradiction[] = [];

  for (const principle of existingPrinciples) {
    if (principle.status === "archived") continue;

    for (const ec of newCases) {
      const report = reportMap.get(ec.id);
      const direct = checkDirectContradiction(principle, ec);
      if (direct) contradictions.push(direct);

      const partial = checkPartialContradiction(principle, ec, report);
      if (partial) contradictions.push(partial);

      const drift = checkDomainDrift(principle, ec);
      if (drift) contradictions.push(drift);
    }

    const totalSince = casesSinceValidationMap.get(principle.id) ?? 0;
    const expiry = checkAssumptionExpiry(principle, totalSince);
    if (expiry) contradictions.push(expiry);
  }

  return contradictions;
}

// ── Contradiction summary for report ─────────────────────────────────────────

export interface ContradictionSummary {
  totalFound: number;
  byType: Record<ContradictionType, number>;
  principlesAffected: string[];
  averageSeverity: number;
}

export function summarizeContradictions(contradictions: PrincipleContradiction[]): ContradictionSummary {
  const byType: Record<ContradictionType, number> = {
    direct: 0,
    partial: 0,
    domain_drift: 0,
    assumption_expired: 0,
    declining_confidence: 0,
  };
  let totalSeverity = 0;
  const principlesAffected = new Set<string>();
  for (const c of contradictions) {
    byType[c.contradictionType] = (byType[c.contradictionType] ?? 0) + 1;
    totalSeverity += c.severity;
    principlesAffected.add(c.principleId);
  }
  return {
    totalFound: contradictions.length,
    byType,
    principlesAffected: [...principlesAffected],
    averageSeverity: contradictions.length > 0 ? totalSeverity / contradictions.length : 0,
  };
}

// Convenience: compute averageQualityScore from principle metadata (needed in contradiction checks)
declare module "./types" {
  interface ExecutivePrinciple {
    averageQualityScore?: number;
  }
}
