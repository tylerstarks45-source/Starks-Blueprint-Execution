// ── Build 035: Technology Evolution Intelligence Engine — Public Barrel ────
export { declareTechnologyEvolutionExtensionPoints } from "./tei-extension-points";
export { getLifecycleCatalog, computeOverallMaturity, getDeprecationCandidates, getEmergingTechnologies } from "./tei-lifecycle-engine";
export { getTrendCatalog, getTrendLeaders } from "./tei-trend-engine";
export { getVelocityCatalog, computeVelocityScore } from "./tei-velocity-engine";
export { getAdoptionCatalog, computeCompositeAdoptionScore } from "./tei-adoption-engine";
export { getOutlookCatalog, getUpgradePriorities, getCriticalRiskTechnologies } from "./tei-outlook-engine";
export { generateAllEvolutionRecommendations } from "./tei-recommendation-engine";
export { runEvolutionRebuild, buildEvolutionSummary } from "./tei-orchestrator";
export type {
  LifecycleStage,
  TrendDirection,
  ReleaseFrequency,
  BreakingChangeFrequency,
  AdoptionStage,
  SupportStatus,
  Fortune500Presence,
  OpenSourceHealth,
  EcosystemSize,
  ReplacementLikelihood,
  UpgradeUrgency,
  StrategicRelevance,
  RiskLevel,
  EvolutionRecommendationType,
  ChangeEventType,
  TechnologyEvolutionProfile,
  TechnologyEvolutionSummary,
} from "./types";
