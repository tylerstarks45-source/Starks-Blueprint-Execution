import { and, eq, inArray, isNotNull, notInArray, sql } from "drizzle-orm";
import {
  db, canonicalAssets, businessesTable, landingPagesTable, userDomainsTable, systemInstancesTable, emailListsTable,
} from "@workspace/db";

// Universal Asset Vault: every asset ASH or the user creates is a row in
// canonical_assets, attached to a business. Builders register through
// registerAsset; syncUserAssets backfills from the source tables so assets made
// anywhere in the platform show up without per-builder wiring.

export const ASSET_CLASS_LABELS: Record<string, string> = {
  website: "Website", page: "Landing page", application: "Software / app", domain: "Domain", email_list: "Email list",
  product: "Product", service: "Service", offer: "Offer", campaign: "Campaign", brand_asset: "Brand asset",
  document: "Document", ai_agent: "AI agent", automation: "Automation", integration: "Integration", api: "API",
  marketing_funnel: "Sales funnel", knowledge_base: "Knowledge base", other: "Other",
};

export interface AssetInput {
  userId: number;
  businessId?: number | null;
  classKey: string;
  name: string;
  description?: string | null;
  builderSource: string;
  builderObjectId: string;
  externalUrl?: string | null;
  status?: string;
}

export const OWNER_EDITED_TAG = "owner_edited";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "asset";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function upsertMany(tx: Tx, userId: number, inputs: AssetInput[]): Promise<number> {
  if (!inputs.length) return 0;
  const existing = await tx
    .select({ id: canonicalAssets.id, builderSource: canonicalAssets.builderSource, builderObjectId: canonicalAssets.builderObjectId,
      businessId: canonicalAssets.businessId, canonicalName: canonicalAssets.canonicalName, externalUrl: canonicalAssets.externalUrl, status: canonicalAssets.status,
      tags: canonicalAssets.tags })
    .from(canonicalAssets)
    .where(and(eq(canonicalAssets.userId, userId), isNotNull(canonicalAssets.builderSource)));
  const byKey = new Map(existing.map((e) => [`${e.builderSource}:${e.builderObjectId}`, e]));
  let created = 0;
  for (const a of inputs) {
    const prev = byKey.get(`${a.builderSource}:${a.builderObjectId}`);
    const status = a.status ?? "active";
    if (!prev) {
      await tx.insert(canonicalAssets).values({
        userId, businessId: a.businessId ?? null, classKey: a.classKey, canonicalName: a.name, canonicalSlug: slug(a.name),
        description: a.description ?? null, builderSource: a.builderSource, builderObjectId: a.builderObjectId,
        externalUrl: a.externalUrl ?? null, status,
      });
      created++;
    } else if (Array.isArray(prev.tags) && prev.tags.includes(OWNER_EDITED_TAG)) {
      // The owner changed this asset in the vault; their name, status and business win over the source.
      // A source that exists again un-deletes the row; otherwise only the URL follows the source.
      const revived = prev.status === "deleted";
      if (revived || (prev.externalUrl ?? null) !== (a.externalUrl ?? null)) {
        await tx.update(canonicalAssets).set({ externalUrl: a.externalUrl ?? null, ...(revived ? { status } : {}), updatedAt: new Date() })
          .where(eq(canonicalAssets.id, prev.id));
      }
    } else if (prev.canonicalName !== a.name || (prev.externalUrl ?? null) !== (a.externalUrl ?? null) || prev.status !== status
      // Keep a business the owner assigned by hand; only fill it when unset.
      || (prev.businessId == null && a.businessId != null)) {
      await tx.update(canonicalAssets).set({
        canonicalName: a.name, externalUrl: a.externalUrl ?? null, status, updatedAt: new Date(),
        ...(prev.businessId == null && a.businessId != null ? { businessId: a.businessId } : {}),
      }).where(eq(canonicalAssets.id, prev.id));
    }
  }
  return created;
}

export const lockUser = (tx: Tx, userId: number) => tx.execute(sql`select pg_advisory_xact_lock(hashtext('empire_asset_vault'), ${userId})`);

/** Register (or update) one asset. Idempotent per (user, builderSource, builderObjectId). */
export async function registerAsset(input: AssetInput): Promise<number> {
  return db.transaction(async (tx) => {
    await lockUser(tx, input.userId);
    await upsertMany(tx, input.userId, [input]);
    const [row] = await tx.select({ id: canonicalAssets.id }).from(canonicalAssets).where(and(
      eq(canonicalAssets.userId, input.userId), eq(canonicalAssets.builderSource, input.builderSource), eq(canonicalAssets.builderObjectId, input.builderObjectId)));
    return row!.id;
  });
}

const SYNCED_SOURCES = ["landing_pages", "user_domains", "system_instances", "email_lists"] as const;

/** Pull the user's existing landing pages, domains, systems and email lists into the vault. */
export async function syncUserAssets(userId: number): Promise<{ created: number }> {
  // Lock before reading sources so an older snapshot can't overwrite or delete newer rows.
  const created = await db.transaction(async (tx) => {
    await lockUser(tx, userId);
    const [businesses, pages, domains, systems, lists] = await Promise.all([
      tx.select({ id: businessesTable.id, systemInstanceId: businessesTable.systemInstanceId }).from(businessesTable).where(eq(businessesTable.ownerId, userId)),
      tx.select({ id: landingPagesTable.id, title: landingPagesTable.title, publicUrl: landingPagesTable.publicUrl, isPublished: landingPagesTable.isPublished, systemInstanceId: landingPagesTable.systemInstanceId })
        .from(landingPagesTable).where(eq(landingPagesTable.userId, userId)),
      tx.select({ id: userDomainsTable.id, domain: userDomainsTable.domain, status: userDomainsTable.status, linkedPageId: userDomainsTable.linkedPageId })
        .from(userDomainsTable).where(eq(userDomainsTable.userId, userId)),
      tx.select({ id: systemInstancesTable.id, name: systemInstancesTable.name, buildStatus: systemInstancesTable.buildStatus })
        .from(systemInstancesTable).where(eq(systemInstancesTable.userId, userId)),
      tx.select({ id: emailListsTable.id, name: emailListsTable.name, description: emailListsTable.description })
        .from(emailListsTable).where(eq(emailListsTable.userId, userId)),
    ]);
    const bizByInstance = new Map(businesses.filter((b) => b.systemInstanceId != null).map((b) => [b.systemInstanceId!, b.id]));
    const pageBiz = new Map(pages.map((p) => [p.id, p.systemInstanceId != null ? bizByInstance.get(p.systemInstanceId) ?? null : null]));
    const inputs: AssetInput[] = [
      ...pages.map((p) => ({ userId, classKey: "page", name: p.title, builderSource: "landing_pages", builderObjectId: String(p.id),
        externalUrl: p.publicUrl, businessId: pageBiz.get(p.id) ?? null, status: p.isPublished ? "active" : "draft" })),
      ...domains.map((d) => ({ userId, classKey: "domain", name: d.domain, builderSource: "user_domains", builderObjectId: String(d.id),
        externalUrl: `https://${d.domain}`, businessId: d.linkedPageId != null ? pageBiz.get(d.linkedPageId) ?? null : null,
        status: d.status === "active" ? "active" : "draft" })),
      ...systems.map((s) => ({ userId, classKey: "application", name: s.name, builderSource: "system_instances", builderObjectId: String(s.id),
        businessId: bizByInstance.get(s.id) ?? null, status: s.buildStatus === "archived" ? "archived" : ["active", "built", "running"].includes(s.buildStatus) ? "active" : "draft" })),
      ...lists.map((l) => ({ userId, classKey: "email_list", name: l.name, description: l.description, builderSource: "email_lists", builderObjectId: String(l.id) })),
    ];
    const n = await upsertMany(tx, userId, inputs);
    // Source objects that no longer exist are removed from the vault.
    for (const source of SYNCED_SOURCES) {
      const live = inputs.filter((i) => i.builderSource === source).map((i) => i.builderObjectId);
      await tx.update(canonicalAssets).set({ status: "deleted", updatedAt: new Date() }).where(and(
        eq(canonicalAssets.userId, userId), eq(canonicalAssets.builderSource, source), sql`${canonicalAssets.status} <> 'deleted'`,
        ...(live.length ? [notInArray(canonicalAssets.builderObjectId, live)] : [])));
    }
    return n;
  });
  return { created };
}

/** Business ids the user owns, from the given candidates. */
export async function ownedBusinessIds(userId: number, ids: number[]): Promise<Set<number>> {
  if (!ids.length) return new Set();
  const rows = await db.select({ id: businessesTable.id }).from(businessesTable)
    .where(and(eq(businessesTable.ownerId, userId), inArray(businessesTable.id, ids)));
  return new Set(rows.map((r) => r.id));
}
