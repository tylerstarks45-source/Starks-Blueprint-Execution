// ─────────────────────────────────────────────────────────────────────────────
// Build 021: Strategic Planning Engine — Readiness Engine
// Evaluates: resource, technology, business, financial, governance readiness.
// Scoring is deterministic — derived from strategy confidence + constraints.
// ─────────────────────────────────────────────────────────────────────────────
import type { ReadinessDimensionScore, ReadinessProfile, ReadinessDimension, ReadinessLevel } from "./types";

function scoreToLevel(score: number): ReadinessLevel {
  if (score >= 0.85) return "ready";
  if (score >= 0.70) return "high";
  if (score >= 0.55) return "medium";
  if (score >= 0.35) return "low";
  return "not_ready";
}

interface ReadinessInput {
  strategyConfidence: number;       // 0-1
  strategyAlignmentScore: number;   // 0-1
  constraintCount: number;          // number of high/critical constraints
  dependencyCount: number;          // total dependencies
  criticalDependencyCount: number;  // severity=high|critical
  pillarCount: number;              // number of strategic pillars
  objectiveCount: number;           // number of strategic objectives
}

interface DimensionSpec {
  dimension: ReadinessDimension;
  baseWeight: number;
  gap: (score: number) => string;
  recommendation: (score: number) => string;
}

const DIMENSION_SPECS: DimensionSpec[] = [
  {
    dimension: "resource",
    baseWeight: 0.22,
    gap: (s) =>
      s < 0.55
        ? "Significant resource gaps — talent, capacity, and time allocation need resolution before programme launch."
        : s < 0.70
        ? "Moderate resource constraints — prioritised allocation plan required."
        : "Minor resource optimisation possible.",
    recommendation: (s) =>
      s < 0.55
        ? "Conduct a full resource assessment and resolve critical capacity gaps before committing to programme timelines."
        : s < 0.70
        ? "Develop a resource allocation plan with clear ownership for each strategic programme."
        : "Monitor resource utilisation against plan and adjust allocation as programmes ramp.",
  },
  {
    dimension: "technology",
    baseWeight: 0.20,
    gap: (s) =>
      s < 0.55
        ? "Core technology capabilities are not yet ready — foundational technology programme must precede dependent programmes."
        : s < 0.70
        ? "Technology gaps exist in specific areas — targeted investment required."
        : "Technology platform is substantially ready with minor gaps.",
    recommendation: (s) =>
      s < 0.55
        ? "Prioritise technology programme delivery immediately. Set a readiness gate before launching technology-dependent programmes."
        : s < 0.70
        ? "Address identified technology gaps in the technology programme before dependent programme milestones are reached."
        : "Continue technology maturation in parallel with growth programme execution.",
  },
  {
    dimension: "business",
    baseWeight: 0.23,
    gap: (s) =>
      s < 0.55
        ? "Business model and organisational readiness is insufficient — foundational changes required before execution."
        : s < 0.70
        ? "Business readiness is developing — process and organisational maturity improvements needed."
        : "Business is largely ready with focused preparation needed.",
    recommendation: (s) =>
      s < 0.55
        ? "Address fundamental business model and organisational gaps before committing to programme execution."
        : s < 0.70
        ? "Accelerate business process improvements and organisational capability development."
        : "Focus on final readiness preparation in identified gap areas.",
  },
  {
    dimension: "financial",
    baseWeight: 0.18,
    gap: (s) =>
      s < 0.55
        ? "Financial readiness is critically low — capital constraints may prevent programme execution."
        : s < 0.70
        ? "Financial readiness is adequate but capital allocation clarity is required."
        : "Financial position is sufficiently strong for programme execution.",
    recommendation: (s) =>
      s < 0.55
        ? "Resolve capital constraints and confirm funding commitments before programme launch decisions are made."
        : s < 0.70
        ? "Formalise capital allocation by programme and confirm funding sources."
        : "Maintain financial monitoring and adjust programme budgets as execution evidence accumulates.",
  },
  {
    dimension: "governance",
    baseWeight: 0.17,
    gap: (s) =>
      s < 0.55
        ? "Governance structures for programme oversight do not yet exist — high execution risk."
        : s < 0.70
        ? "Governance structures are partially in place — decision rights and escalation paths need formalisation."
        : "Governance is sufficiently mature for programme execution.",
    recommendation: (s) =>
      s < 0.55
        ? "Establish programme governance structures immediately — this is a prerequisite for all other programmes."
        : s < 0.70
        ? "Formalise decision rights, reporting cadence, and escalation paths for strategic programme oversight."
        : "Embed governance review into programme milestone cadence.",
  },
];

export function evaluateReadiness(input: ReadinessInput): ReadinessProfile {
  const {
    strategyConfidence,
    strategyAlignmentScore,
    constraintCount,
    criticalDependencyCount,
    pillarCount,
    objectiveCount,
  } = input;

  // Derived adjustment factors
  const constraintPenalty = Math.min(constraintCount * 0.04, 0.20);
  const depPenalty = Math.min(criticalDependencyCount * 0.03, 0.15);
  const completenessBonus = Math.min((pillarCount * objectiveCount) / 60, 0.10);

  const base = (strategyConfidence * 0.55 + strategyAlignmentScore * 0.45);

  // Per-dimension scoring with individual modifiers
  const dimensionModifiers: Record<ReadinessDimension, number> = {
    resource: -constraintPenalty * 1.1 - depPenalty * 0.8 + completenessBonus * 0.9,
    technology: -constraintPenalty * 0.9 - depPenalty * 1.2 + completenessBonus * 0.7,
    business: -constraintPenalty * 0.7 - depPenalty * 0.6 + completenessBonus * 1.2,
    financial: -constraintPenalty * 1.3 - depPenalty * 0.5 + completenessBonus * 0.8,
    governance: -constraintPenalty * 0.5 - depPenalty * 0.4 + completenessBonus * 1.1,
  };

  const dimensions: ReadinessDimensionScore[] = DIMENSION_SPECS.map((spec) => {
    const raw = Math.max(0.15, Math.min(0.95, base + (dimensionModifiers[spec.dimension] ?? 0)));
    const score = Math.round(raw * 100) / 100;
    const level = scoreToLevel(score);
    return {
      dimension: spec.dimension,
      score,
      level,
      gap: spec.gap(score),
      recommendation: spec.recommendation(score),
    };
  });

  const overall =
    Math.round(
      (dimensions.reduce((sum, d, i) => sum + d.score * DIMENSION_SPECS[i].baseWeight, 0) /
        DIMENSION_SPECS.reduce((s, d) => s + d.baseWeight, 0)) *
        100,
    ) / 100;

  const criticalGaps = dimensions
    .filter((d) => d.level === "not_ready" || d.level === "low")
    .map((d) => `${d.dimension}: ${d.gap}`);

  return {
    overall,
    overallLevel: scoreToLevel(overall),
    dimensions,
    criticalGaps,
  };
}
