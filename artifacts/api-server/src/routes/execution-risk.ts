// ─────────────────────────────────────────────────────────────────────────────
// Build 026: Execution Risk Assessment Engine — REST Routes (8 endpoints)
// All under /api/execution-risk
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from "express";
import { db } from "@workspace/db";
import {
  executionRiskReports,
  executionRiskProfiles,
  executionRiskCategories,
  executionRiskMitigations,
  executionSafetyScores,
  executionRiskRegistry,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuthActive } from "../lib/auth";
import { runRiskAssessment } from "../lib/execution-risk/risk-orchestrator";

const router = Router();
const p = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? "") : (v ?? "");

// POST /api/execution-risk/assess-risk/:businessId
router.post("/api/execution-risk/assess-risk/:businessId", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const businessId = parseInt(p(req.params["businessId"]), 10);
  if (isNaN(businessId)) {
    res.status(400).json({ error: "Invalid businessId" });
    return;
  }

  try {
    const summary = await runRiskAssessment({ userId, businessId });
    if (!summary) {
      res.status(422).json({ error: "No execution orchestration plan found for this business. Run /orchestrate first." });
      return;
    }
    res.json({ summary });
  } catch (err) {
    res.status(500).json({ error: "Risk assessment run failed" });
  }
});

// GET /api/execution-risk/businesses/:businessId/reports
router.get("/api/execution-risk/businesses/:businessId/reports", async (req, res) => {
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
      .from(executionRiskReports)
      .where(eq(executionRiskReports.businessId, businessId))
      .orderBy(desc(executionRiskReports.createdAt))
      .limit(20);
    res.json({ reports: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch risk reports" });
  }
});

// GET /api/execution-risk/reports/:reportId
router.get("/api/execution-risk/reports/:reportId", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const rows = await db
      .select()
      .from(executionRiskReports)
      .where(eq(executionRiskReports.id, p(req.params["reportId"])))
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

// GET /api/execution-risk/plans/:planId/risk — profiles for a report (planId = reportId here)
router.get("/api/execution-risk/plans/:planId/risk", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const rows = await db
      .select()
      .from(executionRiskProfiles)
      .where(eq(executionRiskProfiles.reportId, p(req.params["planId"])))
      .orderBy(desc(executionRiskProfiles.overallRiskScore));
    res.json({ profiles: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch risk profiles" });
  }
});

// GET /api/execution-risk/plans/:planId/mitigations
router.get("/api/execution-risk/plans/:planId/mitigations", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const rows = await db
      .select()
      .from(executionRiskMitigations)
      .where(eq(executionRiskMitigations.reportId, p(req.params["planId"])));
    res.json({ mitigations: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch mitigations" });
  }
});

// GET /api/execution-risk/plans/:planId/safety
router.get("/api/execution-risk/plans/:planId/safety", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const rows = await db
      .select()
      .from(executionSafetyScores)
      .where(eq(executionSafetyScores.reportId, p(req.params["planId"])))
      .limit(1);
    if (!rows[0]) {
      res.status(404).json({ error: "Safety score not found" });
      return;
    }
    res.json({ safety: rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch safety score" });
  }
});

// GET /api/execution-risk/plans/:planId/reversibility — category breakdown (proxy via profiles)
router.get("/api/execution-risk/plans/:planId/reversibility", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const rows = await db
      .select({
        assignmentId: executionRiskProfiles.assignmentId,
        packageTitle: executionRiskProfiles.packageTitle,
        ownerType: executionRiskProfiles.ownerType,
        reversibilityLevel: executionRiskProfiles.reversibilityLevel,
        rollbackComplexity: executionRiskProfiles.rollbackComplexity,
        rollbackNote: executionRiskProfiles.rollbackNote,
      })
      .from(executionRiskProfiles)
      .where(eq(executionRiskProfiles.reportId, p(req.params["planId"])));
    res.json({ reversibility: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reversibility data" });
  }
});

// GET /api/execution-risk/businesses/:businessId/registry
router.get("/api/execution-risk/businesses/:businessId/registry", async (req, res) => {
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
      .from(executionRiskRegistry)
      .where(eq(executionRiskRegistry.businessId, businessId))
      .limit(1);
    if (!rows[0]) {
      res.status(404).json({ error: "No risk registry entry found for this business" });
      return;
    }
    res.json({ registry: rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch registry" });
  }
});

export default router;
