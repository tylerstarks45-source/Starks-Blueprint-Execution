// ── Build 041: Graph Merge Engine ─────────────────────────────────────────
// Resolves duplicate entities while preserving full history.
import { db } from "@workspace/db";
import {
  knowledgeGraphNodes,
  knowledgeGraphEdges,
  graphTemporalHistory,
  graphIdentityMap,
} from "@workspace/db/schema";
import { eq, and, ne } from "drizzle-orm";

// Find all nodes with the same identityHash (duplicates of a canonical node).
export async function findDuplicateNodes(
  identityHash: string,
  primaryNodeId: number,
): Promise<number[]> {
  const rows = await db
    .select({ id: knowledgeGraphNodes.id })
    .from(knowledgeGraphNodes)
    .where(
      and(
        eq(knowledgeGraphNodes.identityHash, identityHash),
        ne(knowledgeGraphNodes.id, primaryNodeId),
      ),
    );
  return rows.map((r) => r.id);
}

// Merge a duplicate node into the primary node.
// Redirects all edges, records a temporal history entry, then removes the duplicate.
export async function mergeNodes(
  primaryNodeId: number,
  duplicateNodeId: number,
): Promise<void> {
  // Snapshot the duplicate before merge
  const [dup] = await db
    .select()
    .from(knowledgeGraphNodes)
    .where(eq(knowledgeGraphNodes.id, duplicateNodeId))
    .limit(1);

  if (!dup) return;

  // Re-point outgoing edges
  await db
    .update(knowledgeGraphEdges)
    .set({ fromNodeId: primaryNodeId })
    .where(eq(knowledgeGraphEdges.fromNodeId, duplicateNodeId));

  // Re-point incoming edges
  await db
    .update(knowledgeGraphEdges)
    .set({ toNodeId: primaryNodeId })
    .where(eq(knowledgeGraphEdges.toNodeId, duplicateNodeId));

  // Update identity map
  await db
    .update(graphIdentityMap)
    .set({ nodeId: primaryNodeId })
    .where(eq(graphIdentityMap.nodeId, duplicateNodeId));

  // Record temporal history (immutable)
  await db.insert(graphTemporalHistory).values({
    nodeId:      primaryNodeId,
    changeType:  "merged",
    beforeState: { duplicateNodeId, label: dup.label, domain: dup.domain },
    afterState:  { primaryNodeId, action: "duplicate_merged" },
  });

  // Delete the duplicate
  await db.delete(knowledgeGraphNodes).where(eq(knowledgeGraphNodes.id, duplicateNodeId));
}

// Full deduplication pass across all nodes.
export async function deduplicateGraph(): Promise<{ mergedCount: number }> {
  const allNodes = await db
    .select({ id: knowledgeGraphNodes.id, identityHash: knowledgeGraphNodes.identityHash })
    .from(knowledgeGraphNodes);

  const seen = new Map<string, number>(); // hash → primaryId
  let mergedCount = 0;

  for (const node of allNodes) {
    if (seen.has(node.identityHash)) {
      const primaryId = seen.get(node.identityHash)!;
      await mergeNodes(primaryId, node.id);
      mergedCount++;
    } else {
      seen.set(node.identityHash, node.id);
    }
  }

  return { mergedCount };
}
