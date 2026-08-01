// ── Build 044: Provider Registry Engine ──────────────────────────────────
// Maintains canonical records for every supported provider.
// Unified Connection Law: one canonical record per provider.
import { db } from "@workspace/db";
import { connectionProviders, providerCapabilities, connectionRegistry, connectionAudit } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { ConnectionDomain, ProviderRecord, SeededProvider } from "./types";
import { CONNECTION_DOMAINS, SEEDED_PROVIDERS } from "./types";

// Seed the full provider catalog on first initialization.
export async function seedProviderCatalog(): Promise<{ seeded: number; skipped: number }> {
  let seeded = 0, skipped = 0;

  for (const p of SEEDED_PROVIDERS) {
    const existing = await db
      .select({ id: connectionProviders.id })
      .from(connectionProviders)
      .where(eq(connectionProviders.providerName, p.name))
      .limit(1);

    if (existing.length > 0) { skipped++; continue; }

    const [provider] = await db.insert(connectionProviders).values({
      providerName: p.name,
      domain:       p.domain,
      providerType: p.type,
      status:       "active",
      baseUrl:      p.baseUrl ?? null,
      metadata:     { seeded: true },
    }).returning({ id: connectionProviders.id });

    // Insert capabilities
    if (p.caps.length > 0) {
      await db.insert(providerCapabilities).values(
        p.caps.map((c) => ({
          providerId:     provider.id,
          capabilityName: c.name,
          capabilityType: c.type,
          supported:      true,
        })),
      );
    }

    // Audit
    await db.insert(connectionAudit).values({
      providerId:          provider.id,
      connectionProfileId: null,
      auditType:           "registered",
      actor:               "system",
      details:             { source: "catalog_seed", domain: p.domain },
    });

    seeded++;
  }

  // Upsert domain registry
  for (const domain of CONNECTION_DOMAINS) {
    const count = await db
      .select({ id: connectionProviders.id })
      .from(connectionProviders)
      .where(eq(connectionProviders.domain, domain));

    const existing = await db
      .select({ id: connectionRegistry.id })
      .from(connectionRegistry)
      .where(eq(connectionRegistry.domain, domain))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(connectionRegistry).values({
        domain,
        providerCount:    count.length,
        activeConnections:0,
        healthyProviders: count.length,
        lastUpdated:      new Date(),
      });
    } else {
      await db.update(connectionRegistry)
        .set({ providerCount: count.length, lastUpdated: new Date() })
        .where(eq(connectionRegistry.domain, domain));
    }
  }

  return { seeded, skipped };
}

export async function listProviders(domain?: ConnectionDomain): Promise<ProviderRecord[]> {
  const rows = await db.select().from(connectionProviders);
  return rows
    .filter((r) => !domain || r.domain === domain)
    .map((r) => ({
      id:           r.id,
      providerName: r.providerName,
      domain:       r.domain as ConnectionDomain,
      providerType: r.providerType as any,
      version:      r.version ?? null,
      status:       r.status as any,
      baseUrl:      r.baseUrl ?? null,
    }));
}

export async function registerProvider(params: {
  providerName: string;
  domain:       ConnectionDomain;
  providerType: string;
  baseUrl?:     string;
  version?:     string;
}): Promise<ProviderRecord> {
  const existing = await db
    .select()
    .from(connectionProviders)
    .where(eq(connectionProviders.providerName, params.providerName))
    .limit(1);

  if (existing.length > 0) {
    const r = existing[0];
    return { id: r.id, providerName: r.providerName, domain: r.domain as ConnectionDomain, providerType: r.providerType as any, version: r.version ?? null, status: r.status as any, baseUrl: r.baseUrl ?? null };
  }

  const [row] = await db.insert(connectionProviders).values({
    providerName: params.providerName,
    domain:       params.domain,
    providerType: params.providerType,
    status:       "active",
    baseUrl:      params.baseUrl ?? null,
    version:      params.version ?? null,
  }).returning();

  await db.insert(connectionAudit).values({
    providerId: row.id, connectionProfileId: null, auditType: "registered", actor: "user", details: { providerName: params.providerName },
  });

  return { id: row.id, providerName: row.providerName, domain: row.domain as ConnectionDomain, providerType: row.providerType as any, version: row.version ?? null, status: row.status as any, baseUrl: row.baseUrl ?? null };
}

export async function countProviders(): Promise<number> {
  return (await db.select({ id: connectionProviders.id }).from(connectionProviders)).length;
}
