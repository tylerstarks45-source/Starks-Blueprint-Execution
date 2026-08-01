// ── Build 034: Technology Relationship Intelligence Engine — Public Barrel ──
export { declareTechnologyRelationshipExtensionPoints } from "./tri-extension-points";
export { buildRelationships, buildAdjacencyMap, computeNetworkStats } from "./tri-relationship-engine";
export { deriveDependencies, detectCircularDependencies } from "./tri-dependency-engine";
export { buildEcosystems, getEcosystemsForTechnology, getPrimaryEcosystem } from "./tri-ecosystem-engine";
export { computeAllSynergies, computeSynergy } from "./tri-synergy-engine";
export { buildConflicts, countActiveConflicts } from "./tri-conflict-engine";
export { buildMigrationPaths } from "./tri-migration-engine";
export { generateAllRelationshipRecommendations } from "./tri-recommendation-engine";
export { runGraphRebuild, buildRelationshipSummary } from "./tri-orchestrator";
export type {
  RelationshipType,
  DependencyType,
  DependencyRisk,
  ConflictType,
  ConflictSeverity,
  EcosystemType,
  ReplacementType,
  ReplacementDirection,
  MigrationComplexity,
  MigrationRisk,
  TechnologyRelationship,
  DependencyEdge,
  ConflictEdge,
  ReplacementEdge,
  EcosystemDefinition,
  SynergyScore,
  RelationshipRecommendationRecord,
  TechnologyRelationshipSummary,
} from "./types";
