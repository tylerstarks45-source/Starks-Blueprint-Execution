import { pgTable, serial, integer, text, boolean, real, timestamp, jsonb, unique } from "drizzle-orm/pg-core";

// ── Technology Lifecycle ────────────────────────────────────────────────────
// One row per technology key. Upserted on each rebuild.
export const technologyLifecycle = pgTable("technology_lifecycle", {
  id: serial("id").primaryKey(),
  technologyKey: text("technology_key").notNull(),
  lifecycleStage: text("lifecycle_stage").notNull(),          // LifecycleStage
  maturityScore: real("maturity_score").notNull(),             // 0-1
  stabilityScore: real("stability_score").notNull(),           // 0-1
  longevityScore: real("longevity_score").notNull(),           // 0-1
  supportStatus: text("support_status").notNull(),             // active | lts | maintenance | eol
  latestMajorVersion: text("latest_major_version"),
  releaseYear: integer("release_year"),
  lastMajorReleaseYear: integer("last_major_release_year"),
  expectedEolYear: integer("expected_eol_year"),
  lifecycleNotes: text("lifecycle_notes"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [unique().on(t.technologyKey)]);

// ── Technology Trends ───────────────────────────────────────────────────────
// Trend direction and velocity for each technology. Append-only (one per rebuild).
export const technologyTrends = pgTable("technology_trends", {
  id: serial("id").primaryKey(),
  technologyKey: text("technology_key").notNull(),
  trendDirection: text("trend_direction").notNull(),           // TrendDirection
  adoptionVelocity: real("adoption_velocity").notNull(),       // -1 to +1 (negative = declining)
  marketMomentum: real("market_momentum").notNull(),           // 0-1
  communityGrowthRate: real("community_growth_rate").notNull(),// 0-1
  enterpriseInterestScore: real("enterprise_interest_score").notNull(),
  jobMarketTrend: text("job_market_trend").notNull(),          // rising | stable | declining
  githubStarsTrend: text("github_stars_trend"),
  trendNotes: text("trend_notes"),
  capturedAt: timestamp("captured_at").notNull().defaultNow(),
});

// ── Technology Velocity ─────────────────────────────────────────────────────
// Release cadence, maintenance activity, compat evolution. Append-only.
export const technologyVelocity = pgTable("technology_velocity", {
  id: serial("id").primaryKey(),
  technologyKey: text("technology_key").notNull(),
  releaseFrequency: text("release_frequency").notNull(),       // ReleaseFrequency
  releasesPerYear: real("releases_per_year"),
  breakingChangeFrequency: text("breaking_change_frequency").notNull(), // BreakingChangeFrequency
  maintenanceActivity: text("maintenance_activity").notNull(), // active | sporadic | inactive
  issueResolutionSpeed: text("issue_resolution_speed").notNull(), // fast | moderate | slow
  backwardsCompatibilityScore: real("backwards_compatibility_score").notNull(), // 0-1
  operationalStabilityScore: real("operational_stability_score").notNull(),     // 0-1
  velocityScore: real("velocity_score").notNull(),              // 0-1 composite
  velocityNotes: text("velocity_notes"),
  capturedAt: timestamp("captured_at").notNull().defaultNow(),
});

// ── Technology Adoption ─────────────────────────────────────────────────────
// Enterprise, developer, community, industry adoption. Append-only.
export const technologyAdoption = pgTable("technology_adoption", {
  id: serial("id").primaryKey(),
  technologyKey: text("technology_key").notNull(),
  enterpriseAdoptionScore: real("enterprise_adoption_score").notNull(), // 0-1
  developerAdoptionScore: real("developer_adoption_score").notNull(),   // 0-1
  communityMaturityScore: real("community_maturity_score").notNull(),   // 0-1
  industryAcceptanceScore: real("industry_acceptance_score").notNull(), // 0-1
  adoptionStage: text("adoption_stage").notNull(),             // AdoptionStage: innovator | early | mainstream | late | laggard
  fortune500Presence: text("fortune500_presence").notNull(),   // high | moderate | low | none
  openSourceHealth: text("open_source_health"),                // thriving | healthy | declining | abandoned | n/a
  ecosystemSize: text("ecosystem_size").notNull(),             // large | medium | small | niche
  compositeAdoptionScore: real("composite_adoption_score").notNull(), // 0-1
  adoptionNotes: text("adoption_notes"),
  capturedAt: timestamp("captured_at").notNull().defaultNow(),
});

// ── Technology Outlook ──────────────────────────────────────────────────────
// Future outlook: longevity, replacement, upgrade urgency. Append-only.
export const technologyOutlook = pgTable("technology_outlook", {
  id: serial("id").primaryKey(),
  technologyKey: text("technology_key").notNull(),
  expectedLongevityYears: integer("expected_longevity_years"),
  replacementLikelihood: text("replacement_likelihood").notNull(),  // high | medium | low | minimal
  replacementTimeframe: text("replacement_timeframe"),              // e.g. "2-5 years", "5-10 years"
  upgradeUrgency: text("upgrade_urgency").notNull(),                // critical | high | medium | low | none
  futureCompatibilityScore: real("future_compatibility_score").notNull(), // 0-1
  technologyConfidenceScore: real("technology_confidence_score").notNull(), // 0-1
  strategicRelevance: text("strategic_relevance").notNull(),        // core | important | supplementary | legacy
  riskLevel: text("risk_level").notNull(),                          // critical | high | medium | low | minimal
  obsolescenceRisk: real("obsolescence_risk").notNull(),            // 0-1
  innovationPotential: real("innovation_potential").notNull(),      // 0-1
  outlookNotes: text("outlook_notes"),
  capturedAt: timestamp("captured_at").notNull().defaultNow(),
});

// ── Technology Evolution Registry ───────────────────────────────────────────
// Current-state summary per technology. Upserted on each rebuild.
export const technologyEvolutionRegistry = pgTable("technology_evolution_registry", {
  id: serial("id").primaryKey(),
  technologyKey: text("technology_key").notNull(),
  lifecycleStage: text("lifecycle_stage").notNull(),
  trendDirection: text("trend_direction").notNull(),
  maturityScore: real("maturity_score").notNull(),
  stabilityScore: real("stability_score").notNull(),
  adoptionScore: real("adoption_score").notNull(),
  velocityScore: real("velocity_score").notNull(),
  confidenceScore: real("confidence_score").notNull(),
  obsolescenceRisk: real("obsolescence_risk").notNull(),
  upgradeUrgency: text("upgrade_urgency").notNull(),
  replacementLikelihood: text("replacement_likelihood").notNull(),
  strategicRelevance: text("strategic_relevance").notNull(),
  overallEvolutionScore: real("overall_evolution_score").notNull(), // composite 0-1
  lastRebuiltAt: timestamp("last_rebuilt_at").notNull().defaultNow(),
}, (t) => [unique().on(t.technologyKey)]);

// ── Technology Evolution Snapshots ──────────────────────────────────────────
// Full platform-wide evolution state captures. Append-only.
export const technologyEvolutionSnapshots = pgTable("technology_evolution_snapshots", {
  id: serial("id").primaryKey(),
  capturedAt: timestamp("captured_at").notNull().defaultNow(),
  totalTechnologies: integer("total_technologies").notNull().default(0),
  deprecationAlerts: integer("deprecation_alerts").notNull().default(0),   // declining+legacy+eol
  emergingTechnologies: integer("emerging_technologies").notNull().default(0),
  stableTechnologies: integer("stable_technologies").notNull().default(0),
  upgradePriorities: integer("upgrade_priorities").notNull().default(0),   // critical+high urgency
  averageMaturityScore: real("average_maturity_score"),
  averageStabilityScore: real("average_stability_score"),
  averageAdoptionScore: real("average_adoption_score"),
  averageConfidenceScore: real("average_confidence_score"),
  platformEvolutionScore: real("platform_evolution_score"),                // composite health
  snapshotData: jsonb("snapshot_data"),
});

// ── Technology Recommendations History ──────────────────────────────────────
// Append-only log of all evolution recommendations produced.
export const technologyRecommendationsHistory = pgTable("technology_recommendations_history", {
  id: serial("id").primaryKey(),
  technologyKey: text("technology_key").notNull(),
  recommendationType: text("recommendation_type").notNull(), // upgrade | migration | deprecate | evaluate | monitor | adopt
  priority: text("priority").notNull(),                       // critical | high | medium | low
  title: text("title").notNull(),
  description: text("description").notNull(),
  lifecycleEvidence: text("lifecycle_evidence").notNull(),
  trendEvidence: text("trend_evidence").notNull(),
  businessImpact: text("business_impact").notNull(),
  migrationUrgency: text("migration_urgency").notNull(),
  operationalImpact: text("operational_impact").notNull(),
  confidence: real("confidence").notNull(),
  alternatives: text("alternatives").array(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Technology Change Events ─────────────────────────────────────────────────
// Append-only log of significant evolution events detected across rebuilds.
export const technologyChangeEvents = pgTable("technology_change_events", {
  id: serial("id").primaryKey(),
  technologyKey: text("technology_key").notNull(),
  eventType: text("event_type").notNull(),                    // ChangeEventType
  eventDescription: text("event_description").notNull(),
  previousValue: text("previous_value"),
  newValue: text("new_value"),
  impactLevel: text("impact_level").notNull(),                // critical | high | medium | low
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
});
