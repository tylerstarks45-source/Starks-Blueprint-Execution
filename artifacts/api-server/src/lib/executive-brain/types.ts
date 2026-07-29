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
}
