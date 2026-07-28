import type { AshProject, AshGoal, AshTask } from "@workspace/db";
import type { WorkingMemory } from "./types";

// ─── Working Memory (Layer 1) ──────────────────────────────────────────────
// Deliberately has no table of its own — it's the live state the Executive
// Brain (Phase 1.1) already resolves on every request: the active project,
// its current goal/objective, its pending/in-progress tasks, and the
// request's own conversation history. This function just packages that
// already-resolved state into the Working Memory shape the spec calls for.
export function buildWorkingMemory(params: {
  project: AshProject | null;
  goal: AshGoal | null;
  tasks: AshTask[];
  history: Array<{ role: "user" | "assistant"; content: string }>;
}): WorkingMemory {
  return {
    activeProject: params.project,
    currentObjective: params.goal,
    currentTasks: params.tasks.filter((t) => t.status === "pending" || t.status === "in_progress"),
    // Cap to the last few turns — working memory is short-term by definition.
    recentConversation: params.history.slice(-6),
  };
}
