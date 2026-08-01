// ── ETI Trade-off Matrix Engine ───────────────────────────────────────────
// Builds the comparison matrix. Every score must be explainable.
// Pure computation — no I/O.

import type { TradeoffOption, TradeoffObjective } from "./types";
import type { MatrixRow } from "./types";
import type { ConstraintViolation } from "./eti-constraint-engine";
import { scoreAllOptions, rankOptions, generateObjectiveExplanation, normalizeWeights } from "./eti-optimization-engine";
import { computeConstraintComplianceScore } from "./eti-constraint-engine";

export function buildTradeoffMatrix(
  options: TradeoffOption[],
  objectives: TradeoffObjective[],
  violations: Map<string, ConstraintViolation[]>,
  constraints: { key: string; type: string; severity: string }[],
): MatrixRow[] {
  const scored = scoreAllOptions(options, objectives);
  const ranked = rankOptions(scored);
  const normalizedObjectives = normalizeWeights(objectives);

  return ranked.map(s => {
    const option = options.find(o => o.key === s.optionKey)!;

    // Apply constraint compliance penalty
    const compliance = computeConstraintComplianceScore(s.optionKey, violations, constraints as any);
    const adjustedWeighted = s.weightedComposite * (0.70 + compliance * 0.30); // compliance adjusts ≤30%

    const optViolations = violations.get(s.optionKey) ?? [];
    const violationStrings = optViolations.map(v => v.reason);

    // Generate per-objective explanations
    const explanations = s.objectiveBreakdown.map(bd =>
      generateObjectiveExplanation(bd, option.name)
    );

    return {
      optionKey:              s.optionKey,
      optionName:             option.name,
      optionDescription:      option.description,
      objectiveScores:        Object.fromEntries(
        s.objectiveBreakdown.map(bd => [bd.objective, bd.adjustedScore])
      ),
      constraintViolations:   violationStrings,
      weightedCompositeScore: Math.round(adjustedWeighted * 1000) / 1000,
      rawCompositeScore:      s.rawComposite,
      dominanceRank:          s.rank,
      isOnFrontier:           false, // set by frontier engine
      explanations,
    };
  });
}

// Identify which options are strictly dominated (another option is ≥ on all objectives, > on at least one)
export function markDominanceOnMatrix(matrix: MatrixRow[]): MatrixRow[] {
  const result = matrix.map(row => ({ ...row }));

  for (const candidate of result) {
    let isDominated = false;

    for (const other of result) {
      if (other.optionKey === candidate.optionKey) continue;

      // Check if 'other' dominates 'candidate'
      const otherScores = Object.entries(other.objectiveScores);
      const dominatesOnAll = otherScores.every(([obj, score]) =>
        (candidate.objectiveScores[obj] ?? 0) <= score
      );
      const dominatesOnAtLeastOne = otherScores.some(([obj, score]) =>
        (candidate.objectiveScores[obj] ?? 0) < score
      );

      if (dominatesOnAll && dominatesOnAtLeastOne) {
        isDominated = true;
        break;
      }
    }

    candidate.isOnFrontier = !isDominated;
  }

  return result;
}
