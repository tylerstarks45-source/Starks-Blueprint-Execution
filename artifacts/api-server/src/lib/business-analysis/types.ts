// ─── Build 016: Business Analysis Engine — Types ──────────────────────────────

// ── Finding Categories / Severities ───────────────────────────────────────────

export type FindingCategory =
  | "graph"
  | "kpi"
  | "health"
  | "bottleneck"
  | "constraint"
  | "leverage"
  | "dependency"
  | "execution"
  | "operational"
  | "growth";

export type FindingSeverity = "info" | "low" | "medium" | "high" | "critical";

// ── Bottleneck Types ──────────────────────────────────────────────────────────

export type BottleneckType =
  | "execution"
  | "operational"
  | "marketing"
  | "sales"
  | "automation"
  | "dependency";

// ── Constraint Types ──────────────────────────────────────────────────────────

export type ConstraintType =
  | "resource"
  | "financial"
  | "time"
  | "workflow"
  | "technology"
  | "capacity"
  | "priority_conflict"
  | "goal_conflict";

// ── Leverage Types ────────────────────────────────────────────────────────────

export type LeverageType =
  | "kpi_multiplier"
  | "project_multiplier"
  | "automation_remover"
  | "dependency_resolver"
  | "shared_asset"
  | "cross_functional";

// ── Graph Analysis ────────────────────────────────────────────────────────────

export interface GraphAnalysisResult {
  nodeCount: number;
  edgeCount: number;
  nodeDensity: number;               // nodes / (nodes + edges)
  relationshipDensity: number;       // edges / max-possible-edges
  disconnectedClusters: number;      // count of components not connected to main
  criticalHubs: CriticalHub[];
  dependencyChainLength: number;     // longest dependency path
  complexityScore: number;           // 0-1 composite
  maturityScore: number;             // 0-1 composite
  completenessScore: number;         // 0-1: % of expected node types present
  nodeTypeDistribution: Record<string, number>;
  edgeTypeDistribution: Record<string, number>;
}

export interface CriticalHub {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  inDegree: number;
  outDegree: number;
  totalDegree: number;
  hubScore: number; // 0-1
}

// ── KPI Analysis ──────────────────────────────────────────────────────────────

export interface KpiAnalysisResult {
  totalKpis: number;
  healthyKpis: number;
  decliningKpis: string[];         // KPI IDs
  improvingKpis: string[];
  volatileKpis: string[];
  missingKpiTypes: string[];       // expected types not present
  unmeasuredObjectives: string[];  // objective node IDs with no measuring KPI
  revenueConcentration: number;    // 0-1 (1 = all revenue from one stream)
  growthConsistency: number;       // 0-1 (1 = all growth KPIs trending same direction)
  kpiCoverageRate: number;         // % of node types that have a KPI
  findings: string[];              // human-readable finding texts
}

// ── Health Analysis ───────────────────────────────────────────────────────────

export interface HealthAnalysisResult {
  overallHealth: number;
  weakestDimension: string;
  weakestScore: number;
  strongestDimension: string;
  strongestScore: number;
  healthStability: number;   // 1 - spread between min and max dimension score
  healthDrift: "improving" | "declining" | "stable" | "unknown";
  healthConfidence: number;  // based on data completeness
  dimensionScores: Record<string, number>;
  criticalDimensions: string[];  // dimensions below 0.4
  warningDimensions: string[];   // dimensions between 0.4 and 0.6
  healthyDimensions: string[];   // dimensions above 0.6
}

// ── Executive Finding ─────────────────────────────────────────────────────────

export interface ExecutiveFinding {
  id: string;
  businessId: number;
  reportId: string;
  userId: number | null;
  category: FindingCategory;
  severity: FindingSeverity;
  title: string;
  description: string;
  evidence: string[];
  confidence: number;         // 0-1
  businessDomains: string[];
  relatedNodeIds: string[];
  relatedKpiIds: string[];
  relatedHealthDimensions: string[];
  version: number;
  createdAt: Date;
}

// ── Business Bottleneck ───────────────────────────────────────────────────────

export interface BusinessBottleneck {
  id: string;
  businessId: number;
  reportId: string;
  userId: number | null;
  bottleneckType: BottleneckType;
  title: string;
  description: string;
  severity: number;          // 0-1
  evidence: string[];
  businessImpact: string;
  confidence: number;        // 0-1
  affectedNodeIds: string[];
  createdAt: Date;
}

// ── Business Constraint ───────────────────────────────────────────────────────

export interface BusinessConstraint {
  id: string;
  businessId: number;
  reportId: string;
  userId: number | null;
  constraintType: ConstraintType;
  title: string;
  description: string;
  severity: number;           // 0-1
  affectedDomains: string[];
  affectedNodeIds: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
}

// ── Business Leverage Point ───────────────────────────────────────────────────

export interface BusinessLeveragePoint {
  id: string;
  businessId: number;
  reportId: string;
  userId: number | null;
  leverageType: LeverageType;
  title: string;
  description: string;
  leverageScore: number;     // 0-1
  affectedNodeIds: string[];
  affectedKpiIds: string[];
  evidenceCount: number;
  createdAt: Date;
}

// ── Analysis Snapshot ─────────────────────────────────────────────────────────

export interface AnalysisSnapshot {
  id: string;
  businessId: number;
  reportId: string;
  userId: number | null;
  nodeCount: number;
  edgeCount: number;
  kpiCount: number;
  healthScore: number | null;
  depCount: number;
  graphState: Record<string, unknown>;
  createdAt: Date;
}

// ── Analysis Metrics ──────────────────────────────────────────────────────────

export interface AnalysisMetrics {
  id: string;
  businessId: number;
  reportId: string;
  userId: number | null;
  findingCount: number;
  criticalFindings: number;
  highFindings: number;
  bottleneckCount: number;
  constraintCount: number;
  leverageCount: number;
  complexityScore: number;
  maturityScore: number;
  confidenceScore: number;
  stabilityScore: number;
  computedMs: number;
  createdAt: Date;
}

// ── Analysis Registry ─────────────────────────────────────────────────────────

export interface AnalysisRegistryEntry {
  id: string;
  businessId: number;
  userId: number | null;
  reportCount: number;
  latestReportId: string | null;
  latestComplexity: number | null;
  latestMaturity: number | null;
  latestConfidence: number | null;
  latestStability: number | null;
  lastAnalyzedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Full Analysis Report ──────────────────────────────────────────────────────

export interface BusinessAnalysisReport {
  id: string;
  businessId: number;
  userId: number | null;
  reportVersion: number;
  executiveSummary: string;
  businessOverview: BusinessOverview;
  graphAnalysis: GraphAnalysisResult;
  kpiAnalysis: KpiAnalysisResult;
  healthAnalysis: HealthAnalysisResult;
  bottlenecks: BusinessBottleneck[];
  constraints: BusinessConstraint[];
  leveragePoints: BusinessLeveragePoint[];
  businessStability: number;
  businessComplexityScore: number;
  businessMaturityScore: number;
  businessConfidence: number;
  findingCount: number;
  criticalFindingCount: number;
  createdAt: Date;
}

export interface BusinessOverview {
  businessId: number;
  businessName: string;
  businessType: string;
  nodeCount: number;
  edgeCount: number;
  kpiCount: number;
  depCount: number;
  overallHealth: number | null;
  topNodeType: string | null;
}

// ── EB Analysis Summary ───────────────────────────────────────────────────────

export interface BusinessAnalysisSummary {
  businessId: number;
  complexityScore: number;
  maturityScore: number;
  stabilityScore: number;
  confidence: number;
  criticalFindings: number;
  topBottleneck: Pick<BusinessBottleneck, "bottleneckType" | "title" | "severity"> | null;
  topConstraint: Pick<BusinessConstraint, "constraintType" | "title" | "severity"> | null;
  topLeverage: Pick<BusinessLeveragePoint, "leverageType" | "title" | "leverageScore"> | null;
  weakestDimension: string | null;
  analyzedAt: Date;
}

// ── Extension Point IDs ───────────────────────────────────────────────────────

export const ANALYSIS_EXTENSION_POINT_IDS = {
  OPPORTUNITY_DETECTION:       "analysis-opportunity-detection",
  SCENARIO_ANALYSIS:           "analysis-scenario-analysis",
  FORECASTING:                 "analysis-forecasting",
  BUSINESS_BENCHMARKING:       "analysis-business-benchmarking",
  MARKET_COMPARISON:           "analysis-market-comparison",
  INDUSTRY_ANALYSIS:           "analysis-industry-analysis",
  COMPETITIVE_INTELLIGENCE:    "analysis-competitive-intelligence",
  STRATEGIC_RECOMMENDATIONS:   "analysis-strategic-recommendations",
} as const;
