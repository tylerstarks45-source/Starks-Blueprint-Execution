// ── Build 037: Executive Trade-off Intelligence Engine — Public Barrel ────
export { declareTradeoffIntelligenceExtensionPoints } from "./eti-extension-points";
export { validateConstraintSet, detectConstraintViolations, summariseConstraints, computeConstraintComplianceScore, getPlatformDefaultConstraints } from "./eti-constraint-engine";
export { normalizeWeights, scoreOption, scoreAllOptions, rankOptions, generateObjectiveExplanation } from "./eti-optimization-engine";
export { buildTradeoffMatrix, markDominanceOnMatrix } from "./eti-matrix-engine";
export { computeDecisionFrontier, computeFrontierDiversity } from "./eti-frontier-engine";
export { runSensitivityAnalysis, hasCriticalSensitivity } from "./eti-sensitivity-engine";
export { buildExecutiveRecommendation } from "./eti-recommendation-engine";
export { evaluateTradeoff, runTradeoffPlatformRebuild, buildTradeoffIntelligenceSummary } from "./eti-orchestrator";
export type {
  DecisionType,
  ContextDomain,
  ConstraintType,
  ConstraintSeverity,
  ObjectiveKey,
  TargetDirection,
  ChangeType,
  RiskTolerance,
  TimeHorizon,
  TradeoffOption,
  TradeoffConstraint,
  TradeoffObjective,
  TradeoffEvaluationRequest,
  MatrixRow,
  FrontierResult,
  SensitivityResult,
  ExecutiveRecommendation,
  TradeoffEvaluationResult,
  TradeoffIntelligenceSummary,
} from "./types";
