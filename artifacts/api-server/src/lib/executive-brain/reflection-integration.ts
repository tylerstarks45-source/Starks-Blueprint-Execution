// ─── Executive Brain ↔ Reflection Integration (Build 012) ────────────────────
//
// Bridges the Executive Brain to the Reflection Engine.
// Three functions:
//   fetchReflectionSummary  — lightweight summary for the context note
//   ensureCaseForCycle      — idempotent: opens/updates a case for the current
//                             brain cycle (never closes; closure happens externally)
//   buildReflectionAdvisory — one-line advisory string for the context note
//
// Reflection NEVER changes execution, plans, goals, or memory.
// This integration layer is read-mostly + case-open-only.

import { logger } from "../logger";
import {
  openCase,
  getCaseByExecution,
  listCases,
  listReports,
  inferBusinessDomain,
  inferStrategicCategory,
} from "../executive-reflection/reflection-services";
import type { ReflectionSummary, ExecutiveCase } from "../executive-reflection/types";

// ── Fetch reflection summary ──────────────────────────────────────────────────

export async function fetchReflectionSummary(
  userId: number,
): Promise<ReflectionSummary | null> {
  try {
    const [recentCases, recentReports] = await Promise.all([
      listCases({ userId, limit: 10 }),
      listReports({ userId, limit: 5 }),
    ]);

    const completedCases = recentCases.filter((c) => c.completionStatus === "completed").length;
    const failedCases    = recentCases.filter((c) => c.completionStatus === "failed").length;
    const avgQuality = recentReports.length > 0
      ? recentReports.reduce((s, r) => s + r.overallQualityScore, 0) / recentReports.length
      : 0;

    const latestCase   = recentCases[0] ?? null;
    const latestReport = recentReports[0] ?? null;

    const parts: string[] = [];
    if (recentCases.length > 0)  parts.push(`${recentCases.length} recent case(s)`);
    if (completedCases > 0)      parts.push(`${completedCases} completed`);
    if (failedCases > 0)         parts.push(`${failedCases} failed`);
    if (recentReports.length > 0) parts.push(`avg quality: ${avgQuality.toFixed(2)}`);

    return {
      recentCaseCount: recentCases.length,
      completedCaseCount: completedCases,
      failedCaseCount: failedCases,
      averageQualityScore: Math.round(avgQuality * 1000) / 1000,
      latestCaseId: latestCase?.id ?? null,
      latestReportId: latestReport?.id ?? null,
      summaryText: parts.join(" | ") || "No reflection cases yet",
    };
  } catch (err) {
    logger.warn({ err }, "Reflection: summary fetch failed (non-fatal)");
    return null;
  }
}

// ── Ensure case for the current brain cycle ───────────────────────────────────

export async function ensureCaseForCycle(opts: {
  userId: number;
  rootRequest?: string;
  primaryGoalId?: string;
  primaryPlanId?: string;
  primaryExecutionId?: string;
  primaryChainId?: string;
}): Promise<ExecutiveCase | null> {
  try {
    // If there's already an open case for this execution, return it
    if (opts.primaryExecutionId) {
      const existing = await getCaseByExecution(opts.primaryExecutionId, opts.userId);
      if (existing) return existing;
    }

    // Open a new case
    const ec = await openCase({
      userId: opts.userId,
      rootRequest: opts.rootRequest,
      businessDomain: inferBusinessDomain(opts.rootRequest) ?? undefined,
      strategicCategory: inferStrategicCategory(opts.rootRequest) ?? undefined,
      primaryGoalId: opts.primaryGoalId,
      primaryPlanId: opts.primaryPlanId,
      primaryExecutionId: opts.primaryExecutionId,
      primaryChainId: opts.primaryChainId,
    });
    return ec;
  } catch (err) {
    logger.warn({ err }, "Reflection: case open failed (non-fatal)");
    return null;
  }
}

// ── Advisory ───────────────────────────────────────────────────────────────────

export function buildReflectionAdvisory(summary: ReflectionSummary | null): string | null {
  if (!summary || summary.recentCaseCount === 0) return null;
  const clip = (s: string, max: number): string =>
    s.length > max ? `${s.slice(0, max - 1)}…` : s;
  return clip(`Executive reflection: ${summary.summaryText}`, 500);
}
