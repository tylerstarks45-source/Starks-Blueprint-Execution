import { Router }              from "express";
import { requireAdmin }        from "../lib/auth";
import { db }                  from "@workspace/db";
import { launchFindings, launchHardeningRegistry, launchVerification, launchRegression, launchSnapshots, launchRemediation } from "@workspace/db/schema";
import { eq, desc, and }       from "drizzle-orm";
import { runHardeningImport, fetchHardeningSummary } from "../lib/launch-hardening/lh-orchestrator";
import { recalculateAllPriorities }                  from "../lib/launch-hardening/lh-priority-engine";
import { computeLaunchReadiness, createLaunchSnapshot } from "../lib/launch-hardening/lh-launch-readiness-engine";
import { recordVerification }                        from "../lib/launch-hardening/lh-verification-engine";
import { getSafeRemediationOrder }                   from "../lib/launch-hardening/lh-dependency-engine";

export const launchHardeningRouter = Router();

// ── POST /launch-hardening/import-audit ──────────────────────────────────
// Imports all 43 canonical audit findings, classifies them, builds the
// dependency graph, and creates the first hardening snapshot. Idempotent.
launchHardeningRouter.post("/import-audit", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const triggerBuild = (req.body as any)?.triggerBuild ?? "045A";
    const result = await runHardeningImport(String(triggerBuild));
    res.json({
      success:           true,
      imported:          result.importResult.imported,
      skipped:           result.importResult.skipped,
      total:             result.importResult.total,
      prioritiesUpdated: result.prioritiesUpdated,
      safeOrderLength:   result.safeOrder.order.length,
      launchStatus:      result.readiness.launchStatus,
      blockersRemaining: result.readiness.blockersRemaining,
      launchConfidence:  result.readiness.launchConfidence,
      snapshotId:        result.snapshotId,
    });
  } catch (err: any) {
    res.status(500).json({ error: "import-audit failed" });
  }
});

// ── POST /launch-hardening/verify ─────────────────────────────────────────
// Records a verification outcome for a completed remediation.
launchHardeningRouter.post("/verify", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { remediationId, findingCode, verificationMethod, verificationResult, verifiedBy, verificationNotes } = (req.body ?? {}) as any;
    if (!remediationId || !findingCode || !verificationMethod || !verificationResult || !verifiedBy) {
      res.status(400).json({ error: "remediationId, findingCode, verificationMethod, verificationResult, and verifiedBy are required" });
      return;
    }
    const result = await recordVerification({
      remediationId: Number(remediationId),
      findingCode: String(findingCode),
      verificationMethod,
      verificationResult,
      verifiedBy: String(verifiedBy),
      verificationNotes: verificationNotes ?? undefined,
    });
    // Refresh snapshot after verification
    const snapshotId = await createLaunchSnapshot();
    res.json({ success: true, verificationId: result.verificationId, statusUpdated: result.statusUpdated, snapshotId });
  } catch (err: any) {
    res.status(500).json({ error: "verify failed" });
  }
});

// ── POST /launch-hardening/recalculate ────────────────────────────────────
// Recalculates all finding priorities and creates a new snapshot.
launchHardeningRouter.post("/recalculate", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { updated }  = await recalculateAllPriorities();
    const readiness    = await computeLaunchReadiness();
    const snapshotId   = await createLaunchSnapshot((req.body as any)?.triggerBuild);
    res.json({
      success:           true,
      prioritiesUpdated: updated,
      launchStatus:      readiness.launchStatus,
      blockersRemaining: readiness.blockersRemaining,
      prelaunchRemaining: readiness.prelaunchRemaining,
      launchConfidence:  readiness.launchConfidence,
      snapshotId,
    });
  } catch (err: any) {
    res.status(500).json({ error: "recalculate failed" });
  }
});

// ── GET /launch-hardening/findings ────────────────────────────────────────
// Returns all findings joined with their registry status, ordered by priority.
launchHardeningRouter.get("/findings", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const findings  = await db.select().from(launchFindings);
    const registry  = await db.select().from(launchHardeningRegistry);
    const regByCode = new Map(registry.map(r => [r.findingCode, r]));

    const result = findings.map(f => ({
      ...f,
      priority:  regByCode.get(f.findingCode)?.priority  ?? "PRE_LAUNCH",
      status:    regByCode.get(f.findingCode)?.status    ?? "open",
      dependsOn: regByCode.get(f.findingCode)?.dependsOn ?? [],
      assignedTo: regByCode.get(f.findingCode)?.assignedTo,
      targetBuild: regByCode.get(f.findingCode)?.targetBuild,
    }));

    // Sort: BLOCKER first, then PRE_LAUNCH, POST_LAUNCH, OBSERVATION; within group by severity
    const priorityOrder: Record<string, number> = { BLOCKER: 0, PRE_LAUNCH: 1, POST_LAUNCH: 2, OBSERVATION: 3 };
    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    result.sort((a, b) =>
      (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4) ||
      (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4)
    );

    res.json({ findings: result, total: result.length });
  } catch (err: any) {
    res.status(500).json({ error: "findings fetch failed" });
  }
});

// ── GET /launch-hardening/blockers ────────────────────────────────────────
// Returns all BLOCKER findings that are not yet resolved.
launchHardeningRouter.get("/blockers", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const readiness = await computeLaunchReadiness();
    res.json({
      blockersRemaining: readiness.blockersRemaining,
      launchStatus:      readiness.launchStatus,
      launchConfidence:  readiness.launchConfidence,
      blockers:          readiness.blockerDetails,
      unverifiedFixed:   readiness.unverifiedFixed,
    });
  } catch (err: any) {
    res.status(500).json({ error: "blockers fetch failed" });
  }
});

// ── GET /launch-hardening/registry ────────────────────────────────────────
// Returns the full hardening registry with current status for each finding.
launchHardeningRouter.get("/registry", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const registry = await db
      .select()
      .from(launchHardeningRegistry)
      .orderBy(launchHardeningRegistry.findingCode)
      .limit(100);
    res.json({ registry, total: registry.length });
  } catch (err: any) {
    res.status(500).json({ error: "registry fetch failed" });
  }
});

// ── GET /launch-hardening/regressions ────────────────────────────────────
// Returns regression analysis records, most recent first.
launchHardeningRouter.get("/regressions", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const regressions = await db
      .select()
      .from(launchRegression)
      .orderBy(desc(launchRegression.createdAt))
      .limit(50);
    res.json({ regressions, total: regressions.length });
  } catch (err: any) {
    res.status(500).json({ error: "regressions fetch failed" });
  }
});

// ── GET /launch-hardening/snapshots ───────────────────────────────────────
// Returns the 20 most recent hardening snapshots.
launchHardeningRouter.get("/snapshots", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const snapshots = await db
      .select()
      .from(launchSnapshots)
      .orderBy(desc(launchSnapshots.createdAt))
      .limit(20);
    res.json({ snapshots, total: snapshots.length });
  } catch (err: any) {
    res.status(500).json({ error: "snapshots fetch failed" });
  }
});

// ── GET /launch-hardening/status ──────────────────────────────────────────
// Returns a comprehensive launch readiness status — the primary dashboard.
launchHardeningRouter.get("/status", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const [readiness, safeOrder] = await Promise.all([
      computeLaunchReadiness(),
      Promise.resolve(getSafeRemediationOrder()),
    ]);
    res.json({
      launchStatus:       readiness.launchStatus,
      launchConfidence:   readiness.launchConfidence,
      totalFindings:      readiness.totalFindings,
      criticalOpen:       readiness.criticalOpen,
      highOpen:           readiness.highOpen,
      mediumOpen:         readiness.mediumOpen,
      lowOpen:            readiness.lowOpen,
      blockersRemaining:  readiness.blockersRemaining,
      prelaunchRemaining: readiness.prelaunchRemaining,
      verifiedFixed:      readiness.verifiedFixed,
      deferredCount:      readiness.deferredCount,
      acceptedRiskCount:  readiness.acceptedRiskCount,
      unverifiedFixed:    readiness.unverifiedFixed,
      safeRemediationOrder: safeOrder.order,
      independentWorkSets:  safeOrder.independentSets,
      highRegressionCount:  readiness.highRegressionItems.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: "status fetch failed" });
  }
});
