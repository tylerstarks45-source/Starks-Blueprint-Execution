// ─────────────────────────────────────────────────────────────────────────────
// Build 022: Capability Planning Engine — Orchestrator
// Full run: reads Strategic Plan programmes → identifies capabilities →
// classifies into domains → analyses gaps → maps dependencies →
// evaluates readiness → scores → persists report.
// Fail-open at every stage.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import {
  planningRegistry,
  strategicPrograms,
  planningReports,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

import { identifyCapabilitiesForPrograms } from "./capability-identification-engine";
import { classifyIntoDomains, getUniqueDomainTypes, DOMAIN_SPECS } from "./capability-classification-engine";
import { analyseGaps, estimateCurrentMaturity } from "./gap-analysis-engine";
import { mapCapabilityDependencies } from "./capability-dependency-engine";
import { evaluateDomainReadiness } from "./capability-readiness-engine";
import { evaluateCapabilityPlan } from "./capability-evaluation-engine";
import { assembleCapabilityReport, buildCapabilitySummary } from "./capability-report-engine";
import { persistCapabilityReport, getLatestCapabilitySummary } from "./capability-registry";
import type { CapabilityDomain, CapabilityRequirement, CapabilityPlan, CapabilitySummary, CapabilityDomainType, MaturityLevel } from "./types";

const logger = { info: console.info.bind(console), warn: console.warn.bind(console) };

const MATURITY_RANK: Record<MaturityLevel, number> = { none: 0, basic: 1, defined: 2, managed: 3, optimising: 4 };
const RANK_MATURITY: MaturityLevel[] = ["none", "basic", "defined", "managed", "optimising"];

function avgMaturity(levels: MaturityLevel[]): MaturityLevel {
  if (levels.length === 0) return "none";
  const avg = levels.reduce((s, l) => s + MATURITY_RANK[l], 0) / levels.length;
  return RANK_MATURITY[Math.round(avg)] ?? "none";
}

export async function runCapabilityPlanning(params: {
  userId: number;
  businessId: number;
}): Promise<CapabilitySummary | null> {
  const { userId, businessId } = params;
  const start = Date.now();

  try {
    // ── 1. Fetch latest strategic plan for this business ──────────────────────
    const regRows = await db
      .select()
      .from(planningRegistry)
      .where(eq(planningRegistry.businessId, businessId))
      .limit(1);

    if (!regRows[0]?.latestPlanId) {
      logger.warn({ businessId }, "Capability Planning: no strategic plan found — skipping");
      return null;
    }

    const strategicPlanId = regRows[0].latestPlanId;

    // Fetch all programmes for this plan
    const programRows = await db
      .select()
      .from(strategicPrograms)
      .where(eq(strategicPrograms.planId, strategicPlanId))
      .orderBy((await import("drizzle-orm")).asc(strategicPrograms.priority));

    if (programRows.length === 0) {
      logger.warn({ businessId }, "Capability Planning: no programmes found — skipping");
      return null;
    }

    // Fetch planning report ID
    const planReportRows = await db
      .select({ id: planningReports.id })
      .from(planningReports)
      .where(eq(planningReports.businessId, businessId))
      .orderBy(desc(planningReports.createdAt))
      .limit(1);
    const planningReportId = planReportRows[0]?.id;

    const planningConfidence = regRows[0].latestConfidence ?? 0.7;

    // ── 2. Identify capabilities from programmes ──────────────────────────────
    const capabilityMap = identifyCapabilitiesForPrograms(
      programRows.map((p) => ({ id: p.id, programType: p.programType })),
    );

    // Flatten all capabilities with their programme context
    const allCapabilities: { capSpec: import("./capability-identification-engine").RequiredCapabilitySpec; programId: string; programType: string }[] = [];
    for (const [progId, caps] of capabilityMap.entries()) {
      const prog = programRows.find((p) => p.id === progId);
      for (const cap of caps) {
        allCapabilities.push({ capSpec: cap, programId: progId, programType: prog?.programType ?? "" });
      }
    }

    // ── 3. Classify into domains ──────────────────────────────────────────────
    const planId = randomUUID();
    const reportId = randomUUID(); // placeholder — will be replaced

    const domainTypes = getUniqueDomainTypes(allCapabilities.map((c) => ({ domainType: c.capSpec.domainType })));
    const domainRows = classifyIntoDomains(domainTypes, planId, reportId, businessId);
    const domainMap = new Map(domainRows.map((d) => [d.domainType, d]));

    // ── 4. Build requirements per domain + gap analysis ───────────────────────
    // Group capabilities by domain
    const capsByDomain = new Map<CapabilityDomainType, typeof allCapabilities>();
    for (const cap of allCapabilities) {
      const dt = cap.capSpec.domainType;
      if (!capsByDomain.has(dt)) capsByDomain.set(dt, []);
      capsByDomain.get(dt)!.push(cap);
    }

    const builtDomains: CapabilityDomain[] = [];
    let totalRequirementCount = 0;
    let totalGapCount = 0;
    let totalCriticalGapCount = 0;
    let totalMissingCount = 0;

    for (const domain of domainRows) {
      const dt = domain.domainType as CapabilityDomainType;
      const caps = capsByDomain.get(dt) ?? [];

      // Build requirement objects (pre-gap-analysis)
      const reqObjs: CapabilityRequirement[] = caps.map((cap, idx) => ({
        id: randomUUID(),
        domainId: domain.id,
        planId,
        reportId,
        businessId,
        programId: cap.programId,
        programType: cap.programType,
        capabilityName: cap.capSpec.capabilityName,
        capabilityDescription: cap.capSpec.capabilityDescription,
        requiredLevel: cap.capSpec.requiredLevel,
        currentLevel: estimateCurrentMaturity(dt, cap.capSpec.requiredLevel),
        gapSeverity: "medium",
        businessCriticality: cap.capSpec.businessCriticality,
        isMissing: false,
        priority: cap.capSpec.priority + (idx * 0),
        gaps: [],
      }));

      // Run gap analysis
      const gapResult = analyseGaps({
        requirements: reqObjs.map((r) => ({
          id: r.id,
          domainId: r.domainId,
          planId: r.planId,
          reportId: r.reportId,
          businessId: r.businessId,
          domainType: dt,
          capabilityName: r.capabilityName,
          requiredLevel: r.requiredLevel,
          businessCriticality: r.businessCriticality,
        })),
      });

      // Apply gap analysis results back to requirements
      const requirementsWithGaps: CapabilityRequirement[] = reqObjs.map((req) => {
        const result = gapResult.requirements.find((gr) => gr.requirementId === req.id)!;
        return {
          ...req,
          currentLevel: result.currentLevel,
          gapSeverity: result.gapSeverity,
          isMissing: result.isMissing,
          gaps: result.gaps,
        };
      });

      // Domain-level readiness
      const currentLevels = requirementsWithGaps.map((r) => r.currentLevel);
      const requiredLevels = requirementsWithGaps.map((r) => r.requiredLevel);
      const avgCurrent = avgMaturity(currentLevels);
      const avgRequired = avgMaturity(requiredLevels);
      const gapSeverityPenalty = gapResult.criticalGapCount * 0.06 + gapResult.totalGaps * 0.02;

      const readiness = evaluateDomainReadiness({
        domainId: domain.id,
        planId,
        reportId,
        businessId,
        domainType: dt,
        avgRequiredMaturity: avgRequired,
        avgCurrentMaturity: avgCurrent,
        gapSeverityPenalty: Math.min(gapSeverityPenalty, 0.30),
      });

      const maturityRankScore = { none: 0, basic: 0.25, defined: 0.5, managed: 0.75, optimising: 1.0 };
      const domainWithData: CapabilityDomain = {
        ...domain,
        requirementCount: requirementsWithGaps.length,
        gapCount: gapResult.totalGaps,
        criticalGapCount: gapResult.criticalGapCount,
        overallMaturityScore: maturityRankScore[avgCurrent] ?? 0,
        overallReadinessScore: readiness.overallReadinessScore,
        requirements: requirementsWithGaps,
        readiness,
      };

      builtDomains.push(domainWithData);
      totalRequirementCount += requirementsWithGaps.length;
      totalGapCount += gapResult.totalGaps;
      totalCriticalGapCount += gapResult.criticalGapCount;
      totalMissingCount += gapResult.missingCapabilityCount;
    }

    // ── 5. Map dependencies ───────────────────────────────────────────────────
    const dependencies = mapCapabilityDependencies({
      planId,
      reportId,
      businessId,
      activeDomainTypes: domainTypes,
    });

    // ── 6. Compute overall scores ─────────────────────────────────────────────
    const overallReadinessScore =
      builtDomains.length > 0
        ? Math.round((builtDomains.reduce((s, d) => s + (d.overallReadinessScore ?? 0), 0) / builtDomains.length) * 100) / 100
        : 0;

    const overallMaturityScore =
      builtDomains.length > 0
        ? Math.round((builtDomains.reduce((s, d) => s + (d.overallMaturityScore ?? 0), 0) / builtDomains.length) * 100) / 100
        : 0;

    // ── 7. Evaluate plan ──────────────────────────────────────────────────────
    const evaluation = evaluateCapabilityPlan({
      domainCount: builtDomains.length,
      requirementCount: totalRequirementCount,
      gapCount: totalGapCount,
      criticalGapCount: totalCriticalGapCount,
      missingCapabilityCount: totalMissingCount,
      overallReadinessScore,
      overallMaturityScore,
      planningConfidence,
      strategyConfidence: planningConfidence,
      dependencyCount: dependencies.length,
    });

    // ── 8. Assemble plan object ───────────────────────────────────────────────
    const plan: CapabilityPlan = {
      id: planId,
      reportId,
      businessId,
      userId,
      strategicPlanId,
      planningReportId: planningReportId ?? undefined,
      domainCount: builtDomains.length,
      requirementCount: totalRequirementCount,
      gapCount: totalGapCount,
      criticalGapCount: totalCriticalGapCount,
      missingCapabilityCount: totalMissingCount,
      dependencyCount: dependencies.length,
      overallReadinessScore,
      overallMaturityScore,
      coverageScore: evaluation.coverageScore,
      completenessScore: evaluation.completenessScore,
      businessImpactScore: evaluation.businessImpactScore,
      riskScore: evaluation.riskScore,
      confidence: evaluation.confidenceScore,
      domains: builtDomains,
      dependencies,
    };

    // ── 9. Assemble and persist report ────────────────────────────────────────
    const report = assembleCapabilityReport({
      businessId,
      userId,
      planningReportId: planningReportId ?? undefined,
      plan,
      evaluation,
      capabilityDurationMs: Date.now() - start,
    });

    // Propagate the real reportId from assembleCapabilityReport
    report.plan.reportId = report.id;
    for (const domain of report.plan.domains) {
      domain.reportId = report.id;
      for (const req of domain.requirements) {
        req.reportId = report.id;
        for (const gap of req.gaps) gap.reportId = report.id;
      }
      if (domain.readiness) domain.readiness.reportId = report.id;
    }
    for (const dep of report.plan.dependencies) dep.reportId = report.id;

    await persistCapabilityReport(report);

    const summary = buildCapabilitySummary(report);

    logger.info(
      { businessId, reportId: report.id, domainCount: builtDomains.length, requirementCount: totalRequirementCount, gapCount: totalGapCount, criticalGapCount: totalCriticalGapCount },
      "Capability Planning: run complete",
    );

    return summary;
  } catch (err) {
    logger.warn({ err, businessId }, "Capability Planning: orchestrator run failed (fail-open)");
    return null;
  }
}

export async function fetchCapabilitySummaryForEB(userId: number): Promise<CapabilitySummary | null> {
  try {
    return await getLatestCapabilitySummary(userId);
  } catch (err) {
    logger.warn({ err }, "Capability Planning: failed to fetch summary for EB (fail-open)");
    return null;
  }
}
