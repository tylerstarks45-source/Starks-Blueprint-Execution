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

  const { project, isNew } = await resolveActiveProject({ userId, message, systemInstanceId });

  const goal = await resolveGoalForRequest({ projectId: project.id, message, isNewProject: isNew });

  const tasks = await planTasks({ projectId: project.id, goalId: goal?.id ?? null, message });

  const firstPendingTask = tasks.find((t) => t.status === "pending") ?? tasks[0] ?? null;
  const nextPhase = isNew ? "planning" : (project.currentPhase ?? "execution");

  await updateProjectRollup({
    projectId: project.id,
    currentPhase: nextPhase,
    currentTaskId: firstPendingTask?.id ?? null,
  });

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
    activeGoals = await fetchActiveGoals(userId);
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
    activePlans = await fetchActivePlans(userId);
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
    activeExecutions = await fetchActiveExecutions(userId);
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
    observationSummary = await fetchObservationSummary(userId) ?? undefined;
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
    reflectionSummary = await fetchReflectionSummary(userId) ?? undefined;
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
    learningSummary = await fetchLearningSummary(userId) ?? undefined;
    triggerLearningCycle(userId); // fire-and-forget, internally throttled
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
    governanceSummary = await fetchGovernanceSummary(userId) ?? undefined;
    triggerGovernanceCycle(userId); // fire-and-forget, internally throttled
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
  let portfolioIntelligenceSummary:  import("../portfolio-intelligence/types").PortfolioIntelligenceSummary | undefined;
  let priorityIntelligenceSummary:   import("../priority-intelligence/types").PriorityIntelligenceSummary | undefined;
  let unifiedOrchestrationSummary:   UnifiedOrchestrationSummary | undefined;
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
    triggerOrchestrationSnapshot(); // fire-and-forget platform snapshot, every 280 cycles
  } catch (err) {
    logger.warn({ err }, "Executive Brain: unified cognitive cycle failed (ignored) — all summaries undefined");
  }

  const brainContextNote = await buildContextNote({ isNew, project, goal, tasks, orchestrationResult, reasoningResult, contextSnapshot, judgmentId, activeGoals, activePlans, activePlanId, activeExecutions, activeExecutionId, observationSummary, reflectionSummary, learningSummary, governanceSummary, businessGraphSummary, businessAnalysisSummary, opportunityDiscoverySummary, simulationSummary, decisionSummary, strategySummary, planningSummary, capabilitySummary, operationalSummary, executionOrchestrationSummary, authoritySummary, executionRiskSummary, executionSimulationSummary, workflowSummary, universalExecutionSummary, adapterFrameworkSummary, capabilityIntelligenceSummary, platformInfrastructureSummary, globalTechnologySummary, technologyRelationshipSummary, technologyEvolutionSummary, systemsDynamicsSummary, tradeoffIntelligenceSummary, portfolioIntelligenceSummary, priorityIntelligenceSummary, unifiedOrchestrationSummary, userId });

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
  portfolioIntelligenceSummary: import("../portfolio-intelligence/types").PortfolioIntelligenceSummary | undefined;
  priorityIntelligenceSummary: import("../priority-intelligence/types").PriorityIntelligenceSummary | undefined;
  unifiedOrchestrationSummary: UnifiedOrchestrationSummary | undefined;
  userId: number;
}): Promise<string> {
  const { isNew, project, goal, tasks, orchestrationResult, reasoningResult, contextSnapshot, judgmentId, activeGoals, activePlans, activePlanId, activeExecutions, activeExecutionId, observationSummary, reflectionSummary, learningSummary, governanceSummary, businessGraphSummary, businessAnalysisSummary, opportunityDiscoverySummary, simulationSummary, decisionSummary, strategySummary, planningSummary, capabilitySummary, operationalSummary, executionOrchestrationSummary, authoritySummary, executionRiskSummary, executionSimulationSummary, workflowSummary, universalExecutionSummary, adapterFrameworkSummary, capabilityIntelligenceSummary, platformInfrastructureSummary, globalTechnologySummary, technologyRelationshipSummary, technologyEvolutionSummary, systemsDynamicsSummary, tradeoffIntelligenceSummary, portfolioIntelligenceSummary, priorityIntelligenceSummary, unifiedOrchestrationSummary, userId } = params;
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

  return lines.join("\n");
}
