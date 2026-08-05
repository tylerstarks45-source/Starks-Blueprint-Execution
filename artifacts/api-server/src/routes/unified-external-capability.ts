// Build 057 — Unified External Capability & Integration Operating System (UECIOS)
// REST API: /api/capabilities/*  (18 endpoints)

import { Router } from "express";
import { db } from "@workspace/db";
import {
  ueciosDomains,
  capabilityProviders,
  providerManifests,
  ueciosCapabilities,
  providerConnections,
  providerWebhooks,
  providerSyncJobs,
  providerHealth,
  providerDiagnostics,
  providerRecommendations,
  providerRegistry,
  providerSnapshots,
  providerDependencies,
  providerEvents,
  providerLifecycle,
  providerPolicies,
  providerAudits,
} from "@workspace/db/schema";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth } from "../lib/auth.js";
import { buildUECIOSSummary, captureUECIOSSnapshot } from "../lib/unified-external-capability/uecios-orchestrator.js";

const router = Router();

// ─── helpers ─────────────────────────────────────────────────────────────────

function isFounderOrSuperAdmin(role: string | undefined): boolean {
  return role === "FOUNDER_ADMIN" || role === "SUPER_ADMIN";
}

async function getUserRole(userId: number): Promise<string | undefined> {
  const result = await db.execute(sql`SELECT role FROM users WHERE id = ${userId} LIMIT 1`);
  return ((result as any).rows ?? [])[0]?.role;
}

// ─── GET /capabilities/domains ────────────────────────────────────────────────
router.get("/domains", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const result = await db.execute(sql`
      SELECT * FROM capability_domains ORDER BY name ASC
    `);
    res.json({ domains: (result as any).rows ?? [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /capabilities/providers ──────────────────────────────────────────────
router.get("/providers", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { status, domain } = req.query as Record<string, any>;
    let where = sql`WHERE 1=1`;
    if (status) where = sql`${where} AND status = ${status}`;
    if (domain) where = sql`${where} AND domains @> ${JSON.stringify([domain])}::jsonb`;
    const result = await db.execute(sql`
      SELECT * FROM capability_providers ${where} ORDER BY name ASC LIMIT 200
    `);
    res.json({ providers: (result as any).rows ?? [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /capabilities/providers ─────────────────────────────────────────────
router.post("/providers", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const role = await getUserRole(userId);
    if (!isFounderOrSuperAdmin(role)) {
      res.status(403).json({ error: "Provider registration requires FOUNDER_ADMIN or SUPER_ADMIN" });
      return;
    }
    const {
      name, slug, domains = [], authMethods = [], docsUrl, baseUrl, apiVersion,
      connectorId, existingConnector = false,
    } = req.body as Record<string, any>;
    if (!name || !slug) { res.status(400).json({ error: "name and slug are required" }); return; }

    const rows = (await db.insert(capabilityProviders).values({
      providerId: `prov-${randomUUID()}`,
      name, slug, docsUrl, baseUrl, apiVersion, connectorId,
      existingConnector,
      domains: JSON.stringify(domains),
      authMethods: JSON.stringify(authMethods),
      status: "active",
      isOfficiallySupported: isFounderOrSuperAdmin(role),
    }).returning()) as any[];

    // Audit
    await db.insert(providerAudits).values({
      auditId:   `audit-${randomUUID()}`,
      providerId: rows[0]?.provider_id,
      userId, actorId: userId, actorRole: role,
      action: "provider_registered",
      after: JSON.stringify(rows[0] ?? {}),
    });

    res.json({ success: true, provider: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /capabilities/capabilities ───────────────────────────────────────────
router.get("/capabilities", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { providerId, domainSlug, status } = req.query as Record<string, any>;
    let where = sql`WHERE 1=1`;
    if (providerId)  where = sql`${where} AND provider_id = ${providerId}`;
    if (domainSlug)  where = sql`${where} AND domain_slug = ${domainSlug}`;
    if (status)      where = sql`${where} AND status = ${status}`;
    const result = await db.execute(sql`
      SELECT * FROM uecios_capabilities ${where} ORDER BY name ASC LIMIT 500
    `);
    res.json({ capabilities: (result as any).rows ?? [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /capabilities/connections ───────────────────────────────────────────
router.post("/connections", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { providerId, authMethod = "api_key", businessId } = req.body as Record<string, any>;
    if (!providerId) { res.status(400).json({ error: "providerId is required" }); return; }

    const rows = (await db.insert(providerConnections).values({
      connectionId: `conn-${randomUUID()}`,
      userId, providerId, authMethod,
      businessId: businessId ? Number(businessId) : undefined,
      status: "pending",
    }).returning()) as any[];

    // Lifecycle entry
    await db.insert(providerLifecycle).values({
      lifecycleId:     `lc-${randomUUID()}`,
      providerId,
      connectionId:    rows[0]?.connection_id,
      userId,
      lifecycleStage:  "authorization",
      previousStage:   "discovery",
      transitionReason: "User initiated connection",
      triggeredBy:     "user",
    });

    res.json({ success: true, connection: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /capabilities/connections ────────────────────────────────────────────
router.get("/connections", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { status, providerId } = req.query as Record<string, any>;
    let where = sql`WHERE user_id = ${userId}`;
    if (status)     where = sql`${where} AND status = ${status}`;
    if (providerId) where = sql`${where} AND provider_id = ${providerId}`;
    const result = await db.execute(sql`
      SELECT * FROM provider_connections ${where} ORDER BY created_at DESC LIMIT 100
    `);
    res.json({ connections: (result as any).rows ?? [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /capabilities/health ──────────────────────────────────────────────────
router.get("/health", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { providerId, status: healthStatus } = req.query as Record<string, any>;
    let where = sql`WHERE 1=1`;
    if (providerId)    where = sql`${where} AND provider_id = ${providerId}`;
    if (healthStatus)  where = sql`${where} AND health_status = ${healthStatus}`;
    const result = await db.execute(sql`
      SELECT ph.*, cp.name AS provider_name, cp.slug AS provider_slug
        FROM provider_health ph
        LEFT JOIN capability_providers cp ON cp.provider_id = ph.provider_id
        ${where}
       ORDER BY ph.checked_at DESC LIMIT 100
    `);
    res.json({ health: (result as any).rows ?? [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /capabilities/diagnostics ────────────────────────────────────────────
router.get("/diagnostics", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { severity, providerId } = req.query as Record<string, any>;
    let where = sql`WHERE is_resolved = false`;
    if (severity)   where = sql`${where} AND severity = ${severity}`;
    if (providerId) where = sql`${where} AND provider_id = ${providerId}`;
    const result = await db.execute(sql`
      SELECT * FROM provider_diagnostics ${where}
      ORDER BY created_at DESC LIMIT 100
    `);
    res.json({ diagnostics: (result as any).rows ?? [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /capabilities/recommendations ────────────────────────────────────────
// FOUNDER_ADMIN / SUPER_ADMIN only — infrastructure and capability recommendations
router.get("/recommendations", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const role = await getUserRole(userId);
    if (!isFounderOrSuperAdmin(role)) {
      res.status(403).json({ error: "Infrastructure recommendations require FOUNDER_ADMIN or SUPER_ADMIN" });
      return;
    }
    const { status } = req.query as Record<string, any>;
    let where = sql`WHERE 1=1`;
    if (status) where = sql`${where} AND status = ${status}`;
    else        where = sql`${where} AND status = 'open'`;
    const result = await db.execute(sql`
      SELECT * FROM provider_recommendations ${where}
      ORDER BY priority ASC, created_at DESC LIMIT 50
    `);
    res.json({ recommendations: (result as any).rows ?? [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /capabilities/registry ───────────────────────────────────────────────
router.get("/registry", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { refresh } = req.query as Record<string, any>;
    if (refresh === "true") {
      await captureUECIOSSnapshot(userId);
    }
    const summary = await buildUECIOSSummary(userId);
    const result = await db.execute(sql`
      SELECT * FROM provider_registry WHERE user_id IS NULL ORDER BY updated_at DESC LIMIT 1
    `);
    res.json({ registry: ((result as any).rows ?? [])[0] ?? null, summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /capabilities/snapshots ──────────────────────────────────────────────
router.get("/snapshots", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const result = await db.execute(sql`
      SELECT * FROM provider_snapshots ORDER BY created_at DESC LIMIT 30
    `);
    res.json({ snapshots: (result as any).rows ?? [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /capabilities/search ─────────────────────────────────────────────────
router.get("/search", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { q = "" } = req.query as Record<string, any>;
    const term = `%${String(q).toLowerCase()}%`;
    const [providers, capabilities] = await Promise.all([
      db.execute(sql`
        SELECT 'provider' AS type, provider_id AS id, name, status
          FROM capability_providers WHERE LOWER(name) LIKE ${term} LIMIT 10
      `),
      db.execute(sql`
        SELECT 'capability' AS type, capability_id AS id, name, domain_slug AS status
          FROM uecios_capabilities WHERE LOWER(name) LIKE ${term} LIMIT 10
      `),
    ]);
    const results = [
      ...((providers as any).rows ?? []),
      ...((capabilities as any).rows ?? []),
    ];
    res.json({ query: q, results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /capabilities/audits ─────────────────────────────────────────────────
router.get("/audits", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const role = await getUserRole(userId);
    if (!isFounderOrSuperAdmin(role)) {
      res.status(403).json({ error: "Audit log requires FOUNDER_ADMIN or SUPER_ADMIN" });
      return;
    }
    const { providerId, action } = req.query as Record<string, any>;
    let where = sql`WHERE 1=1`;
    if (providerId) where = sql`${where} AND provider_id = ${providerId}`;
    if (action)     where = sql`${where} AND action = ${action}`;
    const result = await db.execute(sql`
      SELECT * FROM provider_audits ${where} ORDER BY created_at DESC LIMIT 100
    `);
    res.json({ audits: (result as any).rows ?? [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /capabilities/sync ──────────────────────────────────────────────────
router.post("/sync", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { providerId, syncType = "health_check", connectionId } = req.body as Record<string, any>;
    if (!providerId) { res.status(400).json({ error: "providerId is required" }); return; }

    const rows = (await db.insert(providerSyncJobs).values({
      syncJobId:    `sync-${randomUUID()}`,
      providerId, connectionId,
      userId,
      syncType,
      status:       "pending",
      scheduledAt:  new Date(),
    }).returning()) as any[];

    res.json({ success: true, syncJob: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /capabilities/lifecycle ──────────────────────────────────────────────
router.get("/lifecycle", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { providerId, connectionId } = req.query as Record<string, any>;
    let where = sql`WHERE user_id = ${userId}`;
    if (providerId)    where = sql`${where} AND provider_id = ${providerId}`;
    if (connectionId)  where = sql`${where} AND connection_id = ${connectionId}`;
    const result = await db.execute(sql`
      SELECT * FROM provider_lifecycle ${where}
      ORDER BY created_at DESC LIMIT 50
    `);
    res.json({ lifecycle: (result as any).rows ?? [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /capabilities/webhooks ───────────────────────────────────────────────
router.get("/webhooks", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { status, providerId } = req.query as Record<string, any>;
    let where = sql`WHERE user_id = ${userId}`;
    if (status)     where = sql`${where} AND status = ${status}`;
    if (providerId) where = sql`${where} AND provider_id = ${providerId}`;
    const result = await db.execute(sql`
      SELECT * FROM provider_webhooks ${where}
      ORDER BY created_at DESC LIMIT 100
    `);
    res.json({ webhooks: (result as any).rows ?? [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /capabilities/events ─────────────────────────────────────────────────
router.get("/events", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const { eventType, severity, providerId } = req.query as Record<string, any>;
    let where = sql`WHERE user_id = ${userId}`;
    if (eventType)  where = sql`${where} AND event_type = ${eventType}`;
    if (severity)   where = sql`${where} AND severity = ${severity}`;
    if (providerId) where = sql`${where} AND provider_id = ${providerId}`;
    const result = await db.execute(sql`
      SELECT * FROM provider_events ${where}
      ORDER BY created_at DESC LIMIT 100
    `);
    res.json({ events: (result as any).rows ?? [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /capabilities/policies ──────────────────────────────────────────────
router.post("/policies", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const role = await getUserRole(userId);
    if (!isFounderOrSuperAdmin(role)) {
      res.status(403).json({ error: "Policy creation requires FOUNDER_ADMIN or SUPER_ADMIN" });
      return;
    }
    const {
      title, policyType, description, rules = [], enforcement = "advisory",
      providerId, appliesTo = {},
    } = req.body as Record<string, any>;
    if (!title || !policyType) { res.status(400).json({ error: "title and policyType are required" }); return; }

    const rows = (await db.insert(providerPolicies).values({
      policyId:    `pol-${randomUUID()}`,
      providerId,  title, policyType, description, enforcement,
      rules:       JSON.stringify(rules),
      appliesTo:   JSON.stringify(appliesTo),
    }).returning()) as any[];

    res.json({ success: true, policy: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
