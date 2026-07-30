// ─── Build 019: Decision Intelligence REST Routes ─────────────────────────────

import { Router } from "express";
import { requireAuthActive } from "../lib/auth";
import {
  runDecisionIntelligence,
  fetchDecisionSummaryForEB,
} from "../lib/decision-intelligence/decision-orchestrator";
import {
  getLatestDecisionReport,
  getDecisionsByReport,
  getDecisionRegistry,
  getDecisionRationales,
  getDecisionTradeoffs,
  getDecisionConfidence,
  listDecisionReports,
} from "../lib/decision-intelligence/decision-registry";

const router = Router();

// ── POST /decide/:businessId — Full decision run ───────────────────────────

router.post("/decide/:businessId", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const businessId = parseInt(req.params.businessId ?? "", 10);
  if (isNaN(businessId)) {
    res.status(400).json({ error: "Invalid businessId" });
    return;
  }

  try {
    const report = await runDecisionIntelligence(businessId, userId);
    res.status(200).json({
      success: true,
      reportId: report.id,
      primaryDecisionType: report.primaryDecision.scenarioType,
      primarySelectionScore: report.primaryDecision.selectionScore,
      alternativeCount: report.alternativeDecisions.length,
      rejectedCount: report.rejectedDecisions.length,
      overallConfidence: report.overallConfidence,
      strategicAlignmentScore: report.strategicAlignmentScore,
      executiveSummary: report.executiveSummary,
      durationMs: report.decisionDurationMs,
    });
  } catch (err: any) {
    const status = err.statusCode ?? 500;
    res.status(status).json({ error: err.message ?? "Decision run failed" });
    return;
  }
});

// ── GET /reports/:businessId — List all decision reports ──────────────────

router.get("/reports/:businessId", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const businessId = parseInt(req.params.businessId ?? "", 10);
  if (isNaN(businessId)) {
    res.status(400).json({ error: "Invalid businessId" });
    return;
  }

  try {
    const reports = await listDecisionReports(businessId);
    res.status(200).json({ reports });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to list decision reports" });
    return;
  }
});

// ── GET /reports/:businessId/latest — Latest report detail ────────────────

router.get("/reports/:businessId/latest", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const businessId = parseInt(req.params.businessId ?? "", 10);
  if (isNaN(businessId)) {
    res.status(400).json({ error: "Invalid businessId" });
    return;
  }

  try {
    const report = await getLatestDecisionReport(businessId);
    if (!report) {
      res.status(404).json({ error: "No decision report found. Run /decide first." });
      return;
    }
    const decisions = await getDecisionsByReport(report.id);
    res.status(200).json({ report, decisions });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch latest decision report" });
    return;
  }
});

// ── GET /decisions/:businessId — All decisions for latest report ──────────

router.get("/decisions/:businessId", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const businessId = parseInt(req.params.businessId ?? "", 10);
  if (isNaN(businessId)) {
    res.status(400).json({ error: "Invalid businessId" });
    return;
  }

  try {
    const report = await getLatestDecisionReport(businessId);
    if (!report) {
      res.status(404).json({ error: "No decision report found." });
      return;
    }
    const decisions = await getDecisionsByReport(report.id);
    res.status(200).json({ decisions });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch decisions" });
    return;
  }
});

// ── GET /decisions/:businessId/:decisionId/rationales ─────────────────────

router.get("/decisions/:businessId/:decisionId/rationales", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const { decisionId } = req.params;
  if (!decisionId) {
    res.status(400).json({ error: "Invalid decisionId" });
    return;
  }

  try {
    const rationales = await getDecisionRationales(decisionId);
    res.status(200).json({ rationales });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch rationales" });
    return;
  }
});

// ── GET /decisions/:businessId/:decisionId/tradeoffs ──────────────────────

router.get("/decisions/:businessId/:decisionId/tradeoffs", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const { decisionId } = req.params;
  if (!decisionId) {
    res.status(400).json({ error: "Invalid decisionId" });
    return;
  }

  try {
    const tradeoffs = await getDecisionTradeoffs(decisionId);
    res.status(200).json({ tradeoffs });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch tradeoffs" });
    return;
  }
});

// ── GET /decisions/:businessId/:decisionId/confidence ─────────────────────

router.get("/decisions/:businessId/:decisionId/confidence", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const { decisionId } = req.params;
  if (!decisionId) {
    res.status(400).json({ error: "Invalid decisionId" });
    return;
  }

  try {
    const confidence = await getDecisionConfidence(decisionId);
    if (!confidence) {
      res.status(404).json({ error: "No confidence record found for this decision." });
      return;
    }
    res.status(200).json({ confidence });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch confidence" });
    return;
  }
});

// ── GET /registry/:businessId ─────────────────────────────────────────────

router.get("/registry/:businessId", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const businessId = parseInt(req.params.businessId ?? "", 10);
  if (isNaN(businessId)) {
    res.status(400).json({ error: "Invalid businessId" });
    return;
  }

  try {
    const registry = await getDecisionRegistry(businessId);
    if (!registry) {
      res.status(404).json({ error: "No decision registry entry found." });
      return;
    }
    res.status(200).json({ registry });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch registry" });
    return;
  }
});

// ── GET /summary/:businessId — EB-ready compact summary ───────────────────

router.get("/summary/:businessId", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const businessId = parseInt(req.params.businessId ?? "", 10);
  if (isNaN(businessId)) {
    res.status(400).json({ error: "Invalid businessId" });
    return;
  }

  try {
    const summary = await fetchDecisionSummaryForEB(businessId);
    if (!summary) {
      res.status(404).json({ error: "No decision summary available. Run /decide first." });
      return;
    }
    res.status(200).json({ summary });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch decision summary" });
    return;
  }
});

export default router;
