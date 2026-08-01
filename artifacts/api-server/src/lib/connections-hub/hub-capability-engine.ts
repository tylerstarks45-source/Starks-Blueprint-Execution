// ── Build 044: Capability Discovery Engine ────────────────────────────────
// Determines what each provider is capable of and tracks version compatibility.
import { db } from "@workspace/db";
import { providerCapabilities, connectionProviders } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { CapabilityRecord, CapabilityType } from "./types";

export async function discoverCapabilities(providerId: number): Promise<CapabilityRecord[]> {
  const rows = await db
    .select()
    .from(providerCapabilities)
    .where(eq(providerCapabilities.providerId, providerId));
  return rows.map(rowToCapability);
}

export async function addCapability(params: {
  providerId:     number;
  capabilityName: string;
  capabilityType: CapabilityType;
  description?:   string;
  rateLimit?:     number;
  quotaLimit?:    number;
  apiVersion?:    string;
}): Promise<CapabilityRecord> {
  const [row] = await db.insert(providerCapabilities).values({
    providerId:     params.providerId,
    capabilityName: params.capabilityName,
    capabilityType: params.capabilityType,
    description:    params.description ?? null,
    rateLimit:      params.rateLimit ?? null,
    quotaLimit:     params.quotaLimit ?? null,
    apiVersion:     params.apiVersion ?? null,
    supported:      true,
  }).returning();
  return rowToCapability(row);
}

// Find all providers that offer a specific capability.
export async function findProvidersByCapability(capabilityName: string): Promise<Array<{
  providerId: number; providerName: string; domain: string; capabilityType: string;
}>> {
  const caps = await db
    .select({ providerId: providerCapabilities.providerId, capabilityType: providerCapabilities.capabilityType })
    .from(providerCapabilities)
    .where(eq(providerCapabilities.capabilityName, capabilityName));

  const results: Array<{ providerId: number; providerName: string; domain: string; capabilityType: string }> = [];
  for (const cap of caps) {
    const [prov] = await db.select({ providerName: connectionProviders.providerName, domain: connectionProviders.domain })
      .from(connectionProviders).where(eq(connectionProviders.id, cap.providerId)).limit(1);
    if (prov) results.push({ providerId: cap.providerId, providerName: prov.providerName, domain: prov.domain, capabilityType: cap.capabilityType });
  }
  return results;
}

export async function countCapabilitiesByProvider(): Promise<Map<number, number>> {
  const rows = await db.select({ providerId: providerCapabilities.providerId }).from(providerCapabilities);
  const map = new Map<number, number>();
  for (const r of rows) {
    map.set(r.providerId, (map.get(r.providerId) ?? 0) + 1);
  }
  return map;
}

function rowToCapability(r: typeof providerCapabilities.$inferSelect): CapabilityRecord {
  return {
    id:             r.id,
    providerId:     r.providerId,
    capabilityName: r.capabilityName,
    capabilityType: r.capabilityType as CapabilityType,
    rateLimit:      r.rateLimit ?? null,
    quotaLimit:     r.quotaLimit ?? null,
    supported:      r.supported ?? true,
  };
}
