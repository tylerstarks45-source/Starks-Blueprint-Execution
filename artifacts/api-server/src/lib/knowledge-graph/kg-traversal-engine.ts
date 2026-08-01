// ── Build 041: Semantic Traversal Engine ─────────────────────────────────
// Deterministic BFS traversal across every registered domain.
import { db } from "@workspace/db";
import { knowledgeGraphNodes, knowledgeGraphEdges } from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";
import type { KGNode, KGEdge, KnowledgeGraphDomain } from "./types";

const MAX_DEFAULT_DEPTH = 4;

// BFS from a start node — returns all reachable node IDs up to maxDepth.
export async function traverseBFS(
  startNodeId: number,
  maxDepth: number = MAX_DEFAULT_DEPTH,
  domainFilter?: KnowledgeGraphDomain,
): Promise<{ visitedIds: number[]; depthMap: Map<number, number> }> {
  const visited = new Set<number>([startNodeId]);
  const depthMap = new Map<number, number>([[startNodeId, 0]]);
  const queue: Array<{ id: number; depth: number }> = [{ id: startNodeId, depth: 0 }];

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (depth >= maxDepth) continue;

    // Fetch outgoing edges from current node
    const edges = await db
      .select({ toNodeId: knowledgeGraphEdges.toNodeId })
      .from(knowledgeGraphEdges)
      .where(eq(knowledgeGraphEdges.fromNodeId, id));

    for (const edge of edges) {
      if (visited.has(edge.toNodeId)) continue;

      // Apply domain filter if specified
      if (domainFilter) {
        const [node] = await db
          .select({ domain: knowledgeGraphNodes.domain })
          .from(knowledgeGraphNodes)
          .where(eq(knowledgeGraphNodes.id, edge.toNodeId))
          .limit(1);
        if (!node || node.domain !== domainFilter) continue;
      }

      visited.add(edge.toNodeId);
      depthMap.set(edge.toNodeId, depth + 1);
      queue.push({ id: edge.toNodeId, depth: depth + 1 });
    }
  }

  return { visitedIds: Array.from(visited), depthMap };
}

export async function findNodesByDomain(domain: KnowledgeGraphDomain): Promise<KGNode[]> {
  const rows = await db
    .select()
    .from(knowledgeGraphNodes)
    .where(eq(knowledgeGraphNodes.domain, domain));
  return rows.map(rowToKGNode);
}

export async function getNodeNeighbors(nodeId: number): Promise<KGEdge[]> {
  const rows = await db
    .select()
    .from(knowledgeGraphEdges)
    .where(eq(knowledgeGraphEdges.fromNodeId, nodeId));
  return rows.map(rowToKGEdge);
}

export async function getNodeById(nodeId: number): Promise<KGNode | null> {
  const rows = await db
    .select()
    .from(knowledgeGraphNodes)
    .where(eq(knowledgeGraphNodes.id, nodeId))
    .limit(1);
  return rows.length > 0 ? rowToKGNode(rows[0]) : null;
}

export async function getEdgeById(edgeId: number): Promise<KGEdge | null> {
  const rows = await db
    .select()
    .from(knowledgeGraphEdges)
    .where(eq(knowledgeGraphEdges.id, edgeId))
    .limit(1);
  return rows.length > 0 ? rowToKGEdge(rows[0]) : null;
}

export async function semanticQuery(params: {
  domain?:   KnowledgeGraphDomain;
  nodeType?: string;
  label?:    string;
  limit?:    number;
}): Promise<KGNode[]> {
  // Simple query — full semantic search deferred to future extension.
  let q = db.select().from(knowledgeGraphNodes);
  const rows = await q;
  return rows
    .filter((r) => {
      if (params.domain && r.domain !== params.domain) return false;
      if (params.nodeType && r.nodeType !== params.nodeType) return false;
      if (params.label && !r.label.toLowerCase().includes(params.label.toLowerCase())) return false;
      return true;
    })
    .slice(0, params.limit ?? 50)
    .map(rowToKGNode);
}

// ── Row mappers ───────────────────────────────────────────────────────────
function rowToKGNode(r: typeof knowledgeGraphNodes.$inferSelect): KGNode {
  return {
    id:              r.id,
    nodeType:        r.nodeType as any,
    domain:          r.domain as any,
    externalRefType: r.externalRefType ?? null,
    externalRefId:   r.externalRefId ?? null,
    identityHash:    r.identityHash,
    label:           r.label,
    description:     r.description ?? null,
    sourceEngine:    r.sourceEngine ?? null,
    createdAt:       r.createdAt,
  };
}

function rowToKGEdge(r: typeof knowledgeGraphEdges.$inferSelect): KGEdge {
  return {
    id:               r.id,
    fromNodeId:       r.fromNodeId,
    toNodeId:         r.toNodeId,
    relationshipType: r.relationshipType as any,
    semanticLabel:    r.semanticLabel,
    weight:           r.weight ?? 1.0,
    sourceEngine:     r.sourceEngine ?? null,
    createdAt:        r.createdAt,
  };
}
