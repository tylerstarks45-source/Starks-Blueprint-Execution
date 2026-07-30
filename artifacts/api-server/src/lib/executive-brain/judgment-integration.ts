// ─── Executive Brain → Judgment Engine integration (Build 007) ───────────────
//
// This module derives candidate decision options from an Executive Reasoning
// Result and calls the Judgment Engine to evaluate them. It lives in the
// executive-brain package (not the judgment package) to keep the dependency
// graph clean: executive-brain → executive-judgment (one direction only).
//
// The options generated here are heuristic — derived entirely from the
// structured reasoning pipeline output (ObjectiveAnalysis fields). Future
// builds can supply richer options from external sources via the
// judgment-pre-evaluation extension point.

import type { ExecutiveReasoningResult, ObjectiveAnalysis, OrchestrationConfidence } from "../cognitive-foundation/types";
import { evaluateJudgment } from "../executive-judgment";
import type { JudgmentOption, ExecutiveJudgment } from "../executive-judgment";
import { logger } from "../logger";

// ─── Score mapping helpers ─────────────────────────────────────────────────────

function confToScore(c: OrchestrationConfidence): number {
  return c === "high" ? 80 : c === "medium" ? 60 : c === "low" ? 35 : 50;
}

function complexityToRisk(c: "high" | "medium" | "low"): number {
  return c === "high" ? 65 : c === "medium" ? 45 : 25;
}

function priorityToStrategicValue(p: "critical" | "high" | "medium" | "low"): number {
  return p === "critical" ? 92 : p === "high" ? 76 : p === "medium" ? 58 : 38;
}

function unknownInfoToRisk(unknowns: string[]): number {
  const n = unknowns.length;
  return n === 0 ? 20 : n <= 2 ? 40 : n <= 4 ? 60 : 75;
}

// ─── Option generation from reasoning result ─────────────────────────────────

function buildOptions(analysis: ObjectiveAnalysis): JudgmentOption[] {
  const options: JudgmentOption[] = [];
  const confScore = confToScore(analysis.confidence.overall);
  const infoRisk = unknownInfoToRisk(analysis.unknownInformation);
  const complexityRisk = complexityToRisk(analysis.complexity);
  const sv = priorityToStrategicValue(analysis.priority);

  // Option 1: Execute the primary plan — always present
  options.push({
    key: "execute_primary_plan",
    description: analysis.primaryGoal.slice(0, 200) || "Execute the primary plan",
    scores: {
      strategicValue: sv,
      confidence: confScore,
      risk: Math.round((infoRisk + complexityRisk) / 2),
      complexity: complexityRisk, // raw complexity score (inverted in engine)
      expectedImpact: 75,
      urgency: analysis.priority === "critical" ? 90 : analysis.priority === "high" ? 70 : 50,
      reversibility: analysis.complexity === "high" ? 35 : 60,
      cost: 55,
      resourceDemand: 55,
      timeSensitivity: analysis.priority === "critical" ? 85 : 55,
    },
    evidence: analysis.knownConstraints.slice(0, 2),
  });

  // Option 2: Simplify approach — added when complexity is high
  if (analysis.complexity === "high" || analysis.unknownInformation.length >= 2) {
    const simplifiedGoal = analysis.secondaryGoals[0]
      ? `Simplified scope: ${analysis.secondaryGoals[0].slice(0, 150)}`
      : "Simplify approach — reduce scope to most critical elements";
    options.push({
      key: "simplify_approach",
      description: simplifiedGoal,
      scores: {
        strategicValue: Math.max(45, sv - 20), // lower but still valuable
        confidence: Math.min(90, confScore + 15), // simpler → more confident
        risk: Math.max(20, Math.round((infoRisk + complexityRisk) / 2) - 20),
        complexity: 30, // much lower complexity (raw; inverted → higher effective score)
        expectedImpact: 55,
        urgency: analysis.priority === "critical" ? 75 : 45,
        reversibility: 72, // simpler = easier to reverse
        cost: 40,
        resourceDemand: 40,
        timeSensitivity: 45,
      },
      evidence: [],
    });
  }

  // Option 3: Defer for more information — added when unknowns are significant
  if (analysis.unknownInformation.length >= 2) {
    options.push({
      key: "defer_for_clarification",
      description: `Defer decision until unknown information is resolved: ${analysis.unknownInformation.slice(0, 2).join("; ").slice(0, 200)}`,
      scores: {
        strategicValue: 20, // low — deferring rarely advances goals directly
        confidence: 78,     // high — we're confident deferring reduces risk
        risk: 22,           // very low risk (not committing yet)
        complexity: 15,     // trivial to defer
        expectedImpact: 30, // low direct impact
        urgency: 20,        // low urgency (deferral takes time)
        reversibility: 95,  // fully reversible — can change course after info arrives
        cost: 20,
        resourceDemand: 15,
        timeSensitivity: 20,
      },
      evidence: analysis.unknownInformation.slice(0, 3),
    });
  }

  return options;
}

// ─── Main integration function ────────────────────────────────────────────────

/** Derive judgment options from an Executive Reasoning Result and evaluate them.
 *  Called from runExecutiveBrain() after runReasoningPipeline(). Fail-open:
 *  if this throws, the caller logs and continues without a judgment. */
export async function evaluateJudgmentFromReasoning(
  userId: number,
  message: string,
  reasoningResult: ExecutiveReasoningResult,
  contextSnapshotId: string | undefined,
): Promise<ExecutiveJudgment> {
  const { objectiveAnalysis } = reasoningResult;

  const options = buildOptions(objectiveAnalysis);

  // Confidence-to-weight adjustment: if confidence is low, weight reversibility higher
  const confScore = confToScore(objectiveAnalysis.confidence.overall);
  const extraReversibilityWeight = confScore < 50 ? 0.05 : 0;
  const weights = extraReversibilityWeight > 0
    ? { reversibility: 0.10, confidence: 0.10 }
    : undefined;

  const judgment = await evaluateJudgment({
    userId,
    decisionObjective: objectiveAnalysis.primaryGoal || message.slice(0, 200),
    options,
    contextSnapshotId,
    weights,
    assumptions: objectiveAnalysis.unknownInformation.slice(0, 3),
    constraints: objectiveAnalysis.knownConstraints.slice(0, 5),
    evidence: [
      reasoningResult.decisionRecord.reason,
      ...reasoningResult.decisionRecord.supportingContext.slice(0, 2),
    ].filter(Boolean),
  });

  logger.debug(
    {
      judgmentId: judgment.id,
      selectedKey: judgment.selectedOptionKey,
      decisionScore: judgment.decisionScore,
      optionCount: options.length,
    },
    "Executive Brain: judgment evaluated from reasoning result",
  );

  return judgment;
}
