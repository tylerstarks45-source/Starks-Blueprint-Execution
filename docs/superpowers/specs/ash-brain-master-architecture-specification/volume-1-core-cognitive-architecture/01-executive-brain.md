# 1.1 — Executive Brain

**Status:** Architecture Drafted — Pending Review
**Volume:** 1 — Core Cognitive Architecture
**Last Updated:** 2026-07-29

---

## 1. Purpose & Scope

This chapter is the permanent architecture reference for the Executive Brain — the multi-phase planning layer that sits between an incoming user request and the AI Orchestrator, responsible for resolving what project, goal, and task a request belongs to before any model call happens. It documents the subsystem exactly as it exists today (per the Master X-RAY baseline), defines its long-term mission and full capability set, and identifies the extension points and open questions that will govern its future growth — without proposing any implementation change. Per the Upgrade Before Replace law, no replacement of any existing component is proposed anywhere in this chapter.

## 2. Baseline Reference

See Master X-RAY §1.2 (Executive Brain) for the summary-level as-built description, and §2.3 for its data-store footprint (`ash_projects`, `ash_goals`, `ash_tasks`, `ash_project_memory` — currently ungoverned, a documented Phase B candidate, not addressed by this chapter). The detail below expands that baseline; it does not revise it.

## 3. Architecture

### 3.1 Current Architecture Summary

*This section documents the Executive Brain exactly as it exists today. It is not redesigned here.*

**Entry point and control flow.** The subsystem's entry function is `runExecutiveBrain(req: ExecutiveBrainRequest)` in `lib/executive-brain/index.ts`, invoked from `routes/executive-brain.ts` at `POST /api/executive-brain/stream`. On each request it runs a fixed five-step sequence:

1. **Resolve Project** — `resolveActiveProject` (in `project-manager.ts`) finds or creates an `AshProject` row.
2. **Resolve Goal** — `resolveGoalForRequest` (in `goal-manager.ts`) maps the request to an `AshGoal`.
3. **Plan Tasks** — `planTasks` (in `task-planner.ts`) decomposes the request into one or more `AshTask` rows.
4. **Update Rollup** — `updateProjectRollup` syncs the project's `currentPhase` and `currentTaskId` from the resulting plan.
5. **Build Context** — assembles the `brainContextNote` (see §3.5, Outputs) for the AI Orchestrator.

Around this core sequence, `routes/executive-brain.ts` additionally invokes the Planning Engine (`runPlanningEngine`), the Business Intelligence context assembler (`assembleBusinessContextPackage`), the Research Engine (`runResearchEngine`, conditionally, when research intent is detected), and the Memory Engine (`retrieveRelevantMemory` / `captureAutoMemory`) — each independently, around the Executive Brain's own five-step sequence.

**Project resolution logic.** `resolveActiveProject` first checks for an explicit `systemInstanceId` pin; if present, it resolves the project already associated with that system instance. Otherwise it looks for the caller's most recent active project. A new project is started when the incoming message matches one of a fixed set of `NEW_PROJECT_KEYWORDS` (e.g. "new business", "start over", "from scratch"). New projects are named via a lightweight AI call, `deriveProjectName`, which falls back to a plain slice of the user's message if the AI call fails.

**Goal resolution logic.** `resolveGoalForRequest` reuses the most recent active goal for an existing project. For a new project, or when no active goal exists, it derives one via `deriveGoal` (an AI extraction call).

**Task planning logic.** `planTasks` uses a length heuristic: messages under `DECOMPOSE_THRESHOLD_CHARS` (220 characters) become a single task; longer messages are passed to `decomposeIntoTasks` (AI-driven), which produces 2–6 ordered tasks. Each task is assigned to a downstream engine — `media_gen`, `browser_agent`, `build_engine`, or `research` — via `guessEngine`, a keyword-based classifier (`ENGINE_KEYWORDS`).

**Fail-open behavior.** The whole subsystem is designed so a failure here never blocks the underlying chat/orchestrator call. `routes/executive-brain.ts` wraps `runExecutiveBrain` and each of the surrounding engine calls (Planning, Research, Memory, Business Intelligence) in independent `try...catch` blocks, so a failure in any one of them degrades that one contribution — logged via `logger.warn` (engine-level) or `logger.error` (forwarding failures) — while the rest proceed and the original request is still forwarded to the orchestrator, unchanged if every enrichment step fails.

**Dependencies and strengths.** The Executive Brain depends on `lib/memory-engine/` (project/business/knowledge memory retrieval and capture), `lib/business-intelligence/` (business context and DNA), `lib/planning-engine/` (milestone and validation), `lib/research-engine/` (conditional), and `lib/openrouter` (AI calls for naming, goal extraction, and task decomposition). Its principal strength is that this project/goal/task resolution runs as a cheap pre-pass, entirely decoupled from — and fail-open with respect to — the expensive orchestrator/tool-execution path, so improving or breaking the Executive Brain never threatens basic chat availability.

**Existing extension points.** `guessEngine`'s keyword table and `NEW_PROJECT_KEYWORDS` are both simple, centralized lookup tables that can absorb new keywords without touching call sites. `task-planner.ts` already exposes an `updateTaskStatus` function to `routes/executive-brain.ts` that is not yet used internally by the Executive Brain itself — a seam already present in the code, noted here as observed fact, not a proposal.

### 3.2 Executive Brain Mission

The Executive Brain's long-term mission within the AI Business Operating System is to be the **single point of continuity** between a user's ongoing work and every stateless reasoning pass the system makes on their behalf. Every other Brain subsystem (Planning, Business Intelligence, Research, Memory) answers a question in isolation; the Executive Brain is what remembers *which* project, *which* goal, and *which* task those answers belong to, so that a user's relationship with the system reads as one continuous collaboration rather than a sequence of disconnected completions. As the platform grows from single-request chat into autonomous, multi-step, multi-day project execution, the Executive Brain is the layer responsible for keeping that execution coherent, resumable, and auditable — the executive function of the system, in the same sense the term is used for human cognition.

### 3.3 Core Responsibilities

- **Project continuity** — determine, for every incoming request, which `AshProject` it belongs to (an existing one, or the start of a new one), and maintain that project's lifecycle state.
- **Goal resolution** — determine which `AshGoal` within the active project the request advances, or derive a new one when none fits.
- **Task decomposition** — break a request down into one or more concrete `AshTask` units, sized appropriately to the request, and assign each to the engine responsible for executing it.
- **Project rollup maintenance** — keep the project's `currentPhase` and `currentTaskId` synchronized with the live state of its tasks.
- **Context handoff** — produce a concise, structured summary (the `brainContextNote`) that gives the AI Orchestrator and downstream model call the project/goal/task context it needs, without requiring the orchestrator to understand project/goal/task modeling itself.
- **Non-blocking operation** — guarantee that failures anywhere in this resolution process degrade gracefully rather than blocking the user's underlying request.
- **User and business scoping** — ensure every project, goal, and task resolution is correctly isolated to the requesting user, and to the correct business context when a `systemInstanceId` is present.

### 3.4 Core Capabilities

The responsibilities above decompose into the following individual capabilities. Capabilities marked *(current)* are implemented today per §3.1; capabilities marked *(latent)* name a responsibility the mission in §3.2 implies but which has no dedicated implementation yet — named here as a future-growth signal, not committed work.

- **Decision Making** *(current, narrow)* — the new-project/continue-project and new-goal/continue-goal decisions in `project-manager.ts`/`goal-manager.ts` today; the mission in §3.2 implies this should grow into broader in-flight execution decisions over time.
- **Goal Management** *(current)* — `goal-manager.ts`.
- **Task Coordination** *(current)* — `task-planner.ts`'s decomposition and engine assignment.
- **Project Coordination** *(current)* — `project-manager.ts`, plus `updateProjectRollup`.
- **Context Assembly** *(current)* — the `brainContextNote` builder.
- **Delegation** *(current, implicit)* — `guessEngine`'s engine assignment is a delegation decision, though it is a keyword classifier today rather than a dedicated delegation capability.
- **Planning Coordination** *(current, via call-out)* — invoking `runPlanningEngine`; owned by the Planning Engine itself, but the Executive Brain is the caller that supplies it with resolved project/goal/task context.
- **Research Coordination** *(current, via call-out)* — conditionally invoking `runResearchEngine` when research intent is detected.
- **Memory Coordination** *(current, via call-out)* — `retrieveRelevantMemory` / `captureAutoMemory` calls surrounding the core sequence.
- **Business Coordination** *(current, via call-out)* — `assembleBusinessContextPackage`, scoped by `systemInstanceId`/`businessId`.
- **Risk Coordination** *(latent)* — risk scoring exists today inside the Planning Engine's Validation Engine, not inside the Executive Brain; whether risk signals should also surface at the Executive Brain's coordination level is an open question (§3.9).
- **Approval Coordination** *(latent)* — `pending_approvals` are created by the Validation Engine, not the Executive Brain; the Executive Brain has no current visibility into approval state for the tasks it plans.
- **Execution Coordination** *(latent)* — the Executive Brain plans tasks but does not currently track their execution to completion; `updateTaskStatus` exists but is unused internally (§3.1).
- **Recovery Coordination** *(latent)* — no current mechanism for the Executive Brain to detect a stalled/failed task and re-plan.
- **Learning Coordination** *(current, via call-out)* — `captureAutoMemory` triggers on stream completion; deeper coordination with the ASH Self-Improving Brain's lesson distillation is not wired at this layer today.
- **Model Coordination** *(current, narrow; via call-out)* — the Executive Brain's own AI calls (naming, goal derivation, task decomposition) go through `lib/openrouter`, which itself defers to the centralized `lib/models.ts` best-model policy; the Executive Brain does not set model policy itself.
- **Tool Coordination** *(latent)* — no direct import of `ash-tools` was found in `lib/executive-brain/`; tool coordination happens downstream, in the Orchestrator.
- **Communication Coordination** *(current, narrow)* — the SSE pipe-through and `brainContextNote` handoff to the orchestrator (§3.5) is the extent of communication coordination today.
- **Opportunity Coordination** *(latent)* — no current mechanism for the Executive Brain to surface or prioritize opportunities (e.g. from Business Recommendations) into active goals/tasks.
- **Self Review Coordination** *(latent)* — no current mechanism for the Executive Brain to review its own past resolution decisions for quality.

### 3.5 Inputs

- **Request body (`ExecutiveBrainRequest`):** `userId`, `message`, `history` (role/content pairs), and the optional fields `systemInstanceId`, `businessType`, `revenueGoal`.
- **Request headers:** `Authorization`, forwarded through to the orchestrator loopback call unchanged.
- **Persisted state read at request time:** `ash_projects` and `ash_goals` (most-recent-active lookups, and `systemInstanceId`-pinned lookups), `ash_tasks` (for rollup and continuation).
- **Memory Engine retrieval:** long-term memory (`ash_memories`), project memory (`ash_project_memory`), business memory (`ash_business_memory`), and knowledge memory (`ash_knowledge_memory`), via `retrieveRelevantMemory`.
- **Business Intelligence context:** business identity/context resolved from `businessesTable`, scoped via `systemInstanceId`, via `assembleBusinessContextPackage`; ownership is checked against `businessesTable.ownerId` in `routes/executive-brain.ts` before this context is assembled.
- **AI-derived inputs:** outputs of `deriveProjectName`, `deriveGoal`, and `decomposeIntoTasks` — each an OpenRouter completion consumed as input to the resolution steps that follow it.

### 3.6 Outputs

- **`brainContextNote`** — the primary output: a string block delimited by `=== EXECUTIVE BRAIN PLAN ===`, containing the resolved project name and phase, the current goal, and the list of planned tasks with their status and assigned engine. This is appended to the user's forwarded `message` rather than sent as a separate structured field.
- **Persisted state writes:** new or updated rows in `ash_projects` (including rollup fields `currentPhase`/`currentTaskId`), `ash_goals`, and `ash_tasks`.
- **Forwarded orchestrator request:** a `POST http://127.0.0.1:${port}/api/ai-orchestrator/stream` call carrying the original request body, with `message` augmented by the `brainContextNote` plus any additional notes contributed by the Planning, Research, and Memory engines.
- **SSE stream to the caller:** the orchestrator's SSE response is piped back to the original client, with the Executive Brain layer peeking the stream for a terminal "done" event to trigger `captureAutoMemory`.
- **Logging output:** `logger.warn` for degraded/failed enrichment steps, `logger.error` for forwarding failures — both are an observable output of this subsystem's fail-open contract, not just incidental logging.

### 3.7 Integration Map

| Subsystem | Direction | Nature of the integration |
|---|---|---|
| AI Orchestrator | Executive Brain → Orchestrator | Internal loopback HTTP call (`POST /api/ai-orchestrator/stream`); the Executive Brain is upstream of, and forwards into, the Orchestrator's request path. |
| Planning Engine | Executive Brain → Planning Engine | `routes/executive-brain.ts` calls `runPlanningEngine` directly (in-process), supplying it the resolved project/goal/task context; failure is caught independently and degrades gracefully. |
| Business Intelligence | Executive Brain → Business Intelligence | `assembleBusinessContextPackage`, scoped by `systemInstanceId`/`businessId`; ownership is checked against `businessesTable.ownerId` before this call is made. |
| Research & Knowledge Engine | Executive Brain → Research Engine | `runResearchEngine`, invoked conditionally when research intent is detected in the request. |
| Memory Engine | Executive Brain ↔ Memory Engine | `retrieveRelevantMemory` (read, pre-call) and `captureAutoMemory` (write, on stream completion); `ash_project_memory` is itself owned and managed by the Memory Engine, not by the Executive Brain, despite living alongside `ash_projects` in the Executive Brain's domain naming. |
| ASH Self-Improving Brain | Not integrated today | No call site found; the Executive Brain does not currently consult or contribute to SQL-distilled lessons. |
| ash-tools / Tool Execution | Not integrated today | No direct import found in `lib/executive-brain/`; tool execution happens downstream, inside the Orchestrator's own request handling, after the Executive Brain has already handed off. |
| Runtime Job Worker | Not integrated today | The Executive Brain operates only on the live, synchronous request path; no interaction with the asynchronous `runtime_jobs` queue was found. |
| Validation Engine / Approvals | Indirect only | Runs inside the Planning Engine call, not directly invoked by the Executive Brain; the Executive Brain has no visibility into `pending_approvals` state for tasks it plans (see §3.4, Approval Coordination). |

### 3.8 Future Growth

The following are extension points that would allow the Executive Brain to grow toward the mission in §3.2 without redesigning its current five-step core sequence — consistent with the Upgrade Before Replace law, each below is framed as an addition to, not a replacement of, existing architecture:

- **Execution and Recovery Coordination:** `task-planner.ts`'s already-exposed but internally-unused `updateTaskStatus` is a natural seam for closing the loop between planned tasks and their actual execution outcome, enabling future stall/failure detection and re-planning without changing the planning logic itself.
- **Approval visibility:** the Executive Brain could be extended to read `pending_approvals` state for its own planned tasks (a read-only addition) so that a `brainContextNote` can reflect "blocked on approval" rather than presenting a task as simply pending.
- **Risk-aware planning:** the Validation Engine's existing risk scoring could be surfaced back to the Executive Brain's rollup (again, a read-only consumption of an existing signal) rather than the Executive Brain reimplementing risk logic.
- **Tool/model coordination visibility:** as `lib/models.ts` and the connector registry already centralize their respective policies, the Executive Brain could extend its `brainContextNote` to reflect model/tool choices made downstream, purely as an observability addition.
- **Multi-user/team workspace growth:** the subsystem's existing `userId`-scoped queries are the natural foundation to extend toward the reserved `teamWorkspaceId` concept (see Master X-RAY §7, and Volume 6 Chapter 5) once that concept is formally approved elsewhere in this specification — not a change required here.
- **Learning Coordination:** a read-only consultation of the ASH Self-Improving Brain's lesson store during task decomposition (`decomposeIntoTasks`) is a plausible future enrichment that would not require changing the decomposition control flow, only its inputs.
- **Opportunity Coordination:** Business Recommendations (Volume 2, Chapter 5) already exist as a subsystem; a future read-only integration surfacing high-impact recommendations as candidate goals is a natural extension of the existing goal-derivation seam (`deriveGoal`), not a new mechanism.
- **Keyword-table centralization:** `NEW_PROJECT_KEYWORDS` and `ENGINE_KEYWORDS` are already isolated, centralized lookup tables (§3.1); they are a ready seam for future data-driven or configurable classification without touching the surrounding control flow.

### 3.9 Open Architecture Questions

The following require review and a decision before any related implementation work proceeds — they are flagged here, not resolved:

1. Should Risk Coordination and Approval Coordination become first-class Executive Brain responsibilities (i.e. does the Executive Brain need to *see* validation/approval state to plan well), or should they remain entirely owned by the Planning/Validation Engines with the Executive Brain staying unaware of them by design?
2. Should Execution Coordination and Recovery Coordination be added to the Executive Brain itself, or does that responsibility belong more naturally to the Runtime Job Worker / Scheduler, with the Executive Brain only ever producing a plan and never tracking its outcome?
3. Is the current keyword-based decision logic (`NEW_PROJECT_KEYWORDS` for new-project detection, `ENGINE_KEYWORDS` for engine assignment) intended to remain a simple heuristic long-term, or is this an area the mission in §3.2 expects to become AI-driven or learned over time? Any such change would need to satisfy the Upgrade Before Replace justification fields, and is explicitly not decided here.
4. How should the Executive Brain's project/goal/task model (`ash_*` tables) relate to the reserved `teamWorkspaceId` concept once a Team Workspace / RBAC chapter (Volume 6) is approved — does multi-user collaboration on a single project require new schema, or does the existing `userId`-scoped model already generalize?
5. Should Tool Coordination and Model Coordination visibility (§3.4) move up into the Executive Brain's own context assembly, or is keeping the Executive Brain deliberately unaware of tool/model specifics — as it is today — the correct long-term separation of concerns?
6. `ash_project_memory` is schema-adjacent to the Executive Brain's own tables but is owned and managed by the Memory Engine (§3.7). Is this split intentional and permanent, or should chapter boundaries between Volume 1 Chapter 1 (Executive Brain) and Volume 1 Chapter 4 (Memory Engine) be clarified regarding which one is the source of truth for project-scoped memory?
7. `ash_projects`, `ash_goals`, and `ash_tasks` remain outside the Business Intelligence Governance/Data Access Layer (Phase A) per the Master X-RAY (§6, explicitly out of scope). Should the Executive Brain's data eventually be brought under an equivalent ownership/audit contract, and if so, does that belong to this chapter or to the Volume 6 Governance chapters?

## 4. Architecture Review
_Reviewer notes, open questions, and requested changes go here once a draft exists._

## 5. Approval
_Approval record: who approved, when, and any conditions attached._

## 6. Implementation Notes
_Summary of what was built and why, with references to source files — not a duplicate of the code itself._

## 7. Compliance Audit
_Verification that the implementation matches the approved architecture._

## 8. Gap Remediation
_Log of gaps found during audit and how each was closed._

## 9. Final Audit
_Sign-off confirming all gaps are remediated and the implementation matches its approved architecture._

## 10. Optimization
_Performance, security, and UX refinements made after functional completion._

## 11. Lock Record
_Date locked, locked by, and confirmation that further changes require a new revision cycle rather than an in-place edit._
