// ── Build 048: Metadata Normalization Engine ──────────────────────────────────
// Converts builder metadata into unified canonical metadata.
import { db } from "@workspace/db";
import { assetMetadata } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

// ── Builder field name → canonical field name mapping ────────────────────────
const FIELD_NORMALIZATION_MAP: Record<string, { canonical: string; type: string; metadataType: string }> = {
  // Generic
  "name":            { canonical: "name",            type: "string", metadataType: "semantic" },
  "title":           { canonical: "name",            type: "string", metadataType: "semantic" },
  "label":           { canonical: "name",            type: "string", metadataType: "semantic" },
  "description":     { canonical: "description",     type: "string", metadataType: "semantic" },
  "summary":         { canonical: "description",     type: "string", metadataType: "semantic" },
  "url":             { canonical: "url",             type: "url",    metadataType: "operational" },
  "slug":            { canonical: "slug",            type: "string", metadataType: "operational" },
  "status":          { canonical: "status",          type: "string", metadataType: "operational" },
  "tags":            { canonical: "tags",            type: "json",   metadataType: "semantic" },
  "category":        { canonical: "category",        type: "string", metadataType: "semantic" },
  "version":         { canonical: "version",         type: "string", metadataType: "technical" },
  // Business
  "revenue":         { canonical: "revenue",         type: "number", metadataType: "business" },
  "price":           { canonical: "price",           type: "number", metadataType: "business" },
  "currency":        { canonical: "currency",        type: "string", metadataType: "business" },
  "owner":           { canonical: "owner",           type: "string", metadataType: "business" },
  "owner_id":        { canonical: "owner_id",        type: "string", metadataType: "business" },
  // Technical
  "created_at":      { canonical: "created_at",      type: "date",   metadataType: "technical" },
  "updated_at":      { canonical: "updated_at",      type: "date",   metadataType: "technical" },
  "published_at":    { canonical: "published_at",    type: "date",   metadataType: "technical" },
  "deployed_at":     { canonical: "deployed_at",     type: "date",   metadataType: "technical" },
  "type":            { canonical: "asset_type",      type: "string", metadataType: "technical" },
  "platform":        { canonical: "platform",        type: "string", metadataType: "technical" },
  "language":        { canonical: "language",        type: "string", metadataType: "technical" },
  // Commerce
  "email":           { canonical: "email",           type: "string", metadataType: "semantic" },
  "phone":           { canonical: "phone",           type: "string", metadataType: "semantic" },
  "company":         { canonical: "company",         type: "string", metadataType: "semantic" },
  "industry":        { canonical: "industry",        type: "string", metadataType: "business" },
};

export interface NormalizationResult {
  normalized: Array<{
    key: string;
    value: string;
    valueType: string;
    metadataType: string;
    normalizedFrom: string | null;
  }>;
  unmapped: string[];
}

export function normalizeBuilderMetadata(
  rawPayload: Record<string, unknown>,
): NormalizationResult {
  const normalized: NormalizationResult["normalized"] = [];
  const unmapped: string[] = [];

  for (const [rawKey, rawValue] of Object.entries(rawPayload)) {
    if (rawValue === null || rawValue === undefined) continue;
    const lowerKey = rawKey.toLowerCase().replace(/[-\s]/g, "_");
    const mapping = FIELD_NORMALIZATION_MAP[lowerKey];

    const valueStr =
      typeof rawValue === "object"
        ? JSON.stringify(rawValue)
        : String(rawValue);

    if (mapping) {
      normalized.push({
        key:           mapping.canonical,
        value:         valueStr,
        valueType:     mapping.type,
        metadataType:  mapping.metadataType,
        normalizedFrom: rawKey !== mapping.canonical ? rawKey : null,
      });
    } else {
      // Pass through unmapped fields as semantic metadata
      normalized.push({
        key:           lowerKey,
        value:         valueStr,
        valueType:     typeof rawValue === "number" ? "number" : typeof rawValue === "boolean" ? "boolean" : "string",
        metadataType:  "semantic",
        normalizedFrom: null,
      });
      unmapped.push(rawKey);
    }
  }

  return { normalized, unmapped };
}

export async function persistNormalizedMetadata(
  assetId: number,
  userId: number,
  result: NormalizationResult,
  source: string = "builder",
): Promise<void> {
  if (result.normalized.length === 0) return;

  await db.insert(assetMetadata).values(
    result.normalized.map((m) => ({
      assetId,
      userId,
      metadataType:   m.metadataType,
      key:            m.key,
      value:          m.value,
      valueType:      m.valueType,
      normalizedFrom: m.normalizedFrom,
      confidence:     m.normalizedFrom ? 90 : 100,
      source,
    })),
  );
}

export async function getAssetMetadata(assetId: number) {
  return db.select().from(assetMetadata).where(eq(assetMetadata.assetId, assetId));
}

export async function getAssetMetadataForUser(userId: number) {
  return db.select().from(assetMetadata).where(eq(assetMetadata.userId, userId));
}
