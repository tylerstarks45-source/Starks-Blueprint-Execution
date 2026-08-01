// ── Build 041: Explanation Path Engine ───────────────────────────────────
// Produces explainable reasoning paths showing how any conclusion was reached.
import { db } from "@workspace/db";
import { graphPaths, knowledgeGraphEdges } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { GraphPathType, KGPath } from "./types";

// BFS shortest path between two nodes — returns the path or null if unreachable.
export async function buildExplanationPath(
  sourceNodeId: number,
  targetNodeId: number,
  pathType: GraphPathType,
): Promise<KGPath | null> {
  const visited = new Set<number>([sourceNodeId]);
  const prev = new Map<number, { nodeId: number; edgeId: number }>();
  const queue: number[] = [sourceNodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === targetNodeId) break;

    const edges = await db
      .select({ id: knowledgeGraphEdges.id, toNodeId: knowledgeGraphEdges.toNodeId })
      .from(knowledgeGraphEdges)
      .where(eq(knowledgeGraphEdges.fromNodeId, current));

    for (const edge of edges) {
      if (visited.has(edge.toNodeId)) continue;
      visited.add(edge.toNodeId);
      prev.set(edge.toNodeId, { nodeId: current, edgeId: edge.id });
      queue.push(edge.toNodeId);
    }
  }

  if (!prev.has(targetNodeId) && sourceNodeId !== targetNodeId) return null;

  // Reconstruct path
  const nodeIds: number[] = [];
  const edgeIds: number[] = [];
  let cur = targetNodeId;
  while (cur !== sourceNodeId) {
    nodeIds.unshift(cur);
    const entry = prev.get(cur)!;
    edgeIds.unshift(entry.edgeId);
    cur = entry.nodeId;
  }
  nodeIds.unshift(sourceNodeId);

  // Persist
  const [row] = await db.insert(graphPaths).values({
    pathType,
    sourceNodeId,
    targetNodeId,
    nodeIds,
    edgeIds,
    depth: nodeIds.length - 1,
    metadata: { computedAt: new Date().toISOString() },
  }).returning({ id: graphPaths.id });

  return {
    id:           row.id,
    pathType,
    sourceNodeId,
    targetNodeId,
    nodeIds,
    edgeIds,
    depth:        nodeIds.length - 1,
  };
}

export async function getPathById(pathId: number): Promise<KGPath | null> {
  const rows = await db
    .select()
    .from(graphPaths)
    .where(eq(graphPaths.id, pathId))
    .limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id:           r.id,
    pathType:     r.pathType as GraphPathType,
    sourceNodeId: r.sourceNodeId ?? null,
    targetNodeId: r.targetNodeId ?? null,
    nodeIds:      (r.nodeIds as number[]) ?? [],
    edgeIds:      (r.edgeIds as number[]) ?? [],
    depth:        r.depth ?? 0,
  };
}

export async function listPaths(limit = 20): Promise<KGPath[]> {
  const rows = await db.select().from(graphPaths).limit(limit);
  return rows.map((r) => ({
    id:           r.id,
    pathType:     r.pathType as GraphPathType,
    sourceNodeId: r.sourceNodeId ?? null,
    targetNodeId: r.targetNodeId ?? null,
    nodeIds:      (r.nodeIds as number[]) ?? [],
    edgeIds:      (r.edgeIds as number[]) ?? [],
    depth:        r.depth ?? 0,
  }));
}
