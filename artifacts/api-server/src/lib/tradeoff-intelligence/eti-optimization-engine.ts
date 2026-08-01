// ── ETI Objective Optimization Engine ────────────────────────────────────
// Weighted multi-objective scoring. Produces deterministic scores.
// Executive Optimization Law: never recommend an option solely because it
// has the highest individual score — evaluate against the complete constraint set.
// Pure computation — no I/O.

import type { TradeoffOption, TradeoffObjective } from "./types";

export interface ObjectiveScore {
  objective:  string;
  rawScore:   number;         // option's self-reported score for this objective
  adjustedScore: number;      // after direction normalization (maximize → keep, minimize → 1-x)
  weightedScore: number;      // adjustedScore × weight
  weight:     number;
  direction:  string;
}

export interface OptionWeightedScore {
  optionKey:         string;
  objectiveBreakdown:ObjectiveScore[];
  rawComposite:      number;   // unweighted mean across objectives
  weightedComposite: number;   // Σ(adjustedScore × weight)
}

// Normalize objective weights so they sum to 1.0
export function normalizeWeights(objectives: TradeoffObjective[]): TradeoffObjective[] {
  const total = objectives.reduce((s, o) => s + o.weight, 0);
  if (total === 0) return objectives.map(o => ({ ...o, weight: 1 / objectives.length }));
  return objectives.map(o => ({ ...o, weight: o.weight / total }));
}

// Apply direction: "minimize" → inverted (1 - score is better), "balance" → bias toward 0.5
function applyDirection(score: number, direction: string): number {
  if (direction === "minimize") return 1 - score;  // lower is better → invert
  if (direction === "balance")  return 1 - Math.abs(score - 0.5) * 2; // penalize extremes
  return score; // maximize: higher is better
}

// Score a single option against all objectives
export function scoreOption(
  option: TradeoffOption,
  objectives: TradeoffObjective[],
): OptionWeightedScore {
  const normalized = normalizeWeights(objectives);
  const breakdown: ObjectiveScore[] = [];
  let weightedSum = 0;
  let rawSum = 0;

  for (const obj of normalized) {
    const raw = option.scores[obj.objective] ?? 0.50; // default middle when not provided
    const adjusted = applyDirection(raw, obj.direction);
    const weighted  = adjusted * obj.weight;
    weightedSum    += weighted;
    rawSum         += raw;

    breakdown.push({
      objective:     obj.objective,
      rawScore:      raw,
      adjustedScore: adjusted,
      weightedScore: weighted,
      weight:        obj.weight,
      direction:     obj.direction,
    });
  }

  const rawComposite      = normalized.length > 0 ? rawSum / normalized.length : 0;
  const weightedComposite = weightedSum;

  return {
    optionKey:          option.key,
    objectiveBreakdown: breakdown,
    rawComposite:       Math.round(rawComposite * 1000) / 1000,
    weightedComposite:  Math.round(weightedComposite * 1000) / 1000,
  };
}

// Score all options
export function scoreAllOptions(
  options: TradeoffOption[],
  objectives: TradeoffObjective[],
): OptionWeightedScore[] {
  return options.map(o => scoreOption(o, objectives));
}

// Rank options by weighted composite (descending)
export function rankOptions(scored: OptionWeightedScore[]): (OptionWeightedScore & { rank: number })[] {
  return [...scored]
    .sort((a, b) => b.weightedComposite - a.weightedComposite)
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

// Generate per-objective explanation for a scored option
export function generateObjectiveExplanation(
  breakdown: ObjectiveScore,
  optionName: string,
): { objective: string; score: number; reason: string } {
  const pct = Math.round(breakdown.adjustedScore * 100);
  let qualifier: string;
  if (pct >= 80)      qualifier = "strong";
  else if (pct >= 60) qualifier = "adequate";
  else if (pct >= 40) qualifier = "moderate";
  else if (pct >= 20) qualifier = "weak";
  else                qualifier = "poor";

  const dirLabel =
    breakdown.direction === "minimize" ? "(lower is better)" :
    breakdown.direction === "balance"  ? "(balanced is better)" :
    "(higher is better)";

  return {
    objective: breakdown.objective,
    score:     breakdown.adjustedScore,
    reason:    `"${optionName}" scores ${pct}% on ${breakdown.objective} ${dirLabel} — ${qualifier} performance (weight: ${(breakdown.weight * 100).toFixed(0)}%).`,
  };
}
