import { db, ashTasksTable, type AshTask, ASH_TASK_ENGINES, type AshTaskEngine } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { complete } from "../openrouter";
import { MODELS } from "../models";
import { logger } from "../logger";
import type { PlannedTask } from "./types";

// ─── Task Planner (Executive Brain) ────────────────────────────────────────
// Decomposes a goal/request into ordered, prioritized `ash_tasks` rows and
// decides which existing execution surface ("engine") each task belongs to.
// It never executes anything itself — the caller hands the resulting tasks
// off to the existing AI Orchestrator / build engine / browser agent / etc.
// exactly as before.

const DECOMPOSE_THRESHOLD_CHARS = 220; // short chat turns skip AI planning entirely

const ENGINE_KEYWORDS: Array<[AshTaskEngine, string[]]> = [
  ["media_gen", ["video", "voiceover", "image generation", "generate an image", "avatar", "tts", "text to speech"]],
  ["browser_agent", ["log into", "log in to", "fill out", "browser", "navigate to", "click on", "automate the site"]],
  ["build_engine", ["build a", "build me", "create a website", "create a system", "set up a store", "landing page"]],
  ["research", ["research", "find out", "look up", "competitor analysis", "market analysis"]],
];

function guessEngine(description: string): AshTaskEngine {
  const lower = description.toLowerCase();
  for (const [engine, keywords] of ENGINE_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) return engine;
  }
  return "ai_orchestrator";
}

/**
 * Plans one or more tasks for a request. Large/multi-step requests get an AI
 * decomposition call; short requests get a single task with no AI round trip.
 * On any AI failure, falls back to a single whole-message task so planning
 * never blocks the underlying request from reaching the orchestrator.
 */
export async function planTasks(params: {
  projectId: number;
  goalId: number | null;
  message: string;
}): Promise<AshTask[]> {
  const { projectId, goalId, message } = params;

  const planned = message.length >= DECOMPOSE_THRESHOLD_CHARS
    ? await decomposeIntoTasks(message)
    : [{ description: message.slice(0, 500), priority: "medium" as const, assignedEngine: guessEngine(message), dependsOnIndexes: [] }];

  // Insert sequentially so earlier tasks get real ids before later ones
  // reference them via `dependencies`.
  const inserted: AshTask[] = [];
  for (const task of planned) {
    const dependencies = task.dependsOnIndexes
      .map((i) => inserted[i]?.id)
      .filter((id): id is number => typeof id === "number");
    const [row] = await db
      .insert(ashTasksTable)
      .values({
        projectId,
        goalId,
        description: task.description,
        status: "pending",
        priority: task.priority,
        assignedEngine: task.assignedEngine,
        dependencies,
      })
      .returning();
    inserted.push(row);
  }

  return inserted;
}

async function decomposeIntoTasks(message: string): Promise<PlannedTask[]> {
  try {
    const engineList = ASH_TASK_ENGINES.join(", ");
    const result = await complete({
      systemPrompt:
        `You break a user's request into an ordered list of concrete tasks for an execution platform. ` +
        `Each task must be assigned to exactly one engine from: ${engineList}. ` +
        `Reply with ONLY a JSON array, no markdown, no prose: ` +
        `[{"description": string, "priority": "low"|"medium"|"high"|"critical", "assignedEngine": string, "dependsOnIndexes": number[]}]. ` +
        `Keep it to 2-6 tasks. "dependsOnIndexes" holds 0-based indexes of earlier tasks in this same array that must finish first.`,
      prompt: message.slice(0, 1500),
      model: MODELS.utility,
    });
    const match = result.content.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("no JSON array in task decomposition response");
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("empty task list");

    return parsed.slice(0, 8).map((raw: any, i: number): PlannedTask => ({
      description: typeof raw.description === "string" && raw.description.trim() ? raw.description.trim().slice(0, 500) : `Task ${i + 1}`,
      priority: ["low", "medium", "high", "critical"].includes(raw.priority) ? raw.priority : "medium",
      assignedEngine: (ASH_TASK_ENGINES as readonly string[]).includes(raw.assignedEngine) ? raw.assignedEngine : guessEngine(String(raw.description ?? "")),
      dependsOnIndexes: Array.isArray(raw.dependsOnIndexes) ? raw.dependsOnIndexes.filter((n: unknown) => typeof n === "number" && n < i) : [],
    }));
  } catch (err) {
    logger.warn({ err }, "Executive Brain: task decomposition call failed, using single fallback task");
    return [{ description: message.slice(0, 500), priority: "medium", assignedEngine: guessEngine(message), dependsOnIndexes: [] }];
  }
}

export async function listTasks(projectId: number): Promise<AshTask[]> {
  return db.select().from(ashTasksTable).where(eq(ashTasksTable.projectId, projectId)).orderBy(desc(ashTasksTable.createdAt));
}

export async function updateTaskStatus(taskId: number, status: AshTask["status"], result?: unknown): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (result !== undefined) patch.result = result;
  if (status === "completed" || status === "failed") patch.completedAt = new Date();
  await db.update(ashTasksTable).set(patch).where(eq(ashTasksTable.id, taskId));
}
