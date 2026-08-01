import { Router } from "express";
import { requireAuthActive } from "../lib/auth";
import { db } from "@workspace/db";
import {
  executivePortfolios,
  portfolioInitiatives,
  portfolioAllocations,
  portfolioExposures,
  portfolioCapacity,
  portfolioRecommendations,
  portfolioRegistry,
  portfolioSnapshots,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { usersTable } from "@workspace/db/schema";
import { evaluatePortfolio, runPortfolioPlatformRebuild } from "../lib/portfolio-intelligence/epi-orchestrator";
import type { PortfolioEvaluationRequest } from "../lib/portfolio-intelligence/types";

export const portfolioIntelligenceRouter = Router();

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

// POST /api/portfolio/evaluate ─────────────────────────────────────────────
// Evaluate a complete portfolio. Auth required (any user).
portfolioIntelligenceRouter.post("/evaluate", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const { portfolioKey, title, description, domain, initiatives, totalResources } =
    req.body as Partial<PortfolioEvaluationRequest>;

  if (!portfolioKey || !title || !description || !domain || !initiatives || !totalResources) {
    res.status(400).json({
      error: "Missing required fields: portfolioKey, title, description, domain, initiatives, totalResources",
    });
    return;
  }

  if (!Array.isArray(initiatives) || initiatives.length < 2) {
    res.status(400).json({ error: "Must provide at least 2 initiatives to evaluate a portfolio" });
    return;
  }

  try {
    const result = await evaluatePortfolio({
      portfolioKey,
      title,
      description,
      domain,
      initiatives,
      totalResources,
      constraints: Array.isArray(req.body.constraints) ? req.body.constraints : [],
      userId,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Portfolio evaluation failed" });
  }
});

// POST /api/portfolio/rebalance ────────────────────────────────────────────
// Evaluate portfolio focused on rebalancing recommendations. Auth required.
portfolioIntelligenceRouter.post("/rebalance", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const { portfolioKey, title, description, domain, initiatives, totalResources } =
    req.body as Partial<PortfolioEvaluationRequest>;

  if (!portfolioKey || !title || !description || !domain || !initiatives || !totalResources) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  if (!Array.isArray(initiatives) || initiatives.length < 2) {
    res.status(400).json({ error: "Must provide at least 2 initiatives" });
    return;
  }

  try {
    const result = await evaluatePortfolio({
      portfolioKey: `rebalance-${portfolioKey}`,
      title: `[Rebalance] ${title}`,
      description,
      domain,
      initiatives,
      totalResources,
      userId,
    });

    // Return rebalance-focused response
    const rebalanceRecs = result.recommendations.filter(r => r.type === "rebalance" || r.type === "delay" || r.type === "retire");
    res.json({
      portfolioKey,
      health:          result.health,
      balanceScore:    result.balance.overallBalance,
      balanceWarnings: result.balance.balanceWarnings,
      capacityScore:   result.capacity.capacityScore,
      overcommitted:   result.capacity.overcommittedResources.length > 0,
      overcommittedResources: result.capacity.overcommittedResources,
      criticalExposures: result.exposures.filter(e => e.severity === "critical"),
      rebalanceRecommendations: rebalanceRecs,
      allRecommendations: result.recommendations,
      bucketRatios:    result.balance.bucketRatios,
      horizonRatios:   result.balance.horizonRatios,
    });
  } catch (err) {
    res.status(500).json({ error: "Portfolio rebalance analysis failed" });
  }
});

// GET /api/portfolio ───────────────────────────────────────────────────────
// List portfolio evaluations. Admin only. Optional ?domain=X
portfolioIntelligenceRouter.get("/", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rawDomain = req.query["domain"];
    const domain = typeof rawDomain === "string" ? rawDomain : null;

    const rows = domain
      ? await db.select().from(executivePortfolios).where(eq(executivePortfolios.portfolioDomain, domain)).orderBy(desc(executivePortfolios.capturedAt)).limit(50)
      : await db.select().from(executivePortfolios).orderBy(desc(executivePortfolios.capturedAt)).limit(50);

    res.json({ portfolios: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch portfolios" });
  }
});

// GET /api/portfolio/initiatives ───────────────────────────────────────────
// List portfolio initiatives. Admin only. Optional ?portfolioId=N
portfolioIntelligenceRouter.get("/initiatives", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rawId = req.query["portfolioId"];
    const pid = typeof rawId === "string" ? parseInt(rawId, 10) : null;

    const rows = (pid && !isNaN(pid))
      ? await db.select().from(portfolioInitiatives).where(eq(portfolioInitiatives.portfolioId, pid)).orderBy(desc(portfolioInitiatives.capturedAt)).limit(50)
      : await db.select().from(portfolioInitiatives).orderBy(desc(portfolioInitiatives.capturedAt)).limit(100);

    res.json({ initiatives: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch portfolio initiatives" });
  }
});

// GET /api/portfolio/allocations ───────────────────────────────────────────
// List resource allocations. Admin only. Optional ?portfolioId=N
portfolioIntelligenceRouter.get("/allocations", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rawId = req.query["portfolioId"];
    const pid = typeof rawId === "string" ? parseInt(rawId, 10) : null;

    const rows = (pid && !isNaN(pid))
      ? await db.select().from(portfolioAllocations).where(eq(portfolioAllocations.portfolioId, pid)).orderBy(portfolioAllocations.resourceType).limit(12)
      : await db.select().from(portfolioAllocations).orderBy(desc(portfolioAllocations.capturedAt)).limit(60);

    res.json({ allocations: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch portfolio allocations" });
  }
});

// GET /api/portfolio/exposure ──────────────────────────────────────────────
// List portfolio exposures. Admin only. Optional ?portfolioId=N
portfolioIntelligenceRouter.get("/exposure", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rawId = req.query["portfolioId"];
    const pid = typeof rawId === "string" ? parseInt(rawId, 10) : null;

    const rows = (pid && !isNaN(pid))
      ? await db.select().from(portfolioExposures).where(eq(portfolioExposures.portfolioId, pid)).orderBy(desc(portfolioExposures.exposureScore)).limit(20)
      : await db.select().from(portfolioExposures).orderBy(desc(portfolioExposures.capturedAt)).limit(60);

    res.json({ exposures: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch portfolio exposures" });
  }
});

// GET /api/portfolio/capacity ──────────────────────────────────────────────
// List portfolio capacity records. Admin only. Optional ?portfolioId=N
portfolioIntelligenceRouter.get("/capacity", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rawId = req.query["portfolioId"];
    const pid = typeof rawId === "string" ? parseInt(rawId, 10) : null;

    const rows = (pid && !isNaN(pid))
      ? await db.select().from(portfolioCapacity).where(eq(portfolioCapacity.portfolioId, pid)).orderBy(desc(portfolioCapacity.capturedAt)).limit(10)
      : await db.select().from(portfolioCapacity).orderBy(desc(portfolioCapacity.capturedAt)).limit(20);

    res.json({ capacity: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch portfolio capacity" });
  }
});

// GET /api/portfolio/recommendations ──────────────────────────────────────
// List portfolio recommendations. Admin only. Optional ?portfolioId=N&type=X
portfolioIntelligenceRouter.get("/recommendations", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rawId = req.query["portfolioId"];
    const pid = typeof rawId === "string" ? parseInt(rawId, 10) : null;

    const rows = (pid && !isNaN(pid))
      ? await db.select().from(portfolioRecommendations).where(eq(portfolioRecommendations.portfolioId, pid)).orderBy(desc(portfolioRecommendations.capturedAt)).limit(20)
      : await db.select().from(portfolioRecommendations).orderBy(desc(portfolioRecommendations.capturedAt)).limit(100);

    res.json({ recommendations: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch portfolio recommendations" });
  }
});

// GET /api/portfolio/registry ──────────────────────────────────────────────
// Portfolio registry (one authoritative row per portfolio key). Admin only.
portfolioIntelligenceRouter.get("/registry", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rows = await db.select().from(portfolioRegistry).orderBy(desc(portfolioRegistry.lastEvaluatedAt)).limit(50);
    res.json({ registry: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch portfolio registry" });
  }
});

// GET /api/portfolio/snapshots ─────────────────────────────────────────────
// Platform-level aggregate history. Admin only. Optional ?limit=N
portfolioIntelligenceRouter.get("/snapshots", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Administrator access required" }); return; }

  try {
    const rawLimit = parseInt(String(req.query["limit"] ?? "10"), 10);
    const limit = isNaN(rawLimit) ? 10 : Math.min(rawLimit, 50);
    const rows = await db.select().from(portfolioSnapshots).orderBy(desc(portfolioSnapshots.capturedAt)).limit(limit);
    res.json({ snapshots: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch portfolio snapshots" });
  }
});
