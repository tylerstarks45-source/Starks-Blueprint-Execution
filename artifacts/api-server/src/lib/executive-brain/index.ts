import { logger } from "../logger";
import { getCachedHealthConcerns } from "../cognitive-foundation/brain-registry";
import { resolveActiveProject, updateProjectRollup } from "./project-manager";
import { resolveGoalForRequest } from "./goal-manager";
import { planTasks } from "./task-planner";
import type { ExecutiveBrainRequest, ExecutiveBrainResult } from "./types";

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

  const brainContextNote = buildContextNote({ isNew, project, goal, tasks });

  logger.info(
    { userId, projectId: project.id, isNew, goalId: goal?.id, taskCount: tasks.length },
    "Executive Brain resolved project/goal/tasks for request",
  );

  return {
    project: { ...project, currentPhase: nextPhase, currentTaskId: firstPendingTask?.id ?? null },
    goal,
    tasks,
    isNewProject: isNew,
    brainContextNote,
  };
}

function buildContextNote(params: {
  isNew: boolean;
  project: ExecutiveBrainResult["project"];
  goal: ExecutiveBrainResult["goal"];
  tasks: ExecutiveBrainResult["tasks"];
}): string {
  const { isNew, project, goal, tasks } = params;
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
