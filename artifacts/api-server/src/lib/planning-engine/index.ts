import type { AshProject, AshGoal, AshTask } from "@workspace/db";
import { logger } from "../logger";
import { planMilestonesForGoal, assignTasksToMilestones, listMilestones } from "./milestone-planner";
import { reprioritizeProject } from "./prioritization";
import { classifyProjectTasks, pickNextReadyTask } from "./dependency-manager";
import { validateProjectTasks } from "./validation";
import { evaluateExecutionDecision, countConnectedCredentials } from "./decision-engine";
import type { PlanningEngineResult } from "./types";

export * from "./types";
export * as MilestonePlanner from "./milestone-planner";
export * as Prioritization from "./prioritization";
export * as DependencyManager from "./dependency-manager";
export * as Validation from "./validation";
export * as DecisionEngine from "./decision-engine";
export { handleTaskFailure, handleTaskCompletion } from "./adaptation";

// ─── Planning & Decision Engine (ASH Brain v2.0 — Phase 1.3) ───────────────
//
// Sits between the Executive Brain (Phase 1.1: resolves project/goal/tasks
// for this request) and the existing AI Orchestrator. Never re-decides what
// project/goal/tasks this request belongs to — it takes what the Executive
// Brain already produced and:
//   1. Groups tasks under generated milestones/phases for large objectives
//   2. Scores + orders every open task (priority/complexity/dependency/duration)
//   3. Validates each new task can actually execute right now (credentials,
//      files, approvals) — blocking the ones that can't, without blocking
//      the rest of the plan
//   4. Picks the single "ready" task to focus on this turn and runs the
//      Decision Engine against it (goal alignment, risk, confidence, path)
//
// Like the Executive Brain and Memory Engine before it, every step here is
// wrapped so a failure degrades to "skip this step" rather than blocking the
// user's request from reaching the existing, unmodified orchestrator.
export async function runPlanningEngine(params: {
  userId: number;
  project: AshProject;
  goal: AshGoal | null;
  tasks: AshTask[];
  isNewProject: boolean;
}): Promise<PlanningEngineResult> {
  const { userId, project, goal, tasks, isNewProject } = params;

  // 1. Milestones/phases (large objectives only; no-op for short chat turns).
  let milestones = await safeStep(
    () => planMilestonesForGoal({ projectId: project.id, goalId: goal?.id ?? null, objective: project.objective ?? "", isNewProject, userId }),
    [],
    "milestone planning",
  );
  if (milestones.length === 0) {
    milestones = await safeStep(() => listMilestones(project.id), [], "milestone lookup");
  } else {
    const newlyPlannedTaskIds = tasks.filter((t) => t.milestoneId == null).map((t) => t.id);
    await safeStep(() => assignTasksToMilestones(newlyPlannedTaskIds, milestones), undefined, "milestone assignment");
  }

  // 2. Validate this turn's newly-planned tasks, and re-check any
  // previously-blocked task in the project in case its missing resource is
  // now available (see validateProjectTasks).
  await safeStep(
    () => validateProjectTasks({ projectId: project.id, newTasks: tasks, userId, systemInstanceId: project.systemInstanceId }),
    tasks,
    "task validation",
  );

  // 3. Score + order every open task in the project (not just this turn's —
  // a new task changes the relative ranking of the whole backlog).
  const scoredTasks = await safeStep(() => reprioritizeProject(project.id), tasks, "task prioritization");

  // 4. Pick the task to focus on this turn and evaluate it.
  const classified = await safeStep(() => classifyProjectTasks(project.id), [], "readiness classification");
  const nextTask = classified.length > 0 ? pickNextReadyTask(classified, project.currentTaskId) : null;

  let decision: PlanningEngineResult["decision"] = null;
  if (nextTask) {
    const connectedCredentialCount = await safeStep(() => countConnectedCredentials(userId), 0, "credential count");
    decision = await safeStep(
      () => evaluateExecutionDecision({ task: nextTask, goal, connectedCredentialCount, userId }),
      null,
      "decision evaluation",
    );
  }

  const contextNote = buildContextNote({ milestones, tasks: scoredTasks, nextTask, decision });

  return { milestones, tasks: scoredTasks, nextTask, decision, contextNote };
}

async function safeStep<T>(fn: () => Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    logger.warn({ err }, `Planning Engine: ${label} step failed, continuing with fallback`);
    return fallback;
  }
}

function buildContextNote(params: Omit<PlanningEngineResult, "contextNote">): string {
  const { milestones, tasks, nextTask, decision } = params;
  const lines: string[] = [];

  if (milestones.length > 0) {
    lines.push(`\n\n=== PLANNING ENGINE: MILESTONES (internal — do not repeat verbatim) ===`);
    for (const m of milestones) lines.push(`- [${m.status}] ${m.phase ? `${m.phase}: ` : ""}${m.title}`);
  }

  const blocked = tasks.filter((t) => t.status === "blocked");
  if (blocked.length > 0) {
    lines.push(`\n=== PLANNING ENGINE: BLOCKED TASKS ===`);
    for (const t of blocked) lines.push(`- ${t.description.slice(0, 120)} — BLOCKED: ${t.blockedReason ?? "unknown reason"}`);
  }

  if (nextTask) {
    lines.push(`\n=== PLANNING ENGINE: FOCUS TASK ===`);
    lines.push(`Task: ${nextTask.description}`);
    lines.push(`Priority score: ${nextTask.priorityScore} | Complexity: ${nextTask.complexityScore} | Est. duration: ${nextTask.estimatedDurationMinutes ?? "n/a"}min`);
    if (decision) {
      lines.push(`Decision: ${decision.decision} (goal alignment ${decision.goalAlignmentScore}, confidence ${decision.confidenceScore}, risk ${decision.riskLevel})`);
      lines.push(`Selected path: ${decision.selectedPath}`);
      if (decision.risks.length > 0) lines.push(`Risks: ${decision.risks.join("; ")}`);
      if (decision.decision === "hold" || decision.decision === "escalate") {
        lines.push(`Note: do not attempt this task's risky/blocked action yet — explain the situation to the user instead.`);
      }
    }
  }

  return lines.join("\n");
}
