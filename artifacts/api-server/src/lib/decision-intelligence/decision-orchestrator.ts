// ─── Build 019: Decision Intelligence Orchestrator ───────────────────────────
//
// Single entry point for a full decision run.
// Reads simulation data → compares → matrices → aligns → tradeoffs → confidence
// → selects → reports → persists.
// NEVER plans, NEVER executes, NEVER modifies simulation data.

import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import {
  simulationReportsTable,
  futureScenariosTable,
  simulationRegistryTable,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

import { compareScenarios, rankByComparisons } from "./scenario-comparison-engine";
import { computeDecisionMatrix, aggregateMatrixScores } from "./decision-matrix-engine";
import { computeStrategicAlignment } from "./strategic-alignment-engine";
import { computeTradeoffs, buildTradeoffSummary } from "./tradeoff-engine";
import { computeDecisionConfidence } from "./confidence-engine";
import { selectDecisions } from "./decision-selection-engine";
import { buildDecisionReport, buildDecisionSummaryForEB } from "./decision-report-engine";
import {
  saveDecisionReport,
  saveDecision,
  saveRationales,
  saveMatrixRows,
  saveTradeoffs,
  saveConfidence,
  saveDecisionSnapshot,
  upsertDecisionRegistry,
  getLatestDecisionReport,
  getDecisionRegistry,
} from "./decision-registry";

import type { ScoredScenario, DecisionReport, DecisionSummary, DecisionConfidenceRecord } from "./types";

// ── Prerequisite helpers ───────────────────────────────────────────────────

async function fetchSimulationReport(businessId: number) {
  const rows = await db
    .select()
    .from(simulationReportsTable)
    .where(eq(simulationReportsTable.businessId, businessId))
    .orderBy(desc(simulationReportsTable.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

async function fetchScenarios(reportId: string) {
  return db
    .select()
    .from(futureScenariosTable)
    .where(eq(futureScenariosTable.reportId, reportId));
}

// ── Map simulation scenario rows to ScoredScenario ────────────────────────

function toScoredScenario(row: typeof futureScenariosTable.$inferSelect): ScoredScenario {
  const resourceDemand = Math.min(1, row.executionComplexity * 1.1);
  // Governance compliance: treat as compliant unless risk is extreme
  const governanceCompliant = row.riskScore < 0.85;
  // Composite score: expected value weighted with growth and automation
  const compositeScore =
    row.expectedValueScore * 0.45 +
    row.growthPotential    * 0.25 +
    row.automationPotential * 0.15 +
    row.overallConfidence  * 0.10 +
    (1 - row.riskScore)    * 0.05;

  return {
    scenarioId:          row.id,
    scenarioName:        row.scenarioName,
    scenarioType:        row.scenarioType,
    expectedValueScore:  row.expectedValueScore,
    riskScore:           row.riskScore,
    overallConfidence:   row.overallConfidence,
    executionComplexity: row.executionComplexity,
    growthPotential:     row.growthPotential,
    automationPotential: row.automationPotential,
    resourceDemand,
    matrixScore:         0,  // filled after matrix computation
    alignmentScore:      0,  // filled after alignment computation
    compositeScore,
    governanceCompliant,
  };
}

// ── Main orchestration ─────────────────────────────────────────────────────

export async function runDecisionIntelligence(
  businessId: number,
  userId: number,
): Promise<DecisionReport> {
  const start = Date.now();

  // 1. Prerequisite: simulation data must exist
  const simReport = await fetchSimulationReport(businessId);
  if (!simReport) {
    throw Object.assign(
      new Error("No simulation report found for this business. Run /api/future-simulation/simulate first."),
      { statusCode: 422 },
    );
  }

  const scenarioRows = await fetchScenarios(simReport.id);
  if (scenarioRows.length === 0) {
    throw Object.assign(
      new Error("Simulation report exists but contains no scenarios. Re-run /api/future-simulation/simulate first."),
      { statusCode: 422 },
    );
  }

  // 2. Build ScoredScenario inputs
  const scenarios: ScoredScenario[] = scenarioRows.map(toScoredScenario);

  // 3. Scenario comparison (pairwise)
  const comparisons = compareScenarios(scenarios);
  const comparisonRanking = rankByComparisons(scenarios, comparisons);
  // Re-sort scenarios by comparison rank
  const scenarioMap = new Map(scenarios.map((s) => [s.scenarioId, s]));
  const ranked = comparisonRanking.map((id) => scenarioMap.get(id)!).filter(Boolean);
  // Any scenario not in ranked (tie-all edge case) appended
  for (const s of scenarios) {
    if (!ranked.find((r) => r.scenarioId === s.scenarioId)) ranked.push(s);
  }

  // 4. Decision Matrix
  const reportId = randomUUID();
  const matrixRows = computeDecisionMatrix(ranked, reportId, businessId);
  const matrixScores = aggregateMatrixScores(matrixRows);

  // 5. Strategic Alignment
  const alignments = computeStrategicAlignment(ranked);
  const alignmentMap = new Map(alignments.map((a) => [a.scenarioId, a.overallAlignmentScore]));
  const alignmentProfileMap = new Map(alignments.map((a) => [a.scenarioId, a.dimensions]));

  // 6. Enrich composite scores with matrix + alignment
  const enriched: ScoredScenario[] = ranked.map((s) => ({
    ...s,
    matrixScore:    matrixScores.get(s.scenarioId)    ?? 0,
    alignmentScore: alignmentMap.get(s.scenarioId)    ?? 0,
    compositeScore: s.compositeScore * 0.6 +
                    (matrixScores.get(s.scenarioId)   ?? 0) * 0.25 +
                    (alignmentMap.get(s.scenarioId)   ?? 0) * 0.15,
  }));

  // 7. Trade-offs (per scenario, assigned to placeholder decision IDs — real IDs set during selection)
  // We compute tradeoffs keyed by scenarioId; selection engine reassigns them to decisionIds
  const tradeoffMap = new Map<string, ReturnType<typeof computeTradeoffs>>();
  for (const s of enriched) {
    const placeholder = randomUUID();  // temporary decisionId — overwritten in selection output
    tradeoffMap.set(s.scenarioId, computeTradeoffs(s, placeholder, reportId, businessId));
  }

  // 8. Confidence (per scenario)
  const confidenceMap = new Map<string, DecisionConfidenceRecord>();
  for (const s of enriched) {
    const placeholder = randomUUID();
    const conf = computeDecisionConfidence(s, placeholder, reportId, businessId, s.governanceCompliant);
    confidenceMap.set(s.scenarioId, conf);
  }

  // 9. Decision Selection
  const decisions = selectDecisions(
    enriched,
    reportId,
    businessId,
    userId,
    alignmentMap,
    matrixScores,
    confidenceMap,
    tradeoffMap,
    alignmentProfileMap,
  );

  if (decisions.length === 0) {
    throw new Error("Decision selection produced no decisions. Check simulation data.");
  }

  // 10. Build Report
  const durationMs = Date.now() - start;
  const report = buildDecisionReport(
    reportId,
    businessId,
    userId,
    simReport.id,
    decisions,
    durationMs,
  );

  // 11. Persist (FK order enforced)
  // decision_reports FIRST
  await saveDecisionReport(report);

  // executive_decisions SECOND
  for (const d of decisions) {
    await saveDecision(d);
  }

  // Sub-records AFTER their parent decision
  for (const d of decisions) {
    await saveRationales(d.rationales);
    await saveTradeoffs(d.tradeoffs);
    await saveConfidence(d.confidence);
  }

  // Matrix rows (reference reportId only)
  await saveMatrixRows(matrixRows);

  // Snapshot AFTER report + decisions
  await saveDecisionSnapshot(report);

  // Registry LAST
  await upsertDecisionRegistry(report);

  return report;
}

// ── EB Summary Fetch ───────────────────────────────────────────────────────

export async function fetchDecisionSummaryForEB(businessId: number): Promise<DecisionSummary | null> {
  try {
    const reg = await getDecisionRegistry(businessId);
    if (!reg?.latestReportId) return null;

    const latestReport = await getLatestDecisionReport(businessId);
    if (!latestReport) return null;

    return {
      businessId,
      primaryScenarioType: reg.latestPrimaryScenarioType ?? "unknown",
      primaryScenarioName: reg.latestPrimaryScenarioType?.replace(/_/g, " ") ?? "Unknown",
      primarySelectionScore: latestReport.overallConfidence ?? 0,
      primaryAlignmentScore: latestReport.strategicAlignmentScore ?? 0,
      primaryConfidence: latestReport.overallConfidence ?? 0,
      alternativeCount: latestReport.alternativeCount ?? 0,
      rejectedCount: latestReport.rejectedCount ?? 0,
      latestReportId: reg.latestReportId,
      topTradeoffSummary: "See full decision report for trade-off detail.",
      lastDecidedAt: reg.lastDecidedAt ?? latestReport.createdAt,
    };
  } catch {
    return null;
  }
}
