// ── Build 048: Asset Classification Engine ────────────────────────────────────
// Determines canonical class for any platform object from any builder.
import { db } from "@workspace/db";
import { assetClasses, canonicalAssets } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import type { CanonicalClassKey } from "./types";
import { BUILTIN_ASSET_CLASSES } from "./types";

// ── Builder-to-canonical class mapping ───────────────────────────────────────
const BUILDER_TYPE_MAP: Record<string, CanonicalClassKey> = {
  // Website Builder
  "website":         "website",
  "page":            "page",
  "landing_page":    "page",
  "component":       "component",
  "section":         "component",
  // CRM
  "contact":         "customer",
  "lead":            "lead",
  "deal":            "offer",
  "pipeline":        "marketing_funnel",
  // Automation Builder
  "workflow":        "workflow",
  "automation":      "automation",
  "trigger":         "automation",
  "action":          "task",
  // Dashboard / Analytics
  "dashboard":       "analytics_dashboard",
  "chart":           "analytics_dashboard",
  "report":          "document",
  // AI / Agents
  "agent":           "ai_agent",
  "ai_agent":        "ai_agent",
  "prompt":          "prompt",
  "prompt_template": "prompt",
  "knowledge_base":  "knowledge_base",
  // Commerce
  "product":         "product",
  "service":         "service",
  "offer":           "offer",
  "revenue_stream":  "revenue_stream",
  "campaign":        "campaign",
  // Infrastructure
  "database":        "database",
  "table":           "table",
  "api":             "api",
  "endpoint":        "endpoint",
  "integration":     "integration",
  "connection":      "integration",
  "deployment":      "deployment",
  // Content
  "document":        "document",
  "file":            "document",
  "brand_asset":     "brand_asset",
  "logo":            "brand_asset",
  "image":           "brand_asset",
  // Business
  "business":        "business",
  "process":         "process",
  "task":            "task",
};

export function classifyBuilderObject(builderObjectType: string): CanonicalClassKey {
  const lower = builderObjectType.toLowerCase().replace(/[-\s]/g, "_");
  return (BUILDER_TYPE_MAP[lower] as CanonicalClassKey | undefined) ?? "future_asset";
}

export async function seedAssetClasses(): Promise<void> {
  for (const cls of BUILTIN_ASSET_CLASSES) {
    await db
      .insert(assetClasses)
      .values({
        classKey:            cls.classKey,
        displayName:         cls.displayName,
        category:            cls.category,
        parentClassKey:      cls.parentClassKey ?? null,
        description:         cls.description,
        isBuiltin:           true,
        supportsVersioning:  true,
        supportsDeployment:  cls.supportsDeployment,
        defaultCapabilities: [],
      })
      .onConflictDoNothing();
  }
}

export async function getAssetClass(classKey: string) {
  const rows = await db
    .select()
    .from(assetClasses)
    .where(eq(assetClasses.classKey, classKey))
    .limit(1);
  return rows[0] ?? null;
}

export async function listAssetClasses(category?: string) {
  if (category) {
    return db.select().from(assetClasses).where(eq(assetClasses.category, category));
  }
  return db.select().from(assetClasses);
}

export async function getMissingClassesForUser(userId: number): Promise<string[]> {
  const existing = await db
    .selectDistinct({ classKey: canonicalAssets.classKey })
    .from(canonicalAssets)
    .where(and(eq(canonicalAssets.userId, userId), eq(canonicalAssets.status, "active")));
  const existingKeys = new Set(existing.map((r) => r.classKey));
  return BUILTIN_ASSET_CLASSES
    .filter((c) => c.category !== "future" && !existingKeys.has(c.classKey))
    .map((c) => c.displayName);
}
