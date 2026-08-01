// ── Build 033: Global Technology Intelligence Engine ───────────────────────
// Types are self-contained. No re-exports from @workspace/db.

// ── Technology Categories (20 from spec) ───────────────────────────────────
export type TechnologyCategory =
  | "ai_provider"
  | "cloud_provider"
  | "developer_tool"
  | "browser_technology"
  | "operating_system"
  | "database"
  | "vector_database"
  | "search_technology"
  | "automation_platform"
  | "business_software"
  | "security_platform"
  | "analytics_platform"
  | "payment_provider"
  | "crm_system"
  | "communication_system"
  | "storage_provider"
  | "inference_provider"
  | "execution_environment"
  | "connector_ecosystem"
  | "platform";

// ── Maturity Levels ────────────────────────────────────────────────────────
export type MaturityLevel =
  | "experimental"
  | "beta"
  | "stable"
  | "mature"
  | "legacy"
  | "discontinued";

// ── License / Pricing ──────────────────────────────────────────────────────
export type LicenseType = "open_source" | "commercial" | "freemium" | "enterprise";
export type PricingModel = "free" | "usage_based" | "subscription" | "one_time" | "freemium";
export type ProviderType = "cloud" | "ai_lab" | "open_source_org" | "enterprise" | "startup" | "individual";
export type SupportTier = "community" | "commercial" | "enterprise";

// ── Compatibility ──────────────────────────────────────────────────────────
export type CompatibilityLevel = "compatible" | "partial" | "incompatible" | "unknown";
export type IntegrationComplexity = "trivial" | "low" | "medium" | "high" | "very_high";

// ── Recommendation ─────────────────────────────────────────────────────────
export type RecommendationType = "upgrade" | "addition" | "replacement" | "evaluation" | "migration";
export type RecommendationPriority = "critical" | "high" | "medium" | "low";

// ── Technology Readiness ───────────────────────────────────────────────────
export type TechnologyReadiness = "ready" | "expanding" | "constrained" | "limited";

// ── Capability Types ───────────────────────────────────────────────────────
export type TechnologyCapabilityType =
  | "inference"
  | "reasoning"
  | "code_generation"
  | "vision"
  | "audio"
  | "search"
  | "storage"
  | "compute"
  | "orchestration"
  | "automation"
  | "analytics"
  | "security"
  | "communication"
  | "payment"
  | "deployment"
  | "monitoring"
  | "crm"
  | "database_management"
  | "vector_search"
  | "web_scraping";

// ── Extension Point IDs ────────────────────────────────────────────────────
export const EP_GTI_TECHNOLOGY_DISCOVERED = "global-technology:technology-discovered";
export const EP_GTI_BENCHMARK_ASSESSED    = "global-technology:benchmark-assessed";
export const EP_GTI_COMPATIBILITY_CHECKED = "global-technology:compatibility-checked";
export const EP_GTI_PROVIDER_EVALUATED    = "global-technology:provider-evaluated";
export const EP_GTI_OPPORTUNITY_DETECTED  = "global-technology:opportunity-detected";
export const EP_GTI_RECOMMENDATION_PRODUCED = "global-technology:recommendation-produced";
export const EP_GTI_CATALOG_REFRESHED     = "global-technology:catalog-refreshed";
export const EP_GTI_REGISTRY_UPDATED      = "global-technology:registry-updated";

// ── Core Interfaces ────────────────────────────────────────────────────────
export interface TechnologyEntry {
  key: string;
  name: string;
  category: TechnologyCategory;
  subcategory?: string;
  vendor: string;
  description: string;
  website?: string;
  licenseType?: LicenseType;
  pricingModel?: PricingModel;
  maturityLevel: MaturityLevel;
  openSourceUrl?: string;
  documentationUrl?: string;
}

export interface ProviderEntry {
  key: string;
  name: string;
  type: ProviderType;
  website?: string;
  foundedYear?: number;
  headquarters?: string;
  vendorMaturityScore?: number;
  communityAdoptionScore?: number;
  supportTier?: SupportTier;
  isPublicCompany?: boolean;
}

export interface BenchmarkScores {
  technologyKey: string;
  performanceScore: number;
  reliabilityScore: number;
  costScore: number;
  latencyScore: number;
  scalabilityScore: number;
  maintenanceBurdenScore: number;
  vendorMaturityScore: number;
  communityAdoptionScore: number;
  securityPostureScore: number;
  compositeScore: number;
  benchmarkNotes?: string;
}

export interface CompatibilityAssessment {
  technologyKey: string;
  compatibilityLevel: CompatibilityLevel;
  compatibilityScore: number;
  infrastructureCompatible: boolean;
  adapterCompatible: boolean;
  osCompatible: boolean;
  executionModelCompatible: boolean;
  integrationComplexity: IntegrationComplexity;
  blockers: string[];
  requirements: string[];
  notes?: string;
}

export interface TechnologyOpportunity {
  technologyKey: string;
  name: string;
  category: TechnologyCategory;
  opportunityDescription: string;
  potentialImpact: "transformative" | "significant" | "moderate" | "minor";
  compatibilityScore: number;
  compositeScore: number;
  estimatedEffort: IntegrationComplexity;
}

export interface TechnologyRecommendationRecord {
  technologyKey: string;
  recommendationType: RecommendationType;
  priority: RecommendationPriority;
  title: string;
  description: string;
  evidence: string;
  businessImpact: string;
  performanceImpact: string;
  costImpact: string;
  securityImpact: string;
  compatibilityScore: number;
  expectedImprovement: string;
  implementationComplexity: IntegrationComplexity;
  operationalRisk: string;
  confidence: number;
  alternatives: string[];
}

// ── EB Summary ─────────────────────────────────────────────────────────────
export interface GlobalTechnologySummary {
  totalTechnologies: number;
  totalProviders: number;
  technologyReadiness: TechnologyReadiness;
  innovationScore: number;
  avgCompositeScore: number;
  compatibleCount: number;
  partialCount: number;
  incompatibleCount: number;
  openRecommendations: number;
  categoryCounts: Record<string, number>;
  topOpportunities: TechnologyOpportunity[];
  topRecommendations: TechnologyRecommendationRecord[];
}
