// ─────────────────────────────────────────────────────────────────────────────
// Build 050 — Manifest Engine
// Creates and validates immutable application manifests
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@workspace/db";
import { platformAppManifests, applicationRegistry } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { createHash } from "crypto";

export interface ManifestInput {
  appId:                  string;
  version:                string;
  title:                  string;
  description:            string;
  icon?:                  string;
  category:               string;
  developer:              string;
  homepageUrl?:           string;
  supportedPermissions:   string[];
  minPlatformVersion:     string;
  compatibleAssetClasses: string[];
  compatibleBuilderTypes: string[];
  metadata?:              Record<string, unknown>;
}

export async function createManifest(input: ManifestInput): Promise<any> {
  const hash = createHash("sha256")
    .update(JSON.stringify({ ...input, createdAt: undefined }))
    .digest("hex")
    .slice(0, 16);

  const rows = await db
    .insert(platformAppManifests)
    .values({
      appId:                  input.appId,
      version:                input.version,
      title:                  input.title,
      description:            input.description,
      icon:                   input.icon,
      category:               input.category,
      developer:              input.developer,
      homepageUrl:            input.homepageUrl,
      supportedPermissions:   input.supportedPermissions,
      minPlatformVersion:     input.minPlatformVersion,
      compatibleAssetClasses: input.compatibleAssetClasses,
      compatibleBuilderTypes: input.compatibleBuilderTypes,
      manifestHash:           hash,
      metadata:               input.metadata ?? {},
    })
    .returning() as any[];

  const manifest = rows[0];

  // Update registry with latest manifest id
  await db
    .update(applicationRegistry)
    .set({ manifestId: manifest.id, updatedAt: new Date() })
    .where(eq(applicationRegistry.appId, input.appId));

  return manifest;
}

export async function getLatestManifest(appId: string): Promise<any | null> {
  const rows = await db
    .select()
    .from(platformAppManifests)
    .where(eq(platformAppManifests.appId, appId))
    .orderBy(desc(platformAppManifests.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getManifestHistory(appId: string): Promise<any[]> {
  return db
    .select()
    .from(platformAppManifests)
    .where(eq(platformAppManifests.appId, appId))
    .orderBy(desc(platformAppManifests.createdAt));
}

export function checkVersionCompatibility(
  manifestVersion: string,
  minPlatformVersion: string,
): { compatible: boolean; reason?: string } {
  const parse = (v: string) => v.split(".").map(Number);
  const [ma, mi, pa] = parse(manifestVersion);
  const [mna, mni, mnp] = parse(minPlatformVersion);
  if (ma > mna) return { compatible: true };
  if (ma < mna) return { compatible: false, reason: `major version ${ma} < required ${mna}` };
  if (mi > mni) return { compatible: true };
  if (mi < mni) return { compatible: false, reason: `minor version ${mi} < required ${mni}` };
  if (pa < mnp)  return { compatible: false, reason: `patch ${pa} < required ${mnp}` };
  return { compatible: true };
}
