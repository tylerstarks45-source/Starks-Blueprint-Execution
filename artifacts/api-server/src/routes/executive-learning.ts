// ─── Executive Learning Routes (Build 013) ────────────────────────────────────
//
// REST API for the Executive Principle Learning Engine.
// All routes require authentication.
// Learning NEVER changes behavior — routes are read + trigger only.

import { Router } from "express";
import { requireAuthActive } from "../lib/auth";
import {
  getPrinciple,
  listPrinciples,
  searchPrinciples,
  getValidatedPrinciples,
  getPrincipleVersions,
  getPrincipleEvidence,
  getPrincipleContradictions,
  getPrincipleValidationHistory,
  getLearningReport,
  listLearningReports,
  getPrincipleRelationships,
  getAllGraphEdges,
  getLearningSummary,
  getLearningDiagnostics,
} from "../lib/executive-learning/learning-registry";
import { runLearningCycle } from "../lib/executive-learning/learning-orchestrator";
import { bfsTraversal } from "../lib/executive-learning/principle-graph";
import { logger } from "../lib/logger";

const router = Router();

// ── POST /api/executive-learning/cycles — trigger a learning cycle ────────────

router.post("/cycles", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const { caseLimit } = req.body as { caseLimit?: number };
    const result = await runLearningCycle({ userId, caseLimit });

    if (!result) {
      res.status(422).json({
        error: "Insufficient closed Executive Cases for a learning cycle. At least 2 closed cases are required.",
      });
      return;
    }

    res.status(201).json({
      report: result.report,
      newPrincipleCount: result.newPrinciples.length,
      strengthenedCount: result.strengthenedPrinciples.length,
      weakeningCount: result.weakeningPrinciples.length,
      deprecatedCount: result.deprecatedPrinciples.length,
      patternsDiscovered: result.patternsDiscovered.length,
      graphEdgesAdded: result.graphEdgesAdded,
    });
  } catch (err: any) {
    logger.error({ err }, "POST /api/executive-learning/cycles failed");
    res.status(500).json({ error: err.message ?? "Learning cycle failed" });
  }
});

// ── GET /api/executive-learning/principles — list principles ──────────────────

router.get("/principles", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const { status, businessDomain, category, limit } = req.query as Record<string, string | undefined>;
    const principles = await listPrinciples({
      userId,
      status: status as any,
      businessDomain,
      category,
      limit: limit ? parseInt(limit) : 50,
    });
    res.json({ principles });
  } catch (err) {
    res.status(500).json({ error: "Failed to list principles" });
  }
});

// ── GET /api/executive-learning/principles/validated ─────────────────────────

router.get("/principles/validated", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const { limit } = req.query as { limit?: string };
    const principles = await getValidatedPrinciples(userId, limit ? parseInt(limit) : 20);
    res.json({ principles });
  } catch (err) {
    res.status(500).json({ error: "Failed to get validated principles" });
  }
});

// ── GET /api/executive-learning/principles/search — search ───────────────────

router.get("/principles/search", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const { q, status, limit } = req.query as Record<string, string | undefined>;
    if (!q) {
      res.status(400).json({ error: "Query parameter 'q' is required" });
      return;
    }
    const principles = await searchPrinciples({
      userId,
      query: q,
      status: status as any,
      limit: limit ? parseInt(limit) : 20,
    });
    res.json({ principles });
  } catch (err) {
    res.status(500).json({ error: "Failed to search principles" });
  }
});

// ── GET /api/executive-learning/principles/:id ────────────────────────────────

router.get("/principles/:id", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const p = await getPrinciple(req.params.id!);
    if (!p || p.userId !== userId) {
      res.status(404).json({ error: "Principle not found" });
      return;
    }
    res.json({ principle: p });
  } catch (err) {
    res.status(500).json({ error: "Failed to get principle" });
  }
});

// ── GET /api/executive-learning/principles/:id/versions ──────────────────────

router.get("/principles/:id/versions", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const p = await getPrinciple(req.params.id!);
    if (!p || p.userId !== userId) {
      res.status(404).json({ error: "Principle not found" });
      return;
    }
    const versions = await getPrincipleVersions(req.params.id!);
    res.json({ versions });
  } catch (err) {
    res.status(500).json({ error: "Failed to get versions" });
  }
});

// ── GET /api/executive-learning/principles/:id/evidence ──────────────────────

router.get("/principles/:id/evidence", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const p = await getPrinciple(req.params.id!);
    if (!p || p.userId !== userId) {
      res.status(404).json({ error: "Principle not found" });
      return;
    }
    const evidence = await getPrincipleEvidence(req.params.id!);
    res.json({ evidence });
  } catch (err) {
    res.status(500).json({ error: "Failed to get evidence" });
  }
});

// ── GET /api/executive-learning/principles/:id/contradictions ─────────────────

router.get("/principles/:id/contradictions", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const p = await getPrinciple(req.params.id!);
    if (!p || p.userId !== userId) {
      res.status(404).json({ error: "Principle not found" });
      return;
    }
    const contradictions = await getPrincipleContradictions(req.params.id!);
    res.json({ contradictions });
  } catch (err) {
    res.status(500).json({ error: "Failed to get contradictions" });
  }
});

// ── GET /api/executive-learning/principles/:id/validation-history ─────────────

router.get("/principles/:id/validation-history", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const p = await getPrinciple(req.params.id!);
    if (!p || p.userId !== userId) {
      res.status(404).json({ error: "Principle not found" });
      return;
    }
    const history = await getPrincipleValidationHistory(req.params.id!);
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: "Failed to get validation history" });
  }
});

// ── GET /api/executive-learning/principles/:id/relationships ──────────────────

router.get("/principles/:id/relationships", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const p = await getPrinciple(req.params.id!);
    if (!p || p.userId !== userId) {
      res.status(404).json({ error: "Principle not found" });
      return;
    }
    const relationships = await getPrincipleRelationships(req.params.id!);
    res.json({ relationships });
  } catch (err) {
    res.status(500).json({ error: "Failed to get relationships" });
  }
});

// ── GET /api/executive-learning/principles/:id/graph — BFS neighbourhood ──────

router.get("/principles/:id/graph", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const p = await getPrinciple(req.params.id!);
    if (!p || p.userId !== userId) {
      res.status(404).json({ error: "Principle not found" });
      return;
    }
    const { depth } = req.query as { depth?: string };
    const maxDepth = depth ? Math.min(4, parseInt(depth)) : 3;
    const allEdges = await getAllGraphEdges(userId);
    const traversal = bfsTraversal(req.params.id!, allEdges, maxDepth);
    res.json({ traversal });
  } catch (err) {
    res.status(500).json({ error: "Failed to traverse principle graph" });
  }
});

// ── GET /api/executive-learning/graph — full graph edges ─────────────────────

router.get("/graph", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const edges = await getAllGraphEdges(userId);
    res.json({ edges, edgeCount: edges.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to get graph" });
  }
});

// ── GET /api/executive-learning/reports — list learning reports ───────────────

router.get("/reports", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const { limit } = req.query as { limit?: string };
    const reports = await listLearningReports(userId, limit ? parseInt(limit) : 10);
    res.json({ reports });
  } catch (err) {
    res.status(500).json({ error: "Failed to list reports" });
  }
});

// ── GET /api/executive-learning/reports/:id ───────────────────────────────────

router.get("/reports/:id", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const report = await getLearningReport(req.params.id!);
    if (!report || report.userId !== userId) {
      res.status(404).json({ error: "Report not found" });
      return;
    }
    res.json({ report });
  } catch (err) {
    res.status(500).json({ error: "Failed to get report" });
  }
});

// ── GET /api/executive-learning/summary ───────────────────────────────────────

router.get("/summary", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const summary = await getLearningSummary(userId);
    res.json({ summary });
  } catch (err) {
    res.status(500).json({ error: "Failed to get summary" });
  }
});

// ── GET /api/executive-learning/diagnostics ───────────────────────────────────

router.get("/diagnostics", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const diagnostics = await getLearningDiagnostics(userId);
    res.json({ diagnostics });
  } catch (err) {
    res.status(500).json({ error: "Failed to get diagnostics" });
  }
});

// ── GET /api/executive-learning/categories ────────────────────────────────────

router.get("/categories", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const categories = [
    "planning", "execution", "judgment", "goal_management",
    "resource_management", "risk_management", "communication",
    "strategy", "operations", "general",
  ];
  res.json({ categories });
});

// ── GET /api/executive-learning/domains ───────────────────────────────────────

router.get("/domains", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const domains = [
    "social_media", "email_marketing", "web_presence", "content_marketing",
    "business_analytics", "revenue_operations", "customer_success", "branding",
    "seo", "research", "general",
  ];
  res.json({ domains });
});

export default router;
