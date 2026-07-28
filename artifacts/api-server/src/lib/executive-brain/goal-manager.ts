import { db, ashGoalsTable, type AshGoal } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { complete } from "../openrouter";
import { MODELS } from "../models";
import { logger } from "../logger";

// ─── Goal Manager (Executive Brain) ────────────────────────────────────────
// Owns the `ash_goals` table. A goal is the mid-level objective a request
// maps onto within a project (e.g. "Launch a print-on-demand storefront").
// One AI call extracts {goalText, priority, estimatedCompletion,
// completionCriteria} — falls back to a deterministic goal from the raw
// message if the call fails, so goal creation never blocks a response.

interface DerivedGoal {
  goalText: string;
  priority: "low" | "medium" | "high" | "critical";
  estimatedCompletion: string | null;
  completionCriteria: string | null;
}

export async function resolveGoalForRequest(params: {
  projectId: number;
  message: string;
  isNewProject: boolean;
}): Promise<AshGoal> {
  const { projectId, message, isNewProject } = params;

  // Continuing an existing project: reuse its most recent active goal unless
  // none exists yet.
  if (!isNewProject) {
    const [activeGoal] = await db
      .select()
      .from(ashGoalsTable)
      .where(and(eq(ashGoalsTable.projectId, projectId), eq(ashGoalsTable.status, "active")))
      .orderBy(desc(ashGoalsTable.updatedAt))
      .limit(1);
    if (activeGoal) return activeGoal;
  }

  const derived = await deriveGoal(message);
  const [goal] = await db
    .insert(ashGoalsTable)
    .values({
      projectId,
      goalText: derived.goalText,
      priority: derived.priority,
      status: "active",
      estimatedCompletion: derived.estimatedCompletion,
      completionCriteria: derived.completionCriteria,
    })
    .returning();

  return goal;
}

async function deriveGoal(message: string): Promise<DerivedGoal> {
  try {
    const result = await complete({
      systemPrompt:
        "You extract a single actionable goal from a user request for a business-building platform. " +
        "Reply with ONLY a JSON object, no markdown, no prose: " +
        '{"goalText": string, "priority": "low"|"medium"|"high"|"critical", "estimatedCompletion": string|null, "completionCriteria": string|null}',
      prompt: message.slice(0, 1000),
      model: MODELS.utility,
    });
    const match = result.content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("no JSON in goal extraction response");
    const parsed = JSON.parse(match[0]);
    return {
      goalText: typeof parsed.goalText === "string" && parsed.goalText.trim() ? parsed.goalText.trim().slice(0, 500) : message.slice(0, 200),
      priority: ["low", "medium", "high", "critical"].includes(parsed.priority) ? parsed.priority : "medium",
      estimatedCompletion: typeof parsed.estimatedCompletion === "string" ? parsed.estimatedCompletion : null,
      completionCriteria: typeof parsed.completionCriteria === "string" ? parsed.completionCriteria : null,
    };
  } catch (err) {
    logger.warn({ err }, "Executive Brain: goal extraction call failed, using fallback goal");
    return {
      goalText: message.slice(0, 200),
      priority: "medium",
      estimatedCompletion: null,
      completionCriteria: null,
    };
  }
}

export async function listGoals(projectId: number): Promise<AshGoal[]> {
  return db.select().from(ashGoalsTable).where(eq(ashGoalsTable.projectId, projectId)).orderBy(desc(ashGoalsTable.createdAt));
}

export async function updateGoalStatus(goalId: number, status: AshGoal["status"]): Promise<void> {
  await db.update(ashGoalsTable).set({ status }).where(eq(ashGoalsTable.id, goalId));
}
