// ── ETI Executive Recommendation Engine ──────────────────────────────────
// Synthesises the final recommendation: winner, runner-up, rejected options,
// trade-off explanation, assumptions, and confidence score.
// Enforces the Executive Optimization Law:
//   Never recommend an option solely because it has the highest individual score.
//   Every recommendation must be evaluated against the complete constraint set.
// Pure computation — no I/O.

import type {
  MatrixRow,
  FrontierResult,
  SensitivityResult,
  TradeoffObjective,
  TradeoffConstraint,
  ExecutiveRecommendation,
} from "./types";
import { hasCriticalSensitivity } from "./eti-sensitivity-engine";

export function buildExecutiveRecommendation(
  matrix: MatrixRow[],
  frontier: FrontierResult,
  sensitivities: SensitivityResult[],
  objectives: TradeoffObjective[],
  constraints: TradeoffConstraint[],
): ExecutiveRecommendation {
  // Sort by weighted composite (accounting for constraint violations)
  const eligible = [...matrix].sort((a, b) => {
    // Hard constraint violations disqualify
    if (a.constraintViolations.length > 0 && b.constraintViolations.length === 0) return 1;
    if (b.constraintViolations.length > 0 && a.constraintViolations.length === 0) return -1;
    return b.weightedCompositeScore - a.weightedCompositeScore;
  });

  const winner   = eligible[0];
  const runnerUp = eligible[1] ?? null;

  if (!winner) {
    return {
      recommendedOption:   "none",
      recommendedName:     "No viable option",
      runnerUpOption:      null,
      runnerUpName:        null,
      rejectedOptions:     [],
      tradeoffExplanation: "No option could be evaluated — insufficient data.",
      whyWon:              "N/A",
      whyLost:             {},
      keyAssumptions:      ["No viable options provided."],
      sensitivityFlag:     false,
      confidenceScore:     0,
      executiveLawApplied: true,
    };
  }

  // Why winner won
  const winnerTopObjectives = Object.entries(winner.objectiveScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([obj, score]) => `${obj} (${(score * 100).toFixed(0)}%)`);

  const isOnFrontier = frontier.frontierOptions.some(f => f.key === winner.optionKey);
  const frontierNote = isOnFrontier
    ? "It sits on the Pareto frontier — no other option dominates it across all objectives."
    : "Note: this option is not on the Pareto frontier; all frontier options had constraint violations.";

  const whyWon = `"${winner.optionName}" achieved the highest constraint-adjusted weighted composite score (${(winner.weightedCompositeScore * 100).toFixed(1)}%). Strongest objectives: ${winnerTopObjectives.join(", ")}. ${frontierNote}`;

  // Why each alternative lost
  const whyLost: Record<string, string> = {};
  for (const row of eligible.slice(1)) {
    const scoreDiff = (winner.weightedCompositeScore - row.weightedCompositeScore) * 100;
    const violations = row.constraintViolations.length;
    if (violations > 0) {
      whyLost[row.optionKey] = `"${row.optionName}" violated ${violations} hard constraint(s): ${row.constraintViolations[0]?.split(" ")[0] ?? "constraint"}.`;
    } else {
      const weakObjectives = Object.entries(row.objectiveScores)
        .filter(([, s]) => s < 0.50)
        .map(([obj]) => obj)
        .slice(0, 2);
      whyLost[row.optionKey] = `"${row.optionName}" scored ${scoreDiff.toFixed(1)}% below the winner${weakObjectives.length > 0 ? `; underperforms on: ${weakObjectives.join(", ")}` : ""}.`;
    }
  }

  // Rejected options (those with hard constraint violations OR on the bottom tier)
  const rejected = eligible.slice(1).map(row => ({
    key:    row.optionKey,
    name:   row.optionName,
    reason: whyLost[row.optionKey] ?? "Lower composite score.",
  }));

  // Key assumptions
  const keyAssumptions: string[] = [
    `Objective weights are: ${objectives.slice(0, 3).map(o => `${o.objective}=${(o.weight * 100).toFixed(0)}%`).join(", ")}${objectives.length > 3 ? " + others" : ""}.`,
    `${constraints.filter(c => c.severity === "hard").length} hard constraint(s) applied as eliminators.`,
    `Scoring uses weighted composite with direction normalization (minimize→inverted, balance→centered).`,
  ];

  if (winner.constraintViolations.length > 0) {
    keyAssumptions.push(`WARNING: Recommended option has ${winner.constraintViolations.length} hard constraint violation(s) — all options had violations.`);
  }

  // Trade-off explanation (the key synthesis)
  const sensitivityFlag = hasCriticalSensitivity(sensitivities);
  const changedCount = sensitivities.filter(s => s.recommendationChanged).length;

  const tradeoffExplanation = [
    `Recommendation: "${winner.optionName}" wins on constraint-adjusted weighted composite score.`,
    `${frontier.frontierSize} option(s) on the Pareto frontier; ${frontier.dominatedCount} dominated.`,
    sensitivityFlag
      ? `SENSITIVE: Recommendation changes in ${changedCount} of ${sensitivities.length} sensitivity scenarios — this decision is constraint-dependent.`
      : `STABLE: Recommendation holds in ${sensitivities.length - changedCount} of ${sensitivities.length} sensitivity scenarios.`,
    `Executive Optimization Law applied: ${objectives.length} objectives balanced, all constraints evaluated, assumptions documented.`,
  ].join(" ");

  // Confidence score
  let confidence = winner.weightedCompositeScore;
  if (sensitivityFlag) confidence *= 0.75;       // penalize sensitive recommendations
  if (winner.constraintViolations.length > 0) confidence *= 0.60; // penalize violations
  if (isOnFrontier) confidence = Math.min(confidence * 1.10, 1.0); // bonus for frontier
  if (eligible.length === 1) confidence *= 0.80; // penalize single-option decisions
  confidence = Math.round(Math.min(confidence, 1.0) * 1000) / 1000;

  return {
    recommendedOption:   winner.optionKey,
    recommendedName:     winner.optionName,
    runnerUpOption:      runnerUp?.optionKey ?? null,
    runnerUpName:        runnerUp?.optionName ?? null,
    rejectedOptions:     rejected,
    tradeoffExplanation,
    whyWon,
    whyLost,
    keyAssumptions,
    sensitivityFlag,
    confidenceScore:     confidence,
    executiveLawApplied: true,
  };
}
