// ── Build 034: Technology Relationship Intelligence Engine ─────────────────
// Types are self-contained. No re-exports from @workspace/db.

// ── Relationship Types (21 from spec) ─────────────────────────────────────
export type RelationshipType =
  | "depends_on"
  | "enhances"
  | "accelerates"
  | "optimizes"
  | "requires"
  | "supports"
  | "conflicts_with"
  | "replaces"
  | "can_replace"
  | "works_best_with"
  | "alternative_to"
  | "shares_resources"
  | "consumes"
  | "produces"
  | "secures"
  | "observes"
  | "hosts"
  | "extends"
  | "limits"
  | "enables"
  | "complements";

// ── Dependency Types ───────────────────────────────────────────────────────
export type DependencyType = "hard" | "soft" | "optional" | "circular" | "missing";
export type DependencyRisk = "critical" | "high" | "medium" | "low";

// ── Conflict Types ─────────────────────────────────────────────────────────
export type ConflictType =
  | "version"
  | "runtime"
  | "infrastructure"
  | "licensing"
  | "security"
  | "execution"
  | "resource"
  | "operational";
export type ConflictSeverity = "critical" | "high" | "medium" | "low";

// ── Ecosystem Types (10 from spec) ────────────────────────────────────────
export type EcosystemType =
  | "cloud"
  | "ai"
  | "browser"
  | "developer"
  | "marketing"
  | "commerce"
  | "infrastructure"
  | "security"
  | "data"
  | "execution";

// ── Replacement / Migration ────────────────────────────────────────────────
export type ReplacementType = "full" | "partial" | "gradual";
export type ReplacementDirection = "upgrade" | "lateral" | "downgrade";
export type MigrationComplexity = "trivial" | "low" | "medium" | "high" | "very_high";
export type MigrationRisk = "critical" | "high" | "medium" | "low";

// ── Directionality ────────────────────────────────────────────────────────
export type Directionality = "directed" | "bidirectional";

// ── Extension Point IDs ────────────────────────────────────────────────────
export const EP_TRI_RELATIONSHIP_DISCOVERED  = "technology-relationships:relationship-discovered";
export const EP_TRI_DEPENDENCY_MAPPED        = "technology-relationships:dependency-mapped";
export const EP_TRI_ECOSYSTEM_CLASSIFIED     = "technology-relationships:ecosystem-classified";
export const EP_TRI_SYNERGY_CALCULATED       = "technology-relationships:synergy-calculated";
export const EP_TRI_CONFLICT_DETECTED        = "technology-relationships:conflict-detected";
export const EP_TRI_MIGRATION_MAPPED         = "technology-relationships:migration-mapped";
export const EP_TRI_RECOMMENDATION_PRODUCED  = "technology-relationships:recommendation-produced";
export const EP_TRI_GRAPH_REBUILT            = "technology-relationships:graph-rebuilt";

// ── Core Data Structures ───────────────────────────────────────────────────
export interface TechnologyRelationship {
  sourceTechnologyKey: string;
  targetTechnologyKey: string;
  relationshipType: RelationshipType;
  strength: number;
  directionality: Directionality;
  description?: string;
  evidence?: string;
}

export interface DependencyEdge {
  dependentKey: string;
  dependencyKey: string;
  dependencyType: DependencyType;
  reason?: string;
  isCurrentlyMet: boolean;
  riskIfMissing?: DependencyRisk;
}

export interface ConflictEdge {
  technologyKeyA: string;
  technologyKeyB: string;
  conflictType: ConflictType;
  severity: ConflictSeverity;
  description: string;
  resolution?: string;
}

export interface ReplacementEdge {
  sourceTechnologyKey: string;
  targetTechnologyKey: string;
  replacementType: ReplacementType;
  direction: ReplacementDirection;
  migrationComplexity: MigrationComplexity;
  migrationRisk: MigrationRisk;
  estimatedEffort?: string;
  rollbackStrategy?: string;
  compatibilityConfidence: number;
  benefitScore: number;
  description?: string;
}

export interface EcosystemDefinition {
  ecosystemName: EcosystemType;
  displayName: string;
  description: string;
  technologies: string[];
  coreTechnology?: string;
  maturityScore: number;
  coherenceScore: number;
  coverageScore: number;
}

export interface SynergyScore {
  technologyKeyA: string;
  technologyKeyB: string;
  performanceGain: number;
  operationalGain: number;
  costReduction: number;
  reliabilityImprovement: number;
  developerProductivity: number;
  executionThroughput: number;
  maintainability: number;
  compositeScore: number;
}

export interface RelationshipRecommendationRecord {
  sourceTechnologyKey: string;
  targetTechnologyKey: string;
  recommendationType: "integration" | "migration" | "replacement" | "evaluation" | "consolidation";
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  relationshipEvidence: string;
  expectedBenefit: string;
  operationalImpact: string;
  performanceImpact: string;
  costImpact: string;
  securityImpact: string;
  compatibilityImpact: string;
  risk: string;
  confidence: number;
  alternatives: string[];
}

// ── EB Summary ────────────────────────────────────────────────────────────
export interface TechnologyRelationshipSummary {
  totalRelationships: number;
  totalEcosystems: number;
  totalClusters: number;
  totalDependencies: number;
  totalConflicts: number;
  totalReplacements: number;
  networkScore: number;
  relationshipCoverage: number;
  synergyOpportunities: number;
  conflictAlerts: number;
  migrationOpportunities: number;
  topEcosystems: string[];
  activeConflicts: ConflictEdge[];
  topSynergyPairs: Array<{ a: string; b: string; score: number }>;
}
