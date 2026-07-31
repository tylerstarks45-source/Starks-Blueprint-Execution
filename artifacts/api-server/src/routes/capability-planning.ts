// ─────────────────────────────────────────────────────────────────────────────
// Build 022: Capability Planning Engine — REST Routes
// Mount: /api/capability-planning
// Prerequisite chain: business → analyse → discover → simulate → decide →
//   strategise → plan → assess-capabilities
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuthActive } from "../lib/auth";
import { db } from "@workspace/db";
import { planningRegistry } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { runCapabilityPlanning } from "../lib/capability-planning/capability-orchestrator";
import {
  listCapabilityReports,
  getCapabilityPlan,
  getCapabilityDomains,
  getCapabilityRequirements,
  getCapabilityGaps,
  getCapabilityDependencies,
  getCapabilityReadinessForDomain,
  getCapabilityRegistryEntry,
  getLatestCapabilitySummary,
} from "../lib/capability-planning/capability-registry";

const router = Router();

// Coerce Express param (string | string[]) → string
const p = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? "") : (v ?? "");

// ── POST /assess/:businessId ──────────────────────────────────────────────────
// Full capability assessment. Requires an active strategic plan.
router.post("/assess/:businessId", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const businessId = parseInt(p(req.params.businessId), 10);
  if (isNaN(businessId)) {
    res.status(400).json({ error: "Invalid businessId" });
    return;
  }

  const regRows = await db
    .select({ id: planningRegistry.id, latestPlanId: planningRegistry.latestPlanId })
    .from(planningRegistry)
    .where(eq(planningRegistry.businessId, businessId))
    .limit(1);

  if (!regRows[0]?.latestPlanId) {
    res.status(422).json({
      error: "No strategic plan found for this business. Run POST /api/strategic-planning/plan/:businessId first.",
    });
    return;
  }

  const summary = await runCapabilityPlanning({ userId, businessId });
  if (!summary) {
    res.status(500).json({ error: "Capability planning run did not produce a result. Check server logs." });
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

  const reports = await listCapabilityReports(businessId);
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

  const reports = await listCapabilityReports(businessId);
  const latest = reports[0];
  if (!latest) {
    res.status(404).json({ error: "No capability reports found for this business." });
    return;
  }

  const plan = latest.primaryPlanId ? await getCapabilityPlan(latest.primaryPlanId) : null;
  res.json({ report: latest, plan });
});

// ── GET /domains/:businessId ──────────────────────────────────────────────────
router.get("/domains/:businessId", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const businessId = parseInt(p(req.params.businessId), 10);
  if (isNaN(businessId)) {
    res.status(400).json({ error: "Invalid businessId" });
    return;
  }

  const reports = await listCapabilityReports(businessId);
  const latest = reports[0];
  if (!latest?.primaryPlanId) {
    res.status(404).json({ error: "No capability reports found." });
    return;
  }

  const domains = await getCapabilityDomains(latest.primaryPlanId);
  res.json({ domains });
});

// ── GET /domains/:businessId/:domainId/requirements ───────────────────────────
router.get("/domains/:businessId/:domainId/requirements", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const domainId = p(req.params.domainId);
  const requirements = await getCapabilityRequirements(domainId);
  res.json({ requirements });
});

// ── GET /domains/:businessId/:domainId/readiness ──────────────────────────────
router.get("/domains/:businessId/:domainId/readiness", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const domainId = p(req.params.domainId);
  const readiness = await getCapabilityReadinessForDomain(domainId);
  if (!readiness) {
    res.status(404).json({ error: "No readiness data found for this domain." });
    return;
  }

  res.json({ readiness });
});

// ── GET /gaps/:businessId ─────────────────────────────────────────────────────
router.get("/gaps/:businessId", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const businessId = parseInt(p(req.params.businessId), 10);
  if (isNaN(businessId)) {
    res.status(400).json({ error: "Invalid businessId" });
    return;
  }

  const reports = await listCapabilityReports(businessId);
  const latest = reports[0];
  if (!latest?.primaryPlanId) {
    res.status(404).json({ error: "No capability reports found." });
    return;
  }

  const gaps = await getCapabilityGaps(latest.primaryPlanId);
  res.json({ gaps });
});

// ── GET /dependencies/:businessId ────────────────────────────────────────────
router.get("/dependencies/:businessId", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const businessId = parseInt(p(req.params.businessId), 10);
  if (isNaN(businessId)) {
    res.status(400).json({ error: "Invalid businessId" });
    return;
  }

  const reports = await listCapabilityReports(businessId);
  const latest = reports[0];
  if (!latest?.primaryPlanId) {
    res.status(404).json({ error: "No capability reports found." });
    return;
  }

  const dependencies = await getCapabilityDependencies(latest.primaryPlanId);
  res.json({ dependencies });
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

  const registry = await getCapabilityRegistryEntry(businessId);
  if (!registry) {
    res.status(404).json({ error: "No capability registry entry found for this business." });
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

  const summary = await getLatestCapabilitySummary(targetUserId);
  if (!summary) {
    res.status(404).json({ error: "No capability summary found for this user." });
    return;
  }

  res.json({ summary });
});

export default router;
