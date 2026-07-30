// ─── Build 013: Learning Report Engine ───────────────────────────────────────
//
// Assembles the immutable Learning Report from cycle data.
// Pure: no DB access.

import { randomUUID } from "crypto";
import type {
  ExecutivePrinciple,
  LearningReport,
} from "./types";
import type { DiscoveredPattern } from "./pattern-discovery";
import type { ContradictionSummary } from "./contradiction-engine";

// ── Report ID ─────────────────────────────────────────────────────────────────

export function makeLearningReportId(): string {
  return `lr_${randomUUID().replace(/-/g, "").slice(0, 22)}`;
}

// ── Impact text ──────────────────────────────────────────────────────────────

function buildBusinessImpact(
  newPrinciples: ExecutivePrinciple[],
  deprecated: ExecutivePrinciple[],
  domains: string[],
): string {
  const parts: string[] = [];

  if (newPrinciples.length > 0) {
    const domainStr = [...new Set(newPrinciples.map((p) => p.businessDomain))].join(", ");
    parts.push(
      `${newPrinciples.length} new validated principle${newPrinciples.length !== 1 ? "s" : ""} discovered in: ${domainStr}.`,
    );
  }

  if (deprecated.length > 0) {
    parts.push(
      `${deprecated.length} principle${deprecated.length !== 1 ? "s" : ""} deprecated due to sustained contradiction — executive reasoning will no longer rely on them.`,
    );
  }

  if (domains.length > 0) {
    parts.push(`Learning active across ${domains.length} business domain${domains.length !== 1 ? "s" : ""}: ${domains.join(", ")}.`);
  }

  if (parts.length === 0) {
    return "No significant executive principle changes in this learning cycle.";
  }

  return parts.join(" ");
}

// ── Evidence summary ──────────────────────────────────────────────────────────

function buildEvidenceSummary(
  patterns: DiscoveredPattern[],
  contradictions: ContradictionSummary,
  casesAnalyzed: number,
  reportsAnalyzed: number,
): string {
  const lines: string[] = [
    `${casesAnalyzed} Executive Cases and ${reportsAnalyzed} Reflection Reports analyzed.`,
    `${patterns.length} behavioral patterns discovered.`,
  ];

  if (contradictions.totalFound > 0) {
    lines.push(
      `${contradictions.totalFound} contradiction${contradictions.totalFound !== 1 ? "s" : ""} detected across ${contradictions.principlesAffected.length} principle${contradictions.principlesAffected.length !== 1 ? "s" : ""} (avg severity: ${contradictions.averageSeverity.toFixed(2)}).`,
    );
  } else {
    lines.push("No contradictions detected in this cycle.");
  }

  return lines.join(" ");
}

// ── Confidence change map ─────────────────────────────────────────────────────

export function buildConfidenceChanges(
  before: Map<string, number>,
  after: ExecutivePrinciple[],
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const p of after) {
    const prev = before.get(p.id);
    if (prev !== undefined) {
      const delta = p.confidence - prev;
      if (Math.abs(delta) >= 0.01) result[p.id] = parseFloat(delta.toFixed(3));
    }
  }
  return result;
}

// ── Learning confidence ───────────────────────────────────────────────────────
// Scales with: number of cases analyzed, number of validated principles,
// and absence of contradictions.

function computeLearningConfidence(
  casesAnalyzed: number,
  principlesValidated: number,
  contradictionRate: number,
): number {
  const caseFactor = Math.min(1, casesAnalyzed / 20);
  const validationFactor = Math.min(1, principlesValidated / 5);
  const contradictionPenalty = contradictionRate * 0.3;
  return Math.max(0.1, Math.min(0.99, 0.3 + caseFactor * 0.4 + validationFactor * 0.3 - contradictionPenalty));
}

// ── Assemble ──────────────────────────────────────────────────────────────────

export function assembleLearningReport(opts: {
  userId: number | null;
  newPrinciples: ExecutivePrinciple[];
  strengthenedPrinciples: ExecutivePrinciple[];
  weakeningPrinciples: ExecutivePrinciple[];
  deprecatedPrinciples: ExecutivePrinciple[];
  patterns: DiscoveredPattern[];
  contradictions: ContradictionSummary;
  confidenceChanges: Record<string, number>;
  casesAnalyzed: number;
  reportsAnalyzed: number;
  principlesExtracted: number;
  cycleVersion: number;
}): LearningReport {
  const {
    userId, newPrinciples, strengthenedPrinciples, weakeningPrinciples,
    deprecatedPrinciples, patterns, contradictions, confidenceChanges,
    casesAnalyzed, reportsAnalyzed, principlesExtracted, cycleVersion,
  } = opts;

  const principlesValidated = newPrinciples.length;
  const contradictionRate =
    contradictions.totalFound > 0 && casesAnalyzed > 0
      ? contradictions.totalFound / casesAnalyzed
      : 0;

  const domains = [
    ...new Set([
      ...newPrinciples.map((p) => p.businessDomain),
      ...strengthenedPrinciples.map((p) => p.businessDomain),
    ]),
  ].filter(Boolean);

  return {
    id: makeLearningReportId(),
    userId,
    newPrincipleIds: newPrinciples.map((p) => p.id),
    strengthenedPrincipleIds: strengthenedPrinciples.map((p) => p.id),
    weakeningPrincipleIds: weakeningPrinciples.map((p) => p.id),
    deprecatedPrincipleIds: deprecatedPrinciples.map((p) => p.id),
    evidenceSummary: buildEvidenceSummary(patterns, contradictions, casesAnalyzed, reportsAnalyzed),
    confidenceChanges,
    businessImpact: buildBusinessImpact(newPrinciples, deprecatedPrinciples, domains),
    learningConfidence: computeLearningConfidence(casesAnalyzed, principlesValidated, contradictionRate),
    casesAnalyzed,
    reportsAnalyzed,
    patternsDiscovered: patterns.length,
    principlesExtracted,
    principlesValidated,
    cycleVersion,
    producedAt: new Date(),
    metadata: {
      contradictionSummary: contradictions,
      patternTypes: [...new Set(patterns.map((p) => p.patternType))],
      domainsActive: domains,
    },
  };
}
