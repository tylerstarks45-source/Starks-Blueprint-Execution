// ─── Build 018: Simulation Orchestrator ──────────────────────────────────────
//
// Orchestrates a full future state simulation run:
//   1. Reads opportunities (Build 017) and latest analysis (Build 016)
//   2. Generates scenario inputs from top opportunities
//   3. Runs all 7 engines per scenario (impact, kpi, health, assumption, risk, outcome, branches)
//   4. Assembles full SimulationReport
//   5. Persists to all 8 tables

import { randomUUID } from "crypto";
import { generateScenarioInputs } from "./scenario-generation-engine";
import { estimateBusinessImpact, computeExpectedValueScore } from "./business-impact-engine";
import { projectKpis } from "./kpi-projection-engine";
import { projectHealth } from "./health-projection-engine";
import { generateAssumptions } from "./assumption-engine";
import { projectRisks } from "./risk-projection-engine";
import { computeOutcomes, buildBranches } from "./outcome-engine";
import { buildSimulationReport, buildSimulationSummaryForEB } from "./simulation-report-engine";
import {
  persistSimulationReport, persistScenarios, persistBranches, persistAssumptions,
  persistSimulationEvidence, persistOutcomes, persistSimulationSnapshot,
  upsertSimulationRegistry, getLatestSimulationReport, getSimulationRegistry,
} from "./simulation-registry";
import { listOpportunities, getLatestOpportunityReport } from "../opportunity-discovery/opportunity-registry";
import { getLatestReport as getLatestAnalysisReport } from "../business-analysis/analysis-registry";
import { getLatestHealth } from "../business-graph/business-registry";
import { getBusiness } from "../business-graph/business-registry";
import type {
  FutureScenario, ScenarioInput, ScenarioType, SimulationEvidence,
  SimulationReport, SimulationSummary,
} from "./types";
import { logger } from "../logger";

const uid = (p: string) => `${p}_${randomUUID().replace(/-/g, "").slice(0, 18)}`;

// ── Build evidence from opportunity ──────────────────────────────────────────

function buildEvidenceForScenario(
  input: ScenarioInput,
  scenarioId: string,
  businessId: number,
  analysisReportId: string | null,
  now: Date,
): SimulationEvidence[] {
  const evidence: SimulationEvidence[] = [];
  if (input.opportunityId !== "baseline") {
    evidence.push({
      id: uid("sev"),
      scenarioId, businessId,
      evidenceType: "opportunity",
      referenceId: input.opportunityId,
      referenceType: "executive_opportunity",
      description: `Opportunity: ${input.opportunityTitle} (composite ${(input.compositeScore * 100).toFixed(0)}%, impact ${(input.businessImpact * 100).toFixed(0)}%)`,
      weight: 0.9,
      createdAt: now,
    });
  }
  if (analysisReportId) {
    evidence.push({
      id: uid("sev"),
      scenarioId, businessId,
      evidenceType: "analysis_finding",
      referenceId: analysisReportId,
      referenceType: "business_analysis_report",
      description: `Business analysis report used as simulation baseline`,
      weight: 0.8,
      createdAt: now,
    });
  }
  return evidence;
}

// ── Main simulation run ───────────────────────────────────────────────────────

export async function runFutureSimulation(
  businessId: number,
  userId: number,
): Promise<SimulationReport | null> {
  const startMs = Date.now();

  try {
    const [business, opportunities, analysisReport, latestHealth, oppReport] = await Promise.all([
      getBusiness(businessId),
      listOpportunities(businessId, 20),
      getLatestAnalysisReport(businessId),
      getLatestHealth(businessId),
      getLatestOpportunityReport(businessId),
    ]);

    if (!business) {
      logger.warn({ businessId }, "Future Simulation: business not found");
      return null;
    }

    // Build current health dimension map for health projection baseline
    const currentHealthMap: Record<string, number | null> = {};
    if (latestHealth) {
      const dims = ["financial", "operational", "growth", "product", "marketing", "sales", "executive"];
      const dimValues: number[] = [
        latestHealth.financialHealth, latestHealth.operationalHealth,
        latestHealth.growthHealth, latestHealth.productHealth,
        latestHealth.marketingHealth, latestHealth.salesHealth,
        latestHealth.executiveHealth,
      ] as any;
      dims.forEach((d, i) => { currentHealthMap[d] = dimValues[i] ?? null; });
    }

    const reportId = uid("simrep");
    const now = new Date();

    // ── 1. Generate scenario inputs from opportunities ──────────────────────────
    const inputs = generateScenarioInputs(opportunities);

    // ── 2. Build each scenario ─────────────────────────────────────────────────
    const allScenarios: FutureScenario[] = [];
    const allBranches: import("./types").ScenarioBranch[] = [];
    const allAssumptions: import("./types").SimulationAssumption[] = [];
    const allEvidence: SimulationEvidence[] = [];
    const allOutcomes: import("./types").SimulationOutcome[] = [];

    for (const input of inputs) {
      const scenarioId = uid("scen");

      // Run engines
      const impact = estimateBusinessImpact(input);
      const kpiProjections = projectKpis(input);
      const healthProjections = projectHealth(input, currentHealthMap);
      const riskSummary = projectRisks(input);
      const assumptions = generateAssumptions(input, scenarioId, businessId, now);
      const outcomes = computeOutcomes(input, scenarioId, businessId, impact, healthProjections, kpiProjections, riskSummary, now);
      const branches = buildBranches(outcomes, scenarioId, businessId, input, now);
      const evidence = buildEvidenceForScenario(input, scenarioId, businessId, analysisReport?.id ?? null, now);

      // Compute summary scores
      const expectedValueScore = computeExpectedValueScore(impact, input.confidence);
      const overallRisk = riskSummary.overallRisk;
      const avgAssumptionConf = assumptions.length > 0 ? assumptions.reduce((s, a) => s + a.confidence, 0) / assumptions.length : 0.7;

      const outcomeSummary: Record<string, number> = {};
      for (const o of outcomes) { outcomeSummary[o.outcomeType] = o.valueScore; }

      const scenario: FutureScenario = {
        id: scenarioId,
        businessId,
        reportId,
        userId,
        opportunityId: input.opportunityId !== "baseline" ? input.opportunityId : null,
        scenarioName: input.opportunityTitle,
        scenarioDescription: `Future state scenario for category "${input.category}", derived from opportunity: ${input.opportunityTitle}. Discovery source: ${input.discoverySource}.`,
        scenarioType: input.category,
        status: "generated",
        businessImpactSummary: impact,
        kpiProjectionSummary: kpiProjections,
        healthProjectionSummary: healthProjections,
        outcomeSummary,
        riskSummary,
        overallConfidence: parseFloat(Math.min(input.confidence * avgAssumptionConf * 1.1, 0.90).toFixed(4)),
        expectedValueScore,
        growthPotential: parseFloat(Math.max(0, Math.min(1, impact.customerGrowth + impact.revenue)).toFixed(4)),
        automationPotential: parseFloat(Math.max(0, Math.min(1, impact.automation + impact.operationalCapacity * 0.5)).toFixed(4)),
        riskScore: parseFloat(Math.max(0, Math.min(1, overallRisk + Math.max(0, impact.risk))).toFixed(4)),
        executionComplexity: input.estimatedEffort,
        assumptionCount: assumptions.length,
        evidenceCount: evidence.length,
        branches,
        assumptions,
        evidence,
        outcomes,
        analysisReportId: analysisReport?.id ?? null,
        createdAt: now,
        updatedAt: now,
      };

      allScenarios.push(scenario);
      allBranches.push(...branches);
      allAssumptions.push(...assumptions);
      allEvidence.push(...evidence);
      allOutcomes.push(...outcomes);
    }

    // ── 3. Build report ────────────────────────────────────────────────────────
    const report = buildSimulationReport({
      reportId, businessId, userId, scenarios: allScenarios,
      durationMs: Date.now() - startMs,
      analysisReportId: analysisReport?.id ?? null,
      opportunityReportId: oppReport?.id ?? null,
      now,
    });

    // ── 4. Persist (order matters: report → scenarios → then branches/assumptions/evidence/outcomes parallel) ──
    await persistSimulationReport(report);
    await persistScenarios(allScenarios);
    await Promise.all([
      persistBranches(allBranches),
      persistAssumptions(allAssumptions),
      persistSimulationEvidence(allEvidence),
      persistOutcomes(allOutcomes),
      persistSimulationSnapshot({
        businessId, reportId, scenarioCount: allScenarios.length,
        avgConfidence: report.avgConfidence, avgRisk: report.avgRisk,
        highestValueScenarioId: report.highestValueScenarioId,
        typeDistribution: allScenarios.reduce<Record<string, number>>((d, s) => { d[s.scenarioType] = (d[s.scenarioType] ?? 0) + 1; return d; }, {}),
        statusDistribution: { generated: allScenarios.length },
        now,
      }),
    ]);

    await upsertSimulationRegistry({
      businessId, userId: userId, reportId,
      totalNew: allScenarios.length,
      highestValueScenarioId: report.highestValueScenarioId,
      latestConfidence: report.avgConfidence,
      latestAvgRisk: report.avgRisk,
    });

    logger.info({ businessId, userId, reportId, scenarios: allScenarios.length, durationMs: Date.now() - startMs }, "Future Simulation: run complete");
    return report;
  } catch (err) {
    logger.warn({ err, businessId }, "Future Simulation: run failed (non-fatal)");
    return null;
  }
}

// ── EB summary ────────────────────────────────────────────────────────────────

export async function fetchSimulationSummaryForEB(userId: number): Promise<SimulationSummary | null> {
  try {
    const { db } = await import("@workspace/db");
    const { businessesTable } = await import("@workspace/db/schema");
    const { eq, desc } = await import("drizzle-orm");
    const bizRows = await db.select().from(businessesTable)
      .where(eq(businessesTable.ownerId, userId))
      .orderBy(desc(businessesTable.updatedAt)).limit(1);
    if (!bizRows[0]) return null;
    const report = await getLatestSimulationReport(bizRows[0].id);
    if (!report) return null;
    return buildSimulationSummaryForEB(report);
  } catch (err) {
    logger.warn({ err }, "Future Simulation: fetchSimulationSummaryForEB failed (non-fatal)");
    return null;
  }
}
