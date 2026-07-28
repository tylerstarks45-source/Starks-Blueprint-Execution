import { db, ashMilestonesTable, ashTasksTable, type AshMilestone } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { complete } from "../openrouter";
import { MODELS } from "../models";
import { logger } from "../logger";
import type { GeneratedMilestone } from "./types";

// ─── Planning: milestones & phases (Phase 1.3) ─────────────────────────────
// Only large/multi-step objectives get milestones — short chat turns (the
// common case) skip this entirely and their tasks stay milestone-less, same
// as before Phase 1.3. This mirrors the existing DECOMPOSE_THRESHOLD_CHARS
// heuristic in task-planner.ts so trivial requests never pay for an AI call.

const MILESTONE_THRESHOLD_CHARS = 220;

export async function planMilestonesForGoal(params: {
  projectId: number;
  goalId: number | null;
  objective: string;
  isNewProject: boolean;
}): Promise<AshMilestone[]> {
  const { projectId, goalId, objective, isNewProject } = params;

  // Continuing an existing project: reuse its current milestone set rather
  // than re-planning from scratch on every turn.
  if (!isNewProject) {
    const existing = await listMilestones(projectId);
    if (existing.length > 0) return existing;
  }

  if (objective.length < MILESTONE_THRESHOLD_CHARS) return [];

  const generated = await generateMilestones(objective);
  if (generated.length === 0) return [];

  const inserted: AshMilestone[] = [];
  for (const m of generated) {
    const [row] = await db
      .insert(ashMilestonesTable)
      .values({
        projectId,
        goalId,
        title: m.title,
        description: m.description,
        phase: m.phase,
        orderIndex: m.orderIndex,
        status: m.orderIndex === 0 ? "active" : "pending",
      })
      .returning();
    inserted.push(row);
  }
  return inserted;
}

async function generateMilestones(objective: string): Promise<GeneratedMilestone[]> {
  try {
    const result = await complete({
      systemPrompt:
        "You break a large objective into 2-5 sequential milestones (phases) for a business-building platform. " +
        'Reply with ONLY a JSON array, no markdown, no prose: ' +
        '[{"title": string, "description": string, "phase": string}]. ' +
        '"phase" is a short label like "Setup", "Launch", "Growth". Order matters — earliest milestone first.',
      prompt: objective.slice(0, 1500),
      model: MODELS.utility,
    });
    const match = result.content.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("no JSON array in milestone generation response");
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("empty milestone list");

    return parsed.slice(0, 6).map((raw: any, i: number): GeneratedMilestone => ({
      title: typeof raw.title === "string" && raw.title.trim() ? raw.title.trim().slice(0, 200) : `Milestone ${i + 1}`,
      description: typeof raw.description === "string" ? raw.description.trim().slice(0, 500) : null,
      phase: typeof raw.phase === "string" && raw.phase.trim() ? raw.phase.trim().slice(0, 60) : `Phase ${i + 1}`,
      orderIndex: i,
    }));
  } catch (err) {
    logger.warn({ err }, "Planning Engine: milestone generation failed, continuing without milestones");
    return [];
  }
}

export async function listMilestones(projectId: number): Promise<AshMilestone[]> {
  return db.select().from(ashMilestonesTable).where(eq(ashMilestonesTable.projectId, projectId)).orderBy(asc(ashMilestonesTable.orderIndex));
}

// Assigns freshly-planned tasks to milestones round-robin-by-order — a cheap
// heuristic (no extra AI call) that still gives large plans a sensible
// structure: early tasks land on the first milestone, etc. Good enough for
// this foundation phase; a future phase can make this assignment smarter.
export async function assignTasksToMilestones(taskIds: number[], milestones: AshMilestone[]): Promise<void> {
  if (milestones.length === 0 || taskIds.length === 0) return;
  const perMilestone = Math.ceil(taskIds.length / milestones.length);
  for (let i = 0; i < taskIds.length; i++) {
    const milestone = milestones[Math.min(milestones.length - 1, Math.floor(i / perMilestone))];
    await db.update(ashTasksTable).set({ milestoneId: milestone.id }).where(eq(ashTasksTable.id, taskIds[i]));
  }
}
