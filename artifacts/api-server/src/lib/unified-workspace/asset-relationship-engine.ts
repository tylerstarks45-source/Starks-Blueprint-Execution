// ── Build 047: Asset Relationship Engine ──────────────────────────────────────
// Maps dependencies and relationships between assets.
// ASH can traverse these relationships for impact analysis.
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { assetRelationships } from "@workspace/db/schema";
import type { AssetRelationship, RelationshipType } from "./types";

/** Record a relationship between two assets */
export async function addAssetRelationship(params: {
  sourceAssetId:    number;
  targetAssetId:    number;
  relationshipType: RelationshipType;
  strength?:        "required" | "optional" | "informational";
  metadata?:        Record<string, unknown>;
}): Promise<AssetRelationship> {
  const rows = await db
    .insert(assetRelationships as any)
    .values({
      sourceAssetId:    params.sourceAssetId,
      targetAssetId:    params.targetAssetId,
      relationshipType: params.relationshipType,
      strength:         params.strength ?? "required",
      metadata:         params.metadata ?? {},
    })
    .returning() as any[];
  return rows[0] as AssetRelationship;
}

/** Get all relationships for an asset (outbound: what this asset depends on) */
export async function getAssetDependencies(assetId: number): Promise<AssetRelationship[]> {
  const rows = await db
    .select()
    .from(assetRelationships as any)
    .where(sql`source_asset_id = ${assetId}`)
    .orderBy(sql`created_at ASC`) as any[];
  return rows as AssetRelationship[];
}

/** Get all assets that depend on this asset (inbound: what depends on this) */
export async function getAssetDependents(assetId: number): Promise<AssetRelationship[]> {
  const rows = await db
    .select()
    .from(assetRelationships as any)
    .where(sql`target_asset_id = ${assetId}`)
    .orderBy(sql`created_at ASC`) as any[];
  return rows as AssetRelationship[];
}

/** Get full dependency graph for a project (both directions) */
export async function getProjectDependencyGraph(projectId: number): Promise<{
  relationships: AssetRelationship[];
  assetIds:      Set<number>;
}> {
  // Get all asset IDs in the project first
  const assetRows = await db.execute(
    sql`SELECT id FROM project_assets WHERE project_id = ${projectId} AND asset_status != 'archived'`,
  ) as any;
  const assetIds = new Set<number>((assetRows.rows ?? assetRows).map((r: any) => r.id));
  if (assetIds.size === 0) return { relationships: [], assetIds };

  const ids = [...assetIds];
  const relationships = await db
    .select()
    .from(assetRelationships as any)
    .where(sql`source_asset_id = ANY(${ids}::int[]) OR target_asset_id = ANY(${ids}::int[])`) as any[];
  return { relationships: relationships as AssetRelationship[], assetIds };
}

/** Count broken dependencies for a project (where target asset is archived/missing) */
export async function countBrokenDependencies(projectId: number): Promise<number> {
  const result = await db.execute(sql`
    SELECT count(*)::int AS count
    FROM asset_relationships ar
    JOIN project_assets src ON src.id = ar.source_asset_id AND src.project_id = ${projectId}
    LEFT JOIN project_assets tgt ON tgt.id = ar.target_asset_id
    WHERE ar.strength = 'required'
      AND (tgt.id IS NULL OR tgt.asset_status = 'archived')
  `) as any;
  return (result.rows ?? result)[0]?.count ?? 0;
}

/** Check if deleting an asset would break any required dependencies */
export async function checkDeletionImpact(assetId: number): Promise<{
  safe:      boolean;
  blockers:  number;
  dependents: number;
}> {
  const dependentsRows = await getAssetDependents(assetId);
  const requiredBlockers = dependentsRows.filter(r => r.strength === "required");
  return {
    safe:       requiredBlockers.length === 0,
    blockers:   requiredBlockers.length,
    dependents: dependentsRows.length,
  };
}
