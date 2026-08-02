// ── Build 048: Relationship Engine ────────────────────────────────────────────
// Maps semantic relationships between canonical assets.
import { db } from "@workspace/db";
import { assetRelationshipsV2, assetRegistry, canonicalAssets } from "@workspace/db/schema";
import { eq, and, or, sql } from "drizzle-orm";
import type { SemanticRelType } from "./types";

export async function addRelationship(params: {
  userId:           number;
  sourceAssetId:    number;
  targetAssetId:    number;
  relationshipType: SemanticRelType;
  semanticLabel:    string;
  strength?:        "strong" | "moderate" | "weak";
  direction?:       "directed" | "bidirectional";
  isInferred?:      boolean;
  confidence?:      number;
  metadata?:        Record<string, unknown>;
}): Promise<number> {
  const result = await db
    .insert(assetRelationshipsV2)
    .values({
      userId:           params.userId,
      sourceAssetId:    params.sourceAssetId,
      targetAssetId:    params.targetAssetId,
      relationshipType: params.relationshipType,
      semanticLabel:    params.semanticLabel,
      strength:         params.strength ?? "strong",
      direction:        params.direction ?? "directed",
      isInferred:       params.isInferred ?? false,
      confidence:       params.confidence ?? 100,
      metadata:         params.metadata ?? {},
    })
    .returning({ id: assetRelationshipsV2.id });

  const relId = (result as any[])[0]?.id as number;

  // Update registry count for both source and target
  await db
    .update(assetRegistry)
    .set({
      relationshipCount: sql`${assetRegistry.relationshipCount} + 1`,
      updatedAt: new Date(),
    })
    .where(or(
      eq(assetRegistry.assetId, params.sourceAssetId),
      eq(assetRegistry.assetId, params.targetAssetId),
    ));

  return relId;
}

export async function getRelationshipsForAsset(assetId: number) {
  return db
    .select()
    .from(assetRelationshipsV2)
    .where(or(
      eq(assetRelationshipsV2.sourceAssetId, assetId),
      eq(assetRelationshipsV2.targetAssetId, assetId),
    ));
}

export async function getRelationshipsForUser(userId: number) {
  return db
    .select()
    .from(assetRelationshipsV2)
    .where(eq(assetRelationshipsV2.userId, userId));
}

export async function findDuplicates(userId: number): Promise<string[]> {
  // Assets with identical canonicalName within same user (slug-based duplicates)
  const rows = await db
    .select({
      canonicalSlug: canonicalAssets.canonicalSlug,
      cnt: sql<string>`count(*)`,
    })
    .from(canonicalAssets)
    .where(and(eq(canonicalAssets.userId, userId), eq(canonicalAssets.status, "active")))
    .groupBy(canonicalAssets.canonicalSlug);

  return rows.filter((r) => Number(r.cnt) > 1).map((r) => r.canonicalSlug);
}

// ── BFS traversal (depth-capped at 4, same pattern as Build 041) ─────────────
export async function traverseRelationshipGraph(
  rootAssetId:   number,
  userId:        number,
  maxDepth:      number = 4,
  direction:     "outbound" | "inbound" | "both" = "outbound",
): Promise<Array<{ assetId: number; depth: number; path: number[]; relType: string }>> {
  const visited = new Set<number>([rootAssetId]);
  const queue: Array<{ assetId: number; depth: number; path: number[] }> = [
    { assetId: rootAssetId, depth: 0, path: [rootAssetId] },
  ];
  const results: Array<{ assetId: number; depth: number; path: number[]; relType: string }> = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= maxDepth) continue;

    const rels = await db
      .select()
      .from(assetRelationshipsV2)
      .where(
        and(
          eq(assetRelationshipsV2.userId, userId),
          direction === "outbound"
            ? eq(assetRelationshipsV2.sourceAssetId, current.assetId)
            : direction === "inbound"
              ? eq(assetRelationshipsV2.targetAssetId, current.assetId)
              : or(
                  eq(assetRelationshipsV2.sourceAssetId, current.assetId),
                  eq(assetRelationshipsV2.targetAssetId, current.assetId),
                ),
        ),
      );

    for (const rel of rels) {
      const nextId = direction === "inbound"
        ? rel.sourceAssetId
        : rel.targetAssetId === current.assetId ? rel.sourceAssetId : rel.targetAssetId;

      if (visited.has(nextId)) continue;
      visited.add(nextId);

      const next = { assetId: nextId, depth: current.depth + 1, path: [...current.path, nextId] };
      queue.push(next);
      results.push({ ...next, relType: rel.relationshipType });
    }
  }

  return results;
}
