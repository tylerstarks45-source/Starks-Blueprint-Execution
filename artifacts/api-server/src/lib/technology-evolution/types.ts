// ── Build 035: Technology Evolution Intelligence Engine ────────────────────
// All types self-contained. No re-exports from @workspace/db.

// ── Lifecycle Stage (8) ────────────────────────────────────────────────────
export type LifecycleStage =
  | "experimental"
  | "emerging"
  | "growing"
  | "established"
  | "mature"
  | "declining"
  | "legacy"
  | "end-of-life";

// ── Trend Direction (6) ────────────────────────────────────────────────────
export type TrendDirection =
  | "accelerating"
  | "growing"
  | "stable"
  | "slowing"
  | "declining"
  | "recovering";

// ── Release Frequency ─────────────────────────────────────────────────────
export type ReleaseFrequency =
  | "rapid"       // multiple releases per month
  | "frequent"    // monthly
  | "regular"     // quarterly
  | "slow"        // 1-2x per year
  | "stagnant";   // less than annual

// ── Breaking Change Frequency ─────────────────────────────────────────────
export type BreakingChangeFrequency =
  | "frequent"    // every major release breaks things
  | "occasional"  // some major versions break things
  | "rare"        // backwards-compatible most of the time
  | "never";      // strict backwards compatibility

// ── Adoption Stage ────────────────────────────────────────────────────────
export type AdoptionStage =
  | "innovator"    // <5% adoption
  | "early"        // 5-20% adoption
  | "mainstream"   // 20-60% adoption
  | "late"         // 60-80% adoption
  | "laggard";     // >80% or commoditized

// ── Support Status ────────────────────────────────────────────────────────
export type SupportStatus = "active" | "lts" | "maintenance" | "eol";

// ── Fortune 500 Presence ──────────────────────────────────────────────────
export type Fortune500Presence = "high" | "moderate" | "low" | "none";

// ── Open Source Health ────────────────────────────────────────────────────
export type OpenSourceHealth = "thriving" | "healthy" | "declining" | "abandoned" | "n/a";

// ── Ecosystem Size ────────────────────────────────────────────────────────
export type EcosystemSize = "large" | "medium" | "small" | "niche";

// ── Replacement Likelihood ────────────────────────────────────────────────
export type ReplacementLikelihood = "high" | "medium" | "low" | "minimal";

// ── Upgrade Urgency ───────────────────────────────────────────────────────
export type UpgradeUrgency = "critical" | "high" | "medium" | "low" | "none";

// ── Strategic Relevance ───────────────────────────────────────────────────
export type StrategicRelevance = "core" | "important" | "supplementary" | "legacy";

// ── Risk Level ────────────────────────────────────────────────────────────
export type RiskLevel = "critical" | "high" | "medium" | "low" | "minimal";

// ── Recommendation Type ───────────────────────────────────────────────────
export type EvolutionRecommendationType =
  | "upgrade"
  | "migration"
  | "deprecate"
  | "evaluate"
  | "monitor"
  | "adopt";

// ── Change Event Type ─────────────────────────────────────────────────────
export type ChangeEventType =
  | "lifecycle_change"
  | "trend_reversal"
  | "deprecation_announced"
  | "eol_announced"
  | "major_version_released"
  | "adoption_spike"
  | "adoption_drop"
  | "security_concern"
  | "vendor_change";

// ── Extension Point IDs ────────────────────────────────────────────────────
export const EP_TEI_LIFECYCLE_ASSESSED      = "technology-evolution:lifecycle-assessed";
export const EP_TEI_TREND_TRACKED           = "technology-evolution:trend-tracked";
export const EP_TEI_VELOCITY_MEASURED       = "technology-evolution:velocity-measured";
export const EP_TEI_ADOPTION_EVALUATED      = "technology-evolution:adoption-evaluated";
export const EP_TEI_OUTLOOK_FORECASTED      = "technology-evolution:outlook-forecasted";
export const EP_TEI_RECOMMENDATION_PRODUCED = "technology-evolution:recommendation-produced";
export const EP_TEI_CHANGE_DETECTED         = "technology-evolution:change-detected";
export const EP_TEI_REBUILD_COMPLETE        = "technology-evolution:rebuild-complete";

// ── Core profile per technology ────────────────────────────────────────────
export interface TechnologyEvolutionProfile {
  technologyKey: string;
  displayName: string;
  // Lifecycle
  lifecycleStage: LifecycleStage;
  maturityScore: number;
  stabilityScore: number;
  longevityScore: number;
  supportStatus: SupportStatus;
  latestMajorVersion?: string;
  releaseYear?: number;
  lastMajorReleaseYear?: number;
  expectedEolYear?: number;
  lifecycleNotes?: string;
  // Trend
  trendDirection: TrendDirection;
  adoptionVelocity: number;         // -1 to +1
  marketMomentum: number;           // 0-1
  communityGrowthRate: number;      // 0-1
  enterpriseInterestScore: number;  // 0-1
  jobMarketTrend: "rising" | "stable" | "declining";
  githubStarsTrend?: string;
  trendNotes?: string;
  // Velocity
  releaseFrequency: ReleaseFrequency;
  releasesPerYear?: number;
  breakingChangeFrequency: BreakingChangeFrequency;
  maintenanceActivity: "active" | "sporadic" | "inactive";
  issueResolutionSpeed: "fast" | "moderate" | "slow";
  backwardsCompatibilityScore: number; // 0-1
  operationalStabilityScore: number;   // 0-1
  velocityNotes?: string;
  // Adoption
  enterpriseAdoptionScore: number;  // 0-1
  developerAdoptionScore: number;   // 0-1
  communityMaturityScore: number;   // 0-1
  industryAcceptanceScore: number;  // 0-1
  adoptionStage: AdoptionStage;
  fortune500Presence: Fortune500Presence;
  openSourceHealth?: OpenSourceHealth;
  ecosystemSize: EcosystemSize;
  adoptionNotes?: string;
  // Outlook
  expectedLongevityYears?: number;
  replacementLikelihood: ReplacementLikelihood;
  replacementTimeframe?: string;
  upgradeUrgency: UpgradeUrgency;
  futureCompatibilityScore: number; // 0-1
  technologyConfidenceScore: number;// 0-1
  strategicRelevance: StrategicRelevance;
  riskLevel: RiskLevel;
  obsolescenceRisk: number;         // 0-1
  innovationPotential: number;      // 0-1
  outlookNotes?: string;
}

// ── EB Summary ────────────────────────────────────────────────────────────
export interface TechnologyEvolutionSummary {
  totalTechnologies: number;
  deprecationAlerts: number;
  emergingTechnologies: number;
  stableTechnologies: number;
  upgradePriorities: number;
  averageMaturityScore: number;
  averageStabilityScore: number;
  averageAdoptionScore: number;
  averageConfidenceScore: number;
  platformEvolutionScore: number;
  // Advisory context
  criticalTechnologies: string[];     // requiring immediate attention
  emergingOpportunities: string[];    // emerging/growing with high potential
  deprecationCandidates: string[];    // declining/legacy/eol
  migrationPriorities: Array<{ key: string; urgency: string; reason: string }>;
  trendLeaders: string[];             // accelerating technologies
}
