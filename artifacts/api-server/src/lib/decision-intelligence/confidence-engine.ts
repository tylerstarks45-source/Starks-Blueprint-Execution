// ─── Build 019: Confidence Engine ────────────────────────────────────────────
//
// Computes 5-dimension decision confidence for each candidate decision.
// Deterministic — no AI, no mutation.

import { randomUUID } from "crypto";
import type { DecisionConfidenceRecord, ScoredScenario } from "./types";

function clamp(v: number): number { return Math.max(0, Math.min(1, v)); }

export function computeDecisionConfidence(
  scenario: ScoredScenario,
  decisionId: string,
  reportId: string,
  businessId: number,
  governanceCompliant: boolean,
): DecisionConfidenceRecord {
  // 1. Decision Confidence — derived from the scenario's simulation confidence
  const decisionConfidence = clamp(scenario.overallConfidence);

  // 2. Evidence Score — composite of expected value and confidence together
  const evidenceScore = clamp((scenario.expectedValueScore * 0.5) + (scenario.overallConfidence * 0.5));

  // 3. Data Completeness — inversely related to execution complexity (complex scenarios imply gaps)
  const dataCompleteness = clamp(0.9 - scenario.executionComplexity * 0.25);

  // 4. Assumption Stability — inversely related to risk score
  const assumptionStability = clamp(1.0 - scenario.riskScore * 0.6);

  // 5. Policy Compliance — 1.0 if governance compliant, 0.5 otherwise
  const policyCompliance = governanceCompliant ? 1.0 : 0.5;

  // Overall — weighted aggregate
  const overallConfidence = clamp(
    decisionConfidence  * 0.30 +
    evidenceScore       * 0.25 +
    dataCompleteness    * 0.20 +
    assumptionStability * 0.15 +
    policyCompliance    * 0.10,
  );

  const confidenceNarrative = buildNarrative(
    overallConfidence, governanceCompliant, scenario.riskScore,
  );

  return {
    id: randomUUID(),
    decisionId,
    reportId,
    businessId,
    decisionConfidence,
    evidenceScore,
    dataCompleteness,
    assumptionStability,
    policyCompliance,
    overallConfidence,
    confidenceNarrative,
  };
}

function buildNarrative(confidence: number, compliant: boolean, riskScore: number): string {
  const level = confidence >= 0.80 ? "High" : confidence >= 0.60 ? "Moderate" : "Low";
  const compliance = compliant ? "fully governance-compliant" : "governance compliance not confirmed";
  const riskNote = riskScore > 0.65 ? " Risk levels are elevated, which reduces assumption stability." : "";
  return `${level} confidence (${(confidence * 100).toFixed(0)}%). This decision is ${compliance}.${riskNote}`;
}
