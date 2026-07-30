// ─── Opportunity Discovery Routes (Build 017) ─────────────────────────────────
//
// REST API for the Opportunity Discovery Engine.
// Reports and opportunities are immutable after POST /discover.

import { Router } from "express";
import { requireAuthActive } from "../lib/auth";
import {
  listOpportunities, listOpportunityReports, getLatestOpportunityReport,
  listEvidenceForOpportunity, getOpportunityRegistry, listSnapshots,
} from "../lib/opportunity-discovery/opportunity-registry";
import {
  runOpportunityDiscovery, fetchOpportunitySummaryForEB,
} from "../lib/opportunity-discovery/opportunity-orchestrator";
import { getBusiness } from "../lib/business-graph/business-registry";

const router = Router();

// ── POST /api/opportunity-discovery/businesses/:id/discover ──────────────────
// Run a full opportunity discovery run.

router.post("/businesses/:id/discover", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const businessId = parseInt(req.params.id!);
    const business = await getBusiness(businessId);
    if (!business || business.ownerId !== userId) {
      res.status(404).json({ error: "Business not found" });
      return;
    }
    const report = await runOpportunityDiscovery(businessId, userId);
    if (!report) {
      res.status(422).json({ error: "Discovery failed — run business analysis first" });
      return;
    }
    res.status(201).json({ report });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Discovery failed" });
  }
});

// ── GET /api/opportunity-discovery/businesses/:id/reports ────────────────────

router.get("/businesses/:id/reports", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const limit = parseInt((req.query.limit as string) ?? "10");
    const reports = await listOpportunityReports(parseInt(req.params.id!), limit);
    res.json({ reports });
  } catch (err) {
    res.status(500).json({ error: "Failed to list reports" });
  }
});

// ── GET /api/opportunity-discovery/businesses/:id/reports/latest ─────────────

router.get("/businesses/:id/reports/latest", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const report = await getLatestOpportunityReport(parseInt(req.params.id!));
    if (!report) {
      res.status(404).json({ error: "No opportunity report found. Run /discover first." });
      return;
    }
    res.json({ report });
  } catch (err) {
    res.status(500).json({ error: "Failed to get latest report" });
  }
});

// ── GET /api/opportunity-discovery/businesses/:id/opportunities ───────────────

router.get("/businesses/:id/opportunities", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const limit = parseInt((req.query.limit as string) ?? "20");
    const opportunities = await listOpportunities(parseInt(req.params.id!), limit);
    res.json({ opportunities });
  } catch (err) {
    res.status(500).json({ error: "Failed to list opportunities" });
  }
});

// ── GET /api/opportunity-discovery/opportunities/:id/evidence ─────────────────

router.get("/opportunities/:id/evidence", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const evidence = await listEvidenceForOpportunity(req.params.id!);
    res.json({ evidence });
  } catch (err) {
    res.status(500).json({ error: "Failed to list evidence" });
  }
});

// ── GET /api/opportunity-discovery/businesses/:id/registry ───────────────────

router.get("/businesses/:id/registry", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const registry = await getOpportunityRegistry(parseInt(req.params.id!));
    res.json({ registry });
  } catch (err) {
    res.status(500).json({ error: "Failed to get registry" });
  }
});

// ── GET /api/opportunity-discovery/businesses/:id/snapshots ──────────────────

router.get("/businesses/:id/snapshots", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const limit = parseInt((req.query.limit as string) ?? "5");
    const snapshots = await listSnapshots(parseInt(req.params.id!), limit);
    res.json({ snapshots });
  } catch (err) {
    res.status(500).json({ error: "Failed to list snapshots" });
  }
});

// ── GET /api/opportunity-discovery/businesses/:id/summary ────────────────────
// EB-ready compact summary.

router.get("/businesses/:id/summary", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const summary = await fetchOpportunitySummaryForEB(userId);
    res.json({ summary });
  } catch (err) {
    res.status(500).json({ error: "Failed to get summary" });
  }
});

// ── GET /api/opportunity-discovery/businesses/:id/top ────────────────────────
// Top N opportunities by composite score.

router.get("/businesses/:id/top", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const n = parseInt((req.query.n as string) ?? "5");
    const opportunities = await listOpportunities(parseInt(req.params.id!), n);
    res.json({ opportunities });
  } catch (err) {
    res.status(500).json({ error: "Failed to get top opportunities" });
  }
});

// ── GET /api/opportunity-discovery/businesses/:id/search ─────────────────────
// Filter by category, priorityGroup, or minScore.

router.get("/businesses/:id/search", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const { category, priorityGroup, minScore } = req.query as Record<string, string>;
    let opportunities = await listOpportunities(parseInt(req.params.id!), 100);
    if (category) opportunities = opportunities.filter((o) => o.category === category);
    if (priorityGroup) opportunities = opportunities.filter((o) => o.priorityGroup === priorityGroup);
    if (minScore) opportunities = opportunities.filter((o) => o.compositeScore >= parseFloat(minScore));
    res.json({ opportunities });
  } catch (err) {
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;
