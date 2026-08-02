// ── Build 048: Asset Manifest Engine ─────────────────────────────────────────
// Produces immutable manifests describing every canonical asset.
import { db } from "@workspace/db";
import { assetManifests, canonicalAssets, assetCapabilities, assetRelationshipsV2, assetRegistry } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { createHash } from "crypto";

export interface AssetManifestData {
  assetId:       number;
  classKey:      string;
  canonicalName: string;
  capabilities:  Array<{ id: string; name: string; category: string }>;
  relationships: Array<{ targetAssetId: number; type: string; label: string }>;
  metadata:      Record<string, string>;
  lifecycleStage: string;
  deploymentInfo: Record<string, unknown>;
}

function computeChecksum(data: AssetManifestData): string {
  const payload = JSON.stringify({
    assetId:       data.assetId,
    classKey:      data.classKey,
    canonicalName: data.canonicalName,
    capabilities:  data.capabilities,
    relationships: data.relationships,
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

function deriveVersion(existing: string | null): string {
  if (!existing) return "1.0.0";
  const parts = existing.split(".").map(Number);
  parts[2] = (parts[2] ?? 0) + 1;
  return parts.join(".");
}

export async function produceManifest(
  assetId: number,
  userId:  number,
): Promise<{ manifestId: number; manifestVersion: string }> {
  // Fetch asset + capabilities + relationships
  const [assetRows, caps, rels] = await Promise.all([
    db.select().from(canonicalAssets).where(eq(canonicalAssets.id, assetId)).limit(1),
    db.select().from(assetCapabilities).where(and(eq(assetCapabilities.assetId, assetId), eq(assetCapabilities.isEnabled, true))),
    db.select().from(assetRelationshipsV2).where(eq(assetRelationshipsV2.sourceAssetId, assetId)),
  ]);

  const asset = assetRows[0];
  if (!asset) throw new Error(`Asset ${assetId} not found`);

  // Get existing latest manifest version
  const existingRows = await db
    .select({ manifestVersion: assetManifests.manifestVersion })
    .from(assetManifests)
    .where(and(eq(assetManifests.assetId, assetId), eq(assetManifests.isLatest, true)))
    .orderBy(desc(assetManifests.createdAt))
    .limit(1);

  const nextVersion = deriveVersion(existingRows[0]?.manifestVersion ?? null);

  const data: AssetManifestData = {
    assetId,
    classKey:       asset.classKey,
    canonicalName:  asset.canonicalName,
    capabilities:   caps.map((c) => ({ id: c.capabilityId, name: c.capabilityName, category: c.category })),
    relationships:  rels.map((r) => ({ targetAssetId: r.targetAssetId, type: r.relationshipType, label: r.semanticLabel })),
    metadata:       {},
    lifecycleStage: "active",
    deploymentInfo: {},
  };

  const checksum = computeChecksum(data);

  // Mark previous manifests as not-latest
  await db
    .update(assetManifests)
    .set({ isLatest: false })
    .where(and(eq(assetManifests.assetId, assetId), eq(assetManifests.isLatest, true)));

  const insertResult = await db
    .insert(assetManifests)
    .values({
      assetId,
      userId,
      manifestVersion: nextVersion,
      classKey:        data.classKey,
      canonicalName:   data.canonicalName,
      capabilities:    data.capabilities,
      relationships:   data.relationships,
      metadata:        data.metadata,
      lifecycleStage:  data.lifecycleStage,
      deploymentInfo:  data.deploymentInfo,
      checksum,
      isLatest:        true,
    })
    .returning({ id: assetManifests.id });

  const manifestId = (insertResult as any[])[0]?.id as number;

  // Update registry with manifest version
  await db
    .update(assetRegistry)
    .set({ manifestVersion: nextVersion, updatedAt: new Date() })
    .where(eq(assetRegistry.assetId, assetId));

  return { manifestId, manifestVersion: nextVersion };
}

export async function getLatestManifest(assetId: number) {
  const rows = await db
    .select()
    .from(assetManifests)
    .where(and(eq(assetManifests.assetId, assetId), eq(assetManifests.isLatest, true)))
    .orderBy(desc(assetManifests.createdAt))
    .limit(1);
  return rows[0] ?? null;
}
