import { Router } from "express";
import { requireAuthActive } from "../lib/auth";
import {
  runInfrastructureScan,
  getAllHealthSummary,
  getCapacitySummary,
  getForecasts,
  getRecommendations,
  getAlerts,
  getPerformanceHistory,
  getInfraSnapshots,
} from "../lib/platform-infrastructure";
import { db } from "@workspace/db";
import { usersTable as users } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export const platformInfrastructureRouter = Router();

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

// ── POST /scan ───────────────────────────────────────────────
// Trigger a full infrastructure scan. Admin-only.
platformInfrastructureRouter.post("/scan", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const admin = await isAdmin(userId);
  if (!admin) {
    res.status(403).json({ error: "Administrator access required" });
    return;
  }

  try {
    const result = await runInfrastructureScan("manual");
    res.json({
      ok: true,
      platformReadiness: result.platformReadiness,
      overallPressure: result.overallPressure,
      totalResources: result.resources.length,
      alerts: result.alerts.length,
      forecasts: result.forecasts.length,
      recommendations: result.recommendations.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "scan failed";
    res.status(500).json({ error: message });
  }
});

// ── GET /registry ────────────────────────────────────────────
// Admin-only: full infrastructure registry.
platformInfrastructureRouter.get("/registry", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const admin = await isAdmin(userId);
  if (!admin) {
    res.status(403).json({ error: "Administrator access required" });
    return;
  }

  try {
    const registry = await getAllHealthSummary();
    res.json({ ok: true, registry, total: registry.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "registry fetch failed";
    res.status(500).json({ error: message });
  }
});

// ── GET /health ──────────────────────────────────────────────
// Admin-only: resource health summary.
platformInfrastructureRouter.get("/health", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const admin = await isAdmin(userId);
  if (!admin) {
    res.status(403).json({ error: "Administrator access required" });
    return;
  }

  try {
    const registry = await getAllHealthSummary();
    const healthSummary = registry.map(r => ({
      resourceKey: r.resourceKey,
      resourceType: r.resourceType,
      resourceName: r.resourceName,
      health: r.currentHealth,
      utilizationPercent: r.currentUtilizationPercent,
      pressureLevel: r.pressureLevel,
      lastScannedAt: r.lastScannedAt,
    }));
    res.json({ ok: true, resources: healthSummary });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "health fetch failed";
    res.status(500).json({ error: message });
  }
});

// ── GET /capacity ────────────────────────────────────────────
// Admin-only: resource capacity data.
platformInfrastructureRouter.get("/capacity", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const admin = await isAdmin(userId);
  if (!admin) {
    res.status(403).json({ error: "Administrator access required" });
    return;
  }

  try {
    const capacity = await getCapacitySummary();
    res.json({ ok: true, capacity });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "capacity fetch failed";
    res.status(500).json({ error: message });
  }
});

// ── GET /performance ─────────────────────────────────────────
// Admin-only: platform performance history.
platformInfrastructureRouter.get("/performance", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const admin = await isAdmin(userId);
  if (!admin) {
    res.status(403).json({ error: "Administrator access required" });
    return;
  }

  const limit = Math.min(Number(req.query["limit"] ?? 20), 100);

  try {
    const performance = await getPerformanceHistory(limit);
    res.json({ ok: true, performance });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "performance fetch failed";
    res.status(500).json({ error: message });
  }
});

// ── GET /forecasts ───────────────────────────────────────────
// Admin-only: infrastructure forecasts.
platformInfrastructureRouter.get("/forecasts", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const admin = await isAdmin(userId);
  if (!admin) {
    res.status(403).json({ error: "Administrator access required" });
    return;
  }

  const resourceKey = req.query["resourceKey"] as string | undefined;

  try {
    const forecasts = await getForecasts(resourceKey);
    res.json({ ok: true, forecasts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "forecasts fetch failed";
    res.status(500).json({ error: message });
  }
});

// ── GET /recommendations ─────────────────────────────────────
// Admin-only: infrastructure recommendations with full evidence.
platformInfrastructureRouter.get("/recommendations", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const admin = await isAdmin(userId);
  if (!admin) {
    res.status(403).json({ error: "Administrator access required" });
    return;
  }

  try {
    const recommendations = await getRecommendations();
    res.json({ ok: true, recommendations });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "recommendations fetch failed";
    res.status(500).json({ error: message });
  }
});

// ── GET /snapshots ───────────────────────────────────────────
// Admin-only: infrastructure snapshots.
platformInfrastructureRouter.get("/snapshots", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const admin = await isAdmin(userId);
  if (!admin) {
    res.status(403).json({ error: "Administrator access required" });
    return;
  }

  const limit = Math.min(Number(req.query["limit"] ?? 10), 50);

  try {
    const snapshots = await getInfraSnapshots(limit);
    res.json({ ok: true, snapshots });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "snapshots fetch failed";
    res.status(500).json({ error: message });
  }
});

// ── GET /alerts ──────────────────────────────────────────────
// Admin-only: active infrastructure alerts.
platformInfrastructureRouter.get("/alerts", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const admin = await isAdmin(userId);
  if (!admin) {
    res.status(403).json({ error: "Administrator access required" });
    return;
  }

  const includeAcknowledged = req.query["includeAcknowledged"] === "true";

  try {
    const alerts = await getAlerts(includeAcknowledged);
    res.json({ ok: true, alerts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "alerts fetch failed";
    res.status(500).json({ error: message });
  }
});
