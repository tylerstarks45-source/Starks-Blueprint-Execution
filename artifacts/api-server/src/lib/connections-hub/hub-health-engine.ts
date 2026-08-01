// ── Build 044: Connection Health Engine ───────────────────────────────────
// Tracks availability, latency, quota, rate limits, auth state, version compatibility.
import { db } from "@workspace/db";
import { connectionHealth, connectionProviders } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import type { HealthRecord, AuthState } from "./types";

// Record a health measurement for a provider. Append-only.
export async function recordProviderHealth(params: {
  providerId:          number;
  connectionProfileId?:number;
  availability?:       number;
  latencyMs?:          number;
  quotaUsed?:          number;
  quotaLimit?:         number;
  rateLimitUsed?:      number;
  rateLimitMax?:       number;
  authState?:          AuthState;
  versionCompatible?:  boolean;
}): Promise<HealthRecord> {
  // Compute health score: weighted combination of availability, reliability, quota
  const avail = params.availability ?? 1.0;
  const quota = params.quotaLimit ? 1 - (params.quotaUsed ?? 0) / params.quotaLimit : 1.0;
  const authOk = params.authState === "valid" || params.authState === undefined ? 1.0 : 0.0;
  const healthScore = Math.max(0, Math.min(1, avail * 0.5 + quota * 0.3 + authOk * 0.2));

  const [row] = await db.insert(connectionHealth).values({
    providerId:          params.providerId,
    connectionProfileId: params.connectionProfileId ?? null,
    availability:        params.availability ?? 1.0,
    latencyMs:           params.latencyMs ?? 0,
    quotaUsed:           params.quotaUsed ?? 0,
    quotaLimit:          params.quotaLimit ?? null,
    rateLimitUsed:       params.rateLimitUsed ?? 0,
    rateLimitMax:        params.rateLimitMax ?? null,
    authState:           params.authState ?? "valid",
    versionCompatible:   params.versionCompatible ?? true,
    healthScore,
  }).returning();

  return {
    providerId:        row.providerId,
    availability:      row.availability ?? 1.0,
    latencyMs:         row.latencyMs,
    quotaUsed:         row.quotaUsed,
    quotaLimit:        row.quotaLimit ?? null,
    rateLimitUsed:     row.rateLimitUsed,
    rateLimitMax:      row.rateLimitMax ?? null,
    authState:         (row.authState ?? "valid") as AuthState,
    versionCompatible: row.versionCompatible ?? true,
    healthScore:       row.healthScore ?? 1.0,
  };
}

// Seed baseline health records for all providers on first init.
export async function seedBaselineHealth(): Promise<number> {
  const providers = await db.select({ id: connectionProviders.id }).from(connectionProviders);
  let seeded = 0;
  for (const p of providers) {
    const existing = await db.select({ id: connectionHealth.id })
      .from(connectionHealth).where(eq(connectionHealth.providerId, p.id)).limit(1);
    if (existing.length === 0) {
      await recordProviderHealth({ providerId: p.id });
      seeded++;
    }
  }
  return seeded;
}

export async function getLatestHealth(providerId: number): Promise<HealthRecord | null> {
  const rows = await db
    .select()
    .from(connectionHealth)
    .where(eq(connectionHealth.providerId, providerId))
    .orderBy(desc(connectionHealth.measuredAt))
    .limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    providerId:        r.providerId,
    availability:      r.availability ?? 1.0,
    latencyMs:         r.latencyMs,
    quotaUsed:         r.quotaUsed,
    quotaLimit:        r.quotaLimit ?? null,
    rateLimitUsed:     r.rateLimitUsed,
    rateLimitMax:      r.rateLimitMax ?? null,
    authState:         (r.authState ?? "valid") as AuthState,
    versionCompatible: r.versionCompatible ?? true,
    healthScore:       r.healthScore ?? 1.0,
  };
}

export async function computeAverageHealthScore(): Promise<number> {
  const rows = await db.select({ score: connectionHealth.healthScore }).from(connectionHealth);
  if (rows.length === 0) return 0;
  return rows.reduce((a, r) => a + (r.score ?? 0), 0) / rows.length;
}

export async function countRiskFlags(): Promise<number> {
  const rows = await db.select({ score: connectionHealth.healthScore, authState: connectionHealth.authState }).from(connectionHealth);
  return rows.filter((r) => (r.score ?? 1) < 0.7 || r.authState !== "valid").length;
}
