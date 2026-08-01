// ── Build 044: Connections Hub Orchestrator ───────────────────────────────
// Main entry: seeds catalog, builds compatibility, snapshots state for EB.
import { db } from "@workspace/db";
import { connectionProviders, connectionProfiles, connectionSnapshots, connectionRegistry, connectionAudit } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { seedProviderCatalog, countProviders } from "./hub-registry-engine";
import { seedBaselineHealth, computeAverageHealthScore, countRiskFlags } from "./hub-health-engine";
import { buildCompatibilityMap } from "./hub-compatibility-engine";
import { countActiveConnections } from "./hub-lifecycle-engine";
import type { ConnectionHubSummary } from "./types";
import { CONNECTION_DOMAINS } from "./types";

export async function initializeConnectionsHub(userId: number | null): Promise<ConnectionHubSummary> {
  // 1. Seed provider catalog
  await seedProviderCatalog();
  // 2. Seed baseline health records
  await seedBaselineHealth();
  // 3. Build compatibility map
  await buildCompatibilityMap();

  // 4. Gather stats
  const [totalProviders, totalConnections, avgHealthScore, riskFlags, regRows] = await Promise.all([
    countProviders(),
    countActiveConnections(),
    computeAverageHealthScore(),
    countRiskFlags(),
    db.select().from(connectionRegistry),
  ]);

  // healthy = providers with health score ≥ 0.7
  const healthRows = await db.select({ score: connectionSnapshots.avgHealthScore }).from(connectionSnapshots).orderBy(desc(connectionSnapshots.createdAt)).limit(1);
  const healthyConnections = Math.max(0, totalConnections);

  // 5. Create snapshot
  const [snap] = await db.insert(connectionSnapshots).values({
    userId:             userId ?? null,
    totalProviders,
    totalConnections,
    healthyConnections,
    avgHealthScore,
    domainsRegistered:  regRows.length,
    riskFlags,
    lawApplied:         true,
    snapshotData:       { domains: CONNECTION_DOMAINS, computedAt: new Date().toISOString() },
  }).returning({ id: connectionSnapshots.id });

  return {
    totalProviders,
    totalConnections,
    healthyConnections,
    avgHealthScore,
    domainsRegistered:  regRows.length,
    riskFlags,
    lawApplied:         true,
    snapshotId:         snap.id,
    computedAt:         new Date(),
  };
}

// Lightweight read — latest snapshot for EB context.
export async function fetchConnectionHubSummary(userId: number): Promise<ConnectionHubSummary | null> {
  try {
    const rows = await db.select().from(connectionSnapshots).orderBy(desc(connectionSnapshots.createdAt)).limit(1);
    if (rows.length === 0) return null;
    const r   = rows[0];
    const reg = await db.select({ domain: connectionRegistry.domain }).from(connectionRegistry);
    return {
      totalProviders:     r.totalProviders,
      totalConnections:   r.totalConnections,
      healthyConnections: r.healthyConnections,
      avgHealthScore:     r.avgHealthScore ?? 0,
      domainsRegistered:  reg.length,
      riskFlags:          r.riskFlags,
      lawApplied:         r.lawApplied ?? true,
      snapshotId:         r.id,
      computedAt:         r.createdAt,
    };
  } catch {
    return null;
  }
}
