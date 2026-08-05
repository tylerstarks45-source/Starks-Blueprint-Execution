import { logger } from "../logger";
import { getCachedHealthConcerns } from "../cognitive-foundation/brain-registry";
import { orchestrate } from "../cognitive-foundation/orchestration";
import { runReasoningPipeline } from "../cognitive-foundation/reasoning";
import { consolidate } from "../cognitive-foundation/cognitive-memory";
import { resolveActiveProject, updateProjectRollup } from "./project-manager";
import { resolveGoalForRequest } from "./goal-manager";
import { planTasks } from "./task-planner";
import type { ExecutiveBrainRequest, ExecutiveBrainResult } from "./types";
import type { ExecutiveReasoningResult } from "../cognitive-foundation/types";
// Build 006: Executive Context Engine
import { resolveContextSnapshot } from "../executive-context/context-resolution";
import type { ExecutiveContextSnapshot } from "../executive-context/types";
// Build 007: Executive Judgment Engine
import { evaluateJudgmentFromReasoning } from "./judgment-integration";
// Build 008: Executive Goal Engine
import { fetchActiveGoals, buildGoalAdvisory } from "./goal-integration";
import type { ExecutiveGoal } from "../executive-goal/types";
// Build 009: Executive Planning Engine
import { fetchActivePlans, ensurePlanForPrimaryGoal, buildPlanAdvisory } from "./plan-integration";
import type { ExecutivePlan } from "../executive-plan/types";
// Build 010: Executive Execution Engine
import { fetchActiveExecutions, ensureExecutionForActivePlan, buildExecutionAdvisory } from "./execution-integration";
import type { ExecutiveExecution } from "../executive-execution/types";
// Build 011: Executive Observation Engine
import { fetchObservationSummary, publishBrainObservation, buildObservationAdvisory } from "./observation-integration";
import type { ObservationSummary } from "../executive-observation/types";
// Build 012: Executive Reflection Engine
import { fetchReflectionSummary, ensureCaseForCycle, buildReflectionAdvisory } from "./reflection-integration";
import type { ReflectionSummary } from "../executive-reflection/types";
// Build 013: Executive Principle Learning Engine
import { fetchLearningSummary, triggerLearningCycle, buildLearningAdvisory } from "./learning-integration";
import type { LearningSummary } from "../executive-learning/types";
// Build 014: Executive Governance & Adaptation Engine
import { fetchGovernanceSummary, triggerGovernanceCycle, buildGovernanceAdvisory } from "./governance-integration";
import type { GovernanceSummary } from "../executive-governance/types";
// Build 040: Unified Cognitive Orchestration Engine
// All intelligence engines (Builds 015–039) are now coordinated through the
// Unified Cognitive Orchestrator. Unified Cognition Law: no engine executes in
// isolation if its output depends on evidence from another registered engine.
import { runUnifiedCognitiveCycle, fetchOrchestrationSummary, triggerOrchestrationSnapshot, buildOrchestrationAdvisory } from "./unified-orchestration-integration";
import type { CognitiveCycleResult } from "./unified-orchestration-integration";
// Build 041: Unified Cognitive Knowledge Graph
import { fetchKnowledgeGraphView, triggerGraphRebuild, buildGraphAdvisory } from "./knowledge-graph-integration";
import type { UnifiedGraphView } from "./knowledge-graph-integration";
// Build 043: Unified Digital Operating Layer
import { fetchOperatingLayerView, triggerOperatingLayerInit, buildOperatingLayerAdvisory } from "./digital-operating-layer-integration";
import type { OperatingLayerSummary } from "./digital-operating-layer-integration";
// Build 044: Unified Connections & Integration Hub
import { fetchConnectionsHubView, triggerConnectionsHubInit, buildConnectionsHubAdvisory } from "./connections-hub-integration";
import type { ConnectionHubSummary } from "./connections-hub-integration";
// Build 045: Cognitive Certification & Launch Readiness Framework
import { fetchCertificationView, notifyCertificationCycle, buildCertificationAdvisory } from "./certification-integration";
import type { CertificationSummary } from "./certification-integration";
// Build 045A: Launch Hardening Framework
import { fetchHardeningView, notifyHardeningCycle, buildHardeningAdvisory } from "./launch-hardening-integration";
import type { HardeningSummary } from "./launch-hardening-integration";
// Build 046: Unified Platform Operating System
import { fetchUPOSView, triggerUPOSInit, buildUPOSAdvisory } from "./unified-platform-integration";
import type { UPOSSummary } from "./unified-platform-integration";
// Build 047: Unified Workspace & Project System
import { fetchUWPSView, triggerUWPSMaintenance, buildUWPSAdvisory } from "./uwps-integration";
import type { UWPSSummary } from "./uwps-integration";
// Build 048: Unified Business Asset Framework
import { fetchUBAFView, triggerUBAFMaintenance, buildUBAFAdvisory } from "./ubaf-integration";
import type { UBAFSummary } from "./ubaf-integration";
// Build 049: Unified Builder Runtime Engine
import { fetchUBREView, triggerUBREMaintenance, buildUBREAdvisory } from "./ubre-integration";
import type { UBRESummary } from "./ubre-integration";
// Build 050: Unified Application Framework
import { fetchUAFView, triggerUAFMaintenance, buildUAFAdvisory } from "./uaf-integration";
import type { UAFSummary } from "./uaf-integration";
// Build 051: Unified Visual Component Framework
import { fetchUVCFView, triggerUVCFMaintenance, buildUVCFAdvisory } from "./uvcf-integration";
import type { UVCFSummary } from "./uvcf-integration";
// Build 052: Universal Canvas Engine
import { fetchUCEView, triggerUCEMaintenance, buildUCEAdvisory } from "./uce-integration";
import type { UCESummary } from "./uce-integration";
// Build 053: Business Experience Builder
import { fetchBEBView, triggerBEBMaintenance, buildBEBAdvisory } from "./beb-integration";
import type { BEBSummary } from "./beb-integration";
// Build 054: Unified Customer Intelligence Engine
import { fetchUCIEView, triggerUCIEMaintenance, buildUCIEAdvisory } from "./ucie-integration";
import type { UCIESummary } from "./ucie-integration";
// Build 055: Unified Business Process Engine
import { fetchUBPEView, triggerUBPEMaintenance, buildUBPEAdvisory } from "./ubpe-integration";
import { fetchURCMPView, triggerURCMPMaintenance, buildURCMPAdvisory } from "./urcmp-integration";
import type { UBPESummary } from "./ubpe-integration";
import type { URCMPSummary } from "./urcmp-integration";
// Advisory builders (re-exported from Unified Orchestration for buildContextNote)
import {
  buildBusinessAdvisory,
  buildAnalysisAdvisory,
  buildOpportunityAdvisory,
  buildSimulationAdvisory,
  buildDecisionAdvisory,
  buildStrategyAdvisory,
  buildPlanningAdvisory,
  buildCapabilityAdvisory,
  buildOperationalAdvisory,
  buildExecutionOrchestrationAdvisory,
  buildAuthorityAdvisory,
  buildRiskAdvisory,
  buildExecutionSimulationAdvisory,
  buildWorkflowExecutionAdvisory,
  buildUniversalExecutionAdvisory,
  buildAdapterFrameworkAdvisory,
  buildCapabilityIntelligenceAdvisory,
  buildPlatformInfrastructureAdvisory,
  buildGlobalTechnologyAdvisory,
  buildTechnologyRelationshipAdvisory,
  buildTechnologyEvolutionAdvisory,
  buildSystemsDynamicsAdvisory,
  buildTradeoffIntelligenceAdvisory,
  buildPortfolioIntelligenceAdvisory,
  buildPriorityIntelligenceAdvisory,
} from "./unified-orchestration-integration";
// Summary types (kept direct for TypeScript clarity in buildContextNote param annotations)
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
// H-09 fix: moved from inline import() expressions to top-level type imports
import type { PortfolioIntelligenceSummary } from "../portfolio-intelligence/types";
import type { PriorityIntelligenceSummary } from "../priority-intelligence/types";
import type { UnifiedOrchestrationSummary } from "../unified-orchestration/types";

export * from "./types";
export * as ProjectManager from "./project-manager";
export * as GoalManager from "./goal-manager";
export * as TaskPlanner from "./task-planner";

// ─── Executive Brain (ASH Brain v2.0 — Phase 1.1 Foundation) ───────────────
//
// Mandated flow: User -> Executive Brain -> Goal Manager -> Task Planner ->
// existing AI Orchestrator -> OpenRouter -> existing Tool Execution.
//
// This module is the "Executive Brain" step only. It never calls OpenRouter
// for the user-facing reply and never executes tasks itself — it decides
// *what project/goal/tasks* this request belongs to, persists that state,
// and returns a short context note for the existing orchestrator to consume
// unchanged. If anything here fails, the caller (routes/executive-brain.ts)
// falls back to calling the orchestrator directly with zero Executive Brain
// context, so a bug in this layer can never block a user's request.
export async function runExecutiveBrain(req: ExecutiveBrainRequest): Promise<ExecutiveBrainResult> {
  const { userId, message, systemInstanceId } = req;

  // ── A-01 fix: async pre-warm — kick off independent DB-only fetches NOW ─────
  // The three project scaffold calls below (resolveActiveProject,
  // resolveGoalForRequest, planTasks) include optional LLM round-trips
  // (deriveProjectName, deriveGoal, decomposeIntoTasks). By starting these
  // purely-DB fetches before the scaffold, they execute concurrently with
  // those LLM calls rather than strictly after them, shaving up to 3 s of
  // serial latency on cold requests.
  //
  // Each pre-warm catches its own errors (fail-open) — a rejection here must
  // never surface through the await below or crash the EB pipeline.
  const preWarmGoals      = fetchActiveGoals(userId).catch((): ExecutiveGoal[] => []);
  const preWarmPlans      = fetchActivePlans(userId).catch((): ExecutivePlan[] => []);
  const preWarmExecutions = fetchActiveExecutions(userId).catch((): ExecutiveExecution[] => []);
  const preWarmObservation= fetchObservationSummary(userId).catch((): ObservationSummary | undefined => undefined);
  const preWarmReflection = fetchReflectionSummary(userId).catch((): ReflectionSummary | undefined => undefined);
  const preWarmLearning   = fetchLearningSummary(userId).catch((): LearningSummary | undefined => undefined);
  const preWarmGovernance = fetchGovernanceSummary(userId).catch((): GovernanceSummary | undefined => undefined);
  // Build 046: pre-warm UPOS summary concurrently with LLM round-trips (A-01 pattern)
  const preWarmUPOS       = fetchUPOSView(userId).catch((): UPOSSummary | undefined => undefined);
  // Build 047: pre-warm UWPS summary concurrently with LLM round-trips
  const preWarmUWPS       = fetchUWPSView(userId).catch((): UWPSSummary | undefined => undefined);
  // Build 048: pre-warm UBAF summary concurrently with LLM round-trips
  const preWarmUBAF       = fetchUBAFView(userId).catch((): UBAFSummary | undefined => undefined);
  // Build 049: pre-warm UBRE summary concurrently with LLM round-trips
  const preWarmUBRE       = fetchUBREView(userId).catch((): UBRESummary | undefined => undefined);
  // Build 050: pre-warm UAF summary concurrently with LLM round-trips
  const preWarmUAF        = fetchUAFView(userId).catch((): UAFSummary | undefined => undefined);
  // Build 051: pre-warm UVCF summary concurrently with LLM round-trips
  const preWarmUVCF       = fetchUVCFView(userId).catch((): UVCFSummary | undefined => undefined);
  // Build 052: pre-warm UCE summary concurrently with LLM round-trips
  const preWarmUCE        = fetchUCEView(userId).catch((): UCESummary | undefined => undefined);
  // Build 053: pre-warm BEB summary concurrently with LLM round-trips
  const preWarmBEB        = fetchBEBView(userId).catch((): BEBSummary | undefined => undefined);
  // Build 054: pre-warm UCIE summary concurrently with LLM round-trips
  const preWarmUCIE       = fetchUCIEView(userId).catch((): UCIESummary | undefined => undefined);
  // Build 055: pre-warm UBPE summary concurrently with LLM round-trips
  const preWarmUBPE       = fetchUBPEView(userId).catch((): UBPESummary | undefined => undefined);
  const preWarmURCMP      = fetchURCMPView(userId).catch((): URCMPSummary | undefined => undefined);

  // ── Executive Context Engine (Build 006) ─────────────────────────────────
  // Resolve the current situational context BEFORE any planning or reasoning.
  // Fail-open: a context failure must never block the request path.
  // The snapshot id is stored in the result so Decision Records can reference
  // the exact context that was active during reasoning (for future replay/audit).
  let contextSnapshot: ExecutiveContextSnapshot | undefined;
  let contextSnapshotId: string | undefined;
  try {
    contextSnapshot = await resolveContextSnapshot(userId, message);
    contextSnapshotId = contextSnapshot.id;
  } catch (err) {
    logger.warn({ err }, "Executive Brain: context resolution failed (ignored)");
  }

  // ── C-02 fix: guard all 4 previously-unguarded awaits ─────────────────────
  // Before this fix, any throw from these 4 awaits became an unhandled rejection
  // that could crash the Node process. Each is now individually wrapped.
  // resolveActiveProject / resolveGoalForRequest / planTasks are fatal (re-throw)
  // — we cannot continue without a project scaffold.
  // updateProjectRollup is non-fatal (continue) — it is a rollup optimisation.
  let projectScaffold!: Awaited<ReturnType<typeof resolveActiveProject>>;
  try {
    projectScaffold = await resolveActiveProject({ userId, message, systemInstanceId });
  } catch (err) {
    logger.error({ err, userId }, "Executive Brain: resolveActiveProject failed — re-throwing to route handler");
    throw err;
  }
  const { project, isNew } = projectScaffold;

  let goal: Awaited<ReturnType<typeof resolveGoalForRequest>>;
  try {
    goal = await resolveGoalForRequest({ projectId: project.id, message, isNewProject: isNew });
  } catch (err) {
    logger.error({ err, userId }, "Executive Brain: resolveGoalForRequest failed — re-throwing to route handler");
    throw err;
  }

  let tasks: Awaited<ReturnType<typeof planTasks>>;
  try {
    tasks = await planTasks({ projectId: project.id, goalId: goal?.id ?? null, message });
  } catch (err) {
    logger.error({ err, userId }, "Executive Brain: planTasks failed — re-throwing to route handler");
    throw err;
  }

  const firstPendingTask = tasks.find((t) => t.status === "pending") ?? tasks[0] ?? null;
  const nextPhase = isNew ? "planning" : (project.currentPhase ?? "execution");

  try {
    await updateProjectRollup({
      projectId: project.id,
      currentPhase: nextPhase,
      currentTaskId: firstPendingTask?.id ?? null,
    });
  } catch (err) {
    logger.warn({ err, userId }, "Executive Brain: updateProjectRollup failed — continuing (non-fatal)");
  }

  // ── Cognitive Orchestration (Build 002) ─────────────────────────────────
  // Reason about which Brains are relevant to this request. Zero-I/O:
  // reads only in-process registry data. Fail-open by contract.
  let orchestrationResult: ReturnType<typeof orchestrate> | null = null;
  try {
    orchestrationResult = orchestrate({ objective: message });
  } catch (err) {
    logger.warn({ err }, "Executive Brain: cognitive orchestration failed (ignored)");
  }

  // ── Executive Reasoning Pipeline (Build 003) ──────────────────────────
  // Six-stage structured reasoning pass that runs after orchestration and
  // before the context note is assembled. Zero-I/O: reads only in-process
  // registry data. Fail-open: a pipeline failure is caught in the pipeline
  // itself; we also guard the call here.
  let reasoningResult: ExecutiveReasoningResult | undefined;
  try {
    reasoningResult = runReasoningPipeline(message, orchestrationResult);
  } catch (err) {
    logger.warn({ err }, "Executive Brain: reasoning pipeline failed (ignored)");
  }

  // ── Cognitive Memory Consolidation (Build 004) ───────────────────────
  // Persist the Decision Record as a Cognitive Artifact — the first step
  // of durable Executive cognition. Fire-and-forget: never blocks the
  // request path. The in-memory ring buffer in reasoning.ts remains as
  // the hot L1 cache; this writes the same record to the persistent store.
  if (reasoningResult) {
    const record = reasoningResult.decisionRecord;
    void consolidate({
      id: record.id,
      artifactType: "decision_record",
      sourceBrain: "executive-brain",
      lifecycleStatus: "active",
      confidenceOverall: record.confidence.overall,
      confidenceReasoning: record.confidence.reasoning,
      confidenceCapability: record.confidence.capability,
      confidenceBrainSelection: record.confidence.brainSelection,
      brainsSelected: record.brainsSelected,
      capabilitiesUsed: record.capabilitiesUsed,
      evidence: record.supportingContext,
      executiveBrainVersion: "1.1.0",
      content: record as unknown as Record<string, unknown>,
      relationships: {},
      // Build 006: store the context snapshot id with the Decision Record so the
      // full reasoning context can be reconstructed for future replay and auditing.
      metadata: contextSnapshotId ? { contextSnapshotId } : {},
      objectiveText: record.objectiveAnalysis.primaryGoal,
      userId,
      projectId: project.id,
    }).catch((err) => {
      logger.warn({ err, recordId: record.id }, "Cognitive memory: consolidation failed (non-fatal)");
    });
  }

  // ── Executive Goal Engine (Build 008) ───────────────────────────────────
  // Resolve active goals for this user. Goals inform the Judgment Engine —
  // they never change goals themselves (one-way dependency).
  // Fail-open: an empty array is the fallback; the request always continues.
  let activeGoals: ExecutiveGoal[] = [];
  try {
    // A-01: await the pre-warmed promise (already running concurrently)
    activeGoals = await preWarmGoals;
  } catch (err) {
    logger.warn({ err }, "Executive Brain: goal fetch failed (ignored)");
  }

  // ── Executive Judgment Engine (Build 007 + 008) ──────────────────────────
  // Derive decision options from the reasoning result and evaluate them.
  // Active goals (Build 008) enrich option scores before evaluation.
  // The Judgment Engine scores all options, selects a recommendation, and
  // produces a full explanation. Persisted as a Cognitive Artifact.
  // Synchronous but fail-open: never blocks the request path.
  let judgmentId: string | undefined;
  if (reasoningResult) {
    try {
      const judgment = await evaluateJudgmentFromReasoning(
        userId,
        message,
        reasoningResult,
        contextSnapshotId,
        activeGoals,
      );
      judgmentId = judgment.id;
    } catch (err) {
      logger.warn({ err }, "Executive Brain: judgment evaluation failed (ignored)");
    }
  }

  // ── Executive Planning Engine (Build 009) ───────────────────────────────────
  // Fetch active plans for this user. If no plan covers the primary active goal,
  // generate one deterministically.  Planning NEVER executes — it only produces
  // structured strategies.  Fail-open: a planning failure must never block the
  // request path.
  let activePlans: ExecutivePlan[] = [];
  let activePlanId: string | undefined;
  try {
    // A-01: await the pre-warmed promise (already running concurrently)
    activePlans = await preWarmPlans;
    activePlanId = await ensurePlanForPrimaryGoal(userId, activeGoals, activePlans, {
      contextSnapshotId,
      judgmentId,
    }) ?? undefined;
  } catch (err) {
    logger.warn({ err }, "Executive Brain: planning step failed (ignored)");
  }

  // ── Executive Execution Engine (Build 010) ──────────────────────────────────
  // Fetch active executions for this user. If no execution covers the primary
  // approved plan, create a pending one. Execution NEVER plans, judges, or
  // changes goals — it only coordinates execution of approved plans.
  // Fail-open: an execution failure must never block the request path.
  let activeExecutions: ExecutiveExecution[] = [];
  let activeExecutionId: string | undefined;
  try {
    // A-01: await the pre-warmed promise (already running concurrently)
    activeExecutions = await preWarmExecutions;
    activeExecutionId = await ensureExecutionForActivePlan(userId, activePlans, activeExecutions, {
      contextSnapshotId,
      judgmentId,
    }) ?? undefined;
  } catch (err) {
    logger.warn({ err }, "Executive Brain: execution step failed (ignored)");
  }

  // ── Executive Observation Engine (Build 011) ─────────────────────────────────
  // Fetch the observation summary at the END of the pipeline so it reflects
  // all events that have been published up to this cycle.
  // Observation NEVER changes execution, plans, goals, or memory state.
  // It only reads the observation store and returns a lightweight summary.
  // Then publish this brain cycle itself as an observation (append-only).
  // Fail-open: an observation failure must never block the request path.
  let observationSummary: ObservationSummary | undefined;
  try {
    // A-01: await the pre-warmed promise (already running concurrently)
    observationSummary = (await preWarmObservation) ?? undefined;
    // Publish the brain cycle as an observation (fire-and-forget)
    void publishBrainObservation({
      userId,
      goalId: activeGoals[0]?.id,
      planId: activePlanId,
      executionId: activeExecutionId,
      contextSnapshotId,
      judgmentId,
    }).catch((err) => {
      logger.warn({ err }, "Executive Brain: brain cycle observation publish failed (non-fatal)");
    });
  } catch (err) {
    logger.warn({ err }, "Executive Brain: observation step failed (ignored)");
  }

  // ── Executive Reflection Engine (Build 012) ──────────────────────────────────
  // Fetch reflection summary (recent cases + quality scores) for the advisory.
  // Ensure a case is open for this cycle (idempotent — reuses existing case
  // when the same execution is active).
  // Reflection NEVER changes execution, plans, goals, or memory.
  // Fail-open: a reflection failure must never block the request path.
  let reflectionSummary: ReflectionSummary | undefined;
  try {
    // A-01: await the pre-warmed promise (already running concurrently)
    reflectionSummary = (await preWarmReflection) ?? undefined;
    // Open/reuse a case for this brain cycle (fire-and-forget)
    void ensureCaseForCycle({
      userId,
      rootRequest: message,
      primaryGoalId: activeGoals[0]?.id,
      primaryPlanId: activePlanId,
      primaryExecutionId: activeExecutionId,
      primaryChainId: observationSummary?.latestChainId ?? undefined,
    }).catch((err) => {
      logger.warn({ err }, "Executive Brain: case open failed (non-fatal)");
    });
  } catch (err) {
    logger.warn({ err }, "Executive Brain: reflection step failed (ignored)");
  }

  // ── Executive Principle Learning Engine (Build 013) ─────────────────────────
  // Fetch the validated principle summary for the advisory.
  // Trigger a background learning cycle every 20 brain cycles (throttled).
  // Learning NEVER changes behavior, planning, goals, judgment, or execution.
  // Fail-open: a learning failure must never block the request path.
  let learningSummary: LearningSummary | undefined;
  try {
    // A-01: await the pre-warmed promise (already running concurrently)
    learningSummary = (await preWarmLearning) ?? undefined;
    // M-13 fix: attach .catch() so rejections are visible in logs rather than unhandled
    void Promise.resolve(triggerLearningCycle(userId)).catch((err: unknown) => logger.warn({ err }, "M-13: learning cycle trigger failed (non-fatal)"));
  } catch (err) {
    logger.warn({ err }, "Executive Brain: learning step failed (ignored)");
  }

  // ── Executive Governance & Adaptation Engine (Build 014) ────────────────────
  // Fetch governance summary (active profile + approved policies) for the advisory.
  // Executive reasoning reads ONLY through approved policies — never raw principles.
  // Trigger a background governance cycle every 25 brain cycles (throttled).
  // Governance NEVER performs execution. Adaptation NEVER creates policy.
  // Fail-open: a governance failure must never block the request path.
  let governanceSummary: GovernanceSummary | undefined;
  try {
    // A-01: await the pre-warmed promise (already running concurrently)
    governanceSummary = (await preWarmGovernance) ?? undefined;
    void Promise.resolve(triggerGovernanceCycle(userId)).catch((err: unknown) => logger.warn({ err }, "M-13: governance cycle trigger failed (non-fatal)"));
  } catch (err) {
    logger.warn({ err }, "Executive Brain: governance step failed (ignored)");
  }

  // ── Unified Cognitive Cycle (Build 040) ──────────────────────────────────────
  // The Unified Cognitive Orchestrator coordinates all intelligence engines
  // (Builds 015–039) in dependency-ordered waves. Each engine runs in its
  // assigned wave; all engines in the same wave execute in parallel.
  //
  // UNIFIED COGNITION LAW: No intelligence engine executes in isolation when
  // its output depends on evidence produced by another registered engine.
  // The orchestrator enforces this law across all 25 engines in every cycle.
  //
  // Fail-open: if the unified cycle throws, all summaries remain undefined and
  // the EB continues to the context note with gracefully degraded intelligence.
  let businessGraphSummary:          BusinessGraphSummary | undefined;
  let businessAnalysisSummary:       BusinessAnalysisSummary | undefined;
  let opportunityDiscoverySummary:   OpportunityDiscoverySummary | undefined;
  let simulationSummary:             SimulationSummary | undefined;
  let decisionSummary:               DecisionSummary | undefined;
  let strategySummary:               StrategySummary | undefined;
  let planningSummary:               PlanningSummary | undefined;
  let capabilitySummary:             CapabilitySummary | undefined;
  let operationalSummary:            OperationalSummary | undefined;
  let executionOrchestrationSummary: ExecutionOrchestrationSummary | undefined;
  let authoritySummary:              AuthoritySummary | undefined;
  let executionRiskSummary:          ExecutionRiskSummary | undefined;
  let executionSimulationSummary:    ExecutionSimulationSummary | undefined;
  let workflowSummary:               WorkflowSummary | undefined;
  let universalExecutionSummary:     ExecutionSessionSummary | undefined;
  let adapterFrameworkSummary:       AdapterFrameworkSummary | undefined;
  let capabilityIntelligenceSummary: CapabilityIntelligenceSummary | undefined;
  let platformInfrastructureSummary: PlatformInfrastructureSummary | undefined;
  let globalTechnologySummary:       GlobalTechnologySummary | undefined;
  let technologyRelationshipSummary: TechnologyRelationshipSummary | undefined;
  let technologyEvolutionSummary:    TechnologyEvolutionSummary | undefined;
  let systemsDynamicsSummary:        SystemsDynamicsSummary | undefined;
  let tradeoffIntelligenceSummary:   TradeoffIntelligenceSummary | undefined;
  let portfolioIntelligenceSummary:  PortfolioIntelligenceSummary | undefined;
  let priorityIntelligenceSummary:   PriorityIntelligenceSummary | undefined;
  let unifiedOrchestrationSummary:   UnifiedOrchestrationSummary | undefined;
  let unifiedGraphView:              UnifiedGraphView | undefined;
  let operatingLayerSummary:         OperatingLayerSummary | undefined;
  let connectionHubSummary:          ConnectionHubSummary | undefined;
  let certificationSummary:          CertificationSummary | undefined;
  let hardeningSummary:              HardeningSummary | undefined;
  let uposSummary:                   UPOSSummary | undefined;
  let uwpsSummary:                   UWPSSummary | undefined;
  let ubafSummary:                   UBAFSummary | undefined;
  let ubreSummary:                   UBRESummary | undefined;
  let uafSummary:                    UAFSummary | undefined;
  let uvcfSummary:                   UVCFSummary | undefined;
  let uceSummary:                    UCESummary | undefined;
  let bebSummary:                    BEBSummary | undefined;
  let ucieSummary:                   UCIESummary | undefined;
  let ubpeSummary:                   UBPESummary | undefined;
  let urcmpSummary:                  URCMPSummary | undefined;
  try {
    const cycleResult: CognitiveCycleResult = await runUnifiedCognitiveCycle(userId);
    businessGraphSummary            = cycleResult.businessGraphSummary;
    businessAnalysisSummary         = cycleResult.businessAnalysisSummary;
    opportunityDiscoverySummary     = cycleResult.opportunityDiscoverySummary;
    simulationSummary               = cycleResult.simulationSummary;
    decisionSummary                 = cycleResult.decisionSummary;
    strategySummary                 = cycleResult.strategySummary;
    planningSummary                 = cycleResult.planningSummary;
    capabilitySummary               = cycleResult.capabilitySummary;
    operationalSummary              = cycleResult.operationalSummary;
    executionOrchestrationSummary   = cycleResult.executionOrchestrationSummary;
    authoritySummary                = cycleResult.authoritySummary;
    executionRiskSummary            = cycleResult.executionRiskSummary;
    executionSimulationSummary      = cycleResult.executionSimulationSummary;
    workflowSummary                 = cycleResult.workflowSummary;
    universalExecutionSummary       = cycleResult.universalExecutionSummary;
    adapterFrameworkSummary         = cycleResult.adapterFrameworkSummary;
    capabilityIntelligenceSummary   = cycleResult.capabilityIntelligenceSummary;
    platformInfrastructureSummary   = cycleResult.platformInfrastructureSummary;
    globalTechnologySummary         = cycleResult.globalTechnologySummary;
    technologyRelationshipSummary   = cycleResult.technologyRelationshipSummary;
    technologyEvolutionSummary      = cycleResult.technologyEvolutionSummary;
    systemsDynamicsSummary          = cycleResult.systemsDynamicsSummary;
    tradeoffIntelligenceSummary     = cycleResult.tradeoffIntelligenceSummary;
    portfolioIntelligenceSummary    = cycleResult.portfolioIntelligenceSummary;
    priorityIntelligenceSummary     = cycleResult.priorityIntelligenceSummary;
    // Fetch orchestration aggregate summary for advisory (non-blocking, throttled snapshot)
    unifiedOrchestrationSummary     = await fetchOrchestrationSummary(userId) ?? undefined;
    void Promise.resolve(triggerOrchestrationSnapshot()).catch((err: unknown) => logger.warn({ err }, "M-13: orchestration snapshot trigger failed (non-fatal)")); // fire-and-forget, every 280 cycles
    // Build 041: Unified Knowledge Graph — fetch latest view, trigger background rebuild every 290 cycles
    unifiedGraphView = await fetchKnowledgeGraphView(userId) ?? undefined;
    void Promise.resolve(triggerGraphRebuild(userId)).catch((err: unknown) => logger.warn({ err }, "M-13: graph rebuild trigger failed (non-fatal)")); // fire-and-forget, every 290 cycles
    // Build 043: Unified Digital Operating Layer — fetch latest view, trigger init every 300 cycles
    operatingLayerSummary = await fetchOperatingLayerView(userId) ?? undefined;
    void Promise.resolve(triggerOperatingLayerInit(userId)).catch((err: unknown) => logger.warn({ err }, "M-13: operating layer init trigger failed (non-fatal)")); // fire-and-forget, every 300 cycles
    // Build 044: Unified Connections & Integration Hub — fetch latest view, trigger init every 310 cycles
    connectionHubSummary = await fetchConnectionsHubView(userId) ?? undefined;
    void Promise.resolve(triggerConnectionsHubInit(userId)).catch((err: unknown) => logger.warn({ err }, "M-13: connections hub init trigger failed (non-fatal)")); // fire-and-forget, every 310 cycles
    // Build 045: Cognitive Certification — fetch latest snapshot passively (never auto-triggers)
    certificationSummary = await fetchCertificationView() ?? undefined;
    notifyCertificationCycle();
    // Build 045A: Launch Hardening — fetch latest snapshot passively (never auto-triggers)
    hardeningSummary = await fetchHardeningView() ?? undefined;
    notifyHardeningCycle();
    // Build 046: Unified Platform OS — await pre-warm, trigger background init every 320 cycles
    uposSummary = await preWarmUPOS ?? undefined;
    void Promise.resolve(triggerUPOSInit(userId)).catch((err: unknown) => logger.warn({ err }, "UPOS: background init trigger failed (non-fatal)")); // fire-and-forget, every 320 cycles
    // Build 047: Unified Workspace & Project System — await pre-warm, trigger maintenance every 330 cycles
    uwpsSummary = await preWarmUWPS ?? undefined;
    void Promise.resolve(triggerUWPSMaintenance(userId)).catch((err: unknown) => logger.warn({ err }, "UWPS: background maintenance trigger failed (non-fatal)")); // fire-and-forget, every 330 cycles
    // Build 048: Unified Business Asset Framework — await pre-warm, trigger maintenance every 340 cycles
    ubafSummary = await preWarmUBAF ?? undefined;
    void Promise.resolve(triggerUBAFMaintenance(userId)).catch((err: unknown) => logger.warn({ err }, "UBAF: background maintenance trigger failed (non-fatal)")); // fire-and-forget, every 340 cycles
    // Build 049: Unified Builder Runtime Engine — await pre-warm, trigger maintenance every 350 cycles
    ubreSummary = await preWarmUBRE ?? undefined;
    void Promise.resolve(triggerUBREMaintenance(userId)).catch((err: unknown) => logger.warn({ err }, "UBRE: background maintenance trigger failed (non-fatal)")); // fire-and-forget, every 350 cycles
    // Build 050: Unified Application Framework — await pre-warm, trigger maintenance every 360 cycles
    uafSummary = await preWarmUAF ?? undefined;
    void Promise.resolve(triggerUAFMaintenance(userId)).catch((err: unknown) => logger.warn({ err }, "UAF: background maintenance trigger failed (non-fatal)")); // fire-and-forget, every 360 cycles
    // Build 051: Unified Visual Component Framework — await pre-warm, trigger maintenance every 370 cycles
    uvcfSummary = await preWarmUVCF ?? undefined;
    void Promise.resolve(triggerUVCFMaintenance(userId)).catch((err: unknown) => logger.warn({ err }, "UVCF: background maintenance trigger failed (non-fatal)")); // fire-and-forget, every 370 cycles
    // Build 052: Universal Canvas Engine — await pre-warm, trigger maintenance every 380 cycles
    uceSummary = await preWarmUCE ?? undefined;
    void Promise.resolve(triggerUCEMaintenance(userId)).catch((err: unknown) => logger.warn({ err }, "UCE: background maintenance trigger failed (non-fatal)")); // fire-and-forget, every 380 cycles
    // Build 053: Business Experience Builder — await pre-warm, trigger maintenance every 390 cycles
    bebSummary = await preWarmBEB ?? undefined;
    void Promise.resolve(triggerBEBMaintenance(userId)).catch((err: unknown) => logger.warn({ err }, "BEB: background maintenance trigger failed (non-fatal)")); // fire-and-forget, every 390 cycles
    // Build 054: Unified Customer Intelligence Engine — await pre-warm, trigger maintenance every 400 cycles
    ucieSummary = await preWarmUCIE ?? undefined;
    void Promise.resolve(triggerUCIEMaintenance(userId)).catch((err: unknown) => logger.warn({ err }, "UCIE: background maintenance trigger failed (non-fatal)")); // fire-and-forget, every 400 cycles
    // Build 055: Unified Business Process Engine — await pre-warm, trigger maintenance every 410 cycles
    ubpeSummary = await preWarmUBPE ?? undefined;
    void Promise.resolve(triggerUBPEMaintenance(userId)).catch((err: unknown) => logger.warn({ err }, "UBPE: background maintenance trigger failed (non-fatal)")); // fire-and-forget, every 410 cycles
    urcmpSummary = await preWarmURCMP ?? undefined;
    void Promise.resolve(triggerURCMPMaintenance(userId)).catch((err: unknown) => logger.warn({ err }, "URCMP: background maintenance trigger failed (non-fatal)")); // fire-and-forget, every 420 cycles
  } catch (err) {
    logger.warn({ err }, "Executive Brain: unified cognitive cycle failed (ignored) — all summaries undefined");
  }

  const brainContextNote = await buildContextNote({ isNew, project, goal, tasks, orchestrationResult, reasoningResult, contextSnapshot, judgmentId, activeGoals, activePlans, activePlanId, activeExecutions, activeExecutionId, observationSummary, reflectionSummary, learningSummary, governanceSummary, businessGraphSummary, businessAnalysisSummary, opportunityDiscoverySummary, simulationSummary, decisionSummary, strategySummary, planningSummary, capabilitySummary, operationalSummary, executionOrchestrationSummary, authoritySummary, executionRiskSummary, executionSimulationSummary, workflowSummary, universalExecutionSummary, adapterFrameworkSummary, capabilityIntelligenceSummary, platformInfrastructureSummary, globalTechnologySummary, technologyRelationshipSummary, technologyEvolutionSummary, systemsDynamicsSummary, tradeoffIntelligenceSummary, portfolioIntelligenceSummary, priorityIntelligenceSummary, unifiedOrchestrationSummary, unifiedGraphView, operatingLayerSummary, connectionHubSummary, certificationSummary, hardeningSummary, uposSummary, uwpsSummary, ubafSummary, ubreSummary, uafSummary, uvcfSummary, uceSummary, bebSummary, ucieSummary, ubpeSummary, urcmpSummary, userId });

  logger.info(
    {
      userId,
      projectId: project.id,
      isNew,
      goalId: goal?.id,
      taskCount: tasks.length,
      reasoningConfidence: reasoningResult?.objectiveAnalysis.confidence.overall,
      judgmentId,
      activeGoalCount: activeGoals.length,
      activePlanCount: activePlans.length,
      activePlanId,
      activeExecutionCount: activeExecutions.length,
      activeExecutionId,
    },
    "Executive Brain resolved project/goal/tasks for request",
  );

  return {
    project: { ...project, currentPhase: nextPhase, currentTaskId: firstPendingTask?.id ?? null },
    goal,
    tasks,
    isNewProject: isNew,
    brainContextNote,
    reasoningResult,
    contextSnapshotId,
    judgmentId,
    activeGoals,
    activePlanId,
    activeExecutionId,
    observationSummary,
    reflectionSummary,
    learningSummary,
    governanceSummary,
    businessGraphSummary,
    businessAnalysisSummary,
    opportunityDiscoverySummary,
    simulationSummary,
    decisionSummary,
    strategySummary,
    planningSummary,
    capabilitySummary,
    operationalSummary,
    executionOrchestrationSummary,
    authoritySummary,
    executionRiskSummary,
    executionSimulationSummary,
    workflowSummary,
    universalExecutionSummary,
    adapterFrameworkSummary,
    capabilityIntelligenceSummary,
    platformInfrastructureSummary,
    globalTechnologySummary,
    technologyRelationshipSummary,
    technologyEvolutionSummary,
    systemsDynamicsSummary,
    tradeoffIntelligenceSummary,
    portfolioIntelligenceSummary,
    priorityIntelligenceSummary,
    unifiedOrchestrationSummary,
    unifiedGraphView,
    operatingLayerSummary,
    connectionHubSummary,
    certificationSummary,
    hardeningSummary,
    uposSummary,
    uwpsSummary,
    ubafSummary,
    ubreSummary,
    uafSummary,
  };
}

async function buildContextNote(params: {
  isNew: boolean;
  project: ExecutiveBrainResult["project"];
  goal: ExecutiveBrainResult["goal"];
  tasks: ExecutiveBrainResult["tasks"];
  orchestrationResult: ReturnType<typeof orchestrate> | null;
  reasoningResult: ExecutiveReasoningResult | undefined;
  contextSnapshot: ExecutiveContextSnapshot | undefined;
  judgmentId: string | undefined;
  activeGoals: ExecutiveGoal[];
  activePlans: ExecutivePlan[];
  activePlanId: string | undefined;
  activeExecutions: ExecutiveExecution[];
  activeExecutionId: string | undefined;
  observationSummary: ObservationSummary | undefined;
  reflectionSummary: ReflectionSummary | undefined;
  learningSummary: LearningSummary | undefined;
  governanceSummary: GovernanceSummary | undefined;
  businessGraphSummary: BusinessGraphSummary | undefined;
  businessAnalysisSummary: BusinessAnalysisSummary | undefined;
  opportunityDiscoverySummary: OpportunityDiscoverySummary | undefined;
  simulationSummary: SimulationSummary | undefined;
  decisionSummary: DecisionSummary | undefined;
  strategySummary: StrategySummary | undefined;
  planningSummary: PlanningSummary | undefined;
  capabilitySummary: CapabilitySummary | undefined;
  operationalSummary: OperationalSummary | undefined;
  executionOrchestrationSummary: ExecutionOrchestrationSummary | undefined;
  authoritySummary: AuthoritySummary | undefined;
  executionRiskSummary: ExecutionRiskSummary | undefined;
  executionSimulationSummary: ExecutionSimulationSummary | undefined;
  workflowSummary: WorkflowSummary | undefined;
  universalExecutionSummary: ExecutionSessionSummary | undefined;
  adapterFrameworkSummary: AdapterFrameworkSummary | undefined;
  capabilityIntelligenceSummary: CapabilityIntelligenceSummary | undefined;
  platformInfrastructureSummary: PlatformInfrastructureSummary | undefined;
  globalTechnologySummary: GlobalTechnologySummary | undefined;
  technologyRelationshipSummary: TechnologyRelationshipSummary | undefined;
  technologyEvolutionSummary: TechnologyEvolutionSummary | undefined;
  systemsDynamicsSummary: SystemsDynamicsSummary | undefined;
  tradeoffIntelligenceSummary: TradeoffIntelligenceSummary | undefined;
  portfolioIntelligenceSummary: PortfolioIntelligenceSummary | undefined;
  priorityIntelligenceSummary: PriorityIntelligenceSummary | undefined;
  unifiedOrchestrationSummary: UnifiedOrchestrationSummary | undefined;
  unifiedGraphView:            UnifiedGraphView | undefined;
  operatingLayerSummary:       OperatingLayerSummary | undefined;
  connectionHubSummary:        ConnectionHubSummary | undefined;
  certificationSummary:        CertificationSummary | undefined;
  hardeningSummary:            HardeningSummary | undefined;
  uposSummary:                 UPOSSummary | undefined;
  uwpsSummary:                 UWPSSummary | undefined;
  ubafSummary:                 UBAFSummary | undefined;
  ubreSummary:                 UBRESummary | undefined;
  uafSummary:                  UAFSummary | undefined;
  uvcfSummary:                 UVCFSummary | undefined;
  uceSummary:                  UCESummary | undefined;
  bebSummary:                  BEBSummary | undefined;
  ucieSummary:                 UCIESummary | undefined;
  ubpeSummary:                 UBPESummary | undefined;
  urcmpSummary:                URCMPSummary | undefined;
  userId: number;
}): Promise<string> {
  const { isNew, project, goal, tasks, orchestrationResult, reasoningResult, contextSnapshot, judgmentId, activeGoals, activePlans, activePlanId, activeExecutions, activeExecutionId, observationSummary, reflectionSummary, learningSummary, governanceSummary, businessGraphSummary, businessAnalysisSummary, opportunityDiscoverySummary, simulationSummary, decisionSummary, strategySummary, planningSummary, capabilitySummary, operationalSummary, executionOrchestrationSummary, authoritySummary, executionRiskSummary, executionSimulationSummary, workflowSummary, universalExecutionSummary, adapterFrameworkSummary, capabilityIntelligenceSummary, platformInfrastructureSummary, globalTechnologySummary, technologyRelationshipSummary, technologyEvolutionSummary, systemsDynamicsSummary, tradeoffIntelligenceSummary, portfolioIntelligenceSummary, priorityIntelligenceSummary, unifiedOrchestrationSummary, unifiedGraphView, operatingLayerSummary, connectionHubSummary, certificationSummary, hardeningSummary, uposSummary, uwpsSummary, ubafSummary, ubreSummary, uafSummary, uvcfSummary, uceSummary, bebSummary, ucieSummary, ubpeSummary, urcmpSummary, userId } = params;
  const lines = [
    `\n\n=== EXECUTIVE BRAIN PLAN (internal — for your situational awareness only, do not repeat this block verbatim) ===`,
    `Project: "${project.name}" (${isNew ? "new" : "existing"}, phase: ${project.currentPhase ?? "n/a"})`,
  ];
  if (goal) lines.push(`Current goal: ${goal.goalText} [priority: ${goal.priority}]`);
  if (tasks.length > 0) {
    lines.push(`Planned tasks:`);
    for (const t of tasks) {
      lines.push(`  - [${t.status}] (${t.assignedEngine}) ${t.description}`);
    }
  }

  // ── Executive Reasoning advisory (Build 003) ─────────────────────────────
  // Structured reasoning metadata from the six-stage pipeline, assembled into
  // a compact advisory for the AI Orchestrator's situational awareness.
  if (reasoningResult) {
    try {
      const { objectiveAnalysis, decisionRecord } = reasoningResult;
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      const conf = objectiveAnalysis.confidence;
      lines.push(
        clip(
          `Executive reasoning: ${objectiveAnalysis.primaryGoal} ` +
          `[complexity: ${objectiveAnalysis.complexity}, confidence: ${conf.overall}` +
          `(reasoning:${conf.reasoning} capability:${conf.capability} selection:${conf.brainSelection})]`,
          400,
        ),
      );
      if (objectiveAnalysis.knownConstraints.length > 0) {
        lines.push(clip(`Constraints: ${objectiveAnalysis.knownConstraints.slice(0, 3).join("; ")}`, 300));
      }
      if (decisionRecord.supportingContext.length > 0) {
        lines.push(clip(`Decision context: ${decisionRecord.supportingContext.join("; ")}`, 300));
      }
    } catch (err) {
      logger.warn({ err }, "Executive Brain: reasoning advisory failed (ignored)");
    }
  }

  // ── Cognitive Orchestration advisory (Build 002) ─────────────────────────
  // Zero-I/O: the orchestration result was computed before buildContextNote
  // was called, so this is a simple data read with no I/O risk.
  if (orchestrationResult) {
    try {
      const { selectedBrains, confidence, collaborationPlan } = orchestrationResult;
      if (selectedBrains.length > 0) {
        const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
        const brainList = selectedBrains.join(", ");
        const orderNote =
          collaborationPlan.executionOrder.length > 1
            ? ` (order: ${collaborationPlan.executionOrder.join(" → ")})`
            : "";
        lines.push(
          clip(
            `Cognitive orchestration: engaging [${brainList}]${orderNote} [confidence: ${confidence}]`,
            400,
          ),
        );
      }
    } catch (err) {
      logger.warn({ err }, "Executive Brain: orchestration advisory failed (ignored)");
    }
  }

  // ── Executive Context advisory (Build 006) ───────────────────────────────
  // Brief situational context from the resolved Executive Context Snapshot.
  // Zero-I/O: the snapshot was computed before buildContextNote was called.
  if (contextSnapshot) {
    try {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      if (contextSnapshot.activeObjectives.length > 0 || contextSnapshot.activePriorities.length > 0) {
        const objectives = contextSnapshot.activeObjectives.slice(0, 2).join("; ");
        const priorities = contextSnapshot.activePriorities.slice(0, 2).join("; ");
        const constraints = contextSnapshot.activeConstraints.slice(0, 2).join("; ");
        const parts = [
          objectives && `objectives: ${objectives}`,
          priorities && `priorities: ${priorities}`,
          constraints && `constraints: ${constraints}`,
        ].filter(Boolean).join(" | ");
        if (parts) {
          lines.push(
            clip(
              `Executive context (${contextSnapshot.contextIds.length} active context(s)): ${parts}`,
              500,
            ),
          );
        }
        if (contextSnapshot.conflictFlags.length > 0) {
          lines.push(
            clip(`Context conflicts detected: ${contextSnapshot.conflictFlags.slice(0, 2).join("; ")}`, 300),
          );
        }
      }
    } catch (err) {
      logger.warn({ err }, "Executive Brain: context advisory failed (ignored)");
    }
  }

  // ── Executive Planning advisory (Build 009) ──────────────────────────────
  // One-line summary of active plans and any newly generated plan.
  // Zero-I/O: activePlans were fetched before buildContextNote was called.
  try {
    const planAdvisory = buildPlanAdvisory(activePlans, activePlanId ?? null);
    if (planAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(planAdvisory, 500));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: planning advisory failed (ignored)");
  }

  // ── Executive Execution advisory (Build 010) ─────────────────────────────
  // One-line summary of active executions and any newly created execution.
  // Zero-I/O: activeExecutions were fetched before buildContextNote was called.
  try {
    const executionAdvisory = buildExecutionAdvisory(activeExecutions, activeExecutionId ?? null);
    if (executionAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(executionAdvisory, 500));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: execution advisory failed (ignored)");
  }

  // ── Executive Goal advisory (Build 008) ─────────────────────────────────
  // One-line summary of active goals that are influencing this request.
  // Zero-I/O: activeGoals were fetched before buildContextNote was called.
  if (activeGoals.length > 0) {
    try {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      const advisory = buildGoalAdvisory(activeGoals);
      if (advisory) lines.push(clip(advisory, 500));
    } catch (err) {
      logger.warn({ err }, "Executive Brain: goal advisory failed (ignored)");
    }
  }

  // ── Executive Judgment advisory (Build 007) ──────────────────────────────
  // One-line summary of the judgment recommendation derived from the reasoning
  // pipeline. Zero-I/O: judgment was computed before this function was called.
  if (judgmentId) {
    try {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(`Executive judgment (id: ${judgmentId}): recommendation available — consult /api/executive-judgment/${judgmentId} for scored options, explanation, and rationale.`, 500));
    } catch (err) {
      logger.warn({ err }, "Executive Brain: judgment advisory failed (ignored)");
    }
  }

  // ── Executive Observation advisory (Build 011) ───────────────────────────
  // Summary of recent observations, signals, anomalies, and trends.
  // Zero-I/O: the summary was fetched before buildContextNote was called.
  try {
    const observationAdvisory = buildObservationAdvisory(observationSummary ?? null);
    if (observationAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(observationAdvisory, 500));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: observation advisory failed (ignored)");
  }

  // ── Executive Reflection advisory (Build 012) ────────────────────────────
  // Summary of recent Executive Cases and Reflection Reports.
  // Zero-I/O: the summary was fetched before buildContextNote was called.
  try {
    const reflectionAdvisory = buildReflectionAdvisory(reflectionSummary ?? null);
    if (reflectionAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(reflectionAdvisory, 500));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: reflection advisory failed (ignored)");
  }

  // ── Executive Principle Learning advisory (Build 013) ────────────────────
  // Summary of validated principles discovered from experience.
  // Zero-I/O: the summary was fetched before buildContextNote was called.
  try {
    const learningAdvisory = buildLearningAdvisory(learningSummary ?? null);
    if (learningAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(learningAdvisory, 500));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: learning advisory failed (ignored)");
  }

  // ── Executive Governance advisory (Build 014) ────────────────────────────
  // Active behavior profile + approved policy advisories.
  // Executive reasoning reads ONLY through approved policies — never raw principles.
  // This is an async call (reads approved policies from DB) but fail-open.
  try {
    const governanceAdvisory = await buildGovernanceAdvisory(governanceSummary ?? null, userId);
    if (governanceAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(governanceAdvisory, 600));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: governance advisory failed (ignored)");
  }

  // ── Business Graph advisory (Build 015) ──────────────────────────────────
  // Assembles a compact business-aware context section from the graph state.
  // EB reasons over the graph; Business Graph NEVER reasons.
  // Fail-open: a failure here must never break context assembly.
  try {
    const bizAdvisory = buildBusinessAdvisory(businessGraphSummary ?? null);
    if (bizAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(bizAdvisory, 700));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: business graph advisory failed (ignored)");
  }

  // ── Business Analysis advisory (Build 016) ───────────────────────────────
  // Compact deterministic analysis: maturity, complexity, stability, findings,
  // top bottleneck, top constraint, top leverage point.
  // Business Analysis NEVER reasons; EB NEVER owns analysis state.
  // Fail-open: a failure here must never break context assembly.
  try {
    const analysisAdvisory = buildAnalysisAdvisory(businessAnalysisSummary ?? null);
    if (analysisAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(analysisAdvisory, 600));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: business analysis advisory failed (ignored)");
  }

  // ── Opportunity Discovery advisory (Build 017) ────────────────────────────
  // Top opportunities ranked by composite score: category, impact, confidence.
  // Opportunity Discovery identifies value; EB NEVER owns opportunity state.
  // Fail-open: a failure here must never break context assembly.
  try {
    const oppAdvisory = buildOpportunityAdvisory(opportunityDiscoverySummary ?? null);
    if (oppAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(oppAdvisory, 600));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: opportunity discovery advisory failed (ignored)");
  }

  // ── Future State Simulation advisory (Build 018) ──────────────────────────
  // Multiple possible business futures: highest value, lowest risk, highest
  // growth, avg risk. Simulation NEVER reasons; EB NEVER owns simulation state.
  // Fail-open: a failure here must never break context assembly.
  try {
    const simAdvisory = buildSimulationAdvisory(simulationSummary ?? null);
    if (simAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(simAdvisory, 600));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: future simulation advisory failed (ignored)");
  }

  // ── Decision Intelligence advisory (Build 019) ───────────────────────────
  // Selected executive decision: type, selection score, confidence, tradeoff note.
  // Decision Intelligence chooses; EB NEVER owns decision state.
  // Fail-open: a failure here must never break context assembly.
  try {
    const decAdvisory = buildDecisionAdvisory(decisionSummary ?? null);
    if (decAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(decAdvisory, 600));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: decision intelligence advisory failed (ignored)");
  }

  // ── Executive Strategy advisory (Build 020) ──────────────────────────────
  // Active strategy name, top pillars, alignment, confidence, objective count.
  // Executive Strategy defines direction; EB NEVER owns strategy state.
  // Fail-open: a failure here must never break context assembly.
  try {
    const stratAdvisory = buildStrategyAdvisory(strategySummary ?? null);
    if (stratAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(stratAdvisory, 600));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: executive strategy advisory failed (ignored)");
  }

  // ── Strategic Planning advisory (Build 021) ──────────────────────────────
  // Programmes, initiatives, milestones, readiness level, critical dependencies.
  // Strategic Planning organises work; EB NEVER owns planning state.
  // Fail-open: a failure here must never break context assembly.
  try {
    const planAdvisory = buildPlanningAdvisory(planningSummary ?? null);
    if (planAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(planAdvisory, 600));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: strategic planning advisory failed (ignored)");
  }

  // ── Capability Planning advisory (Build 022) ─────────────────────────────
  // Domains, requirements, gaps, readiness level, highest risk gap.
  // Capability Planning identifies what capabilities are required; EB NEVER owns capability state.
  // Fail-open: a failure here must never break context assembly.
  try {
    const capAdvisory = buildCapabilityAdvisory(capabilitySummary ?? null);
    if (capAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(capAdvisory, 600));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: capability planning advisory failed (ignored)");
  }

  // ── Operational Planning advisory (Build 023) ────────────────────────────
  // Phases, work packages, critical dependencies, execution readiness, confidence.
  // Operational Planning organises work for execution; EB NEVER owns operational state.
  // Fail-open: a failure here must never break context assembly.
  try {
    const opAdvisory = buildOperationalAdvisory(operationalSummary ?? null);
    if (opAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(opAdvisory, 600));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: operational planning advisory failed (ignored)");
  }

  // ── Execution Orchestration advisory (Build 024) ─────────────────────────
  // Assignments, automation ratio, critical blockers, readiness, confidence.
  // Execution Orchestration assigns responsibility; EB NEVER owns execution state.
  // Fail-open: a failure here must never break context assembly.
  try {
    const eoAdvisory = buildExecutionOrchestrationAdvisory(executionOrchestrationSummary ?? null);
    if (eoAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(eoAdvisory, 600));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: execution orchestration advisory failed (ignored)");
  }

  // ── Authority Resolution advisory (Build 025) ────────────────────────────
  // Requirements, grants, authorization score, missing authorities, pending approvals.
  // Authority Resolution determines whether execution is authorized; EB NEVER owns authority state.
  // Fail-open: a failure here must never break context assembly.
  try {
    const authAdvisory = buildAuthorityAdvisory(authoritySummary ?? null);
    if (authAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(authAdvisory, 600));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: authority resolution advisory failed (ignored)");
  }

  // ── Global Technology advisory (Build 033) ───────────────────────────────
  // Technology readiness, innovation score, open recommendations for administrator.
  // Fail-open: advisory failure must never break context assembly.
  try {
    const gtiAdvisory = buildGlobalTechnologyAdvisory(globalTechnologySummary ?? null);
    if (gtiAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(gtiAdvisory, 600));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: global technology advisory failed (ignored)");
  }

  // ── Technology Relationship advisory (Build 034) ─────────────────────────
  // Relationship graph overview: ecosystem coverage, conflict alerts, synergy and migration opportunities.
  // Architectural Law: advisory only. Never changes platform state.
  // Fail-open: advisory failure must never break context assembly.
  try {
    const triAdvisory = buildTechnologyRelationshipAdvisory(technologyRelationshipSummary ?? null);
    if (triAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(triAdvisory, 600));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: technology relationship advisory failed (ignored)");
  }

  // ── Technology Evolution advisory (Build 035) ─────────────────────────────
  // Lifecycle stages, trend directions, velocity, adoption, outlook per technology.
  // Architectural Law: advisory only. Never installs, upgrades, or modifies platform state.
  // Fail-open: advisory failure must never break context assembly.
  try {
    const teiAdvisory = buildTechnologyEvolutionAdvisory(technologyEvolutionSummary ?? null);
    if (teiAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(teiAdvisory, 600));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: technology evolution advisory failed (ignored)");
  }

  // ── Systems Dynamics advisory (Build 036) ─────────────────────────────────
  // System health, constraints, propagation risks, leverage opportunities, resilience.
  // Architectural Law: advisory only. Systems Thinking Law — never optimize one component
  // without evaluating the effect on the larger system. Fail-open.
  try {
    const sdiAdvisory = buildSystemsDynamicsAdvisory(systemsDynamicsSummary ?? null);
    if (sdiAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(sdiAdvisory, 600));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: systems dynamics advisory failed (ignored)");
  }

  // ── Executive Trade-off advisory (Build 037) ───────────────────────────────
  // Recent decision evaluations, frontier analysis, sensitivity flags, confidence.
  // Architectural Law: advisory only. Executive Optimization Law — never recommend
  // an option solely because it has the highest individual score. Fail-open.
  try {
    const etiAdvisory = buildTradeoffIntelligenceAdvisory(tradeoffIntelligenceSummary ?? null);
    if (etiAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(etiAdvisory, 600));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: trade-off intelligence advisory failed (ignored)");
  }

  // ── Executive Portfolio advisory (Build 038) ───────────────────────────────
  // Portfolio health, balance, capacity, exposures, high-priority recommendations.
  // Architectural Law: advisory only. Portfolio Optimization Law — local gains must
  // never reduce overall portfolio performance. Fail-open.
  try {
    const epiAdvisory = buildPortfolioIntelligenceAdvisory(portfolioIntelligenceSummary ?? null);
    if (epiAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(epiAdvisory, 600));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: portfolio intelligence advisory failed (ignored)");
  }

  // ── Executive Priority advisory (Build 039) ────────────────────────────────
  // Ranked priorities, blocked items, escalations, attention allocation, focus area.
  // Architectural Law: advisory only. Executive Priority Law — urgency alone never
  // determines priority; every score balances 8 dimensions. Fail-open.
  try {
    const epriAdvisory = buildPriorityIntelligenceAdvisory(priorityIntelligenceSummary ?? null);
    if (epriAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(epriAdvisory, 600));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: priority intelligence advisory failed (ignored)");
  }

  // ── Platform Infrastructure advisory (Build 032) ─────────────────────────
  // Platform readiness, resource health, pressure, performance score, top alerts.
  // Observes only — never provisions or modifies infrastructure.
  // Fail-open: a PII advisory failure must never break context assembly.
  try {
    const piiAdvisory = buildPlatformInfrastructureAdvisory(platformInfrastructureSummary ?? null);
    if (piiAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(piiAdvisory, 600));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: platform infrastructure advisory failed (ignored)");
  }

  // ── Capability Intelligence advisory (Build 031) ─────────────────────────
  // Capability health, reliability, availability, forecasts, and optimizations.
  // Evaluates only — never executes or changes adapter state.
  // Fail-open: a CI advisory failure must never break context assembly.
  try {
    const ciAdvisory = buildCapabilityIntelligenceAdvisory(capabilityIntelligenceSummary ?? null);
    if (ciAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(ciAdvisory, 600));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: capability intelligence advisory failed (ignored)");
  }

  // ── Adapter Framework advisory (Build 030) ───────────────────────────────
  // Available adapters, missing adapters, health, confidence, capability coverage.
  // Adapters execute; EB NEVER owns adapter state.
  // Fail-open: a failure here must never break context assembly.
  try {
    const afAdvisory = buildAdapterFrameworkAdvisory(adapterFrameworkSummary ?? null);
    if (afAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(afAdvisory, 600));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: adapter framework advisory failed (ignored)");
  }

  // ── Universal Execution advisory (Build 029) ─────────────────────────────
  // Sessions, nodes, health, success rate.
  // Execution executes; EB NEVER owns execution state.
  // Fail-open: a failure here must never break context assembly.
  try {
    const ueAdvisory = buildUniversalExecutionAdvisory(universalExecutionSummary ?? null);
    if (ueAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(ueAdvisory, 600));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: universal execution advisory failed (ignored)");
  }

  // ── Intelligent Workflow advisory (Build 028) ─────────────────────────────
  // Nodes, edges, checkpoints, phases, readiness, rollback coverage.
  // Workflow Construction builds; EB NEVER owns workflow state.
  // Fail-open: a failure here must never break context assembly.
  try {
    const wfAdvisory = buildWorkflowExecutionAdvisory(workflowSummary ?? null);
    if (wfAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(wfAdvisory, 600));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: workflow execution advisory failed (ignored)");
  }

  // ── Execution Simulation advisory (Build 027) ────────────────────────────
  // Scenarios, confidence, rollback confidence, estimated duration.
  // Simulation predicts; EB NEVER owns simulation state.
  // Fail-open: a failure here must never break context assembly.
  try {
    const simAdvisory = buildExecutionSimulationAdvisory(executionSimulationSummary ?? null);
    if (simAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(simAdvisory, 600));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: execution simulation advisory failed (ignored)");
  }

  // ── Execution Risk Assessment advisory (Build 026) ───────────────────────
  // Risk profiles, safety score, rollback readiness, highest risk, mitigation count.
  // Risk Assessment evaluates safety; EB NEVER owns risk state.
  // Fail-open: a failure here must never break context assembly.
  try {
    const riskAdvisory = buildRiskAdvisory(executionRiskSummary ?? null);
    if (riskAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(riskAdvisory, 600));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: execution risk advisory failed (ignored)");
  }

  // ── Unified Cognitive Orchestration advisory (Build 040) ─────────────────
  // Pipeline-level summary: engines, waves, avg confidence, success rate, law compliance.
  // Unified Cognition Law: no engine executes in isolation if its output depends on
  // evidence from another registered engine.
  // Fail-open: advisory failure must never break context assembly.
  try {
    const ucosAdvisory = buildOrchestrationAdvisory(unifiedOrchestrationSummary ?? null);
    if (ucosAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(ucosAdvisory, 600));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: unified cognitive orchestration advisory failed (ignored)");
  }

  // ── Build 041: Unified Knowledge Graph advisory ──────────────────────────
  // Canonical semantic model of ASH's full knowledge state — nodes, domains,
  // evidence items, and average confidence. Unified Knowledge Law: every
  // persistent cognitive artifact must be addressable through this graph.
  try {
    const kgAdvisory = buildGraphAdvisory(unifiedGraphView ?? null);
    if (kgAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(kgAdvisory, 500));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: unified knowledge graph advisory failed (ignored)");
  }

  // ── Build 043: Unified Digital Operating Layer advisory ──────────────────
  // Runtime environment — active sessions, channels, receipts, health.
  // Unified Operating Law: every external action must produce an execution receipt.
  try {
    const dolAdvisory = buildOperatingLayerAdvisory(operatingLayerSummary ?? null);
    if (dolAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(dolAdvisory, 500));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: digital operating layer advisory failed (ignored)");
  }

  // ── Build 044: Unified Connections & Integration Hub advisory ─────────────
  // Connection Summary, Provider Health, Quota Summary, Capability Coverage,
  // Provider Risks, Recommended Improvements — all deterministic reads.
  try {
    const hubAdvisory = buildConnectionsHubAdvisory(connectionHubSummary ?? null);
    if (hubAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(hubAdvisory, 500));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: connections hub advisory failed (ignored)");
  }

  // ── Build 045: Cognitive Certification & Launch Readiness advisory ─────────
  // Certification Summary, Readiness Score, Critical Findings, System Health,
  // Compliance Summary, Launch Advisory — passive snapshot read only.
  try {
    const certAdvisory = buildCertificationAdvisory(certificationSummary ?? null);
    if (certAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(certAdvisory, 600));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: certification advisory failed (ignored)");
  }

  // ── Build 045A: Launch Hardening Framework advisory ───────────────────────
  // Hardening Summary, Remaining Blockers, Verification Status,
  // Regression Warnings, Launch Confidence — passive snapshot read only.
  try {
    const hardeningAdvisory = buildHardeningAdvisory(hardeningSummary ?? null);
    if (hardeningAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(hardeningAdvisory, 500));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: hardening advisory failed (ignored)");
  }

  // ── Build 046: Unified Platform OS advisory ───────────────────────────────
  // Runtime summary: active apps, workspaces, projects, commands, health.
  // Context snapshot: current page/app/project/workspace/permissions for ASH.
  try {
    const uposAdvisory = buildUPOSAdvisory(uposSummary ?? null);
    if (uposAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(uposAdvisory, 500));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: UPOS advisory failed (ignored)");
  }

  // ── Build 047: Unified Workspace & Project System advisory ────────────────
  // Workspace summary: projects, assets, health scores, missing assets, activity.
  // ASH uses this to answer "what is missing?", "what should I build next?", etc.
  try {
    const uwpsAdvisory = buildUWPSAdvisory(uwpsSummary ?? null);
    if (uwpsAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(uwpsAdvisory, 500));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: UWPS advisory failed (ignored)");
  }

  // ── Build 048: Unified Business Asset Framework advisory ─────────────────
  // Canonical asset summary: total assets, classes, revenue assets, duplicates, missing classes.
  // ASH uses this to reason about businesses in canonical terms, not builder-specific terms.
  try {
    const ubafAdvisory = buildUBAFAdvisory(ubafSummary ?? null);
    if (ubafAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(ubafAdvisory, 500));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: UBAF advisory failed (ignored)");
  }

  // ── Build 049: Unified Builder Runtime Engine advisory ───────────────────
  // Builder runtime summary: active sessions, unsaved work, pending recoveries, publish readiness.
  // ASH uses this to answer "what changed?", "undo my last change", "what isn't ready to publish?".
  try {
    const ubreAdvisory = buildUBREAdvisory(ubreSummary ?? null);
    if (ubreAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(ubreAdvisory, 500));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: UBRE advisory failed (ignored)");
  }

  // ── Build 055: Unified Business Process Engine advisory ──────────────────
  // Process summary: total processes, active, blocked, SLA breaches, pending approvals, domain breakdown.
  // ASH uses this to answer "what's blocking revenue?", "which approvals are overdue?", "where are my bottlenecks?".
  try {
    const ubpeAdvisory = buildUBPEAdvisory(ubpeSummary ?? null);
    if (ubpeAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(ubpeAdvisory, 500));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: UBPE advisory failed (ignored)");
  }

    try {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      const urcmpAdvisory = buildURCMPAdvisory(urcmpSummary ?? null);
      if (urcmpAdvisory) {
        lines.push("--- COMMERCE INTELLIGENCE ---");
        lines.push(clip(urcmpAdvisory, 600));
      }
    } catch (err) {
      logger.warn({ err }, "Executive Brain: URCMP advisory failed (ignored)");
    }
  // ── Build 054: Unified Customer Intelligence Engine advisory ─────────────
  // Customer summary: total customers, active, organizations, interactions, lifecycle stages, health, LTV, duplicates.
  // ASH uses this to answer "who are my best customers?", "which leads need follow-up?", "who is at risk?".
  try {
    const ucieAdvisory = buildUCIEAdvisory(ucieSummary ?? null);
    if (ucieAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(ucieAdvisory, 500));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: UCIE advisory failed (ignored)");
  }

  // ── Build 053: Business Experience Builder advisory ──────────────────────
  // Experience summary: total experiences, published, pages, SEO scores, experience types.
  // ASH uses this to understand what digital experiences exist, what is missing, and how to improve them.
  try {
    const bebAdvisory = buildBEBAdvisory(bebSummary ?? null);
    if (bebAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(bebAdvisory, 500));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: BEB advisory failed (ignored)");
  }

  // ── Build 052: Universal Canvas Engine advisory ──────────────────────────
  // Canvas surface summary: total canvases, active sessions, renderers, modes.
  // ASH uses this to understand what is on canvas, what is selected, and what editing operations are available.
  try {
    const uceAdvisory = buildUCEAdvisory(uceSummary ?? null);
    if (uceAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(uceAdvisory, 500));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: UCE advisory failed (ignored)");
  }

  // ── Build 051: Unified Visual Component Framework advisory ───────────────
  // Component framework summary: total components, families, tokens, semantic/a11y coverage.
  // ASH uses this to understand the visual language and reason about components semantically.
  try {
    const uvcfAdvisory = buildUVCFAdvisory(uvcfSummary ?? null);
    if (uvcfAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(uvcfAdvisory, 500));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: UVCF advisory failed (ignored)");
  }

  // ── Build 050: Unified Application Framework advisory ────────────────────
  // Application framework summary: total apps, capabilities ASH can invoke, navigation pages.
  // ASH uses this to understand which apps are active and what actions are available to the user.
  try {
    const uafAdvisory = buildUAFAdvisory(uafSummary ?? null);
    if (uafAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(uafAdvisory, 500));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: UAF advisory failed (ignored)");
  }

  // ── Cognitive health advisory (Build 001) ────────────────────────────────
  // Zero-I/O read of the Cognitive Foundation's cached health snapshots —
  // never a live probe on the request path, and fail-open by contract: an
  // error here can never break context assembly.
  try {
    const concerns = getCachedHealthConcerns();
    if (concerns.length > 0) {
      // Probe messages can carry raw error text — clip each one and the
      // whole line so the advisory can never bloat the plan block.
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      const summarized = concerns
        .slice(0, 3)
        .map((c) => `${c.brainName} is ${c.state} (${clip(c.message.replace(/\s+/g, " "), 120)})`)
        .join("; ");
      const suffix = concerns.length > 3 ? `; +${concerns.length - 3} more` : "";
      lines.push(clip(`Cognitive health advisory: ${summarized}${suffix}. Degraded capabilities may fall back or be unavailable.`, 600));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: cognitive health advisory failed (ignored)");
  }

  // H-03 fix: token budget guard — prevent the context note from exceeding
  // 12,000 characters so it never crowds out the actual user conversation in
  // the model's context window. Strategy: keep the header lines (first 40%)
  // which contain project/goal/task/engine state, and the tail (last 20%)
  // which contain cognitive health; drop middle advisory lines proportionally.
  const BUDGET = 12_000;
  const raw = lines.join("\n");
  if (raw.length <= BUDGET) return raw;

  const total = lines.length;
  const keepHead = Math.ceil(total * 0.40);
  const keepTail = Math.ceil(total * 0.20);
  const dropped = total - keepHead - keepTail;
  const truncated = [
    ...lines.slice(0, keepHead),
    `[… ${dropped} advisory sections omitted to respect 12 000-character token budget …]`,
    ...lines.slice(total - keepTail),
  ].join("\n");

  // Hard-cap at BUDGET even after slice in case head+tail alone exceed it
  return truncated.length <= BUDGET ? truncated : truncated.slice(0, BUDGET - 1) + "…";
}
