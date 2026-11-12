// Build 057 — UECIOS Orchestrator
import { db } from "@workspace/db";
import { providerSnapshots } from "@workspace/db/schema";
import { sql, type SQL } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { UECIOSSummary } from "./types.js";

async function count(table: string, where?: SQL): Promise<number> {
  const clause = where ? sql` WHERE ${where}` : sql``;
  const result = await db.execute(sql`SELECT COUNT(*) AS cnt FROM ${sql.identifier(table)}${clause}`);
  return Number(((result as any).rows ?? [])[0]?.cnt ?? 0);
}

// ─── Domain coverage analysis ────────────────────────────────────────────────

const CORE_DOMAINS = [
  "payments", "accounting", "banking", "crm", "marketing", "advertising",
  "communication", "video", "voice", "sms", "email", "ai_models",
  "image_generation", "code_generation", "search", "web_browsing",
  "storage", "databases", "cloud_compute", "gpu_providers",
  "authentication", "identity", "analytics", "business_intelligence",
  "project_management", "documentation", "automation", "social_media",
  "calendars", "scheduling", "maps", "geolocation", "legal", "compliance",
  "security", "cybersecurity", "monitoring", "logging", "infrastructure",
  "containers", "devops", "deployment",
];

async function findMissingDomains(): Promise<string[]> {
  const result = await db.execute(sql`
    SELECT DISTINCT jsonb_array_elements_text(domains) AS domain
    FROM capability_providers WHERE status = 'active'
  `);
  const covered = new Set(((result as any).rows ?? []).map((r: any) => r.domain));
  return CORE_DOMAINS.filter(d => !covered.has(d)).slice(0, 10);
}

async function computeIntegrationReadiness(
  connected: number,
  total: number,
  healthy: number,
  coveredDomains: number
): Promise<number> {
  if (total === 0) return 0;
  const connectionRate = total > 0 ? (connected / Math.max(total, 1)) * 30 : 0;
  const healthRate     = connected > 0 ? (healthy / Math.max(connected, 1)) * 30 : 0;
  const domainCoverage = (coveredDomains / CORE_DOMAINS.length) * 40;
  return Math.min(100, Math.round(connectionRate + healthRate + domainCoverage));
}

// ─── Summary builder ─────────────────────────────────────────────────────────

export async function buildUECIOSSummary(_userId?: number): Promise<UECIOSSummary> {
  try {
    const [
      totalProviders,
      activeProviders,
      connectedProviders,
      existingConnectors,
      healthyProviders,
      degradedProviders,
      expiredCredentials,
      pendingSync,
      totalCapabilities,
      activeConnections,
      openRecommendations,
      criticalDiagnostics,
    ] = await Promise.all([
      count("capability_providers"),
      count("capability_providers", sql`status = 'active'`),
      count("provider_connections",  sql`status = 'connected'`),
      count("capability_providers",  sql`existing_connector = true`),
      count("provider_health",       sql`health_status = 'healthy'`),
      count("provider_health",       sql`health_status = 'degraded'`),
      count("provider_credentials",  sql`status = 'expired'`),
      count("provider_sync_jobs",    sql`status = 'pending'`),
      count("uecios_capabilities"),
      count("provider_connections",  sql`status = 'connected'`),
      count("provider_recommendations", sql`status = 'open'`),
      count("provider_diagnostics",  sql`severity = 'critical' AND is_resolved = false`),
    ]);

    const coveredResult = await db.execute(sql`
      SELECT COUNT(DISTINCT jsonb_array_elements_text(domains)) AS cnt
      FROM capability_providers WHERE status = 'active'
    `).catch(() => ({ rows: [] }));
    const coveredDomains = Number(((coveredResult as any).rows ?? [])[0]?.cnt ?? 0);

    const missingDomains = await findMissingDomains().catch(() => []);
    const integrationReadiness = await computeIntegrationReadiness(
      connectedProviders, activeProviders, healthyProviders, coveredDomains
    );

    return {
      totalProviders, activeProviders, connectedProviders, existingConnectors,
      healthyProviders, degradedProviders, expiredCredentials, pendingSync,
      totalCapabilities, activeConnections, openRecommendations, criticalDiagnostics,
      integrationReadiness, coveredDomains, missingDomains,
      computedAt: new Date().toISOString(),
    };
  } catch {
    return {
      totalProviders: 0, activeProviders: 0, connectedProviders: 0, existingConnectors: 0,
      healthyProviders: 0, degradedProviders: 0, expiredCredentials: 0, pendingSync: 0,
      totalCapabilities: 0, activeConnections: 0, openRecommendations: 0, criticalDiagnostics: 0,
      integrationReadiness: 0, coveredDomains: 0, missingDomains: [],
      computedAt: new Date().toISOString(),
    };
  }
}

export async function captureUECIOSSnapshot(_userId?: number): Promise<void> {
  const s = await buildUECIOSSummary(_userId);
  await db.insert(providerSnapshots).values({
    snapshotId:           `snap-uecios-${randomUUID()}`,
    userId:               _userId,
    totalProviders:       s.totalProviders,
    activeProviders:      s.activeProviders,
    connectedProviders:   s.connectedProviders,
    healthyProviders:     s.healthyProviders,
    expiredCredentials:   s.expiredCredentials,
    activeConnections:    s.activeConnections,
    integrationReadiness: s.integrationReadiness,
  });
}

export async function runUECIOSMaintenance(_userId?: number): Promise<void> {
  await captureUECIOSSnapshot(_userId);
}
