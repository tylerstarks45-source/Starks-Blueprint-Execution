// ── Build 047: Asset Registry Engine ─────────────────────────────────────────
// Registers every platform asset. Every asset must belong to a project.
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { projectAssets, assetVersions, projectRegistry } from "@workspace/db/schema";
import { logger } from "../logger";
import type { AssetType, AssetStatus, ProjectAsset } from "./types";

/** Register a new asset in a project */
export async function registerAsset(params: {
  userId:       number;
  projectId:    number;
  businessId?:  number;
  workspaceId?: number;
  assetName:    string;
  assetType:    AssetType;
  externalRef?: string;
  metadata?:    Record<string, unknown>;
}): Promise<ProjectAsset> {
  const rows = await db
    .insert(projectAssets as any)
    .values({
      userId:      params.userId,
      projectId:   params.projectId,
      businessId:  params.businessId ?? null,
      workspaceId: params.workspaceId ?? null,
      assetName:   params.assetName,
      assetType:   params.assetType,
      externalRef: params.externalRef ?? null,
      metadata:    params.metadata ?? {},
    })
    .returning() as any[];
  const asset = rows[0] as ProjectAsset;

  // Record initial version
  await recordAssetVersion(asset.id, params.userId, "1.0.0", "create", "Initial registration");

  // Increment asset count in project registry
  await db
    .update(projectRegistry as any)
    .set({ assetCount: sql`asset_count + 1`, updatedAt: new Date() } as any)
    .where(sql`project_id = ${params.projectId}`);

  logger.info({ assetId: asset.id, projectId: params.projectId, assetType: params.assetType }, "UWPS: asset registered");
  return asset;
}

/** List assets in a project */
export async function listProjectAssets(
  projectId: number,
  userId:    number,
  assetType?: AssetType,
): Promise<ProjectAsset[]> {
  let cond = sql`project_id = ${projectId} AND user_id = ${userId} AND asset_status != 'archived'`;
  if (assetType) cond = sql`${cond} AND asset_type = ${assetType}`;
  const rows = await db
    .select()
    .from(projectAssets as any)
    .where(cond)
    .orderBy(sql`created_at DESC`) as any[];
  return rows as ProjectAsset[];
}

/** List all assets for a user */
export async function listUserAssets(
  userId:      number,
  assetType?:  AssetType,
  assetStatus?: AssetStatus,
): Promise<ProjectAsset[]> {
  let cond = sql`user_id = ${userId}`;
  if (assetType)   cond = sql`${cond} AND asset_type = ${assetType}`;
  if (assetStatus) cond = sql`${cond} AND asset_status = ${assetStatus}`;
  else             cond = sql`${cond} AND asset_status != 'archived'`;
  const rows = await db
    .select()
    .from(projectAssets as any)
    .where(cond)
    .orderBy(sql`updated_at DESC`) as any[];
  return rows as ProjectAsset[];
}

/** Update asset status or version */
export async function updateAsset(
  assetId:     number,
  userId:      number,
  updates:     Partial<{ assetStatus: AssetStatus; currentVersion: string; deploymentStatus: string; externalRef: string; checksum: string; sizeBytes: number; metadata: Record<string, unknown> }>,
  changeType?: string,
  changeSummary?: string,
): Promise<void> {
  const set: Record<string, unknown> = { ...updates, updatedAt: new Date() };
  await db
    .update(projectAssets as any)
    .set(set as any)
    .where(sql`id = ${assetId} AND user_id = ${userId}`);
  if (updates.currentVersion) {
    await recordAssetVersion(assetId, userId, updates.currentVersion, changeType ?? "update", changeSummary ?? "");
  }
}

/** Record an asset version entry */
export async function recordAssetVersion(
  assetId:      number,
  userId:       number,
  version:      string,
  changeType:   string,
  changeSummary: string,
  snapshotData?: Record<string, unknown>,
): Promise<void> {
  await db
    .insert(assetVersions as any)
    .values({
      assetId,
      userId,
      version,
      changeType,
      changeSummary,
      snapshotData: snapshotData ?? {},
    });
}

/** Get asset version history */
export async function getAssetVersionHistory(assetId: number): Promise<any[]> {
  return db
    .select()
    .from(assetVersions as any)
    .where(sql`asset_id = ${assetId}`)
    .orderBy(sql`created_at DESC`) as any;
}

/** Count assets across types for a project */
export async function countAssetsByType(projectId: number): Promise<Record<string, number>> {
  const rows = await db
    .select({
      assetType: sql<string>`asset_type`,
      count:     sql<number>`count(*)::int`,
    })
    .from(projectAssets as any)
    .where(sql`project_id = ${projectId} AND asset_status != 'archived'`)
    .groupBy(sql`asset_type`) as any[];
  return Object.fromEntries(rows.map((r: any) => [r.asset_type, r.count]));
}
