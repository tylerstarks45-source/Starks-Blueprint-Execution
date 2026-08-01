// ── Build 043: Environment Discovery Engine ───────────────────────────────
// Discovers approved operating environments. Never escalates privileges.
import { db } from "@workspace/db";
import { environmentProfiles, operatingRegistry } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { OperatingDomain, EnvironmentProfile, ExecutionChannelType } from "./types";
import { OPERATING_DOMAINS, EXECUTION_CHANNEL_TYPES } from "./types";

// Domain → default channel type mappings (deterministic, no escalation).
const DOMAIN_CHANNEL_MAP: Record<OperatingDomain, ExecutionChannelType[]> = {
  desktop:                  ["desktop"],
  filesystem:               ["filesystem"],
  browser:                  ["browser"],
  terminal:                 ["terminal"],
  operating_system:         ["terminal", "filesystem"],
  cloud_infrastructure:     ["cloud", "api"],
  databases:                ["database"],
  developer_tools:          ["terminal", "api"],
  communication_platforms:  ["api"],
  business_platforms:       ["api", "browser"],
  ai_providers:             ["api"],
  api_services:             ["api"],
  automation_platforms:     ["api", "terminal"],
  future_connectors:        ["future"],
};

// Discover and register all operating environments from the domain catalog.
// Never opens real connections — only records what is theoretically available.
export async function discoverEnvironments(): Promise<{ discovered: number; domains: OperatingDomain[] }> {
  let discovered = 0;

  for (const domain of OPERATING_DOMAINS) {
    const channels = DOMAIN_CHANNEL_MAP[domain];
    const envName  = domain.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    // Upsert environment profile
    const existing = await db
      .select({ id: environmentProfiles.id })
      .from(environmentProfiles)
      .where(eq(environmentProfiles.domain, domain))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(environmentProfiles).values({
        domain,
        environmentName:  envName,
        environmentType:  channels[0] ?? "api",
        discovered:       true,
        available:        true,
        configuration:    { channels, discoveredBy: "dol-discovery-engine" },
        lastDiscoveredAt: new Date(),
      });
      discovered++;
    } else {
      await db.update(environmentProfiles)
        .set({ discovered: true, available: true, lastDiscoveredAt: new Date() })
        .where(eq(environmentProfiles.domain, domain));
    }

    // Upsert operating registry
    const regExisting = await db
      .select({ id: operatingRegistry.id })
      .from(operatingRegistry)
      .where(eq(operatingRegistry.domain, domain))
      .limit(1);

    if (regExisting.length === 0) {
      await db.insert(operatingRegistry).values({
        domain,
        channelTypes: channels,
        sessionCount: 0,
        lastActive:   null,
      });
    }
  }

  return { discovered, domains: OPERATING_DOMAINS };
}

export async function listEnvironmentProfiles(): Promise<EnvironmentProfile[]> {
  const rows = await db.select().from(environmentProfiles);
  return rows.map((r) => ({
    id:              r.id,
    domain:          r.domain as OperatingDomain,
    environmentName: r.environmentName,
    environmentType: r.environmentType,
    discovered:      r.discovered ?? false,
    available:       r.available ?? false,
  }));
}
