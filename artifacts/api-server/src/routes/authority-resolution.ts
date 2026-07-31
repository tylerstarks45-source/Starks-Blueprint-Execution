// ─────────────────────────────────────────────────────────────────────────────
// Build 025: Authority Resolution Engine — REST Routes
// 10 endpoints under /api/authority-resolution
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from "express";
import { db } from "@workspace/db";
import {
  authorityReports,
  authorityPlans,
  authorityRequirements,
  authorityGrants,
  authorityScopes,
  authorityDecisions,
  authorityRegistry,
  authoritySnapshots,
} from "@workspace/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { requireAuthActive } from "../lib/auth";
import { runAuthorityResolution } from "../lib/authority-resolution/authority-orchestrator";

const router = Router();
const p = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? "") : (v ?? "");

// ── POST /api/authority-resolution/resolve/:businessId ───────────────────────
// Trigger a full authority resolution run for the given business.
router.post("/api/authority-resolution/resolve/:businessId", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const businessId = parseInt(p(req.params["businessId"]), 10);
  if (isNaN(businessId)) {
    res.status(400).json({ error: "Invalid businessId" });
    return;
  }

  try {
    const summary = await runAuthorityResolution({ userId, businessId });
    if (!summary) {
      res.status(422).json({ error: "No execution orchestration plan found for this business. Run /orchestrate first." });
      return;
    }
    res.json({ summary });
  } catch (err) {
    res.status(500).json({ error: "Authority resolution run failed" });
  }
});

// ── GET /api/authority-resolution/businesses/:businessId/reports ──────────────
// List authority reports for a business (20 most recent).
router.get("/api/authority-resolution/businesses/:businessId/reports", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const businessId = parseInt(p(req.params["businessId"]), 10);
  if (isNaN(businessId)) {
    res.status(400).json({ error: "Invalid businessId" });
    return;
  }

  try {
    const rows = await db
      .select()
      .from(authorityReports)
      .where(eq(authorityReports.businessId, businessId))
      .orderBy(desc(authorityReports.createdAt))
      .limit(20);
    res.json({ reports: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch authority reports" });
  }
});

// ── GET /api/authority-resolution/reports/:reportId ──────────────────────────
// Single authority report.
router.get("/api/authority-resolution/reports/:reportId", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const rows = await db
      .select()
      .from(authorityReports)
      .where(eq(authorityReports.id, p(req.params["reportId"])))
      .limit(1);
    if (!rows[0]) {
      res.status(404).json({ error: "Report not found" });
      return;
    }
    res.json({ report: rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch report" });
  }
});

// ── GET /api/authority-resolution/plans/:planId ───────────────────────────────
// Single authority plan.
router.get("/api/authority-resolution/plans/:planId", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const rows = await db
      .select()
      .from(authorityPlans)
      .where(eq(authorityPlans.id, p(req.params["planId"])))
      .limit(1);
    if (!rows[0]) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }
    res.json({ plan: rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch plan" });
  }
});

// ── GET /api/authority-resolution/plans/:planId/requirements ─────────────────
// Authority requirements for a plan.
router.get("/api/authority-resolution/plans/:planId/requirements", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const rows = await db
      .select()
      .from(authorityRequirements)
      .where(eq(authorityRequirements.planId, p(req.params["planId"])))
      .orderBy(asc(authorityRequirements.authorityType));
    res.json({ requirements: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch requirements" });
  }
});

// ── GET /api/authority-resolution/plans/:planId/grants ───────────────────────
// Authority grants for a plan.
router.get("/api/authority-resolution/plans/:planId/grants", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const rows = await db
      .select()
      .from(authorityGrants)
      .where(eq(authorityGrants.planId, p(req.params["planId"])))
      .orderBy(asc(authorityGrants.grantStatus));
    res.json({ grants: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch grants" });
  }
});

// ── GET /api/authority-resolution/plans/:planId/scopes ───────────────────────
// Authority scopes for a plan.
router.get("/api/authority-resolution/plans/:planId/scopes", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const rows = await db
      .select()
      .from(authorityScopes)
      .where(eq(authorityScopes.planId, p(req.params["planId"])));
    res.json({ scopes: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch scopes" });
  }
});

// ── GET /api/authority-resolution/plans/:planId/decisions ────────────────────
// Authority decisions for a plan.
router.get("/api/authority-resolution/plans/:planId/decisions", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const rows = await db
      .select()
      .from(authorityDecisions)
      .where(eq(authorityDecisions.planId, p(req.params["planId"])))
      .orderBy(asc(authorityDecisions.decisionType));
    res.json({ decisions: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch decisions" });
  }
});

// ── GET /api/authority-resolution/businesses/:businessId/registry ─────────────
// Authority registry entry for a business.
router.get("/api/authority-resolution/businesses/:businessId/registry", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const businessId = parseInt(p(req.params["businessId"]), 10);
  if (isNaN(businessId)) {
    res.status(400).json({ error: "Invalid businessId" });
    return;
  }

  try {
    const rows = await db
      .select()
      .from(authorityRegistry)
      .where(eq(authorityRegistry.businessId, businessId))
      .limit(1);
    if (!rows[0]) {
      res.status(404).json({ error: "No authority registry entry found for this business" });
      return;
    }
    res.json({ registry: rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch registry" });
  }
});

// ── GET /api/authority-resolution/reports/:reportId/snapshots ────────────────
// Snapshots for a report.
router.get("/api/authority-resolution/reports/:reportId/snapshots", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const rows = await db
      .select()
      .from(authoritySnapshots)
      .where(eq(authoritySnapshots.reportId, p(req.params["reportId"])))
      .orderBy(desc(authoritySnapshots.createdAt));
    res.json({ snapshots: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch snapshots" });
  }
});

export default router;
