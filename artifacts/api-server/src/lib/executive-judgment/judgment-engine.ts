// ─── Executive Judgment Engine (Build 007) ───────────────────────────────────
//
// The Judgment Engine is the core of Build 007. It:
//   1. Receives a decision objective + candidate options
//   2. Fills in default scores for unspecified dimensions
//   3. Applies configurable weights to compute per-option composite scores
//   4. Ranks options (higher composite = better)
//   5. Selects the top-ranked option as the recommendation
//   6. Generates a structured explanation (why selected, why alternatives rejected)
//   7. Persists the judgment as an immutable record
//   8. Consolidates as a Cognitive Artifact (fire-and-forget)
//
// The engine is purely deterministic/mathematical — no AI calls.
// Scoring logic is transparent and auditable.
//
// Judgment recommends. It does not execute.

import { db, executiveJudgmentsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { logger } from "../logger";
import { consolidate } from "../cognitive-foundation/cognitive-memory";
import {
  JUDGMENT_SCORE_DIMENSIONS,
  INVERTED_DIMENSIONS,
  DEFAULT_SCORING_WEIGHTS,
  type JudgmentRequest,
  type JudgmentOption,
  type ScoredJudgmentOption,
  type AlternativeRanking,
  type JudgmentExplanation,
  type ExecutiveJudgment,
  type ScoringWeights,
  type JudgmentScoreDimension,
  type RawOptionScores,
} from "./types";
import {
  JUDGMENT_EXTENSION_POINT_IDS,
  fireJudgmentHooks,
} from "./judgment-extension-points";

// ─── Row mapper ───────────────────────────────────────────────────────────────

function rowToJudgment(row: typeof executiveJudgmentsTable.$inferSelect): ExecutiveJudgment {
  return {
    ...row,
    options: (row.options as ScoredJudgmentOption[]) ?? [],
    compositeScores: (row.compositeScores as Record<string, number>) ?? {},
    supportingEvidence: (row.supportingEvidence as string[]) ?? [],
    relatedArtifactIds: (row.relatedArtifactIds as string[]) ?? [],
    relatedClusterIds: (row.relatedClusterIds as string[]) ?? [],
    assumptions: (row.assumptions as string[]) ?? [],
    constraintsUsed: (row.constraintsUsed as string[]) ?? [],
    scoringWeights: (row.scoringWeights as Record<string, number>) ?? {},
    alternativeRankings: (row.alternativeRankings as AlternativeRanking[]) ?? [],
    explanation: row.explanation ? (row.explanation as unknown as JudgmentExplanation) : null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

// ─── Scoring utilities ────────────────────────────────────────────────────────

/** Resolve weights: merge defaults with caller-provided custom weights.
 *  Normalises the final weights so they always sum to 1.0 */
function resolveWeights(custom?: ScoringWeights): Record<JudgmentScoreDimension, number> {
  const merged = { ...DEFAULT_SCORING_WEIGHTS, ...custom } as Record<JudgmentScoreDimension, number>;
  const total = (Object.values(merged) as number[]).reduce((a, b) => a + b, 0);
  if (total === 0) return DEFAULT_SCORING_WEIGHTS;
  const normalised = {} as Record<JudgmentScoreDimension, number>;
  for (const dim of JUDGMENT_SCORE_DIMENSIONS) {
    normalised[dim] = (merged[dim] ?? 0) / total;
  }
  return normalised;
}

/** Fill in raw scores: use caller-supplied values where present, 50 otherwise. */
function fillRawScores(raw?: RawOptionScores): Record<JudgmentScoreDimension, number> {
  const filled = {} as Record<JudgmentScoreDimension, number>;
  for (const dim of JUDGMENT_SCORE_DIMENSIONS) {
    const v = raw?.[dim];
    filled[dim] = v !== undefined ? Math.max(0, Math.min(100, v)) : 50;
  }
  return filled;
}

/** Compute effective scores: invert dimensions where lower raw = better. */
function computeEffectiveScores(
  raw: Record<JudgmentScoreDimension, number>,
): Record<JudgmentScoreDimension, number> {
  const effective = {} as Record<JudgmentScoreDimension, number>;
  for (const dim of JUDGMENT_SCORE_DIMENSIONS) {
    effective[dim] = INVERTED_DIMENSIONS.has(dim) ? 100 - raw[dim] : raw[dim];
  }
  return effective;
}

/** Compute weighted composite score (0–100). Higher = better recommendation. */
function computeComposite(
  effective: Record<JudgmentScoreDimension, number>,
  weights: Record<JudgmentScoreDimension, number>,
): number {
  let score = 0;
  for (const dim of JUDGMENT_SCORE_DIMENSIONS) {
    score += effective[dim] * weights[dim];
  }
  return Math.round(score * 100) / 100; // round to 2dp
}

/** Score a single option and return a ScoredJudgmentOption (without rank/wasSelected yet). */
function scoreOption(
  option: JudgmentOption,
  weights: Record<JudgmentScoreDimension, number>,
): Omit<ScoredJudgmentOption, "rank" | "wasSelected" | "rejectionReason"> {
  const rawScores = fillRawScores(option.scores);
  const effectiveScores = computeEffectiveScores(rawScores);
  const compositeScore = computeComposite(effectiveScores, weights);
  return {
    key: option.key,
    description: option.description,
    rawScores,
    effectiveScores,
    compositeScore,
    evidence: option.evidence ?? [],
  };
}

// ─── Explanation generator ────────────────────────────────────────────────────

/** Generate a structured explanation for the judgment.
 *  Deterministic: derived entirely from the scored options and request metadata. */
function generateExplanation(
  winner: ScoredJudgmentOption,
  losers: ScoredJudgmentOption[],
  request: JudgmentRequest,
  weights: Record<JudgmentScoreDimension, number>,
): JudgmentExplanation {
  // Top 3 dimensions where the winner excels relative to its average
  const avgEffective = JUDGMENT_SCORE_DIMENSIONS.reduce((sum, dim) => {
    return sum + (losers.length > 0
      ? losers.reduce((s, l) => s + l.effectiveScores[dim], 0) / losers.length
      : 50);
  }, 0) / JUDGMENT_SCORE_DIMENSIONS.length;

  const strengths = JUDGMENT_SCORE_DIMENSIONS
    .map((dim) => ({
      dimension: dim,
      score: winner.effectiveScores[dim],
      delta: winner.effectiveScores[dim] - (losers.length > 0
        ? losers.reduce((s, l) => s + l.effectiveScores[dim], 0) / losers.length
        : 50),
    }))
    .filter((s) => s.delta > 5)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 3)
    .map(({ dimension, score, delta }) => ({
      dimension,
      score,
      insight: INVERTED_DIMENSIONS.has(dimension)
        ? `${dimension} is ${100 - score} (${delta.toFixed(0)}pts better than alternatives)`
        : `${dimension} is ${score} (${delta.toFixed(0)}pts better than alternatives)`,
    }));

  if (strengths.length === 0) {
    // winner won by slim margin across all dimensions
    strengths.push({
      dimension: "strategicValue",
      score: winner.effectiveScores.strategicValue,
      insight: `Marginally better composite score (${winner.compositeScore.toFixed(1)}) across all dimensions`,
    });
  }

  // Rejection reasons per loser option
  const alternativeRejections = losers.map((loser) => {
    const gap = winner.compositeScore - loser.compositeScore;
    // Find the dimension with the biggest absolute disadvantage for this loser
    const weakestDim = JUDGMENT_SCORE_DIMENSIONS.reduce((worst, dim) => {
      const loserAdv = winner.effectiveScores[dim] - loser.effectiveScores[dim];
      const worstAdv = winner.effectiveScores[worst] - loser.effectiveScores[worst];
      return loserAdv > worstAdv ? dim : worst;
    }, JUDGMENT_SCORE_DIMENSIONS[0]);
    const dimLabel = INVERTED_DIMENSIONS.has(weakestDim)
      ? `higher ${weakestDim} (${loser.rawScores[weakestDim]})`
      : `lower ${weakestDim} (${loser.rawScores[weakestDim]})`;
    return {
      key: loser.key,
      reason: `Composite score ${loser.compositeScore.toFixed(1)} vs ${winner.compositeScore.toFixed(1)} (−${gap.toFixed(1)}pts); primary weakness: ${dimLabel}`,
    };
  });

  // Binding constraints: constraints that exist at all are binding
  const bindingConstraints = (request.constraints ?? []).slice(0, 3);

  // Key assumptions
  const keyAssumptions = (request.assumptions ?? []).slice(0, 3);

  // Evidence cited
  const evidenceCited = [
    ...(request.evidence ?? []),
    ...winner.evidence,
  ].slice(0, 5);

  // Confidence narrative
  const confScore = winner.rawScores.confidence;
  const confidenceNarrative =
    confScore >= 75 ? `High confidence (${confScore}/100) that this option achieves the objective.` :
    confScore >= 50 ? `Moderate confidence (${confScore}/100); outcome likely but not certain.` :
    `Low confidence (${confScore}/100); proceed with validation steps before committing.`;

  // Selection reason
  const topStrengthLabels = strengths.slice(0, 2).map((s) => s.dimension).join(" and ");
  const selectionReason =
    `"${winner.description}" was selected with composite score ${winner.compositeScore.toFixed(1)}/100. ` +
    (topStrengthLabels
      ? `It outperforms alternatives on ${topStrengthLabels}.`
      : `It achieves the best overall balance across all scoring dimensions.`);

  return {
    selectionReason,
    topStrengths: strengths,
    alternativeRejections,
    keyAssumptions,
    bindingConstraints,
    evidenceCited,
    confidenceNarrative,
  };
}

// ─── Strategic alignment summary ─────────────────────────────────────────────

/** Produce a one-sentence strategic alignment summary for the selected option. */
function computeStrategicAlignment(winner: ScoredJudgmentOption, objective: string): string {
  const sv = winner.rawScores.strategicValue;
  const alignment =
    sv >= 80 ? "strongly aligned with" :
    sv >= 60 ? "well aligned with" :
    sv >= 40 ? "partially aligned with" :
    "weakly aligned with";
  return `"${winner.description}" is ${alignment} the objective: ${objective.slice(0, 100)}`;
}

// ─── Persist ─────────────────────────────────────────────────────────────────

async function persistJudgment(
  id: string,
  request: JudgmentRequest,
  winner: ScoredJudgmentOption | null,
  allScored: ScoredJudgmentOption[],
  compositeScores: Record<string, number>,
  alternativeRankings: AlternativeRanking[],
  explanation: JudgmentExplanation | null,
  weights: Record<JudgmentScoreDimension, number>,
): Promise<ExecutiveJudgment> {
  const strategicAlignment = winner
    ? computeStrategicAlignment(winner, request.decisionObjective)
    : null;

  const opportunityScore = winner
    ? Math.round(winner.rawScores.expectedImpact * (winner.rawScores.confidence / 100))
    : null;

  const [row] = await db
    .insert(executiveJudgmentsTable)
    .values({
      id,
      userId: request.userId,
      decisionObjective: request.decisionObjective,
      status: "completed",
      version: 1,
      options: allScored as unknown as Record<string, unknown>[],
      selectedOptionKey: winner?.key ?? null,
      compositeScores,
      decisionScore: winner?.compositeScore ?? null,
      confidenceScore: winner?.rawScores.confidence ?? null,
      riskScore: winner?.rawScores.risk ?? null,
      opportunityScore,
      complexityScore: winner?.rawScores.complexity ?? null,
      strategicAlignment,
      supportingEvidence: [
        ...(request.evidence ?? []),
        ...(winner?.evidence ?? []),
      ],
      relatedContextSnapshotId: request.contextSnapshotId ?? null,
      relatedArtifactIds: request.relatedArtifactIds ?? [],
      relatedClusterIds: request.relatedClusterIds ?? [],
      assumptions: request.assumptions ?? [],
      constraintsUsed: request.constraints ?? [],
      scoringWeights: weights as Record<string, number>,
      decisionRationale: explanation?.selectionReason ?? null,
      alternativeRankings: alternativeRankings as unknown as Record<string, unknown>[],
      explanation: explanation as unknown as Record<string, unknown>,
      metadata: {},
    })
    .returning();
  if (!row) throw new Error("Failed to persist judgment");
  return rowToJudgment(row);
}

// ─── Main evaluation entry point ──────────────────────────────────────────────

/** Evaluate a decision: score all options, select a recommendation, explain.
 *
 *  This is the primary entry point for the Judgment Engine. Every Brain that
 *  needs to make a decision calls this function. The judgment is automatically
 *  persisted and consolidated into Cognitive Memory.
 *
 *  The engine never calls OpenRouter or any external service. All scoring is
 *  deterministic, transparent, and auditable.
 */
export async function evaluateJudgment(request: JudgmentRequest): Promise<ExecutiveJudgment> {
  const id = crypto.randomUUID();
  const weights = resolveWeights(request.weights);

  // Guard: need at least one option
  if (request.options.length === 0) {
    throw new Error("Judgment requires at least one option to evaluate");
  }

  // Fire pre-evaluation hook
  const enrichedRequest = await fireJudgmentHooks(
    JUDGMENT_EXTENSION_POINT_IDS.PRE_EVALUATION,
    request,
  );

  // Score all options
  const partialScored = enrichedRequest.options.map((opt) => scoreOption(opt, weights));

  // Fire post-scoring hook (future policy layers can override scores)
  const finalScored = await fireJudgmentHooks(
    JUDGMENT_EXTENSION_POINT_IDS.POST_SCORING,
    partialScored,
  );

  // Sort by composite score descending
  const sorted = [...finalScored].sort((a, b) => b.compositeScore - a.compositeScore);

  // Assign ranks and wasSelected
  const allScored: ScoredJudgmentOption[] = sorted.map((opt, idx) => ({
    ...opt,
    rank: idx + 1,
    wasSelected: idx === 0,
    rejectionReason: idx === 0 ? null : null, // filled in below
  }));

  const winner = allScored[0] ?? null;
  const losers = allScored.slice(1);

  // Pre-recommendation hook
  const { selectedKey } = await fireJudgmentHooks(
    JUDGMENT_EXTENSION_POINT_IDS.PRE_RECOMMENDATION,
    { selectedKey: winner?.key ?? null, rankedOptions: allScored },
  );

  // Resolve final winner (hook may have changed selection)
  const resolvedWinner = selectedKey !== winner?.key
    ? allScored.find((o) => o.key === selectedKey) ?? winner
    : winner;

  // Build composite scores map
  const compositeScores: Record<string, number> = {};
  for (const opt of allScored) {
    compositeScores[opt.key] = opt.compositeScore;
  }

  // Generate explanation
  const rawExplanation = winner && resolvedWinner
    ? generateExplanation(resolvedWinner, losers, enrichedRequest, weights)
    : null;

  // Post-explanation hook
  const explanation = rawExplanation
    ? await fireJudgmentHooks(JUDGMENT_EXTENSION_POINT_IDS.EXPLANATION_GENERATED, rawExplanation)
    : null;

  // Attach rejection reasons to loser options
  for (const loser of losers) {
    const rejection = explanation?.alternativeRejections.find((r) => r.key === loser.key);
    if (rejection) loser.rejectionReason = rejection.reason;
  }

  // Build alternative rankings
  const alternativeRankings: AlternativeRanking[] = allScored.map((opt) => ({
    key: opt.key,
    rank: opt.rank,
    compositeScore: opt.compositeScore,
    wasSelected: opt.key === resolvedWinner?.key,
    rejectionReason: opt.rejectionReason,
  }));

  // Persist
  const judgment = await persistJudgment(
    id,
    enrichedRequest,
    resolvedWinner,
    allScored,
    compositeScores,
    alternativeRankings,
    explanation,
    weights,
  );

  // Fire completed hook (future learning systems consume this)
  void fireJudgmentHooks(JUDGMENT_EXTENSION_POINT_IDS.JUDGMENT_COMPLETED, judgment).catch(
    (err) => logger.warn({ err }, "Judgment: JUDGMENT_COMPLETED hook failed (non-fatal)"),
  );

  // Consolidate as Cognitive Artifact — fire-and-forget, never blocks request
  void consolidate({
    id: judgment.id,
    artifactType: "judgment",
    sourceBrain: "executive-judgment",
    lifecycleStatus: "active",
    confidenceOverall:
      judgment.confidenceScore !== null
        ? judgment.confidenceScore >= 75 ? "high" :
          judgment.confidenceScore >= 50 ? "medium" : "low"
        : "unknown",
    confidenceReasoning: "medium",
    confidenceCapability: "medium",
    confidenceBrainSelection: "medium",
    brainsSelected: ["executive-judgment"],
    capabilitiesUsed: ["decision-scoring", "trade-off-evaluation", "explanation-generation"],
    evidence: judgment.supportingEvidence,
    executiveBrainVersion: "1.1.0",
    content: {
      decisionObjective: judgment.decisionObjective,
      selectedOptionKey: judgment.selectedOptionKey,
      decisionScore: judgment.decisionScore,
      explanation: judgment.explanation,
      alternativeRankings: judgment.alternativeRankings,
    },
    relationships: judgment.relatedContextSnapshotId
      ? { contextSnapshot: judgment.relatedContextSnapshotId }
      : {},
    metadata: { judgmentId: judgment.id },
    objectiveText: judgment.decisionObjective,
    userId: judgment.userId ?? undefined,
  }).catch((err) => {
    logger.warn({ err, judgmentId: judgment.id }, "Judgment: cognitive memory consolidation failed (non-fatal)");
  });

  logger.debug(
    {
      judgmentId: judgment.id,
      userId: request.userId,
      selectedKey: resolvedWinner?.key,
      compositeScore: resolvedWinner?.compositeScore,
      optionCount: allScored.length,
    },
    "Executive judgment evaluated and persisted",
  );

  return judgment;
}

// ─── Retrieval ────────────────────────────────────────────────────────────────

/** Retrieve a persisted judgment by id. */
export async function getJudgment(id: string): Promise<ExecutiveJudgment | null> {
  const rows = await db
    .select()
    .from(executiveJudgmentsTable)
    .where(eq(executiveJudgmentsTable.id, id))
    .limit(1);
  return rows[0] ? rowToJudgment(rows[0]) : null;
}

/** Return recent judgments for a user, newest first. */
export async function listJudgments(
  userId: number,
  limit = 20,
): Promise<ExecutiveJudgment[]> {
  const rows = await db
    .select()
    .from(executiveJudgmentsTable)
    .where(eq(executiveJudgmentsTable.userId, userId))
    .orderBy(desc(executiveJudgmentsTable.createdAt))
    .limit(limit);
  return rows.map(rowToJudgment);
}

// ─── Pure comparison (no persistence) ─────────────────────────────────────────

/** Compare options and return rankings without persisting a judgment.
 *  Used by the /compare API endpoint. */
export function compareOptions(
  decisionObjective: string,
  options: JudgmentOption[],
  weights?: ScoringWeights,
) {
  const resolved = resolveWeights(weights);
  const scored = options
    .map((opt) => ({
      ...scoreOption(opt, resolved),
      rank: 0,
      wasSelected: false,
      rejectionReason: null as string | null,
      evidence: opt.evidence ?? [],
    }))
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .map((opt, idx) => ({ ...opt, rank: idx + 1, wasSelected: idx === 0 }));

  const compositeScores: Record<string, number> = {};
  for (const opt of scored) compositeScores[opt.key] = opt.compositeScore;

  return {
    decisionObjective,
    rankedOptions: scored,
    recommendedKey: scored[0]?.key ?? null,
    compositeScores,
    weightsUsed: resolved,
  };
}
