// ─── Executive Judgment Engine — API Routes (Build 007) ──────────────────────
//
// REST API surface for the Executive Judgment Engine. All routes are under
// /api/executive-judgment. Every Brain and future system should consume
// judgment through these APIs.
//
// Endpoints:
//   POST   /api/executive-judgment/evaluate            Evaluate a judgment
//   POST   /api/executive-judgment/compare             Compare options (no persist)
//   GET    /api/executive-judgment/history             Decision history
//   GET    /api/executive-judgment/diagnostics         Health diagnostics
//   GET    /api/executive-judgment/:id                 Retrieve judgment
//   GET    /api/executive-judgment/:id/explanation     Get explanation
//   GET    /api/executive-judgment/:id/risk            Risk assessment
//   GET    /api/executive-judgment/:id/opportunity     Opportunity assessment

import { Router, type IRouter } from "express";
import type { Request, Response } from "express";
import { requireAuthActive } from "../lib/auth";
import {
  evaluateJudgment,
  compareOptions,
  getJudgment,
  getJudgmentHistory,
  getJudgmentDiagnostics,
  explainRecommendation,
  assessRisk,
  assessOpportunity,
} from "../lib/executive-judgment";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// ─── Evaluate a judgment ──────────────────────────────────────────────────────

/**
 * POST /api/executive-judgment/evaluate
 * Evaluate a decision: score all options, select a recommendation, explain.
 *
 * Body: JudgmentRequest
 * {
 *   decisionObjective: string,
 *   options: Array<{ key, description, scores?, evidence? }>,
 *   contextSnapshotId?: string,
 *   weights?: Record<dimension, number>,
 *   assumptions?: string[],
 *   constraints?: string[],
 *   evidence?: string[],
 *   relatedArtifactIds?: string[],
 *   relatedClusterIds?: string[]
 * }
 */
router.post("/executive-judgment/evaluate", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const input = req.body;
    if (!input.decisionObjective || typeof input.decisionObjective !== "string") {
      return res.status(400).json({ error: "decisionObjective is required" });
    }
    if (!Array.isArray(input.options) || input.options.length === 0) {
      return res.status(400).json({ error: "options array must have at least one item" });
    }
    for (const opt of input.options) {
      if (!opt.key || !opt.description) {
        return res.status(400).json({ error: "Each option requires key and description" });
      }
    }
    const judgment = await evaluateJudgment({ ...input, userId });
    return res.status(201).json({ judgment });
  } catch (err) {
    logger.warn({ err }, "POST /executive-judgment/evaluate failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// ─── Compare options (pure, no persistence) ───────────────────────────────────

/**
 * POST /api/executive-judgment/compare
 * Compare options without persisting a judgment. Returns rankings and scores.
 *
 * Body: { decisionObjective: string, options: [...], weights?: {...} }
 */
router.post("/executive-judgment/compare", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const { decisionObjective, options, weights } = req.body;
    if (!decisionObjective || !Array.isArray(options) || options.length === 0) {
      return res.status(400).json({ error: "decisionObjective and options array are required" });
    }
    const result = compareOptions(decisionObjective, options, weights);
    return res.json({ comparison: result });
  } catch (err) {
    logger.warn({ err }, "POST /executive-judgment/compare failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// ─── Decision history ─────────────────────────────────────────────────────────

/**
 * GET /api/executive-judgment/history
 * Return the decision history for the authenticated user (most recent first).
 */
router.get("/executive-judgment/history", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const limitRaw = Number(req.query["limit"]);
    const limit = isNaN(limitRaw) || limitRaw <= 0 ? 20 : Math.min(limitRaw, 100);
    const judgments = await getJudgmentHistory(userId, limit);
    return res.json({ judgments, count: judgments.length });
  } catch (err) {
    logger.warn({ err }, "GET /executive-judgment/history failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// ─── Diagnostics ──────────────────────────────────────────────────────────────

/**
 * GET /api/executive-judgment/diagnostics
 * Return health diagnostics for the user's judgment history.
 */
router.get("/executive-judgment/diagnostics", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const report = await getJudgmentDiagnostics(userId);
    return res.json({ diagnostics: report });
  } catch (err) {
    logger.warn({ err }, "GET /executive-judgment/diagnostics failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// ─── Retrieve a single judgment ───────────────────────────────────────────────

/**
 * GET /api/executive-judgment/:id
 * Retrieve a persisted judgment by id.
 */
router.get("/executive-judgment/:id", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const id = String(req.params["id"] ?? "");
    const judgment = await getJudgment(id);
    if (!judgment) return res.status(404).json({ error: "Judgment not found" });
    if (judgment.userId !== null && judgment.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    return res.json({ judgment });
  } catch (err) {
    logger.warn({ err }, "GET /executive-judgment/:id failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// ─── Explanation ──────────────────────────────────────────────────────────────

/**
 * GET /api/executive-judgment/:id/explanation
 * Return the structured explanation for a judgment.
 */
router.get("/executive-judgment/:id/explanation", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const id = String(req.params["id"] ?? "");
    const judgment = await getJudgment(id);
    if (!judgment) return res.status(404).json({ error: "Judgment not found" });
    if (judgment.userId !== null && judgment.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    const explanation = await explainRecommendation(id);
    if (!explanation) return res.status(404).json({ error: "Explanation not available" });
    return res.json({ explanation });
  } catch (err) {
    logger.warn({ err }, "GET /executive-judgment/:id/explanation failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// ─── Risk assessment ──────────────────────────────────────────────────────────

/**
 * GET /api/executive-judgment/:id/risk
 * Return risk assessment for the selected option of a judgment.
 */
router.get("/executive-judgment/:id/risk", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const id = String(req.params["id"] ?? "");
    const judgment = await getJudgment(id);
    if (!judgment) return res.status(404).json({ error: "Judgment not found" });
    if (judgment.userId !== null && judgment.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    const risk = assessRisk(judgment);
    return res.json({ risk });
  } catch (err) {
    logger.warn({ err }, "GET /executive-judgment/:id/risk failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// ─── Opportunity assessment ───────────────────────────────────────────────────

/**
 * GET /api/executive-judgment/:id/opportunity
 * Return opportunity assessment for the selected option of a judgment.
 */
router.get("/executive-judgment/:id/opportunity", async (req: Request, res: Response) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const id = String(req.params["id"] ?? "");
    const judgment = await getJudgment(id);
    if (!judgment) return res.status(404).json({ error: "Judgment not found" });
    if (judgment.userId !== null && judgment.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    const opportunity = assessOpportunity(judgment);
    return res.json({ opportunity });
  } catch (err) {
    logger.warn({ err }, "GET /executive-judgment/:id/opportunity failed");
    return res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

export default router;
