// ─── Build 015: Business Relationship Engine ──────────────────────────────────
//
// Builds typed business edge objects. Every relationship is versioned.
// Pure: no DB access.

import type { BusinessEdge, BusinessEdgeType, BusinessNode } from "./types";

// ── Build an edge spec ────────────────────────────────────────────────────────

export function buildEdgeSpec(opts: {
  businessId: number;
  userId: number | null;
  fromNodeId: string;
  toNodeId: string;
  edgeType: BusinessEdgeType;
  label?: string;
  weight?: number;
  metadata?: Record<string, unknown>;
}): Omit<BusinessEdge, "id" | "createdAt" | "updatedAt"> {
  return {
    businessId: opts.businessId,
    userId: opts.userId,
    fromNodeId: opts.fromNodeId,
    toNodeId: opts.toNodeId,
    edgeType: opts.edgeType,
    label: opts.label ?? null,
    weight: opts.weight ?? defaultWeightForType(opts.edgeType),
    version: 1,
    isActive: true,
    metadata: opts.metadata ?? {},
  };
}

// ── Default weight by edge type ───────────────────────────────────────────────

function defaultWeightForType(edgeType: BusinessEdgeType): number {
  switch (edgeType) {
    case "owns": return 1.0;
    case "depends_on": return 0.9;
    case "blocks": return 0.95;
    case "generates": return 0.85;
    case "managed_by": return 0.8;
    case "contains": return 0.75;
    case "sells": return 0.75;
    case "markets": return 0.65;
    case "supports": return 0.6;
    case "measures": return 0.6;
    case "uses": return 0.5;
    case "belongs_to": return 0.5;
    case "created_from": return 0.4;
    case "optimized_by": return 0.4;
    default: return 0.5;
  }
}

// ── Edge relationship rules ────────────────────────────────────────────────────
// Returns valid from/to node type pairs for each edge type.
// Used for validation and smart suggestions.

export function getEdgeRules(edgeType: BusinessEdgeType): { fromTypes?: string[]; toTypes?: string[]; description: string } {
  switch (edgeType) {
    case "owns":
      return { fromTypes: ["company", "department"], description: "An entity owns another entity." };
    case "depends_on":
      return { description: "An entity depends on another to function." };
    case "supports":
      return { description: "An entity supports or enables another." };
    case "blocks":
      return { description: "An entity blocks or prevents another from operating." };
    case "generates":
      return { toTypes: ["revenue_stream", "lead", "customer"], description: "An entity generates revenue, leads, or customers." };
    case "markets":
      return { fromTypes: ["campaign", "funnel"], toTypes: ["product", "service", "offer"], description: "A campaign or funnel markets a product, service, or offer." };
    case "sells":
      return { toTypes: ["product", "service", "offer"], description: "An entity sells a product, service, or offer." };
    case "contains":
      return { description: "An entity contains or groups another entity." };
    case "uses":
      return { description: "An entity uses a tool, service, or asset." };
    case "belongs_to":
      return { description: "An entity belongs to a parent or group." };
    case "managed_by":
      return { toTypes: ["employee", "agent", "department"], description: "An entity is managed by a person, agent, or department." };
    case "created_from":
      return { description: "An entity was created from or based on another entity." };
    case "optimized_by":
      return { toTypes: ["automation", "agent", "process"], description: "An entity is optimized by an automation, agent, or process." };
    case "measures":
      return { fromTypes: ["kpi_node"], description: "A KPI measures the performance of an entity." };
  }
}

// ── Build smart edge suggestions from node types ──────────────────────────────

export function suggestEdgeTypes(fromNode: BusinessNode, toNode: BusinessNode): BusinessEdgeType[] {
  const suggestions: BusinessEdgeType[] = [];
  const from = fromNode.nodeType;
  const to = toNode.nodeType;

  if (from === "company" && to === "department") suggestions.push("contains", "owns");
  if (from === "department" && ["product", "service", "project"].includes(to)) suggestions.push("contains", "owns");
  if (from === "product" && to === "revenue_stream") suggestions.push("generates");
  if (from === "campaign" && ["product", "service", "offer"].includes(to)) suggestions.push("markets");
  if (["product", "service"].includes(from) && to === "customer") suggestions.push("sells");
  if (to === "customer") suggestions.push("generates");
  if (from === "automation" && to === "process") suggestions.push("optimized_by");
  if (to === "kpi_node") suggestions.push("measures");
  if (from === "kpi_node" && !["kpi_node"].includes(to)) suggestions.push("measures");
  if (to === "risk") suggestions.push("depends_on", "blocks");

  // Generic fallbacks
  if (suggestions.length === 0) {
    suggestions.push("depends_on", "supports", "uses", "belongs_to");
  }
  return [...new Set(suggestions)];
}

// ── Adjacency list ────────────────────────────────────────────────────────────

export function buildAdjacencyMap(edges: BusinessEdge[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const e of edges) {
    if (!e.isActive) continue;
    if (!map.has(e.fromNodeId)) map.set(e.fromNodeId, []);
    map.get(e.fromNodeId)!.push(e.toNodeId);
  }
  return map;
}
