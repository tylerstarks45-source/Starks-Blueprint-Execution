// ─── Executive Observation Routes (Build 011) ────────────────────────────────
//
// REST API for the Executive Observation Engine.
// All routes require authentication.
// Observation NEVER changes state — all routes are effectively read-only or
// append-only.

import { Router } from "express";
import { requireAuthActive } from "../lib/auth";
import {
  getObservation,
  listObservations,
  getRecentObservations,
  getAttentionQueue,
  getChain,
  listChains,
  getChainObservations,
  getSignalFeed,
  getTrendFeed,
  getAnomalyFeed,
  getCorrelationsForObservation,
  getObservationDiagnostics,
  insertTrend,
  insertAnomaly,
} from "../lib/executive-observation/observation-registry";
import {
  ingestObservation,
} from "../lib/executive-observation/observation-ingestion";
import {
  detectAllTrends,
} from "../lib/executive-observation/observation-trend";
import {
  detectAllAnomalies,
} from "../lib/executive-observation/observation-anomaly";
import { logger } from "../lib/logger";

const router = Router();

// ── POST /api/executive-observation — ingest a new observation ────────────────

router.post("/", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const result = await ingestObservation({ userId, ...req.body });
    res.status(201).json({
      observation: result.observation,
      signal: result.signal,
      chainId: result.chainId,
      correlationCount: result.correlationCount,
    });
  } catch (err: any) {
    logger.error({ err }, "POST /api/executive-observation failed");
    res.status(400).json({ error: err.message ?? "Failed to ingest observation" });
  }
});

// ── GET /api/executive-observation — list observations ────────────────────────

router.get("/", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const {
      sourceSystem, eventCategory, signalType, severity, chainId,
      relatedExecutionId, relatedGoalId, relatedPlanId,
      minAttentionScore, limit,
    } = req.query as Record<string, string | undefined>;

    const observations = await listObservations({
      userId,
      sourceSystem,
      eventCategory: eventCategory as any,
      signalType: signalType as any,
      severity: severity as any,
      chainId,
      relatedExecutionId,
      relatedGoalId,
      relatedPlanId,
      minAttentionScore: minAttentionScore ? parseFloat(minAttentionScore) : undefined,
      limit: limit ? parseInt(limit) : 100,
    });
    res.json({ observations });
  } catch (err) {
    logger.error({ err }, "GET /api/executive-observation failed");
    res.status(500).json({ error: "Failed to list observations" });
  }
});

// ── GET /api/executive-observation/recent — latest observations ───────────────

router.get("/recent", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const { limit } = req.query as { limit?: string };
    const observations = await getRecentObservations(userId, limit ? parseInt(limit) : 50);
    res.json({ observations });
  } catch (err) {
    res.status(500).json({ error: "Failed to get recent observations" });
  }
});

// ── GET /api/executive-observation/attention — attention queue ────────────────

router.get("/attention", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const { threshold, limit } = req.query as Record<string, string | undefined>;
    const queue = await getAttentionQueue(
      userId,
      threshold ? parseFloat(threshold) : 0.7,
      limit ? parseInt(limit) : 20,
    );
    res.json({ queue });
  } catch (err) {
    res.status(500).json({ error: "Failed to get attention queue" });
  }
});

// ── GET /api/executive-observation/signals — signal feed ─────────────────────

router.get("/signals", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const { limit } = req.query as { limit?: string };
    const signals = await getSignalFeed(userId, limit ? parseInt(limit) : 50);
    res.json({ signals });
  } catch (err) {
    res.status(500).json({ error: "Failed to get signal feed" });
  }
});

// ── GET /api/executive-observation/trends — trend feed ───────────────────────

router.get("/trends", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const { limit } = req.query as { limit?: string };
    const trends = await getTrendFeed(userId, limit ? parseInt(limit) : 20);
    res.json({ trends });
  } catch (err) {
    res.status(500).json({ error: "Failed to get trend feed" });
  }
});

// ── GET /api/executive-observation/anomalies — anomaly feed ──────────────────

router.get("/anomalies", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const { unresolvedOnly, limit } = req.query as Record<string, string | undefined>;
    const anomalies = await getAnomalyFeed(
      userId,
      unresolvedOnly !== "false",
      limit ? parseInt(limit) : 20,
    );
    res.json({ anomalies });
  } catch (err) {
    res.status(500).json({ error: "Failed to get anomaly feed" });
  }
});

// ── GET /api/executive-observation/chains — observation chains ────────────────

router.get("/chains", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const { isActive, limit } = req.query as Record<string, string | undefined>;
    const chains = await listChains({
      userId,
      isActive: isActive !== undefined ? isActive !== "false" : true,
      limit: limit ? parseInt(limit) : 20,
    });
    res.json({ chains });
  } catch (err) {
    res.status(500).json({ error: "Failed to list chains" });
  }
});

// ── GET /api/executive-observation/diagnostics ────────────────────────────────

router.get("/diagnostics", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const diagnostics = await getObservationDiagnostics(userId);
    res.json({ diagnostics });
  } catch (err) {
    res.status(500).json({ error: "Failed to get diagnostics" });
  }
});

// ── POST /api/executive-observation/analyze/trends — run trend analysis ───────
// Runs trend detection over recent observations and persists detected trends.

router.post("/analyze/trends", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const { windowHours = "24", limit = "200" } = req.body as Record<string, string | number>;
    const windowMs = Number(windowHours) * 3_600_000;
    const windowEndAt = new Date();
    const windowStartAt = new Date(windowEndAt.getTime() - windowMs);

    const observations = await listObservations({
      userId,
      since: windowStartAt,
      limit: Number(limit),
    });

    const detected = detectAllTrends({
      observations,
      windowStartAt,
      windowEndAt,
    });

    const persisted = await Promise.all(
      detected.map((t) =>
        insertTrend(userId, t, windowStartAt, windowEndAt, observations.length),
      ),
    );

    res.json({ detected: persisted.length, trends: persisted });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Trend analysis failed" });
  }
});

// ── POST /api/executive-observation/analyze/anomalies — run anomaly detection ─

router.post("/analyze/anomalies", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const { windowHours = "2", limit = "100" } = req.body as Record<string, string | number>;
    const windowMs = Number(windowHours) * 3_600_000;
    const since = new Date(Date.now() - windowMs);

    const observations = await listObservations({ userId, since, limit: Number(limit) });
    const detected = detectAllAnomalies(observations);

    const persisted = await Promise.all(
      detected.map((a) => insertAnomaly(userId, a)),
    );

    res.json({ detected: persisted.length, anomalies: persisted });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Anomaly analysis failed" });
  }
});

// ── GET /api/executive-observation/:id — single observation ───────────────────

router.get("/:id", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const observation = await getObservation(req.params.id!);
    if (!observation || observation.userId !== userId) {
      res.status(404).json({ error: "Observation not found" });
      return;
    }
    res.json({ observation });
  } catch (err) {
    res.status(500).json({ error: "Failed to get observation" });
  }
});

// ── GET /api/executive-observation/:id/correlations ───────────────────────────

router.get("/:id/correlations", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const observation = await getObservation(req.params.id!);
    if (!observation || observation.userId !== userId) {
      res.status(404).json({ error: "Observation not found" });
      return;
    }
    const correlations = await getCorrelationsForObservation(req.params.id!);
    res.json({ correlations });
  } catch (err) {
    res.status(500).json({ error: "Failed to get correlations" });
  }
});

// ── GET /api/executive-observation/chains/:chainId ────────────────────────────

router.get("/chains/:chainId", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const chain = await getChain(req.params.chainId!);
    if (!chain || chain.userId !== userId) {
      res.status(404).json({ error: "Chain not found" });
      return;
    }
    res.json({ chain });
  } catch (err) {
    res.status(500).json({ error: "Failed to get chain" });
  }
});

// ── GET /api/executive-observation/chains/:chainId/observations ───────────────

router.get("/chains/:chainId/observations", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const chain = await getChain(req.params.chainId!);
    if (!chain || chain.userId !== userId) {
      res.status(404).json({ error: "Chain not found" });
      return;
    }
    const { limit } = req.query as { limit?: string };
    const observations = await getChainObservations(req.params.chainId!, limit ? parseInt(limit) : 100);
    res.json({ chain, observations });
  } catch (err) {
    res.status(500).json({ error: "Failed to get chain observations" });
  }
});

export default router;
