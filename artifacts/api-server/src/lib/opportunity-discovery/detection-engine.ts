// ─── Build 017: Opportunity Detection Engine ──────────────────────────────────
//
// Discovers raw opportunity candidates from a BusinessAnalysisReport.
// Sources: bottlenecks, constraints, leverage points, KPI trends,
//          health trends, graph topology.
//
// Pure function — no DB I/O. Returns OpportunityCandidate[].

import type { BusinessAnalysisReport } from "../business-analysis/types";
import type { OpportunityCandidate, OpportunityCategory, OpportunityDiscoverySource } from "./types";

// ── Bottleneck → Opportunity ──────────────────────────────────────────────────

const BOTTLENECK_CATEGORY_MAP: Record<string, OpportunityCategory> = {
  execution: "operations",
  operational: "operations",
  marketing: "marketing",
  sales: "sales",
  automation: "automation",
  dependency: "infrastructure",
};

function detectFromBottlenecks(report: BusinessAnalysisReport): OpportunityCandidate[] {
  return report.bottlenecks
    .filter((b) => b.severity > 0.3)
    .map((b) => {
      const category = BOTTLENECK_CATEGORY_MAP[b.bottleneckType] ?? "operations";
      const severity = b.severity;
      return {
        category,
        title: `Address ${b.title}`,
        description: `Bottleneck detected: ${b.description}. Resolving this creates measurable capacity for business growth.`,
        discoverySource: "bottleneck" as OpportunityDiscoverySource,
        businessImpact: Math.min(severity * 0.9, 0.95),
        estimatedReach: severity > 0.7 ? 0.8 : 0.5,
        estimatedEffort: severity > 0.7 ? 0.7 : 0.4,
        risk: 0.2,
        confidence: b.confidence,
        strategicValue: severity > 0.6 ? 0.75 : 0.5,
        evidenceRefs: [
          {
            evidenceType: "finding" as const,
            referenceId: b.id,
            referenceType: "business_bottleneck",
            description: b.businessImpact || `${b.bottleneckType} bottleneck with severity ${(severity * 100).toFixed(0)}%`,
            weight: 0.9,
          },
          ...b.affectedNodeIds.map((nid) => ({
            evidenceType: "node" as const,
            referenceId: nid,
            referenceType: "business_node",
            description: `Affected node: ${nid}`,
            weight: 0.5,
          })),
        ],
      };
    });
}

// ── Constraint → Opportunity ──────────────────────────────────────────────────

const CONSTRAINT_CATEGORY_MAP: Record<string, OpportunityCategory> = {
  resource: "operations",
  financial: "finance",
  time: "operations",
  workflow: "automation",
  technology: "infrastructure",
  capacity: "operations",
  priority_conflict: "knowledge",
  goal_conflict: "knowledge",
};

function detectFromConstraints(report: BusinessAnalysisReport): OpportunityCandidate[] {
  return report.constraints
    .filter((c) => c.severity > 0.35)
    .map((c) => {
      const category = CONSTRAINT_CATEGORY_MAP[c.constraintType] ?? "operations";
      const severity = c.severity;
      return {
        category,
        title: `Resolve ${c.title}`,
        description: `Constraint identified: ${c.description}. Addressing this unlocks capacity or eliminates friction.`,
        discoverySource: "constraint" as OpportunityDiscoverySource,
        businessImpact: Math.min(severity * 0.85, 0.9),
        estimatedReach: 0.55,
        estimatedEffort: 0.5,
        risk: 0.25,
        confidence: 0.7,
        strategicValue: severity > 0.6 ? 0.7 : 0.45,
        evidenceRefs: [
          {
            evidenceType: "finding" as const,
            referenceId: c.id,
            referenceType: "business_constraint",
            description: `${c.constraintType} constraint: ${c.description.slice(0, 80)}`,
            weight: 0.85,
          },
        ],
      };
    });
}

// ── Leverage → Opportunity ────────────────────────────────────────────────────

const LEVERAGE_CATEGORY_MAP: Record<string, OpportunityCategory> = {
  kpi_multiplier: "revenue_growth",
  project_multiplier: "operations",
  automation_remover: "automation",
  dependency_resolver: "infrastructure",
  shared_asset: "cost_reduction",
  cross_functional: "operations",
};

function detectFromLeverage(report: BusinessAnalysisReport): OpportunityCandidate[] {
  return report.leveragePoints
    .filter((l) => l.leverageScore > 0.4)
    .map((l) => {
      const category = LEVERAGE_CATEGORY_MAP[l.leverageType] ?? "operations";
      return {
        category,
        title: `Exploit ${l.title}`,
        description: `Leverage point identified: ${l.description}. This offers asymmetric return on investment relative to effort.`,
        discoverySource: "leverage" as OpportunityDiscoverySource,
        businessImpact: Math.min(l.leverageScore * 1.1, 0.95),
        estimatedReach: l.leverageScore > 0.7 ? 0.85 : 0.6,
        estimatedEffort: 0.35,    // leverage = low effort by definition
        risk: 0.15,
        confidence: Math.min(0.6 + l.evidenceCount * 0.05, 0.95),
        strategicValue: l.leverageScore,
        evidenceRefs: [
          {
            evidenceType: "finding" as const,
            referenceId: l.id,
            referenceType: "business_leverage_point",
            description: `Leverage score: ${(l.leverageScore * 100).toFixed(0)}%`,
            weight: 0.9,
          },
        ],
      };
    });
}

// ── KPI trends → Opportunity ──────────────────────────────────────────────────

function detectFromKpiTrends(report: BusinessAnalysisReport): OpportunityCandidate[] {
  const candidates: OpportunityCandidate[] = [];
  const ka = report.kpiAnalysis as any;
  if (!ka) return candidates;

  const { decliningKpis = [], missingKpis = [], volatileKpis = [] } = ka;

  if (decliningKpis.length > 0) {
    candidates.push({
      category: "revenue_growth",
      title: `Reverse ${decliningKpis.length} declining KPI${decliningKpis.length > 1 ? "s" : ""}`,
      description: `${decliningKpis.length} KPI${decliningKpis.length > 1 ? "s are" : " is"} on a declining trend. Addressing these directly improves measurable business performance.`,
      discoverySource: "kpi_trend" as OpportunityDiscoverySource,
      businessImpact: Math.min(0.3 + decliningKpis.length * 0.08, 0.85),
      estimatedReach: 0.65,
      estimatedEffort: 0.5,
      risk: 0.2,
      confidence: 0.8,
      strategicValue: 0.7,
      evidenceRefs: decliningKpis.slice(0, 3).map((k: any) => ({
        evidenceType: "kpi" as const,
        referenceId: k.id ?? k.name ?? "kpi",
        referenceType: "business_kpi",
        description: `Declining KPI: ${k.name ?? k.id}`,
        weight: 0.8,
      })),
    });
  }

  if (missingKpis.length > 0) {
    candidates.push({
      category: "knowledge",
      title: `Establish ${missingKpis.length} missing KPI measurement${missingKpis.length > 1 ? "s" : ""}`,
      description: `${missingKpis.length} important KPI${missingKpis.length > 1 ? "s have" : " has"} no measurement data. Building visibility creates decision-making leverage.`,
      discoverySource: "kpi_trend" as OpportunityDiscoverySource,
      businessImpact: 0.5,
      estimatedReach: 0.7,
      estimatedEffort: 0.35,
      risk: 0.05,
      confidence: 0.9,
      strategicValue: 0.6,
      evidenceRefs: missingKpis.slice(0, 3).map((k: any) => ({
        evidenceType: "kpi" as const,
        referenceId: k.id ?? k.name ?? "kpi",
        referenceType: "business_kpi",
        description: `Missing KPI: ${k.name ?? k.id}`,
        weight: 0.7,
      })),
    });
  }

  if (volatileKpis.length > 0) {
    candidates.push({
      category: "operations",
      title: `Stabilise ${volatileKpis.length} volatile KPI${volatileKpis.length > 1 ? "s" : ""}`,
      description: `${volatileKpis.length} KPI${volatileKpis.length > 1 ? "s show" : " shows"} high volatility. Reducing variance improves predictability and operational confidence.`,
      discoverySource: "kpi_trend" as OpportunityDiscoverySource,
      businessImpact: 0.45,
      estimatedReach: 0.6,
      estimatedEffort: 0.45,
      risk: 0.15,
      confidence: 0.75,
      strategicValue: 0.55,
      evidenceRefs: volatileKpis.slice(0, 2).map((k: any) => ({
        evidenceType: "kpi" as const,
        referenceId: k.id ?? k.name ?? "kpi",
        referenceType: "business_kpi",
        description: `Volatile KPI: ${k.name ?? k.id}`,
        weight: 0.65,
      })),
    });
  }

  return candidates;
}

// ── Health trends → Opportunity ───────────────────────────────────────────────

const HEALTH_DIMENSION_CATEGORY_MAP: Record<string, OpportunityCategory> = {
  financial: "finance",
  operational: "operations",
  growth: "revenue_growth",
  product: "product",
  marketing: "marketing",
  sales: "sales",
  executive: "knowledge",
};

function detectFromHealthTrends(report: BusinessAnalysisReport): OpportunityCandidate[] {
  const candidates: OpportunityCandidate[] = [];
  const ha = report.healthAnalysis as any;
  if (!ha) return candidates;

  const { weakestDimension, healthStability, drift } = ha;

  if (weakestDimension) {
    const category = HEALTH_DIMENSION_CATEGORY_MAP[weakestDimension] ?? "operations";
    candidates.push({
      category,
      title: `Strengthen ${weakestDimension} health dimension`,
      description: `The ${weakestDimension} dimension is the weakest in the business health profile. Targeted improvement here has disproportionate effect on overall health.`,
      discoverySource: "health_trend" as OpportunityDiscoverySource,
      businessImpact: 0.65,
      estimatedReach: 0.7,
      estimatedEffort: 0.55,
      risk: 0.2,
      confidence: ha.confidence ?? 0.75,
      strategicValue: 0.7,
      evidenceRefs: [
        {
          evidenceType: "health" as const,
          referenceId: weakestDimension,
          referenceType: "health_dimension",
          description: `Weakest health dimension: ${weakestDimension}`,
          weight: 0.9,
        },
      ],
    });
  }

  if (typeof healthStability === "number" && healthStability < 0.5) {
    candidates.push({
      category: "operations",
      title: `Improve business health stability`,
      description: `Overall health stability is ${(healthStability * 100).toFixed(0)}% — below the 50% threshold. Stabilising health metrics reduces operational risk and improves investor confidence.`,
      discoverySource: "health_trend" as OpportunityDiscoverySource,
      businessImpact: 0.55,
      estimatedReach: 0.75,
      estimatedEffort: 0.6,
      risk: 0.25,
      confidence: 0.8,
      strategicValue: 0.6,
      evidenceRefs: [
        {
          evidenceType: "health" as const,
          referenceId: "stability",
          referenceType: "health_metric",
          description: `Health stability score: ${(healthStability * 100).toFixed(0)}%`,
          weight: 0.8,
        },
      ],
    });
  }

  return candidates;
}

// ── Graph topology → Opportunity ──────────────────────────────────────────────

function detectFromGraphTopology(report: BusinessAnalysisReport): OpportunityCandidate[] {
  const candidates: OpportunityCandidate[] = [];
  const ga = report.graphAnalysis as any;
  if (!ga) return candidates;

  const { complexityScore, maturityScore, completenessScore, criticalHubs = [], density } = ga;

  if (typeof completenessScore === "number" && completenessScore < 0.6) {
    candidates.push({
      category: "knowledge",
      title: "Complete the business graph model",
      description: `Business graph completeness is ${(completenessScore * 100).toFixed(0)}%. Adding missing node types improves the accuracy of all downstream analysis.`,
      discoverySource: "graph_topology" as OpportunityDiscoverySource,
      businessImpact: 0.4,
      estimatedReach: 0.8,
      estimatedEffort: 0.25,
      risk: 0.05,
      confidence: 0.9,
      strategicValue: 0.5,
      evidenceRefs: [
        {
          evidenceType: "finding" as const,
          referenceId: "graph_completeness",
          referenceType: "graph_metric",
          description: `Graph completeness: ${(completenessScore * 100).toFixed(0)}%`,
          weight: 0.7,
        },
      ],
    });
  }

  if (criticalHubs.length > 0) {
    candidates.push({
      category: "risk_reduction",
      title: `Reduce single-point-of-failure risk in ${criticalHubs.length} hub node${criticalHubs.length > 1 ? "s" : ""}`,
      description: `${criticalHubs.length} critical hub node${criticalHubs.length > 1 ? "s are" : " is"} highly connected and present concentration risk. Distributing dependencies reduces systemic fragility.`,
      discoverySource: "graph_topology" as OpportunityDiscoverySource,
      businessImpact: Math.min(0.3 + criticalHubs.length * 0.1, 0.8),
      estimatedReach: 0.6,
      estimatedEffort: 0.6,
      risk: 0.15,
      confidence: 0.8,
      strategicValue: 0.65,
      evidenceRefs: criticalHubs.slice(0, 3).map((h: any) => ({
        evidenceType: "node" as const,
        referenceId: h.nodeId ?? h.id ?? "hub",
        referenceType: "business_node",
        description: `Critical hub: ${h.nodeId ?? h.id} with ${h.connectionCount ?? "many"} connections`,
        weight: 0.75,
      })),
    });
  }

  return candidates;
}

// ── Main entry point ──────────────────────────────────────────────────────────

export function detectOpportunities(report: BusinessAnalysisReport): OpportunityCandidate[] {
  const candidates: OpportunityCandidate[] = [
    ...detectFromBottlenecks(report),
    ...detectFromConstraints(report),
    ...detectFromLeverage(report),
    ...detectFromKpiTrends(report),
    ...detectFromHealthTrends(report),
    ...detectFromGraphTopology(report),
  ];

  // Deduplicate by title+category (keep highest impact)
  const seen = new Map<string, OpportunityCandidate>();
  for (const c of candidates) {
    const key = `${c.category}:${c.title.toLowerCase().slice(0, 40)}`;
    const existing = seen.get(key);
    if (!existing || c.businessImpact > existing.businessImpact) {
      seen.set(key, c);
    }
  }

  return Array.from(seen.values());
}
