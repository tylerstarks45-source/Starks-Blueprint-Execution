// ── Build 045: Cognitive Certification & Launch Readiness — REST Routes ────
import { Router }      from "express";
import { db }          from "@workspace/db";
import {
  certificationRuns, certificationDomains, healthChecks,
  complianceResults, launchReports, certificationRegistry,
  certificationSnapshots, administratorSignoffs,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";
import { runFullCertification }    from "../lib/certification/cert-orchestrator";
import { buildAdminCertificationPackage } from "../lib/certification/cert-admin-engine";
import { validateArchitecture }    from "../lib/certification/cert-validation-engine";
import { checkAllLaws }            from "../lib/certification/cert-law-engine";
import { validateDependencies }    from "../lib/certification/cert-dependency-engine";
import { measureAllDomainHealth }  from "../lib/certification/cert-health-engine";
import { computeLaunchReadiness }  from "../lib/certification/cert-launch-engine";

export const certificationRouter = Router();

// ── POST /certification/run ────────────────────────────────────────────────
// Trigger a full certification run (admin only).
certificationRouter.post("/run", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  try {
    const runName = (req.body as any)?.runName ?? `Certification Run — ${new Date().toISOString()}`;
    const { runId, summary, adminPackage } = await runFullCertification({
      runName,
      triggeredBy: caller.id,
    });
    res.json({ success: true, runId, summary, adminPackage });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "certification run failed" });
  }
});

// ── POST /certification/launch-report ─────────────────────────────────────
// Generate a launch readiness report from the latest or specified run.
certificationRouter.post("/launch-report", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  try {
    // Run all checks to produce a fresh report
    const [domainResults, lawResults, dependencyResults, healthMetrics] = await Promise.all([
      validateArchitecture(),
      checkAllLaws(),
      validateDependencies(),
      measureAllDomainHealth(),
    ]);
    const launchReadiness = computeLaunchReadiness({ domainResults, lawResults, dependencyResults, healthMetrics });
    const adminPackage    = buildAdminCertificationPackage({ domainResults, lawResults, dependencyResults, healthMetrics, launchReadiness });
    res.json({ success: true, launchReadiness, adminPackage });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "launch report failed" });
  }
});

// ── POST /certification/revalidate ────────────────────────────────────────
// Re-run validation for a specific domain or all domains.
certificationRouter.post("/revalidate", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  try {
    const domainResults = await validateArchitecture();
    const lawResults    = await checkAllLaws();
    res.json({
      success:     true,
      domainCount: domainResults.length,
      passed:      domainResults.filter((d) => d.status === "pass").length,
      failed:      domainResults.filter((d) => d.status === "fail").length,
      warned:      domainResults.filter((d) => d.status === "warning").length,
      lawCompliant:lawResults.filter((l) => l.compliant).length,
      lawTotal:    lawResults.length,
      domains:     domainResults,
      laws:        lawResults,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "revalidation failed" });
  }
});

// ── GET /certification/results ─────────────────────────────────────────────
certificationRouter.get("/results", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  try {
    const runs = await db.select().from(certificationRuns).orderBy(desc(certificationRuns.createdAt)).limit(10);
    res.json({ success: true, runs, count: runs.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "fetch failed" });
  }
});

// ── GET /certification/domains ─────────────────────────────────────────────
certificationRouter.get("/domains", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  try {
    const rawRunId = req.query["runId"];
    let domains;
    if (rawRunId) {
      const runId = parseInt(String(rawRunId), 10);
      domains = await db.select().from(certificationDomains).where(eq(certificationDomains.runId, runId));
    } else {
      domains = await db.select().from(certificationDomains).orderBy(desc(certificationDomains.createdAt)).limit(100);
    }
    res.json({ success: true, domains, count: domains.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "fetch failed" });
  }
});

// ── GET /certification/compliance ──────────────────────────────────────────
certificationRouter.get("/compliance", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  try {
    const results = await db.select().from(complianceResults).orderBy(desc(complianceResults.measuredAt)).limit(100);
    const compliant = results.filter((r) => r.compliant).length;
    res.json({ success: true, results, compliant, total: results.length, complianceRate: results.length > 0 ? compliant / results.length : 0 });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "fetch failed" });
  }
});

// ── GET /certification/health ──────────────────────────────────────────────
certificationRouter.get("/health", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  try {
    const checks = await db.select().from(healthChecks).orderBy(desc(healthChecks.measuredAt)).limit(100);
    const avgScore = checks.length > 0
      ? checks.reduce((s, c) => s + (c.healthScore ?? 0), 0) / checks.length
      : 0;
    res.json({ success: true, checks, avgScore, count: checks.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "fetch failed" });
  }
});

// ── GET /certification/registry ────────────────────────────────────────────
certificationRouter.get("/registry", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  try {
    const registry = await db.select().from(certificationRegistry).orderBy(certificationRegistry.domain);
    res.json({ success: true, registry, count: registry.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "fetch failed" });
  }
});

// ── GET /certification/snapshots ───────────────────────────────────────────
certificationRouter.get("/snapshots", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  try {
    const snapshots = await db.select().from(certificationSnapshots).orderBy(desc(certificationSnapshots.createdAt)).limit(20);
    res.json({ success: true, snapshots, count: snapshots.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "fetch failed" });
  }
});

// ── GET /certification/signoffs ────────────────────────────────────────────
certificationRouter.get("/signoffs", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  try {
    const signoffs = await db.select().from(administratorSignoffs).orderBy(desc(administratorSignoffs.createdAt)).limit(20);
    res.json({ success: true, signoffs, count: signoffs.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "fetch failed" });
  }
});
