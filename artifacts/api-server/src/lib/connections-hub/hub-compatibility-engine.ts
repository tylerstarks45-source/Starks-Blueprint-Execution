// ── Build 044: Compatibility Engine ──────────────────────────────────────
// Determines which providers can satisfy the same capability for failover/comparison.
import { db } from "@workspace/db";
import { providerCompatibility, providerCapabilities, connectionProviders } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { CompatibilityRecord, IntegrationRecommendation } from "./types";

// Build compatibility map for all capabilities — find alternative providers.
export async function buildCompatibilityMap(): Promise<number> {
  let computed = 0;

  // Get all unique capability names
  const allCaps = await db.select({ capabilityName: providerCapabilities.capabilityName, providerId: providerCapabilities.providerId }).from(providerCapabilities);

  // Group by capability name
  const capMap = new Map<string, number[]>();
  for (const cap of allCaps) {
    const existing = capMap.get(cap.capabilityName) ?? [];
    existing.push(cap.providerId);
    capMap.set(cap.capabilityName, existing);
  }

  // For each capability with multiple providers, compute compatibility
  for (const [capName, providerIds] of capMap.entries()) {
    if (providerIds.length < 2) continue;

    for (const providerId of providerIds) {
      const alternatives = providerIds.filter((id) => id !== providerId);

      const existing = await db
        .select({ id: providerCompatibility.id })
        .from(providerCompatibility)
        .where(eq(providerCompatibility.providerId, providerId))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(providerCompatibility).values({
          providerId,
          capabilityName:         capName,
          compatibleWith:         providerIds,
          alternativeProviderIds: alternatives,
          failoverScore:          alternatives.length > 0 ? 0.8 : 0.0,
          notes:                  `${alternatives.length} alternative provider(s) available for ${capName}`,
        });
        computed++;
      }
    }
  }

  return computed;
}

export async function getCompatibilityForProvider(providerId: number): Promise<CompatibilityRecord[]> {
  const rows = await db
    .select()
    .from(providerCompatibility)
    .where(eq(providerCompatibility.providerId, providerId));
  return rows.map((r) => ({
    providerId:             r.providerId,
    capabilityName:         r.capabilityName,
    alternativeProviderIds: (r.alternativeProviderIds as number[]) ?? [],
    failoverScore:          r.failoverScore ?? 0.5,
  }));
}

// Produce deterministic integration recommendations.
export async function generateRecommendations(): Promise<IntegrationRecommendation[]> {
  const recommendations: IntegrationRecommendation[] = [];

  // Failover recommendation: providers with alternatives
  const allCompat = await db.select().from(providerCompatibility);
  for (const c of allCompat) {
    const alts = (c.alternativeProviderIds as number[]) ?? [];
    if (alts.length > 0 && (c.failoverScore ?? 0) > 0.7) {
      recommendations.push({
        type:       "failover",
        providerId: c.providerId,
        targetId:   alts[0],
        reason:     `${alts.length} failover provider(s) available for capability '${c.capabilityName}'`,
        priority:   "medium",
      });
    }
  }

  // Redundancy: providers with no alternatives
  const providers = await db.select({ id: connectionProviders.id }).from(connectionProviders);
  for (const p of providers) {
    const compat = allCompat.filter((c) => c.providerId === p.id && ((c.alternativeProviderIds as number[]) ?? []).length === 0);
    if (compat.length > 0) {
      recommendations.push({
        type:       "redundancy",
        providerId: p.id,
        reason:     `Provider has ${compat.length} capability/capabilities with no alternatives`,
        priority:   "high",
      });
    }
  }

  return recommendations.slice(0, 20); // cap at 20
}
