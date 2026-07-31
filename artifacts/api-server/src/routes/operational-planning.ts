// ─────────────────────────────────────────────────────────────────────────────
// Build 023: Operational Planning Engine — REST Routes
// 10 endpoints covering plan/phase/work-package/dependency/sequence/readiness.
// All require active authentication.
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from "express";
import { db } from "@workspace/db";
import {
  operationalReports,
  operationalPlans,
  operationalPhases,
  workPackages,
  executionDependencies,
  executionSequences,
  operationalReadiness,
  operationalRegistry,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuthActive } from "../lib/auth";
import { runOperationalPlanning } from "../lib/operational-planning/operational-orchestrator";

const router = Router();

// p() coercion helper — Express params typed as string | string[]
const p = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? "") : (v ?? "");

// ── POST /plan-operations/:businessId ─────────────────────────────────────────
// Trigger a full operational planning run for a business.
router.post("/plan-operations/:businessId", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const businessId = parseInt(p(req.params["businessId"]), 10);
  if (isNaN(businessId)) {
    res.status(400).json({ error: "Invalid businessId" });
    return;
  }

  try {
    const summary = await runOperationalPlanning({ userId, businessId });
    if (!summary) {
      res.status(422).json({ error: "Operational planning could not complete — no capability plan found for this business." });
      return;
    }
    res.status(200).json({ summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Operational planning failed" });
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
      .from(operationalReports)
      .where(eq(operationalReports.businessId, businessId))
      .orderBy(desc(operationalReports.createdAt))
      .limit(20);
    res.status(200).json({ reports: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch operational reports" });
  }
});

// ── GET /reports/:reportId ────────────────────────────────────────────────────
router.get("/reports/:reportId", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const reportId = p(req.params["reportId"]);
  try {
    const rows = await db
      .select()
      .from(operationalReports)
      .where(eq(operationalReports.id, reportId))
      .limit(1);
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
    const rows = await db
      .select()
      .from(operationalPlans)
      .where(eq(operationalPlans.id, planId))
      .limit(1);
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

// ── GET /plans/:planId/phases ─────────────────────────────────────────────────
router.get("/plans/:planId/phases", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const planId = p(req.params["planId"]);
  try {
    const rows = await db
      .select()
      .from(operationalPhases)
      .where(eq(operationalPhases.planId, planId))
      .orderBy(operationalPhases.phaseOrder);
    res.status(200).json({ phases: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch phases" });
  }
});

// ── GET /plans/:planId/work-packages ──────────────────────────────────────────
router.get("/plans/:planId/work-packages", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const planId = p(req.params["planId"]);
  try {
    const rows = await db
      .select()
      .from(workPackages)
      .where(eq(workPackages.planId, planId))
      .orderBy(workPackages.sequencePosition, workPackages.priority);
    res.status(200).json({ workPackages: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch work packages" });
  }
});

// ── GET /plans/:planId/dependencies ───────────────────────────────────────────
router.get("/plans/:planId/dependencies", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const planId = p(req.params["planId"]);
  try {
    const rows = await db
      .select()
      .from(executionDependencies)
      .where(eq(executionDependencies.planId, planId))
      .orderBy(executionDependencies.severity);
    res.status(200).json({ dependencies: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch dependencies" });
  }
});

// ── GET /plans/:planId/sequences ──────────────────────────────────────────────
router.get("/plans/:planId/sequences", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const planId = p(req.params["planId"]);
  try {
    const rows = await db
      .select()
      .from(executionSequences)
      .where(eq(executionSequences.planId, planId))
      .orderBy(executionSequences.sequencePosition);
    res.status(200).json({ sequences: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch execution sequences" });
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
      .from(operationalReadiness)
      .where(eq(operationalReadiness.planId, planId))
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
      .from(operationalRegistry)
      .where(eq(operationalRegistry.businessId, businessId))
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
