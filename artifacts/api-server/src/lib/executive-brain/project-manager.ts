import { db, ashProjectsTable, type AshProject } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { complete } from "../openrouter";
import { MODELS } from "../models";
import { logger } from "../logger";

// ─── Project Manager (Executive Brain) ─────────────────────────────────────
// Owns the `ash_projects` table: finding the right project for an incoming
// request (an existing one to continue, or a brand-new one), and keeping its
// rollup fields (phase, progress, tool stack) up to date. Does not talk to
// the AI Orchestrator or OpenRouter directly except for the tiny naming call
// below — all real execution stays in the existing pipeline.

const NEW_PROJECT_KEYWORDS = [
  "new business", "new project", "new system", "start over", "different business",
  "another business", "start a new", "build a new", "from scratch",
];

/**
 * Decides whether `message` should continue the caller's most recent active
 * project or spin up a new one, then returns that project (creating it if
 * needed). Cheap heuristics first; a lightweight AI call only names brand-new
 * projects (no AI call needed to continue an existing one).
 */
export async function resolveActiveProject(params: {
  userId: number;
  message: string;
  systemInstanceId?: number;
}): Promise<{ project: AshProject; isNew: boolean }> {
  const { userId, message, systemInstanceId } = params;

  // 1. A systemInstanceId pins the request to whichever project already owns
  // that build, regardless of keywords — the user is clearly working inside it.
  if (systemInstanceId != null) {
    const [linked] = await db
      .select()
      .from(ashProjectsTable)
      .where(and(eq(ashProjectsTable.userId, userId), eq(ashProjectsTable.systemInstanceId, systemInstanceId)));
    if (linked) return { project: linked, isNew: false };
  }

  const [mostRecentActive] = await db
    .select()
    .from(ashProjectsTable)
    .where(and(eq(ashProjectsTable.userId, userId), eq(ashProjectsTable.status, "active")))
    .orderBy(desc(ashProjectsTable.updatedAt))
    .limit(1);

  const wantsNewProject = NEW_PROJECT_KEYWORDS.some((kw) => message.toLowerCase().includes(kw));

  if (mostRecentActive && !wantsNewProject) {
    return { project: mostRecentActive, isNew: false };
  }

  const project = await createProject({ userId, message, systemInstanceId });
  return { project, isNew: true };
}

async function createProject(params: {
  userId: number;
  message: string;
  systemInstanceId?: number;
}): Promise<AshProject> {
  const { userId, message, systemInstanceId } = params;
  const name = await deriveProjectName(message, params.userId);

  const [project] = await db
    .insert(ashProjectsTable)
    .values({
      userId,
      systemInstanceId: systemInstanceId ?? null,
      name,
      status: "active",
      objective: message.slice(0, 500),
      currentPhase: "planning",
      progress: 0,
    })
    .returning();

  return project;
}

// Short, best-effort naming call — falls back to a truncated slice of the
// message if the model call fails, so project creation never blocks on AI.
async function deriveProjectName(message: string, userId: number): Promise<string> {
  try {
    const result = await complete({
      userId,
      systemPrompt:
        "You name business/software projects. Reply with ONLY a short project name (2-6 words), no quotes, no punctuation at the end.",
      prompt: `Name a project for this request:\n\n${message.slice(0, 500)}`,
      model: MODELS.utility,
    });
    const name = result.content.trim().replace(/^["']|["']$/g, "").slice(0, 80);
    return name.length > 0 ? name : message.slice(0, 60);
  } catch (err) {
    logger.warn({ err }, "Executive Brain: project naming call failed, using fallback name");
    return message.slice(0, 60);
  }
}

export async function updateProjectRollup(params: {
  projectId: number;
  currentPhase?: string;
  currentTaskId?: number | null;
  progress?: number;
  connectedServices?: string[];
  aiToolStack?: string[];
}): Promise<void> {
  const { projectId, ...rest } = params;
  const patch: Record<string, unknown> = {};
  if (rest.currentPhase !== undefined) patch.currentPhase = rest.currentPhase;
  if (rest.currentTaskId !== undefined) patch.currentTaskId = rest.currentTaskId;
  if (rest.progress !== undefined) patch.progress = rest.progress;
  if (rest.connectedServices !== undefined) patch.connectedServices = rest.connectedServices;
  if (rest.aiToolStack !== undefined) patch.aiToolStack = rest.aiToolStack;
  if (Object.keys(patch).length === 0) return;

  await db.update(ashProjectsTable).set(patch).where(eq(ashProjectsTable.id, projectId));
}

export async function listProjects(userId: number): Promise<AshProject[]> {
  return db
    .select()
    .from(ashProjectsTable)
    .where(eq(ashProjectsTable.userId, userId))
    .orderBy(desc(ashProjectsTable.updatedAt));
}

export async function getProject(userId: number, projectId: number): Promise<AshProject | null> {
  const [project] = await db
    .select()
    .from(ashProjectsTable)
    .where(and(eq(ashProjectsTable.id, projectId), eq(ashProjectsTable.userId, userId)));
  return project ?? null;
}
