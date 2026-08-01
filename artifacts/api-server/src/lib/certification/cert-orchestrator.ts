// ── Build 045: Certification Orchestrator ─────────────────────────────────
// Full certification run — coordinates all 6 engines, persists results.
// NEVER modifies platform state outside certification tables.
import { db } from "@workspace/db";
import {
  certificationRuns, certificationDomains, healthChecks, complianceResults,
  launchReports, certificationRegistry, certificationSnapshots,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { validateArchitecture }         from "./cert-validation-engine";
import { checkAllLaws, computeLawComplianceScore } from "./cert-law-engine";
import { validateDependencies, computeDependencyScore } from "./cert-dependency-engine";
import { measureAllDomainHealth, computeOverallHealthScore } from "./cert-health-engine";
import { computeLaunchReadiness }        from "./cert-launch-engine";
import { buildAdminCertificationPackage } from "./cert-admin-engine";
import type { CertificationSummary }     from "./types";
import { CERTIFICATION_DOMAINS }         from "./types";

// Run a full certification — returns the run ID and summary.
export async function runFullCertification(params: {
  runName:     string;
  triggeredBy: number;
}): Promise<{ runId: number; summary: CertificationSummary; adminPackage: ReturnType<typeof buildAdminCertificationPackage> }> {
  // 1. Create the run record
  const [run] = await db.insert(certificationRuns).values({
    runName:      params.runName,
    status:       "running",
    startedAt:    new Date(),
    triggeredBy:  params.triggeredBy,
    totalDomains: CERTIFICATION_DOMAINS.length,
    metadata:     {},
  }).returning({ id: certificationRuns.id });

  let passedDomains = 0, failedDomains = 0, warnedDomains = 0;

  try {
    // 2. Architecture validation
    const domainResults = await validateArchitecture();

    // 3. Law compliance
    const lawResults = await checkAllLaws();
    const lawScore   = computeLawComplianceScore(lawResults);

    // 4. Dependency validation
    const dependencyResults = await validateDependencies();

    // 5. Health measurement
    const healthMetrics     = await measureAllDomainHealth();
    const overallHealth     = computeOverallHealthScore(healthMetrics);

    // 6. Launch readiness
    const launchReadiness   = computeLaunchReadiness({ domainResults, lawResults, dependencyResults, healthMetrics });

    // 7. Admin certification package
    const adminPackage = buildAdminCertificationPackage({ domainResults, lawResults, dependencyResults, healthMetrics, launchReadiness });

    // 8. Persist domain results
    for (const dr of domainResults) {
      if (dr.status === "pass")    passedDomains++;
      if (dr.status === "fail")    failedDomains++;
      if (dr.status === "warning") warnedDomains++;

      await db.insert(certificationDomains).values({
        runId:       run.id,
        domainName:  dr.domain,
        status:      dr.status,
        score:       dr.score,
        findings:    dr.findings as any,
        evidence:    dr.evidence as any,
        certifiedAt: dr.status === "pass" ? new Date() : null,
      });
    }

    // 9. Persist health checks
    for (const m of healthMetrics) {
      await db.insert(healthChecks).values({
        runId:            run.id,
        domainName:       m.domain,
        checkType:        "composite",
        available:        m.available,
        latencyMs:        m.latencyMs,
        reliabilityScore: m.reliabilityScore,
        coverageScore:    m.coverageScore,
        consistencyScore: m.consistencyScore,
        confidenceScore:  m.confidenceScore,
        healthScore:      m.healthScore,
        details:          {},
      });
    }

    // 10. Persist law compliance results
    for (const lr of lawResults) {
      await db.insert(complianceResults).values({
        runId:     run.id,
        lawName:   lr.lawName,
        lawDomain: lr.domain,
        compliant: lr.compliant,
        evidence:  lr.evidence as any,
        findings:  lr.findings,
      });
    }

    // 11. Persist launch report
    await db.insert(launchReports).values({
      runId:           run.id,
      launchScore:     launchReadiness.launchScore,
      readinessLevel:  launchReadiness.readinessLevel,
      criticalIssues:  launchReadiness.criticalIssues as any,
      warnings:        launchReadiness.warnings        as any,
      recommendations: launchReadiness.recommendations as any,
      blockedItems:    launchReadiness.blockedItems    as any,
      certifiedAt:     launchReadiness.readinessLevel !== "not_ready" ? new Date() : null,
    });

    // 12. Update run to completed
    const overallScore = (
      (passedDomains / CERTIFICATION_DOMAINS.length) * 0.4 +
      lawScore * 0.3 +
      overallHealth * 0.3
    );
    await db.update(certificationRuns).set({
      status:       "completed",
      completedAt:  new Date(),
      passedDomains,
      failedDomains,
      overallScore,
    }).where(eq(certificationRuns.id, run.id));

    // 13. Upsert certification registry for all domains
    for (const dr of domainResults) {
      const existing = await db.select({ id: certificationRegistry.id })
        .from(certificationRegistry).where(eq(certificationRegistry.domain, dr.domain)).limit(1);
      if (existing.length > 0) {
        await db.update(certificationRegistry).set({
          lastRunId:   run.id,
          lastStatus:  dr.status,
          lastScore:   dr.score,
          lastChecked: new Date(),
        }).where(eq(certificationRegistry.domain, dr.domain));
      } else {
        await db.insert(certificationRegistry).values({
          domain:      dr.domain,
          lastRunId:   run.id,
          lastStatus:  dr.status,
          lastScore:   dr.score,
          lastChecked: new Date(),
        });
      }
    }

    // 14. Create snapshot
    const [snap] = await db.insert(certificationSnapshots).values({
      runId:              run.id,
      totalDomains:       CERTIFICATION_DOMAINS.length,
      passedDomains,
      failedDomains,
      warnedDomains,
      overallScore,
      readinessLevel:     launchReadiness.readinessLevel,
      lawComplianceScore: lawScore,
      launchReady:        launchReadiness.readinessLevel === "ready" || launchReadiness.readinessLevel === "certified",
      snapshotData:       {
        launchScore: launchReadiness.launchScore,
        criticalIssues: launchReadiness.criticalIssues.length,
        warnings: launchReadiness.warnings.length,
        computedAt: new Date().toISOString(),
      } as any,
    }).returning({ id: certificationSnapshots.id });

    const summary: CertificationSummary = {
      runId:              run.id,
      totalDomains:       CERTIFICATION_DOMAINS.length,
      passedDomains,
      failedDomains,
      warnedDomains,
      overallScore,
      readinessLevel:     launchReadiness.readinessLevel,
      lawComplianceScore: lawScore,
      launchReady:        launchReadiness.readinessLevel === "ready" || launchReadiness.readinessLevel === "certified",
      signoffStatus:      null,
      computedAt:         new Date(),
    };

    return { runId: run.id, summary, adminPackage };
  } catch (err) {
    await db.update(certificationRuns).set({ status: "failed", completedAt: new Date() }).where(eq(certificationRuns.id, run.id));
    throw err;
  }
}

// Lightweight read of latest snapshot for EB context.
export async function fetchCertificationSummary(): Promise<CertificationSummary | null> {
  try {
    const rows = await db.select().from(certificationSnapshots).orderBy(desc(certificationSnapshots.createdAt)).limit(1);
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      runId:              r.runId ?? null,
      totalDomains:       r.totalDomains,
      passedDomains:      r.passedDomains,
      failedDomains:      r.failedDomains,
      warnedDomains:      r.warnedDomains,
      overallScore:       r.overallScore ?? 0,
      readinessLevel:     (r.readinessLevel as any) ?? "not_ready",
      lawComplianceScore: r.lawComplianceScore ?? 0,
      launchReady:        r.launchReady ?? false,
      signoffStatus:      null,
      computedAt:         r.createdAt,
    };
  } catch {
    return null;
  }
}
