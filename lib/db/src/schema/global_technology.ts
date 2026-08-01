import { pgTable, serial, integer, text, boolean, real, timestamp, jsonb, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Technology Catalog ──────────────────────────────────────────────────────
// Master catalog of external technologies ASH may leverage.
// Append-only by convention. Never install/provision — observe and evaluate only.
export const technologyCatalog = pgTable("technology_catalog", {
  id: serial("id").primaryKey(),
  key: text("key").notNull(),                          // unique slug, e.g. "openai:gpt-4o"
  name: text("name").notNull(),
  category: text("category").notNull(),                // TechnologyCategory
  subcategory: text("subcategory"),
  vendor: text("vendor").notNull(),
  description: text("description").notNull(),
  website: text("website"),
  licenseType: text("license_type"),                   // open_source | commercial | freemium | enterprise
  pricingModel: text("pricing_model"),                 // free | usage_based | subscription | one_time
  maturityLevel: text("maturity_level").notNull(),     // experimental | beta | stable | mature | legacy | discontinued
  openSourceUrl: text("open_source_url"),
  documentationUrl: text("documentation_url"),
  isAdminRestricted: boolean("is_admin_restricted").notNull().default(true),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [unique().on(t.key)]);

// ── Technology Providers ────────────────────────────────────────────────────
// Companies/organizations that provide technologies in the catalog.
export const technologyProviders = pgTable("technology_providers", {
  id: serial("id").primaryKey(),
  key: text("key").notNull(),                          // unique slug, e.g. "openai"
  name: text("name").notNull(),
  type: text("type").notNull(),                        // cloud | ai_lab | open_source_org | enterprise | startup | individual
  website: text("website"),
  foundedYear: integer("founded_year"),
  headquarters: text("headquarters"),
  vendorMaturityScore: real("vendor_maturity_score"),  // 0-1
  communityAdoptionScore: real("community_adoption_score"), // 0-1
  supportTier: text("support_tier"),                   // community | commercial | enterprise
  isPublicCompany: boolean("is_public_company").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [unique().on(t.key)]);

// ── Technology Capabilities ─────────────────────────────────────────────────
// What each cataloged technology enables.
export const technologyCapabilities = pgTable("technology_capabilities", {
  id: serial("id").primaryKey(),
  technologyKey: text("technology_key").notNull(),
  capabilityType: text("capability_type").notNull(),   // TechnologyCapabilityType
  name: text("name").notNull(),
  description: text("description").notNull(),
  strengthScore: real("strength_score").notNull(),     // 0-1, how strongly this tech provides this capability
  isKeyCapability: boolean("is_key_capability").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Technology Benchmarks ───────────────────────────────────────────────────
// Deterministic benchmark metadata for each technology.
export const technologyBenchmarks = pgTable("technology_benchmarks", {
  id: serial("id").primaryKey(),
  technologyKey: text("technology_key").notNull(),
  scannedAt: timestamp("scanned_at").notNull().defaultNow(),
  performanceScore: real("performance_score"),         // 0-1
  reliabilityScore: real("reliability_score"),         // 0-1
  costScore: real("cost_score"),                       // 0-1 (higher = more cost-efficient)
  latencyScore: real("latency_score"),                 // 0-1
  scalabilityScore: real("scalability_score"),         // 0-1
  maintenanceBurdenScore: real("maintenance_burden_score"), // 0-1 (higher = lower burden)
  vendorMaturityScore: real("vendor_maturity_score"),  // 0-1
  communityAdoptionScore: real("community_adoption_score"), // 0-1
  securityPostureScore: real("security_posture_score"), // 0-1
  compositeScore: real("composite_score"),             // weighted average across all dimensions
  benchmarkNotes: text("benchmark_notes"),
  metadata: jsonb("metadata"),
});

// ── Technology Compatibility ────────────────────────────────────────────────
// Compatibility with ASH's current stack.
export const technologyCompatibility = pgTable("technology_compatibility", {
  id: serial("id").primaryKey(),
  technologyKey: text("technology_key").notNull(),
  assessedAt: timestamp("assessed_at").notNull().defaultNow(),
  compatibilityLevel: text("compatibility_level").notNull(), // compatible | partial | incompatible | unknown
  compatibilityScore: real("compatibility_score").notNull(),  // 0-1
  infrastructureCompatible: boolean("infrastructure_compatible").notNull().default(true),
  adapterCompatible: boolean("adapter_compatible").notNull().default(true),
  osCompatible: boolean("os_compatible").notNull().default(true),
  executionModelCompatible: boolean("execution_model_compatible").notNull().default(true),
  integrationComplexity: text("integration_complexity").notNull(), // trivial | low | medium | high | very_high
  blockers: text("blockers").array(),
  requirements: text("requirements").array(),
  notes: text("notes"),
});

// ── Technology Recommendations ──────────────────────────────────────────────
// Administrator-only technology recommendations. Never user-facing.
export const technologyRecommendations = pgTable("technology_recommendations", {
  id: serial("id").primaryKey(),
  technologyKey: text("technology_key").notNull(),
  recommendationType: text("recommendation_type").notNull(), // upgrade | addition | replacement | evaluation | migration
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  priority: text("priority").notNull(),                // critical | high | medium | low
  title: text("title").notNull(),
  description: text("description").notNull(),
  evidence: text("evidence").notNull(),
  businessImpact: text("business_impact").notNull(),
  performanceImpact: text("performance_impact").notNull(),
  costImpact: text("cost_impact").notNull(),
  securityImpact: text("security_impact").notNull(),
  compatibilityScore: real("compatibility_score").notNull(),
  expectedImprovement: text("expected_improvement").notNull(),
  implementationComplexity: text("implementation_complexity").notNull(),
  operationalRisk: text("operational_risk").notNull(),
  confidence: real("confidence").notNull(),
  alternatives: text("alternatives").array(),
  isAdminOnly: boolean("is_admin_only").notNull().default(true),
  isApplied: boolean("is_applied").notNull().default(false),
});

// ── Technology Registry ─────────────────────────────────────────────────────
// Current-state summary per technology key (upserted, not append-only).
export const technologyRegistry = pgTable("technology_registry", {
  id: serial("id").primaryKey(),
  technologyKey: text("technology_key").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  vendor: text("vendor").notNull(),
  maturityLevel: text("maturity_level").notNull(),
  compositeScore: real("composite_score"),
  compatibilityLevel: text("compatibility_level"),
  compatibilityScore: real("compatibility_score"),
  openRecommendations: integer("open_recommendations").notNull().default(0),
  lastScannedAt: timestamp("last_scanned_at").notNull().defaultNow(),
  isAdminRestricted: boolean("is_admin_restricted").notNull().default(true),
}, (t) => [unique().on(t.technologyKey)]);

// ── Technology Snapshots ────────────────────────────────────────────────────
// Full platform-wide catalog snapshots — append-only history.
export const technologySnapshots = pgTable("technology_snapshots", {
  id: serial("id").primaryKey(),
  capturedAt: timestamp("captured_at").notNull().defaultNow(),
  totalTechnologies: integer("total_technologies").notNull().default(0),
  totalProviders: integer("total_providers").notNull().default(0),
  categoryCounts: jsonb("category_counts"),            // { [category]: count }
  avgCompositeScore: real("avg_composite_score"),
  compatibleCount: integer("compatible_count").notNull().default(0),
  partialCount: integer("partial_count").notNull().default(0),
  incompatibleCount: integer("incompatible_count").notNull().default(0),
  openRecommendations: integer("open_recommendations").notNull().default(0),
  topOpportunities: text("top_opportunities").array(),
  technologyReadiness: text("technology_readiness").notNull(), // ready | expanding | constrained | limited
  innovationScore: real("innovation_score"),           // 0-1 composite frontier-tech adoption score
  snapshotData: jsonb("snapshot_data"),                // full snapshot for reporting
});
