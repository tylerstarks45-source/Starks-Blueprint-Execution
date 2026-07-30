// ─── Build 016: Graph Analysis Engine ────────────────────────────────────────
//
// Analyzes Business Graph topology: density, hubs, clusters, complexity,
// maturity, completeness. No graph mutation. Pure.

import type { BusinessEdge, BusinessNode, BusinessNodeType } from "../business-graph/types";
import type { CriticalHub, GraphAnalysisResult } from "./types";

// ── Expected node types for completeness scoring ──────────────────────────────

const CORE_NODE_TYPES: BusinessNodeType[] = [
  "company", "product", "customer", "revenue_stream", "process",
];
const EXTENDED_NODE_TYPES: BusinessNodeType[] = [
  "department", "campaign", "funnel", "automation", "objective",
  "expense", "risk", "partner",
];

// ── Connectivity: union-find ──────────────────────────────────────────────────

function buildComponents(nodeIds: string[], edges: BusinessEdge[]): Map<string, string> {
  const parent = new Map<string, string>(nodeIds.map((id) => [id, id]));

  function find(x: string): string {
    if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!));
    return parent.get(x)!;
  }

  function union(a: string, b: string): void {
    parent.set(find(a), find(b));
  }

  for (const e of edges) {
    if (!e.isActive) continue;
    if (parent.has(e.fromNodeId) && parent.has(e.toNodeId)) {
      union(e.fromNodeId, e.toNodeId);
    }
  }

  // Normalize: map each id to its canonical root
  const result = new Map<string, string>();
  for (const id of nodeIds) result.set(id, find(id));
  return result;
}

// ── Critical hubs ─────────────────────────────────────────────────────────────

function computeHubs(nodes: BusinessNode[], edges: BusinessEdge[]): CriticalHub[] {
  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();

  for (const n of nodes) { inDegree.set(n.id, 0); outDegree.set(n.id, 0); }
  for (const e of edges) {
    if (!e.isActive) continue;
    outDegree.set(e.fromNodeId, (outDegree.get(e.fromNodeId) ?? 0) + 1);
    inDegree.set(e.toNodeId, (inDegree.get(e.toNodeId) ?? 0) + 1);
  }

  const maxDegree = Math.max(...nodes.map((n) => (inDegree.get(n.id) ?? 0) + (outDegree.get(n.id) ?? 0)), 1);

  return nodes
    .map((n) => {
      const inp = inDegree.get(n.id) ?? 0;
      const out = outDegree.get(n.id) ?? 0;
      const total = inp + out;
      return { nodeId: n.id, nodeName: n.name, nodeType: n.nodeType, inDegree: inp, outDegree: out, totalDegree: total, hubScore: total / maxDegree };
    })
    .filter((h) => h.hubScore >= 0.4)
    .sort((a, b) => b.hubScore - a.hubScore)
    .slice(0, 6);
}

// ── Longest dependency chain ──────────────────────────────────────────────────

function longestDepChain(nodes: BusinessNode[], edges: BusinessEdge[]): number {
  const depEdges = edges.filter((e) => e.isActive && e.edgeType === "depends_on");
  const nodeIds = new Set(nodes.map((n) => n.id));
  const memo = new Map<string, number>();

  function dfs(id: string, visited: Set<string>): number {
    if (memo.has(id)) return memo.get(id)!;
    if (visited.has(id)) return 0; // cycle guard
    visited.add(id);
    let max = 0;
    for (const e of depEdges) {
      if (e.fromNodeId === id && nodeIds.has(e.toNodeId)) {
        max = Math.max(max, 1 + dfs(e.toNodeId, new Set(visited)));
      }
    }
    memo.set(id, max);
    return max;
  }

  let longest = 0;
  for (const n of nodes) longest = Math.max(longest, dfs(n.id, new Set()));
  return longest;
}

// ── Complexity score ──────────────────────────────────────────────────────────
// High node count + high edge count + many disconnected clusters + deep chains = complex.

function complexityScore(opts: {
  nodeCount: number; edgeCount: number;
  disconnectedClusters: number; depChainLength: number; hubCount: number;
}): number {
  const { nodeCount, edgeCount, disconnectedClusters, depChainLength, hubCount } = opts;
  const nodeFactor = Math.min(1, nodeCount / 30);
  const edgeFactor = Math.min(1, edgeCount / 50);
  const clusterFactor = Math.min(1, disconnectedClusters / 5);
  const chainFactor = Math.min(1, depChainLength / 8);
  const hubFactor = Math.min(1, hubCount / 6);
  return parseFloat((nodeFactor * 0.25 + edgeFactor * 0.25 + clusterFactor * 0.2 + chainFactor * 0.2 + hubFactor * 0.1).toFixed(3));
}

// ── Maturity score ────────────────────────────────────────────────────────────
// Well-defined processes, automations, KPI nodes, and variety of node types = mature.

function maturityScore(nodes: BusinessNode[]): number {
  const activeNodes = nodes.filter((n) => n.isActive);
  const hasCompany = activeNodes.some((n) => n.nodeType === "company");
  const hasProcess = activeNodes.some((n) => n.nodeType === "process");
  const hasAutomation = activeNodes.some((n) => n.nodeType === "automation");
  const hasObjective = activeNodes.some((n) => n.nodeType === "objective");
  const hasRevenue = activeNodes.some((n) => n.nodeType === "revenue_stream");
  const hasProduct = activeNodes.some((n) => ["product", "service"].includes(n.nodeType));
  const hasCustomer = activeNodes.some((n) => ["customer", "lead"].includes(n.nodeType));
  const uniqueTypes = new Set(activeNodes.map((n) => n.nodeType)).size;

  const signals = [
    hasCompany ? 0.10 : 0,
    hasProduct ? 0.15 : 0,
    hasCustomer ? 0.15 : 0,
    hasRevenue ? 0.15 : 0,
    hasProcess ? 0.10 : 0,
    hasAutomation ? 0.10 : 0,
    hasObjective ? 0.10 : 0,
    Math.min(0.15, uniqueTypes * 0.01),
  ];
  return parseFloat(signals.reduce((a, b) => a + b, 0).toFixed(3));
}

// ── Completeness score ────────────────────────────────────────────────────────

function completenessScore(nodes: BusinessNode[]): number {
  const presentTypes = new Set(nodes.filter((n) => n.isActive).map((n) => n.nodeType));
  const corePresent = CORE_NODE_TYPES.filter((t) => presentTypes.has(t)).length;
  const extPresent = EXTENDED_NODE_TYPES.filter((t) => presentTypes.has(t)).length;
  return parseFloat(((corePresent / CORE_NODE_TYPES.length) * 0.7 + (extPresent / EXTENDED_NODE_TYPES.length) * 0.3).toFixed(3));
}

// ── Main entry point ──────────────────────────────────────────────────────────

export function analyzeGraph(nodes: BusinessNode[], edges: BusinessEdge[]): GraphAnalysisResult {
  const activeNodes = nodes.filter((n) => n.isActive);
  const activeEdges = edges.filter((e) => e.isActive);
  const n = activeNodes.length;
  const e = activeEdges.length;

  // Density metrics
  const nodeDensity = n + e === 0 ? 0 : n / (n + e);
  const maxPossibleEdges = n > 1 ? n * (n - 1) : 1;
  const relationshipDensity = parseFloat((e / maxPossibleEdges).toFixed(4));

  // Connected components
  const components = buildComponents(activeNodes.map((nd) => nd.id), activeEdges);
  const roots = new Set(components.values());
  const disconnectedClusters = Math.max(0, roots.size - 1);

  // Hubs
  const criticalHubs = computeHubs(activeNodes, activeEdges);

  // Dependency chain
  const depChainLength = longestDepChain(activeNodes, activeEdges);

  // Composite scores
  const complexity = complexityScore({ nodeCount: n, edgeCount: e, disconnectedClusters, depChainLength, hubCount: criticalHubs.length });
  const maturity = maturityScore(activeNodes);
  const completeness = completenessScore(activeNodes);

  // Distributions
  const nodeTypeDist: Record<string, number> = {};
  for (const nd of activeNodes) nodeTypeDist[nd.nodeType] = (nodeTypeDist[nd.nodeType] ?? 0) + 1;
  const edgeTypeDist: Record<string, number> = {};
  for (const ed of activeEdges) edgeTypeDist[ed.edgeType] = (edgeTypeDist[ed.edgeType] ?? 0) + 1;

  return {
    nodeCount: n, edgeCount: e,
    nodeDensity: parseFloat(nodeDensity.toFixed(3)),
    relationshipDensity,
    disconnectedClusters,
    criticalHubs,
    dependencyChainLength: depChainLength,
    complexityScore: complexity,
    maturityScore: maturity,
    completenessScore: completeness,
    nodeTypeDistribution: nodeTypeDist,
    edgeTypeDistribution: edgeTypeDist,
  };
}
