import type { AshProject, AshGoal, AshTask, AshTaskEngine } from "@workspace/db";
import type { ExecutiveReasoningResult } from "../cognitive-foundation/types";

// Shared shapes for the Executive Brain foundation layer. Kept in one file
// so project-manager / goal-manager / task-planner / index all agree on the
// same request/response contracts without circular imports.

export interface ExecutiveBrainRequest {
  userId: number;
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  systemInstanceId?: number;
  businessType?: string | null;
  revenueGoal?: string | null;
}

export interface PlannedTask {
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  assignedEngine: AshTaskEngine;
  // Indexes (0-based) into the same planned-tasks array this task depends on.
  dependsOnIndexes: number[];
}

export interface ExecutiveBrainResult {
  project: AshProject;
  goal: AshGoal | null;
  tasks: AshTask[];
  // Whether a brand-new project was created for this request (vs. continuing
  // an existing one). Useful for the caller/telemetry, not required downstream.
  isNewProject: boolean;
  // Human-readable summary appended to the message forwarded to the existing
  // AI Orchestrator so it has situational awareness of the plan. Never changes
  // orchestrator logic — purely additional context.
  brainContextNote: string;
  // Build 003: structured reasoning output from the Executive Reasoning Pipeline.
  // Optional — absent when the pipeline was skipped or failed entirely.
  reasoningResult?: ExecutiveReasoningResult;
  // Build 006: ID of the immutable Executive Context Snapshot resolved before
  // the reasoning cycle. Stored with the Decision Record so future replay,
  // auditing, and learning can reconstruct the full context in which the
  // decision was made. Optional — absent when no contexts exist or on failure.
  contextSnapshotId?: string;
  // Build 007: ID of the Executive Judgment produced from the reasoning result.
  // Links this response to the full judgment record (options scored, explanation,
  // alternative rankings). Optional — absent when judgment evaluation fails or
  // no reasoning result was available.
  judgmentId?: string;
  // Build 008: Active goals for this user at the time of the request.
  // Passed to the Judgment Engine so active high-priority goals influence
  // option scoring. Absent on failure or when no goals exist.
  activeGoals?: import("../executive-goal/types").ExecutiveGoal[];
  // Build 009: ID of the plan generated or retrieved for the primary active goal.
  // Links this response to the full plan (milestones, steps, dependency report).
  // Absent on failure, when no active goals exist, or when a plan already covers
  // the primary goal.
  activePlanId?: string;
  // Build 010: ID of the execution created or retrieved for the active plan.
  // Links this response to the full execution record (steps, history, recovery
  // points). Absent on failure, when no approved plan exists, or when an
  // execution already covers the active plan.
  activeExecutionId?: string;
  // Build 011: Summary of recent observations for this user at the time of the
  // request. Absent on failure or when no observations exist yet.
  observationSummary?: import("../executive-observation/types").ObservationSummary;
  // Build 012: Summary of recent Executive Cases and Reflection Reports for
  // this user. Absent on failure or when no cases exist yet.
  reflectionSummary?: import("../executive-reflection/types").ReflectionSummary;
  // Build 013: Validated Executive Principles available to the reasoning pipeline.
  // Draft and candidate principles are invisible here.
  learningSummary?: import("../executive-learning/types").LearningSummary;
  // Build 014: Active governance profile + approved policy advisories.
  // Executive reasoning reads ONLY through approved policies — never raw principles.
  // Draft and proposed policies are invisible here.
  governanceSummary?: import("../executive-governance/types").GovernanceSummary;
  // Build 015: Business Graph summary — the real-world business graph the EB is
  // reasoning about. Business Graph NEVER performs reasoning; EB NEVER owns
  // business state. Strict separation.
  businessGraphSummary?: import("../business-graph/types").BusinessGraphSummary;
  // Build 016: Business Analysis summary — deterministic executive analysis of
  // the business (bottlenecks, constraints, leverage points, findings).
  // Analysis Engine explains reality; EB reasons over summaries only.
  businessAnalysisSummary?: import("../business-analysis/types").BusinessAnalysisSummary;
  // Build 017: Opportunity Discovery summary — ranked opportunities derived from
  // analysis. Discovery identifies value; EB reasons over summaries only.
  opportunityDiscoverySummary?: import("../opportunity-discovery/types").OpportunityDiscoverySummary;
  // Build 018: Future State Simulation summary — multiple possible business futures
  // derived from opportunities. Simulation explores futures; EB NEVER owns simulation state.
  simulationSummary?: import("../future-simulation/types").SimulationSummary;
  // Build 019: Decision Intelligence summary — the selected executive decision and
  // its justification. Decision Intelligence chooses; EB NEVER owns decision state.
  decisionSummary?: import("../decision-intelligence/types").DecisionSummary;
  // Build 020: Executive Strategy summary — active strategy, top pillars, objectives.
  // Executive Strategy defines direction; EB NEVER owns strategy state.
  strategySummary?: import("../executive-strategy/types").StrategySummary;
  // Build 021: Strategic Planning summary — programmes, initiatives, milestones, readiness.
  // Strategic Planning organises work; EB NEVER owns planning state.
  planningSummary?: import("../strategic-planning/types").PlanningSummary;
  // Build 022: Capability Planning summary — domains, requirements, gaps, readiness.
  // Capability Planning identifies what capabilities are required; EB NEVER owns capability state.
  capabilitySummary?: import("../capability-planning/types").CapabilitySummary;
  // Build 023: Operational Planning summary — phases, work packages, dependencies, readiness.
  // Operational Planning organises work for execution; EB NEVER owns operational state.
  operationalSummary?: import("../operational-planning/types").OperationalSummary;
  // Build 024: Execution Orchestration summary — assignments, owners, blockers, automation ratio.
  // Execution Orchestration assigns responsibility; EB NEVER owns execution state.
  executionOrchestrationSummary?: import("../execution-orchestration/types").ExecutionOrchestrationSummary;
  // Build 025: Authority Resolution summary — requirements, grants, decisions, authorization score.
  // Authority Resolution determines whether execution is authorized; EB NEVER owns authority state.
  authoritySummary?: import("../authority-resolution/types").AuthoritySummary;
  // Build 026: Execution Risk Assessment summary — risk profiles, safety score, rollback readiness.
  // Risk Assessment evaluates safety; EB NEVER owns risk state.
  executionRiskSummary?: import("../execution-risk/types").ExecutionRiskSummary;
  // Build 027: Execution Simulation summary — scenarios, confidence, rollback, estimated duration.
  // Simulation predicts; EB NEVER owns simulation state.
  executionSimulationSummary?: import("../execution-simulation/types").ExecutionSimulationSummary;
  // Build 028: Workflow summary — nodes, edges, checkpoints, phases, readiness.
  // Workflow Construction builds; EB NEVER owns workflow state.
  workflowSummary?: import("../workflow-execution/types").WorkflowSummary;
  // Build 029: Universal Execution summary — sessions, nodes, health, success rate.
  // Execution executes; EB NEVER owns execution state.
  universalExecutionSummary?: import("../universal-execution/types").ExecutionSessionSummary;
  // Build 030: Adapter Framework summary — adapters, health, capability coverage.
  // Adapters execute; EB NEVER owns adapter state.
  adapterFrameworkSummary?: import("../adapter-framework/types").AdapterFrameworkSummary;
  capabilityIntelligenceSummary?: import("../capability-intelligence/types").CapabilityIntelligenceSummary;
  platformInfrastructureSummary?: import("../platform-infrastructure/types").PlatformInfrastructureSummary;
  globalTechnologySummary?: import("../global-technology/types").GlobalTechnologySummary;
  technologyRelationshipSummary?: import("../technology-relationships/types").TechnologyRelationshipSummary;
  technologyEvolutionSummary?: import("../technology-evolution/types").TechnologyEvolutionSummary;
  systemsDynamicsSummary?: import("../systems-dynamics/types").SystemsDynamicsSummary;
  tradeoffIntelligenceSummary?: import("../tradeoff-intelligence/types").TradeoffIntelligenceSummary;
  portfolioIntelligenceSummary?: import("../portfolio-intelligence/types").PortfolioIntelligenceSummary;
  priorityIntelligenceSummary?: import("../priority-intelligence/types").PriorityIntelligenceSummary;
  // Build 040: Unified Cognitive Orchestration Engine — aggregate metadata from the unified cognitive cycle.
  // The orchestrator runs all 25 intelligence engines (Builds 015–039) in dependency-ordered waves.
  // Unified Cognition Law: no engine executes in isolation if its output depends on evidence from another registered engine.
  unifiedOrchestrationSummary?: import("../unified-orchestration/types").UnifiedOrchestrationSummary;
  unifiedGraphView?:            import("../knowledge-graph/types").UnifiedGraphView;
  operatingLayerSummary?:      import("../digital-operating-layer/types").OperatingLayerSummary;
  connectionHubSummary?:       import("../connections-hub/types").ConnectionHubSummary;
  certificationSummary?:       import("../certification/types").CertificationSummary;
  hardeningSummary?:           import("../launch-hardening/types").HardeningSummary;
  uposSummary?:                import("../unified-platform/types").UPOSSummary;
  uwpsSummary?:                import("../unified-workspace/types").UWPSSummary;
  ubafSummary?:                import("../unified-asset/types").UBAFSummary;
  ubreSummary?:                import("../unified-builder-runtime/types").UBRESummary;
}
