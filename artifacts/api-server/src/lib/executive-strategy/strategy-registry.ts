// ─── Build 020: Executive Strategy — Registry (DB Persistence) ───────────────
//
// All DB read/write logic for the 8 strategy tables lives here.

import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import {
  strategyReportsTable,
  executiveStrategiesTable,
  strategicPillarsTable,
  strategicObjectivesTable,
  strategicDependenciesTable,
  strategicConstraintsTable,
  strategySnapshotsTable,
  strategyRegistryTable,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import type {
  StrategyReport,
  ExecutiveStrategy,
  StrategicPillar,
  StrategicObjective,
  StrategicDependency,
  StrategicConstraint,
} from "./types";

// ── Save strategy_reports (anchor — FIRST) ────────────────────────────────

export async function saveStrategyReport(report: StrategyReport): Promise<void> {
  const s = report.strategy;
  const totalObjectives = s.pillars.reduce((sum, p) => sum + p.objectives.length, 0);
  await db.insert(strategyReportsTable).values({
    id: report.id,
    businessId: report.businessId,
    userId: report.userId,
    decisionReportId: report.decisionReportId,
    primaryStrategyId: s.id,
    strategyCount: 1,
    pillarCount: s.pillars.length,
    objectiveCount: totalObjectives,
    dependencyCount: s.dependencies.length,
    constraintCount: s.constraints.length,
    overallAlignmentScore: report.overallAlignmentScore,
    overallConfidence: report.overallConfidence,
    completenessScore: report.completenessScore,
    businessValueScore: report.businessValueScore,
    sustainabilityScore: report.sustainabilityScore,
    executiveSummary: report.executiveSummary,
    strategyDurationMs: report.strategyDurationMs,
  });
}

// ── Save executive_strategies ─────────────────────────────────────────────

export async function saveStrategy(strategy: ExecutiveStrategy): Promise<void> {
  await db.insert(executiveStrategiesTable).values({
    id: strategy.id,
    reportId: strategy.reportId,
    businessId: strategy.businessId,
    userId: strategy.userId,
    decisionId: strategy.decisionId,
    scenarioType: strategy.scenarioType,
    strategyName: strategy.strategyName,
    strategyDescription: strategy.strategyDescription,
    strategicVision: strategy.strategicVision,
    competitivePositioning: strategy.competitivePositioning,
    timeHorizon: strategy.timeHorizon,
    alignmentScore: strategy.evaluation.alignmentScore,
    confidenceScore: strategy.evaluation.confidenceScore,
    completenessScore: strategy.evaluation.completenessScore,
    businessValueScore: strategy.evaluation.businessValueScore,
    sustainabilityScore: strategy.evaluation.sustainabilityScore,
    riskScore: strategy.evaluation.riskScore,
    pillarCount: strategy.pillars.length,
    objectiveCount: strategy.pillars.reduce((s, p) => s + p.objectives.length, 0),
  });
}

// ── Save strategic_pillars ────────────────────────────────────────────────

export async function savePillars(pillars: StrategicPillar[]): Promise<void> {
  if (pillars.length === 0) return;
  await db.insert(strategicPillarsTable).values(
    pillars.map((p) => ({
      id: p.id,
      strategyId: p.strategyId,
      reportId: p.reportId,
      businessId: p.businessId,
      pillarType: p.pillarType,
      pillarName: p.pillarName,
      pillarDescription: p.pillarDescription,
      priority: p.priority,
      weight: p.weight,
      alignmentScore: p.alignmentScore,
      objectiveCount: p.objectives.length,
    })),
  );
}

// ── Save strategic_objectives ─────────────────────────────────────────────

export async function saveObjectives(objectives: StrategicObjective[]): Promise<void> {
  if (objectives.length === 0) return;
  await db.insert(strategicObjectivesTable).values(
    objectives.map((o) => ({
      id: o.id,
      pillarId: o.pillarId,
      strategyId: o.strategyId,
      reportId: o.reportId,
      businessId: o.businessId,
      objectiveName: o.objectiveName,
      objectiveDescription: o.objectiveDescription,
      successCriteria: o.successCriteria,
      timeframe: o.timeframe,
      priority: o.priority,
      alignmentScore: o.alignmentScore,
      confidence: o.confidence,
      businessImpact: o.businessImpact,
    })),
  );
}

// ── Save strategic_dependencies ───────────────────────────────────────────

export async function saveDependencies(deps: StrategicDependency[]): Promise<void> {
  if (deps.length === 0) return;
  await db.insert(strategicDependenciesTable).values(
    deps.map((d) => ({
      id: d.id,
      strategyId: d.strategyId,
      reportId: d.reportId,
      businessId: d.businessId,
      dependencyType: d.dependencyType,
      title: d.title,
      description: d.description,
      severity: d.severity,
      mitigationNote: d.mitigationNote,
    })),
  );
}

// ── Save strategic_constraints ────────────────────────────────────────────

export async function saveConstraints(constraints: StrategicConstraint[]): Promise<void> {
  if (constraints.length === 0) return;
  await db.insert(strategicConstraintsTable).values(
    constraints.map((c) => ({
      id: c.id,
      strategyId: c.strategyId,
      reportId: c.reportId,
      businessId: c.businessId,
      constraintType: c.constraintType,
      title: c.title,
      description: c.description,
      impact: c.impact,
      adaptationNote: c.adaptationNote,
    })),
  );
}

// ── Save strategy_snapshots ───────────────────────────────────────────────

export async function saveStrategySnapshot(report: StrategyReport): Promise<void> {
  const s = report.strategy;
  const dist: Record<string, number> = {};
  for (const p of s.pillars) dist[p.pillarType] = (dist[p.pillarType] ?? 0) + 1;

  await db.insert(strategySnapshotsTable).values({
    id: randomUUID(),
    businessId: report.businessId,
    reportId: report.id,
    primaryStrategyId: s.id,
    pillarCount: s.pillars.length,
    objectiveCount: s.pillars.reduce((sum, p) => sum + p.objectives.length, 0),
    overallConfidence: report.overallConfidence,
    overallAlignmentScore: report.overallAlignmentScore,
    pillarTypeDistribution: dist as any,
  });
}

// ── Upsert strategy_registry ──────────────────────────────────────────────

export async function upsertStrategyRegistry(report: StrategyReport): Promise<void> {
  const existing = await db
    .select()
    .from(strategyRegistryTable)
    .where(eq(strategyRegistryTable.businessId, report.businessId))
    .limit(1);

  const s = report.strategy;
  const totalObjectives = s.pillars.reduce((sum, p) => sum + p.objectives.length, 0);

  if (existing.length === 0) {
    await db.insert(strategyRegistryTable).values({
      id: randomUUID(),
      businessId: report.businessId,
      userId: report.userId,
      totalStrategies: 1,
      totalReports: 1,
      latestReportId: report.id,
      latestStrategyId: s.id,
      latestScenarioType: s.scenarioType,
      latestConfidence: report.overallConfidence,
      latestAlignmentScore: report.overallAlignmentScore,
      latestPillarCount: s.pillars.length,
      latestObjectiveCount: totalObjectives,
      lastStrategyAt: new Date(),
    });
  } else {
    const row = existing[0]!;
    await db
      .update(strategyRegistryTable)
      .set({
        totalStrategies: (row.totalStrategies ?? 0) + 1,
        totalReports: (row.totalReports ?? 0) + 1,
        latestReportId: report.id,
        latestStrategyId: s.id,
        latestScenarioType: s.scenarioType,
        latestConfidence: report.overallConfidence,
        latestAlignmentScore: report.overallAlignmentScore,
        latestPillarCount: s.pillars.length,
        latestObjectiveCount: totalObjectives,
        lastStrategyAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(strategyRegistryTable.businessId, report.businessId));
  }
}

// ── Read helpers ──────────────────────────────────────────────────────────

export async function getLatestStrategyReport(businessId: number) {
  const rows = await db
    .select()
    .from(strategyReportsTable)
    .where(eq(strategyReportsTable.businessId, businessId))
    .orderBy(desc(strategyReportsTable.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getStrategyByReport(reportId: string) {
  const rows = await db
    .select()
    .from(executiveStrategiesTable)
    .where(eq(executiveStrategiesTable.reportId, reportId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getStrategyPillars(strategyId: string) {
  return db
    .select()
    .from(strategicPillarsTable)
    .where(eq(strategicPillarsTable.strategyId, strategyId))
    .orderBy(strategicPillarsTable.priority);
}

export async function getPillarObjectives(pillarId: string) {
  return db
    .select()
    .from(strategicObjectivesTable)
    .where(eq(strategicObjectivesTable.pillarId, pillarId))
    .orderBy(strategicObjectivesTable.priority);
}

export async function getStrategyDependencies(strategyId: string) {
  return db
    .select()
    .from(strategicDependenciesTable)
    .where(eq(strategicDependenciesTable.strategyId, strategyId));
}

export async function getStrategyConstraints(strategyId: string) {
  return db
    .select()
    .from(strategicConstraintsTable)
    .where(eq(strategicConstraintsTable.strategyId, strategyId));
}

export async function getStrategyRegistry(businessId: number) {
  const rows = await db
    .select()
    .from(strategyRegistryTable)
    .where(eq(strategyRegistryTable.businessId, businessId))
    .limit(1);
  return rows[0] ?? null;
}

export async function listStrategyReports(businessId: number) {
  return db
    .select()
    .from(strategyReportsTable)
    .where(eq(strategyReportsTable.businessId, businessId))
    .orderBy(desc(strategyReportsTable.createdAt));
}
