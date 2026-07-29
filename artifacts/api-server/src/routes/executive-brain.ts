import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { eq, and } from "drizzle-orm";
import { db, ashProjectsTable, ashTasksTable, businessesTable } from "@workspace/db";
import { requireAuthActive } from "../lib/auth";
import { logger } from "../lib/logger";
import { runExecutiveBrain } from "../lib/executive-brain";
import { listProjects, getProject } from "../lib/executive-brain/project-manager";
import { listGoals } from "../lib/executive-brain/goal-manager";
import { listTasks } from "../lib/executive-brain/task-planner";
import { retrieveRelevantMemory, captureAutoMemory, recordProjectCompletionLessons } from "../lib/memory-engine";
import { runPlanningEngine, MilestonePlanner, DependencyManager, handleTaskFailure, handleTaskCompletion } from "../lib/planning-engine";
import { runResearchEngine, detectResearchIntent } from "../lib/research-engine";
import {
  assembleBusinessContextPackage,
  assembleCrossBusinessSummary,
  publishBusinessEvent,
  detectCrossBusinessIntent,
  buildBusinessIntelligenceUnavailableNote,
} from "../lib/business-intelligence";
import {
  listBrains,
  getBrain,
  serializeBrain,
  checkBrainHealth,
  getCognitiveHealthReport,
  listCapabilities,
  findCapabilities,
  listExtensionPoints,
  CAPABILITY_STATUSES,
  orchestrate,
  getRuntimeStates,
  runReasoningPipeline,
  getRecentDecisionRecords,
  getDecisionRecord,
  listReflectionHooks,
  REFLECTION_QUESTION_IDS,
} from "../lib/cognitive-foundation";

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
    // Business Context Isolation: explicit, opt-in-only Cross-Business
    // Analysis. Defaults to false — cross-business aggregation NEVER
    // happens unless this flag is set OR the user's own message clearly
    // asks to compare/aggregate across businesses (detectCrossBusinessIntent
    // below); both are "the user explicitly asked", never ambient/automatic.
    crossBusinessMode: z.boolean().optional().default(false),
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

    // ─── Business Intelligence Engine (Phase 1.5A): centralized, business-
    // scoped identity/state/capability/health context. Runs before Planning
    // and Memory so downstream engines and the existing orchestrator can make
    // decisions without each reconstructing business state. It only resolves
    // a business through the project's pinned system instance, keeping
    // multi-business isolation explicit and fail-open.
    //
    // Business Context Isolation: resolvedBusinessId is the ONLY business
    // this turn's memory/knowledge retrieval is scoped to (see the Memory
    // Engine call below) unless crossBusinessMode is explicitly on — either
    // because the caller set it, or because the user's own message clearly
    // asked to compare/aggregate across businesses. Both are explicit user
    // intent; this never triggers from ambient context alone.
    let businessIntelligenceContextNote = "";
    let resolvedBusinessId: number | null = null;
    const crossBusinessMode = parsed.data.crossBusinessMode || detectCrossBusinessIntent(parsed.data.message);
    try {
      if (brainResult.project.systemInstanceId != null) {
        const [business] = await db
          .select({ id: businessesTable.id })
          .from(businessesTable)
          .where(and(eq(businessesTable.ownerId, userId), eq(businessesTable.systemInstanceId, brainResult.project.systemInstanceId)))
          .limit(1);
        if (business) {
          resolvedBusinessId = business.id;
          const intelligence = await assembleBusinessContextPackage({ businessId: business.id, userId });
          if (intelligence) {
            businessIntelligenceContextNote = intelligence.contextNote;
            send({
              type: "business_intelligence_state",
              businessId: intelligence.businessId,
              lifecycleStage: intelligence.state.lifecycleStage,
              healthScore: intelligence.state.health.overallScore,
              reviewCount: intelligence.reviewCount,
              highImpactConflictCount: intelligence.unresolvedConflicts.filter((conflict) => conflict.impactScore >= 70).length,
            });
          } else {
            // Fail open, but never silently: the orchestrator and the user
            // both deserve to know BI context is missing this turn rather
            // than assuming an absence of context means "nothing to know".
            businessIntelligenceContextNote = buildBusinessIntelligenceUnavailableNote("no business context package could be assembled");
          }
        }
      }

      // Cross-Business Analysis — deliberately its own branch, additive to
      // (never a replacement for) the single-business note above, so a user
      // mid-conversation in one business can still ask "how does this
      // compare to my other businesses" without losing that business's context.
      if (crossBusinessMode) {
        const summary = await assembleCrossBusinessSummary(userId);
        businessIntelligenceContextNote += summary.contextNote;
        send({ type: "cross_business_state", businessCount: summary.businessCount, businesses: summary.businesses });
      }
    } catch (err) {
      logger.warn({ err, userId, projectId: brainResult.project.id }, "Business Intelligence: context assembly failed — forwarding without BI context");
      businessIntelligenceContextNote = buildBusinessIntelligenceUnavailableNote("an internal error occurred while assembling business context");
    }

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
        businessId: resolvedBusinessId,
        crossBusinessMode,
      });
      memoryContextNote = memory.contextNote;
    } catch (err) {
      logger.warn({ err, userId }, "Memory Engine: retrieval failed — forwarding without memory context");
    }

    // Give the existing orchestrator situational awareness of the plan
    // without changing its code or its zod schema.
    forwardMessage = `${parsed.data.message}${brainResult.brainContextNote}${businessIntelligenceContextNote}${planningContextNote}${researchContextNote}${memoryContextNote}`;
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
      if (project.systemInstanceId != null) {
        const [business] = await db
          .select({ id: businessesTable.id })
          .from(businessesTable)
          .where(and(eq(businessesTable.ownerId, userId), eq(businessesTable.systemInstanceId, project.systemInstanceId)))
          .limit(1);
        if (business) {
          void publishBusinessEvent({
            businessId: business.id,
            projectId: project.id,
            eventType: "task.completed",
            source: "executive_brain",
            payload: { description: `Project task completed: ${task.description}`, relatedObjects: { taskId, projectId: project.id } },
            dedupeKey: `task.completed:${taskId}`,
          });
        }
      }
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
  if (updated && updated.systemInstanceId != null) {
    const [business] = await db
      .select({ id: businessesTable.id })
      .from(businessesTable)
      .where(and(eq(businessesTable.ownerId, userId), eq(businessesTable.systemInstanceId, updated.systemInstanceId)))
      .limit(1);
    if (business) {
      void publishBusinessEvent({
        businessId: business.id,
        projectId: updated.id,
        eventType: parsed.data.status === "completed" ? "project.completed" : "project.updated",
        source: "executive_brain",
        payload: { description: `Project "${updated.name}" is now ${updated.status}.`, relatedObjects: { projectId: updated.id } },
        dedupeKey: `project.status:${updated.id}:${updated.status}:${updated.updatedAt.getTime()}`,
      });
    }
  }
});

// ─── Cognitive Foundation surfaces (Build 001) ──────────────────────────────
// Read-only registry/health endpoints. Registry contents are platform
// architecture metadata (no user data); auth is still required, consistent
// with every other /executive-brain route.

// List every registered Brain (cached health included; ?refresh=1 re-probes
// stale snapshots first).
router.get("/executive-brain/brains", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  try {
    if (req.query["refresh"] === "1") {
      await getCognitiveHealthReport({ maxAgeMs: 0 });
    }
    res.json({ brains: listBrains().map(serializeBrain) });
  } catch (err) {
    logger.error({ err, userId }, "Cognitive Foundation: failed to list brains");
    res.status(500).json({ error: "Failed to list brains" });
  }
});

// Aggregated health report across all Brains — the Executive Brain's
// system-wide observation surface. Uses the 30s snapshot cache unless
// ?refresh=1 forces fresh probes.
router.get("/executive-brain/health-report", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  try {
    const report = await getCognitiveHealthReport(req.query["refresh"] === "1" ? { maxAgeMs: 0 } : {});
    res.json(report);
  } catch (err) {
    logger.error({ err, userId }, "Cognitive Foundation: failed to build health report");
    res.status(500).json({ error: "Failed to build cognitive health report" });
  }
});

// Detail for one Brain, with a fresh health probe for that Brain only.
router.get("/executive-brain/brains/:name", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const name = String(req.params["name"] ?? "");
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(name)) {
    res.status(400).json({ error: "Invalid brain name" });
    return;
  }
  const brain = getBrain(name);
  if (!brain) {
    res.status(404).json({ error: `No brain registered under "${name}"` });
    return;
  }
  try {
    const health = await checkBrainHealth(name);
    res.json({ brain: serializeBrain({ ...brain, lastHealth: health }) });
  } catch (err) {
    logger.error({ err, userId, brain: name }, "Cognitive Foundation: failed to load brain detail");
    res.status(500).json({ error: "Failed to load brain detail" });
  }
});

// Discoverable capability index. Filters: ?q= substring, ?brain= owner,
// ?status= implemented|partial|target|deferred.
const capabilityQuerySchema = z.object({
  q: z.string().max(200).optional(),
  brain: z.string().max(100).optional(),
  status: z.enum(CAPABILITY_STATUSES).optional(),
});

router.get("/executive-brain/capabilities", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  const parsed = capabilityQuerySchema.safeParse({
    q: typeof req.query["q"] === "string" ? req.query["q"] : undefined,
    brain: typeof req.query["brain"] === "string" ? req.query["brain"] : undefined,
    status: typeof req.query["status"] === "string" ? req.query["status"] : undefined,
  });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const filterParams = {
      ...(parsed.data.brain !== undefined ? { brain: parsed.data.brain } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
    };
    const capabilities = parsed.data.q
      ? findCapabilities(parsed.data.q, filterParams)
      : listCapabilities(filterParams);
    res.json({ capabilities, total: capabilities.length });
  } catch (err) {
    logger.error({ err, userId }, "Cognitive Foundation: failed to list capabilities");
    res.status(500).json({ error: "Failed to list capabilities" });
  }
});

// Declared extension points (the nine future-intelligence seams plus any
// Brain-declared ones) and whatever providers have registered against them.
router.get("/executive-brain/extension-points", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  try {
    res.json({ extensionPoints: listExtensionPoints() });
  } catch (err) {
    logger.error({ err, userId }, "Cognitive Foundation: failed to list extension points");
    res.status(500).json({ error: "Failed to list extension points" });
  }
});

// ─── Build 003: Executive Reasoning endpoints ────────────────────────────────

// Run the full six-stage reasoning pipeline on demand. Returns the structured
// objective analysis, decision record, reasoning graph, and plain-English
// explanation — all derived from registry metadata, no AI call.
// Query: ?objective=<string> (required, max 500 chars)
const reasoningExplainSchema = z.object({
  objective: z.string().min(1).max(500),
});

router.get("/executive-brain/reasoning/explain", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const parsed = reasoningExplainSchema.safeParse({
    objective: typeof req.query["objective"] === "string" ? req.query["objective"] : undefined,
  });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const orchResult = orchestrate({ objective: parsed.data.objective });
    const reasoningResult = runReasoningPipeline(parsed.data.objective, orchResult);
    res.json({
      explanation: reasoningResult.explanation,
      objectiveAnalysis: reasoningResult.objectiveAnalysis,
      decisionRecordId: reasoningResult.decisionRecord.id,
      confidence: reasoningResult.objectiveAnalysis.confidence,
      stages: reasoningResult.pipelineStages.map((s) => ({
        stageId: s.stageId,
        confidence: s.confidence,
        durationMs: s.durationMs,
      })),
      reasonedAt: reasoningResult.reasonedAt,
    });
  } catch (err) {
    logger.error({ err, userId }, "Executive Reasoning: explain endpoint failed");
    res.status(500).json({ error: "Failed to run reasoning pipeline" });
  }
});

// Recent Decision Records (in-process ring buffer, newest first).
// Query: ?limit=<number> (default 20, max 100)
const decisionRecordsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

router.get("/executive-brain/reasoning/records", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const parsed = decisionRecordsSchema.safeParse({
    limit: typeof req.query["limit"] === "string" ? req.query["limit"] : undefined,
  });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const records = getRecentDecisionRecords(parsed.data.limit);
    res.json({ records, total: records.length });
  } catch (err) {
    logger.error({ err, userId }, "Executive Reasoning: records endpoint failed");
    res.status(500).json({ error: "Failed to retrieve decision records" });
  }
});

// Single Decision Record by id (for visualization / reflection lookup).
router.get("/executive-brain/reasoning/records/:id", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const id = String(req.params["id"] ?? "");
  if (!id) {
    res.status(400).json({ error: "Missing record id" });
    return;
  }
  try {
    const record = getDecisionRecord(id);
    if (!record) {
      res.status(404).json({ error: `No decision record found with id "${id}"` });
      return;
    }
    res.json({ record });
  } catch (err) {
    logger.error({ err, userId }, "Executive Reasoning: record detail endpoint failed");
    res.status(500).json({ error: "Failed to retrieve decision record" });
  }
});

// Reflection hooks — what questions are declared and which have handlers.
router.get("/executive-brain/reasoning/reflection-hooks", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  try {
    const hooks = listReflectionHooks();
    const questions = REFLECTION_QUESTION_IDS.map((id) => ({
      id,
      hooks: hooks.filter((h) => h.questionId === id),
    }));
    res.json({ questions, declaredCount: REFLECTION_QUESTION_IDS.length, registeredCount: hooks.length });
  } catch (err) {
    logger.error({ err, userId }, "Executive Reasoning: reflection-hooks endpoint failed");
    res.status(500).json({ error: "Failed to retrieve reflection hooks" });
  }
});

// ─── Build 002: Cognitive Orchestration endpoints ────────────────────────────

// Compute a collaboration plan for a given objective. Consumes the Brain
// Registry and Capability Registry to select relevant Brains, topologically
// sort them by dependency, and identify required capabilities — all from
// registry metadata with no AI call.
// Query: ?objective=<string> (required, max 500 chars)
// Query: ?require=<brain,brain> optional comma-separated required Brain names
// Query: ?exclude=<brain,brain> optional comma-separated Brain names to skip
const orchestrationPlanSchema = z.object({
  objective: z.string().min(1).max(500),
  require: z.string().max(500).optional(),
  exclude: z.string().max(500).optional(),
});

router.get("/executive-brain/orchestration/plan", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const parsed = orchestrationPlanSchema.safeParse({
    objective: typeof req.query["objective"] === "string" ? req.query["objective"] : undefined,
    require: typeof req.query["require"] === "string" ? req.query["require"] : undefined,
    exclude: typeof req.query["exclude"] === "string" ? req.query["exclude"] : undefined,
  });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const requireBrains = parsed.data.require
      ? parsed.data.require.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;
    const excludeBrains = parsed.data.exclude
      ? parsed.data.exclude.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    const result = orchestrate({
      objective: parsed.data.objective,
      ...(requireBrains ? { requireBrains } : {}),
      ...(excludeBrains ? { excludeBrains } : {}),
    });

    res.json({
      selectedBrains: result.selectedBrains,
      confidence: result.confidence,
      collaborationPlan: result.collaborationPlan,
      capabilityMap: result.capabilityMap,
      orchestratedAt: result.orchestratedAt,
    });
  } catch (err) {
    logger.error({ err, userId }, "Cognitive Orchestration: failed to build plan");
    res.status(500).json({ error: "Failed to build orchestration plan" });
  }
});

// Runtime state for every registered Brain: operational states (idle/busy/
// waiting/blocked/recovering/learning) driven by the orchestration layer, plus
// health-derived states (healthy/warning/degraded/offline) from Build 001.
router.get("/executive-brain/runtime-states", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  try {
    const brainNames = listBrains().map((b) => b.name);
    const states = getRuntimeStates(brainNames);
    res.json({ runtimeStates: states, total: states.length });
  } catch (err) {
    logger.error({ err, userId }, "Cognitive Orchestration: failed to get runtime states");
    res.status(500).json({ error: "Failed to get runtime states" });
  }
});

export default router;
