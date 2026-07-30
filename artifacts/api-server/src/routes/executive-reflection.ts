// ─── Executive Reflection Routes (Build 012) ─────────────────────────────────
//
// REST API for the Executive Reflection Engine.
// All routes require authentication.
// Reflection NEVER changes state — cases are opened here (append) and reports
// are created here (append), but nothing already persisted is mutated.

import { Router } from "express";
import { requireAuthActive } from "../lib/auth";
import {
  openCase,
  closeCase,
  getCase,
  listCases,
  getCaseMembers,
  addCaseMembers,
  getTimeline,
  getReport,
  getReportByCase,
  listReports,
  getFactors,
  getScores,
  getEvidence,
  getReflectionDiagnostics,
} from "../lib/executive-reflection/reflection-registry";
import { reflectOnCase } from "../lib/executive-reflection/reflection-orchestrator";
import {
  inferBusinessDomain,
  inferStrategicCategory,
  deriveCompletionStatus,
  deriveOutcome,
  computeDuration,
} from "../lib/executive-reflection/case-assembly";
import { summarizeTimeline } from "../lib/executive-reflection/decision-reconstruction";
import { logger } from "../lib/logger";

const router = Router();

// ── POST /api/executive-reflection/cases — open a new case ───────────────────

router.post("/cases", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const {
      rootRequest,
      businessDomain,
      strategicCategory,
      primaryGoalId,
      primaryPlanId,
      primaryExecutionId,
      primaryChainId,
      metadata,
    } = req.body;

    const ec = await openCase({
      userId,
      rootRequest,
      businessDomain: businessDomain ?? inferBusinessDomain(rootRequest),
      strategicCategory: strategicCategory ?? inferStrategicCategory(rootRequest),
      primaryGoalId,
      primaryPlanId,
      primaryExecutionId,
      primaryChainId,
      metadata,
    });

    res.status(201).json({ case: ec });
  } catch (err: any) {
    logger.error({ err }, "POST /api/executive-reflection/cases failed");
    res.status(400).json({ error: err.message ?? "Failed to open case" });
  }
});

// ── GET /api/executive-reflection/cases — list cases ─────────────────────────

router.get("/cases", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const { isClosed, completionStatus, limit } = req.query as Record<string, string | undefined>;
    const cases = await listCases({
      userId,
      isClosed: isClosed !== undefined ? isClosed === "true" : undefined,
      completionStatus: completionStatus as any,
      limit: limit ? parseInt(limit) : 20,
    });
    res.json({ cases });
  } catch (err) {
    res.status(500).json({ error: "Failed to list cases" });
  }
});

// ── GET /api/executive-reflection/diagnostics ─────────────────────────────────

router.get("/diagnostics", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const diagnostics = await getReflectionDiagnostics(userId);
    res.json({ diagnostics });
  } catch (err) {
    res.status(500).json({ error: "Failed to get diagnostics" });
  }
});

// ── GET /api/executive-reflection/reports — list reports ─────────────────────

router.get("/reports", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const { limit } = req.query as { limit?: string };
    const reports = await listReports({ userId, limit: limit ? parseInt(limit) : 20 });
    res.json({ reports });
  } catch (err) {
    res.status(500).json({ error: "Failed to list reports" });
  }
});

// ── POST /api/executive-reflection/cases/:caseId/close — close a case ────────

router.post("/cases/:caseId/close", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const ec = await getCase(req.params.caseId!);
    if (!ec || ec.userId !== userId) {
      res.status(404).json({ error: "Case not found" });
      return;
    }
    if (ec.isClosed) {
      res.status(409).json({ error: "Case is already closed" });
      return;
    }

    const { executionStatus, goalText } = req.body as Record<string, string | undefined>;
    const completionStatus = deriveCompletionStatus(executionStatus, false);
    const primaryOutcome = deriveOutcome(executionStatus, goalText, ec.rootRequest);
    const durationMs = ec.startedAt ? computeDuration(ec.startedAt, new Date()) : undefined;

    const closed = await closeCase(ec.id, { completionStatus, primaryOutcome: primaryOutcome ?? undefined, durationMs });
    res.json({ case: closed });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to close case" });
  }
});

// ── POST /api/executive-reflection/cases/:caseId/reflect — run reflection ─────

router.post("/cases/:caseId/reflect", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const ec = await getCase(req.params.caseId!);
    if (!ec || ec.userId !== userId) {
      res.status(404).json({ error: "Case not found" });
      return;
    }

    const result = await reflectOnCase({
      caseId: ec.id,
      userId,
      forceReflect: req.body?.forceReflect === true,
    });

    if (!result) {
      res.status(422).json({ error: "Reflection could not be produced for this case" });
      return;
    }

    res.status(201).json({
      report: result.report,
      factorCount: result.factorCount,
      scoreCount: result.scoreCount,
      evidenceCount: result.evidenceCount,
    });
  } catch (err: any) {
    logger.error({ err }, "POST /api/executive-reflection/cases/:caseId/reflect failed");
    res.status(500).json({ error: err.message ?? "Reflection failed" });
  }
});

// ── GET /api/executive-reflection/cases/:caseId — single case ────────────────

router.get("/cases/:caseId", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const ec = await getCase(req.params.caseId!);
    if (!ec || ec.userId !== userId) {
      res.status(404).json({ error: "Case not found" });
      return;
    }
    res.json({ case: ec });
  } catch (err) {
    res.status(500).json({ error: "Failed to get case" });
  }
});

// ── GET /api/executive-reflection/cases/:caseId/members ──────────────────────

router.get("/cases/:caseId/members", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const ec = await getCase(req.params.caseId!);
    if (!ec || ec.userId !== userId) {
      res.status(404).json({ error: "Case not found" });
      return;
    }
    const members = await getCaseMembers(req.params.caseId!);
    res.json({ members });
  } catch (err) {
    res.status(500).json({ error: "Failed to get case members" });
  }
});

// ── GET /api/executive-reflection/cases/:caseId/timeline ─────────────────────

router.get("/cases/:caseId/timeline", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const ec = await getCase(req.params.caseId!);
    if (!ec || ec.userId !== userId) {
      res.status(404).json({ error: "Case not found" });
      return;
    }
    const events = await getTimeline(req.params.caseId!);
    const timeline = summarizeTimeline(events);
    res.json({ timeline });
  } catch (err) {
    res.status(500).json({ error: "Failed to get timeline" });
  }
});

// ── GET /api/executive-reflection/cases/:caseId/report ───────────────────────

router.get("/cases/:caseId/report", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const ec = await getCase(req.params.caseId!);
    if (!ec || ec.userId !== userId) {
      res.status(404).json({ error: "Case not found" });
      return;
    }
    const report = await getReportByCase(req.params.caseId!);
    if (!report) {
      res.status(404).json({ error: "No reflection report found for this case" });
      return;
    }
    res.json({ report });
  } catch (err) {
    res.status(500).json({ error: "Failed to get report" });
  }
});

// ── GET /api/executive-reflection/reports/:reportId ──────────────────────────

router.get("/reports/:reportId", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const report = await getReport(req.params.reportId!);
    if (!report || report.userId !== userId) {
      res.status(404).json({ error: "Report not found" });
      return;
    }
    res.json({ report });
  } catch (err) {
    res.status(500).json({ error: "Failed to get report" });
  }
});

// ── GET /api/executive-reflection/reports/:reportId/factors ──────────────────

router.get("/reports/:reportId/factors", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const report = await getReport(req.params.reportId!);
    if (!report || report.userId !== userId) {
      res.status(404).json({ error: "Report not found" });
      return;
    }
    const factors = await getFactors(req.params.reportId!);
    res.json({ factors });
  } catch (err) {
    res.status(500).json({ error: "Failed to get factors" });
  }
});

// ── GET /api/executive-reflection/reports/:reportId/scores ───────────────────

router.get("/reports/:reportId/scores", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const report = await getReport(req.params.reportId!);
    if (!report || report.userId !== userId) {
      res.status(404).json({ error: "Report not found" });
      return;
    }
    const scores = await getScores(req.params.reportId!);
    res.json({ scores });
  } catch (err) {
    res.status(500).json({ error: "Failed to get scores" });
  }
});

// ── GET /api/executive-reflection/reports/:reportId/evidence ─────────────────

router.get("/reports/:reportId/evidence", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const report = await getReport(req.params.reportId!);
    if (!report || report.userId !== userId) {
      res.status(404).json({ error: "Report not found" });
      return;
    }
    const evidence = await getEvidence(req.params.reportId!);
    res.json({ evidence });
  } catch (err) {
    res.status(500).json({ error: "Failed to get evidence" });
  }
});

// ── GET /api/executive-reflection/business-domains ───────────────────────────

router.get("/business-domains", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const domains = [
    "social_media", "email_marketing", "web_presence", "content_marketing",
    "business_analytics", "revenue_operations", "customer_success", "branding",
    "seo", "research", "general",
  ];
  res.json({ domains });
});

// ── GET /api/executive-reflection/strategic-categories ────────────────────────

router.get("/strategic-categories", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const categories = [
    "growth", "automation", "analysis", "content_creation",
    "remediation", "optimization", "research", "planning", "general",
  ];
  res.json({ categories });
});

export default router;
