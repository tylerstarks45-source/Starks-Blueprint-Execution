// ── ETI Sensitivity Analysis Engine ──────────────────────────────────────
// Determines how recommendations change when one or more constraints change.
// Examples: budget doubles, timeline halves, risk tolerance decreases.
// Pure computation — no I/O.

import type {
  TradeoffOption,
  TradeoffObjective,
  TradeoffConstraint,
  SensitivityResult,
  ChangeType,
} from "./types";
import { scoreAllOptions, normalizeWeights } from "./eti-optimization-engine";
import { detectConstraintViolations } from "./eti-constraint-engine";

interface SensitivityScenario {
  constraintKey:    string;
  constraintName:   string;
  changeType:       ChangeType;
  changeDescription:string;
  modifiedConstraints: TradeoffConstraint[];
}

function buildSensitivityScenarios(constraints: TradeoffConstraint[]): SensitivityScenario[] {
  const scenarios: SensitivityScenario[] = [];

  for (const constraint of constraints) {
    // 1. Relax the constraint (remove binding pressure)
    scenarios.push({
      constraintKey:    constraint.key,
      constraintName:   constraint.name,
      changeType:       "relax",
      changeDescription:`${constraint.name} is relaxed (${constraint.value} → unconstrained)`,
      modifiedConstraints: constraints.map(c =>
        c.key === constraint.key ? { ...c, severity: "preference" as const } : c
      ),
    });

    // 2. Tighten the constraint (for hard constraints, test sensitivity)
    if (constraint.severity !== "hard") {
      scenarios.push({
        constraintKey:    constraint.key,
        constraintName:   constraint.name,
        changeType:       "tighten",
        changeDescription:`${constraint.name} becomes a hard constraint (${constraint.severity} → hard)`,
        modifiedConstraints: constraints.map(c =>
          c.key === constraint.key ? { ...c, severity: "hard" as const } : c
        ),
      });
    }
  }

  return scenarios.slice(0, 6); // cap at 6 sensitivity scenarios per evaluation
}

function getTopOptionKey(
  options: TradeoffOption[],
  objectives: TradeoffObjective[],
  constraints: TradeoffConstraint[],
): string | null {
  const violations = detectConstraintViolations(options, constraints);
  const scored = scoreAllOptions(options, objectives);

  // Apply constraint penalty
  const penalized = scored.map(s => {
    const hardViolations = (violations.get(s.optionKey) ?? []).length;
    const penalty = hardViolations * 0.25;
    return { ...s, adjusted: Math.max(0, s.weightedComposite - penalty) };
  });

  if (penalized.length === 0) return null;
  return penalized.sort((a, b) => b.adjusted - a.adjusted)[0].optionKey;
}

export function runSensitivityAnalysis(
  options: TradeoffOption[],
  objectives: TradeoffObjective[],
  constraints: TradeoffConstraint[],
  originalRecommendation: string,
): SensitivityResult[] {
  const scenarios = buildSensitivityScenarios(constraints);
  const results: SensitivityResult[] = [];

  for (const scenario of scenarios) {
    const sensitizedKey = getTopOptionKey(options, objectives, scenario.modifiedConstraints);
    const recommendationChanged = sensitizedKey !== null && sensitizedKey !== originalRecommendation;

    // Compute sensitivity score: how much does the composite score change?
    const originalScores = scoreAllOptions(options, objectives);
    const originalTop = originalScores.find(s => s.optionKey === originalRecommendation);
    const sensitizedTop = originalScores.find(s => s.optionKey === sensitizedKey);
    const scoreDelta = sensitizedTop && originalTop
      ? Math.abs(sensitizedTop.weightedComposite - originalTop.weightedComposite)
      : 0;
    const sensitivityScore = Math.min(recommendationChanged ? 0.60 + scoreDelta : scoreDelta, 1.0);

    // Determine which objectives are affected
    const affectedObjectives = objectives
      .filter(o => {
        const type = scenario.constraintKey.split("-")[0];
        return o.objective.includes(type) || ["cost", "risk", "speed"].includes(o.objective);
      })
      .map(o => o.objective)
      .slice(0, 3);

    const analysis = recommendationChanged
      ? `When "${scenario.constraintName}" changes (${scenario.changeDescription}), the recommendation shifts from "${originalRecommendation}" to "${sensitizedKey ?? 'none'}". This constraint is load-bearing for this decision.`
      : `The recommendation "${originalRecommendation}" is stable under this change. Confidence increases when the decision holds under constraint variation.`;

    results.push({
      changedConstraint:        scenario.constraintKey,
      changeType:               scenario.changeType,
      changeDescription:        scenario.changeDescription,
      originalRecommendation,
      sensitizedRecommendation: sensitizedKey ?? originalRecommendation,
      recommendationChanged,
      sensitivityScore:         Math.round(sensitivityScore * 1000) / 1000,
      affectedObjectives,
      analysis,
    });
  }

  return results;
}

// Overall sensitivity flag: true if any critical sensitivity detected
export function hasCriticalSensitivity(sensitivities: SensitivityResult[]): boolean {
  return sensitivities.some(s => s.recommendationChanged && s.sensitivityScore >= 0.60);
}
