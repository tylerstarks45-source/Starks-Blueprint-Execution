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
// Build 015: Business Graph Engine
import { fetchBusinessSummary, triggerGraphRefresh, buildBusinessAdvisory } from "./business-integration";
import type { BusinessGraphSummary } from "../business-graph/types";
// Build 016: Business Analysis Engine
import { fetchAnalysisSummary, triggerAnalysisRun, buildAnalysisAdvisory } from "./analysis-integration";
import type { BusinessAnalysisSummary } from "../business-analysis/types";
// Build 017: Opportunity Discovery Engine
import { fetchOpportunitySummary, triggerOpportunityRun, buildOpportunityAdvisory } from "./opportunity-integration";
import type { OpportunityDiscoverySummary } from "../opportunity-discovery/types";
// Build 018: Future State Simulation Engine
import { fetchSimulationSummary, triggerSimulationRun, buildSimulationAdvisory } from "./simulation-integration";
import type { SimulationSummary } from "../future-simulation/types";
// Build 019: Decision Intelligence Engine
import { fetchDecisionSummary, triggerDecisionRun, buildDecisionAdvisory } from "./decision-integration";
import type { DecisionSummary } from "../decision-intelligence/types";
// Build 020: Executive Strategy Engine
import { fetchStrategySummary, triggerStrategyRun, buildStrategyAdvisory } from "./strategy-integration";
import type { StrategySummary } from "../executive-strategy/types";
// Build 021: Strategic Planning Engine
import { fetchPlanSummary, triggerPlanningRun, buildPlanningAdvisory } from "./planning-integration";
import type { PlanningSummary } from "../strategic-planning/types";
// Build 022: Capability Planning Engine
import { fetchCapabilitySummary, triggerCapabilityRun, buildCapabilityAdvisory } from "./capability-integration";
import type { CapabilitySummary } from "../capability-planning/types";
// Build 023: Operational Planning Engine
import { fetchOperationalSummary, triggerOperationalRun, buildOperationalAdvisory } from "./operational-integration";
import type { OperationalSummary } from "../operational-planning/types";
// Build 024: Execution Orchestration Engine
import { fetchExecutionOrchestrationSummary, triggerExecutionOrchestrationRun, buildExecutionOrchestrationAdvisory } from "./execution-orchestration-integration";
import type { ExecutionOrchestrationSummary } from "../execution-orchestration/types";
// Build 025: Authority Resolution Engine
import { fetchAuthoritySummary, triggerAuthorityResolutionRun, buildAuthorityAdvisory } from "./authority-resolution-integration";
import type { AuthoritySummary } from "../authority-resolution/types";
// Build 026: Execution Risk Assessment Engine
import { fetchExecutionRiskSummary, triggerRiskAssessmentRun, buildRiskAdvisory } from "./execution-risk-integration";
import type { ExecutionRiskSummary } from "../execution-risk/types";
// Build 027: Execution Simulation Engine
import { fetchExecutionSimulationSummary, triggerExecutionSimulationRun, buildExecutionSimulationAdvisory } from "./execution-simulation-integration";
import type { ExecutionSimulationSummary } from "../execution-simulation/types";
// Build 028: Intelligent Workflow Execution Engine
import { fetchWorkflowExecutionSummary, triggerWorkflowBuildRun, buildWorkflowExecutionAdvisory } from "./workflow-execution-integration";
import type { WorkflowSummary } from "../workflow-execution/types";
// Build 029: Universal Execution Engine
import { fetchUniversalExecutionSummary, triggerUniversalExecutionRun, buildUniversalExecutionAdvisory } from "./universal-execution-integration";
import type { ExecutionSessionSummary } from "../universal-execution/types";
// Build 030: Universal Execution Adapter Framework
import { fetchAdapterFrameworkSummary, triggerAdapterFrameworkScan, buildAdapterFrameworkAdvisory } from "./adapter-framework-integration";
import type { AdapterFrameworkSummary } from "../adapter-framework/types";
// Build 031: Adaptive Capability Intelligence Engine
import { fetchCapabilityIntelligenceSummary, triggerCapabilityIntelligenceScan, buildCapabilityIntelligenceAdvisory } from "./capability-intelligence-integration";
import type { CapabilityIntelligenceSummary } from "../capability-intelligence/types";
// Build 032: Platform Infrastructure Intelligence Engine
import { fetchPlatformInfrastructureSummary, triggerPlatformInfrastructureScan, buildPlatformInfrastructureAdvisory } from "./platform-infrastructure-integration";
import { fetchGlobalTechnologySummary, triggerGlobalTechnologyScan, buildGlobalTechnologyAdvisory } from "./global-technology-integration";
import { fetchTechnologyRelationshipSummary, triggerTechnologyRelationshipRebuild, buildTechnologyRelationshipAdvisory } from "./technology-relationships-integration";
import { fetchTechnologyEvolutionSummary, triggerTechnologyEvolutionRebuild, buildTechnologyEvolutionAdvisory } from "./technology-evolution-integration";
import { fetchSystemsDynamicsSummary, triggerSystemsDynamicsRebuild, buildSystemsDynamicsAdvisory } from "./systems-dynamics-integration";
import { fetchTradeoffIntelligenceSummary, triggerTradeoffIntelligenceRebuild, buildTradeoffIntelligenceAdvisory } from "./tradeoff-intelligence-integration";
import { fetchPortfolioIntelligenceSummary, triggerPortfolioIntelligenceRebuild, buildPortfolioIntelligenceAdvisory } from "./portfolio-intelligence-integration";
import { fetchPriorityIntelligenceSummary, triggerPriorityIntelligenceRebuild, buildPriorityIntelligenceAdvisory } from "./priority-intelligence-integration";
import type { GlobalTechnologySummary } from "../global-technology/types";
import type { PlatformInfrastructureSummary } from "../platform-infrastructure/types";
import type { TechnologyRelationshipSummary } from "../technology-relationships/types";
import type { TechnologyEvolutionSummary } from "../technology-evolution/types";
import type { SystemsDynamicsSummary } from "../systems-dynamics/types";
import type { TradeoffIntelligenceSummary } from "../tradeoff-intelligence/types";

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

  // ── Business Graph Engine (Build 015) ───────────────────────────────────────
  // Fetch the Business Graph summary for the primary business of this user.
  // Executive Brain reasons OVER the graph; Business Graph NEVER reasons.
  // Business Graph NEVER owns EB state; EB NEVER owns business state.
  // Trigger a background graph refresh every 30 brain cycles (throttled).
  // Fail-open: a business graph failure must never block the request path.
  let businessGraphSummary: BusinessGraphSummary | undefined;
  try {
    businessGraphSummary = await fetchBusinessSummary(userId) ?? undefined;
    triggerGraphRefresh(userId); // fire-and-forget, internally throttled
  } catch (err) {
    logger.warn({ err }, "Executive Brain: business graph step failed (ignored)");
  }

  // ── Business Analysis Engine (Build 016) ─────────────────────────────────────
  // Fetch the latest Business Analysis summary for the user's primary business.
  // Business Analysis NEVER performs reasoning; EB NEVER owns analysis state.
  // Trigger a background analysis run every 40 brain cycles (throttled).
  // Fail-open: an analysis failure must never block the request path.
  let businessAnalysisSummary: BusinessAnalysisSummary | undefined;
  try {
    businessAnalysisSummary = await fetchAnalysisSummary(userId) ?? undefined;
    if (businessGraphSummary?.businessId) {
      triggerAnalysisRun(userId, businessGraphSummary.businessId);
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: business analysis step failed (ignored)");
  }

  // ── Opportunity Discovery Engine (Build 017) ──────────────────────────────────
  // Fetch the latest Opportunity Discovery summary for the user's primary business.
  // Opportunity Discovery identifies value; EB NEVER owns opportunity state.
  // Trigger a background discovery run every 50 brain cycles (throttled).
  // Fail-open: a discovery failure must never block the request path.
  let opportunityDiscoverySummary: OpportunityDiscoverySummary | undefined;
  try {
    opportunityDiscoverySummary = await fetchOpportunitySummary(userId) ?? undefined;
    if (businessGraphSummary?.businessId) {
      triggerOpportunityRun(userId, businessGraphSummary.businessId);
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: opportunity discovery step failed (ignored)");
  }

  // ── Future State Simulation Engine (Build 018) ────────────────────────────────
  // Fetch the latest Simulation summary — multiple possible business futures.
  // Simulation explores futures; EB NEVER owns simulation state.
  // Trigger a background simulation run every 60 brain cycles (throttled).
  // Fail-open: a simulation failure must never block the request path.
  let simulationSummary: SimulationSummary | undefined;
  try {
    simulationSummary = await fetchSimulationSummary(userId) ?? undefined;
    if (businessGraphSummary?.businessId) {
      triggerSimulationRun(userId, businessGraphSummary.businessId);
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: future simulation step failed (ignored)");
  }

  // ── Decision Intelligence Engine (Build 019) ─────────────────────────────────
  // Fetch the latest Decision summary — selected executive decision + justification.
  // Decision Intelligence chooses; EB NEVER owns decision state.
  // Trigger a background decision run every 70 brain cycles (throttled).
  // Fail-open: a decision failure must never block the request path.
  let decisionSummary: DecisionSummary | undefined;
  try {
    decisionSummary = await fetchDecisionSummary(userId) ?? undefined;
    if (businessGraphSummary?.businessId) {
      triggerDecisionRun(userId, businessGraphSummary.businessId);
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: decision intelligence step failed (ignored)");
  }

  // ── Executive Strategy Engine (Build 020) ────────────────────────────────────
  // Fetch the latest Strategy summary — active strategy, top pillars, objectives.
  // Executive Strategy defines direction; EB NEVER owns strategy state.
  // Trigger a background strategy run every 80 brain cycles (throttled).
  // Fail-open: a strategy failure must never block the request path.
  let strategySummary: StrategySummary | undefined;
  try {
    strategySummary = await fetchStrategySummary(userId) ?? undefined;
    if (businessGraphSummary?.businessId) {
      triggerStrategyRun(userId, businessGraphSummary.businessId);
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: executive strategy step failed (ignored)");
  }

  // ── Strategic Planning Engine (Build 021) ────────────────────────────────────
  // Fetch the latest Planning summary — programmes, initiatives, milestones, readiness.
  // Strategic Planning organises work; EB NEVER owns planning state.
  // Trigger a background planning run every 90 brain cycles (throttled).
  // Fail-open: a planning failure must never block the request path.
  let planningSummary: PlanningSummary | undefined;
  try {
    planningSummary = await fetchPlanSummary(userId) ?? undefined;
    if (businessGraphSummary?.businessId) {
      triggerPlanningRun(userId, businessGraphSummary.businessId);
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: strategic planning step failed (ignored)");
  }

  // ── Capability Planning Engine (Build 022) ───────────────────────────────────
  // Fetch the latest Capability summary — domains, requirements, gaps, readiness.
  // Capability Planning identifies required capabilities; EB NEVER owns capability state.
  // Trigger a background capability run every 100 brain cycles (throttled).
  // Fail-open: a capability failure must never block the request path.
  let capabilitySummary: CapabilitySummary | undefined;
  try {
    capabilitySummary = await fetchCapabilitySummary(userId) ?? undefined;
    if (businessGraphSummary?.businessId) {
      triggerCapabilityRun(userId, businessGraphSummary.businessId);
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: capability planning step failed (ignored)");
  }

  // ── Operational Planning Engine (Build 023) ──────────────────────────────────
  // Fetch the latest Operational summary — phases, work packages, dependencies, readiness.
  // Operational Planning organises work for execution; EB NEVER owns operational state.
  // Trigger a background operational run every 110 brain cycles (throttled).
  // Fail-open: an operational failure must never block the request path.
  let operationalSummary: OperationalSummary | undefined;
  try {
    operationalSummary = await fetchOperationalSummary(userId) ?? undefined;
    if (businessGraphSummary?.businessId) {
      triggerOperationalRun(userId, businessGraphSummary.businessId);
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: operational planning step failed (ignored)");
  }

  // ── Execution Orchestration Engine (Build 024) ───────────────────────────────
  // Fetch the latest Execution Orchestration summary — assignments, owners, blockers, automation ratio.
  // Execution Orchestration assigns responsibility; EB NEVER owns execution state.
  // Trigger a background orchestration run every 120 brain cycles (throttled).
  // Fail-open: an orchestration failure must never block the request path.
  let executionOrchestrationSummary: ExecutionOrchestrationSummary | undefined;
  try {
    executionOrchestrationSummary = await fetchExecutionOrchestrationSummary(userId) ?? undefined;
    if (businessGraphSummary?.businessId) {
      triggerExecutionOrchestrationRun(userId, businessGraphSummary.businessId);
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: execution orchestration step failed (ignored)");
  }

  // ── Authority Resolution Engine (Build 025) ──────────────────────────────────
  // Fetch the latest Authority Resolution summary — requirements, grants, decisions, authorization score.
  // Authority Resolution determines whether execution is authorized; EB NEVER owns authority state.
  // Trigger a background authority resolution run every 130 brain cycles (throttled).
  // Fail-open: an authority failure must never block the request path.
  let authoritySummary: AuthoritySummary | undefined;
  try {
    authoritySummary = await fetchAuthoritySummary(userId) ?? undefined;
    if (businessGraphSummary?.businessId) {
      triggerAuthorityResolutionRun(userId, businessGraphSummary.businessId);
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: authority resolution step failed (ignored)");
  }

  // ── Platform Infrastructure Intelligence Engine (Build 032) ──────────────
  // Observes the computing environment: CPU, RAM, GPU, storage, database, queues, adapters.
  // This engine observes and advises only — never provisions or modifies infrastructure.
  // Fail-open: a PII failure must never block the EB request path.
  let platformInfrastructureSummary: PlatformInfrastructureSummary | undefined;
  try {
    platformInfrastructureSummary = await fetchPlatformInfrastructureSummary(userId) ?? undefined;
    triggerPlatformInfrastructureScan(userId);
  } catch (err) {
    logger.warn({ err }, "Executive Brain: platform infrastructure step failed (ignored)");
  }

  // ── Global Technology Intelligence Engine (Build 033) ────────────────────
  // Catalogs external technologies ASH may leverage with administrator approval.
  // Observes and advises only — never installs or provisions anything.
  let globalTechnologySummary: GlobalTechnologySummary | undefined;
  try {
    globalTechnologySummary = await fetchGlobalTechnologySummary(userId) ?? undefined;
    triggerGlobalTechnologyScan(userId);
  } catch (err) {
    logger.warn({ err }, "Executive Brain: global technology step failed (ignored)");
  }

  // ── Technology Relationship Intelligence Engine (Build 034) ──────────────
  // Models how technologies relate: dependency graph, ecosystem mapping,
  // synergy scores, conflict detection, migration paths.
  // Architectural Law: never installs, creates adapters, or changes platform state. Observes only.
  let technologyRelationshipSummary: TechnologyRelationshipSummary | undefined;
  try {
    technologyRelationshipSummary = await fetchTechnologyRelationshipSummary(userId) ?? undefined;
    triggerTechnologyRelationshipRebuild(userId);
  } catch (err) {
    logger.warn({ err }, "Executive Brain: technology relationship step failed (ignored)");
  }

  // ── Technology Evolution Intelligence Engine (Build 035) ─────────────────
  // Models how technologies change over time: lifecycle, trends, velocity,
  // adoption patterns, future outlook. Never installs or upgrades anything.
  // Architectural Law: observation-only intelligence. Fail-open.
  let technologyEvolutionSummary: TechnologyEvolutionSummary | undefined;
  try {
    technologyEvolutionSummary = await fetchTechnologyEvolutionSummary(userId) ?? undefined;
    triggerTechnologyEvolutionRebuild(userId);
  } catch (err) {
    logger.warn({ err }, "Executive Brain: technology evolution step failed (ignored)");
  }

  // ── Systems Dynamics Intelligence Engine (Build 036) ─────────────────────
  // Models complete system behavior: feedback loops, propagation paths,
  // constraints, leverage points, resilience. Never executes or modifies state.
  // Architectural Law: observation-only — Systems Thinking Law applies. Fail-open.
  let systemsDynamicsSummary: SystemsDynamicsSummary | undefined;
  try {
    systemsDynamicsSummary = await fetchSystemsDynamicsSummary(userId) ?? undefined;
    triggerSystemsDynamicsRebuild(userId);
  } catch (err) {
    logger.warn({ err }, "Executive Brain: systems dynamics step failed (ignored)");
  }

  // ── Executive Trade-off Intelligence Engine (Build 037) ───────────────────
  // Multi-objective decision evaluation: constraint modeling, Pareto frontiers,
  // sensitivity analysis, executive recommendations. Never executes decisions.
  // Architectural Law: evaluation-only — Executive Optimization Law applies. Fail-open.
  let tradeoffIntelligenceSummary: TradeoffIntelligenceSummary | undefined;
  try {
    tradeoffIntelligenceSummary = await fetchTradeoffIntelligenceSummary(userId) ?? undefined;
    triggerTradeoffIntelligenceRebuild(userId);
  } catch (err) {
    logger.warn({ err }, "Executive Brain: trade-off intelligence step failed (ignored)");
  }

  // ── Executive Portfolio Intelligence Engine (Build 038) ───────────────────
  // Portfolio evaluation: balance, allocation, exposure, capacity, recommendations.
  // Never executes initiatives or reallocates resources automatically.
  // Architectural Law: evaluation-only — Portfolio Optimization Law applies. Fail-open.
  let portfolioIntelligenceSummary: import("../portfolio-intelligence/types").PortfolioIntelligenceSummary | undefined;
  try {
    portfolioIntelligenceSummary = await fetchPortfolioIntelligenceSummary(userId) ?? undefined;
    triggerPortfolioIntelligenceRebuild(userId);
  } catch (err) {
    logger.warn({ err }, "Executive Brain: portfolio intelligence step failed (ignored)");
  }

  // ── Executive Priority Intelligence Engine (Build 039) ────────────────────
  // Continuously ranks every initiative, opportunity, execution, and recommendation
  // by executive value across 8 dimensions. Never executes or changes plans.
  // Architectural Law: evaluation-only — Executive Priority Law applies. Fail-open.
  let priorityIntelligenceSummary: import("../priority-intelligence/types").PriorityIntelligenceSummary | undefined;
  try {
    priorityIntelligenceSummary = await fetchPriorityIntelligenceSummary(userId) ?? undefined;
    triggerPriorityIntelligenceRebuild(userId);
  } catch (err) {
    logger.warn({ err }, "Executive Brain: priority intelligence step failed (ignored)");
  }

  // ── Adaptive Capability Intelligence Engine (Build 031) ──────────────────
  // Evaluates readiness, health, reliability, availability of every installed adapter capability.
  // This engine evaluates only — it never executes workflows or modifies adapter state.
  // Fail-open: a CI failure must never block the EB request path.
  let capabilityIntelligenceSummary: CapabilityIntelligenceSummary | undefined;
  try {
    capabilityIntelligenceSummary = await fetchCapabilityIntelligenceSummary(userId) ?? undefined;
    triggerCapabilityIntelligenceScan(userId);
  } catch (err) {
    logger.warn({ err }, "Executive Brain: capability intelligence step failed (ignored)");
  }

  // ── Universal Execution Adapter Framework (Build 030) ────────────────────
  // Fetch available adapters, health, capability coverage.
  // Adapters execute; EB NEVER owns adapter state.
  // Trigger a background adapter scan every 180 brain cycles (throttled).
  // Fail-open: an adapter scan failure must never block the request path.
  let adapterFrameworkSummary: AdapterFrameworkSummary | undefined;
  try {
    adapterFrameworkSummary = await fetchAdapterFrameworkSummary(userId) ?? undefined;
    triggerAdapterFrameworkScan(userId);
  } catch (err) {
    logger.warn({ err }, "Executive Brain: adapter framework step failed (ignored)");
  }

  // ── Universal Execution Engine (Build 029) ───────────────────────────────
  // Fetch the latest execution summary — sessions, nodes, health, success rate.
  // Execution executes; EB NEVER owns execution state.
  // Trigger a background execution run every 170 brain cycles (throttled).
  // Fail-open: an execution failure must never block the request path.
  let universalExecutionSummary: ExecutionSessionSummary | undefined;
  try {
    universalExecutionSummary = await fetchUniversalExecutionSummary(userId) ?? undefined;
    if (businessGraphSummary?.businessId) {
      triggerUniversalExecutionRun(userId, businessGraphSummary.businessId);
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: universal execution step failed (ignored)");
  }

  // ── Intelligent Workflow Execution Engine (Build 028) ────────────────────────
  // Fetch the latest Workflow summary — nodes, edges, checkpoints, phases, readiness.
  // Workflow Construction builds; EB NEVER owns workflow state.
  // Trigger a background workflow build every 160 brain cycles (throttled).
  // Fail-open: a workflow failure must never block the request path.
  let workflowSummary: WorkflowSummary | undefined;
  try {
    workflowSummary = await fetchWorkflowExecutionSummary(userId) ?? undefined;
    if (businessGraphSummary?.businessId) {
      triggerWorkflowBuildRun(userId, businessGraphSummary.businessId);
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: workflow execution step failed (ignored)");
  }

  // ── Execution Simulation Engine (Build 027) ───────────────────────────────────
  // Fetch the latest Execution Simulation summary — scenarios, confidence, rollback, estimated duration.
  // Simulation predicts execution behaviour; EB NEVER owns simulation state.
  // Trigger a background simulation run every 150 brain cycles (throttled).
  // Fail-open: a simulation failure must never block the request path.
  let executionSimulationSummary: ExecutionSimulationSummary | undefined;
  try {
    executionSimulationSummary = await fetchExecutionSimulationSummary(userId) ?? undefined;
    if (businessGraphSummary?.businessId) {
      triggerExecutionSimulationRun(userId, businessGraphSummary.businessId);
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: execution simulation step failed (ignored)");
  }

  // ── Execution Risk Assessment Engine (Build 026) ──────────────────────────────
  // Fetch the latest Execution Risk summary — risk profiles, safety score, rollback readiness.
  // Risk Assessment evaluates operational safety; EB NEVER owns risk state.
  // Trigger a background risk assessment run every 140 brain cycles (throttled).
  // Fail-open: a risk failure must never block the request path.
  let executionRiskSummary: ExecutionRiskSummary | undefined;
  try {
    executionRiskSummary = await fetchExecutionRiskSummary(userId) ?? undefined;
    if (businessGraphSummary?.businessId) {
      triggerRiskAssessmentRun(userId, businessGraphSummary.businessId);
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: execution risk assessment step failed (ignored)");
  }

  const brainContextNote = await buildContextNote({ isNew, project, goal, tasks, orchestrationResult, reasoningResult, contextSnapshot, judgmentId, activeGoals, activePlans, activePlanId, activeExecutions, activeExecutionId, observationSummary, reflectionSummary, learningSummary, governanceSummary, businessGraphSummary, businessAnalysisSummary, opportunityDiscoverySummary, simulationSummary, decisionSummary, strategySummary, planningSummary, capabilitySummary, operationalSummary, executionOrchestrationSummary, authoritySummary, executionRiskSummary, executionSimulationSummary, workflowSummary, universalExecutionSummary, adapterFrameworkSummary, capabilityIntelligenceSummary, platformInfrastructureSummary, globalTechnologySummary, technologyRelationshipSummary, technologyEvolutionSummary, systemsDynamicsSummary, tradeoffIntelligenceSummary, portfolioIntelligenceSummary, priorityIntelligenceSummary, userId });

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
  userId: number;
}): Promise<string> {
  const { isNew, project, goal, tasks, orchestrationResult, reasoningResult, contextSnapshot, judgmentId, activeGoals, activePlans, activePlanId, activeExecutions, activeExecutionId, observationSummary, reflectionSummary, learningSummary, governanceSummary, businessGraphSummary, businessAnalysisSummary, opportunityDiscoverySummary, simulationSummary, decisionSummary, strategySummary, planningSummary, capabilitySummary, operationalSummary, executionOrchestrationSummary, authoritySummary, executionRiskSummary, executionSimulationSummary, workflowSummary, universalExecutionSummary, adapterFrameworkSummary, capabilityIntelligenceSummary, platformInfrastructureSummary, globalTechnologySummary, technologyRelationshipSummary, technologyEvolutionSummary, systemsDynamicsSummary, tradeoffIntelligenceSummary, portfolioIntelligenceSummary, priorityIntelligenceSummary, userId } = params;
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
