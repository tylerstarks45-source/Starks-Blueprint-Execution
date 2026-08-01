import { Router } from "express";
import { requireAuthActive } from "../lib/auth";
import { db } from "@workspace/db";
import {
  technologyCatalog,
  technologyProviders,
  technologyBenchmarks,
  technologyCompatibility,
  technologyRecommendations,
  technologyRegistry,
  technologySnapshots,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { usersTable } from "@workspace/db/schema";
import { runCatalogRefresh } from "../lib/global-technology/gti-orchestrator";

export const globalTechnologyRouter = Router();

// ── Admin check ────────────────────────────────────────────────────────────
async function isAdmin(userId: number): Promise<boolean> {
  try {
    const rows = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId));
    const role = rows[0]?.role ?? "";
    return role === "admin" || role === "FOUNDER_ADMIN" || role === "SUPER_ADMIN";
  } catch {
    return false;
  }
}

// POST /api/global-technology/catalog/refresh ─────────────────────────────
// Trigger a full technology catalog refresh. Admin only.
globalTechnologyRouter.post("/catalog/refresh", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  // Fire-and-forget; acknowledge immediately
  runCatalogRefresh("admin_manual").catch(() => {});
  res.status(202).json({ status: "accepted", message: "Catalog refresh started in background." });
});

// GET /api/global-technology/catalog ──────────────────────────────────────
// Full technology catalog. Admin only.
globalTechnologyRouter.get("/catalog", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rows = await db.select().from(technologyCatalog).limit(200);
    res.json({ technologies: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch technology catalog" });
  }
});

// GET /api/global-technology/providers ────────────────────────────────────
// Technology provider registry. Admin only.
globalTechnologyRouter.get("/providers", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rows = await db.select().from(technologyProviders).limit(100);
    res.json({ providers: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch technology providers" });
  }
});

// GET /api/global-technology/categories ───────────────────────────────────
// Category summary counts from the registry. Admin only.
globalTechnologyRouter.get("/categories", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rows = await db.select({ category: technologyRegistry.category, name: technologyRegistry.name }).from(technologyRegistry).limit(200);
    const counts: Record<string, number> = {};
    for (const r of rows) {
      counts[r.category] = (counts[r.category] ?? 0) + 1;
    }
    const categories = Object.entries(counts).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
    res.json({ categories, total: categories.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// GET /api/global-technology/benchmarks ───────────────────────────────────
// Benchmark scores per technology. Admin only.
// Optional query: ?technologyKey=X
globalTechnologyRouter.get("/benchmarks", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const key = typeof req.query["technologyKey"] === "string" ? req.query["technologyKey"] : null;
    const rows = key
      ? await db.select().from(technologyBenchmarks).where(eq(technologyBenchmarks.technologyKey, key)).limit(20)
      : await db.select().from(technologyBenchmarks).orderBy(technologyBenchmarks.scannedAt).limit(100);
    res.json({ benchmarks: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch benchmarks" });
  }
});

// GET /api/global-technology/compatibility ────────────────────────────────
// Compatibility assessments. Admin only.
// Optional query: ?technologyKey=X
globalTechnologyRouter.get("/compatibility", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const key = typeof req.query["technologyKey"] === "string" ? req.query["technologyKey"] : null;
    const rows = key
      ? await db.select().from(technologyCompatibility).where(eq(technologyCompatibility.technologyKey, key)).limit(20)
      : await db.select().from(technologyCompatibility).orderBy(technologyCompatibility.assessedAt).limit(100);
    res.json({ compatibility: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch compatibility data" });
  }
});

// GET /api/global-technology/recommendations ──────────────────────────────
// Open administrator technology recommendations. Admin only.
globalTechnologyRouter.get("/recommendations", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const includeApplied = req.query["includeApplied"] === "true";
    const rows = includeApplied
      ? await db.select().from(technologyRecommendations).limit(100)
      : await db.select().from(technologyRecommendations).where(eq(technologyRecommendations.isApplied, false)).limit(50);
    res.json({ recommendations: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch technology recommendations" });
  }
});

// GET /api/global-technology/registry ─────────────────────────────────────
// Current-state technology registry. Admin only.
// Optional query: ?category=X
globalTechnologyRouter.get("/registry", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const category = typeof req.query["category"] === "string" ? req.query["category"] : null;
    const rows = category
      ? await db.select().from(technologyRegistry).where(eq(technologyRegistry.category, category)).limit(100)
      : await db.select().from(technologyRegistry).orderBy(technologyRegistry.lastScannedAt).limit(200);
    res.json({ registry: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch technology registry" });
  }
});

// GET /api/global-technology/snapshots ────────────────────────────────────
// Historical catalog snapshots. Admin only.
// Optional query: ?limit=N (default 10, max 50)
globalTechnologyRouter.get("/snapshots", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rawLimit = parseInt(String(req.query["limit"] ?? "10"), 10);
    const limit = isNaN(rawLimit) ? 10 : Math.min(rawLimit, 50);
    const rows = await db.select().from(technologySnapshots).orderBy(technologySnapshots.capturedAt).limit(limit);
    res.json({ snapshots: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch technology snapshots" });
  }
});
