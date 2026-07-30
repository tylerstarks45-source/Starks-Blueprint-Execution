// ─── Build 019: Scenario Comparison Engine ───────────────────────────────────
//
// Compares every future scenario against every other across 6 dimensions.
// Purely deterministic — no AI, no mutation of simulation data.

import type { ScoredScenario, ScenarioComparison } from "./types";

type Dim = "expectedValue" | "risk" | "confidence" | "complexity" | "resourceDemand" | "timeHorizon";

function winner(a: number, b: number, higherIsBetter: boolean): "a" | "b" | "tie" {
  const THRESHOLD = 0.03;
  const diff = a - b;
  if (Math.abs(diff) < THRESHOLD) return "tie";
  if (higherIsBetter) return diff > 0 ? "a" : "b";
  return diff < 0 ? "a" : "b";  // lower is better
}

function compareTwo(a: ScoredScenario, b: ScoredScenario): ScenarioComparison {
  const ev = { a: a.expectedValueScore, b: b.expectedValueScore, winner: winner(a.expectedValueScore, b.expectedValueScore, true) } as const;
  const risk = { a: a.riskScore, b: b.riskScore, winner: winner(a.riskScore, b.riskScore, false) } as const;
  const conf = { a: a.overallConfidence, b: b.overallConfidence, winner: winner(a.overallConfidence, b.overallConfidence, true) } as const;
  const cplx = { a: a.executionComplexity, b: b.executionComplexity, winner: winner(a.executionComplexity, b.executionComplexity, false) } as const;
  const res  = { a: a.resourceDemand, b: b.resourceDemand, winner: winner(a.resourceDemand, b.resourceDemand, false) } as const;
  // time horizon: approximated by growth potential (higher = longer, lower = shorter — both can be good depending on context)
  // We treat higher growth as a longer-horizon signal and score it neutrally (higher = better for strategic purposes)
  const th   = { a: a.growthPotential, b: b.growthPotential, winner: winner(a.growthPotential, b.growthPotential, true) } as const;

  const wins: Record<"a" | "b" | "tie", number> = { a: 0, b: 0, tie: 0 };
  for (const dim of [ev, risk, conf, cplx, res, th]) wins[dim.winner]++;

  const overallWinner: "a" | "b" | "tie" = wins.a > wins.b ? "a" : wins.b > wins.a ? "b" : "tie";
  const marginOfDifference = Math.abs(a.compositeScore - b.compositeScore);

  return {
    scenarioIdA: a.scenarioId,
    scenarioIdB: b.scenarioId,
    scenarioTypeA: a.scenarioType,
    scenarioTypeB: b.scenarioType,
    dimensionScores: {
      expectedValue: ev,
      risk,
      confidence: conf,
      complexity: cplx,
      resourceDemand: res,
      timeHorizon: th,
    },
    overallWinner,
    marginOfDifference,
  };
}

/** Pairwise comparison of all scenarios. O(n²). */
export function compareScenarios(scenarios: ScoredScenario[]): ScenarioComparison[] {
  const comparisons: ScenarioComparison[] = [];
  for (let i = 0; i < scenarios.length; i++) {
    for (let j = i + 1; j < scenarios.length; j++) {
      comparisons.push(compareTwo(scenarios[i]!, scenarios[j]!));
    }
  }
  return comparisons;
}

/** Build win-count ranking from pairwise comparisons. Returns scenario IDs in rank order. */
export function rankByComparisons(
  scenarios: ScoredScenario[],
  comparisons: ScenarioComparison[],
): string[] {
  const wins: Record<string, number> = {};
  for (const s of scenarios) wins[s.scenarioId] = 0;
  for (const c of comparisons) {
    const winnerId = c.overallWinner === "a" ? c.scenarioIdA : c.overallWinner === "b" ? c.scenarioIdB : null;
    if (winnerId) wins[winnerId] = (wins[winnerId] ?? 0) + 1;
  }
  return [...scenarios]
    .sort((a, b) => (wins[b.scenarioId] ?? 0) - (wins[a.scenarioId] ?? 0))
    .map((s) => s.scenarioId);
}
