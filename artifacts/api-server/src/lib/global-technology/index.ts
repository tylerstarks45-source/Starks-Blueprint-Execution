// ── Build 033: Global Technology Intelligence Engine — Public Barrel ─────
export { declareGlobalTechnologyExtensionPoints } from "./gti-extension-points";
export { discoverTechnologies, discoverProviders, TECHNOLOGY_CATALOG, PROVIDER_CATALOG } from "./gti-discovery-engine";
export { classifyTechnology, groupByCategory, countByCategory } from "./gti-classification-engine";
export { assessCompatibility, assessAllCompatibility } from "./gti-compatibility-engine";
export { benchmarkTechnology, benchmarkAll } from "./gti-benchmark-engine";
export { generateRecommendation, generateAllRecommendations, identifyOpportunities } from "./gti-recommendation-engine";
export { runCatalogRefresh, buildTechnologySummary } from "./gti-orchestrator";
export type {
  TechnologyCategory,
  MaturityLevel,
  CompatibilityLevel,
  IntegrationComplexity,
  RecommendationType,
  RecommendationPriority,
  TechnologyReadiness,
  TechnologyCapabilityType,
  TechnologyEntry,
  ProviderEntry,
  BenchmarkScores,
  CompatibilityAssessment,
  TechnologyOpportunity,
  TechnologyRecommendationRecord,
  GlobalTechnologySummary,
} from "./types";
