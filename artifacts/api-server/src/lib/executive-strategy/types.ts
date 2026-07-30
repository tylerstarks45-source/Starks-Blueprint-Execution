// ─── Build 020: Executive Strategy Engine — Types ────────────────────────────

// ── Extension Point IDs ───────────────────────────────────────────────────────

export const EP_STRATEGY_FORMED               = "strategy-formed";
export const EP_STRATEGY_PILLAR_DEFINED       = "strategy-pillar-defined";
export const EP_STRATEGY_OBJECTIVE_DEFINED    = "strategy-objective-defined";
export const EP_STRATEGY_DEPENDENCY_IDENTIFIED = "strategy-dependency-identified";
export const EP_STRATEGY_CONSTRAINT_EVALUATED  = "strategy-constraint-evaluated";
export const EP_STRATEGY_ALIGNMENT_MEASURED   = "strategy-alignment-measured";
export const EP_STRATEGY_EVALUATED            = "strategy-evaluated";
export const EP_STRATEGY_REPORT_GENERATED     = "strategy-report-generated";

// ── Enumerations ──────────────────────────────────────────────────────────────

export type PillarType =
  | "revenue_growth"
  | "operational_excellence"
  | "customer_experience"
  | "innovation"
  | "technology"
  | "market_expansion"
  | "talent"
  | "financial_strength"
  | "governance";

export const ALL_PILLAR_TYPES: PillarType[] = [
  "revenue_growth",
  "operational_excellence",
  "customer_experience",
  "innovation",
  "technology",
  "market_expansion",
  "talent",
  "financial_strength",
  "governance",
];

export type DependencyType =
  | "cross_functional"
  | "business"
  | "technology"
  | "financial"
  | "people";

export type ConstraintType =
  | "budget"
  | "capacity"
  | "technology"
  | "governance"
  | "legal"
  | "time";

export type AlignmentDimension =
  | "business_vision"
  | "mission"
  | "goals"
  | "executive_decisions"
  | "business_health"
  | "opportunity_portfolio";

export type TimeHorizon = "short" | "medium" | "long";
export type SeverityLevel = "low" | "medium" | "high" | "critical";
export type ImpactLevel = "low" | "medium" | "high" | "blocking";
export type BusinessImpact = "low" | "medium" | "high";

// ── Strategic Pillar ──────────────────────────────────────────────────────────

export interface StrategicPillar {
  id: string;
  strategyId: string;
  reportId: string;
  businessId: number;
  pillarType: PillarType;
  pillarName: string;
  pillarDescription: string;
  priority: number;          // 1 highest
  weight: number;            // 0..1 proportion
  alignmentScore: number;
  objectives: StrategicObjective[];
}

// ── Strategic Objective ───────────────────────────────────────────────────────

export interface StrategicObjective {
  id: string;
  pillarId: string;
  strategyId: string;
  reportId: string;
  businessId: number;
  objectiveName: string;
  objectiveDescription: string;
  successCriteria: string;
  timeframe: TimeHorizon;
  priority: number;
  alignmentScore: number;
  confidence: number;
  businessImpact: BusinessImpact;
}

// ── Strategic Dependency ──────────────────────────────────────────────────────

export interface StrategicDependency {
  id: string;
  strategyId: string;
  reportId: string;
  businessId: number;
  dependencyType: DependencyType;
  title: string;
  description: string;
  severity: SeverityLevel;
  mitigationNote?: string;
}

// ── Strategic Constraint ──────────────────────────────────────────────────────

export interface StrategicConstraint {
  id: string;
  strategyId: string;
  reportId: string;
  businessId: number;
  constraintType: ConstraintType;
  title: string;
  description: string;
  impact: ImpactLevel;
  adaptationNote?: string;
}

// ── Alignment Profile ─────────────────────────────────────────────────────────

export interface StrategyAlignmentProfile {
  dimension: AlignmentDimension;
  score: number;          // 0..1
  evidence: string;
}

// ── Strategy Evaluation ───────────────────────────────────────────────────────

export interface StrategyEvaluation {
  completenessScore: number;
  alignmentScore: number;
  riskScore: number;
  businessValueScore: number;
  sustainabilityScore: number;
  confidenceScore: number;
  overallScore: number;
  evaluationNarrative: string;
}

// ── Executive Strategy ────────────────────────────────────────────────────────

export interface ExecutiveStrategy {
  id: string;
  reportId: string;
  businessId: number;
  userId?: number;
  decisionId?: string;
  scenarioType: string;
  strategyName: string;
  strategyDescription: string;
  strategicVision: string;
  competitivePositioning: string;
  timeHorizon: TimeHorizon;
  pillars: StrategicPillar[];
  dependencies: StrategicDependency[];
  constraints: StrategicConstraint[];
  alignmentProfile: StrategyAlignmentProfile[];
  evaluation: StrategyEvaluation;
  createdAt: Date;
}

// ── Strategy Report ───────────────────────────────────────────────────────────

export interface StrategyReport {
  id: string;
  businessId: number;
  userId?: number;
  decisionReportId?: string;
  strategy: ExecutiveStrategy;
  overallAlignmentScore: number;
  overallConfidence: number;
  completenessScore: number;
  businessValueScore: number;
  sustainabilityScore: number;
  executiveSummary: string;
  strategyDurationMs: number;
  createdAt: Date;
}

// ── Strategy Summary (for EB advisory) ───────────────────────────────────────

export interface StrategySummary {
  businessId: number;
  scenarioType: string;
  strategyName: string;
  topPillarTypes: PillarType[];
  alignmentScore: number;
  confidenceScore: number;
  objectiveCount: number;
  pillarCount: number;
  latestReportId: string;
  strategicVisionSummary: string;
  lastStrategyAt: Date;
}

// ── Strategy formation input ──────────────────────────────────────────────────

export interface StrategyFormationInput {
  decisionId?: string;
  scenarioType: string;
  scenarioName: string;
  selectionScore: number;
  alignmentScore: number;
  confidenceScore: number;
  riskScore: number;
  expectedValueScore: number;
  growthPotential: number;
  automationPotential: number;
}
