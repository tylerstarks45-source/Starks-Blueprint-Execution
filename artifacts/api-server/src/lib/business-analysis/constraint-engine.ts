// ─── Build 016: Constraint Engine ────────────────────────────────────────────
//
// Identifies 8 types of business constraints.
// Purely descriptive — no prescription. No graph mutation. Pure.

import { randomUUID } from "crypto";
import type { BusinessDependency, BusinessEdge, BusinessKpi, BusinessNode } from "../business-graph/types";
import type { BusinessConstraint, ConstraintType } from "./types";

const uid = () => `bcon_${randomUUID().replace(/-/g, "").slice(0, 18)}`;

function makeConstraint(opts: Omit<BusinessConstraint, "id" | "createdAt">): BusinessConstraint {
  return { ...opts, id: uid(), createdAt: new Date() };
}

// ── 1. Resource Constraints ───────────────────────────────────────────────────
// Agent/employee nodes overloaded: high priority, blocked, low confidence.

export function detectResourceConstraints(
  nodes: BusinessNode[],
  reportId: string, businessId: number, userId: number | null,
): BusinessConstraint[] {
  const resourceNodes = nodes.filter(
    (n) => n.isActive && ["employee", "agent"].includes(n.nodeType) && n.priority <= 3,
  );
  const overloaded = resourceNodes.filter((n) => n.status === "blocked" || n.confidence < 0.4);
  if (overloaded.length === 0) return [];

  return [makeConstraint({
    businessId, reportId, userId,
    constraintType: "resource",
    title: `${overloaded.length} resource${overloaded.length > 1 ? "s are" : " is"} overloaded or blocked`,
    description: `Key agents or employees are blocked or operating at low confidence, indicating a resource constraint.`,
    severity: Math.min(0.85, 0.5 + overloaded.length * 0.1),
    affectedDomains: ["operations", "execution"],
    affectedNodeIds: overloaded.map((n) => n.id),
    metadata: { overloadedCount: overloaded.length },
  })];
}

// ── 2. Financial Constraints ──────────────────────────────────────────────────
// Declining revenue/profit KPIs or expense nodes outnumbering revenue nodes.

export function detectFinancialConstraints(
  nodes: BusinessNode[],
  kpis: BusinessKpi[],
  reportId: string, businessId: number, userId: number | null,
): BusinessConstraint[] {
  const expenseNodes = nodes.filter((n) => n.isActive && n.nodeType === "expense");
  const revenueNodes = nodes.filter((n) => n.isActive && n.nodeType === "revenue_stream");
  const decliningRevenue = kpis.filter(
    (k) => ["revenue", "mrr", "arr", "profit"].includes(k.kpiType) && k.trend === "down",
  );
  const noRevenue = kpis.filter((k) => ["revenue", "mrr"].includes(k.kpiType)).length === 0;

  if (decliningRevenue.length === 0 && expenseNodes.length <= revenueNodes.length && !noRevenue) return [];

  const evidence: string[] = [];
  if (decliningRevenue.length > 0) evidence.push(`${decliningRevenue.length} revenue KPI${decliningRevenue.length > 1 ? "s are" : " is"} declining.`);
  if (expenseNodes.length > revenueNodes.length) evidence.push(`More expense nodes (${expenseNodes.length}) than revenue streams (${revenueNodes.length}).`);
  if (noRevenue) evidence.push("No revenue KPIs defined — financial position is unknown.");

  return [makeConstraint({
    businessId, reportId, userId,
    constraintType: "financial",
    title: "Financial constraints detected",
    description: "Revenue performance or financial structure indicates financial stress.",
    severity: decliningRevenue.length > 0 ? 0.70 : 0.45,
    affectedDomains: ["finance", "growth"],
    affectedNodeIds: [...expenseNodes.map((n) => n.id), ...revenueNodes.map((n) => n.id)],
    metadata: { decliningRevenueKpis: decliningRevenue.length, expenseNodeCount: expenseNodes.length, revenueNodeCount: revenueNodes.length },
  })];
}

// ── 3. Time Constraints ───────────────────────────────────────────────────────
// Many high-priority items with no clear owner or planning signal.

export function detectTimeConstraints(
  nodes: BusinessNode[],
  reportId: string, businessId: number, userId: number | null,
): BusinessConstraint[] {
  const highPriority = nodes.filter((n) => n.isActive && n.priority <= 3 && n.status !== "completed");
  const unowned = highPriority.filter((n) => !n.ownerName);

  if (highPriority.length < 3 || unowned.length < 2) return [];

  return [makeConstraint({
    businessId, reportId, userId,
    constraintType: "time",
    title: `${highPriority.length} high-priority items compete for attention`,
    description: `${highPriority.length} nodes at priority ≤3, of which ${unowned.length} have no assigned owner — time and attention are constrained.`,
    severity: Math.min(0.75, 0.4 + highPriority.length * 0.05),
    affectedDomains: ["execution", "operations"],
    affectedNodeIds: unowned.map((n) => n.id),
    metadata: { highPriorityCount: highPriority.length, unownedCount: unowned.length },
  })];
}

// ── 4. Workflow Constraints ───────────────────────────────────────────────────
// Blocked or broken processes and workflows.

export function detectWorkflowConstraints(
  nodes: BusinessNode[],
  deps: BusinessDependency[],
  reportId: string, businessId: number, userId: number | null,
): BusinessConstraint[] {
  const brokenWorkflows = nodes.filter(
    (n) => n.isActive && n.nodeType === "process" && (n.status === "blocked" || n.health === "critical"),
  );
  const brokenDeps = deps.filter(
    (d) => !d.resolved && d.dependencyType === "broken_workflow",
  );
  if (brokenWorkflows.length === 0 && brokenDeps.length === 0) return [];

  return [makeConstraint({
    businessId, reportId, userId,
    constraintType: "workflow",
    title: "Workflow bottlenecks are constraining operations",
    description: `${brokenWorkflows.length} process${brokenWorkflows.length !== 1 ? "es are" : " is"} broken; ${brokenDeps.length} workflow dependenc${brokenDeps.length !== 1 ? "ies are" : "y is"} broken.`,
    severity: Math.min(0.85, 0.5 + (brokenWorkflows.length + brokenDeps.length) * 0.08),
    affectedDomains: ["operations", "automation"],
    affectedNodeIds: brokenWorkflows.map((n) => n.id),
    metadata: { brokenWorkflowCount: brokenWorkflows.length + brokenDeps.length },
  })];
}

// ── 5. Technology Constraints ─────────────────────────────────────────────────
// No integration/automation assets linked to key products or services.

export function detectTechnologyConstraints(
  nodes: BusinessNode[],
  edges: BusinessEdge[],
  reportId: string, businessId: number, userId: number | null,
): BusinessConstraint[] {
  const productNodes = nodes.filter((n) => n.isActive && ["product", "service"].includes(n.nodeType));
  const automationNodes = nodes.filter((n) => n.isActive && n.nodeType === "automation");

  const techEdgeNodeIds = new Set(
    edges.filter((e) => e.isActive && ["uses", "optimized_by"].includes(e.edgeType)).map((e) => e.fromNodeId),
  );
  const productsWithoutTech = productNodes.filter((n) => !techEdgeNodeIds.has(n.id));

  if (automationNodes.length === 0 && productNodes.length > 1) {
    return [makeConstraint({
      businessId, reportId, userId,
      constraintType: "technology",
      title: "No automation or technology assets linked to products",
      description: `${productNodes.length} product/service node${productNodes.length !== 1 ? "s exist" : " exists"} but no automation nodes are defined. Technology adoption is a constraint.`,
      severity: 0.50,
      affectedDomains: ["technology", "operations"],
      affectedNodeIds: productsWithoutTech.map((n) => n.id),
      metadata: { productCount: productNodes.length, automationCount: automationNodes.length },
    })];
  }
  return [];
}

// ── 6. Capacity Constraints ───────────────────────────────────────────────────
// Many high-risk nodes with no redundancy.

export function detectCapacityConstraints(
  nodes: BusinessNode[],
  edges: BusinessEdge[],
  reportId: string, businessId: number, userId: number | null,
): BusinessConstraint[] {
  const highRiskNodes = nodes.filter((n) => n.isActive && ["high", "critical"].includes(n.risk));
  const nodesWithRedundancy = new Set(
    edges
      .filter((e) => e.isActive && e.edgeType === "supports")
      .map((e) => e.toNodeId),
  );
  const unprotectedHighRisk = highRiskNodes.filter((n) => !nodesWithRedundancy.has(n.id));

  if (unprotectedHighRisk.length < 2) return [];

  return [makeConstraint({
    businessId, reportId, userId,
    constraintType: "capacity",
    title: `${unprotectedHighRisk.length} high-risk nodes lack redundancy`,
    description: `${unprotectedHighRisk.length} high or critical-risk nodes have no supporting node providing redundancy.`,
    severity: Math.min(0.80, 0.45 + unprotectedHighRisk.length * 0.08),
    affectedDomains: ["operations", "risk"],
    affectedNodeIds: unprotectedHighRisk.map((n) => n.id),
    metadata: { unprotectedCount: unprotectedHighRisk.length },
  })];
}

// ── 7. Priority Conflict Constraints ─────────────────────────────────────────
// Multiple nodes at the same top priority competing for attention.

export function detectPriorityConflicts(
  nodes: BusinessNode[],
  reportId: string, businessId: number, userId: number | null,
): BusinessConstraint[] {
  const topPriority = nodes.filter((n) => n.isActive && n.priority <= 2 && n.status !== "completed");
  if (topPriority.length < 3) return [];

  return [makeConstraint({
    businessId, reportId, userId,
    constraintType: "priority_conflict",
    title: `${topPriority.length} nodes at top priority create conflict`,
    description: `${topPriority.length} nodes are assigned priority 1 or 2, making it impossible to determine which to address first.`,
    severity: Math.min(0.70, 0.35 + topPriority.length * 0.07),
    affectedDomains: ["execution", "planning"],
    affectedNodeIds: topPriority.map((n) => n.id),
    metadata: { conflictingCount: topPriority.length },
  })];
}

// ── 8. Goal Conflict Constraints ──────────────────────────────────────────────
// Objective nodes that block each other via "blocks" edges.

export function detectGoalConflicts(
  nodes: BusinessNode[],
  edges: BusinessEdge[],
  reportId: string, businessId: number, userId: number | null,
): BusinessConstraint[] {
  const objectiveIds = new Set(
    nodes.filter((n) => n.isActive && n.nodeType === "objective").map((n) => n.id),
  );
  const conflictingEdges = edges.filter(
    (e) => e.isActive && e.edgeType === "blocks" && objectiveIds.has(e.fromNodeId) && objectiveIds.has(e.toNodeId),
  );
  if (conflictingEdges.length === 0) return [];

  const affectedIds = new Set(conflictingEdges.flatMap((e) => [e.fromNodeId, e.toNodeId]));
  return [makeConstraint({
    businessId, reportId, userId,
    constraintType: "goal_conflict",
    title: `${conflictingEdges.length} objective${conflictingEdges.length > 1 ? "s are" : " is"} blocking other objectives`,
    description: `${affectedIds.size} objectives are involved in ${conflictingEdges.length} blocking relationship${conflictingEdges.length > 1 ? "s" : ""}, creating goal conflicts.`,
    severity: Math.min(0.80, 0.50 + conflictingEdges.length * 0.10),
    affectedDomains: ["strategy", "planning"],
    affectedNodeIds: [...affectedIds],
    metadata: { conflictingEdgeCount: conflictingEdges.length },
  })];
}

// ── Run all detectors ─────────────────────────────────────────────────────────

export function detectAllConstraints(opts: {
  nodes: BusinessNode[];
  edges: BusinessEdge[];
  kpis: BusinessKpi[];
  deps: BusinessDependency[];
  reportId: string;
  businessId: number;
  userId: number | null;
}): BusinessConstraint[] {
  const { nodes, edges, kpis, deps, reportId, businessId, userId } = opts;
  return [
    ...detectResourceConstraints(nodes, reportId, businessId, userId),
    ...detectFinancialConstraints(nodes, kpis, reportId, businessId, userId),
    ...detectTimeConstraints(nodes, reportId, businessId, userId),
    ...detectWorkflowConstraints(nodes, deps, reportId, businessId, userId),
    ...detectTechnologyConstraints(nodes, edges, reportId, businessId, userId),
    ...detectCapacityConstraints(nodes, edges, reportId, businessId, userId),
    ...detectPriorityConflicts(nodes, reportId, businessId, userId),
    ...detectGoalConflicts(nodes, edges, reportId, businessId, userId),
  ].sort((a, b) => b.severity - a.severity);
}
