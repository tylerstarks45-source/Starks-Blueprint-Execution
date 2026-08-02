// ── Build 048: UBAF Orchestrator ──────────────────────────────────────────────
import { db } from "@workspace/db";
import {
  canonicalAssets, assetRegistry, assetSnapshots, assetLifecycle, assetRelationshipsV2,
  assetCapabilities, assetTranslation,
} from "@workspace/db/schema";
import { eq, and, desc, sql, like, or } from "drizzle-orm";
import { seedAssetClasses, getMissingClassesForUser } from "./asset-classification-engine";
import { findDuplicates } from "./relationship-engine";
import { countRevenueCapabilities } from "./capability-engine";
import type { UBAFSummary } from "./types";
import { UBAF_THROTTLE_CYCLES } from "./types";

// ── Initialization ────────────────────────────────────────────────────────────
let initialized = false;

export async function initializeUBAF(): Promise<void> {
  if (initialized) return;
  await seedAssetClasses();
  initialized = true;
}

// ── Register canonical asset (manual, non-translated path) ───────────────────
export async function registerCanonicalAsset(params: {
  userId:       number;
  classKey:     string;
  canonicalName: string;
  description?: string;
  businessId?:  number;
  projectId?:   number;
  workspaceId?: number;
  tags?:        string[];
  externalUrl?: string;
}): Promise<{ assetId: number }> {
  const slug = params.canonicalName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  const result = await db
    .insert(canonicalAssets)
    .values({
      userId:        params.userId,
      businessId:    params.businessId ?? null,
      projectId:     params.projectId ?? null,
      workspaceId:   params.workspaceId ?? null,
      classKey:      params.classKey,
      canonicalName: params.canonicalName,
      canonicalSlug: slug,
      description:   params.description ?? null,
      status:        "active",
      version:       "1.0.0",
      tags:          params.tags ?? [],
      externalUrl:   params.externalUrl ?? null,
    })
    .returning({ id: canonicalAssets.id });

  const assetId = (result as any[])[0]?.id as number;

  await db
    .insert(assetRegistry)
    .values({
      assetId,
      userId:            params.userId,
      classKey:          params.classKey,
      canonicalName:     params.canonicalName,
      status:            "active",
      lifecycleStage:    "active",
      capabilityCount:   0,
      relationshipCount: 0,
      metadataCount:     0,
      hasTranslation:    false,
      lastActivityAt:    new Date(),
    })
    .onConflictDoNothing();

  await db.insert(assetLifecycle).values({
    assetId,
    userId:    params.userId,
    eventType: "registered",
    fromStage: null,
    toStage:   "active",
    actor:     "user",
    summary:   `Canonical asset "${params.canonicalName}" registered as ${params.classKey}`,
    details:   { classKey: params.classKey },
  });

  return { assetId };
}

// ── List assets ───────────────────────────────────────────────────────────────
export async function listCanonicalAssets(userId: number, classKey?: string, status?: string) {
  const conditions = [eq(canonicalAssets.userId, userId)];
  if (classKey) conditions.push(eq(canonicalAssets.classKey, classKey));
  if (status)   conditions.push(eq(canonicalAssets.status, status));
  return db.select().from(canonicalAssets).where(and(...conditions)).orderBy(desc(canonicalAssets.createdAt));
}

// ── Search ────────────────────────────────────────────────────────────────────
export async function searchAssets(userId: number, query: string) {
  const q = `%${query.toLowerCase()}%`;
  return db
    .select()
    .from(canonicalAssets)
    .where(
      and(
        eq(canonicalAssets.userId, userId),
        or(
          like(sql`lower(${canonicalAssets.canonicalName})`, q),
          like(sql`lower(coalesce(${canonicalAssets.description}, ''))`, q),
          like(canonicalAssets.classKey, q),
        ),
      ),
    )
    .limit(50);
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
export async function getAssetLifecycle(assetId: number) {
  return db
    .select()
    .from(assetLifecycle)
    .where(eq(assetLifecycle.assetId, assetId))
    .orderBy(desc(assetLifecycle.createdAt));
}

// ── Registry ──────────────────────────────────────────────────────────────────
export async function getAssetRegistry(userId: number) {
  return db.select().from(assetRegistry).where(eq(assetRegistry.userId, userId));
}

// ── Summary for EB ────────────────────────────────────────────────────────────
export async function computeUBAFSummary(userId: number): Promise<UBAFSummary> {
  const [assets, caps, rels, translations] = await Promise.all([
    db.select({ classKey: canonicalAssets.classKey, status: canonicalAssets.status })
       .from(canonicalAssets).where(eq(canonicalAssets.userId, userId)),
    db.select({ category: assetCapabilities.category, capId: assetCapabilities.capabilityId })
       .from(assetCapabilities).where(and(eq(assetCapabilities.userId, userId), eq(assetCapabilities.isEnabled, true))),
    db.select({ cnt: sql<string>`count(*)` }).from(assetRelationshipsV2).where(eq(assetRelationshipsV2.userId, userId)),
    db.select({ cnt: sql<string>`count(*)` }).from(assetTranslation).where(eq(assetTranslation.userId, userId)),
  ]);

  const totalAssets        = assets.length;
  const activeAssets       = assets.filter((a) => a.status === "active").length;
  const totalRelationships = Number(rels[0]?.cnt ?? 0);
  const totalTranslations  = Number(translations[0]?.cnt ?? 0);

  const classBreakdown: Record<string, number> = {};
  for (const a of assets) {
    classBreakdown[a.classKey] = (classBreakdown[a.classKey] ?? 0) + 1;
  }

  // Top capability IDs by frequency
  const capFreq: Record<string, number> = {};
  for (const c of caps) { capFreq[c.capId] = (capFreq[c.capId] ?? 0) + 1; }
  const topCapabilities = Object.entries(capFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  const [missingClasses, duplicateSlugs, revenueAssets] = await Promise.all([
    getMissingClassesForUser(userId),
    findDuplicates(userId),
    countRevenueCapabilities(userId),
  ]);

  return {
    totalAssets,
    activeAssets,
    totalClasses:      Object.keys(classBreakdown).length,
    totalRelationships,
    totalCapabilities: caps.length,
    totalTranslations,
    classBreakdown,
    topCapabilities,
    revenueAssets,
    missingClasses:    missingClasses.slice(0, 10),
    duplicateSlugs,
    computedAt:        new Date().toISOString(),
  };
}

// ── Background maintenance (330-cycle throttle via EB) ────────────────────────
let lastMaintenanceCycle = 0;

export async function triggerUBAFMaintenance(userId: number): Promise<void> {
  lastMaintenanceCycle++;
  if (lastMaintenanceCycle % UBAF_THROTTLE_CYCLES !== 0) return;
  await captureUBAFSnapshot(userId);
}

export async function captureUBAFSnapshot(userId: number): Promise<void> {
  const summary = await computeUBAFSummary(userId);

  await db.insert(assetSnapshots).values({
    totalAssets:          summary.totalAssets,
    totalClasses:         summary.totalClasses,
    totalRelationships:   summary.totalRelationships,
    totalCapabilities:    summary.totalCapabilities,
    totalTranslations:    summary.totalTranslations,
    activeAssets:         summary.activeAssets,
    classBreakdown:       summary.classBreakdown,
    capabilityBreakdown:  {},
    topRelationshipTypes: [],
    lawApplied:           true,
    snapshotData:         { build: "048", userId },
  });
}
