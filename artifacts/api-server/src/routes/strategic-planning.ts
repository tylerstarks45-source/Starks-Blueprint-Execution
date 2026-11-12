// ─────────────────────────────────────────────────────────────────────────────
// Build 021: Strategic Planning Engine — REST Routes
// Mount: /api/strategic-planning
// Prerequisite chain: business → analyse → discover → simulate → decide →
//   strategise → plan
// ─────────────────────────────────────────────────────────────────────────────
import { strategicPrograms, strategicInitiatives } from "@workspace/db";
import { requireBusinessOwner, businessIdParam, businessIdOfRecord, requireSelfParam } from "../lib/route-ownership";
import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuthActive } from "../lib/auth";

// Coerce Express param (string | string[]) → string
const p = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
import { db } from "@workspace/db";
import {
  strategyRegistryTable,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { runStrategicPlanning } from "../lib/strategic-planning/planning-orchestrator";
import {
  listPlanningReports,
  getStrategicPlan,
  getPrograms,
  getInitiatives,
  getMilestones,
  getDependencies,
  getSequences,
  getRegistry,
  getLatestPlanningSummary,
} from "../lib/strategic-planning/planning-registry";

const router = Router();

// Tenant isolation: every business-scoped route is limited to the caller's own businesses.
router.param("businessId", (req, res, next) => requireBusinessOwner(businessIdParam("businessId"))(req, res, next));
router.use("/programs/:businessId/:programId", requireBusinessOwner(businessIdOfRecord(strategicPrograms, "programId")));
router.use("/initiatives/:businessId/:initiativeId", requireBusinessOwner(businessIdOfRecord(strategicInitiatives, "initiativeId")));
router.use("/summary/:userId", requireSelfParam("userId"));

// ── Helpers ───────────────────────────────────────────────────────────────────
// ── POST /plan/:businessId ─────────────────────────────────────────────────────
// Full strategic planning run. Requires an active executive strategy.
router.post("/plan/:businessId", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const businessId = parseInt(p(req.params.businessId), 10);
  if (isNaN(businessId)) {
    res.status(400).json({ error: "Invalid businessId" });
    return;
  }

  // Verify a strategy exists
  const stratRows = await db
    .select({ id: strategyRegistryTable.id, latestStrategyId: strategyRegistryTable.latestStrategyId })
    .from(strategyRegistryTable)
    .where(eq(strategyRegistryTable.businessId, businessId))
    .limit(1);

  if (!stratRows[0]?.latestStrategyId) {
    res.status(422).json({
      error: "No executive strategy found for this business. Run POST /api/executive-strategy/strategise/:businessId first.",
    });
    return;
  }

  const summary = await runStrategicPlanning({ userId, businessId });
  if (!summary) {
    res.status(500).json({ error: "Strategic planning run did not produce a result. Check server logs." });
    return;
  }

  res.status(201).json({ success: true, summary });
});

// ── GET /reports/:businessId ──────────────────────────────────────────────────
router.get("/reports/:businessId", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const businessId = parseInt(p(req.params.businessId), 10);
  if (isNaN(businessId)) {
    res.status(400).json({ error: "Invalid businessId" });
    return;
  }

  const reports = await listPlanningReports(businessId);
  res.json({ reports });
});

// ── GET /reports/:businessId/latest ──────────────────────────────────────────
router.get("/reports/:businessId/latest", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const businessId = parseInt(p(req.params.businessId), 10);
  if (isNaN(businessId)) {
    res.status(400).json({ error: "Invalid businessId" });
    return;
  }

  const reports = await listPlanningReports(businessId);
  const latest = reports[0];
  if (!latest) {
    res.status(404).json({ error: "No planning reports found for this business." });
    return;
  }

  const plan = latest.primaryPlanId ? await getStrategicPlan(latest.primaryPlanId) : null;
  res.json({ report: latest, plan });
});

// ── GET /programs/:businessId ─────────────────────────────────────────────────
router.get("/programs/:businessId", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const businessId = parseInt(p(req.params.businessId), 10);
  if (isNaN(businessId)) {
    res.status(400).json({ error: "Invalid businessId" });
    return;
  }

  const reports = await listPlanningReports(businessId);
  const latest = reports[0];
  if (!latest?.primaryPlanId) {
    res.status(404).json({ error: "No planning reports found." });
    return;
  }

  const programs = await getPrograms(latest.primaryPlanId);
  res.json({ programs });
});

// ── GET /programs/:businessId/:programId/initiatives ─────────────────────────
router.get("/programs/:businessId/:programId/initiatives", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const programId = p(req.params.programId);
  const initiatives = await getInitiatives(programId);
  res.json({ initiatives });
});

// ── GET /initiatives/:businessId/:initiativeId/milestones ─────────────────────
router.get("/initiatives/:businessId/:initiativeId/milestones", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const initiativeId = p(req.params.initiativeId);
  const milestones = await getMilestones(initiativeId);
  res.json({ milestones });
});

// ── GET /dependencies/:businessId ─────────────────────────────────────────────
router.get("/dependencies/:businessId", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const businessId = parseInt(p(req.params.businessId), 10);
  if (isNaN(businessId)) {
    res.status(400).json({ error: "Invalid businessId" });
    return;
  }

  const reports = await listPlanningReports(businessId);
  const latest = reports[0];
  if (!latest?.primaryPlanId) {
    res.status(404).json({ error: "No planning reports found." });
    return;
  }

  const dependencies = await getDependencies(latest.primaryPlanId);
  res.json({ dependencies });
});

// ── GET /sequences/:businessId ────────────────────────────────────────────────
router.get("/sequences/:businessId", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const businessId = parseInt(p(req.params.businessId), 10);
  if (isNaN(businessId)) {
    res.status(400).json({ error: "Invalid businessId" });
    return;
  }

  const reports = await listPlanningReports(businessId);
  const latest = reports[0];
  if (!latest?.primaryPlanId) {
    res.status(404).json({ error: "No planning reports found." });
    return;
  }

  const sequences = await getSequences(latest.primaryPlanId);
  res.json({ sequences });
});

// ── GET /registry/:businessId ─────────────────────────────────────────────────
router.get("/registry/:businessId", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const businessId = parseInt(p(req.params.businessId), 10);
  if (isNaN(businessId)) {
    res.status(400).json({ error: "Invalid businessId" });
    return;
  }

  const registry = await getRegistry(businessId);
  if (!registry) {
    res.status(404).json({ error: "No planning registry entry found for this business." });
    return;
  }

  res.json({ registry });
});

// ── GET /summary/:userId ──────────────────────────────────────────────────────
router.get("/summary/:userId", async (req: Request, res: Response) => {
  const authUserId = await requireAuthActive(req, res);
  if (authUserId === null) return;

  const targetUserId = parseInt(p(req.params.userId), 10);
  if (isNaN(targetUserId)) {
    res.status(400).json({ error: "Invalid userId" });
    return;
  }

  const summary = await getLatestPlanningSummary(targetUserId);
  if (!summary) {
    res.status(404).json({ error: "No planning summary found for this user." });
    return;
  }

  res.json({ summary });
});

export default router;
