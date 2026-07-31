// ─────────────────────────────────────────────────────────────────────────────
// Build 022: Capability Planning Engine — Registry (DB Persistence Layer)
// All INSERT / UPSERT for all 8 tables.
// FK insertion order: capability_reports → capability_plans → capability_domains
//   → capability_requirements → capability_gaps → capability_dependencies
//   → capability_readiness → capability_registry
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@workspace/db";
import {
  capabilityReports,
  capabilityPlans,
  capabilityDomains,
  capabilityRequirements,
  capabilityGaps,
  capabilityDependencies,
  capabilityReadiness,
  capabilityRegistry,
} from "@workspace/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import type { CapabilityReport, CapabilitySummary } from "./types";

function readinessLevelFromScore(s: number) {
  if (s >= 0.80) return "optimising" as const;
  if (s >= 0.60) return "managed" as const;
  if (s >= 0.40) return "defined" as const;
  if (s >= 0.20) return "developing" as const;
  return "not_ready" as const;
}

export async function persistCapabilityReport(report: CapabilityReport): Promise<void> {
  const { plan } = report;

  // 1. capability_reports (root — first)
  await db.insert(capabilityReports).values({
    id: report.id,
    businessId: report.businessId,
    userId: report.userId ?? null,
    planningReportId: report.planningReportId ?? null,
    primaryPlanId: report.primaryPlanId,
    domainCount: report.domainCount,
    requirementCount: report.requirementCount,
    gapCount: report.gapCount,
    criticalGapCount: report.criticalGapCount,
    missingCapabilityCount: report.missingCapabilityCount,
    dependencyCount: report.dependencyCount,
    overallReadinessScore: report.overallReadinessScore,
    overallMaturityScore: report.overallMaturityScore,
    overallConfidence: report.overallConfidence,
    coverageScore: report.coverageScore,
    completenessScore: report.completenessScore,
    executiveSummary: report.executiveSummary,
    capabilityDurationMs: report.capabilityDurationMs,
  });

  // 2. capability_plans
  await db.insert(capabilityPlans).values({
    id: plan.id,
    reportId: report.id,
    businessId: plan.businessId,
    userId: plan.userId ?? null,
    strategicPlanId: plan.strategicPlanId ?? null,
    planningReportId: plan.planningReportId ?? null,
    domainCount: plan.domainCount,
    requirementCount: plan.requirementCount,
    gapCount: plan.gapCount,
    criticalGapCount: plan.criticalGapCount,
    missingCapabilityCount: plan.missingCapabilityCount,
    dependencyCount: plan.dependencyCount,
    overallReadinessScore: plan.overallReadinessScore,
    overallMaturityScore: plan.overallMaturityScore,
    coverageScore: plan.coverageScore,
    completenessScore: plan.completenessScore,
    businessImpactScore: plan.businessImpactScore,
    riskScore: plan.riskScore,
    confidence: plan.confidence,
  });

  // 3. capability_domains + nested requirements + gaps + readiness
  for (const domain of plan.domains) {
    await db.insert(capabilityDomains).values({
      id: domain.id,
      planId: domain.planId,
      reportId: domain.reportId,
      businessId: domain.businessId,
      domainType: domain.domainType,
      domainName: domain.domainName,
      domainDescription: domain.domainDescription,
      requirementCount: domain.requirementCount,
      gapCount: domain.gapCount,
      criticalGapCount: domain.criticalGapCount,
      overallMaturityScore: domain.overallMaturityScore,
      overallReadinessScore: domain.overallReadinessScore,
      businessImpact: domain.businessImpact,
      priority: domain.priority,
    });

    // 4. capability_requirements
    for (const req of domain.requirements) {
      await db.insert(capabilityRequirements).values({
        id: req.id,
        domainId: req.domainId,
        planId: req.planId,
        reportId: req.reportId,
        businessId: req.businessId,
        programId: req.programId ?? null,
        programType: req.programType ?? null,
        capabilityName: req.capabilityName,
        capabilityDescription: req.capabilityDescription,
        requiredLevel: req.requiredLevel,
        currentLevel: req.currentLevel,
        gapSeverity: req.gapSeverity,
        businessCriticality: req.businessCriticality,
        isMissing: req.isMissing ? 1 : 0,
        priority: req.priority,
      });

      // 5. capability_gaps
      for (const gap of req.gaps) {
        await db.insert(capabilityGaps).values({
          id: gap.id,
          requirementId: gap.requirementId,
          domainId: gap.domainId,
          planId: gap.planId,
          reportId: gap.reportId,
          businessId: gap.businessId,
          gapType: gap.gapType,
          gapTitle: gap.gapTitle,
          gapDescription: gap.gapDescription,
          currentState: gap.currentState,
          requiredState: gap.requiredState,
          severity: gap.severity,
          closureNote: gap.closureNote ?? null,
        });
      }
    }

    // 7. capability_readiness (per domain)
    if (domain.readiness) {
      const r = domain.readiness;
      await db.insert(capabilityReadiness).values({
        id: r.id,
        domainId: r.domainId,
        planId: r.planId,
        reportId: r.reportId,
        businessId: r.businessId,
        domainType: r.domainType,
        maturityScore: r.maturityScore,
        maturityLevel: r.maturityLevel,
        availabilityScore: r.availabilityScore,
        scalabilityScore: r.scalabilityScore,
        reliabilityScore: r.reliabilityScore,
        maintainabilityScore: r.maintainabilityScore,
        governanceScore: r.governanceScore,
        overallReadinessScore: r.overallReadinessScore,
        readinessLevel: r.readinessLevel,
        keyGap: r.keyGap ?? null,
        recommendation: r.recommendation ?? null,
      });
    }
  }

  // 6. capability_dependencies
  for (const dep of plan.dependencies) {
    await db.insert(capabilityDependencies).values({
      id: dep.id,
      planId: dep.planId,
      reportId: dep.reportId,
      businessId: dep.businessId,
      dependencyType: dep.dependencyType,
      title: dep.title,
      description: dep.description,
      fromDomainType: dep.fromDomainType ?? null,
      toDomainType: dep.toDomainType ?? null,
      severity: dep.severity,
      mitigationNote: dep.mitigationNote ?? null,
    });
  }

  // 8. capability_registry (upsert — last)
  const existing = await db.select().from(capabilityRegistry).where(eq(capabilityRegistry.businessId, report.businessId)).limit(1);
  const registryId = existing[0]?.id ?? require("crypto").randomUUID();
  const totalReports = (existing[0]?.totalReports ?? 0) + 1;
  const totalPlans = (existing[0]?.totalPlans ?? 0) + 1;

  await db
    .insert(capabilityRegistry)
    .values({
      id: registryId,
      businessId: report.businessId,
      userId: report.userId ?? null,
      totalPlans,
      totalReports,
      latestReportId: report.id,
      latestPlanId: report.primaryPlanId,
      latestDomainCount: report.domainCount,
      latestRequirementCount: report.requirementCount,
      latestGapCount: report.gapCount,
      latestCriticalGapCount: report.criticalGapCount,
      latestReadinessScore: report.overallReadinessScore,
      latestConfidence: report.overallConfidence,
      lastCapabilityAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: capabilityRegistry.businessId,
      set: {
        totalPlans,
        totalReports,
        latestReportId: report.id,
        latestPlanId: report.primaryPlanId,
        latestDomainCount: report.domainCount,
        latestRequirementCount: report.requirementCount,
        latestGapCount: report.gapCount,
        latestCriticalGapCount: report.criticalGapCount,
        latestReadinessScore: report.overallReadinessScore,
        latestConfidence: report.overallConfidence,
        lastCapabilityAt: new Date(),
        updatedAt: new Date(),
      },
    });
}

// ── Read helpers ──────────────────────────────────────────────────────────────
export async function listCapabilityReports(businessId: number) {
  return db.select().from(capabilityReports).where(eq(capabilityReports.businessId, businessId)).orderBy(desc(capabilityReports.createdAt));
}

export async function getCapabilityPlan(planId: string) {
  const rows = await db.select().from(capabilityPlans).where(eq(capabilityPlans.id, planId)).limit(1);
  return rows[0] ?? null;
}

export async function getCapabilityDomains(planId: string) {
  return db.select().from(capabilityDomains).where(eq(capabilityDomains.planId, planId)).orderBy(asc(capabilityDomains.priority));
}

export async function getCapabilityRequirements(domainId: string) {
  return db.select().from(capabilityRequirements).where(eq(capabilityRequirements.domainId, domainId)).orderBy(asc(capabilityRequirements.priority));
}

export async function getCapabilityGaps(planId: string) {
  return db.select().from(capabilityGaps).where(eq(capabilityGaps.planId, planId));
}

export async function getCapabilityDependencies(planId: string) {
  return db.select().from(capabilityDependencies).where(eq(capabilityDependencies.planId, planId));
}

export async function getCapabilityReadinessForDomain(domainId: string) {
  const rows = await db.select().from(capabilityReadiness).where(eq(capabilityReadiness.domainId, domainId)).limit(1);
  return rows[0] ?? null;
}

export async function getCapabilityRegistryEntry(businessId: number) {
  const rows = await db.select().from(capabilityRegistry).where(eq(capabilityRegistry.businessId, businessId)).limit(1);
  return rows[0] ?? null;
}

export async function getLatestCapabilitySummary(userId: number): Promise<CapabilitySummary | null> {
  const rows = await db
    .select()
    .from(capabilityReports)
    .where(eq(capabilityReports.userId, userId))
    .orderBy(desc(capabilityReports.createdAt))
    .limit(1);

  if (!rows[0]) return null;
  const r = rows[0];

  // Fetch top critical domains
  const domains = r.primaryPlanId
    ? await db
        .select({ domainName: capabilityDomains.domainName, criticalGapCount: capabilityDomains.criticalGapCount })
        .from(capabilityDomains)
        .where(eq(capabilityDomains.planId, r.primaryPlanId))
        .orderBy(desc(capabilityDomains.criticalGapCount))
        .limit(3)
    : [];

  // Highest risk gap
  let highestRiskGap: string | undefined;
  if (r.primaryPlanId) {
    const critGaps = await db
      .select({ gapTitle: capabilityGaps.gapTitle })
      .from(capabilityGaps)
      .where(eq(capabilityGaps.planId, r.primaryPlanId))
      .limit(1);
    highestRiskGap = critGaps[0]?.gapTitle;
  }

  return {
    reportId: r.id,
    planId: r.primaryPlanId ?? "",
    businessId: r.businessId,
    domainCount: r.domainCount,
    requirementCount: r.requirementCount,
    gapCount: r.gapCount,
    criticalGapCount: r.criticalGapCount,
    missingCapabilityCount: r.missingCapabilityCount,
    overallReadinessScore: r.overallReadinessScore ?? 0,
    overallReadinessLevel: readinessLevelFromScore(r.overallReadinessScore ?? 0),
    overallMaturityScore: r.overallMaturityScore ?? 0,
    overallConfidence: r.overallConfidence ?? 0,
    highestRiskGap,
    topCriticalDomains: domains.filter((d) => (d.criticalGapCount ?? 0) > 0).map((d) => d.domainName),
    coverageScore: r.coverageScore ?? 0,
    executiveSummary: r.executiveSummary,
    createdAt: r.createdAt,
  };
}
