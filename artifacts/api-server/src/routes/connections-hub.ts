// ── Build 044: Unified Connections & Integration Hub — REST Routes ─────────
import { Router } from "express";
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

// ── POST /connections/register ─────────────────────────────────────────────
// Register a new provider in the hub.
connectionsHubRouter.post("/register", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const { providerName, domain, providerType, baseUrl, version } = req.body as {
      providerName: string;
      domain:       ConnectionDomain;
      providerType: ProviderType;
      baseUrl?:     string;
      version?:     string;
    };
    if (!providerName || !domain || !providerType) {
      res.status(400).json({ error: "providerName, domain, and providerType are required" });
      return;
    }
    const provider = await registerProvider({ providerName, domain, providerType, baseUrl, version });
    res.json({ success: true, provider });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "registration failed" });
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
    res.status(500).json({ error: err?.message ?? "discovery failed" });
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
    res.status(500).json({ error: err?.message ?? "evaluation failed" });
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
    res.status(500).json({ error: err?.message ?? "refresh failed" });
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
    res.status(500).json({ error: err?.message ?? "fetch failed" });
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
    res.status(500).json({ error: err?.message ?? "fetch failed" });
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
    res.status(500).json({ error: err?.message ?? "fetch failed" });
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
    res.status(500).json({ error: err?.message ?? "fetch failed" });
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
    res.status(500).json({ error: err?.message ?? "fetch failed" });
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
    res.status(500).json({ error: err?.message ?? "fetch failed" });
  }
});
