// ── Build 038: Executive Portfolio Intelligence Engine — Types ────────────

export type PortfolioDomain =
  | "technology"
  | "business"
  | "execution"
  | "infrastructure"
  | "product"
  | "operations"
  | "strategic"
  | "mixed";

export type InitiativeType =
  | "technology"
  | "business"
  | "execution"
  | "infrastructure"
  | "product"
  | "operations"
  | "strategic";

export type StrategicTheme =
  | "growth"
  | "innovation"
  | "stability"
  | "efficiency"
  | "compliance"
  | "transformation"
  | "maintenance";

export type InvestmentBucket = "maintain" | "innovate" | "grow" | "infrastructure";

export type InitiativeStatus = "active" | "planned" | "on-hold" | "retiring" | "completed";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type Horizon = "short" | "medium" | "long";

export type ExposureType =
  | "single-point-dependency"
  | "vendor-concentration"
  | "execution-concentration"
  | "technology-concentration"
  | "financial-concentration"
  | "strategic-concentration";

export type RecommendationType = "rebalance" | "delay" | "accelerate" | "consolidate" | "retire" | "expand";

export type RecommendationPriority = "critical" | "high" | "medium" | "low";

// ── Resource model ─────────────────────────────────────────────────────────
export type ResourceType = "budget" | "people" | "infrastructure" | "compute" | "time" | "attention";

export interface ResourceDemand {
  budget:         number; // 0-1 normalized demand
  people:         number;
  infrastructure: number;
  compute:        number;
  time:           number;
  attention:      number;
}

export interface TotalResources {
  budget:         number; // total available (normalized 0-1 per resource)
  people:         number;
  infrastructure: number;
  compute:        number;
  time:           number;
  attention:      number;
}

// ── Input types (for POST endpoints) ──────────────────────────────────────

export interface PortfolioInitiativeInput {
  key:                string;
  title:              string;
  description:        string;
  type:               InitiativeType;
  theme:              StrategicTheme;
  investmentBucket:   InvestmentBucket;
  status:             InitiativeStatus;
  riskLevel:          RiskLevel;
  horizon:            Horizon;
  strategicAlignment: number;  // 0-1
  resourceDemand:     ResourceDemand;
  dependencies?:      string[]; // keys of other initiatives
}

export interface PortfolioConstraintInput {
  type:     ResourceType;
  limit:    number;  // 0-1 normalized
  severity: "hard" | "soft";
  notes?:   string;
}

export interface PortfolioEvaluationRequest {
  portfolioKey:    string;
  title:           string;
  description:     string;
  domain:          PortfolioDomain;
  initiatives:     PortfolioInitiativeInput[];
  totalResources:  TotalResources;
  constraints?:    PortfolioConstraintInput[];
  userId?:         number;
}

// ── Computed types ─────────────────────────────────────────────────────────

export interface AllocationResult {
  resourceType:     ResourceType;
  totalAvailable:   number;
  totalAllocated:   number;
  utilizationRate:  number;
  overcommitted:    boolean;
  overcommitDelta:  number;
  bucketsBreakdown: Record<InvestmentBucket, number>;
  topConsumers:     { key: string; title: string; demand: number }[];
  allocationScore:  number;
}

export interface BalanceResult {
  strategicBalance:  number;  // 0-1, 1=perfectly balanced
  executionBalance:  number;
  technologyBalance: number;
  businessBalance:   number;
  operationalBalance:number;
  overallBalance:    number;
  bucketRatios:      Record<InvestmentBucket, number>;  // fraction of initiatives in each bucket
  horizonRatios:     Record<Horizon, number>;
  themeRatios:       Partial<Record<StrategicTheme, number>>;
  balanceExplanation:string;
  balanceWarnings:   string[];
}

export interface ExposureResult {
  exposureType:        ExposureType;
  severity:            string;
  affectedInitiatives: string[];
  concentrationRatio:  number;
  description:         string;
  mitigation:          string;
  exposureScore:       number;
}

export interface CapacityResult {
  currentUtilization:  number;
  availableCapacity:   number;
  growthCapacity:      number;
  constraintPressure:  number;
  expansionReadiness:  number;
  mostConstrainedResource: ResourceType | null;
  resourceBreakdown:   Record<ResourceType, { utilized: number; available: number; overcommitted: boolean }>;
  overcommittedResources: ResourceType[];
  capacityScore:       number;
}

export interface PortfolioRecommendationResult {
  type:              RecommendationType;
  priority:          RecommendationPriority;
  targetInitiative?: string;
  title:             string;
  rationale:         string;
  evidence:          { point: string; source: string }[];
  expectedImpact:    string;
  riskIfIgnored:     string;
  alternativeAction: string | null;
  confidenceScore:   number;
  portfolioLawApplied: boolean;
}

export interface PortfolioHealthScores {
  healthScore:    number;  // composite well-being
  balanceScore:   number;  // strategic balance
  capacityScore:  number;  // utilization health
  exposureScore:  number;  // risk exposure (lower raw risk = higher score)
  overallScore:   number;  // final composite
}

export interface PortfolioEvaluationResult {
  portfolioId:     number;
  portfolioKey:    string;
  health:          PortfolioHealthScores;
  allocations:     AllocationResult[];
  balance:         BalanceResult;
  exposures:       ExposureResult[];
  capacity:        CapacityResult;
  recommendations: PortfolioRecommendationResult[];
  initiativeCount: number;
  criticalPath:    string[];  // initiative keys on critical path
}

// ── EB summary ─────────────────────────────────────────────────────────────

export interface PortfolioIntelligenceSummary {
  totalPortfolios:        number;
  totalInitiatives:       number;
  averageHealthScore:     number;
  averageBalanceScore:    number;
  overcommittedPortfolios:number;
  criticalExposures:      number;
  highPriorityRecs:       number;
  topRisk:                string | null;
  topOpportunity:         string | null;
  portfolioLawCompliance: number;  // 0-1
  portfolioSummaries:     {
    portfolioKey:     string;
    title:            string;
    overallScore:     number;
    overcommitted:    boolean;
    topRecommendation:string | null;
  }[];
}

// ── EP IDs ─────────────────────────────────────────────────────────────────

export const EPI_EP_IDS = {
  PORTFOLIO_CONSTRUCTION:    "epi.portfolio.construction",
  ALLOCATION_INTELLIGENCE:   "epi.allocation.intelligence",
  BALANCE_INTELLIGENCE:      "epi.balance.intelligence",
  EXPOSURE_INTELLIGENCE:     "epi.exposure.intelligence",
  CAPACITY_INTELLIGENCE:     "epi.capacity.intelligence",
  RECOMMENDATION:            "epi.portfolio.recommendation",
  ORCHESTRATION:             "epi.orchestration",
  ADVISORY:                  "epi.advisory",
} as const;
