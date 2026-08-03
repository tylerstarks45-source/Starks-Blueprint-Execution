// ─────────────────────────────────────────────────────────────────────────────
// Build 051 — Component Registry Engine
// Registers every platform component; owns discovery and state
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@workspace/db";
import {
  visualComponents, componentRegistry, componentFamilies,
} from "@workspace/db/schema";
import { eq, like, or, desc, sql } from "drizzle-orm";
import type { ComponentInput } from "./types";
import { createHash } from "crypto";

// ── Families ──────────────────────────────────────────────────────────────────
export async function registerFamily(input: {
  familyKey: string; title: string; description?: string; category: string; sortOrder?: number;
}): Promise<{ id: number; familyKey: string }> {
  const existing = await db
    .select({ id: componentFamilies.id })
    .from(componentFamilies)
    .where(eq(componentFamilies.familyKey, input.familyKey))
    .limit(1);
  if (existing.length > 0) return { id: existing[0].id, familyKey: input.familyKey };

  const rows = await db.insert(componentFamilies).values({
    familyKey:   input.familyKey,
    title:       input.title,
    description: input.description ?? "",
    category:    input.category,
    sortOrder:   input.sortOrder ?? 0,
  }).returning() as any[];
  return { id: rows[0].id, familyKey: rows[0].familyKey };
}

export async function listFamilies(): Promise<any[]> {
  return db.select().from(componentFamilies).orderBy(componentFamilies.sortOrder);
}

// ── Components ────────────────────────────────────────────────────────────────
export async function registerComponent(input: ComponentInput): Promise<{ id: number; componentKey: string }> {
  const existing = await db
    .select({ id: visualComponents.id })
    .from(visualComponents)
    .where(eq(visualComponents.componentKey, input.componentKey))
    .limit(1);

  if (existing.length > 0) {
    // Already registered — upsert registry entry
    await upsertRegistry(existing[0].id, input.componentKey, input.familyId);
    return { id: existing[0].id, componentKey: input.componentKey };
  }

  const rows = await db.insert(visualComponents).values({
    familyId:             input.familyId,
    componentKey:         input.componentKey,
    title:                input.title,
    description:          input.description,
    category:             input.category,
    propsSchema:          input.propsSchema ?? {},
    defaultProps:         input.defaultProps ?? {},
    accessibilityRole:    input.accessibilityRole,
    ariaLabelTemplate:    input.ariaLabelTemplate,
    keyboardInteractions: input.keyboardInteractions ?? [],
    semanticMeaning:      input.semanticMeaning,
    semanticIntent:       input.semanticIntent,
    ashSemanticTag:       input.ashSemanticTag,
    responsiveBreakpoints:[],
    supportedThemes:      ["light", "dark"],
    isPlatformComponent:  true,
    isPublic:             true,
    version:              "1.0.0",
    metadata:             input.metadata ?? {},
  }).returning() as any[];

  const comp = rows[0];
  await upsertRegistry(comp.id, comp.componentKey, input.familyId);
  return { id: comp.id, componentKey: comp.componentKey };
}

async function upsertRegistry(componentId: number, componentKey: string, familyId: number): Promise<void> {
  const compRow = await db.select({ title: visualComponents.title }).from(visualComponents).where(eq(visualComponents.id, componentId)).limit(1);
  const title = compRow[0]?.title ?? componentKey;

  const existing = await db.select({ id: componentRegistry.id }).from(componentRegistry).where(eq(componentRegistry.componentKey, componentKey)).limit(1);
  if (existing.length > 0) return;

  await db.insert(componentRegistry).values({
    componentKey,
    title,
    familyId,
    currentVersion:      "1.0.0",
    isEnabled:           true,
    isPlatformComponent: true,
    usageCount:          0,
    healthStatus:        "healthy",
    deprecated:          false,
    updatedAt:           new Date(),
  });
}

export async function listComponents(category?: string): Promise<any[]> {
  if (category) {
    return db.select().from(visualComponents).where(eq(visualComponents.category, category as any)).orderBy(visualComponents.title);
  }
  return db.select().from(visualComponents).orderBy(visualComponents.category, visualComponents.title);
}

export async function getComponent(componentKey: string): Promise<any | null> {
  const rows = await db.select().from(visualComponents).where(eq(visualComponents.componentKey, componentKey)).limit(1);
  return rows[0] ?? null;
}

export async function searchComponents(query: string): Promise<any[]> {
  const q = `%${query.toLowerCase()}%`;
  return db.select().from(visualComponents)
    .where(or(like(visualComponents.componentKey, q), like(visualComponents.title, q), like(visualComponents.ashSemanticTag, q)))
    .orderBy(visualComponents.title)
    .limit(20);
}

export async function getRegistryStats(): Promise<{
  totalComponents: number;
  enabledComponents: number;
  deprecatedCount: number;
  healthBreakdown: Record<string, number>;
  categoryBreakdown: Record<string, number>;
}> {
  const comps = await db.select().from(visualComponents);
  const reg   = await db.select().from(componentRegistry);
  const health: Record<string, number>   = {};
  const category: Record<string, number> = {};
  for (const r of reg) {
    health[r.healthStatus] = (health[r.healthStatus] ?? 0) + 1;
  }
  for (const c of comps) {
    category[c.category] = (category[c.category] ?? 0) + 1;
  }
  return {
    totalComponents:  reg.length,
    enabledComponents:reg.filter((r) => r.isEnabled).length,
    deprecatedCount:  reg.filter((r) => r.deprecated).length,
    healthBreakdown:  health,
    categoryBreakdown:category,
  };
}
