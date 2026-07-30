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
}
