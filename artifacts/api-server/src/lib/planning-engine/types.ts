import type { AshTask, AshMilestone, AshDecision } from "@workspace/db";

// ─── ASH Brain v2.0 — Planning & Decision Engine (Phase 1.3) shared types ──
// Sits between the Executive Brain (Phase 1.1: decides project/goal/tasks)
// and the existing AI Orchestrator: takes the tasks the Executive Brain just
// created/resolved and (a) organizes them under milestones/phases for large
// objectives, (b) scores + orders them, (c) validates each is executable
// right now, (d) evaluates a go/no-go decision for whichever task is next.

export interface GeneratedMilestone {
  title: string;
  description: string | null;
  phase: string;
  orderIndex: number;
}

export interface TaskReadiness {
  task: AshTask;
  // "blocked" = explicit validation failure (persisted). "waiting" = pending
  // but a dependency isn't complete yet (derived, not persisted). "ready" =
  // pending with no unmet dependency. completed/failed mirror task.status.
  readiness: "blocked" | "waiting" | "ready" | "completed" | "failed" | "in_progress";
}

export interface ValidationIssue {
  reason: string; // human-readable explanation
  kind: "missing_credential" | "missing_approval" | "missing_file" | "missing_integration" | "unknown";
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

export interface DecisionEvaluation {
  decision: AshDecision;
  goalAlignmentScore: number; // 0-100
  confidenceScore: number; // 0-100
  riskLevel: "low" | "medium" | "high";
  risks: string[];
  requiredResources: string[];
  selectedPath: string;
  reasoning: string;
}

export interface PlanningEngineResult {
  milestones: AshMilestone[];
  tasks: AshTask[]; // refreshed after scoring/validation, includes blocked ones
  nextTask: AshTask | null; // the task the orchestrator should focus on this turn
  decision: DecisionEvaluation | null; // evaluation for nextTask, if any
  contextNote: string; // internal note appended alongside the Executive Brain's
}
