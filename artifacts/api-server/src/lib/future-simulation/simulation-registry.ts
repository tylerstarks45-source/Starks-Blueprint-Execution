// ─── Build 018: Simulation Registry — DB Persistence ─────────────────────────
//
// All DB persistence for the Future State Simulation Engine.
// All tables are append-only/immutable except simulation_registry (upserted).

import { db } from "@workspace/db";
import {
  futureScenariosTable,
  scenarioBranchesTable,
  simulationReportsTable,
  simulationAssumptionsTable,
  simulationEvidenceTable,
  simulationOutcomesTable,
  simulationSnapshotsTable,
  simulationRegistryTable,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import type {
  FutureScenario,
  ScenarioBranch,
  SimulationAssumption,
  SimulationEvidence,
  SimulationOutcome,
  SimulationRegistryEntry,
  SimulationReport,
} from "./types";
import { logger } from "../logger";

const uid = (p: string) => `${p}_${randomUUID().replace(/-/g, "").slice(0, 18)}`;

// ── Persist ───────────────────────────────────────────────────────────────────

export async function persistSimulationReport(report: SimulationReport): Promise<void> {
  await db.insert(simulationReportsTable).values({
    id: report.id,
    businessId: report.businessId,
    userId: report.userId ?? undefined,
    scenarioCount: report.scenarioCount,
    highestConfidenceScenarioId: report.highestConfidenceScenarioId ?? undefined,
    lowestRiskScenarioId: report.lowestRiskScenarioId ?? undefined,
    highestValueScenarioId: report.highestValueScenarioId ?? undefined,
    highestGrowthScenarioId: report.highestGrowthScenarioId ?? undefined,
    highestAutomationScenarioId: report.highestAutomationScenarioId ?? undefined,
    simulationDurationMs: report.simulationDurationMs,
    executiveSummary: report.executiveSummary,
    analysisReportId: report.analysisReportId ?? undefined,
    opportunityReportId: report.opportunityReportId ?? undefined,
    avgConfidence: report.avgConfidence ?? undefined,
    avgRisk: report.avgRisk ?? undefined,
    createdAt: report.createdAt,
  });
}

export async function persistScenarios(scenarios: FutureScenario[]): Promise<void> {
  if (scenarios.length === 0) return;
  await db.insert(futureScenariosTable).values(
    scenarios.map((s) => ({
      id: s.id,
      businessId: s.businessId,
      reportId: s.reportId,
      userId: s.userId ?? undefined,
      opportunityId: s.opportunityId ?? undefined,
      scenarioName: s.scenarioName,
      scenarioDescription: s.scenarioDescription,
      scenarioType: s.scenarioType,
      status: s.status,
      businessImpactSummary: s.businessImpactSummary as any,
      kpiProjectionSummary: s.kpiProjectionSummary as any,
      healthProjectionSummary: s.healthProjectionSummary as any,
      outcomeSummary: s.outcomeSummary as any,
      riskSummary: s.riskSummary as any,
      overallConfidence: s.overallConfidence,
      expectedValueScore: s.expectedValueScore,
      growthPotential: s.growthPotential,
      automationPotential: s.automationPotential,
      riskScore: s.riskScore,
      executionComplexity: s.executionComplexity,
      assumptionCount: s.assumptionCount,
      evidenceCount: s.evidenceCount,
      analysisReportId: s.analysisReportId ?? undefined,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })),
  );
}

export async function persistBranches(branches: ScenarioBranch[]): Promise<void> {
  if (branches.length === 0) return;
  await db.insert(scenarioBranchesTable).values(
    branches.map((b) => ({
      id: b.id,
      scenarioId: b.scenarioId,
      businessId: b.businessId,
      branchType: b.branchType,
      description: b.description,
      probability: b.probability,
      valueScore: b.valueScore,
      keyDrivers: b.keyDrivers as any,
      keyRisks: b.keyRisks as any,
      kpiImpact: b.kpiImpact as any,
      healthImpact: b.healthImpact as any,
      financialImpact: b.financialImpact as any,
      createdAt: b.createdAt,
    })),
  );
}

export async function persistAssumptions(assumptions: SimulationAssumption[]): Promise<void> {
  if (assumptions.length === 0) return;
  await db.insert(simulationAssumptionsTable).values(
    assumptions.map((a) => ({
      id: a.id, scenarioId: a.scenarioId, businessId: a.businessId,
      assumptionType: a.assumptionType, title: a.title, description: a.description,
      confidence: a.confidence, createdAt: a.createdAt,
    })),
  );
}

export async function persistSimulationEvidence(evidence: SimulationEvidence[]): Promise<void> {
  if (evidence.length === 0) return;
  await db.insert(simulationEvidenceTable).values(
    evidence.map((e) => ({
      id: e.id, scenarioId: e.scenarioId, businessId: e.businessId,
      evidenceType: e.evidenceType, referenceId: e.referenceId,
      referenceType: e.referenceType, description: e.description,
      weight: e.weight, createdAt: e.createdAt,
    })),
  );
}

export async function persistOutcomes(outcomes: SimulationOutcome[]): Promise<void> {
  if (outcomes.length === 0) return;
  await db.insert(simulationOutcomesTable).values(
    outcomes.map((o) => ({
      id: o.id, scenarioId: o.scenarioId, businessId: o.businessId,
      outcomeType: o.outcomeType, probability: o.probability,
      kpiImpact: o.kpiImpact as any, healthImpact: o.healthImpact as any,
      financialImpact: o.financialImpact as any, operationalImpact: o.operationalImpact as any,
      riskImpact: o.riskImpact as any, confidence: o.confidence,
      knownUnknowns: o.knownUnknowns as any, valueScore: o.valueScore,
      createdAt: o.createdAt,
    })),
  );
}

export async function persistSimulationSnapshot(opts: {
  businessId: number; reportId: string; scenarioCount: number;
  avgConfidence: number | null; avgRisk: number | null;
  highestValueScenarioId: string | null;
  typeDistribution: Record<string, number>; statusDistribution: Record<string, number>;
  now: Date;
}): Promise<void> {
  await db.insert(simulationSnapshotsTable).values({
    id: uid("ssnap"),
    businessId: opts.businessId,
    reportId: opts.reportId,
    scenarioCount: opts.scenarioCount,
    avgConfidence: opts.avgConfidence ?? undefined,
    avgRisk: opts.avgRisk ?? undefined,
    highestValueScenarioId: opts.highestValueScenarioId ?? undefined,
    scenarioTypeDistribution: opts.typeDistribution as any,
    statusDistribution: opts.statusDistribution as any,
    createdAt: opts.now,
  });
}

export async function upsertSimulationRegistry(opts: {
  businessId: number; userId: number | null; reportId: string;
  totalNew: number; highestValueScenarioId: string | null;
  latestConfidence: number | null; latestAvgRisk: number | null;
}): Promise<void> {
  const existing = await db.select({ id: simulationRegistryTable.id, totalScenarios: simulationRegistryTable.totalScenarios, totalReports: simulationRegistryTable.totalReports })
    .from(simulationRegistryTable)
    .where(eq(simulationRegistryTable.businessId, opts.businessId))
    .limit(1);
  const now = new Date();
  if (existing[0]) {
    await db.update(simulationRegistryTable).set({
      totalScenarios: (existing[0].totalScenarios ?? 0) + opts.totalNew,
      totalReports: (existing[0].totalReports ?? 0) + 1,
      latestReportId: opts.reportId,
      latestHighestValueScenarioId: opts.highestValueScenarioId ?? undefined,
      latestConfidence: opts.latestConfidence ?? undefined,
      latestAvgRisk: opts.latestAvgRisk ?? undefined,
      lastSimulatedAt: now,
      updatedAt: now,
    }).where(eq(simulationRegistryTable.businessId, opts.businessId));
  } else {
    await db.insert(simulationRegistryTable).values({
      id: uid("sreg"),
      businessId: opts.businessId,
      userId: opts.userId ?? undefined,
      totalScenarios: opts.totalNew,
      totalReports: 1,
      latestReportId: opts.reportId,
      latestHighestValueScenarioId: opts.highestValueScenarioId ?? undefined,
      latestConfidence: opts.latestConfidence ?? undefined,
      latestAvgRisk: opts.latestAvgRisk ?? undefined,
      lastSimulatedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }
}

// ── Read operations ───────────────────────────────────────────────────────────

function mapScenario(r: any): FutureScenario {
  return {
    id: r.id, businessId: r.businessId ?? r.business_id, reportId: r.reportId ?? r.report_id,
    userId: r.userId ?? r.user_id, opportunityId: r.opportunityId ?? r.opportunity_id,
    scenarioName: r.scenarioName ?? r.scenario_name, scenarioDescription: r.scenarioDescription ?? r.scenario_description,
    scenarioType: r.scenarioType ?? r.scenario_type, status: r.status,
    businessImpactSummary: r.businessImpactSummary ?? r.business_impact_summary ?? {},
    kpiProjectionSummary: r.kpiProjectionSummary ?? r.kpi_projection_summary ?? [],
    healthProjectionSummary: r.healthProjectionSummary ?? r.health_projection_summary ?? [],
    outcomeSummary: r.outcomeSummary ?? r.outcome_summary ?? {},
    riskSummary: r.riskSummary ?? r.risk_summary ?? { risks: [], overallRisk: 0.3, confidence: 0.7, knownUnknowns: [] },
    overallConfidence: r.overallConfidence ?? r.overall_confidence,
    expectedValueScore: r.expectedValueScore ?? r.expected_value_score,
    growthPotential: r.growthPotential ?? r.growth_potential,
    automationPotential: r.automationPotential ?? r.automation_potential,
    riskScore: r.riskScore ?? r.risk_score,
    executionComplexity: r.executionComplexity ?? r.execution_complexity,
    assumptionCount: r.assumptionCount ?? r.assumption_count,
    evidenceCount: r.evidenceCount ?? r.evidence_count,
    branches: [], assumptions: [], evidence: [], outcomes: [],
    analysisReportId: r.analysisReportId ?? r.analysis_report_id,
    createdAt: new Date(r.createdAt ?? r.created_at),
    updatedAt: new Date(r.updatedAt ?? r.updated_at),
  };
}

export async function getLatestSimulationReport(businessId: number): Promise<SimulationReport | null> {
  const rows = await db.select().from(simulationReportsTable)
    .where(eq(simulationReportsTable.businessId, businessId))
    .orderBy(desc(simulationReportsTable.createdAt)).limit(1);
  if (!rows[0]) return null;
  const rr = rows[0] as any;
  const reportId = rr.id;

  const scenRows = await db.select().from(futureScenariosTable)
    .where(eq(futureScenariosTable.reportId, reportId))
    .orderBy(desc(futureScenariosTable.expectedValueScore));

  return {
    id: rr.id, businessId: rr.businessId ?? rr.business_id, userId: rr.userId ?? rr.user_id,
    scenarios: scenRows.map(mapScenario),
    scenarioCount: rr.scenarioCount ?? rr.scenario_count,
    highestConfidenceScenarioId: rr.highestConfidenceScenarioId ?? rr.highest_confidence_scenario_id,
    lowestRiskScenarioId: rr.lowestRiskScenarioId ?? rr.lowest_risk_scenario_id,
    highestValueScenarioId: rr.highestValueScenarioId ?? rr.highest_value_scenario_id,
    highestGrowthScenarioId: rr.highestGrowthScenarioId ?? rr.highest_growth_scenario_id,
    highestAutomationScenarioId: rr.highestAutomationScenarioId ?? rr.highest_automation_scenario_id,
    simulationDurationMs: rr.simulationDurationMs ?? rr.simulation_duration_ms,
    executiveSummary: rr.executiveSummary ?? rr.executive_summary,
    analysisReportId: rr.analysisReportId ?? rr.analysis_report_id,
    opportunityReportId: rr.opportunityReportId ?? rr.opportunity_report_id,
    avgConfidence: rr.avgConfidence ?? rr.avg_confidence,
    avgRisk: rr.avgRisk ?? rr.avg_risk,
    createdAt: new Date(rr.createdAt ?? rr.created_at),
  };
}

export async function listSimulationReports(businessId: number, limit = 10) {
  return db.select().from(simulationReportsTable)
    .where(eq(simulationReportsTable.businessId, businessId))
    .orderBy(desc(simulationReportsTable.createdAt)).limit(limit);
}

export async function listScenarios(businessId: number, limit = 20): Promise<FutureScenario[]> {
  const rows = await db.select().from(futureScenariosTable)
    .where(eq(futureScenariosTable.businessId, businessId))
    .orderBy(desc(futureScenariosTable.expectedValueScore)).limit(limit);
  return rows.map(mapScenario);
}

export async function getScenarioById(scenarioId: string): Promise<FutureScenario | null> {
  const rows = await db.select().from(futureScenariosTable)
    .where(eq(futureScenariosTable.id, scenarioId)).limit(1);
  if (!rows[0]) return null;
  const s = mapScenario(rows[0]);
  const [branches, assumptions, evidence, outcomes] = await Promise.all([
    db.select().from(scenarioBranchesTable).where(eq(scenarioBranchesTable.scenarioId, scenarioId)),
    db.select().from(simulationAssumptionsTable).where(eq(simulationAssumptionsTable.scenarioId, scenarioId)),
    db.select().from(simulationEvidenceTable).where(eq(simulationEvidenceTable.scenarioId, scenarioId)),
    db.select().from(simulationOutcomesTable).where(eq(simulationOutcomesTable.scenarioId, scenarioId)),
  ]);
  s.branches = branches.map((b: any) => ({
    id: b.id, scenarioId: b.scenarioId ?? b.scenario_id, businessId: b.businessId ?? b.business_id,
    branchType: b.branchType ?? b.branch_type, description: b.description,
    probability: b.probability, valueScore: b.valueScore ?? b.value_score,
    keyDrivers: b.keyDrivers ?? b.key_drivers ?? [], keyRisks: b.keyRisks ?? b.key_risks ?? [],
    kpiImpact: b.kpiImpact ?? b.kpi_impact ?? {}, healthImpact: b.healthImpact ?? b.health_impact ?? {},
    financialImpact: b.financialImpact ?? b.financial_impact ?? {},
    createdAt: new Date(b.createdAt ?? b.created_at),
  }));
  s.assumptions = assumptions.map((a: any) => ({
    id: a.id, scenarioId: a.scenarioId ?? a.scenario_id, businessId: a.businessId ?? a.business_id,
    assumptionType: a.assumptionType ?? a.assumption_type, title: a.title, description: a.description,
    confidence: a.confidence, createdAt: new Date(a.createdAt ?? a.created_at),
  }));
  s.evidence = evidence.map((e: any) => ({
    id: e.id, scenarioId: e.scenarioId ?? e.scenario_id, businessId: e.businessId ?? e.business_id,
    evidenceType: e.evidenceType ?? e.evidence_type, referenceId: e.referenceId ?? e.reference_id,
    referenceType: e.referenceType ?? e.reference_type, description: e.description,
    weight: e.weight, createdAt: new Date(e.createdAt ?? e.created_at),
  }));
  s.outcomes = outcomes.map((o: any) => ({
    id: o.id, scenarioId: o.scenarioId ?? o.scenario_id, businessId: o.businessId ?? o.business_id,
    outcomeType: o.outcomeType ?? o.outcome_type, probability: o.probability,
    kpiImpact: o.kpiImpact ?? o.kpi_impact ?? {}, healthImpact: o.healthImpact ?? o.health_impact ?? {},
    financialImpact: o.financialImpact ?? o.financial_impact ?? {},
    operationalImpact: o.operationalImpact ?? o.operational_impact ?? {},
    riskImpact: o.riskImpact ?? o.risk_impact ?? {},
    confidence: o.confidence, knownUnknowns: o.knownUnknowns ?? o.known_unknowns ?? [],
    valueScore: o.valueScore ?? o.value_score,
    createdAt: new Date(o.createdAt ?? o.created_at),
  }));
  return s;
}

export async function getSimulationRegistry(businessId: number): Promise<SimulationRegistryEntry | null> {
  const rows = await db.select().from(simulationRegistryTable)
    .where(eq(simulationRegistryTable.businessId, businessId)).limit(1);
  if (!rows[0]) return null;
  const r = rows[0] as any;
  return {
    id: r.id, businessId: r.businessId ?? r.business_id, userId: r.userId ?? r.user_id,
    totalScenarios: r.totalScenarios ?? r.total_scenarios,
    totalReports: r.totalReports ?? r.total_reports,
    latestReportId: r.latestReportId ?? r.latest_report_id,
    latestHighestValueScenarioId: r.latestHighestValueScenarioId ?? r.latest_highest_value_scenario_id,
    latestConfidence: r.latestConfidence ?? r.latest_confidence,
    latestAvgRisk: r.latestAvgRisk ?? r.latest_avg_risk,
    lastSimulatedAt: r.lastSimulatedAt ?? r.last_simulated_at ? new Date(r.lastSimulatedAt ?? r.last_simulated_at) : null,
    createdAt: new Date(r.createdAt ?? r.created_at),
    updatedAt: new Date(r.updatedAt ?? r.updated_at),
  };
}

export async function listSimulationSnapshots(businessId: number, limit = 5) {
  return db.select().from(simulationSnapshotsTable)
    .where(eq(simulationSnapshotsTable.businessId, businessId))
    .orderBy(desc(simulationSnapshotsTable.createdAt)).limit(limit);
}
