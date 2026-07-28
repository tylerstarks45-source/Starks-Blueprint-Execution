import { db, businessMemoryTable, businessesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { BusinessMemory } from "@workspace/db";

// ─── Business Memory (Layer 4) ─────────────────────────────────────────────
// One row per business (see business_memory.ts). Resolved via the business's
// systemInstanceId — the same link `ash_projects` uses — so a project's
// business context can be found without a direct project<->business FK.

export async function getBusinessMemoryForSystemInstance(systemInstanceId: number | null): Promise<BusinessMemory | null> {
  if (systemInstanceId == null) return null;
  const [business] = await db.select({ id: businessesTable.id }).from(businessesTable).where(eq(businessesTable.systemInstanceId, systemInstanceId));
  if (!business) return null;
  return getOrCreateBusinessMemory(business.id);
}

// Read-only lookup (no business_memory row side effect) used by write paths
// that need to TAG a memory/knowledge item with its business — e.g. auto
// memory capture and completion learning — without forcing a business_memory
// row into existence just because a memory item was written.
export async function resolveBusinessIdForSystemInstance(systemInstanceId: number | null): Promise<number | null> {
  if (systemInstanceId == null) return null;
  const [business] = await db.select({ id: businessesTable.id }).from(businessesTable).where(eq(businessesTable.systemInstanceId, systemInstanceId));
  return business?.id ?? null;
}

export async function getOrCreateBusinessMemory(businessId: number): Promise<BusinessMemory> {
  const [existing] = await db.select().from(businessMemoryTable).where(eq(businessMemoryTable.businessId, businessId));
  if (existing) {
    await db.update(businessMemoryTable).set({ lastAccessedAt: new Date() }).where(eq(businessMemoryTable.id, existing.id)).catch(() => {});
    return existing;
  }
  const [created] = await db.insert(businessMemoryTable).values({ businessId }).returning();
  return created;
}

// Merges newly-learned facts into a business's memory row. List fields
// (products/services/customers/competitors) are unioned + de-duplicated
// rather than overwritten, so one conversation's findings don't erase
// another's.
export async function mergeBusinessMemory(businessId: number, patch: {
  businessModel?: string;
  products?: string[];
  services?: string[];
  customers?: string[];
  competitors?: string[];
  revenueGoals?: string;
  marketingStrategy?: string;
  seoStrategy?: string;
  automationStrategy?: string;
}): Promise<void> {
  const current = await getOrCreateBusinessMemory(businessId);

  const mergeList = (existing: unknown, incoming?: string[]): string[] => {
    const base = Array.isArray(existing) ? (existing as string[]) : [];
    if (!incoming || incoming.length === 0) return base;
    return [...new Set([...base, ...incoming])].slice(0, 50);
  };

  await db.update(businessMemoryTable).set({
    businessModel: patch.businessModel ?? current.businessModel,
    products: mergeList(current.products, patch.products),
    services: mergeList(current.services, patch.services),
    customers: mergeList(current.customers, patch.customers),
    competitors: mergeList(current.competitors, patch.competitors),
    revenueGoals: patch.revenueGoals ?? current.revenueGoals,
    marketingStrategy: patch.marketingStrategy ?? current.marketingStrategy,
    seoStrategy: patch.seoStrategy ?? current.seoStrategy,
    automationStrategy: patch.automationStrategy ?? current.automationStrategy,
    lastAccessedAt: new Date(),
  }).where(eq(businessMemoryTable.id, current.id));
}
