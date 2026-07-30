// ─── Executive Judgment Engine — Types (Build 007) ──────────────────────────
//
// All shared types for the Executive Judgment Engine. Self-contained: defines
// constants and interfaces directly (following the Build 006 pattern) rather
// than re-exporting from the DB schema, keeping the application type layer
// decoupled from the persistence layer.

// ─── Score dimension constants ────────────────────────────────────────────────

/** The ten scoring dimensions applied to every judgment option. */
export const JUDGMENT_SCORE_DIMENSIONS = [
  "strategicValue",  // how well the option advances long-term goals — higher is better
  "risk",            // probability × severity of adverse outcomes — lower is better (inverted)
  "cost",            // resources required (time, money, effort) — lower is better (inverted)
  "complexity",      // how hard the option is to execute — lower is better (inverted)
  "confidence",      // certainty that the option achieves its objective — higher is better
  "expectedImpact",  // magnitude of positive outcomes — higher is better
  "urgency",         // how time-critical the decision is — higher is better
  "reversibility",   // ease of undoing if wrong (100 = fully reversible) — higher is better
  "resourceDemand",  // load on existing capacity — lower is better (inverted)
  "timeSensitivity", // how quickly results are realised — higher is better
] as const;
export type JudgmentScoreDimension = (typeof JUDGMENT_SCORE_DIMENSIONS)[number];

// Dimensions where a LOWER raw score means BETTER outcome.
// These are inverted (100 - raw) before weighting so "higher = better"
// is true for the composite calculation.
export const INVERTED_DIMENSIONS = new Set<JudgmentScoreDimension>([
  "risk",
  "cost",
  "complexity",
  "resourceDemand",
]);

/** Default weights — sum to exactly 1.0. Configurable per judgment request. */
export const DEFAULT_SCORING_WEIGHTS: Record<JudgmentScoreDimension, number> = {
  strategicValue: 0.20,
  risk:           0.15,
  cost:           0.10,
  complexity:     0.10,
  confidence:     0.15,
  expectedImpact: 0.15,
  urgency:        0.05,
  reversibility:  0.05,
  resourceDemand: 0.03,
  timeSensitivity:0.02,
};

// ─── Judgment status ──────────────────────────────────────────────────────────

export const JUDGMENT_STATUSES = ["pending", "completed", "superseded"] as const;
export type JudgmentStatus = (typeof JUDGMENT_STATUSES)[number];

// ─── Input shapes ─────────────────────────────────────────────────────────────

/** Raw scores provided by the caller for one option.
 *  All values 0–100. Missing dimensions default to 50 (neutral). */
export type RawOptionScores = Partial<Record<JudgmentScoreDimension, number>>;

/** One option submitted to the Judgment Engine for evaluation. */
export interface JudgmentOption {
  /** Short unique key used in rankings and explanations (e.g. "expand_now"). */
  key: string;
  /** Human-readable description of this option. */
  description: string;
  /** Optional caller-supplied dimension scores (0–100 each). */
  scores?: RawOptionScores;
  /** Extra free-text evidence for this specific option. */
  evidence?: string[];
}

/** Configurable scoring weights for a judgment request.
 *  Any unspecified dimension uses the default weight. */
export type ScoringWeights = Partial<Record<JudgmentScoreDimension, number>>;

/** The full input to the Judgment Engine. */
export interface JudgmentRequest {
  /** The user requesting the judgment. */
  userId: number;
  /** One-sentence description of what decision is being made. */
  decisionObjective: string;
  /** The options to evaluate (at least 1, typically 2–5). */
  options: JudgmentOption[];
  /** Optional: context snapshot id from Build 006. */
  contextSnapshotId?: string;
  /** Optional: custom scoring weights. */
  weights?: ScoringWeights;
  /** Known assumptions at decision time. */
  assumptions?: string[];
  /** Active constraints that must be respected. */
  constraints?: string[];
  /** General evidence supporting the decision environment. */
  evidence?: string[];
  /** IDs of related cognitive artifacts (Build 004). */
  relatedArtifactIds?: string[];
  /** IDs of related knowledge clusters (Build 005). */
  relatedClusterIds?: string[];
}

// ─── Computed shapes ──────────────────────────────────────────────────────────

/** Per-option scores after the engine has filled in defaults and computed
 *  the composite. Stored in the JSONB `options` column. */
export interface ScoredJudgmentOption {
  key: string;
  description: string;
  /** Raw scores for each dimension (0–100). Defaults filled in. */
  rawScores: Record<JudgmentScoreDimension, number>;
  /** Effective scores after inversion for inverted dimensions. */
  effectiveScores: Record<JudgmentScoreDimension, number>;
  /** The final weighted composite score (0–100). Higher = better. */
  compositeScore: number;
  /** Rank within this judgment (1 = best). */
  rank: number;
  /** Whether this option was selected as the recommendation. */
  wasSelected: boolean;
  /** If rejected, one-sentence reason. */
  rejectionReason: string | null;
  /** Option-specific evidence. */
  evidence: string[];
}

/** One entry in the alternative rankings list. */
export interface AlternativeRanking {
  key: string;
  rank: number;
  compositeScore: number;
  wasSelected: boolean;
  rejectionReason: string | null;
}

/** Structured explanation produced for every judgment. */
export interface JudgmentExplanation {
  /** Why this option was selected. */
  selectionReason: string;
  /** The top scoring dimensions that made the winner stand out. */
  topStrengths: Array<{ dimension: JudgmentScoreDimension; score: number; insight: string }>;
  /** Why each alternative was not selected. */
  alternativeRejections: Array<{ key: string; reason: string }>;
  /** Which assumptions most influenced the outcome. */
  keyAssumptions: string[];
  /** Which constraints ruled out or penalised options. */
  bindingConstraints: string[];
  /** Evidence cited in support of the recommendation. */
  evidenceCited: string[];
  /** Overall confidence narrative. */
  confidenceNarrative: string;
}

// ─── The Judgment model ───────────────────────────────────────────────────────

/** The complete output of the Judgment Engine for one decision. */
export interface ExecutiveJudgment {
  id: string;
  userId: number | null;
  decisionObjective: string;
  status: string;
  version: number;
  /** Scored and ranked options. */
  options: ScoredJudgmentOption[];
  selectedOptionKey: string | null;
  /** Map of {optionKey → compositeScore}. */
  compositeScores: Record<string, number>;
  // Aggregate judgment metrics (derived from the selected option)
  decisionScore: number | null;
  confidenceScore: number | null;
  riskScore: number | null;
  opportunityScore: number | null;
  complexityScore: number | null;
  strategicAlignment: string | null;
  // Context references
  supportingEvidence: string[];
  relatedContextSnapshotId: string | null;
  relatedArtifactIds: string[];
  relatedClusterIds: string[];
  // Judgment inputs
  assumptions: string[];
  constraintsUsed: string[];
  scoringWeights: Record<string, number>;
  // Judgment outputs
  decisionRationale: string | null;
  alternativeRankings: AlternativeRanking[];
  explanation: JudgmentExplanation | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Diagnostics ─────────────────────────────────────────────────────────────

/** Per-judgment diagnostic scores. All values 0–100. */
export interface JudgmentHealthScore {
  judgmentId: string;
  decisionObjective: string;
  explanationCompleteness: number;
  confidenceQuality: number;
  evidenceQuality: number;
  alternativeCoverage: number;
  scoreConsistency: number;
  decisionTraceability: number;
  overallHealth: number;
}

/** Aggregate diagnostics for a user's judgment history. */
export interface JudgmentDiagnosticsReport {
  userId: number;
  totalJudgments: number;
  completedJudgments: number;
  averageDecisionScore: number;
  averageConfidenceScore: number;
  averageHealth: number;
  judgmentScores: JudgmentHealthScore[];
  issues: string[];
  assessedAt: Date;
}

// ─── Comparison result ────────────────────────────────────────────────────────

/** Result of a pure option comparison without full judgment persistence. */
export interface OptionComparisonResult {
  decisionObjective: string;
  rankedOptions: ScoredJudgmentOption[];
  recommendedKey: string | null;
  compositeScores: Record<string, number>;
  weightsUsed: Record<JudgmentScoreDimension, number>;
}

// ─── Extension point types ────────────────────────────────────────────────────

export type JudgmentHookHandler<T = unknown> = (payload: T) => Promise<T>;

/** Extension point IDs for the Judgment Engine. */
export const JUDGMENT_EXTENSION_POINT_IDS = {
  PRE_EVALUATION:         "judgment-pre-evaluation",
  POST_SCORING:           "judgment-post-scoring",
  PRE_RECOMMENDATION:     "judgment-pre-recommendation",
  EXPLANATION_GENERATED:  "judgment-explanation-generated",
  JUDGMENT_COMPLETED:     "judgment-completed",
} as const;
export type JudgmentExtensionPointId =
  (typeof JUDGMENT_EXTENSION_POINT_IDS)[keyof typeof JUDGMENT_EXTENSION_POINT_IDS];
