// ─── Build 017: Opportunity Discovery — Types ─────────────────────────────────

// ── Extension Point IDs ───────────────────────────────────────────────────────

export const EP_OPPORTUNITY_DETECTED = "opportunity-detected";
export const EP_OPPORTUNITY_CLASSIFIED = "opportunity-classified";
export const EP_OPPORTUNITY_SCORED = "opportunity-scored";
export const EP_OPPORTUNITY_RANKED = "opportunity-ranked";
export const EP_OPPORTUNITY_EVIDENCE_LINKED = "opportunity-evidence-linked";
export const EP_OPPORTUNITY_CRITICAL_DISCOVERED = "opportunity-critical-discovered";
export const EP_OPPORTUNITY_LIFECYCLE_CHANGED = "opportunity-lifecycle-changed";
export const EP_OPPORTUNITY_REPORT_GENERATED = "opportunity-report-generated";

// ── Enumerations ──────────────────────────────────────────────────────────────

export type OpportunityCategory =
  | "revenue_growth"
  | "cost_reduction"
  | "automation"
  | "marketing"
  | "sales"
  | "customer_success"
  | "operations"
  | "product"
  | "infrastructure"
  | "finance"
  | "risk_reduction"
  | "knowledge";

export const ALL_OPPORTUNITY_CATEGORIES: OpportunityCategory[] = [
  "revenue_growth", "cost_reduction", "automation", "marketing", "sales",
  "customer_success", "operations", "product", "infrastructure", "finance",
  "risk_reduction", "knowledge",
];

export type OpportunityStatus = "active" | "resolved" | "dismissed" | "monitoring";

export type OpportunityDiscoverySource =
  | "bottleneck"
  | "constraint"
  | "leverage"
  | "kpi_trend"
  | "health_trend"
  | "graph_topology";

export type PriorityGroup = "critical" | "high" | "medium" | "low";

export type EvidenceType = "finding" | "node" | "kpi" | "health" | "dependency";

// ── Core domain objects ───────────────────────────────────────────────────────

export interface OpportunityEvidence {
  id: string;
  opportunityId: string;
  businessId: number;
  evidenceType: EvidenceType;
  referenceId: string;
  referenceType: string;
  description: string;
  weight: number;                // 0–1
  createdAt: Date;
}

export interface OpportunityScore {
  id: string;
  opportunityId: string;
  businessId: number;
  reportId: string;
  businessImpact: number;        // 0–1
  estimatedReach: number;        // 0–1
  estimatedEffort: number;       // 0–1  (higher = harder)
  risk: number;                  // 0–1
  confidence: number;            // 0–1
  strategicValue: number;        // 0–1
  compositeScore: number;        // 0–1  composite
  scoringVersion: number;
  createdAt: Date;
}

export interface ExecutiveOpportunity {
  id: string;
  businessId: number;
  reportId: string;
  userId: number | null;
  category: OpportunityCategory;
  title: string;
  description: string;
  discoverySource: OpportunityDiscoverySource;
  status: OpportunityStatus;
  // Scoring dimensions (denormalized for fast reads)
  businessImpact: number;
  estimatedReach: number;
  estimatedEffort: number;
  risk: number;
  confidence: number;
  strategicValue: number;
  compositeScore: number;
  // Ranking
  rankPosition: number | null;
  priorityGroup: PriorityGroup;
  // Evidence
  evidenceCount: number;
  evidence: OpportunityEvidence[];
  // Links
  analysisReportId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OpportunityRanking {
  id: string;
  reportId: string;
  businessId: number;
  opportunityId: string;
  rankPosition: number;
  priorityGroup: PriorityGroup;
  scoreAtRank: number;
  createdAt: Date;
}

export interface OpportunitySnapshot {
  id: string;
  businessId: number;
  reportId: string;
  totalOpportunities: number;
  topOpportunityId: string | null;
  highestScore: number | null;
  categoryDistribution: Record<string, number>;
  priorityDistribution: Record<string, number>;
  sourceDistribution: Record<string, number>;
  createdAt: Date;
}

export interface OpportunityReport {
  id: string;
  businessId: number;
  analysisReportId: string | null;
  userId: number | null;
  opportunities: ExecutiveOpportunity[];
  rankings: OpportunityRanking[];
  totalOpportunities: number;
  criticalOpportunities: number;
  highPriorityOpportunities: number;
  topCategory: OpportunityCategory | null;
  highestScore: number | null;
  avgConfidence: number | null;
  discoveryDurationMs: number;
  createdAt: Date;
}

export interface OpportunityRegistryEntry {
  id: string;
  businessId: number;
  userId: number | null;
  totalDiscovered: number;
  activeCount: number;
  resolvedCount: number;
  dismissedCount: number;
  latestReportId: string | null;
  highestScore: number | null;
  highestConfidence: number | null;
  highestBusinessValue: number | null;
  lastDiscoveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── EB-facing summary ─────────────────────────────────────────────────────────

export interface TopOpportunitySummary {
  id: string;
  category: OpportunityCategory;
  title: string;
  compositeScore: number;
  confidence: number;
  businessImpact: number;
  priorityGroup: PriorityGroup;
  discoverySource: OpportunityDiscoverySource;
}

export interface OpportunityDiscoverySummary {
  businessId: number;
  totalOpportunities: number;
  criticalCount: number;
  highCount: number;
  topOpportunities: TopOpportunitySummary[];   // top 3
  highestScore: number | null;
  highestConfidence: number | null;
  highestBusinessValue: number | null;
  topCategory: OpportunityCategory | null;
  discoveredAt: Date;
}

// ── Internal detection input ──────────────────────────────────────────────────

export interface OpportunityCandidate {
  category: OpportunityCategory;
  title: string;
  description: string;
  discoverySource: OpportunityDiscoverySource;
  businessImpact: number;
  estimatedReach: number;
  estimatedEffort: number;
  risk: number;
  confidence: number;
  strategicValue: number;
  evidenceRefs: Array<{
    evidenceType: EvidenceType;
    referenceId: string;
    referenceType: string;
    description: string;
    weight: number;
  }>;
}
