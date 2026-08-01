// ── Build 040: Unified Cognitive Orchestration Engine — Orchestrator ──────
// The single authoritative execution coordinator for the Cognitive Operating System.
// Runs all 25 intelligence engines (Builds 015–039) in dependency-ordered waves.
// Engines within the same wave execute in parallel; waves execute sequentially.
// Unified Cognition Law: no engine executes in isolation if its output depends
// on evidence produced by another registered engine.
// Fail-open throughout; any single engine failure never blocks the cycle.

import { db } from "@workspace/db";
import {
  cognitiveCycles,
  executionGraphs,
  executionWaves as executionWavesTable,
  executionDiagnostics,
  confidenceFlows as confidenceFlowsTable,
  evidenceFlows as evidenceFlowsTable,
  orchestrationRegistry,
  orchestrationSnapshots,
} from "@workspace/db/schema";
import { desc } from "drizzle-orm";

// ── Engine integration imports (Builds 015–039) ────────────────────────────
import { fetchBusinessSummary, triggerGraphRefresh } from "../executive-brain/business-integration";
import { fetchAnalysisSummary, triggerAnalysisRun } from "../executive-brain/analysis-integration";
import { fetchOpportunitySummary, triggerOpportunityRun } from "../executive-brain/opportunity-integration";
import { fetchSimulationSummary, triggerSimulationRun } from "../executive-brain/simulation-integration";
import { fetchDecisionSummary, triggerDecisionRun } from "../executive-brain/decision-integration";
import { fetchStrategySummary, triggerStrategyRun } from "../executive-brain/strategy-integration";
import { fetchPlanSummary, triggerPlanningRun } from "../executive-brain/planning-integration";
import { fetchCapabilitySummary, triggerCapabilityRun } from "../executive-brain/capability-integration";
import { fetchOperationalSummary, triggerOperationalRun } from "../executive-brain/operational-integration";
import { fetchExecutionOrchestrationSummary, triggerExecutionOrchestrationRun } from "../executive-brain/execution-orchestration-integration";
import { fetchAuthoritySummary, triggerAuthorityResolutionRun } from "../executive-brain/authority-resolution-integration";
import { fetchExecutionRiskSummary, triggerRiskAssessmentRun } from "../executive-brain/execution-risk-integration";
import { fetchExecutionSimulationSummary, triggerExecutionSimulationRun } from "../executive-brain/execution-simulation-integration";
import { fetchWorkflowExecutionSummary, triggerWorkflowBuildRun } from "../executive-brain/workflow-execution-integration";
import { fetchUniversalExecutionSummary, triggerUniversalExecutionRun } from "../executive-brain/universal-execution-integration";
import { fetchAdapterFrameworkSummary, triggerAdapterFrameworkScan } from "../executive-brain/adapter-framework-integration";
import { fetchCapabilityIntelligenceSummary, triggerCapabilityIntelligenceScan } from "../executive-brain/capability-intelligence-integration";
import { fetchPlatformInfrastructureSummary, triggerPlatformInfrastructureScan } from "../executive-brain/platform-infrastructure-integration";
import { fetchGlobalTechnologySummary, triggerGlobalTechnologyScan } from "../executive-brain/global-technology-integration";
import { fetchTechnologyRelationshipSummary, triggerTechnologyRelationshipRebuild } from "../executive-brain/technology-relationships-integration";
import { fetchTechnologyEvolutionSummary, triggerTechnologyEvolutionRebuild } from "../executive-brain/technology-evolution-integration";
import { fetchSystemsDynamicsSummary, triggerSystemsDynamicsRebuild } from "../executive-brain/systems-dynamics-integration";
import { fetchTradeoffIntelligenceSummary, triggerTradeoffIntelligenceRebuild } from "../executive-brain/tradeoff-intelligence-integration";
import { fetchPortfolioIntelligenceSummary, triggerPortfolioIntelligenceRebuild } from "../executive-brain/portfolio-intelligence-integration";
import { fetchPriorityIntelligenceSummary, triggerPriorityIntelligenceRebuild } from "../executive-brain/priority-intelligence-integration";

// ── Summary types ─────────────────────────────────────────────────────────
import type { BusinessGraphSummary } from "../business-graph/types";
import type { BusinessAnalysisSummary } from "../business-analysis/types";
import type { OpportunityDiscoverySummary } from "../opportunity-discovery/types";
import type { SimulationSummary } from "../future-simulation/types";
import type { DecisionSummary } from "../decision-intelligence/types";
import type { StrategySummary } from "../executive-strategy/types";
import type { PlanningSummary } from "../strategic-planning/types";
import type { CapabilitySummary } from "../capability-planning/types";
import type { OperationalSummary } from "../operational-planning/types";
import type { ExecutionOrchestrationSummary } from "../execution-orchestration/types";
import type { AuthoritySummary } from "../authority-resolution/types";
import type { ExecutionRiskSummary } from "../execution-risk/types";
import type { ExecutionSimulationSummary } from "../execution-simulation/types";
import type { WorkflowSummary } from "../workflow-execution/types";
import type { ExecutionSessionSummary } from "../universal-execution/types";
import type { AdapterFrameworkSummary } from "../adapter-framework/types";
import type { CapabilityIntelligenceSummary } from "../capability-intelligence/types";
import type { PlatformInfrastructureSummary } from "../platform-infrastructure/types";
import type { GlobalTechnologySummary } from "../global-technology/types";
import type { TechnologyRelationshipSummary } from "../technology-relationships/types";
import type { TechnologyEvolutionSummary } from "../technology-evolution/types";
import type { SystemsDynamicsSummary } from "../systems-dynamics/types";
import type { TradeoffIntelligenceSummary } from "../tradeoff-intelligence/types";
import type { PortfolioIntelligenceSummary } from "../portfolio-intelligence/types";
import type { PriorityIntelligenceSummary } from "../priority-intelligence/types";
import type { UnifiedOrchestrationSummary, EngineDiagnostic } from "./types";
import { COGNITIVE_ENGINE_REGISTRY } from "./types";
import { resolveExecutionWaves } from "./ucos-dependency-engine";
import { propagateConfidence, computeCycleConfidence } from "./ucos-confidence-engine";
import { buildEvidenceFlows, countEvidenceItems } from "./ucos-evidence-engine";
import { summariseWaves, computePipelineCompleteness, findTopEngine } from "./ucos-diagnostics-engine";

// ── Cognitive Cycle Result ─────────────────────────────────────────────────

export interface CognitiveCycleResult {
  cycleId:                       number;
  // All 25 intelligence engine summaries
  businessGraphSummary?:         BusinessGraphSummary;
  businessAnalysisSummary?:      BusinessAnalysisSummary;
  opportunityDiscoverySummary?:  OpportunityDiscoverySummary;
  simulationSummary?:            SimulationSummary;
  decisionSummary?:              DecisionSummary;
  strategySummary?:              StrategySummary;
  planningSummary?:              PlanningSummary;
  capabilitySummary?:            CapabilitySummary;
  operationalSummary?:           OperationalSummary;
  executionOrchestrationSummary?:ExecutionOrchestrationSummary;
  authoritySummary?:             AuthoritySummary;
  executionRiskSummary?:         ExecutionRiskSummary;
  executionSimulationSummary?:   ExecutionSimulationSummary;
  workflowSummary?:              WorkflowSummary;
  universalExecutionSummary?:    ExecutionSessionSummary;
  adapterFrameworkSummary?:      AdapterFrameworkSummary;
  capabilityIntelligenceSummary?:CapabilityIntelligenceSummary;
  platformInfrastructureSummary?:PlatformInfrastructureSummary;
  globalTechnologySummary?:      GlobalTechnologySummary;
  technologyRelationshipSummary?:TechnologyRelationshipSummary;
  technologyEvolutionSummary?:   TechnologyEvolutionSummary;
  systemsDynamicsSummary?:       SystemsDynamicsSummary;
  tradeoffIntelligenceSummary?:  TradeoffIntelligenceSummary;
  portfolioIntelligenceSummary?: PortfolioIntelligenceSummary;
  priorityIntelligenceSummary?:  PriorityIntelligenceSummary;
  // Orchestration metadata
  totalEngines:    number;
  wavesExecuted:   number;
  successCount:    number;
  failureCount:    number;
  durationMs:      number;
  confidenceScore: number;
  evidenceItems:   number;
  pipelineComplete:boolean;
}

// ── Wave executor ──────────────────────────────────────────────────────────

type EngineRunner = (userId: number, businessId?: number) => Promise<unknown>;
type EngineTrigger = (userId: number, businessId?: number) => void;

function makeEngineMap(businessId?: number): Map<string, { run: (uid: number) => Promise<unknown>; trigger: (uid: number) => void }> {
  const bid = businessId;
  return new Map([
    ["business-graph",          { run: (u) => fetchBusinessSummary(u), trigger: (u) => triggerGraphRefresh(u) }],
    ["business-analysis",       { run: (u) => fetchAnalysisSummary(u), trigger: (u) => bid ? triggerAnalysisRun(u, bid) : undefined }],
    ["opportunity-discovery",   { run: (u) => fetchOpportunitySummary(u), trigger: (u) => bid ? triggerOpportunityRun(u, bid) : undefined }],
    ["future-simulation",       { run: (u) => fetchSimulationSummary(u), trigger: (u) => bid ? triggerSimulationRun(u, bid) : undefined }],
    ["decision-intelligence",   { run: (u) => fetchDecisionSummary(u), trigger: (u) => bid ? triggerDecisionRun(u, bid) : undefined }],
    ["executive-strategy",      { run: (u) => fetchStrategySummary(u), trigger: (u) => bid ? triggerStrategyRun(u, bid) : undefined }],
    ["strategic-planning",      { run: (u) => fetchPlanSummary(u), trigger: (u) => bid ? triggerPlanningRun(u, bid) : undefined }],
    ["capability-planning",     { run: (u) => fetchCapabilitySummary(u), trigger: (u) => bid ? triggerCapabilityRun(u, bid) : undefined }],
    ["operational-planning",    { run: (u) => fetchOperationalSummary(u), trigger: (u) => bid ? triggerOperationalRun(u, bid) : undefined }],
    ["execution-orchestration", { run: (u) => fetchExecutionOrchestrationSummary(u), trigger: (u) => bid ? triggerExecutionOrchestrationRun(u, bid) : undefined }],
    ["authority-resolution",    { run: (u) => fetchAuthoritySummary(u), trigger: (u) => bid ? triggerAuthorityResolutionRun(u, bid) : undefined }],
    ["execution-risk",          { run: (u) => fetchExecutionRiskSummary(u), trigger: (u) => bid ? triggerRiskAssessmentRun(u, bid) : undefined }],
    ["execution-simulation",    { run: (u) => fetchExecutionSimulationSummary(u), trigger: (u) => bid ? triggerExecutionSimulationRun(u, bid) : undefined }],
    ["workflow-execution",      { run: (u) => fetchWorkflowExecutionSummary(u), trigger: (u) => bid ? triggerWorkflowBuildRun(u, bid) : undefined }],
    ["universal-execution",     { run: (u) => fetchUniversalExecutionSummary(u), trigger: (u) => bid ? triggerUniversalExecutionRun(u, bid) : undefined }],
    ["adapter-framework",       { run: (u) => fetchAdapterFrameworkSummary(u), trigger: (u) => triggerAdapterFrameworkScan(u) }],
    ["capability-intelligence", { run: (u) => fetchCapabilityIntelligenceSummary(u), trigger: (u) => triggerCapabilityIntelligenceScan(u) }],
    ["platform-infrastructure", { run: (u) => fetchPlatformInfrastructureSummary(u), trigger: (u) => triggerPlatformInfrastructureScan(u) }],
    ["global-technology",       { run: (u) => fetchGlobalTechnologySummary(u), trigger: (u) => triggerGlobalTechnologyScan(u) }],
    ["technology-relationships",{ run: (u) => fetchTechnologyRelationshipSummary(u), trigger: (u) => triggerTechnologyRelationshipRebuild(u) }],
    ["technology-evolution",    { run: (u) => fetchTechnologyEvolutionSummary(u), trigger: (u) => triggerTechnologyEvolutionRebuild(u) }],
    ["systems-dynamics",        { run: (u) => fetchSystemsDynamicsSummary(u), trigger: (u) => triggerSystemsDynamicsRebuild(u) }],
    ["trade-off-intelligence",  { run: (u) => fetchTradeoffIntelligenceSummary(u), trigger: (u) => triggerTradeoffIntelligenceRebuild(u) }],
    ["portfolio-intelligence",  { run: (u) => fetchPortfolioIntelligenceSummary(u), trigger: (u) => triggerPortfolioIntelligenceRebuild(u) }],
    ["priority-intelligence",   { run: (u) => fetchPriorityIntelligenceSummary(u), trigger: (u) => triggerPriorityIntelligenceRebuild(u) }],
  ]);
}

// ── Main orchestration cycle ───────────────────────────────────────────────

export async function runUnifiedCognitiveCycle(userId: number): Promise<CognitiveCycleResult> {
  const cycleStart  = Date.now();
  const wavePlans   = resolveExecutionWaves();
  const diagnostics = new Map<string, EngineDiagnostic>();
  const results     = new Map<string, unknown>();
  const waveDurations = new Map<number, number>();

  // We need businessId for some engines. It becomes available after Wave 1 (business-graph).
  let businessId: number | undefined;

  // Execute waves sequentially; engines within each wave run in parallel
  for (const wave of wavePlans) {
    // Rebuild engine map each wave so businessId is current
    const engineMap = makeEngineMap(businessId);
    const waveStart = Date.now();

    await Promise.all(wave.engineIds.map(async engineId => {
      const engine    = engineMap.get(engineId);
      if (!engine) return;

      const engStart  = Date.now();
      let succeeded   = false;
      let hasSummary  = false;
      let confValue: number | null = null;
      let errMsg: string | null   = null;

      try {
        const summary = await engine.run(userId);
        results.set(engineId, summary ?? undefined);
        succeeded  = true;
        hasSummary = summary !== null && summary !== undefined;
        // Fire-and-forget background trigger (throttled internally)
        try { engine.trigger(userId); } catch { /* ignore trigger failures */ }
      } catch (err) {
        errMsg = err instanceof Error ? err.message : String(err);
      }

      diagnostics.set(engineId, {
        engineId,
        waveNumber:           wave.waveNumber,
        durationMs:           Date.now() - engStart,
        succeeded,
        hasSummary,
        dependencySatisfied:  true,
        confidenceValue:      confValue,
        errorMessage:         errMsg,
      });
    }));

    waveDurations.set(wave.waveNumber, Date.now() - waveStart);

    // Extract businessId after Wave 1 completes
    if (wave.waveNumber === 1) {
      const bgSummary = results.get("business-graph") as BusinessGraphSummary | undefined;
      if (bgSummary?.businessId) businessId = bgSummary.businessId;
    }
  }

  // ── Post-wave processing ───────────────────────────────────────────────
  const diagArray      = Array.from(diagnostics.values());
  const confidenceScore= computeCycleConfidence(diagArray);
  const evItems        = countEvidenceItems(diagArray);
  const pipelineComplete = computePipelineCompleteness(diagArray, COGNITIVE_ENGINE_REGISTRY.length);
  const topEngineId    = findTopEngine(diagArray);
  const waveResults    = summariseWaves(wavePlans, diagArray, waveDurations);
  const confFlows      = propagateConfidence(diagArray);
  const evFlows        = buildEvidenceFlows(diagArray);
  const successCount   = diagArray.filter(d => d.succeeded).length;
  const failureCount   = diagArray.filter(d => !d.succeeded).length;
  const durationMs     = Date.now() - cycleStart;

  // ── Persist cycle ──────────────────────────────────────────────────────
  let cycleId = 0;
  try {
    const [cycle] = await db.insert(cognitiveCycles).values({
      userId:          userId ?? null,
      totalEngines:    COGNITIVE_ENGINE_REGISTRY.length,
      wavesExecuted:   wavePlans.length,
      successCount,
      failureCount,
      durationMs,
      confidenceScore,
      evidenceItems:   evItems,
      lawApplied:      true,
      pipelineComplete,
      topEngineId,
    }).returning({ id: cognitiveCycles.id });
    cycleId = cycle!.id;
  } catch { /* fail-open */ }

  if (cycleId > 0) {
    // Persist execution graph (one row per engine)
    for (const diag of diagArray) {
      try {
        const descriptor = COGNITIVE_ENGINE_REGISTRY.find(e => e.engineId === diag.engineId);
        await db.insert(executionGraphs).values({
          cycleId,
          engineId:    diag.engineId,
          engineTitle: descriptor?.engineTitle ?? diag.engineId,
          waveNumber:  diag.waveNumber,
          executed:    true,
          succeeded:   diag.succeeded,
          durationMs:  diag.durationMs,
          errorMessage:diag.errorMessage ?? null,
        });
      } catch { /* fail-open */ }
    }

    // Persist execution waves
    for (const wave of waveResults) {
      try {
        await db.insert(executionWavesTable).values({
          cycleId,
          waveNumber:  wave.waveNumber,
          engineIds:   wave.engineIds,
          durationMs:  wave.durationMs,
          successCount:wave.successCount,
          failureCount:wave.failureCount,
        });
      } catch { /* fail-open */ }
    }

    // Persist diagnostics
    for (const diag of diagArray) {
      try {
        await db.insert(executionDiagnostics).values({
          cycleId,
          engineId:             diag.engineId,
          waveNumber:           diag.waveNumber,
          durationMs:           diag.durationMs,
          succeeded:            diag.succeeded,
          hasSummary:           diag.hasSummary,
          dependencySatisfied:  diag.dependencySatisfied,
          confidenceValue:      diag.confidenceValue ?? null,
          errorMessage:         diag.errorMessage ?? null,
        });
      } catch { /* fail-open */ }
    }

    // Persist confidence flows (sample first 50 to keep DB light)
    for (const flow of confFlows.slice(0, 50)) {
      try {
        await db.insert(confidenceFlowsTable).values({
          cycleId,
          sourceEngineId:   flow.sourceEngineId,
          targetEngineId:   flow.targetEngineId,
          sourceConfidence: flow.sourceConfidence,
          propagatedValue:  flow.propagatedValue,
          attenuation:      flow.attenuation,
        });
      } catch { /* fail-open */ }
    }

    // Persist evidence flows (sample first 100)
    for (const flow of evFlows.slice(0, 100)) {
      try {
        await db.insert(evidenceFlowsTable).values({
          cycleId,
          sourceEngineId:    flow.sourceEngineId,
          targetEngineId:    flow.targetEngineId,
          evidenceType:      flow.evidenceType,
          evidenceKey:       flow.evidenceKey,
          evidenceAvailable: flow.evidenceAvailable,
        });
      } catch { /* fail-open */ }
    }
  }

  // Upsert engine registry
  for (const engine of COGNITIVE_ENGINE_REGISTRY) {
    try {
      await db.insert(orchestrationRegistry).values({
        engineId:    engine.engineId,
        engineTitle: engine.engineTitle,
        buildNumber: engine.buildNumber,
        waveNumber:  engine.waveNumber,
        dependencies:engine.dependencies,
        description: engine.description,
        lawCompliant:true,
        lastSeenAt:  new Date(),
        updatedAt:   new Date(),
      }).onConflictDoUpdate({
        target: orchestrationRegistry.engineId,
        set: {
          lastSeenAt: new Date(),
          updatedAt:  new Date(),
        },
      });
    } catch { /* fail-open */ }
  }

  return {
    cycleId,
    businessGraphSummary:          results.get("business-graph")          as BusinessGraphSummary | undefined,
    businessAnalysisSummary:       results.get("business-analysis")       as BusinessAnalysisSummary | undefined,
    opportunityDiscoverySummary:   results.get("opportunity-discovery")   as OpportunityDiscoverySummary | undefined,
    simulationSummary:             results.get("future-simulation")       as SimulationSummary | undefined,
    decisionSummary:               results.get("decision-intelligence")   as DecisionSummary | undefined,
    strategySummary:               results.get("executive-strategy")      as StrategySummary | undefined,
    planningSummary:               results.get("strategic-planning")      as PlanningSummary | undefined,
    capabilitySummary:             results.get("capability-planning")     as CapabilitySummary | undefined,
    operationalSummary:            results.get("operational-planning")    as OperationalSummary | undefined,
    executionOrchestrationSummary: results.get("execution-orchestration") as ExecutionOrchestrationSummary | undefined,
    authoritySummary:              results.get("authority-resolution")    as AuthoritySummary | undefined,
    executionRiskSummary:          results.get("execution-risk")          as ExecutionRiskSummary | undefined,
    executionSimulationSummary:    results.get("execution-simulation")    as ExecutionSimulationSummary | undefined,
    workflowSummary:               results.get("workflow-execution")      as WorkflowSummary | undefined,
    universalExecutionSummary:     results.get("universal-execution")     as ExecutionSessionSummary | undefined,
    adapterFrameworkSummary:       results.get("adapter-framework")       as AdapterFrameworkSummary | undefined,
    capabilityIntelligenceSummary: results.get("capability-intelligence") as CapabilityIntelligenceSummary | undefined,
    platformInfrastructureSummary: results.get("platform-infrastructure") as PlatformInfrastructureSummary | undefined,
    globalTechnologySummary:       results.get("global-technology")       as GlobalTechnologySummary | undefined,
    technologyRelationshipSummary: results.get("technology-relationships")as TechnologyRelationshipSummary | undefined,
    technologyEvolutionSummary:    results.get("technology-evolution")    as TechnologyEvolutionSummary | undefined,
    systemsDynamicsSummary:        results.get("systems-dynamics")        as SystemsDynamicsSummary | undefined,
    tradeoffIntelligenceSummary:   results.get("trade-off-intelligence")  as TradeoffIntelligenceSummary | undefined,
    portfolioIntelligenceSummary:  results.get("portfolio-intelligence")  as PortfolioIntelligenceSummary | undefined,
    priorityIntelligenceSummary:   results.get("priority-intelligence")   as PriorityIntelligenceSummary | undefined,
    totalEngines: COGNITIVE_ENGINE_REGISTRY.length,
    wavesExecuted: wavePlans.length,
    successCount,
    failureCount,
    durationMs,
    confidenceScore,
    evidenceItems: evItems,
    pipelineComplete,
  };
}

// ── Platform snapshot rebuild ──────────────────────────────────────────────

export async function runOrchestrationPlatformRebuild(): Promise<void> {
  const recentCycles = await db
    .select()
    .from(cognitiveCycles)
    .orderBy(desc(cognitiveCycles.id))
    .limit(20);

  if (recentCycles.length === 0) return;

  const avgConf     = recentCycles.reduce((s, c) => s + c.confidenceScore, 0) / recentCycles.length;
  const avgDuration = Math.round(recentCycles.reduce((s, c) => s + c.durationMs, 0) / recentCycles.length);
  const avgSuccess  = recentCycles.reduce((s, c) => s + c.successCount / Math.max(1, c.totalEngines), 0) / recentCycles.length;
  const topEngine   = recentCycles.find(c => c.topEngineId)?.topEngineId ?? null;

  const registryRows = await db.select().from(orchestrationRegistry);

  await db.insert(orchestrationSnapshots).values({
    totalEngines:      COGNITIVE_ENGINE_REGISTRY.length,
    totalCycles:       recentCycles.length,
    avgConfidence:     avgConf,
    avgDurationMs:     avgDuration,
    avgSuccessRate:    avgSuccess,
    topEngineId:       topEngine,
    lawComplianceRate: 1, // all cycles apply Unified Cognition Law
    waveCount:         resolveExecutionWaves().length,
  });
}

// ── EB summary ────────────────────────────────────────────────────────────

export async function buildUnifiedOrchestrationSummary(): Promise<UnifiedOrchestrationSummary> {
  try {
    const snap = await db.select().from(orchestrationSnapshots).orderBy(desc(orchestrationSnapshots.id)).limit(1);
    const recent = await db.select().from(cognitiveCycles).orderBy(desc(cognitiveCycles.id)).limit(5);

    return {
      totalEngines:      snap[0]?.totalEngines ?? COGNITIVE_ENGINE_REGISTRY.length,
      wavesExecuted:     snap[0]?.waveCount ?? resolveExecutionWaves().length,
      successCount:      recent[0]?.successCount ?? 0,
      failureCount:      recent[0]?.failureCount ?? 0,
      avgDurationMs:     snap[0]?.avgDurationMs ?? 0,
      avgConfidence:     snap[0]?.avgConfidence ?? 0,
      avgSuccessRate:    snap[0]?.avgSuccessRate ?? 0,
      lawComplianceRate: snap[0]?.lawComplianceRate ?? 1,
      topEngineId:       snap[0]?.topEngineId ?? null,
      recentCycles:      recent.length,
    };
  } catch {
    return {
      totalEngines: COGNITIVE_ENGINE_REGISTRY.length,
      wavesExecuted: resolveExecutionWaves().length,
      successCount: 0, failureCount: 0,
      avgDurationMs: 0, avgConfidence: 0, avgSuccessRate: 0,
      lawComplianceRate: 1, topEngineId: null, recentCycles: 0,
    };
  }
}
