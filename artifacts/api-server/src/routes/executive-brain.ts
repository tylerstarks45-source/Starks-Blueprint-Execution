import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { eq, and } from "drizzle-orm";
import { db, ashProjectsTable, ashTasksTable } from "@workspace/db";
import { requireAuthActive } from "../lib/auth";
import { logger } from "../lib/logger";
import { runExecutiveBrain } from "../lib/executive-brain";
import { listProjects, getProject } from "../lib/executive-brain/project-manager";
import { listGoals } from "../lib/executive-brain/goal-manager";
import { listTasks } from "../lib/executive-brain/task-planner";
import { retrieveRelevantMemory, captureAutoMemory, recordProjectCompletionLessons } from "../lib/memory-engine";
import { runPlanningEngine, MilestonePlanner, DependencyManager, handleTaskFailure, handleTaskCompletion } from "../lib/planning-engine";
import { runResearchEngine, detectResearchIntent } from "../lib/research-engine";

const router: IRouter = Router();

// ─── ASH Brain v2.0 — Executive Brain Foundation (Phase 1.1) ───────────────
// New entry point that sits IN FRONT of the existing, unmodified
// /ai-orchestrator/stream endpoint. It never reimplements orchestration —
// it runs the Executive Brain phase (project/goal/task resolution), emits
// that plan as an SSE event, then forwards the request internally to the
// existing orchestrator stream and pipes its SSE output straight through.
//
// Flow: User -> Executive Brain -> Goal Manager -> Task Planner ->
//       existing AI Orchestrator -> OpenRouter -> existing Tool Execution.
//
// Fails open: if the Executive Brain phase throws, we log and forward the
// original request untouched so a bug here can never break chat.
router.post("/executive-brain/stream", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const schema = z.object({
    message: z.string().min(1).max(2000),
    history: z.array(z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })).optional().default([]),
    systemInstanceId: z.number().int().optional(),
    agentMode: z.string().optional().default("fast"),
    businessType: z.string().nullish(),
    revenueGoal: z.string().nullish(),
    planMode: z.boolean().optional().default(false),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  const send = (event: object) => res.write(`data: ${JSON.stringify(event)}\n\n`);

  let forwardMessage = parsed.data.message;
  let memoryProject: Awaited<ReturnType<typeof runExecutiveBrain>>["project"] | null = null;

  try {
    const brainResult = await runExecutiveBrain({
      userId,
      message: parsed.data.message,
      history: parsed.data.history,
      systemInstanceId: parsed.data.systemInstanceId,
      businessType: parsed.data.businessType,
      revenueGoal: parsed.data.revenueGoal,
    });

    send({
      type: "brain_state",
      project: brainResult.project,
      goal: brainResult.goal,
      tasks: brainResult.tasks,
      isNewProject: brainResult.isNewProject,
    });

    memoryProject = brainResult.project;

    // ─── Planning & Decision Engine (Phase 1.3): organizes this turn's tasks
    // under milestones, scores/orders the project's backlog, validates the
    // new tasks can actually run (credentials/files/approvals), and decides
    // whether the next ready task should proceed/hold/escalate. Runs before
    // Memory retrieval so a newly-blocked task can also inform this turn's
    // memory note. Failures here must never block the request.
    let planningContextNote = "";
    try {
      const planningResult = await runPlanningEngine({
        userId,
        project: brainResult.project,
        goal: brainResult.goal,
        tasks: brainResult.tasks,
        isNewProject: brainResult.isNewProject,
      });
      planningContextNote = planningResult.contextNote;
      send({
        type: "planning_state",
        milestones: planningResult.milestones,
        nextTask: planningResult.nextTask,
        decision: planningResult.decision,
      });
    } catch (err) {
      logger.warn({ err, userId }, "Planning Engine: run failed — forwarding without planning context");
    }

    // ─── Research & Knowledge Engine (Phase 1.4): only for requests worth a
    // full plan → gather → dedupe → score → summarize → save pass (see
    // detectResearchIntent — deliberately narrower than the orchestrator's
    // own lightweight auto-search, which stays untouched for quick
    // one-off lookups). Checks Knowledge Memory first and only researches
    // when nothing reusable already exists. Failures never block the turn.
    let researchContextNote = "";
    try {
      const researchType = detectResearchIntent(parsed.data.message);
      if (researchType) {
        const research = await runResearchEngine({
          userId,
          projectId: brainResult.project?.id ?? null,
          researchType,
          objective: parsed.data.message,
        });
        researchContextNote = research.contextNote;
        send({
          type: "research_state",
          researchType,
          reusedExistingKnowledge: research.reusedExistingKnowledge,
          confidenceScore: research.confidenceScore,
        });
      }
    } catch (err) {
      logger.warn({ err, userId }, "Research Engine: run failed — forwarding without research context");
    }

    // ─── Memory Engine (Phase 1.2): retrieve relevant memory across all
    // layers and fold it into the same internal context block, so the
    // (untouched) orchestrator sees one combined note — no change to its
    // prompt-assembly code. Failures here must never block the plan note.
    let memoryContextNote = "";
    try {
      const memory = await retrieveRelevantMemory({
        userId,
        message: parsed.data.message,
        project: brainResult.project,
        goal: brainResult.goal,
        tasks: brainResult.tasks,
        history: parsed.data.history,
      });
      memoryContextNote = memory.contextNote;
    } catch (err) {
      logger.warn({ err, userId }, "Memory Engine: retrieval failed — forwarding without memory context");
    }

    // Give the existing orchestrator situational awareness of the plan
    // without changing its code or its zod schema.
    forwardMessage = `${parsed.data.message}${brainResult.brainContextNote}${planningContextNote}${researchContextNote}${memoryContextNote}`;
  } catch (err) {
    logger.error({ err, userId }, "Executive Brain phase failed — forwarding request to orchestrator unchanged");
  }

  // Forward to the existing, untouched orchestrator and pipe its SSE stream
  // straight through to the client.
  try {
    const port = process.env["PORT"];
    const upstream = await fetch(`http://127.0.0.1:${port}/api/ai-orchestrator/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: req.headers["authorization"] ?? "",
      },
      body: JSON.stringify({ ...parsed.data, message: forwardMessage }),
    });

    if (!upstream.ok || !upstream.body) {
      send({ type: "error", message: `Orchestrator forwarding failed (${upstream.status})` });
      res.end();
      return;
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let sseBuffer = "";
    let assistantReply = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      res.write(chunk);

      // Peek at the piped SSE stream (read-only side channel — never alters
      // what's written to the client) to capture the final assistant reply
      // for Auto Memory, without re-implementing the orchestrator's parsing.
      sseBuffer += chunk;
      const lines = sseBuffer.split("\n");
      sseBuffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const evt = JSON.parse(line.slice(6));
          if (evt?.type === "done" && typeof evt.content === "string") assistantReply = evt.content;
        } catch {
          // Not JSON or a partial line — ignore, this is best-effort.
        }
      }
    }
    res.end();

    // ─── Auto Memory (Phase 1.2): fire-and-forget, after the response has
    // already been sent — adds zero latency to the user and never blocks or
    // fails the request. No frontend involvement required.
    if (memoryProject && assistantReply) {
      captureAutoMemory({
        userId,
        project: memoryProject,
        userMessage: parsed.data.message,
        assistantReply,
      }).catch((err) => logger.warn({ err, userId }, "Memory Engine: auto-memory capture failed"));
    }
  } catch (err) {
    logger.error({ err, userId }, "Executive Brain: failed forwarding to orchestrator");
    send({ type: "error", message: "Failed to reach the orchestration pipeline" });
    res.end();
  }
});

// ─── Read/inspect endpoints ─────────────────────────────────────────────────

router.get("/executive-brain/projects", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const projects = await listProjects(userId);
  res.json({ projects });
});

router.get("/executive-brain/projects/:id", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const projectId = Number(req.params.id);
  if (!Number.isFinite(projectId)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }
  const project = await getProject(userId, projectId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const [goals, tasks] = await Promise.all([listGoals(projectId), listTasks(projectId)]);
  res.json({ project, goals, tasks });
});

router.get("/executive-brain/projects/:id/goals", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const projectId = Number(req.params.id);
  const project = await getProject(userId, projectId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json({ goals: await listGoals(projectId) });
});

router.get("/executive-brain/projects/:id/tasks", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const projectId = Number(req.params.id);
  const project = await getProject(userId, projectId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json({ tasks: await listTasks(projectId) });
});

router.get("/executive-brain/projects/:id/milestones", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const projectId = Number(req.params.id);
  const project = await getProject(userId, projectId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json({ milestones: await MilestonePlanner.listMilestones(projectId) });
});

router.get("/executive-brain/projects/:id/readiness", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const projectId = Number(req.params.id);
  const project = await getProject(userId, projectId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json({ tasks: await DependencyManager.classifyProjectTasks(projectId) });
});

// ─── Task outcome reporting (Phase 1.3) ────────────────────────────────────
// The natural hook for Plan Adaptation / Dependency unlocking / auto
// reprioritization: whatever calls the assigned engine for a task (build
// engine, browser agent, media gen, etc.) reports back here when it finishes
// or fails, so the Planning Engine can react. `task-planner.ts`'s
// `updateTaskStatus()` existed but was never wired to a route before this.
const taskOutcomeSchema = z.object({
  status: z.enum(["completed", "failed"]),
  result: z.unknown().optional(),
  errorMessage: z.string().optional(),
});

router.patch("/executive-brain/tasks/:id", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const taskId = Number(req.params.id);
  if (!Number.isFinite(taskId)) {
    res.status(400).json({ error: "Invalid task id" });
    return;
  }

  const [task] = await db.select().from(ashTasksTable).where(eq(ashTasksTable.id, taskId));
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  const project = await getProject(userId, task.projectId);
  if (!project) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const parsed = taskOutcomeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    if (parsed.data.status === "completed") {
      if (parsed.data.result !== undefined) {
        await db.update(ashTasksTable).set({ result: parsed.data.result }).where(eq(ashTasksTable.id, taskId));
      }
      const updated = await handleTaskCompletion({ taskId });
      res.json({ task: updated, action: "completed" });
    } else {
      const { action, task: updated } = await handleTaskFailure({
        taskId,
        userId,
        errorMessage: parsed.data.errorMessage ?? "Task failed with no error message provided.",
      });
      res.json({ task: updated, action });
    }
  } catch (err) {
    logger.error({ err, userId, taskId }, "Planning Engine: failed to record task outcome");
    res.status(500).json({ error: "Failed to record task outcome" });
  }
});

const patchProjectSchema = z.object({
  status: z.enum(["active", "paused", "completed", "archived"]).optional(),
  currentPhase: z.string().optional(),
});

router.patch("/executive-brain/projects/:id", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const projectId = Number(req.params.id);
  const project = await getProject(userId, projectId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const parsed = patchProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (Object.keys(parsed.data).length === 0) {
    res.json({ project });
    return;
  }
  const [updated] = await db
    .update(ashProjectsTable)
    .set(parsed.data)
    .where(and(eq(ashProjectsTable.id, projectId), eq(ashProjectsTable.userId, userId)))
    .returning();
  res.json({ project: updated });

  // ─── Learning on completion (Phase 1.2): fire-and-forget, after the
  // response is already sent — never blocks or fails the status update.
  if (updated && parsed.data.status === "completed" && project.status !== "completed") {
    const [goals, tasks] = await Promise.all([listGoals(projectId), listTasks(projectId)]);
    recordProjectCompletionLessons({ userId, project: updated, goals, tasks }).catch((err) =>
      logger.warn({ err, userId, projectId }, "Memory Engine: completion learning failed"),
    );
  }
});

export default router;
