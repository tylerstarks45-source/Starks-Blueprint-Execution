// ─────────────────────────────────────────────────────────────────────────────
// Build 030: Universal Execution Adapter Framework — REST Routes (9 endpoints)
// All under /api/adapter-framework
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from "express";
import { db } from "@workspace/db";
import {
  executionAdapters,
  adapterRegistry,
  adapterCapabilities,
  adapterHealth,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuthActive } from "../lib/auth";
import {
  registerAdapter,
  executeViaAdapter,
  buildFrameworkSummary,
  validateAdapter,
  runHealthCheck,
  applyLifecycleEvent,
} from "../lib/adapter-framework";
import { resolveAdapter } from "../lib/adapter-framework/adapter-resolution-engine";
import type { AdapterManifest, AdapterLifecycleEvent } from "../lib/adapter-framework/types";

const router = Router();
const p = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? "") : (v ?? "");

// POST /api/adapter-framework/register
// Register (install) an adapter from a manifest.
router.post("/api/adapter-framework/register", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const manifest = req.body as AdapterManifest;
  if (!manifest?.name || !manifest?.adapterType) {
    res.status(400).json({ error: "Manifest must include name and adapterType." });
    return;
  }

  try {
    const adapterId = await registerAdapter(manifest);
    res.json({ adapterId });
  } catch (err) {
    res.status(500).json({ error: "Adapter registration failed." });
  }
});

// GET /api/adapter-framework/adapters
// List all installed adapters.
router.get("/api/adapter-framework/adapters", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const rows = await db.select().from(executionAdapters).orderBy(executionAdapters.adapterType);
    res.json({ adapters: rows });
  } catch {
    res.status(500).json({ error: "Failed to list adapters." });
  }
});

// GET /api/adapter-framework/adapters/:adapterId
// Get a single adapter with its capabilities and latest health.
router.get("/api/adapter-framework/adapters/:adapterId", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const adapterId = p(req.params["adapterId"]);
  try {
    const rows = await db.select().from(executionAdapters).where(eq(executionAdapters.id, adapterId)).limit(1);
    if (!rows[0]) {
      res.status(404).json({ error: "Adapter not found." });
      return;
    }
    const caps = await db.select().from(adapterCapabilities).where(eq(adapterCapabilities.adapterId, adapterId));
    const health = await db.select().from(adapterHealth).where(eq(adapterHealth.adapterId, adapterId)).orderBy(desc(adapterHealth.createdAt)).limit(1);
    res.json({ adapter: rows[0], capabilities: caps, latestHealth: health[0] ?? null });
  } catch {
    res.status(500).json({ error: "Failed to fetch adapter." });
  }
});

// GET /api/adapter-framework/adapters/:adapterId/capabilities
// List capabilities for an adapter.
router.get("/api/adapter-framework/adapters/:adapterId/capabilities", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const adapterId = p(req.params["adapterId"]);
  try {
    const rows = await db.select().from(adapterCapabilities).where(eq(adapterCapabilities.adapterId, adapterId));
    res.json({ capabilities: rows });
  } catch {
    res.status(500).json({ error: "Failed to fetch capabilities." });
  }
});

// GET /api/adapter-framework/adapters/:adapterId/health
// Get health history for an adapter.
router.get("/api/adapter-framework/adapters/:adapterId/health", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const adapterId = p(req.params["adapterId"]);
  try {
    const rows = await db.select().from(adapterHealth).where(eq(adapterHealth.adapterId, adapterId)).orderBy(desc(adapterHealth.createdAt)).limit(20);
    res.json({ healthHistory: rows });
  } catch {
    res.status(500).json({ error: "Failed to fetch health history." });
  }
});

// POST /api/adapter-framework/adapters/:adapterId/enable
router.post("/api/adapter-framework/adapters/:adapterId/enable", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const adapterId = p(req.params["adapterId"]);
  try {
    const result = await applyLifecycleEvent(adapterId, "enable");
    if (!result.success) {
      res.status(409).json({ error: result.reason });
      return;
    }
    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed to enable adapter." });
  }
});

// POST /api/adapter-framework/adapters/:adapterId/disable
router.post("/api/adapter-framework/adapters/:adapterId/disable", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const adapterId = p(req.params["adapterId"]);
  try {
    const result = await applyLifecycleEvent(adapterId, "disable");
    if (!result.success) {
      res.status(409).json({ error: result.reason });
      return;
    }
    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed to disable adapter." });
  }
});

// GET /api/adapter-framework/registry
// Get the full adapter registry (one row per adapter type).
router.get("/api/adapter-framework/registry", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const rows = await db.select().from(adapterRegistry).orderBy(adapterRegistry.adapterType);
    const summary = await buildFrameworkSummary();
    res.json({ registry: rows, summary });
  } catch {
    res.status(500).json({ error: "Failed to fetch registry." });
  }
});

// POST /api/adapter-framework/resolve
// Resolve which adapter(s) satisfy an execution request.
router.post("/api/adapter-framework/resolve", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const { executionClass, actionType, resourceType, platform, preferredAdapterTypes } = req.body ?? {};
  if (!executionClass) {
    res.status(400).json({ error: "executionClass is required." });
    return;
  }

  try {
    const result = await resolveAdapter({ executionClass, actionType, resourceType, platform, preferredAdapterTypes });
    res.json({ resolution: result });
  } catch {
    res.status(500).json({ error: "Resolution failed." });
  }
});

export default router;
