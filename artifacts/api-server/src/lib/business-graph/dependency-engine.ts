// ─── Build 015: Dependency Engine ────────────────────────────────────────────
//
// Detects business dependencies: critical paths, single points of failure,
// blocked initiatives, missing assets, broken workflows, risk propagation.
// Pure: no DB access.

import { randomUUID } from "crypto";
import type {
  BusinessDependency,
  BusinessEdge,
  BusinessNode,
  DependencyType,
} from "./types";

function makeDependencyId(): string {
  return `bdep_${randomUUID().replace(/-/g, "").slice(0, 18)}`;
}

// ── DETECTOR 1 — critical_path ────────────────────────────────────────────────
// Nodes that all high-priority objectives depend on (blocking the critical path).

export function detectCriticalPaths(
  nodes: BusinessNode[],
  edges: BusinessEdge[],
): BusinessDependency[] {
  const deps: BusinessDependency[] = [];
  const objectiveNodes = nodes.filter((n) => n.nodeType === "objective" && n.isActive);
  const blockerEdges = edges.filter((e) => e.edgeType === "depends_on" && e.isActive);

  // Build a dependency frequency map: how many objectives depend on each node
  const dependencyCount = new Map<string, number>();
  for (const obj of objectiveNodes) {
    for (const edge of blockerEdges) {
      if (edge.fromNodeId === obj.id) {
        dependencyCount.set(edge.toNodeId, (dependencyCount.get(edge.toNodeId) ?? 0) + 1);
      }
    }
  }

  for (const [nodeId, count] of dependencyCount) {
    if (count >= 2) {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) continue;
      deps.push({
        id: makeDependencyId(),
        businessId: node.businessId,
        userId: node.userId,
        fromNodeId: null,
        toNodeId: nodeId,
        dependencyType: "critical_path",
        severity: Math.min(0.95, 0.5 + count * 0.15),
        description: `Node "${node.name}" (${node.nodeType}) is on the critical path — ${count} objectives depend on it.`,
        resolved: false,
        resolvedAt: null,
        metadata: { dependentObjectiveCount: count },
        detectedAt: new Date(),
      });
    }
  }
  return deps;
}

// ── DETECTOR 2 — single_point_of_failure ─────────────────────────────────────
// Nodes with high strategicImportance that have no redundant alternatives.

export function detectSinglePointsOfFailure(
  nodes: BusinessNode[],
  edges: BusinessEdge[],
): BusinessDependency[] {
  const deps: BusinessDependency[] = [];
  const highValueNodes = nodes.filter(
    (n) => n.isActive && n.strategicImportance >= 0.7 && n.businessValue >= 0.7,
  );

  for (const node of highValueNodes) {
    // Check if any other node has the same type and is active (redundancy)
    const redundantNodes = nodes.filter(
      (n) => n.id !== node.id && n.nodeType === node.nodeType && n.isActive && n.health !== "critical",
    );
    // Check how many things depend on it
    const dependentEdges = edges.filter((e) => e.toNodeId === node.id && e.edgeType === "depends_on" && e.isActive);

    if (redundantNodes.length === 0 && dependentEdges.length >= 2) {
      deps.push({
        id: makeDependencyId(),
        businessId: node.businessId,
        userId: node.userId,
        fromNodeId: null,
        toNodeId: node.id,
        dependencyType: "single_point_of_failure",
        severity: Math.min(0.9, 0.5 + dependentEdges.length * 0.1),
        description: `"${node.name}" (${node.nodeType}) is a single point of failure — ${dependentEdges.length} entities depend on it with no redundancy.`,
        resolved: false,
        resolvedAt: null,
        metadata: { dependentCount: dependentEdges.length, hasRedundancy: false },
        detectedAt: new Date(),
      });
    }
  }
  return deps;
}

// ── DETECTOR 3 — blocked ──────────────────────────────────────────────────────
// Nodes with status === "blocked" that propagate through the graph.

export function detectBlockedInitiatives(
  nodes: BusinessNode[],
  edges: BusinessEdge[],
): BusinessDependency[] {
  const deps: BusinessDependency[] = [];
  const blockedNodes = nodes.filter((n) => n.status === "blocked" && n.isActive);

  for (const blocked of blockedNodes) {
    const blockerEdges = edges.filter((e) => e.toNodeId === blocked.id && e.edgeType === "blocks" && e.isActive);
    const blocker = blockerEdges[0] ? nodes.find((n) => n.id === blockerEdges[0]?.fromNodeId) : null;

    deps.push({
      id: makeDependencyId(),
      businessId: blocked.businessId,
      userId: blocked.userId,
      fromNodeId: blocker?.id ?? null,
      toNodeId: blocked.id,
      dependencyType: "blocked",
      severity: blocked.priority <= 3 ? 0.85 : 0.55,
      description: `"${blocked.name}" (${blocked.nodeType}) is blocked${blocker ? ` by "${blocker.name}"` : ""}.`,
      resolved: false,
      resolvedAt: null,
      metadata: { blockerId: blocker?.id },
      detectedAt: new Date(),
    });
  }
  return deps;
}

// ── DETECTOR 4 — missing_asset ────────────────────────────────────────────────
// Objectives or high-priority projects with no linked assets or processes.

export function detectMissingAssets(
  nodes: BusinessNode[],
  edges: BusinessEdge[],
): BusinessDependency[] {
  const deps: BusinessDependency[] = [];
  const highPriorityNodes = nodes.filter(
    (n) => n.isActive && ["objective", "project"].includes(n.nodeType) && n.priority <= 4,
  );
  const assetTypes = ["asset", "automation", "process", "knowledge_asset"];

  for (const node of highPriorityNodes) {
    const hasAsset = edges.some(
      (e) =>
        e.isActive &&
        (e.fromNodeId === node.id || e.toNodeId === node.id) &&
        ["uses", "depends_on", "contains"].includes(e.edgeType) &&
        assetTypes.includes(nodes.find((n) => n.id === (e.fromNodeId === node.id ? e.toNodeId : e.fromNodeId))?.nodeType ?? ""),
    );
    if (!hasAsset) {
      deps.push({
        id: makeDependencyId(),
        businessId: node.businessId,
        userId: node.userId,
        fromNodeId: node.id,
        toNodeId: null,
        dependencyType: "missing_asset",
        severity: 0.5,
        description: `"${node.name}" (${node.nodeType}) has no linked assets, processes, or automations.`,
        resolved: false,
        resolvedAt: null,
        metadata: { nodeType: node.nodeType, priority: node.priority },
        detectedAt: new Date(),
      });
    }
  }
  return deps;
}

// ── DETECTOR 5 — broken_workflow ──────────────────────────────────────────────
// Process/automation nodes in "blocked" or "critical" health state.

export function detectBrokenWorkflows(nodes: BusinessNode[]): BusinessDependency[] {
  const deps: BusinessDependency[] = [];
  const brokenNodes = nodes.filter(
    (n) =>
      n.isActive &&
      ["process", "automation"].includes(n.nodeType) &&
      (n.health === "critical" || n.status === "blocked"),
  );

  for (const node of brokenNodes) {
    deps.push({
      id: makeDependencyId(),
      businessId: node.businessId,
      userId: node.userId,
      fromNodeId: node.id,
      toNodeId: null,
      dependencyType: "broken_workflow",
      severity: node.health === "critical" ? 0.85 : 0.60,
      description: `Workflow "${node.name}" (${node.nodeType}) is ${node.health === "critical" ? "in critical state" : "blocked"}.`,
      resolved: false,
      resolvedAt: null,
      metadata: { health: node.health, status: node.status },
      detectedAt: new Date(),
    });
  }
  return deps;
}

// ── DETECTOR 6 — risk_propagation ────────────────────────────────────────────
// Risk nodes that propagate to high-value business nodes through depends_on edges.

export function detectRiskPropagation(
  nodes: BusinessNode[],
  edges: BusinessEdge[],
): BusinessDependency[] {
  const deps: BusinessDependency[] = [];
  const riskNodes = nodes.filter((n) => n.nodeType === "risk" && n.isActive && n.risk !== "low");

  for (const risk of riskNodes) {
    const affectedEdges = edges.filter(
      (e) => e.isActive && e.toNodeId === risk.id && ["depends_on", "supports"].includes(e.edgeType),
    );
    for (const edge of affectedEdges) {
      const affected = nodes.find((n) => n.id === edge.fromNodeId);
      if (!affected || !affected.isActive) continue;
      if (affected.businessValue >= 0.6 || affected.strategicImportance >= 0.6) {
        deps.push({
          id: makeDependencyId(),
          businessId: risk.businessId,
          userId: risk.userId,
          fromNodeId: risk.id,
          toNodeId: affected.id,
          dependencyType: "risk_propagation",
          severity: risk.risk === "critical" ? 0.85 : 0.60,
          description: `Risk "${risk.name}" propagates to high-value node "${affected.name}" (${affected.nodeType}).`,
          resolved: false,
          resolvedAt: null,
          metadata: { riskLevel: risk.risk, affectedNodeType: affected.nodeType },
          detectedAt: new Date(),
        });
      }
    }
  }
  return deps;
}

// ── Run full dependency scan ──────────────────────────────────────────────────

export function runDependencyScan(
  nodes: BusinessNode[],
  edges: BusinessEdge[],
): BusinessDependency[] {
  const seen = new Set<string>();
  const all: BusinessDependency[] = [];

  function addDep(d: BusinessDependency): void {
    const key = `${d.fromNodeId ?? ""}::${d.toNodeId ?? ""}::${d.dependencyType}`;
    if (seen.has(key)) return;
    seen.add(key);
    all.push(d);
  }

  for (const d of detectCriticalPaths(nodes, edges)) addDep(d);
  for (const d of detectSinglePointsOfFailure(nodes, edges)) addDep(d);
  for (const d of detectBlockedInitiatives(nodes, edges)) addDep(d);
  for (const d of detectMissingAssets(nodes, edges)) addDep(d);
  for (const d of detectBrokenWorkflows(nodes)) addDep(d);
  for (const d of detectRiskPropagation(nodes, edges)) addDep(d);

  return all.sort((a, b) => b.severity - a.severity);
}
