import {
  pgTable,
  serial,
  text,
  real,
  boolean,
  integer,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

// ── Build 038: Executive Portfolio Intelligence Engine ────────────────────
// Append-only history. Only portfolio_registry is mutable (upsert).
// Portfolio Intelligence never executes initiatives or reallocates resources.

// 1. Executive portfolios — portfolio definitions
export const executivePortfolios = pgTable("executive_portfolios", {
  id:                  serial("id").primaryKey(),
  portfolioKey:        text("portfolio_key").notNull(),
  title:               text("title").notNull(),
  description:         text("description").notNull(),
  portfolioDomain:     text("portfolio_domain").notNull(), // technology | business | execution | infrastructure | product | operations | strategic | mixed
  initiativeCount:     integer("initiative_count").notNull().default(0),
  activeInitiatives:   integer("active_initiatives").notNull().default(0),
  totalBudgetUnits:    real("total_budget_units"),          // normalized 0-1 scale
  totalPeopleUnits:    real("total_people_units"),
  healthScore:         real("health_score"),                // 0-1 computed portfolio health
  balanceScore:        real("balance_score"),               // 0-1 strategic balance
  capacityScore:       real("capacity_score"),              // 0-1 capacity utilization
  exposureScore:       real("exposure_score"),              // 0-1 risk exposure (lower=better)
  overallScore:        real("overall_score"),               // composite 0-1
  triggeredBy:         text("triggered_by").notNull().default("platform"), // platform | user | admin
  userId:              integer("user_id"),
  capturedAt:          timestamp("captured_at").notNull().defaultNow(),
});

// 2. Portfolio initiatives — individual initiatives within a portfolio
export const portfolioInitiatives = pgTable("portfolio_initiatives", {
  id:                  serial("id").primaryKey(),
  portfolioId:         integer("portfolio_id").notNull(),
  initiativeKey:       text("initiative_key").notNull(),
  title:               text("title").notNull(),
  description:         text("description").notNull(),
  initiativeType:      text("initiative_type").notNull(), // technology | business | execution | infrastructure | product | operations | strategic
  strategicTheme:      text("strategic_theme").notNull(), // growth | innovation | stability | efficiency | compliance | transformation | maintenance
  investmentBucket:    text("investment_bucket").notNull(), // maintain | innovate | grow | infrastructure
  status:              text("status").notNull().default("active"), // active | planned | on-hold | retiring | completed
  riskLevel:           text("risk_level").notNull().default("medium"), // low | medium | high | critical
  horizon:             text("horizon").notNull().default("medium"), // short | medium | long
  strategicAlignment:  real("strategic_alignment").notNull().default(0.50), // 0-1
  resourceDemand:      jsonb("resource_demand").notNull(),  // {budget, people, infrastructure, compute, time, attention} 0-1 each
  dependencies:        text("dependencies").array().notNull().default([]),
  dependencyCount:     integer("dependency_count").notNull().default(0),
  isCriticalPath:      boolean("is_critical_path").notNull().default(false),
  isOnParetoCut:       boolean("is_on_pareto_cut").notNull().default(false), // recommended for portfolio trim
  capturedAt:          timestamp("captured_at").notNull().defaultNow(),
});

// 3. Portfolio allocations — resource allocation analysis
export const portfolioAllocations = pgTable("portfolio_allocations", {
  id:                  serial("id").primaryKey(),
  portfolioId:         integer("portfolio_id").notNull(),
  resourceType:        text("resource_type").notNull(), // budget | people | infrastructure | compute | time | attention
  totalAvailable:      real("total_available").notNull().default(1.0), // normalized
  totalAllocated:      real("total_allocated").notNull().default(0.0),
  utilizationRate:     real("utilization_rate").notNull().default(0.0), // 0-1
  overcommitted:       boolean("overcommitted").notNull().default(false),
  overcommitDelta:     real("overcommit_delta").notNull().default(0.0), // amount over
  bucketsBreakdown:    jsonb("buckets_breakdown").notNull().default({}), // {maintain, innovate, grow, infrastructure}: allocation
  topConsumers:        jsonb("top_consumers").notNull().default([]),     // [{key, title, demand}]
  allocationScore:     real("allocation_score").notNull().default(1.0), // 0=badly allocated, 1=well allocated
  capturedAt:          timestamp("captured_at").notNull().defaultNow(),
});

// 4. Portfolio exposures — risk concentration analysis
export const portfolioExposures = pgTable("portfolio_exposures", {
  id:                  serial("id").primaryKey(),
  portfolioId:         integer("portfolio_id").notNull(),
  exposureType:        text("exposure_type").notNull(), // single-point-dependency | vendor-concentration | execution-concentration | technology-concentration | financial-concentration | strategic-concentration
  severity:            text("severity").notNull(),       // low | medium | high | critical
  affectedInitiatives: text("affected_initiatives").array().notNull().default([]),
  affectedCount:       integer("affected_count").notNull().default(0),
  concentrationRatio:  real("concentration_ratio").notNull().default(0.0), // 0-1, 1=total concentration
  description:         text("description").notNull(),
  mitigation:          text("mitigation").notNull(),
  exposureScore:       real("exposure_score").notNull().default(0.0),      // 0=no risk, 1=max risk
  capturedAt:          timestamp("captured_at").notNull().defaultNow(),
});

// 5. Portfolio capacity — capacity utilization calculations
export const portfolioCapacity = pgTable("portfolio_capacity", {
  id:                  serial("id").primaryKey(),
  portfolioId:         integer("portfolio_id").notNull(),
  currentUtilization:  real("current_utilization").notNull().default(0.0), // 0-1
  availableCapacity:   real("available_capacity").notNull().default(0.0),
  growthCapacity:      real("growth_capacity").notNull().default(0.0),     // headroom beyond current initiatives
  constraintPressure:  real("constraint_pressure").notNull().default(0.0), // 0=relaxed, 1=critical pressure
  expansionReadiness:  real("expansion_readiness").notNull().default(0.0), // 0=cannot expand, 1=ready to expand
  mostConstrainedResource: text("most_constrained_resource"),
  resourceBreakdown:   jsonb("resource_breakdown").notNull().default({}),  // per-resource utilization
  overcommittedResources: text("overcommitted_resources").array().notNull().default([]),
  capacityScore:       real("capacity_score").notNull().default(1.0),      // 0=over capacity, 1=healthy
  capturedAt:          timestamp("captured_at").notNull().defaultNow(),
});

// 6. Portfolio recommendations — actionable portfolio-level recommendations
export const portfolioRecommendations = pgTable("portfolio_recommendations", {
  id:                  serial("id").primaryKey(),
  portfolioId:         integer("portfolio_id").notNull(),
  recommendationType:  text("recommendation_type").notNull(), // rebalance | delay | accelerate | consolidate | retire | expand
  priority:            text("priority").notNull(),            // critical | high | medium | low
  targetInitiative:    text("target_initiative"),             // initiative key if specific to one initiative
  title:               text("title").notNull(),
  rationale:           text("rationale").notNull(),
  evidence:            jsonb("evidence").notNull().default([]),         // [{point, source}]
  expectedImpact:      text("expected_impact").notNull(),
  riskIfIgnored:       text("risk_if_ignored").notNull(),
  alternativeAction:   text("alternative_action"),
  confidenceScore:     real("confidence_score").notNull().default(0.0),
  portfolioLawApplied: boolean("portfolio_law_applied").notNull().default(true),
  capturedAt:          timestamp("captured_at").notNull().defaultNow(),
});

// 7. Portfolio registry — authoritative current state (mutable, upsert on portfolioKey)
export const portfolioRegistry = pgTable("portfolio_registry", {
  id:                  serial("id").primaryKey(),
  portfolioKey:        text("portfolio_key").notNull().unique(),
  title:               text("title").notNull(),
  portfolioDomain:     text("portfolio_domain").notNull(),
  overallScore:        real("overall_score").notNull().default(0.0),
  healthScore:         real("health_score").notNull().default(0.0),
  balanceScore:        real("balance_score").notNull().default(0.0),
  capacityScore:       real("capacity_score").notNull().default(0.0),
  exposureScore:       real("exposure_score").notNull().default(0.0),
  initiativeCount:     integer("initiative_count").notNull().default(0),
  overcommitted:       boolean("overcommitted").notNull().default(false),
  criticalExposures:   integer("critical_exposures").notNull().default(0),
  topRecommendation:   text("top_recommendation"),
  portfolioLawApplied: boolean("portfolio_law_applied").notNull().default(true),
  lastEvaluatedAt:     timestamp("last_evaluated_at").notNull().defaultNow(),
});

// 8. Portfolio snapshots — platform-level aggregate history
export const portfolioSnapshots = pgTable("portfolio_snapshots", {
  id:                  serial("id").primaryKey(),
  capturedAt:          timestamp("captured_at").notNull().defaultNow(),
  totalPortfolios:     integer("total_portfolios").notNull().default(0),
  totalInitiatives:    integer("total_initiatives").notNull().default(0),
  averageHealthScore:  real("average_health_score"),
  averageBalanceScore: real("average_balance_score"),
  overcommittedCount:  integer("overcommitted_count").notNull().default(0),
  criticalExposures:   integer("critical_exposures").notNull().default(0),
  highPriorityRecs:    integer("high_priority_recs").notNull().default(0),
  topRisk:             text("top_risk"),
  topOpportunity:      text("top_opportunity"),
  snapshotData:        jsonb("snapshot_data"),
});

// 9. Portfolio history — immutable per-portfolio evaluation history
export const portfolioHistory = pgTable("portfolio_history", {
  id:                  serial("id").primaryKey(),
  portfolioKey:        text("portfolio_key").notNull(),
  portfolioId:         integer("portfolio_id").notNull(),
  evaluatedAt:         timestamp("evaluated_at").notNull().defaultNow(),
  overallScore:        real("overall_score"),
  healthScore:         real("health_score"),
  balanceScore:        real("balance_score"),
  capacityScore:       real("capacity_score"),
  exposureScore:       real("exposure_score"),
  initiativeCount:     integer("initiative_count").notNull().default(0),
  recommendationCount: integer("recommendation_count").notNull().default(0),
  topRecommendationType: text("top_recommendation_type"),
  changeSummary:       text("change_summary"),
  snapshotData:        jsonb("snapshot_data"),
});
