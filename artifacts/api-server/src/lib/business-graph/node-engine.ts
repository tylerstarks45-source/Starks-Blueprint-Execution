// ─── Build 015: Business Node Engine ─────────────────────────────────────────
//
// Builds BusinessNode objects and performs BFS graph traversal.
// Pure: no DB access.

import { randomUUID } from "crypto";
import type {
  BusinessEdge,
  BusinessNode,
  BusinessNodeType,
  NodeHealth,
  NodeLifecycle,
  NodeRisk,
  NodeStatus,
} from "./types";

// ── Create a node spec ────────────────────────────────────────────────────────

export function buildNodeSpec(opts: {
  businessId: number;
  userId: number | null;
  nodeType: BusinessNodeType;
  name: string;
  description?: string;
  ownerName?: string;
  priority?: number;
  risk?: NodeRisk;
  confidence?: number;
  businessValue?: number;
  strategicImportance?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}): Omit<BusinessNode, "id" | "createdAt" | "updatedAt"> {
  return {
    businessId: opts.businessId,
    userId: opts.userId,
    nodeType: opts.nodeType,
    name: opts.name,
    description: opts.description ?? "",
    lifecycle: "active",
    health: "unknown",
    status: "active",
    ownerName: opts.ownerName ?? null,
    priority: opts.priority ?? defaultPriorityForType(opts.nodeType),
    risk: opts.risk ?? defaultRiskForType(opts.nodeType),
    confidence: opts.confidence ?? 0.5,
    businessValue: opts.businessValue ?? defaultBusinessValueForType(opts.nodeType),
    strategicImportance: opts.strategicImportance ?? defaultStrategicImportanceForType(opts.nodeType),
    isActive: true,
    tags: opts.tags ?? [],
    metadata: opts.metadata ?? {},
  };
}

// ── Defaults by node type ─────────────────────────────────────────────────────

function defaultPriorityForType(nodeType: BusinessNodeType): number {
  switch (nodeType) {
    case "company": return 1;
    case "revenue_stream": return 2;
    case "customer": return 2;
    case "product": return 3;
    case "service": return 3;
    case "department": return 3;
    case "risk": return 2;
    case "objective": return 3;
    case "funnel": return 4;
    case "campaign": return 4;
    case "project": return 4;
    case "automation": return 5;
    case "process": return 5;
    case "offer": return 5;
    case "partner": return 5;
    case "asset": return 6;
    case "expense": return 6;
    default: return 5;
  }
}

function defaultRiskForType(nodeType: BusinessNodeType): NodeRisk {
  switch (nodeType) {
    case "risk": return "high";
    case "expense": return "medium";
    case "supplier": return "medium";
    case "automation": return "low";
    default: return "medium";
  }
}

function defaultBusinessValueForType(nodeType: BusinessNodeType): number {
  switch (nodeType) {
    case "company": return 1.0;
    case "revenue_stream": return 0.9;
    case "customer": return 0.85;
    case "product": return 0.8;
    case "service": return 0.8;
    case "funnel": return 0.75;
    case "offer": return 0.75;
    case "campaign": return 0.7;
    case "expense": return 0.3;
    case "risk": return 0.2;
    default: return 0.5;
  }
}

function defaultStrategicImportanceForType(nodeType: BusinessNodeType): number {
  switch (nodeType) {
    case "company": return 1.0;
    case "objective": return 0.9;
    case "revenue_stream": return 0.85;
    case "product": return 0.8;
    case "department": return 0.75;
    case "risk": return 0.7;
    case "process": return 0.5;
    default: return 0.5;
  }
}

// ── Health inference from node state ─────────────────────────────────────────

export function inferNodeHealth(node: Pick<BusinessNode, "status" | "lifecycle" | "risk" | "confidence">): NodeHealth {
  if (node.status === "blocked") return "critical";
  if (node.lifecycle === "deprecated" || node.lifecycle === "archived") return "warning";
  if (node.risk === "critical") return "critical";
  if (node.risk === "high" && node.confidence < 0.4) return "warning";
  if (node.confidence >= 0.7 && node.status === "active") return "healthy";
  if (node.status === "active") return "warning";
  return "unknown";
}

// ── BFS traversal ─────────────────────────────────────────────────────────────

export interface GraphNeighbourhood {
  nodes: BusinessNode[];
  edges: BusinessEdge[];
  depth: number;
}

export function bfsTraversal(opts: {
  startNodeId: string;
  allNodes: Map<string, BusinessNode>;
  allEdges: BusinessEdge[];
  maxDepth?: number;
  direction?: "outgoing" | "incoming" | "both";
}): GraphNeighbourhood {
  const { startNodeId, allNodes, allEdges, maxDepth = 3, direction = "both" } = opts;
  const visited = new Set<string>([startNodeId]);
  const resultNodes: BusinessNode[] = [];
  const resultEdges: BusinessEdge[] = [];
  const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: startNodeId, depth: 0 }];

  const startNode = allNodes.get(startNodeId);
  if (!startNode) return { nodes: [], edges: [], depth: 0 };
  resultNodes.push(startNode);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= maxDepth) continue;

    for (const edge of allEdges) {
      if (!edge.isActive) continue;
      let neighbourId: string | null = null;

      if ((direction === "outgoing" || direction === "both") && edge.fromNodeId === current.nodeId) {
        neighbourId = edge.toNodeId;
      } else if ((direction === "incoming" || direction === "both") && edge.toNodeId === current.nodeId) {
        neighbourId = edge.fromNodeId;
      }

      if (neighbourId && !visited.has(neighbourId)) {
        visited.add(neighbourId);
        const neighbour = allNodes.get(neighbourId);
        if (neighbour && neighbour.isActive) {
          resultNodes.push(neighbour);
          resultEdges.push(edge);
          queue.push({ nodeId: neighbourId, depth: current.depth + 1 });
        }
      }
    }
  }

  return { nodes: resultNodes, edges: resultEdges, depth: maxDepth };
}

// ── Identify strategic nodes ──────────────────────────────────────────────────

export function rankNodesByStrategicImportance(nodes: BusinessNode[]): BusinessNode[] {
  return [...nodes].sort((a, b) => {
    const scoreA = a.strategicImportance * 0.4 + a.businessValue * 0.3 + (1 - a.priority / 10) * 0.3;
    const scoreB = b.strategicImportance * 0.4 + b.businessValue * 0.3 + (1 - b.priority / 10) * 0.3;
    return scoreB - scoreA;
  });
}

// ── Identify critical risk nodes ──────────────────────────────────────────────

export function findCriticalRiskNodes(nodes: BusinessNode[]): BusinessNode[] {
  return nodes.filter(
    (n) => n.isActive && (n.risk === "critical" || (n.risk === "high" && n.health === "critical")),
  );
}
