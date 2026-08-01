// ── ETI Decision Frontier Engine ──────────────────────────────────────────
// Identifies Pareto-optimal solutions that are not dominated by any other
// solution across the evaluated objectives.
// Pure computation — no I/O.

import type { MatrixRow, FrontierResult, TradeoffObjective } from "./types";

export function computeDecisionFrontier(
  matrix: MatrixRow[],
  objectives: TradeoffObjective[],
): FrontierResult {
  const frontierOptions: { key: string; name: string; score: number }[] = [];
  const dominatedOptions: { key: string; name: string; dominatedBy: string }[] = [];

  for (const row of matrix) {
    if (row.isOnFrontier) {
      frontierOptions.push({
        key:   row.optionKey,
        name:  row.optionName,
        score: row.weightedCompositeScore,
      });
    } else {
      // Find the option that dominates it
      const dominator = matrix.find(other =>
        other.optionKey !== row.optionKey && other.isOnFrontier &&
        Object.entries(other.objectiveScores).every(([obj, score]) =>
          (row.objectiveScores[obj] ?? 0) <= score
        )
      );
      dominatedOptions.push({
        key:         row.optionKey,
        name:        row.optionName,
        dominatedBy: dominator?.optionKey ?? "multiple",
      });
    }
  }

  // If nothing on frontier (all dominated by nothing / edge case), promote top scorer
  if (frontierOptions.length === 0 && matrix.length > 0) {
    const top = [...matrix].sort((a, b) => b.weightedCompositeScore - a.weightedCompositeScore)[0];
    frontierOptions.push({ key: top.optionKey, name: top.optionName, score: top.weightedCompositeScore });
  }

  const objectivesConsidered = objectives.map(o => o.objective);

  // Recommended from frontier: highest weighted composite score among frontier options
  const topFrontier = [...frontierOptions].sort((a, b) => b.score - a.score)[0];

  const explanation = buildFrontierExplanation(frontierOptions, dominatedOptions, objectivesConsidered);

  return {
    frontierOptions,
    dominatedOptions,
    frontierSize:            frontierOptions.length,
    dominatedCount:          dominatedOptions.length,
    objectivesConsidered,
    frontierExplanation:     explanation,
    recommendedFromFrontier: topFrontier?.key,
  };
}

function buildFrontierExplanation(
  frontier: { key: string; name: string; score: number }[],
  dominated: { key: string; name: string; dominatedBy: string }[],
  objectives: string[],
): string {
  const frontierNames = frontier.map(f => `"${f.name}"`).join(", ");
  const dominatedNames = dominated.map(d => `"${d.name}"`).join(", ");

  const parts = [
    `Pareto frontier contains ${frontier.length} option(s): ${frontierNames}.`,
    `Evaluated across ${objectives.length} objective(s): ${objectives.join(", ")}.`,
  ];

  if (dominated.length > 0) {
    parts.push(`${dominated.length} option(s) are dominated and excluded from the optimal set: ${dominatedNames}.`);
  }

  if (frontier.length === 1) {
    parts.push(`A single-option frontier means "${frontier[0].name}" is superior on all objectives.`);
  } else {
    parts.push(`Multiple frontier options reflect genuine trade-offs — no single option dominates all objectives.`);
  }

  return parts.join(" ");
}

// Compute the spread of the frontier (diversity of trade-off space)
export function computeFrontierDiversity(frontier: { score: number }[]): number {
  if (frontier.length <= 1) return 0;
  const scores = frontier.map(f => f.score).sort((a, b) => a - b);
  return Math.round((scores[scores.length - 1] - scores[0]) * 1000) / 1000;
}
