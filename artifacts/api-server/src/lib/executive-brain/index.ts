import { logger } from "../logger";
import { getCachedHealthConcerns } from "../cognitive-foundation/brain-registry";
import { orchestrate } from "../cognitive-foundation/orchestration";
import { runReasoningPipeline } from "../cognitive-foundation/reasoning";
import { consolidate } from "../cognitive-foundation/cognitive-memory";
import { resolveActiveProject, updateProjectRollup } from "./project-manager";
import { resolveGoalForRequest } from "./goal-manager";
import { planTasks } from "./task-planner";
import type { ExecutiveBrainRequest, ExecutiveBrainResult } from "./types";
import type { ExecutiveReasoningResult } from "../cognitive-foundation/types";
// Build 006: Executive Context Engine
import { resolveContextSnapshot } from "../executive-context/context-resolution";
import type { ExecutiveContextSnapshot } from "../executive-context/types";
// Build 007: Executive Judgment Engine
import { evaluateJudgmentFromReasoning } from "./judgment-integration";
// Build 008: Executive Goal Engine
import { fetchActiveGoals, buildGoalAdvisory } from "./goal-integration";
import type { ExecutiveGoal } from "../executive-goal/types";
// Build 009: Executive Planning Engine
import { fetchActivePlans, ensurePlanForPrimaryGoal, buildPlanAdvisory } from "./plan-integration";
import type { ExecutivePlan } from "../executive-plan/types";
// Build 010: Executive Execution Engine
import { fetchActiveExecutions, ensureExecutionForActivePlan, buildExecutionAdvisory } from "./execution-integration";
import type { ExecutiveExecution } from "../executive-execution/types";
// Build 011: Executive Observation Engine
import { fetchObservationSummary, publishBrainObservation, buildObservationAdvisory } from "./observation-integration";
import type { ObservationSummary } from "../executive-observation/types";
// Build 012: Executive Reflection Engine
import { fetchReflectionSummary, ensureCaseForCycle, buildReflectionAdvisory } from "./reflection-integration";
import type { ReflectionSummary } from "../executive-reflection/types";

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

  // ── Executive Context Engine (Build 006) ─────────────────────────────────
  // Resolve the current situational context BEFORE any planning or reasoning.
  // Fail-open: a context failure must never block the request path.
  // The snapshot id is stored in the result so Decision Records can reference
  // the exact context that was active during reasoning (for future replay/audit).
  let contextSnapshot: ExecutiveContextSnapshot | undefined;
  let contextSnapshotId: string | undefined;
  try {
    contextSnapshot = await resolveContextSnapshot(userId, message);
    contextSnapshotId = contextSnapshot.id;
  } catch (err) {
    logger.warn({ err }, "Executive Brain: context resolution failed (ignored)");
  }

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

  // ── Cognitive Orchestration (Build 002) ─────────────────────────────────
  // Reason about which Brains are relevant to this request. Zero-I/O:
  // reads only in-process registry data. Fail-open by contract.
  let orchestrationResult: ReturnType<typeof orchestrate> | null = null;
  try {
    orchestrationResult = orchestrate({ objective: message });
  } catch (err) {
    logger.warn({ err }, "Executive Brain: cognitive orchestration failed (ignored)");
  }

  // ── Executive Reasoning Pipeline (Build 003) ──────────────────────────
  // Six-stage structured reasoning pass that runs after orchestration and
  // before the context note is assembled. Zero-I/O: reads only in-process
  // registry data. Fail-open: a pipeline failure is caught in the pipeline
  // itself; we also guard the call here.
  let reasoningResult: ExecutiveReasoningResult | undefined;
  try {
    reasoningResult = runReasoningPipeline(message, orchestrationResult);
  } catch (err) {
    logger.warn({ err }, "Executive Brain: reasoning pipeline failed (ignored)");
  }

  // ── Cognitive Memory Consolidation (Build 004) ───────────────────────
  // Persist the Decision Record as a Cognitive Artifact — the first step
  // of durable Executive cognition. Fire-and-forget: never blocks the
  // request path. The in-memory ring buffer in reasoning.ts remains as
  // the hot L1 cache; this writes the same record to the persistent store.
  if (reasoningResult) {
    const record = reasoningResult.decisionRecord;
    void consolidate({
      id: record.id,
      artifactType: "decision_record",
      sourceBrain: "executive-brain",
      lifecycleStatus: "active",
      confidenceOverall: record.confidence.overall,
      confidenceReasoning: record.confidence.reasoning,
      confidenceCapability: record.confidence.capability,
      confidenceBrainSelection: record.confidence.brainSelection,
      brainsSelected: record.brainsSelected,
      capabilitiesUsed: record.capabilitiesUsed,
      evidence: record.supportingContext,
      executiveBrainVersion: "1.1.0",
      content: record as unknown as Record<string, unknown>,
      relationships: {},
      // Build 006: store the context snapshot id with the Decision Record so the
      // full reasoning context can be reconstructed for future replay and auditing.
      metadata: contextSnapshotId ? { contextSnapshotId } : {},
      objectiveText: record.objectiveAnalysis.primaryGoal,
      userId,
      projectId: project.id,
    }).catch((err) => {
      logger.warn({ err, recordId: record.id }, "Cognitive memory: consolidation failed (non-fatal)");
    });
  }

  // ── Executive Goal Engine (Build 008) ───────────────────────────────────
  // Resolve active goals for this user. Goals inform the Judgment Engine —
  // they never change goals themselves (one-way dependency).
  // Fail-open: an empty array is the fallback; the request always continues.
  let activeGoals: ExecutiveGoal[] = [];
  try {
    activeGoals = await fetchActiveGoals(userId);
  } catch (err) {
    logger.warn({ err }, "Executive Brain: goal fetch failed (ignored)");
  }

  // ── Executive Judgment Engine (Build 007 + 008) ──────────────────────────
  // Derive decision options from the reasoning result and evaluate them.
  // Active goals (Build 008) enrich option scores before evaluation.
  // The Judgment Engine scores all options, selects a recommendation, and
  // produces a full explanation. Persisted as a Cognitive Artifact.
  // Synchronous but fail-open: never blocks the request path.
  let judgmentId: string | undefined;
  if (reasoningResult) {
    try {
      const judgment = await evaluateJudgmentFromReasoning(
        userId,
        message,
        reasoningResult,
        contextSnapshotId,
        activeGoals,
      );
      judgmentId = judgment.id;
    } catch (err) {
      logger.warn({ err }, "Executive Brain: judgment evaluation failed (ignored)");
    }
  }

  // ── Executive Planning Engine (Build 009) ───────────────────────────────────
  // Fetch active plans for this user. If no plan covers the primary active goal,
  // generate one deterministically.  Planning NEVER executes — it only produces
  // structured strategies.  Fail-open: a planning failure must never block the
  // request path.
  let activePlans: ExecutivePlan[] = [];
  let activePlanId: string | undefined;
  try {
    activePlans = await fetchActivePlans(userId);
    activePlanId = await ensurePlanForPrimaryGoal(userId, activeGoals, activePlans, {
      contextSnapshotId,
      judgmentId,
    }) ?? undefined;
  } catch (err) {
    logger.warn({ err }, "Executive Brain: planning step failed (ignored)");
  }

  // ── Executive Execution Engine (Build 010) ──────────────────────────────────
  // Fetch active executions for this user. If no execution covers the primary
  // approved plan, create a pending one. Execution NEVER plans, judges, or
  // changes goals — it only coordinates execution of approved plans.
  // Fail-open: an execution failure must never block the request path.
  let activeExecutions: ExecutiveExecution[] = [];
  let activeExecutionId: string | undefined;
  try {
    activeExecutions = await fetchActiveExecutions(userId);
    activeExecutionId = await ensureExecutionForActivePlan(userId, activePlans, activeExecutions, {
      contextSnapshotId,
      judgmentId,
    }) ?? undefined;
  } catch (err) {
    logger.warn({ err }, "Executive Brain: execution step failed (ignored)");
  }

  // ── Executive Observation Engine (Build 011) ─────────────────────────────────
  // Fetch the observation summary at the END of the pipeline so it reflects
  // all events that have been published up to this cycle.
  // Observation NEVER changes execution, plans, goals, or memory state.
  // It only reads the observation store and returns a lightweight summary.
  // Then publish this brain cycle itself as an observation (append-only).
  // Fail-open: an observation failure must never block the request path.
  let observationSummary: ObservationSummary | undefined;
  try {
    observationSummary = await fetchObservationSummary(userId) ?? undefined;
    // Publish the brain cycle as an observation (fire-and-forget)
    void publishBrainObservation({
      userId,
      goalId: activeGoals[0]?.id,
      planId: activePlanId,
      executionId: activeExecutionId,
      contextSnapshotId,
      judgmentId,
    }).catch((err) => {
      logger.warn({ err }, "Executive Brain: brain cycle observation publish failed (non-fatal)");
    });
  } catch (err) {
    logger.warn({ err }, "Executive Brain: observation step failed (ignored)");
  }

  // ── Executive Reflection Engine (Build 012) ──────────────────────────────────
  // Fetch reflection summary (recent cases + quality scores) for the advisory.
  // Ensure a case is open for this cycle (idempotent — reuses existing case
  // when the same execution is active).
  // Reflection NEVER changes execution, plans, goals, or memory.
  // Fail-open: a reflection failure must never block the request path.
  let reflectionSummary: ReflectionSummary | undefined;
  try {
    reflectionSummary = await fetchReflectionSummary(userId) ?? undefined;
    // Open/reuse a case for this brain cycle (fire-and-forget)
    void ensureCaseForCycle({
      userId,
      rootRequest: message,
      primaryGoalId: activeGoals[0]?.id,
      primaryPlanId: activePlanId,
      primaryExecutionId: activeExecutionId,
      primaryChainId: observationSummary?.latestChainId ?? undefined,
    }).catch((err) => {
      logger.warn({ err }, "Executive Brain: case open failed (non-fatal)");
    });
  } catch (err) {
    logger.warn({ err }, "Executive Brain: reflection step failed (ignored)");
  }

  const brainContextNote = buildContextNote({ isNew, project, goal, tasks, orchestrationResult, reasoningResult, contextSnapshot, judgmentId, activeGoals, activePlans, activePlanId, activeExecutions, activeExecutionId, observationSummary, reflectionSummary });

  logger.info(
    {
      userId,
      projectId: project.id,
      isNew,
      goalId: goal?.id,
      taskCount: tasks.length,
      reasoningConfidence: reasoningResult?.objectiveAnalysis.confidence.overall,
      judgmentId,
      activeGoalCount: activeGoals.length,
      activePlanCount: activePlans.length,
      activePlanId,
      activeExecutionCount: activeExecutions.length,
      activeExecutionId,
    },
    "Executive Brain resolved project/goal/tasks for request",
  );

  return {
    project: { ...project, currentPhase: nextPhase, currentTaskId: firstPendingTask?.id ?? null },
    goal,
    tasks,
    isNewProject: isNew,
    brainContextNote,
    reasoningResult,
    contextSnapshotId,
    judgmentId,
    activeGoals,
    activePlanId,
    activeExecutionId,
    observationSummary,
    reflectionSummary,
  };
}

function buildContextNote(params: {
  isNew: boolean;
  project: ExecutiveBrainResult["project"];
  goal: ExecutiveBrainResult["goal"];
  tasks: ExecutiveBrainResult["tasks"];
  orchestrationResult: ReturnType<typeof orchestrate> | null;
  reasoningResult: ExecutiveReasoningResult | undefined;
  contextSnapshot: ExecutiveContextSnapshot | undefined;
  judgmentId: string | undefined;
  activeGoals: ExecutiveGoal[];
  activePlans: ExecutivePlan[];
  activePlanId: string | undefined;
  activeExecutions: ExecutiveExecution[];
  activeExecutionId: string | undefined;
  observationSummary: ObservationSummary | undefined;
  reflectionSummary: ReflectionSummary | undefined;
}): string {
  const { isNew, project, goal, tasks, orchestrationResult, reasoningResult, contextSnapshot, judgmentId, activeGoals, activePlans, activePlanId, activeExecutions, activeExecutionId, observationSummary, reflectionSummary } = params;
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

  // ── Executive Reasoning advisory (Build 003) ─────────────────────────────
  // Structured reasoning metadata from the six-stage pipeline, assembled into
  // a compact advisory for the AI Orchestrator's situational awareness.
  if (reasoningResult) {
    try {
      const { objectiveAnalysis, decisionRecord } = reasoningResult;
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      const conf = objectiveAnalysis.confidence;
      lines.push(
        clip(
          `Executive reasoning: ${objectiveAnalysis.primaryGoal} ` +
          `[complexity: ${objectiveAnalysis.complexity}, confidence: ${conf.overall}` +
          `(reasoning:${conf.reasoning} capability:${conf.capability} selection:${conf.brainSelection})]`,
          400,
        ),
      );
      if (objectiveAnalysis.knownConstraints.length > 0) {
        lines.push(clip(`Constraints: ${objectiveAnalysis.knownConstraints.slice(0, 3).join("; ")}`, 300));
      }
      if (decisionRecord.supportingContext.length > 0) {
        lines.push(clip(`Decision context: ${decisionRecord.supportingContext.join("; ")}`, 300));
      }
    } catch (err) {
      logger.warn({ err }, "Executive Brain: reasoning advisory failed (ignored)");
    }
  }

  // ── Cognitive Orchestration advisory (Build 002) ─────────────────────────
  // Zero-I/O: the orchestration result was computed before buildContextNote
  // was called, so this is a simple data read with no I/O risk.
  if (orchestrationResult) {
    try {
      const { selectedBrains, confidence, collaborationPlan } = orchestrationResult;
      if (selectedBrains.length > 0) {
        const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
        const brainList = selectedBrains.join(", ");
        const orderNote =
          collaborationPlan.executionOrder.length > 1
            ? ` (order: ${collaborationPlan.executionOrder.join(" → ")})`
            : "";
        lines.push(
          clip(
            `Cognitive orchestration: engaging [${brainList}]${orderNote} [confidence: ${confidence}]`,
            400,
          ),
        );
      }
    } catch (err) {
      logger.warn({ err }, "Executive Brain: orchestration advisory failed (ignored)");
    }
  }

  // ── Executive Context advisory (Build 006) ───────────────────────────────
  // Brief situational context from the resolved Executive Context Snapshot.
  // Zero-I/O: the snapshot was computed before buildContextNote was called.
  if (contextSnapshot) {
    try {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      if (contextSnapshot.activeObjectives.length > 0 || contextSnapshot.activePriorities.length > 0) {
        const objectives = contextSnapshot.activeObjectives.slice(0, 2).join("; ");
        const priorities = contextSnapshot.activePriorities.slice(0, 2).join("; ");
        const constraints = contextSnapshot.activeConstraints.slice(0, 2).join("; ");
        const parts = [
          objectives && `objectives: ${objectives}`,
          priorities && `priorities: ${priorities}`,
          constraints && `constraints: ${constraints}`,
        ].filter(Boolean).join(" | ");
        if (parts) {
          lines.push(
            clip(
              `Executive context (${contextSnapshot.contextIds.length} active context(s)): ${parts}`,
              500,
            ),
          );
        }
        if (contextSnapshot.conflictFlags.length > 0) {
          lines.push(
            clip(`Context conflicts detected: ${contextSnapshot.conflictFlags.slice(0, 2).join("; ")}`, 300),
          );
        }
      }
    } catch (err) {
      logger.warn({ err }, "Executive Brain: context advisory failed (ignored)");
    }
  }

  // ── Executive Planning advisory (Build 009) ──────────────────────────────
  // One-line summary of active plans and any newly generated plan.
  // Zero-I/O: activePlans were fetched before buildContextNote was called.
  try {
    const planAdvisory = buildPlanAdvisory(activePlans, activePlanId ?? null);
    if (planAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(planAdvisory, 500));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: planning advisory failed (ignored)");
  }

  // ── Executive Execution advisory (Build 010) ─────────────────────────────
  // One-line summary of active executions and any newly created execution.
  // Zero-I/O: activeExecutions were fetched before buildContextNote was called.
  try {
    const executionAdvisory = buildExecutionAdvisory(activeExecutions, activeExecutionId ?? null);
    if (executionAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(executionAdvisory, 500));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: execution advisory failed (ignored)");
  }

  // ── Executive Goal advisory (Build 008) ─────────────────────────────────
  // One-line summary of active goals that are influencing this request.
  // Zero-I/O: activeGoals were fetched before buildContextNote was called.
  if (activeGoals.length > 0) {
    try {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      const advisory = buildGoalAdvisory(activeGoals);
      if (advisory) lines.push(clip(advisory, 500));
    } catch (err) {
      logger.warn({ err }, "Executive Brain: goal advisory failed (ignored)");
    }
  }

  // ── Executive Judgment advisory (Build 007) ──────────────────────────────
  // One-line summary of the judgment recommendation derived from the reasoning
  // pipeline. Zero-I/O: judgment was computed before this function was called.
  if (judgmentId) {
    try {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(`Executive judgment (id: ${judgmentId}): recommendation available — consult /api/executive-judgment/${judgmentId} for scored options, explanation, and rationale.`, 500));
    } catch (err) {
      logger.warn({ err }, "Executive Brain: judgment advisory failed (ignored)");
    }
  }

  // ── Executive Observation advisory (Build 011) ───────────────────────────
  // Summary of recent observations, signals, anomalies, and trends.
  // Zero-I/O: the summary was fetched before buildContextNote was called.
  try {
    const observationAdvisory = buildObservationAdvisory(observationSummary ?? null);
    if (observationAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(observationAdvisory, 500));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: observation advisory failed (ignored)");
  }

  // ── Executive Reflection advisory (Build 012) ────────────────────────────
  // Summary of recent Executive Cases and Reflection Reports.
  // Zero-I/O: the summary was fetched before buildContextNote was called.
  try {
    const reflectionAdvisory = buildReflectionAdvisory(reflectionSummary ?? null);
    if (reflectionAdvisory) {
      const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
      lines.push(clip(reflectionAdvisory, 500));
    }
  } catch (err) {
    logger.warn({ err }, "Executive Brain: reflection advisory failed (ignored)");
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
