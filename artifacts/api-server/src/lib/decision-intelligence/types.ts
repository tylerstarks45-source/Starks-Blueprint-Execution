// ─── Build 019: Decision Intelligence Engine — Types ─────────────────────────

// ── Extension Point IDs ───────────────────────────────────────────────────────

export const EP_DECISION_SCENARIO_COMPARED   = "decision-scenario-compared";
export const EP_DECISION_MATRIX_COMPUTED     = "decision-matrix-computed";
export const EP_DECISION_ALIGNMENT_SCORED    = "decision-alignment-scored";
export const EP_DECISION_TRADEOFF_ANALYZED   = "decision-tradeoff-analyzed";
export const EP_DECISION_CONFIDENCE_COMPUTED = "decision-confidence-computed";
export const EP_DECISION_SELECTED            = "decision-selected";
export const EP_DECISION_REPORT_GENERATED    = "decision-report-generated";
export const EP_DECISION_REGISTRY_UPDATED    = "decision-registry-updated";

// ── Decision Type ─────────────────────────────────────────────────────────────

export type DecisionType = "primary" | "alternative" | "rejected";

// ── Matrix Criteria ───────────────────────────────────────────────────────────

export type MatrixCriterion =
  | "business_goals"
  | "executive_policies"
  | "governance_rules"
  | "risk_tolerance"
  | "resource_availability"
  | "financial_capacity"
  | "user_priorities";

export const MATRIX_CRITERIA: MatrixCriterion[] = [
  "business_goals",
  "executive_policies",
  "governance_rules",
  "risk_tolerance",
  "resource_availability",
  "financial_capacity",
  "user_priorities",
];

export const CRITERION_WEIGHTS: Record<MatrixCriterion, number> = {
  business_goals:       0.22,
  executive_policies:   0.18,
  governance_rules:     0.16,
  risk_tolerance:       0.15,
  resource_availability: 0.13,
  financial_capacity:   0.10,
  user_priorities:      0.06,
};

// ── Strategic Alignment Dimensions ───────────────────────────────────────────

export type AlignmentDimension =
  | "revenue_growth"
  | "profitability"
  | "automation"
  | "scalability"
  | "customer_growth"
  | "operational_stability"
  | "long_term_vision";

export const ALIGNMENT_DIMENSIONS: AlignmentDimension[] = [
  "revenue_growth",
  "profitability",
  "automation",
  "scalability",
  "customer_growth",
  "operational_stability",
  "long_term_vision",
];

// ── Tradeoff Categories ───────────────────────────────────────────────────────

export type TradeoffCategory =
  | "benefit"
  | "cost"
  | "risk"
  | "compromise"
  | "dependency"
  | "opportunity_cost";

export type TimeHorizon = "short" | "medium" | "long";

export type RationaleType = "selection" | "rejection" | "preference" | "concern";

// ── Comparison result for two scenarios ──────────────────────────────────────

export interface ScenarioComparison {
  scenarioIdA: string;
  scenarioIdB: string;
  scenarioTypeA: string;
  scenarioTypeB: string;
  dimensionScores: {
    expectedValue: { a: number; b: number; winner: "a" | "b" | "tie" };
    risk:          { a: number; b: number; winner: "a" | "b" | "tie" };
    confidence:    { a: number; b: number; winner: "a" | "b" | "tie" };
    complexity:    { a: number; b: number; winner: "a" | "b" | "tie" };
    resourceDemand:{ a: number; b: number; winner: "a" | "b" | "tie" };
    timeHorizon:   { a: number; b: number; winner: "a" | "b" | "tie" };
  };
  overallWinner: "a" | "b" | "tie";
  marginOfDifference: number;
}

// ── Matrix row ────────────────────────────────────────────────────────────────

export interface MatrixRow {
  id: string;
  reportId: string;
  businessId: number;
  criterion: MatrixCriterion;
  criterionWeight: number;
  scenarioId: string;
  scenarioType: string;
  rawScore: number;
  weightedScore: number;
  notes: string;
}

// ── Alignment profile for a scenario ─────────────────────────────────────────

export interface AlignmentProfile {
  dimension: AlignmentDimension;
  score: number;    // 0..1
  evidence: string;
}

export interface StrategicAlignment {
  scenarioId: string;
  scenarioType: string;
  dimensions: AlignmentProfile[];
  overallAlignmentScore: number;
}

// ── Tradeoff ──────────────────────────────────────────────────────────────────

export interface DecisionTradeoff {
  id: string;
  decisionId: string;
  reportId: string;
  businessId: number;
  tradeoffCategory: TradeoffCategory;
  title: string;
  description: string;
  magnitude: number;
  certainty: number;
  timeHorizon: TimeHorizon;
}

// ── Confidence record ─────────────────────────────────────────────────────────

export interface DecisionConfidenceRecord {
  id: string;
  decisionId: string;
  reportId: string;
  businessId: number;
  decisionConfidence: number;
  evidenceScore: number;
  dataCompleteness: number;
  assumptionStability: number;
  policyCompliance: number;
  overallConfidence: number;
  confidenceNarrative: string;
}

// ── Rationale ─────────────────────────────────────────────────────────────────

export interface DecisionRationale {
  id: string;
  decisionId: string;
  reportId: string;
  businessId: number;
  rationaleType: RationaleType;
  dimension: string;
  title: string;
  explanation: string;
  weight: number;
  supportingEvidence: string[];
}

// ── Executive Decision ────────────────────────────────────────────────────────

export interface ExecutiveDecision {
  id: string;
  reportId: string;
  businessId: number;
  userId?: number;
  scenarioId: string;
  scenarioName: string;
  scenarioType: string;
  decisionType: DecisionType;
  rankPosition: number;
  selectionScore: number;
  expectedValueScore: number;
  strategicAlignmentScore: number;
  riskScore: number;
  confidenceScore: number;
  complexityScore: number;
  resourceDemand: number;
  governanceCompliant: boolean;
  goalAlignmentScore: number;
  rejectionReason?: string;
  alignmentProfile: AlignmentProfile[];
  tradeoffSummary: TradeoffSummary;
  rationales: DecisionRationale[];
  tradeoffs: DecisionTradeoff[];
  confidence: DecisionConfidenceRecord;
  createdAt: Date;
}

// ── Tradeoff summary ──────────────────────────────────────────────────────────

export interface TradeoffSummary {
  benefits: string[];
  costs: string[];
  risks: string[];
  compromises: string[];
  dependencies: string[];
  opportunityCosts: string[];
}

// ── Decision Report ───────────────────────────────────────────────────────────

export interface DecisionReport {
  id: string;
  businessId: number;
  userId?: number;
  simulationReportId?: string;
  primaryDecision: ExecutiveDecision;
  alternativeDecisions: ExecutiveDecision[];
  rejectedDecisions: ExecutiveDecision[];
  overallConfidence: number;
  strategicAlignmentScore: number;
  executiveSummary: string;
  decisionDurationMs: number;
  createdAt: Date;
}

// ── Decision Summary (for EB advisory) ───────────────────────────────────────

export interface DecisionSummary {
  businessId: number;
  primaryScenarioType: string;
  primaryScenarioName: string;
  primarySelectionScore: number;
  primaryAlignmentScore: number;
  primaryConfidence: number;
  alternativeCount: number;
  rejectedCount: number;
  latestReportId: string;
  topTradeoffSummary: string;   // one-line narrative
  lastDecidedAt: Date;
}

// ── Scored scenario for selection ─────────────────────────────────────────────

export interface ScoredScenario {
  scenarioId: string;
  scenarioName: string;
  scenarioType: string;
  expectedValueScore: number;
  riskScore: number;
  overallConfidence: number;
  executionComplexity: number;
  growthPotential: number;
  automationPotential: number;
  resourceDemand: number;          // derived from executionComplexity
  matrixScore: number;             // from decision matrix
  alignmentScore: number;          // from strategic alignment
  compositeScore: number;          // final ranking score
  governanceCompliant: boolean;
  rejectionReason?: string;
}
