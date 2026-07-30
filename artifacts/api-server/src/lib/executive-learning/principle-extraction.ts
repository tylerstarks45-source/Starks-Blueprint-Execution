// ─── Build 013: Principle Extraction Engine ───────────────────────────────────
//
// Converts DiscoveredPatterns into candidate ExecutivePrinciples.
// Reproducible — same pattern always produces same principle shape.
// Pure: no DB access.

import { randomUUID } from "crypto";
import type { DiscoveredPattern, ExecutivePrinciple, PrincipleCategory, PrincipleStatus } from "./types";

// ── Category inference from pattern ──────────────────────────────────────────

function inferCategory(pattern: DiscoveredPattern): PrincipleCategory {
  switch (pattern.patternType) {
    case "repeated_planning_strategy":
      return "planning";
    case "repeated_execution_path":
    case "repeated_bottleneck":
      return "execution";
    case "repeated_judgment_outcome":
      return "judgment";
    case "repeated_context_shift":
      return "goal_management";
    case "repeated_success":
    case "repeated_failure":
    case "repeated_business_outcome":
      return "operations";
    default:
      return "general";
  }
}

// ── Generality: how broadly applicable is this principle? ────────────────────
// Measured by number of distinct domains it spans vs. total known domains.
const KNOWN_DOMAIN_COUNT = 11;

function computeGenerality(pattern: DiscoveredPattern): number {
  return Math.min(1, pattern.domains.length / KNOWN_DOMAIN_COUNT + 0.2);
}

// ── Novelty: higher when pattern frequency is low (not yet well-known) ────────

function computeNovelty(frequency: number): number {
  if (frequency <= 2) return 0.85;
  if (frequency <= 5) return 0.65;
  if (frequency <= 10) return 0.45;
  return 0.30;
}

// ── Applicability: scales with domain breadth × confidence ───────────────────

function computeApplicability(pattern: DiscoveredPattern): number {
  return Math.min(1, pattern.confidence * 0.6 + (pattern.domains.length / 5) * 0.4);
}

// ── Reliability: initial estimate from success/failure balance ────────────────

function computeReliability(pattern: DiscoveredPattern): number {
  const balanced = 1 - Math.abs(pattern.successRate - pattern.failureRate);
  return Math.min(1, pattern.confidence * 0.5 + balanced * 0.3 + (pattern.frequency / 20) * 0.2);
}

// ── Principal text synthesis ──────────────────────────────────────────────────

function synthesizeDescription(pattern: DiscoveredPattern): string {
  const domainStr = pattern.domains.join(" and ");
  const freq = pattern.frequency;
  switch (pattern.patternType) {
    case "repeated_success":
      return `In the ${domainStr} domain, high-quality outcomes repeat reliably (${freq} observed cases with avg quality ${pattern.averageQualityScore.toFixed(2)}). Approaches that produce quality ≥ 0.65 in this domain are consistently successful.`;
    case "repeated_failure":
      return `The ${domainStr} domain shows a recurring failure pattern (${freq} failed cases). Repeating the same approach in this domain without adjustment is likely to fail.`;
    case "repeated_bottleneck":
      return `Execution bottlenecks recur in ${domainStr} (${freq} cases with low execution quality). Addressing execution constraints before launching tasks in this domain improves completion rates.`;
    case "repeated_execution_path":
      return `The combination of ${domainStr} domain with ${pattern.strategicCategories.join("/")} strategy is a frequently traveled execution path (${freq} cases). The dominant outcome is ${pattern.outcome}.`;
    case "repeated_planning_strategy":
      return `The ${pattern.strategicCategories.join("/")} planning strategy leads to ${pattern.outcome} in ${freq} observed cases. Average quality: ${pattern.averageQualityScore.toFixed(2)}.`;
    case "repeated_judgment_outcome":
      return `Decision quality in ${domainStr} is consistently ${pattern.outcome.includes("high") ? "strong" : "weak"} (${freq} cases, avg score ${pattern.averageQualityScore.toFixed(2)}). This reflects a repeatable judgment pattern in this domain.`;
    case "repeated_context_shift":
      return `Goal alignment drift occurs repeatedly in ${domainStr} (${freq} cases) despite active plans. Mid-execution context changes are a structural risk in this domain.`;
    case "repeated_business_outcome":
    default:
      return `In the ${domainStr} domain, the ${pattern.outcome} outcome repeats across ${freq} cases with average quality ${pattern.averageQualityScore.toFixed(2)}. This represents a reliable behavioral pattern in this business context.`;
  }
}

// ── Main extraction ───────────────────────────────────────────────────────────

export function extractPrinciple(
  pattern: DiscoveredPattern,
  userId: number,
  existingIds: Set<string>,
): ExecutivePrinciple {
  // Generate deterministic-ish id based on pattern fingerprint
  const fingerprint = `${userId}::${pattern.patternType}::${pattern.domains.sort().join(",")}::${pattern.outcome}`;
  // We use randomUUID here because principles are genuinely new objects; the fingerprint
  // is used for deduplication in the registry layer, not the id.
  const id = `ep_${randomUUID().replace(/-/g, "").slice(0, 24)}`;

  const now = new Date();

  return {
    id,
    userId,
    title: pattern.title,
    description: synthesizeDescription(pattern),
    category: inferCategory(pattern),
    businessDomain: pattern.domains[0] ?? "general",
    strategicCategory: pattern.strategicCategories[0] ?? "general",
    originCases: pattern.supportingCaseIds,
    supportingEvidence: pattern.successRate > 0.5 ? pattern.successRate : 1 - pattern.failureRate,
    contradictoryEvidence: pattern.failureRate,
    confidence: pattern.confidence,
    reliability: computeReliability(pattern),
    novelty: computeNovelty(pattern.frequency),
    generality: computeGenerality(pattern),
    applicability: computeApplicability(pattern),
    successRate: pattern.successRate,
    failureRate: pattern.failureRate,
    timesObserved: pattern.frequency,
    timesConfirmed: Math.round(pattern.frequency * pattern.successRate),
    timesContradicted: Math.round(pattern.frequency * pattern.failureRate),
    status: "draft" as PrincipleStatus,
    version: 1,
    patternType: pattern.patternType,
    patternFrequency: pattern.frequency,
    createdAt: now,
    updatedAt: now,
    validatedAt: null,
    deprecatedAt: null,
    archivedAt: null,
    metadata: {
      domains: pattern.domains,
      strategicCategories: pattern.strategicCategories,
      averageQualityScore: pattern.averageQualityScore,
    },
  };
}

export function extractPrinciples(
  patterns: DiscoveredPattern[],
  userId: number,
): ExecutivePrinciple[] {
  const ids = new Set<string>();
  const fingerprints = new Set<string>();
  const principles: ExecutivePrinciple[] = [];

  for (const pattern of patterns) {
    const fp = `${userId}::${pattern.patternType}::${pattern.domains.sort().join(",")}::${pattern.outcome}`;
    if (fingerprints.has(fp)) continue;
    fingerprints.add(fp);
    const p = extractPrinciple(pattern, userId, ids);
    ids.add(p.id);
    principles.push(p);
  }

  return principles;
}

// ── Compute fingerprint for deduplication against existing DB principles ──────

export function buildPrincipleFingerprint(userId: number, pattern: DiscoveredPattern): string {
  return `${userId}::${pattern.patternType}::${pattern.domains.sort().join(",")}::${pattern.outcome}`;
}
