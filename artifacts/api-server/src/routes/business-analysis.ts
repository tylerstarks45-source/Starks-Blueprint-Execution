// ─── Business Analysis Routes (Build 016) ─────────────────────────────────────
//
// REST API for the Business Analysis Engine.
// Reports and findings are immutable — GET only after POST to trigger analysis.

import { businessAnalysisReportsTable } from "@workspace/db";
import { requireBusinessOwner, businessIdParam, businessIdOfRecord, requireSelfParam } from "../lib/route-ownership";
import { Router } from "express";
import { requireAuthActive } from "../lib/auth";
import {
  listReports, getLatestReport, listFindings, listBottlenecks,
  listConstraints, listLeverage, listSnapshots, getRegistryEntry,
  getReportDiagnostics,
} from "../lib/business-analysis/analysis-registry";
import {
  runBusinessAnalysis, fetchAnalysisSummaryForEB,
} from "../lib/business-analysis/analysis-orchestrator";
import { getBusiness } from "../lib/business-graph/business-registry";
import { logger } from "../lib/logger";

const router = Router();

// Tenant isolation: every business-scoped route is limited to the caller's own businesses.
router.use("/businesses/:id", requireBusinessOwner(businessIdParam("id")));
router.use("/reports/:reportId", requireBusinessOwner(businessIdOfRecord(businessAnalysisReportsTable, "reportId")));

// ── POST /api/business-analysis/businesses/:id/analyze ───────────────────────
// Run a full analysis for a business. Immutable report is persisted.

router.post("/businesses/:id/analyze", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const businessId = parseInt(req.params.id!);
    const business = await getBusiness(businessId);
    if (!business || business.ownerId !== userId) {
      res.status(404).json({ error: "Business not found" });
      return;
    }
    const report = await runBusinessAnalysis(businessId, userId);
    if (!report) {
      res.status(500).json({ error: "Analysis failed" });
      return;
    }
    res.status(201).json({ report });
  } catch (err: any) {
    // H-04 fix: never reflect raw err.message in 500 responses (information leakage)
    res.status(500).json({ error: "Analysis failed" });
  }
});

// ── GET /api/business-analysis/businesses/:id/reports ────────────────────────

router.get("/businesses/:id/reports", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const limit = parseInt((req.query.limit as string) ?? "10");
    const reports = await listReports(parseInt(req.params.id!), limit);
    res.json({ reports });
  } catch (err) {
    res.status(500).json({ error: "Failed to list reports" });
  }
});

// ── GET /api/business-analysis/businesses/:id/reports/latest ─────────────────

router.get("/businesses/:id/reports/latest", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const report = await getLatestReport(parseInt(req.params.id!));
    if (!report) {
      res.status(404).json({ error: "No analysis report found. Run /analyze first." });
      return;
    }
    res.json({ report });
  } catch (err) {
    res.status(500).json({ error: "Failed to get latest report" });
  }
});

// ── GET /api/business-analysis/reports/:reportId/findings ────────────────────

router.get("/reports/:reportId/findings", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const findings = await listFindings(req.params.reportId!);
    res.json({ findings });
  } catch (err) {
    res.status(500).json({ error: "Failed to list findings" });
  }
});

// ── GET /api/business-analysis/reports/:reportId/bottlenecks ─────────────────

router.get("/reports/:reportId/bottlenecks", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const bottlenecks = await listBottlenecks(req.params.reportId!);
    res.json({ bottlenecks });
  } catch (err) {
    res.status(500).json({ error: "Failed to list bottlenecks" });
  }
});

// ── GET /api/business-analysis/reports/:reportId/constraints ─────────────────

router.get("/reports/:reportId/constraints", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const constraints = await listConstraints(req.params.reportId!);
    res.json({ constraints });
  } catch (err) {
    res.status(500).json({ error: "Failed to list constraints" });
  }
});

// ── GET /api/business-analysis/reports/:reportId/leverage ────────────────────

router.get("/reports/:reportId/leverage", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const leverage = await listLeverage(req.params.reportId!);
    res.json({ leverage });
  } catch (err) {
    res.status(500).json({ error: "Failed to list leverage points" });
  }
});

// ── GET /api/business-analysis/reports/:reportId/snapshots ───────────────────

router.get("/reports/:reportId/snapshots", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const snapshots = await listSnapshots(req.params.reportId!);
    res.json({ snapshots });
  } catch (err) {
    res.status(500).json({ error: "Failed to list snapshots" });
  }
});

// ── GET /api/business-analysis/businesses/:id/registry ───────────────────────

router.get("/businesses/:id/registry", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const registry = await getRegistryEntry(parseInt(req.params.id!));
    res.json({ registry });
  } catch (err) {
    res.status(500).json({ error: "Failed to get registry" });
  }
});

// ── GET /api/business-analysis/businesses/:id/diagnostics ────────────────────

router.get("/businesses/:id/diagnostics", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const diagnostics = await getReportDiagnostics(parseInt(req.params.id!));
    res.json({ diagnostics });
  } catch (err) {
    res.status(500).json({ error: "Failed to get diagnostics" });
  }
});

// ── GET /api/business-analysis/businesses/:id/summary ────────────────────────
// EB-ready summary (compact).

router.get("/businesses/:id/summary", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const summary = await fetchAnalysisSummaryForEB(userId);
    res.json({ summary });
  } catch (err) {
    res.status(500).json({ error: "Failed to get summary" });
  }
});

// ── GET /api/business-analysis/businesses/:id/search ─────────────────────────
// Simple search: filter findings by category or severity from the latest report.

router.get("/businesses/:id/search", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const { category, severity, minSeverity } = req.query as Record<string, string>;
    const report = await getLatestReport(parseInt(req.params.id!));
    if (!report) {
      res.status(404).json({ error: "No report found." });
      return;
    }
    let findings = await listFindings(report.id);
    if (category) findings = findings.filter((f) => f.category === category);
    if (severity) findings = findings.filter((f) => f.severity === severity);
    if (minSeverity) {
      const order: Record<string, number> = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };
      const minLevel = order[minSeverity] ?? 0;
      findings = findings.filter((f) => (order[f.severity] ?? 0) >= minLevel);
    }
    res.json({ findings, reportId: report.id });
  } catch (err) {
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;
