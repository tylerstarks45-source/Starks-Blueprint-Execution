import { Router } from "express";
import { requireAuthActive } from "../lib/auth";
import {
  evaluateCapability,
  getRegistry,
  getRegistryEntry,
  getSnapshots,
  getForecasts,
  getAllOptimizations,
  getHealthHistory,
  getLatestAvailability,
  getLatestReliability,
  buildIntelligenceSummary,
} from "../lib/capability-intelligence";
import { db } from "@workspace/db";
import { usersTable as users } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export const capabilityIntelligenceRouter = Router();

// ── Admin check helper ───────────────────────────────────────
async function isAdmin(userId: number): Promise<boolean> {
  try {
    const rows = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
    const role = rows[0]?.role ?? "";
    return role === "admin" || role === "FOUNDER_ADMIN" || role === "SUPER_ADMIN";
  } catch {
    return false;
  }
}

// ── POST /evaluate ───────────────────────────────────────────
// Evaluate a specific capability key
capabilityIntelligenceRouter.post("/evaluate", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const { capabilityKey, adapterType, adapterIds = [] } = req.body as {
    capabilityKey: string;
    adapterType: string;
    adapterIds?: string[];
  };

  if (!capabilityKey || !adapterType) {
    res.status(400).json({ error: "capabilityKey and adapterType are required" });
    return;
  }

  try {
    const result = await evaluateCapability({ capabilityKey, adapterType, adapterIds, triggeredBy: "manual" });
    res.json({ ok: true, evaluation: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "evaluation failed";
    res.status(500).json({ error: message });
  }
});

// ── GET /registry ────────────────────────────────────────────
capabilityIntelligenceRouter.get("/registry", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const registry = await getRegistry();
    const summary = await buildIntelligenceSummary();
    res.json({ ok: true, registry, summary });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "registry fetch failed";
    res.status(500).json({ error: message });
  }
});

// ── GET /health ──────────────────────────────────────────────
capabilityIntelligenceRouter.get("/health", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const capabilityKey = req.query["capabilityKey"] as string | undefined;

  try {
    if (capabilityKey) {
      const history = await getHealthHistory(capabilityKey, 20);
      res.json({ ok: true, capabilityKey, history });
    } else {
      const registry = await getRegistry();
      const healthSummary = registry.map(r => ({
        capabilityKey: r.capabilityKey,
        adapterType: r.adapterType,
        health: r.currentHealth,
        readiness: r.currentReadiness,
        confidence: r.overallConfidence,
        lastHealthAt: r.lastHealthAt,
      }));
      res.json({ ok: true, capabilities: healthSummary });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "health fetch failed";
    res.status(500).json({ error: message });
  }
});

// ── GET /availability ────────────────────────────────────────
capabilityIntelligenceRouter.get("/availability", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const capabilityKey = req.query["capabilityKey"] as string | undefined;

  try {
    if (capabilityKey) {
      const availability = await getLatestAvailability(capabilityKey);
      res.json({ ok: true, capabilityKey, availability });
    } else {
      const registry = await getRegistry();
      const summary = registry.map(r => ({
        capabilityKey: r.capabilityKey,
        adapterType: r.adapterType,
        health: r.currentHealth,
        lastEvaluatedAt: r.lastEvaluatedAt,
      }));
      res.json({ ok: true, capabilities: summary });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "availability fetch failed";
    res.status(500).json({ error: message });
  }
});

// ── GET /reliability ─────────────────────────────────────────
capabilityIntelligenceRouter.get("/reliability", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const capabilityKey = req.query["capabilityKey"] as string | undefined;

  try {
    if (capabilityKey) {
      const reliability = await getLatestReliability(capabilityKey);
      res.json({ ok: true, capabilityKey, reliability });
    } else {
      const registry = await getRegistry();
      const summary = registry.map(r => ({
        capabilityKey: r.capabilityKey,
        adapterType: r.adapterType,
        successRate: r.successRate,
        avgLatencyMs: r.avgLatencyMs,
        overallConfidence: r.overallConfidence,
      }));
      res.json({ ok: true, capabilities: summary });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "reliability fetch failed";
    res.status(500).json({ error: message });
  }
});

// ── GET /forecast ────────────────────────────────────────────
// Standard users: non-admin forecasts only.
// Admins: all forecasts including admin-only.
capabilityIntelligenceRouter.get("/forecast", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const capabilityKey = req.query["capabilityKey"] as string | undefined;
  const admin = await isAdmin(userId);

  try {
    if (capabilityKey) {
      const forecasts = await getForecasts(capabilityKey, admin);
      res.json({ ok: true, capabilityKey, forecasts });
    } else {
      // All capabilities — aggregate non-admin (or all) forecasts
      const registry = await getRegistry();
      const allForecasts = await Promise.all(
        registry.map(r => getForecasts(r.capabilityKey, admin)),
      );
      const flat = allForecasts.flat();
      res.json({ ok: true, forecasts: flat });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "forecast fetch failed";
    res.status(500).json({ error: message });
  }
});

// ── GET /optimizations ───────────────────────────────────────
// Standard users: non-admin optimizations only.
// Admins: all optimizations including infrastructure recommendations.
capabilityIntelligenceRouter.get("/optimizations", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const admin = await isAdmin(userId);

  try {
    const optimizations = await getAllOptimizations(admin);
    res.json({ ok: true, optimizations, isAdmin: admin });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "optimizations fetch failed";
    res.status(500).json({ error: message });
  }
});

// ── GET /snapshots ───────────────────────────────────────────
capabilityIntelligenceRouter.get("/snapshots", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const limit = Math.min(Number(req.query["limit"] ?? 10), 50);

  try {
    const snapshots = await getSnapshots(limit);
    res.json({ ok: true, snapshots });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "snapshots fetch failed";
    res.status(500).json({ error: message });
  }
});
