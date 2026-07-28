import { complete } from "../openrouter";
import { MODELS } from "../models";
import { logger } from "../logger";
import type { AshProject, AshGoal, AshTask } from "@workspace/db";
import { addKnowledgeEntry } from "./knowledge-memory";
import { listProjectMemory } from "./project-memory";

// ─── Learning on project completion (Phase 1.2) ────────────────────────────
// "When a project completes... save lessons learned, successful strategies,
// failures/what to avoid, recommendations for similar future projects."
// Hooked from PATCH /api/executive-brain/projects/:id when status transitions
// to "completed" (fire-and-forget from the route — a slow/failed
// summarization must never block the status update the user asked for).
export async function recordProjectCompletionLessons(params: {
  userId: number;
  project: AshProject;
  goals: AshGoal[];
  tasks: AshTask[];
}): Promise<void> {
  const { userId, project, goals, tasks } = params;

  try {
    const projectMemory = await listProjectMemory(project.id);
    const summary = await complete({
      systemPrompt:
        "A business-building AI assistant just finished a project for a user. Write a concise project retrospective. " +
        'Reply with ONLY JSON: {"lessonsLearned": string, "successfulStrategies": string, "failuresToAvoid": string, "recommendations": string}. ' +
        "Each field is 1-3 sentences. If there isn't enough information for a field, write \"Not enough data.\"",
      prompt: [
        `Project: ${project.name}`,
        `Goals: ${goals.map((g) => g.goalText).join("; ") || "none recorded"}`,
        `Tasks: ${tasks.map((t) => `[${t.status}] ${t.description}`).join("; ") || "none recorded"}`,
        `Project memory notes: ${projectMemory.map((m) => m.content).join("; ") || "none recorded"}`,
      ].join("\n"),
      model: MODELS.utility,
    });

    const match = summary.content.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : null;

    const content = parsed
      ? [
          `Lessons learned: ${parsed.lessonsLearned}`,
          `Successful strategies: ${parsed.successfulStrategies}`,
          `Failures to avoid: ${parsed.failuresToAvoid}`,
          `Recommendations: ${parsed.recommendations}`,
        ].join("\n")
      : summary.content.slice(0, 1000);

    await addKnowledgeEntry({
      userId,
      sourceProjectId: project.id,
      category: "project_retrospective",
      title: `Retrospective: ${project.name}`,
      content,
      tags: ["retrospective", "project_completed"],
      importanceScore: 70,
      confidenceScore: 85,
    });

    logger.info({ userId, projectId: project.id }, "Memory Engine: recorded project completion lessons");
  } catch (err) {
    logger.warn({ err, userId, projectId: project.id }, "Memory Engine: failed to record project completion lessons");
  }
}
