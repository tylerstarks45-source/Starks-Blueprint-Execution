// ── Build 037: Executive Trade-off Intelligence Engine — Types ────────────

export type DecisionType =
  | "build-vs-buy"
  | "speed-vs-quality"
  | "cost-vs-performance"
  | "risk-vs-reward"
  | "innovation-vs-stability"
  | "automation-vs-manual"
  | "growth-vs-sustainability"
  | "security-vs-usability"
  | "capital-vs-operating"
  | "simplicity-vs-flexibility"
  | "infrastructure-vs-cloud"
  | "latency-vs-cost"
  | "custom";

export type ContextDomain =
  | "technology"
  | "business"
  | "execution"
  | "infrastructure"
  | "product"
  | "operations";

export type ConstraintType =
  | "budget"
  | "timeline"
  | "risk"
  | "skills"
  | "infrastructure"
  | "compliance"
  | "business"
  | "operational";

export type ConstraintSeverity = "hard" | "soft" | "preference";

export type ObjectiveKey =
  | "cost"
  | "performance"
  | "speed"
  | "quality"
  | "risk"
  | "reward"
  | "simplicity"
  | "flexibility"
  | "short_term"
  | "long_term"
  | "innovation"
  | "stability"
  | "growth"
  | "sustainability"
  | "security"
  | "usability"
  | "latency"
  | "automation"
  | "build"
  | "buy";

export type TargetDirection = "minimize" | "maximize" | "balance";

export type ChangeType = "relax" | "tighten" | "remove" | "add";

export type RiskTolerance = "low" | "moderate" | "high";

export type TimeHorizon = "short" | "medium" | "long";

// ── Input types (for POST endpoints) ──────────────────────────────────────

export interface TradeoffOption {
  key:         string;
  name:        string;
  description: string;
  scores:      Partial<Record<ObjectiveKey, number>>; // 0–1 per objective
}

export interface TradeoffConstraint {
  key:         string;
  type:        ConstraintType;
  name:        string;
  value:       string;
  unit?:       string;
  severity:    ConstraintSeverity;
  relatesTo?:  string[];
  notes?:      string;
}

export interface TradeoffObjective {
  objective:  ObjectiveKey;
  weight:     number;  // 0–1; all weights must sum to 1
  direction:  TargetDirection;
  rationale:  string;
}

export interface TradeoffEvaluationRequest {
  scenarioKey:   string;
  title:         string;
  description:   string;
  decisionType:  DecisionType;
  contextDomain: ContextDomain;
  options:       TradeoffOption[];
  constraints:   TradeoffConstraint[];
  objectives:    TradeoffObjective[];
  userId?:       number;
}

// ── Computed types ─────────────────────────────────────────────────────────

export interface MatrixRow {
  optionKey:            string;
  optionName:           string;
  optionDescription:    string;
  objectiveScores:      Record<string, number>;
  constraintViolations: string[];
  weightedCompositeScore: number;
  rawCompositeScore:    number;
  dominanceRank:        number;
  isOnFrontier:         boolean;
  explanations:         { objective: string; score: number; reason: string }[];
}

export interface FrontierResult {
  frontierOptions:      { key: string; name: string; score: number }[];
  dominatedOptions:     { key: string; name: string; dominatedBy: string }[];
  frontierSize:         number;
  dominatedCount:       number;
  objectivesConsidered: string[];
  frontierExplanation:  string;
  recommendedFromFrontier?: string;
}

export interface SensitivityResult {
  changedConstraint:        string;
  changeType:               ChangeType;
  changeDescription:        string;
  originalRecommendation:   string;
  sensitizedRecommendation: string;
  recommendationChanged:    boolean;
  sensitivityScore:         number;
  affectedObjectives:       string[];
  analysis:                 string;
}

export interface ExecutiveRecommendation {
  recommendedOption:    string;
  recommendedName:      string;
  runnerUpOption:       string | null;
  runnerUpName:         string | null;
  rejectedOptions:      { key: string; name: string; reason: string }[];
  tradeoffExplanation:  string;
  whyWon:               string;
  whyLost:              Record<string, string>;
  keyAssumptions:       string[];
  sensitivityFlag:      boolean;
  confidenceScore:      number;
  executiveLawApplied:  boolean;
}

export interface TradeoffEvaluationResult {
  scenarioId:      number;
  scenarioKey:     string;
  matrix:          MatrixRow[];
  frontier:        FrontierResult;
  sensitivities:   SensitivityResult[];
  recommendation:  ExecutiveRecommendation;
}

// ── EB summary ─────────────────────────────────────────────────────────────

export interface TradeoffIntelligenceSummary {
  totalEvaluations:        number;
  recentEvaluations:       number;
  frontierDecisions:       number;
  highConfidenceDecisions: number;
  sensitivitiesDetected:   number;
  averageConfidenceScore:  number;
  topDecisionType:         string | null;
  topConstraintType:       string | null;
  recentRecommendations:   {
    scenarioKey:  string;
    title:        string;
    recommended:  string;
    confidence:   number;
    sensitive:    boolean;
  }[];
  pendingDecisions:        string[];
  executiveLawCompliance:  number; // 0–1, fraction with executiveLawApplied=true
}

// ── EP IDs ─────────────────────────────────────────────────────────────────

export const ETI_EP_IDS = {
  CONSTRAINT_MODELING:   "eti.constraint.modeling",
  OBJECTIVE_OPTIMIZATION:"eti.objective.optimization",
  MATRIX_BUILDING:       "eti.matrix.building",
  FRONTIER_DETECTION:    "eti.frontier.detection",
  SENSITIVITY_ANALYSIS:  "eti.sensitivity.analysis",
  RECOMMENDATION:        "eti.executive.recommendation",
  ORCHESTRATION:         "eti.orchestration",
  ADVISORY:              "eti.advisory",
} as const;
