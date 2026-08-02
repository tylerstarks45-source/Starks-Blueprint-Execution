// ── Build 044: Unified Connections & Integration Hub — REST Routes ─────────
// SECURITY NOTE (M-14): This router and all underlying hub engines operate on
// provider METADATA only (names, domains, capability types, health status).
// No credential values are ever read, written, or returned through this
// router. Credential management is handled exclusively through the
// /api/user-credentials and /api/credential-vault routes which use at-rest
// encryption via lib/crypto.ts. This comment must be kept in sync with any
// future hub engine changes that add credential-handling logic.
import { Router } from "express";
import { z }      from "zod";
import { db } from "@workspace/db";
import {
  connectionProviders,
  providerCapabilities,
  connectionRegistry,
  connectionSnapshots,
  connectionAudit,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuthActive, requireAdmin } from "../lib/auth";
import { initializeConnectionsHub } from "../lib/connections-hub/hub-orchestrator";
import { seedProviderCatalog, listProviders, registerProvider } from "../lib/connections-hub/hub-registry-engine";
import { discoverCapabilities, findProvidersByCapability } from "../lib/connections-hub/hub-capability-engine";
import { recordProviderHealth, seedBaselineHealth } from "../lib/connections-hub/hub-health-engine";
import { buildCompatibilityMap, generateRecommendations } from "../lib/connections-hub/hub-compatibility-engine";
import { createConnectionProfile } from "../lib/connections-hub/hub-lifecycle-engine";
import type { ConnectionDomain, ProviderType } from "../lib/connections-hub/types";

export const connectionsHubRouter = Router();

// M-04: Zod schema for POST /connections/register
const RegisterProviderSchema = z.object({
  providerName: z.string().min(1).max(200),
  domain:       z.string().min(1),     // ConnectionDomain — validated at runtime by DB FK
  providerType: z.string().min(1),     // ProviderType    — validated at runtime by DB enum
  baseUrl:      z.string().url().optional(),
  version:      z.string().max(50).optional(),
});

// ── POST /connections/register ─────────────────────────────────────────────
// Register a new provider in the hub.
connectionsHubRouter.post("/register", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    // M-04: validate body with Zod before touching the DB
    const parsed = RegisterProviderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }
    const { providerName, domain, providerType, baseUrl, version } = parsed.data;
    const provider = await registerProvider({
      providerName,
      domain: domain as ConnectionDomain,
      providerType: providerType as ProviderType,
      baseUrl,
      version,
    });
    res.json({ success: true, provider });
  } catch (err: any) {
    res.status(500).json({ error: "registration failed" });
  }
});

// ── POST /connections/discover ─────────────────────────────────────────────
// Trigger full provider catalog seeding + capability discovery.
connectionsHubRouter.post("/discover", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  try {
    const result = await initializeConnectionsHub(caller.id);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: "discovery failed" });
  }
});

// ── POST /connections/evaluate ─────────────────────────────────────────────
// Evaluate compatibility and produce integration recommendations.
connectionsHubRouter.post("/evaluate", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  try {
    await buildCompatibilityMap();
    const recommendations = await generateRecommendations();
    res.json({ success: true, recommendations, count: recommendations.length });
  } catch (err: any) {
    res.status(500).json({ error: "evaluation failed" });
  }
});

// ── POST /connections/refresh ──────────────────────────────────────────────
// Refresh baseline health records for all providers.
connectionsHubRouter.post("/refresh", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  try {
    const seeded = await seedBaselineHealth();
    res.json({ success: true, healthRecordsCreated: seeded });
  } catch (err: any) {
    res.status(500).json({ error: "refresh failed" });
  }
});

// ── GET /connections/providers ─────────────────────────────────────────────
connectionsHubRouter.get("/providers", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const domain = req.query["domain"] as ConnectionDomain | undefined;
    const providers = await listProviders(domain);
    res.json({ success: true, providers, count: providers.length });
  } catch (err: any) {
    res.status(500).json({ error: "fetch failed" });
  }
});

// ── GET /connections/health ────────────────────────────────────────────────
connectionsHubRouter.get("/health", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  try {
    const rawProviderId = req.query["providerId"];
    const providerId = rawProviderId ? parseInt(String(rawProviderId), 10) : undefined;
    const rows = providerId
      ? await db.select().from(db.select().from(connectionProviders).as("p") as any).limit(1).catch(() =>
          db.select().from(connectionProviders).where(eq(connectionProviders.id, providerId)).limit(1))
      : [];
    // Return latest health records
    const healthRows = await db.select().from(
      (await import("@workspace/db/schema")).connectionHealth
    ).orderBy(desc((await import("@workspace/db/schema")).connectionHealth.measuredAt)).limit(50);
    res.json({ success: true, health: healthRows, count: healthRows.length });
  } catch (err: any) {
    res.status(500).json({ error: "fetch failed" });
  }
});

// ── GET /connections/capabilities ──────────────────────────────────────────
connectionsHubRouter.get("/capabilities", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const rawProviderId = req.query["providerId"];
    const capability    = req.query["capability"] as string | undefined;

    if (capability) {
      const providers = await findProvidersByCapability(capability);
      res.json({ success: true, providers, count: providers.length });
      return;
    }

    const providerId = rawProviderId ? parseInt(String(rawProviderId), 10) : undefined;
    const caps = providerId
      ? await discoverCapabilities(providerId)
      : await db.select().from(providerCapabilities).limit(100).then((rows) =>
          rows.map((r) => ({ id: r.id, providerId: r.providerId, capabilityName: r.capabilityName, capabilityType: r.capabilityType, rateLimit: r.rateLimit ?? null, quotaLimit: r.quotaLimit ?? null, supported: r.supported ?? true })));

    res.json({ success: true, capabilities: caps, count: caps.length });
  } catch (err: any) {
    res.status(500).json({ error: "fetch failed" });
  }
});

// ── GET /connections/registry ──────────────────────────────────────────────
connectionsHubRouter.get("/registry", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const registry = await db.select().from(connectionRegistry).orderBy(connectionRegistry.domain);
    res.json({ success: true, registry, count: registry.length });
  } catch (err: any) {
    res.status(500).json({ error: "fetch failed" });
  }
});

// ── GET /connections/snapshots ─────────────────────────────────────────────
connectionsHubRouter.get("/snapshots", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  try {
    const snapshots = await db.select().from(connectionSnapshots).orderBy(desc(connectionSnapshots.createdAt)).limit(20);
    res.json({ success: true, snapshots, count: snapshots.length });
  } catch (err: any) {
    res.status(500).json({ error: "fetch failed" });
  }
});

// ── GET /connections/audit ─────────────────────────────────────────────────
connectionsHubRouter.get("/audit", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  try {
    const limit  = parseInt(String(req.query["limit"] ?? "50"), 10);
    const audit  = await db.select().from(connectionAudit).orderBy(desc(connectionAudit.createdAt)).limit(isNaN(limit) ? 50 : limit);
    res.json({ success: true, audit, count: audit.length });
  } catch (err: any) {
    res.status(500).json({ error: "fetch failed" });
  }
});
