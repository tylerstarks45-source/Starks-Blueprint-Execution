// ── Build 041: Unified Cognitive Knowledge Graph Engine — Types ───────────
// Self-contained. No re-exports from @workspace/db.

// ── Domains ───────────────────────────────────────────────────────────────
export type KnowledgeGraphDomain =
  | "business" | "technology" | "infrastructure" | "capability"
  | "execution" | "planning" | "goals" | "memory" | "knowledge"
  | "observation" | "reflection" | "learning" | "governance"
  | "strategy" | "portfolio" | "priority" | "tradeoffs" | "systems"
  | "relationships" | "technology_evolution" | "opportunities"
  | "business_graph" | "future_simulation" | "decision_intelligence";

export const KNOWLEDGE_GRAPH_DOMAINS: KnowledgeGraphDomain[] = [
  "business", "technology", "infrastructure", "capability",
  "execution", "planning", "goals", "memory", "knowledge",
  "observation", "reflection", "learning", "governance",
  "strategy", "portfolio", "priority", "tradeoffs", "systems",
  "relationships", "technology_evolution", "opportunities",
  "business_graph", "future_simulation", "decision_intelligence",
];

// ── Node / Edge types ─────────────────────────────────────────────────────
export type KnowledgeGraphNodeType =
  | "knowledge_node" | "evidence_node" | "confidence_node"
  | "temporal_node" | "entity_node" | "reasoning_node";

export type GraphPathType =
  | "reasoning" | "decision" | "execution" | "observation"
  | "learning" | "authority";

export type GraphRelationshipType =
  | "depends_on" | "produces" | "consumes" | "influences"
  | "validates" | "contradicts" | "supports" | "extends"
  | "contains" | "references" | "derived_from" | "leads_to";

// ── Lightweight runtime objects ───────────────────────────────────────────
export interface KGNode {
  id:              number;
  nodeType:        KnowledgeGraphNodeType;
  domain:          KnowledgeGraphDomain;
  externalRefType: string | null;
  externalRefId:   string | null;
  identityHash:    string;
  label:           string;
  description:     string | null;
  sourceEngine:    string | null;
  createdAt:       Date;
}

export interface KGEdge {
  id:               number;
  fromNodeId:       number;
  toNodeId:         number;
  relationshipType: GraphRelationshipType;
  semanticLabel:    string;
  weight:           number;
  sourceEngine:     string | null;
  createdAt:        Date;
}

export interface KGEvidenceRecord {
  nodeId:          number | null;
  edgeId:          number | null;
  sourceEngine:    string;
  evidenceType:    string;
  confidenceValue: number;
}

export interface KGConfidenceRecord {
  nodeId:          number;
  confidenceScore: number;
  confidenceBasis: string;
  evidenceCount:   number;
}

export interface KGPath {
  id:           number;
  pathType:     GraphPathType;
  sourceNodeId: number | null;
  targetNodeId: number | null;
  nodeIds:      number[];
  edgeIds:      number[];
  depth:        number;
}

export interface DomainRegistryEntry {
  domain:    KnowledgeGraphDomain;
  engineId:  string;
  nodeCount: number;
  edgeCount: number;
}

// ── Unified Graph View (returned to EB) ──────────────────────────────────
export interface UnifiedGraphView {
  totalNodes:       number;
  totalEdges:       number;
  totalDomains:     number;
  evidenceItems:    number;
  confidenceAvg:    number;
  lawApplied:       boolean;
  domainRegistry:   DomainRegistryEntry[];
  snapshotId:       number | null;
  computedAt:       Date;
}

// ── EP IDs ────────────────────────────────────────────────────────────────
export const KG_EP_IDS = {
  IDENTITY_RESOLUTION:   "kg.identity.resolution",
  MERGE_RESOLUTION:      "kg.merge.resolution",
  EVIDENCE_LINKING:      "kg.evidence.linking",
  CONFIDENCE_LINKING:    "kg.confidence.linking",
  SEMANTIC_TRAVERSAL:    "kg.semantic.traversal",
  EXPLANATION_PATH:      "kg.explanation.path",
  TEMPORAL_EVOLUTION:    "kg.temporal.evolution",
  ADVISORY:              "kg.advisory",
} as const;

export const GRAPH_THROTTLE_CYCLES = 290;
