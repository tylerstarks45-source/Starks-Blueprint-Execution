// ─────────────────────────────────────────────────────────────────────────────
// Build 029: Universal Execution Engine — REST Routes (9 endpoints)
// All under /api/universal-execution
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from "express";
import { db } from "@workspace/db";
import {
  executionSessions,
  executionNodes,
  executionEvents,
  executionEvidence,
  executionTimelines,
  executionRegistry,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuthActive } from "../lib/auth";
import { executeWorkflow } from "../lib/universal-execution/execution-orchestrator";

const router = Router();
const p = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? "") : (v ?? "");

// POST /api/universal-execution/execute/:businessId
// Triggers a full execution run against the latest approved workflow.
router.post("/api/universal-execution/execute/:businessId", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const businessId = parseInt(p(req.params["businessId"]), 10);
  if (isNaN(businessId)) {
    res.status(400).json({ error: "Invalid businessId" });
    return;
  }

  try {
    const summary = await executeWorkflow({ userId, businessId });
    if (!summary) {
      res.status(422).json({ error: "No workflow found for this business. Run /build-workflow first." });
      return;
    }
    res.json({ summary });
  } catch (err) {
    res.status(500).json({ error: "Execution failed" });
  }
});

// POST /api/universal-execution/sessions/:sessionId/pause
router.post("/api/universal-execution/sessions/:sessionId/pause", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const rows = await db
      .select()
      .from(executionSessions)
      .where(eq(executionSessions.id, p(req.params["sessionId"])))
      .limit(1);
    if (!rows[0]) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    const session = rows[0];
    if (session.status !== "running" && session.status !== "waiting") {
      res.status(409).json({ error: `Cannot pause a session in state: ${session.status}` });
      return;
    }
    await db
      .update(executionSessions)
      .set({ status: "paused" })
      .where(eq(executionSessions.id, session.id));
    res.json({ sessionId: session.id, status: "paused" });
  } catch (err) {
    res.status(500).json({ error: "Failed to pause session" });
  }
});

// POST /api/universal-execution/sessions/:sessionId/resume
router.post("/api/universal-execution/sessions/:sessionId/resume", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const rows = await db
      .select()
      .from(executionSessions)
      .where(eq(executionSessions.id, p(req.params["sessionId"])))
      .limit(1);
    if (!rows[0]) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    const session = rows[0];
    if (session.status !== "paused") {
      res.status(409).json({ error: `Cannot resume a session in state: ${session.status}` });
      return;
    }
    await db
      .update(executionSessions)
      .set({ status: "running" })
      .where(eq(executionSessions.id, session.id));
    res.json({ sessionId: session.id, status: "running" });
  } catch (err) {
    res.status(500).json({ error: "Failed to resume session" });
  }
});

// POST /api/universal-execution/sessions/:sessionId/cancel
router.post("/api/universal-execution/sessions/:sessionId/cancel", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const rows = await db
      .select()
      .from(executionSessions)
      .where(eq(executionSessions.id, p(req.params["sessionId"])))
      .limit(1);
    if (!rows[0]) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    const session = rows[0];
    if (session.status === "succeeded" || session.status === "cancelled" || session.status === "rolled_back") {
      res.status(409).json({ error: `Cannot cancel a session in terminal state: ${session.status}` });
      return;
    }
    await db
      .update(executionSessions)
      .set({ status: "cancelled" })
      .where(eq(executionSessions.id, session.id));
    res.json({ sessionId: session.id, status: "cancelled" });
  } catch (err) {
    res.status(500).json({ error: "Failed to cancel session" });
  }
});

// GET /api/universal-execution/sessions/:sessionId
router.get("/api/universal-execution/sessions/:sessionId", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const rows = await db
      .select()
      .from(executionSessions)
      .where(eq(executionSessions.id, p(req.params["sessionId"])))
      .limit(1);
    if (!rows[0]) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    res.json({ session: rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch session" });
  }
});

// GET /api/universal-execution/sessions/:sessionId/events
router.get("/api/universal-execution/sessions/:sessionId/events", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const rows = await db
      .select()
      .from(executionEvents)
      .where(eq(executionEvents.sessionId, p(req.params["sessionId"])))
      .orderBy(executionEvents.createdAt);
    res.json({ events: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// GET /api/universal-execution/sessions/:sessionId/evidence
router.get("/api/universal-execution/sessions/:sessionId/evidence", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const rows = await db
      .select()
      .from(executionEvidence)
      .where(eq(executionEvidence.sessionId, p(req.params["sessionId"])))
      .orderBy(executionEvidence.createdAt);
    res.json({ evidence: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch evidence" });
  }
});

// GET /api/universal-execution/sessions/:sessionId/timeline
router.get("/api/universal-execution/sessions/:sessionId/timeline", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const rows = await db
      .select()
      .from(executionTimelines)
      .where(eq(executionTimelines.sessionId, p(req.params["sessionId"])))
      .orderBy(desc(executionTimelines.createdAt))
      .limit(1);
    if (!rows[0]) {
      res.status(404).json({ error: "No timeline found for this session" });
      return;
    }
    res.json({ timeline: rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch timeline" });
  }
});

// GET /api/universal-execution/businesses/:businessId/registry
router.get("/api/universal-execution/businesses/:businessId/registry", async (req, res) => {
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
      .from(executionRegistry)
      .where(eq(executionRegistry.businessId, businessId))
      .limit(1);
    if (!rows[0]) {
      res.status(404).json({ error: "No execution registry found for this business" });
      return;
    }
    res.json({ registry: rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch registry" });
  }
});

export default router;
