import { pgTable, serial, integer, text, boolean, real, timestamp, jsonb, unique } from "drizzle-orm/pg-core";

// ── Technology Relationships ────────────────────────────────────────────────
// Directed edges in the technology relationship graph.
// Each row captures one typed relationship between two technology keys.
export const technologyRelationships = pgTable("technology_relationships", {
  id: serial("id").primaryKey(),
  sourceTechnologyKey: text("source_technology_key").notNull(),
  targetTechnologyKey: text("target_technology_key").notNull(),
  relationshipType: text("relationship_type").notNull(),   // RelationshipType
  strength: real("strength").notNull().default(1.0),       // 0-1: how strong the relationship is
  directionality: text("directionality").notNull().default("directed"), // directed | bidirectional
  description: text("description"),
  evidence: text("evidence"),
  isVerified: boolean("is_verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Relationship Graph ──────────────────────────────────────────────────────
// Aggregate graph metadata: node degrees, edge counts, network properties.
// Append-only snapshots of graph state.
export const relationshipGraph = pgTable("relationship_graph", {
  id: serial("id").primaryKey(),
  capturedAt: timestamp("captured_at").notNull().defaultNow(),
  totalNodes: integer("total_nodes").notNull().default(0),
  totalEdges: integer("total_edges").notNull().default(0),
  avgDegree: real("avg_degree"),
  networkDensity: real("network_density"),              // edges / (nodes*(nodes-1))
  mostConnectedTechnology: text("most_connected_technology"),
  mostConnectedDegree: integer("most_connected_degree"),
  relationshipTypeCounts: jsonb("relationship_type_counts"), // { [type]: count }
  networkScore: real("network_score"),                  // 0-1 overall relationship coverage
  graphData: jsonb("graph_data"),                       // full adjacency data for reporting
});

// ── Relationship Clusters ───────────────────────────────────────────────────
// Groups of tightly connected technologies.
export const relationshipClusters = pgTable("relationship_clusters", {
  id: serial("id").primaryKey(),
  clusterName: text("cluster_name").notNull(),
  clusterType: text("cluster_type").notNull(),          // ecosystem | domain | vendor | protocol
  technologies: text("technologies").array().notNull(),  // technology keys in this cluster
  cohesionScore: real("cohesion_score").notNull(),       // 0-1: how tightly coupled
  primaryTechnology: text("primary_technology"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Technology Ecosystems ───────────────────────────────────────────────────
// Named ecosystems of related technologies.
export const technologyEcosystems = pgTable("technology_ecosystems", {
  id: serial("id").primaryKey(),
  ecosystemName: text("ecosystem_name").notNull(),       // EcosystemType
  displayName: text("display_name").notNull(),
  description: text("description").notNull(),
  technologies: text("technologies").array().notNull(),
  coreTechnology: text("core_technology"),               // primary/anchor technology
  maturityScore: real("maturity_score").notNull(),       // 0-1
  coherenceScore: real("coherence_score").notNull(),     // 0-1: how well technologies work together
  coverageScore: real("coverage_score").notNull(),       // 0-1: how complete the ecosystem is
  techCount: integer("tech_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Dependency Graph ────────────────────────────────────────────────────────
// Typed dependency edges between technologies.
export const dependencyGraph = pgTable("dependency_graph", {
  id: serial("id").primaryKey(),
  dependentKey: text("dependent_key").notNull(),         // technology that has the dependency
  dependencyKey: text("dependency_key").notNull(),        // technology being depended on
  dependencyType: text("dependency_type").notNull(),      // hard | soft | optional | circular | missing
  reason: text("reason"),
  isCurrentlyMet: boolean("is_currently_met").notNull().default(true),
  riskIfMissing: text("risk_if_missing"),                // critical | high | medium | low
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Conflict Graph ──────────────────────────────────────────────────────────
// Detected conflicts between technologies.
export const conflictGraph = pgTable("conflict_graph", {
  id: serial("id").primaryKey(),
  technologyKeyA: text("technology_key_a").notNull(),
  technologyKeyB: text("technology_key_b").notNull(),
  conflictType: text("conflict_type").notNull(),          // ConflictType
  severity: text("severity").notNull(),                   // critical | high | medium | low
  description: text("description").notNull(),
  resolution: text("resolution"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Replacement Graph ───────────────────────────────────────────────────────
// Replacement and migration paths between technologies.
export const replacementGraph = pgTable("replacement_graph", {
  id: serial("id").primaryKey(),
  sourceTechnologyKey: text("source_technology_key").notNull(),  // technology being replaced
  targetTechnologyKey: text("target_technology_key").notNull(),  // replacement technology
  replacementType: text("replacement_type").notNull(),            // full | partial | gradual
  direction: text("direction").notNull(),                         // upgrade | lateral | downgrade
  migrationComplexity: text("migration_complexity").notNull(),    // trivial | low | medium | high | very_high
  migrationRisk: text("migration_risk").notNull(),                // critical | high | medium | low
  estimatedEffort: text("estimated_effort"),                      // human-readable effort estimate
  rollbackStrategy: text("rollback_strategy"),
  compatibilityConfidence: real("compatibility_confidence").notNull(), // 0-1
  benefitScore: real("benefit_score").notNull(),                  // 0-1: expected benefit of migrating
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Relationship Registry ───────────────────────────────────────────────────
// Current state per technology: relationship counts, ecosystem, degree. Upserted.
export const relationshipRegistry = pgTable("relationship_registry", {
  id: serial("id").primaryKey(),
  technologyKey: text("technology_key").notNull(),
  totalRelationships: integer("total_relationships").notNull().default(0),
  outgoingRelationships: integer("outgoing_relationships").notNull().default(0),
  incomingRelationships: integer("incoming_relationships").notNull().default(0),
  ecosystems: text("ecosystems").array(),
  primaryEcosystem: text("primary_ecosystem"),
  dependencyCount: integer("dependency_count").notNull().default(0),
  dependentCount: integer("dependent_count").notNull().default(0),
  conflictCount: integer("conflict_count").notNull().default(0),
  synergyScore: real("synergy_score"),
  networkCentralityScore: real("network_centrality_score"),       // 0-1
  lastBuiltAt: timestamp("last_built_at").notNull().defaultNow(),
}, (t) => [unique().on(t.technologyKey)]);

// ── Relationship Snapshots ──────────────────────────────────────────────────
// Full graph state captures — append-only.
export const relationshipSnapshots = pgTable("relationship_snapshots", {
  id: serial("id").primaryKey(),
  capturedAt: timestamp("captured_at").notNull().defaultNow(),
  totalRelationships: integer("total_relationships").notNull().default(0),
  totalEcosystems: integer("total_ecosystems").notNull().default(0),
  totalClusters: integer("total_clusters").notNull().default(0),
  totalDependencies: integer("total_dependencies").notNull().default(0),
  totalConflicts: integer("total_conflicts").notNull().default(0),
  totalReplacements: integer("total_replacements").notNull().default(0),
  networkScore: real("network_score"),
  synergyOpportunities: integer("synergy_opportunities").notNull().default(0),
  conflictAlerts: integer("conflict_alerts").notNull().default(0),
  migrationOpportunities: integer("migration_opportunities").notNull().default(0),
  relationshipCoverage: real("relationship_coverage"),            // fraction of catalog with ≥1 relationship
  snapshotData: jsonb("snapshot_data"),
});
