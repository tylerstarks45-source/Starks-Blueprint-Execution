// ── Build 048: Translation Engine ─────────────────────────────────────────────
// Translates builder-native objects into canonical asset representations.
import { db } from "@workspace/db";
import { assetTranslation, canonicalAssets, assetRegistry, assetLifecycle } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { classifyBuilderObject } from "./asset-classification-engine";
import { normalizeBuilderMetadata, persistNormalizedMetadata } from "./metadata-normalization-engine";
import { declareDefaultCapabilities } from "./capability-engine";

export interface TranslationInput {
  userId:          number;
  businessId?:     number;
  projectId?:      number;
  workspaceId?:    number;
  builderSource:   string;
  builderObjectId: string;
  builderObjectType: string;
  rawPayload:      Record<string, unknown>;
}

export interface TranslationResult {
  canonicalAssetId: number;
  classKey:         string;
  canonicalName:    string;
  isNew:            boolean;
  fieldMappings:    Record<string, string>;
  unmappedFields:   string[];
}

export async function translateBuilderObject(
  input: TranslationInput,
): Promise<TranslationResult> {
  // 1. Check if already translated
  const existing = await db
    .select()
    .from(assetTranslation)
    .where(
      and(
        eq(assetTranslation.builderSource, input.builderSource),
        eq(assetTranslation.builderObjectId, input.builderObjectId),
        eq(assetTranslation.status, "active"),
      ),
    )
    .limit(1);

  if (existing.length > 0 && existing[0]) {
    const existingCanonical = await db
      .select()
      .from(canonicalAssets)
      .where(eq(canonicalAssets.id, existing[0].canonicalAssetId))
      .limit(1);

    return {
      canonicalAssetId: existing[0].canonicalAssetId,
      classKey:         existing[0].translatedClassKey,
      canonicalName:    existingCanonical[0]?.canonicalName ?? "Unknown",
      isNew:            false,
      fieldMappings:    (existing[0].fieldMappings as Record<string, string>) ?? {},
      unmappedFields:   [],
    };
  }

  // 2. Classify
  const classKey = classifyBuilderObject(input.builderObjectType);

  // 3. Normalize metadata
  const normResult = normalizeBuilderMetadata(input.rawPayload);
  const canonicalName =
    (normResult.normalized.find((m) => m.key === "name")?.value) ??
    String(input.rawPayload["name"] ?? input.rawPayload["title"] ?? `${classKey}-${input.builderObjectId}`);

  const canonicalSlug = canonicalName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  // 4. Create canonical asset
  const assetResult = await db
    .insert(canonicalAssets)
    .values({
      userId:          input.userId,
      businessId:      input.businessId ?? null,
      projectId:       input.projectId ?? null,
      workspaceId:     input.workspaceId ?? null,
      classKey,
      canonicalName,
      canonicalSlug,
      description:     normResult.normalized.find((m) => m.key === "description")?.value ?? null,
      builderSource:   input.builderSource,
      builderObjectId: input.builderObjectId,
      status:          "active",
      version:         "1.0.0",
      tags:            [],
    })
    .returning({ id: canonicalAssets.id });

  const canonicalAssetId = (assetResult as any[])[0]?.id as number;

  // 5. Build field mappings
  const fieldMappings: Record<string, string> = {};
  for (const m of normResult.normalized) {
    if (m.normalizedFrom) fieldMappings[m.normalizedFrom] = m.key;
  }

  // 6. Persist translation record
  await db.insert(assetTranslation).values({
    canonicalAssetId,
    userId:             input.userId,
    builderSource:      input.builderSource,
    builderObjectId:    input.builderObjectId,
    builderObjectType:  input.builderObjectType,
    translatedClassKey: classKey,
    fieldMappings,
    rawPayload:         input.rawPayload,
    translationVersion: "1.0",
    status:             "active",
  });

  // 7. Persist normalized metadata
  await persistNormalizedMetadata(canonicalAssetId, input.userId, normResult, "builder");

  // 8. Seed default capabilities
  await declareDefaultCapabilities(canonicalAssetId, input.userId, classKey);

  // 9. Upsert registry
  await db
    .insert(assetRegistry)
    .values({
      assetId:           canonicalAssetId,
      userId:            input.userId,
      classKey,
      canonicalName,
      status:            "active",
      lifecycleStage:    "active",
      capabilityCount:   0,
      relationshipCount: 0,
      metadataCount:     normResult.normalized.length,
      hasTranslation:    true,
      lastActivityAt:    new Date(),
    })
    .onConflictDoNothing();

  // 10. Record lifecycle event
  await db.insert(assetLifecycle).values({
    assetId:   canonicalAssetId,
    userId:    input.userId,
    eventType: "translated",
    fromStage: null,
    toStage:   "active",
    actor:     "builder",
    summary:   `Translated from ${input.builderSource} ${input.builderObjectType} "${canonicalName}"`,
    details:   { builderSource: input.builderSource, builderObjectType: input.builderObjectType, fieldMappings },
  });

  return {
    canonicalAssetId,
    classKey,
    canonicalName,
    isNew:          true,
    fieldMappings,
    unmappedFields: normResult.unmapped,
  };
}

export async function listTranslations(userId: number, builderSource?: string) {
  if (builderSource) {
    return db.select().from(assetTranslation).where(and(eq(assetTranslation.userId, userId), eq(assetTranslation.builderSource, builderSource)));
  }
  return db.select().from(assetTranslation).where(eq(assetTranslation.userId, userId));
}
