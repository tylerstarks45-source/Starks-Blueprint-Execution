// ─── Build 015: Business Operating System — Types ─────────────────────────────

// ── Node Types ────────────────────────────────────────────────────────────────

export type BusinessNodeType =
  | "company"
  | "department"
  | "project"
  | "product"
  | "service"
  | "offer"
  | "funnel"
  | "campaign"
  | "customer"
  | "lead"
  | "partner"
  | "supplier"
  | "employee"
  | "agent"
  | "asset"
  | "process"
  | "automation"
  | "knowledge_asset"
  | "revenue_stream"
  | "expense"
  | "kpi_node"
  | "objective"
  | "risk";

export const ALL_NODE_TYPES: BusinessNodeType[] = [
  "company", "department", "project", "product", "service", "offer", "funnel", "campaign",
  "customer", "lead", "partner", "supplier", "employee", "agent", "asset", "process",
  "automation", "knowledge_asset", "revenue_stream", "expense", "kpi_node", "objective", "risk",
];

// ── Edge Types ────────────────────────────────────────────────────────────────

export type BusinessEdgeType =
  | "owns"
  | "depends_on"
  | "supports"
  | "blocks"
  | "generates"
  | "markets"
  | "sells"
  | "contains"
  | "uses"
  | "belongs_to"
  | "managed_by"
  | "created_from"
  | "optimized_by"
  | "measures";

export const ALL_EDGE_TYPES: BusinessEdgeType[] = [
  "owns", "depends_on", "supports", "blocks", "generates", "markets", "sells",
  "contains", "uses", "belongs_to", "managed_by", "created_from", "optimized_by", "measures",
];

// ── Lifecycle / Status ────────────────────────────────────────────────────────

export type NodeLifecycle = "planning" | "active" | "paused" | "deprecated" | "archived";
export type NodeHealth = "healthy" | "warning" | "critical" | "unknown";
export type NodeStatus = "active" | "inactive" | "pending" | "blocked" | "completed";
export type NodeRisk = "low" | "medium" | "high" | "critical";

// ── KPI Types ─────────────────────────────────────────────────────────────────

export type KpiType =
  | "revenue"
  | "mrr"
  | "arr"
  | "conversion_rate"
  | "cac"
  | "ltv"
  | "profit"
  | "traffic"
  | "lead_velocity"
  | "retention"
  | "churn"
  | "pipeline_value"
  | "growth_rate"
  | "custom";

export type KpiTrend = "up" | "down" | "stable" | "volatile";
export type KpiPeriod = "daily" | "weekly" | "monthly" | "quarterly" | "annual";

// ── Dependency Types ──────────────────────────────────────────────────────────

export type DependencyType =
  | "critical_path"
  | "single_point_of_failure"
  | "blocked"
  | "missing_asset"
  | "broken_workflow"
  | "risk_propagation";

// ── Business Node ─────────────────────────────────────────────────────────────

export interface BusinessNode {
  id: string;
  businessId: number;
  userId: number | null;
  nodeType: BusinessNodeType;
  name: string;
  description: string;
  lifecycle: NodeLifecycle;
  health: NodeHealth;
  status: NodeStatus;
  ownerName: string | null;
  priority: number;           // 1 (highest) – 10 (lowest)
  risk: NodeRisk;
  confidence: number;         // 0-1
  businessValue: number;      // 0-1
  strategicImportance: number;// 0-1
  isActive: boolean;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ── Business Edge ─────────────────────────────────────────────────────────────

export interface BusinessEdge {
  id: string;
  businessId: number;
  userId: number | null;
  fromNodeId: string;
  toNodeId: string;
  edgeType: BusinessEdgeType;
  label: string | null;
  weight: number;             // 0-1 relationship strength
  version: number;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ── Business KPI ──────────────────────────────────────────────────────────────

export interface BusinessKpi {
  id: string;
  businessId: number;
  userId: number | null;
  nodeId: string | null;
  name: string;
  kpiType: KpiType;
  currentValue: number | null;
  targetValue: number | null;
  previousValue: number | null;
  unit: string;
  trend: KpiTrend;
  period: KpiPeriod;
  isHealthy: boolean;
  metadata: Record<string, unknown>;
  measuredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Business Health ───────────────────────────────────────────────────────────

export interface BusinessHealth {
  id: string;
  businessId: number;
  userId: number | null;
  overallHealth: number;        // 0-1
  financialHealth: number;
  marketingHealth: number;
  salesHealth: number;
  operationalHealth: number;
  productHealth: number;
  growthHealth: number;
  executiveHealth: number;
  issues: HealthIssue[];
  recommendations: string[];
  nodeCount: number;
  kpiCount: number;
  dependencyCount: number;
  criticalDependencies: number;
  computedAt: Date;
}

export interface HealthIssue {
  dimension: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  affectedNodeIds?: string[];
}

// ── Business Dependency ───────────────────────────────────────────────────────

export interface BusinessDependency {
  id: string;
  businessId: number;
  userId: number | null;
  fromNodeId: string | null;
  toNodeId: string | null;
  dependencyType: DependencyType;
  severity: number;
  description: string;
  resolved: boolean;
  resolvedAt: Date | null;
  metadata: Record<string, unknown>;
  detectedAt: Date;
}

// ── Business Snapshot ─────────────────────────────────────────────────────────

export interface BusinessSnapshot {
  id: string;
  businessId: number;
  userId: number | null;
  nodeCount: number;
  edgeCount: number;
  kpiCount: number;
  healthScore: number | null;
  reason: string;
  graphState: Record<string, unknown>;
  createdAt: Date;
}

// ── Business Registry Entry ───────────────────────────────────────────────────

export interface BusinessRegistryEntry {
  id: string;
  businessId: number;
  userId: number | null;
  nodeCount: number;
  edgeCount: number;
  kpiCount: number;
  overallHealth: number | null;
  lastActivityAt: Date | null;
  registeredAt: Date;
  updatedAt: Date;
}

// ── Business Context Summary (for EB) ─────────────────────────────────────────

export interface BusinessGraphSummary {
  businessId: number;
  businessName: string;
  nodeCount: number;
  edgeCount: number;
  topNodes: Pick<BusinessNode, "id" | "name" | "nodeType" | "health" | "priority" | "strategicImportance">[];
  criticalRisks: Pick<BusinessNode, "id" | "name" | "nodeType" | "risk">[];
  currentKpis: Pick<BusinessKpi, "id" | "name" | "kpiType" | "currentValue" | "unit" | "trend" | "isHealthy">[];
  health: Pick<BusinessHealth, "overallHealth" | "financialHealth" | "marketingHealth" | "salesHealth" | "operationalHealth" | "productHealth" | "growthHealth" | "executiveHealth"> | null;
  criticalDependencies: Pick<BusinessDependency, "id" | "dependencyType" | "severity" | "description">[];
  opportunities: string[];    // derived from graph state
  lastActivityAt: Date | null;
}

// ── Diagnostics ───────────────────────────────────────────────────────────────

export interface BusinessGraphDiagnostics {
  userId: number;
  registeredBusinesses: number;
  totalNodes: number;
  totalEdges: number;
  totalKpis: number;
  totalDependencies: number;
  unresolvedDependencies: number;
  averageHealth: number | null;
  topNodeTypes: Record<string, number>;
  topEdgeTypes: Record<string, number>;
}

// ── Extension Point IDs ───────────────────────────────────────────────────────

export const BUSINESS_GRAPH_EXTENSION_POINT_IDS = {
  BUSINESS_GRAPH_CREATED:       "business-graph-created",
  BUSINESS_NODE_ADDED:          "business-node-added",
  BUSINESS_RELATIONSHIP_CREATED: "business-relationship-created",
  BUSINESS_KPI_UPDATED:         "business-kpi-updated",
  BUSINESS_HEALTH_CALCULATED:   "business-health-calculated",
  BUSINESS_DEPENDENCY_DETECTED: "business-dependency-detected",
  BUSINESS_OPPORTUNITY_DETECTED: "business-opportunity-detected",
  BUSINESS_SNAPSHOT_CREATED:    "business-snapshot-created",
} as const;
