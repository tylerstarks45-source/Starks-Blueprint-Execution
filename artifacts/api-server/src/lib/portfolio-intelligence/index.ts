// ── Build 038: Executive Portfolio Intelligence Engine — Public Barrel ────
export { declarePortfolioIntelligenceExtensionPoints } from "./epi-extension-points";
export { constructPortfolio, buildDependencyMap, identifyCriticalPath, markParetoCuts, computeBucketRatios, computeHorizonRatios, computeThemeRatios, computeTypeRatios } from "./epi-construction-engine";
export { computeAllAllocations, isPortfolioOvercommitted, getOvercommittedResources, computeAllocationHealthScore } from "./epi-allocation-engine";
export { computePortfolioBalance } from "./epi-balance-engine";
export { detectAllExposures, computeCompositeExposureScore } from "./epi-exposure-engine";
export { computePortfolioCapacity, identifyPortfolioGaps, identifyExecutionBottlenecks } from "./epi-capacity-engine";
export { buildPortfolioRecommendations } from "./epi-recommendation-engine";
export { evaluatePortfolio, runPortfolioPlatformRebuild, buildPortfolioIntelligenceSummary } from "./epi-orchestrator";
export type {
  PortfolioDomain,
  InitiativeType,
  StrategicTheme,
  InvestmentBucket,
  InitiativeStatus,
  RiskLevel,
  Horizon,
  ExposureType,
  RecommendationType,
  RecommendationPriority,
  ResourceType,
  ResourceDemand,
  TotalResources,
  PortfolioInitiativeInput,
  PortfolioConstraintInput,
  PortfolioEvaluationRequest,
  AllocationResult,
  BalanceResult,
  ExposureResult,
  CapacityResult,
  PortfolioRecommendationResult,
  PortfolioHealthScores,
  PortfolioEvaluationResult,
  PortfolioIntelligenceSummary,
} from "./types";
