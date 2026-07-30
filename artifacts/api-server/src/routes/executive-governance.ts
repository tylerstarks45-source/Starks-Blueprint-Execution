// ─── Executive Governance Routes (Build 014) ─────────────────────────────────
//
// REST API for the Executive Governance & Adaptation Engine.
// All routes require authentication.
// Governance NEVER changes facts — it only authorizes behavior.

import { Router } from "express";
import { requireAuthActive } from "../lib/auth";
import {
  getPolicy,
  listPolicies,
  getApprovedPolicies,
  searchPolicies,
  getActiveProfile,
  getProfile,
  listProfiles,
  getLatestSnapshot,
  listSnapshots,
  getPlan,
  listPlans,
  getGovernanceReport,
  listGovernanceReports,
  getConflicts,
  getPolicyVersions,
  getPolicyDecisions,
  getGovernanceSummary,
  getGovernanceDiagnostics,
  executeRollback,
} from "../lib/executive-governance/governance-registry";
import { runGovernanceCycle } from "../lib/executive-governance/governance-orchestrator";
import { buildRollbackSummary } from "../lib/executive-governance/rollback-engine";
import { logger } from "../lib/logger";

const router = Router();

// ── POST /api/executive-governance/cycles — run a governance cycle ─────────────

router.post("/cycles", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const { principleLimit } = req.body as { principleLimit?: number };
    const result = await runGovernanceCycle({ userId, principleLimit });

    if (!result) {
      res.status(422).json({
        error: "No validated principles available for governance. Run a learning cycle first.",
      });
      return;
    }

    res.status(201).json({
      report: result.report,
      approvedPolicyCount: result.approvedPolicies.length,
      rejectedPolicyCount: result.rejectedPolicies.length,
      deferredCount: result.deferredCount,
      conflictsFound: result.conflictsFound.length,
      adaptationPlanId: result.adaptationPlan?.id ?? null,
      activeProfileType: result.activeProfile?.profileType ?? null,
      snapshotId: result.snapshotId,
    });
  } catch (err: any) {
    logger.error({ err }, "POST /api/executive-governance/cycles failed");
    res.status(500).json({ error: err.message ?? "Governance cycle failed" });
  }
});

// ── GET /api/executive-governance/summary ─────────────────────────────────────

router.get("/summary", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const summary = await getGovernanceSummary(userId);
    res.json({ summary });
  } catch (err) {
    res.status(500).json({ error: "Failed to get summary" });
  }
});

// ── GET /api/executive-governance/diagnostics ─────────────────────────────────

router.get("/diagnostics", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const diagnostics = await getGovernanceDiagnostics(userId);
    res.json({ diagnostics });
  } catch (err) {
    res.status(500).json({ error: "Failed to get diagnostics" });
  }
});

// ── GET /api/executive-governance/policies ────────────────────────────────────

router.get("/policies", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const { status, limit } = req.query as { status?: string; limit?: string };
    const policies = await listPolicies({ userId, status: status as any, limit: limit ? parseInt(limit) : 100 });
    res.json({ policies });
  } catch (err) {
    res.status(500).json({ error: "Failed to list policies" });
  }
});

// ── GET /api/executive-governance/policies/approved ───────────────────────────

router.get("/policies/approved", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const policies = await getApprovedPolicies(userId);
    res.json({ policies });
  } catch (err) {
    res.status(500).json({ error: "Failed to get approved policies" });
  }
});

// ── GET /api/executive-governance/policies/search ────────────────────────────

router.get("/policies/search", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const { q, limit } = req.query as { q?: string; limit?: string };
    if (!q) {
      res.status(400).json({ error: "Query parameter 'q' is required" });
      return;
    }
    const policies = await searchPolicies({ userId, query: q, limit: limit ? parseInt(limit) : 20 });
    res.json({ policies });
  } catch (err) {
    res.status(500).json({ error: "Failed to search policies" });
  }
});

// ── GET /api/executive-governance/policies/:id ────────────────────────────────

router.get("/policies/:id", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const policy = await getPolicy(req.params.id!);
    if (!policy || policy.userId !== userId) {
      res.status(404).json({ error: "Policy not found" });
      return;
    }
    res.json({ policy });
  } catch (err) {
    res.status(500).json({ error: "Failed to get policy" });
  }
});

// ── GET /api/executive-governance/policies/:id/versions ──────────────────────

router.get("/policies/:id/versions", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const policy = await getPolicy(req.params.id!);
    if (!policy || policy.userId !== userId) {
      res.status(404).json({ error: "Policy not found" });
      return;
    }
    const versions = await getPolicyVersions(req.params.id!);
    res.json({ versions });
  } catch (err) {
    res.status(500).json({ error: "Failed to get versions" });
  }
});

// ── GET /api/executive-governance/policies/:id/decisions ─────────────────────

router.get("/policies/:id/decisions", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const policy = await getPolicy(req.params.id!);
    if (!policy || policy.userId !== userId) {
      res.status(404).json({ error: "Policy not found" });
      return;
    }
    const decisions = await getPolicyDecisions(req.params.id!);
    res.json({ decisions });
  } catch (err) {
    res.status(500).json({ error: "Failed to get decisions" });
  }
});

// ── GET /api/executive-governance/profiles ────────────────────────────────────

router.get("/profiles", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const profiles = await listProfiles(userId);
    res.json({ profiles });
  } catch (err) {
    res.status(500).json({ error: "Failed to list profiles" });
  }
});

// ── GET /api/executive-governance/profiles/active ────────────────────────────

router.get("/profiles/active", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const profile = await getActiveProfile(userId);
    res.json({ profile });
  } catch (err) {
    res.status(500).json({ error: "Failed to get active profile" });
  }
});

// ── GET /api/executive-governance/profiles/:id ───────────────────────────────

router.get("/profiles/:id", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const profile = await getProfile(req.params.id!);
    if (!profile || profile.userId !== userId) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    res.json({ profile });
  } catch (err) {
    res.status(500).json({ error: "Failed to get profile" });
  }
});

// ── GET /api/executive-governance/plans ───────────────────────────────────────

router.get("/plans", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const { limit } = req.query as { limit?: string };
    const plans = await listPlans(userId, limit ? parseInt(limit) : 10);
    res.json({ plans });
  } catch (err) {
    res.status(500).json({ error: "Failed to list plans" });
  }
});

// ── GET /api/executive-governance/plans/:id ──────────────────────────────────

router.get("/plans/:id", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const plan = await getPlan(req.params.id!);
    if (!plan || plan.userId !== userId) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }
    res.json({ plan });
  } catch (err) {
    res.status(500).json({ error: "Failed to get plan" });
  }
});

// ── GET /api/executive-governance/reports ────────────────────────────────────

router.get("/reports", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const { limit } = req.query as { limit?: string };
    const reports = await listGovernanceReports(userId, limit ? parseInt(limit) : 10);
    res.json({ reports });
  } catch (err) {
    res.status(500).json({ error: "Failed to list reports" });
  }
});

// ── GET /api/executive-governance/reports/:id ────────────────────────────────

router.get("/reports/:id", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const report = await getGovernanceReport(req.params.id!);
    if (!report || report.userId !== userId) {
      res.status(404).json({ error: "Report not found" });
      return;
    }
    res.json({ report });
  } catch (err) {
    res.status(500).json({ error: "Failed to get report" });
  }
});

// ── GET /api/executive-governance/conflicts ───────────────────────────────────

router.get("/conflicts", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const { resolved } = req.query as { resolved?: string };
    const conflicts = await getConflicts(userId, resolved === "true");
    res.json({ conflicts });
  } catch (err) {
    res.status(500).json({ error: "Failed to get conflicts" });
  }
});

// ── GET /api/executive-governance/snapshots ───────────────────────────────────

router.get("/snapshots", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const { limit } = req.query as { limit?: string };
    const snapshots = await listSnapshots(userId, limit ? parseInt(limit) : 10);
    res.json({ snapshots });
  } catch (err) {
    res.status(500).json({ error: "Failed to list snapshots" });
  }
});

// ── GET /api/executive-governance/snapshots/latest ───────────────────────────

router.get("/snapshots/latest", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const snapshot = await getLatestSnapshot(userId);
    res.json({ snapshot });
  } catch (err) {
    res.status(500).json({ error: "Failed to get latest snapshot" });
  }
});

// ── POST /api/executive-governance/snapshots/:id/rollback ────────────────────

router.post("/snapshots/:id/rollback", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const { snapshot, restoredProfile } = await executeRollback(req.params.id!, userId);
    const summary = buildRollbackSummary(snapshot, restoredProfile);
    res.json({ snapshot, restoredProfile, summary });
  } catch (err: any) {
    logger.error({ err }, "POST /api/executive-governance/snapshots/:id/rollback failed");
    res.status(500).json({ error: err.message ?? "Rollback failed" });
  }
});

// ── GET /api/executive-governance/policy-types ────────────────────────────────

router.get("/policy-types", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  res.json({
    policyTypes: [
      "planning_guidance", "execution_guidance", "judgment_guidance",
      "goal_prioritization", "execution_strategy", "context_weighting", "general",
    ],
  });
});

// ── GET /api/executive-governance/profile-types ───────────────────────────────

router.get("/profile-types", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  res.json({
    profileTypes: ["conservative", "balanced", "aggressive", "experimental", "custom"],
  });
});

export default router;
