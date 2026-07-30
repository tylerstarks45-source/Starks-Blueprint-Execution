// ─── Build 016: Bottleneck Engine ────────────────────────────────────────────
//
// Identifies 6 types of business bottlenecks from graph state.
// Each bottleneck: severity, evidence, business impact, confidence.
// Purely descriptive — no prescription. No graph mutation. Pure.

import { randomUUID } from "crypto";
import type { BusinessDependency, BusinessEdge, BusinessHealth, BusinessKpi, BusinessNode } from "../business-graph/types";
import type { BottleneckType, BusinessBottleneck } from "./types";

const uid = () => `bbneck_${randomUUID().replace(/-/g, "").slice(0, 16)}`;

// ── 1. Execution Bottlenecks ──────────────────────────────────────────────────
// High-priority objectives / projects that are blocked or have low confidence.

export function detectExecutionBottlenecks(
  nodes: BusinessNode[],
  reportId: string, businessId: number, userId: number | null,
): BusinessBottleneck[] {
  const results: BusinessBottleneck[] = [];
  const blockedHighPriority = nodes.filter(
    (n) => n.isActive && n.priority <= 4 && (n.status === "blocked" || n.confidence < 0.3),
  );
  if (blockedHighPriority.length === 0) return results;

  const evidence = blockedHighPriority.map(
    (n) => `"${n.name}" (${n.nodeType}) — status: ${n.status}, confidence: ${(n.confidence * 100).toFixed(0)}%`,
  );
  results.push({
    id: uid(), businessId, reportId, userId,
    bottleneckType: "execution",
    title: `${blockedHighPriority.length} high-priority execution item${blockedHighPriority.length > 1 ? "s" : ""} blocked`,
    description: `${blockedHighPriority.length} high-priority node${blockedHighPriority.length > 1 ? "s are" : " is"} blocked or at low confidence, preventing execution progress.`,
    severity: Math.min(0.9, 0.5 + blockedHighPriority.length * 0.1),
    evidence,
    businessImpact: "High-priority work is not progressing, delaying business objectives.",
    confidence: 0.9,
    affectedNodeIds: blockedHighPriority.map((n) => n.id),
    createdAt: new Date(),
  });
  return results;
}

// ── 2. Operational Bottlenecks ────────────────────────────────────────────────
// Many blocked process nodes or critical operational dependencies.

export function detectOperationalBottlenecks(
  nodes: BusinessNode[],
  deps: BusinessDependency[],
  reportId: string, businessId: number, userId: number | null,
): BusinessBottleneck[] {
  const results: BusinessBottleneck[] = [];
  const blockedProcesses = nodes.filter(
    (n) => n.isActive && ["process", "department"].includes(n.nodeType) && (n.status === "blocked" || n.health === "critical"),
  );
  const criticalOpsDeps = deps.filter(
    (d) => !d.resolved && ["single_point_of_failure", "broken_workflow"].includes(d.dependencyType) && d.severity >= 0.7,
  );

  if (blockedProcesses.length > 0 || criticalOpsDeps.length > 0) {
    const evidence: string[] = [
      ...blockedProcesses.map((n) => `Process "${n.name}" is ${n.health === "critical" ? "critical" : "blocked"}`),
      ...criticalOpsDeps.map((d) => `Dependency: ${d.description.slice(0, 80)}`),
    ];
    results.push({
      id: uid(), businessId, reportId, userId,
      bottleneckType: "operational",
      title: "Operational processes are impaired",
      description: `${blockedProcesses.length} process/department node${blockedProcesses.length !== 1 ? "s" : ""} blocked; ${criticalOpsDeps.length} critical operational dependenc${criticalOpsDeps.length !== 1 ? "ies" : "y"}.`,
      severity: Math.min(0.9, 0.4 + (blockedProcesses.length + criticalOpsDeps.length) * 0.1),
      evidence: evidence.slice(0, 5),
      businessImpact: "Operational impairments reduce throughput and increase delivery risk.",
      confidence: 0.85,
      affectedNodeIds: blockedProcesses.map((n) => n.id),
      createdAt: new Date(),
    });
  }
  return results;
}

// ── 3. Marketing Bottlenecks ──────────────────────────────────────────────────
// No active campaigns/funnels, or declining traffic/lead KPIs.

export function detectMarketingBottlenecks(
  nodes: BusinessNode[],
  kpis: BusinessKpi[],
  reportId: string, businessId: number, userId: number | null,
): BusinessBottleneck[] {
  const results: BusinessBottleneck[] = [];
  const activeFunnels = nodes.filter((n) => n.isActive && ["funnel", "campaign"].includes(n.nodeType) && n.status === "active").length;
  const decliningTraffic = kpis.filter((k) => ["traffic", "lead_velocity"].includes(k.kpiType) && k.trend === "down");
  const noMarketingKpis = kpis.filter((k) => ["conversion_rate", "traffic", "lead_velocity"].includes(k.kpiType)).length === 0;

  if (activeFunnels === 0 || decliningTraffic.length > 0 || noMarketingKpis) {
    const evidence: string[] = [];
    if (activeFunnels === 0) evidence.push("No active funnels or campaigns defined.");
    if (decliningTraffic.length > 0) evidence.push(`${decliningTraffic.length} traffic/lead KPI${decliningTraffic.length > 1 ? "s are" : " is"} declining.`);
    if (noMarketingKpis) evidence.push("No marketing KPIs defined (conversion rate, traffic, lead velocity).");

    results.push({
      id: uid(), businessId, reportId, userId,
      bottleneckType: "marketing",
      title: "Marketing pipeline is constrained",
      description: "The business lacks active marketing assets or is experiencing declining traffic and lead generation.",
      severity: activeFunnels === 0 ? 0.65 : 0.50,
      evidence,
      businessImpact: "Insufficient lead generation limits revenue growth.",
      confidence: 0.80,
      affectedNodeIds: nodes.filter((n) => n.isActive && ["funnel", "campaign"].includes(n.nodeType)).map((n) => n.id),
      createdAt: new Date(),
    });
  }
  return results;
}

// ── 4. Sales Bottlenecks ──────────────────────────────────────────────────────
// Declining pipeline value, low or missing conversion rate KPI.

export function detectSalesBottlenecks(
  nodes: BusinessNode[],
  kpis: BusinessKpi[],
  reportId: string, businessId: number, userId: number | null,
): BusinessBottleneck[] {
  const results: BusinessBottleneck[] = [];
  const pipelineKpis = kpis.filter((k) => k.kpiType === "pipeline_value");
  const conversionKpis = kpis.filter((k) => k.kpiType === "conversion_rate");
  const decliningPipeline = pipelineKpis.filter((k) => k.trend === "down");
  const lowConversion = conversionKpis.filter((k) => !k.isHealthy);
  const noSalesKpis = pipelineKpis.length === 0 && conversionKpis.length === 0;
  const customerNodes = nodes.filter((n) => n.isActive && ["customer", "lead"].includes(n.nodeType));

  if (decliningPipeline.length > 0 || lowConversion.length > 0 || noSalesKpis) {
    const evidence: string[] = [];
    if (decliningPipeline.length > 0) evidence.push(`Pipeline value is declining.`);
    if (lowConversion.length > 0) evidence.push(`Conversion rate is below target.`);
    if (noSalesKpis) evidence.push("No pipeline or conversion KPIs defined.");
    if (customerNodes.length === 0) evidence.push("No customer or lead nodes exist in the graph.");

    results.push({
      id: uid(), businessId, reportId, userId,
      bottleneckType: "sales",
      title: "Sales pipeline is underperforming",
      description: "The sales pipeline shows declining performance or lacks measurement KPIs.",
      severity: decliningPipeline.length > 0 || lowConversion.length > 0 ? 0.70 : 0.45,
      evidence,
      businessImpact: "Revenue generation is at risk if the sales pipeline is not addressed.",
      confidence: 0.80,
      affectedNodeIds: customerNodes.map((n) => n.id),
      createdAt: new Date(),
    });
  }
  return results;
}

// ── 5. Automation Bottlenecks ─────────────────────────────────────────────────
// Many processes with no automation coverage.

export function detectAutomationBottlenecks(
  nodes: BusinessNode[],
  edges: BusinessEdge[],
  reportId: string, businessId: number, userId: number | null,
): BusinessBottleneck[] {
  const results: BusinessBottleneck[] = [];
  const processNodes = nodes.filter((n) => n.isActive && n.nodeType === "process");
  const automationNodes = nodes.filter((n) => n.isActive && n.nodeType === "automation");

  const automatedProcessIds = new Set(
    edges
      .filter((e) => e.isActive && e.edgeType === "optimized_by")
      .map((e) => e.fromNodeId),
  );
  const unautomatedProcesses = processNodes.filter((n) => !automatedProcessIds.has(n.id));

  if (processNodes.length > 2 && automationNodes.length === 0) {
    results.push({
      id: uid(), businessId, reportId, userId,
      bottleneckType: "automation",
      title: "Processes lack automation coverage",
      description: `${processNodes.length} process${processNodes.length !== 1 ? "es exist" : " exists"} but no automation nodes are defined.`,
      severity: 0.55,
      evidence: [
        `${processNodes.length} process nodes defined.`,
        "No automation nodes exist.",
        "All processes are manually operated.",
      ],
      businessImpact: "Manual processes are slower, error-prone, and limit operational scalability.",
      confidence: 0.85,
      affectedNodeIds: processNodes.map((n) => n.id),
      createdAt: new Date(),
    });
  } else if (unautomatedProcesses.length > processNodes.length * 0.7 && processNodes.length > 1) {
    results.push({
      id: uid(), businessId, reportId, userId,
      bottleneckType: "automation",
      title: "Most processes are not automated",
      description: `${unautomatedProcesses.length} of ${processNodes.length} processes have no automation coverage.`,
      severity: 0.45,
      evidence: unautomatedProcesses.slice(0, 4).map((n) => `Process "${n.name}" is not automated.`),
      businessImpact: "Automation gaps reduce operational efficiency.",
      confidence: 0.80,
      affectedNodeIds: unautomatedProcesses.map((n) => n.id),
      createdAt: new Date(),
    });
  }
  return results;
}

// ── 6. Dependency Bottlenecks ─────────────────────────────────────────────────
// Many unresolved critical/SPOF dependencies.

export function detectDependencyBottlenecks(
  deps: BusinessDependency[],
  reportId: string, businessId: number, userId: number | null,
): BusinessBottleneck[] {
  const results: BusinessBottleneck[] = [];
  const criticalUnresolved = deps.filter(
    (d) => !d.resolved && d.severity >= 0.75 && ["critical_path", "single_point_of_failure"].includes(d.dependencyType),
  );
  if (criticalUnresolved.length === 0) return results;

  results.push({
    id: uid(), businessId, reportId, userId,
    bottleneckType: "dependency",
    title: `${criticalUnresolved.length} critical unresolved dependenc${criticalUnresolved.length > 1 ? "ies" : "y"}`,
    description: `${criticalUnresolved.length} critical/SPOF dependenc${criticalUnresolved.length > 1 ? "ies" : "y"} remain unresolved, blocking business operations.`,
    severity: Math.min(0.95, 0.60 + criticalUnresolved.length * 0.08),
    evidence: criticalUnresolved.slice(0, 5).map((d) => d.description.slice(0, 100)),
    businessImpact: "Critical dependencies create risk of cascading failures across business operations.",
    confidence: 0.95,
    affectedNodeIds: criticalUnresolved.flatMap((d) => [d.fromNodeId, d.toNodeId].filter(Boolean) as string[]),
    createdAt: new Date(),
  });
  return results;
}

// ── Run all detectors ─────────────────────────────────────────────────────────

export function detectAllBottlenecks(opts: {
  nodes: BusinessNode[];
  edges: BusinessEdge[];
  kpis: BusinessKpi[];
  deps: BusinessDependency[];
  health: BusinessHealth | null;
  reportId: string;
  businessId: number;
  userId: number | null;
}): BusinessBottleneck[] {
  const { nodes, edges, kpis, deps, reportId, businessId, userId } = opts;
  return [
    ...detectExecutionBottlenecks(nodes, reportId, businessId, userId),
    ...detectOperationalBottlenecks(nodes, deps, reportId, businessId, userId),
    ...detectMarketingBottlenecks(nodes, kpis, reportId, businessId, userId),
    ...detectSalesBottlenecks(nodes, kpis, reportId, businessId, userId),
    ...detectAutomationBottlenecks(nodes, edges, reportId, businessId, userId),
    ...detectDependencyBottlenecks(deps, reportId, businessId, userId),
  ].sort((a, b) => b.severity - a.severity);
}
