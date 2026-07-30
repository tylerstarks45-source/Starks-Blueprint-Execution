// ─── Build 020: Executive Strategy Orchestrator ───────────────────────────────
//
// Single entry point for a full strategy run.
// Reads decision data → forms strategy → pillars → objectives → dependencies
// → constraints → alignment → evaluation → report → persists.
// NEVER plans, NEVER executes, NEVER modifies decision or simulation data.

import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import {
  decisionReportsTable,
  executiveDecisionsTable,
  decisionRegistryTable,
} from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";

import { formStrategy } from "./strategy-formation-engine";
import { generatePillars } from "./strategic-pillar-engine";
import { generateObjectives } from "./strategic-objective-engine";
import { generateDependencies } from "./strategic-dependency-engine";
import { generateConstraints } from "./strategic-constraint-engine";
import { measureAlignment } from "./strategic-alignment-engine";
import { evaluateStrategy } from "./strategy-evaluation-engine";
import { buildStrategyReport, buildStrategySummaryForEB } from "./strategy-report-engine";
import {
  saveStrategyReport,
  saveStrategy,
  savePillars,
  saveObjectives,
  saveDependencies,
  saveConstraints,
  saveStrategySnapshot,
  upsertStrategyRegistry,
  getLatestStrategyReport,
  getStrategyRegistry,
} from "./strategy-registry";

import type {
  ExecutiveStrategy,
  StrategyReport,
  StrategySummary,
  StrategyFormationInput,
} from "./types";

// ── Prerequisite helpers ───────────────────────────────────────────────────

async function fetchPrimaryDecision(businessId: number) {
  // Find latest decision report for this business
  const reports = await db
    .select()
    .from(decisionReportsTable)
    .where(eq(decisionReportsTable.businessId, businessId))
    .orderBy(desc(decisionReportsTable.createdAt))
    .limit(1);

  if (!reports[0]) return null;

  const report = reports[0];

  // Find the primary executive decision
  const decisions = await db
    .select()
    .from(executiveDecisionsTable)
    .where(
      and(
        eq(executiveDecisionsTable.reportId, report.id),
        eq(executiveDecisionsTable.decisionType, "primary"),
      ),
    )
    .limit(1);

  if (!decisions[0]) return null;

  return { report, decision: decisions[0] };
}

// ── Build StrategyFormationInput from DB rows ──────────────────────────────

function buildFormationInput(
  decisionId: string,
  scenarioType: string,
  scenarioName: string,
  selectionScore: number,
  alignmentScore: number,
  confidenceScore: number,
  riskScore: number,
  expectedValueScore: number,
  growthPotential: number,
  automationPotential: number,
): StrategyFormationInput {
  return {
    decisionId,
    scenarioType,
    scenarioName,
    selectionScore,
    alignmentScore,
    confidenceScore,
    riskScore,
    expectedValueScore,
    growthPotential: growthPotential ?? 0.5,
    automationPotential: automationPotential ?? 0.5,
  };
}

// ── Main orchestration ─────────────────────────────────────────────────────

export async function runStrategyEngine(
  businessId: number,
  userId: number,
): Promise<StrategyReport> {
  const start = Date.now();

  // 1. Prerequisite: decision data must exist
  const decisionData = await fetchPrimaryDecision(businessId);
  if (!decisionData) {
    throw Object.assign(
      new Error("No decision report found for this business. Run /api/decision-intelligence/decide first."),
      { statusCode: 422 },
    );
  }

  const { report: decisionReport, decision: primaryDecision } = decisionData;

  // 2. Build formation input
  const input = buildFormationInput(
    primaryDecision.id,
    primaryDecision.scenarioType,
    primaryDecision.scenarioName,
    primaryDecision.selectionScore,
    primaryDecision.strategicAlignmentScore,
    primaryDecision.confidenceScore,
    primaryDecision.riskScore,
    primaryDecision.expectedValueScore,
    0.5,  // growthPotential — from simulation, approximated here
    0.5,  // automationPotential — from simulation, approximated here
  );

  // 3. Form strategy
  const frame = formStrategy(input);
  const strategyId = randomUUID();
  const reportId   = randomUUID();

  // 4. Generate pillars (no DB yet — we need pillar objects to generate objectives)
  const pillars = generatePillars(strategyId, reportId, businessId, input.scenarioType);

  // 5. Generate objectives for each pillar
  for (const pillar of pillars) {
    pillar.objectives = generateObjectives(pillar);
  }

  // 6. Dependencies and Constraints
  const dependencies = generateDependencies(strategyId, reportId, businessId, input.scenarioType);
  const constraints  = generateConstraints(strategyId, reportId, businessId, input.scenarioType, input.riskScore);

  // 7. Strategic Alignment
  const { profiles: alignmentProfile, overallScore: overallAlignmentScore } = measureAlignment(input);

  // 8. Evaluation
  const evaluation = evaluateStrategy(input, pillars, dependencies, constraints, overallAlignmentScore);

  // 9. Assemble ExecutiveStrategy
  const strategy: ExecutiveStrategy = {
    id: strategyId,
    reportId,
    businessId,
    userId,
    decisionId: primaryDecision.id,
    scenarioType: input.scenarioType,
    strategyName: frame.strategyName,
    strategyDescription: frame.strategyDescription,
    strategicVision: frame.strategicVision,
    competitivePositioning: frame.competitivePositioning,
    timeHorizon: frame.timeHorizon,
    pillars,
    dependencies,
    constraints,
    alignmentProfile,
    evaluation,
    createdAt: new Date(),
  };

  // 10. Build Report
  const durationMs = Date.now() - start;
  const report = buildStrategyReport(
    reportId,
    businessId,
    userId,
    decisionReport.id,
    strategy,
    durationMs,
  );

  // 11. Persist — FK order enforced
  // strategy_reports FIRST
  await saveStrategyReport(report);

  // executive_strategies SECOND
  await saveStrategy(strategy);

  // strategic_pillars THIRD
  await savePillars(pillars);

  // strategic_objectives FOURTH (after pillars)
  const allObjectives = pillars.flatMap((p) => p.objectives);
  await saveObjectives(allObjectives);

  // strategic_dependencies FIFTH
  await saveDependencies(dependencies);

  // strategic_constraints SIXTH
  await saveConstraints(constraints);

  // strategy_snapshots SEVENTH
  await saveStrategySnapshot(report);

  // strategy_registry LAST
  await upsertStrategyRegistry(report);

  return report;
}

// ── EB Summary Fetch ───────────────────────────────────────────────────────

export async function fetchStrategySummaryForEB(businessId: number): Promise<StrategySummary | null> {
  try {
    const reg = await getStrategyRegistry(businessId);
    if (!reg?.latestReportId) return null;

    const latestReport = await getLatestStrategyReport(businessId);
    if (!latestReport) return null;

    const topPillarTypes = ["revenue_growth", "operational_excellence", "customer_experience"] as any[];

    return {
      businessId,
      scenarioType: reg.latestScenarioType ?? "unknown",
      strategyName: (reg.latestScenarioType ?? "unknown").replace(/_/g, " ") + " Strategy",
      topPillarTypes,
      alignmentScore: reg.latestAlignmentScore ?? 0,
      confidenceScore: reg.latestConfidence ?? 0,
      objectiveCount: reg.latestObjectiveCount ?? 0,
      pillarCount: reg.latestPillarCount ?? 0,
      latestReportId: reg.latestReportId,
      strategicVisionSummary: "See full strategy report for strategic vision detail.",
      lastStrategyAt: reg.lastStrategyAt ?? latestReport.createdAt,
    };
  } catch {
    return null;
  }
}
