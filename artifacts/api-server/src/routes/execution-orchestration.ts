// ─────────────────────────────────────────────────────────────────────────────
// Build 024: Execution Orchestration Engine — REST Routes
// 10 endpoints covering orchestration plan/assignments/owners/queues/policies/readiness.
// All require active authentication.
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from "express";
import { db } from "@workspace/db";
import {
  executionReports,
  executionPlans,
  executionOwners,
  executionAssignments,
  executionQueues,
  executionPolicies,
  executionReadiness,
  executionOrchestrationRegistry,
} from "@workspace/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { requireAuthActive } from "../lib/auth";
import { runExecutionOrchestration } from "../lib/execution-orchestration/execution-orchestration-orchestrator";

const router = Router();

// p() coercion helper
const p = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? "") : (v ?? "");

// ── POST /orchestrate/:businessId ─────────────────────────────────────────────
router.post("/orchestrate/:businessId", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const businessId = parseInt(p(req.params["businessId"]), 10);
  if (isNaN(businessId)) {
    res.status(400).json({ error: "Invalid businessId" });
    return;
  }

  try {
    const summary = await runExecutionOrchestration({ userId, businessId });
    if (!summary) {
      res.status(422).json({ error: "Execution orchestration could not complete — no operational plan found for this business." });
      return;
    }
    res.status(200).json({ summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Execution orchestration failed" });
  }
});

// ── GET /businesses/:businessId/reports ───────────────────────────────────────
router.get("/businesses/:businessId/reports", async (req, res) => {
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
      .from(executionReports)
      .where(eq(executionReports.businessId, businessId))
      .orderBy(desc(executionReports.createdAt))
      .limit(20);
    res.status(200).json({ reports: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch execution reports" });
  }
});

// ── GET /reports/:reportId ────────────────────────────────────────────────────
router.get("/reports/:reportId", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const reportId = p(req.params["reportId"]);
  try {
    const rows = await db.select().from(executionReports).where(eq(executionReports.id, reportId)).limit(1);
    if (!rows[0]) {
      res.status(404).json({ error: "Report not found" });
      return;
    }
    res.status(200).json({ report: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch report" });
  }
});

// ── GET /plans/:planId ────────────────────────────────────────────────────────
router.get("/plans/:planId", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const planId = p(req.params["planId"]);
  try {
    const rows = await db.select().from(executionPlans).where(eq(executionPlans.id, planId)).limit(1);
    if (!rows[0]) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }
    res.status(200).json({ plan: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch plan" });
  }
});

// ── GET /plans/:planId/assignments ────────────────────────────────────────────
router.get("/plans/:planId/assignments", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const planId = p(req.params["planId"]);
  try {
    const rows = await db
      .select()
      .from(executionAssignments)
      .where(eq(executionAssignments.planId, planId))
      .orderBy(asc(executionAssignments.sequencePosition));
    res.status(200).json({ assignments: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
});

// ── GET /plans/:planId/owners ─────────────────────────────────────────────────
router.get("/plans/:planId/owners", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const planId = p(req.params["planId"]);
  try {
    const rows = await db.select().from(executionOwners).where(eq(executionOwners.planId, planId));
    res.status(200).json({ owners: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch owners" });
  }
});

// ── GET /plans/:planId/queues ─────────────────────────────────────────────────
router.get("/plans/:planId/queues", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const planId = p(req.params["planId"]);
  try {
    const rows = await db
      .select()
      .from(executionQueues)
      .where(eq(executionQueues.planId, planId))
      .orderBy(asc(executionQueues.queuePosition));
    res.status(200).json({ queues: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch execution queues" });
  }
});

// ── GET /plans/:planId/policies ───────────────────────────────────────────────
router.get("/plans/:planId/policies", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const planId = p(req.params["planId"]);
  try {
    const rows = await db.select().from(executionPolicies).where(eq(executionPolicies.planId, planId));
    res.status(200).json({ policies: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch policies" });
  }
});

// ── GET /plans/:planId/readiness ──────────────────────────────────────────────
router.get("/plans/:planId/readiness", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const planId = p(req.params["planId"]);
  try {
    const rows = await db
      .select()
      .from(executionReadiness)
      .where(eq(executionReadiness.planId, planId))
      .limit(1);
    if (!rows[0]) {
      res.status(404).json({ error: "Readiness record not found" });
      return;
    }
    res.status(200).json({ readiness: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch readiness" });
  }
});

// ── GET /businesses/:businessId/registry ──────────────────────────────────────
router.get("/businesses/:businessId/registry", async (req, res) => {
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
      .from(executionOrchestrationRegistry)
      .where(eq(executionOrchestrationRegistry.businessId, businessId))
      .limit(1);
    if (!rows[0]) {
      res.status(404).json({ error: "Registry entry not found" });
      return;
    }
    res.status(200).json({ registry: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch registry" });
  }
});

export default router;
