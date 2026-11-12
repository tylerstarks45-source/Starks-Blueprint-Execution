import { db, ashPlanDecisionsTable, ashGoalsTable, userCredentialsTable, type AshTask, type AshGoal } from "@workspace/db";
import { eq } from "drizzle-orm";
import { complete } from "../openrouter";
import { MODELS } from "../models";
import { logger } from "../logger";
import type { DecisionEvaluation } from "./types";

// ─── Decision Engine (Phase 1.3) ───────────────────────────────────────────
// "Before executing any major task, evaluate goal alignment, required
// resources, available tools, existing project state, risks, confidence.
// Select the best execution path." Runs once per turn, for whichever task
// the Planning Engine picked as `nextTask` — not on every task, since most
// turns only advance one task at a time through the existing orchestrator.
//
// "Major" here means: has a blockedReason (something to reason about),
// OR is not a trivial ai_orchestrator chat task (build/browser/media/
// research engines carry real cost/risk) OR is priority high/critical.
// Anything smaller skips the AI call entirely and gets a fast deterministic
// "proceed" decision — consistent with this codebase's cheap-heuristic-first
// pattern.

function isMajorTask(task: AshTask): boolean {
  if (task.blockedReason) return true;
  if (task.priority === "high" || task.priority === "critical") return true;
  return task.assignedEngine !== "ai_orchestrator";
}

export async function evaluateExecutionDecision(params: {
  task: AshTask;
  goal: AshGoal | null;
  connectedCredentialCount: number;
  userId?: number;
}): Promise<DecisionEvaluation> {
  const { task, goal } = params;

  if (task.status === "blocked") {
    const evaluation: DecisionEvaluation = {
      decision: "hold",
      goalAlignmentScore: 50,
      confidenceScore: 20,
      riskLevel: "medium",
      risks: [task.blockedReason ?? "Missing a required resource."],
      requiredResources: [],
      selectedPath: "Wait for the blocking issue to be resolved before executing.",
      reasoning: task.blockedReason ?? "This task failed plan validation and cannot execute yet.",
    };
    await persistDecision(task, evaluation);
    return evaluation;
  }

  if (!isMajorTask(task)) {
    const evaluation: DecisionEvaluation = {
      decision: "proceed",
      goalAlignmentScore: 80,
      confidenceScore: 85,
      riskLevel: "low",
      risks: [],
      requiredResources: [],
      selectedPath: "Direct execution via the existing AI Orchestrator.",
      reasoning: "Routine, low-risk conversational task — no additional evaluation needed.",
    };
    await persistDecision(task, evaluation);
    return evaluation;
  }

  const evaluation = await deriveDecision(params);
  await persistDecision(task, evaluation);
  return evaluation;
}

async function deriveDecision(params: {
  task: AshTask;
  goal: AshGoal | null;
  connectedCredentialCount: number;
  userId?: number;
}): Promise<DecisionEvaluation> {
  const { task, goal, connectedCredentialCount, userId } = params;
  try {
    const result = await complete({
      userId,
      systemPrompt:
        "You are a Decision Engine for an autonomous business-building AI platform, deciding whether to proceed with " +
        "one task right now. Evaluate goal alignment, required resources, available tools, project state, risks, and " +
        "confidence. Reply with ONLY a JSON object, no markdown, no prose: " +
        '{"decision": "proceed"|"hold"|"escalate", "goalAlignmentScore": number, "confidenceScore": number, ' +
        '"riskLevel": "low"|"medium"|"high", "risks": string[], "requiredResources": string[], "selectedPath": string, "reasoning": string}. ' +
        "Scores are 0-100. Choose \"escalate\" only if a human decision is truly required; prefer \"proceed\" for ordinary work.",
      prompt: [
        `Task: ${task.description}`,
        `Assigned engine: ${task.assignedEngine}`,
        `Priority: ${task.priority} | Complexity score: ${task.complexityScore}`,
        `Current goal: ${goal?.goalText ?? "none recorded"}`,
        `User has ${connectedCredentialCount} connected integration credential(s).`,
      ].join("\n"),
      model: MODELS.utility,
    });

    const match = result.content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("no JSON in decision evaluation response");
    const parsed = JSON.parse(match[0]);

    return {
      decision: ["proceed", "hold", "escalate"].includes(parsed.decision) ? parsed.decision : "proceed",
      goalAlignmentScore: clamp(parsed.goalAlignmentScore, 60),
      confidenceScore: clamp(parsed.confidenceScore, 60),
      riskLevel: ["low", "medium", "high"].includes(parsed.riskLevel) ? parsed.riskLevel : "low",
      risks: Array.isArray(parsed.risks) ? parsed.risks.map(String).slice(0, 5) : [],
      requiredResources: Array.isArray(parsed.requiredResources) ? parsed.requiredResources.map(String).slice(0, 5) : [],
      selectedPath: typeof parsed.selectedPath === "string" && parsed.selectedPath.trim() ? parsed.selectedPath.trim().slice(0, 300) : "Execute via the existing AI Orchestrator / assigned engine.",
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning.trim().slice(0, 500) : "",
    };
  } catch (err) {
    logger.warn({ err, taskId: task.id }, "Planning Engine: decision evaluation call failed, defaulting to proceed");
    return {
      decision: "proceed",
      goalAlignmentScore: 60,
      confidenceScore: 50,
      riskLevel: "low",
      risks: [],
      requiredResources: [],
      selectedPath: "Execute via the existing AI Orchestrator / assigned engine.",
      reasoning: "Decision evaluation call failed; defaulting to proceed so the request is never blocked by this layer.",
    };
  }
}

function clamp(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, n));
}

async function persistDecision(task: AshTask, evaluation: DecisionEvaluation): Promise<void> {
  try {
    await db.insert(ashPlanDecisionsTable).values({
      projectId: task.projectId,
      taskId: task.id,
      decision: evaluation.decision,
      goalAlignmentScore: evaluation.goalAlignmentScore,
      confidenceScore: evaluation.confidenceScore,
      riskLevel: evaluation.riskLevel,
      risks: evaluation.risks,
      requiredResources: evaluation.requiredResources,
      selectedPath: evaluation.selectedPath,
      reasoning: evaluation.reasoning,
    });
  } catch (err) {
    logger.warn({ err, taskId: task.id }, "Planning Engine: failed to persist decision audit row");
  }
}

export async function countConnectedCredentials(userId: number): Promise<number> {
  const rows = await db.select({ id: userCredentialsTable.id }).from(userCredentialsTable).where(eq(userCredentialsTable.userId, userId));
  return rows.length;
}
