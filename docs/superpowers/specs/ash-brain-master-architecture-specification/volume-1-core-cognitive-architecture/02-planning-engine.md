# 1.2 — Planning Engine

**Status:** Architecture Drafted — Draft (Volume 1 batch; pending architectural review)
**Volume:** 1 — Core Cognitive Architecture
**Last Updated:** 2026-07-29

**Template note:** This chapter follows the structure, quality bar, and Capability Contract format locked in [Chapter 1.1 — Executive Brain](./01-executive-brain.md) (see `00-INDEX.md`, "Chapter Template"). Per the project owner's 2026-07-29 workflow update, this chapter is drafted in a single pass and left in Draft status alongside the rest of Volume 1, rather than paused individually for approval. It has thirteen capability contracts rather than Chapter 1's twenty — a reflection of the Planning Engine's narrower mission (turning a resolved goal into an ordered, risk-aware execution plan) relative to the Executive Brain's broader coordination mission, not a lighter-weight treatment.

---

## 1. Purpose & Scope

This chapter is the permanent architecture reference for the Planning Engine — the subsystem that turns an Executive Brain–resolved project, goal, and task list into an actionable plan: grouped into milestones, ordered by dependency and priority, checked for readiness to execute, and evaluated for risk before being handed to execution. It documents the subsystem exactly as it exists today, defines its long-term mission, and binds every capability implied by that mission — implemented and latent alike — to an explicit Capability Contract. Per the Upgrade Before Replace law, no replacement of any existing component is proposed anywhere in this chapter; every future-state contract below explicitly reuses or extends an existing seam in the current implementation. No implementation, code change, or refactor is proposed or performed by this chapter.

## 2. Baseline Reference

See Master X-RAY §1.3 (Planning Engine) for the summary-level as-built description. Note that the Validation Engine, though physically nested under `lib/planning-engine/validation-engine/` in the current codebase, is documented in the X-RAY as its own subsystem (§1.6) and is scoped to its own chapter — [1.3 — Validation Engine](./03-validation-engine.md) — in this specification. This chapter treats the Validation Engine strictly as an integration point (see §3.4.4, §3.7), the same way Chapter 1 treated the Planning Engine itself as an integration point rather than re-documenting its internals.

## 3. Architecture

### 3.1 Current Architecture Summary

*This section documents the Planning Engine exactly as it exists today. It is not redesigned here.*

**Entry points and control flow.** The subsystem's primary entry point is `runPlanningEngine` in `lib/planning-engine/index.ts`, invoked from `routes/executive-brain.ts` immediately after `runExecutiveBrain` completes. It receives `userId`, the resolved `project`, `goal`, `tasks`, and an `isNewProject` flag, and returns a `PlanningEngineResult` containing `milestones`, scored `tasks`, the selected `nextTask`, a `decision`, and a `contextNote` string that is appended to the same forwarded message the Executive Brain's own `brainContextNote` is appended to. A secondary pair of entry points, `handleTaskFailure` and `handleTaskCompletion` in `adaptation.ts`, is invoked from `routes/executive-brain.ts`'s `PATCH /executive-brain/tasks/:id` when an external execution engine reports an outcome back.

On each planning pass, the engine runs a fixed five-step sequence:

1. **Milestone Planning** (`milestone-planner.ts`) — `planMilestonesForGoal` generates phases for large objectives (goals whose description exceeds 220 characters) via an AI call; `assignTasksToMilestones` then assigns new tasks to phases using a round-robin heuristic, explicitly documented in the codebase as a "cheap heuristic" for this phase of the subsystem's own development.
2. **Task Validation** (`validation.ts`) — `validateProjectTasks` invokes the Validation Engine (Chapter 1.3) against all new and previously-blocked tasks, and persists the resulting `status="blocked"` and `blockedReason` back onto `ash_tasks` when a rule fails.
3. **Prioritization** (`prioritization.ts`) — `reprioritizeProject` computes, per task, a `priorityScore`, `complexityScore`, `dependencyScore` (based on how many other tasks depend on it), an `estimatedDurationMinutes`, and an `executionOrder`, all via deterministic heuristics — no model call is made at this step.
4. **Readiness Classification** (`dependency-manager.ts`) — `classifyProjectTasks` maps every task to one of `ready`, `waiting` (on unresolved dependencies), `blocked` (on a missing resource, per Validation Engine output), `in_progress`, or a terminal state; `pickNextReadyTask` then selects the single best task for the current turn based on `executionOrder`.
5. **Decision Evaluation** (`decision-engine.ts`) — `evaluateExecutionDecision` runs an AI call for "major" tasks (an internal significance threshold) to score goal alignment, confidence, and risk, returning one of `proceed`, `hold`, or `escalate`.

**Outcome handling.** When an execution engine reports a task outcome via the `PATCH` route, `adaptation.ts`'s `handleTaskFailure` classifies the failure using regex-based pattern matching (documented technical debt, not AI-assisted), can trigger a user notification (`notifyUser`) for escalation-worthy failures, and records a `lesson_learned` entry via the Memory Engine's `addProjectMemory` (`project-memory.ts`) — the same capture mechanism used elsewhere in the platform's memory layer, not a bespoke lessons store. `handleTaskCompletion` updates task/rollup state on success.

**Audit trail.** Every planning pass writes one row to `ash_plan_decisions` for the selected `nextTask` — columns include `projectId`, `taskId`, `decision`, `goalAlignmentScore`, `confidenceScore`, `riskLevel`, `risks`, `requiredResources`, `selectedPath`, and `reasoning` — regardless of whether the decision was a full AI-scored evaluation or a fast-pathed "proceed."

**Risk detection is not unified.** There are two independent risk-assessment code paths in this subsystem today: the Validation Engine's `approvalRule` calls `detectRisks` in `validation-engine/risk-detector.ts` (regex-based, scanning for financial/destructive/bulk-communication patterns) to decide whether to create a `pending_approvals` row; separately, `decision-engine.ts` derives its own risk assessment via a direct LLM call over the task description, informed by (but not identical to) any `blockedReason` the Validation Engine already set. These are not currently reconciled into one signal — flagged as a named risk in §3.10, not resolved here.

**Escalation is advisory, not structural.** When `evaluateExecutionDecision` returns `hold` or `escalate`, the Planning Engine does not create a `pending_approvals` row or otherwise block the task record — it only annotates the `contextNote` with an instruction for the AI Orchestrator to explain the situation to the user rather than proceed. The only mechanism in this subsystem that produces a structured, database-backed block is the Validation Engine's `approvalRule`, run earlier in the same pass.

**Event publishing.** `routes/executive-brain.ts` calls `publishBusinessEvent` — the same outbox pattern used by Business Intelligence (Master X-RAY §4.1) — to emit `task.completed`, `project.completed`, and `project.updated` events as planning-driven state changes occur; this call lives in the route, not inside `lib/planning-engine/` itself, a boundary worth confirming during Architecture Review (§3.9).

**Authorization.** The two read routes that expose this subsystem's output directly to the frontend — `GET /api/executive-brain/projects/:id/milestones` and `GET /api/executive-brain/projects/:id/readiness` (`routes/executive-brain.ts`) — both resolve `userId` via `requireAuthActive` and then call `getProject(userId, projectId)`, which enforces ownership before returning any data, consistent with the ownership-gating pattern established for Business Coordination in Chapter 1 (§3.4.10).

**Existing extension points and debt.** The Validation Engine's rule registry (`ALL_VALIDATION_RULES` in `rules/index.ts`) is already a clean, additive extension point — new rules are added to the array without touching the runner. Several functions (e.g. `countConnectedCredentials`, `listMilestones`) are exported from their modules but not consumed anywhere outside the Planning Engine itself, a similar "unused seam" pattern to the Executive Brain's own `updateTaskStatus` (Chapter 1 §3.1). The 220-character milestone-generation threshold mirrors the Executive Brain's own 220-character task-decomposition threshold (Chapter 1 §3.1) — likely not a coincidence, but not confirmed as an intentionally shared constant either.

### 3.2 Planning Engine Mission

The Planning Engine's long-term mission within the AI Business Operating System is to be the **judgment layer between intent and action** — the place where a goal the Executive Brain has resolved is turned into a plan that is actually safe, sequenced, and sized correctly to execute. Where the Executive Brain answers "what project, goal, and task does this belong to," the Planning Engine answers "in what order, at what risk, and under what conditions should this actually happen." As the platform grows toward longer-running, more autonomous, multi-step project execution, the Planning Engine is the layer responsible for making sure that autonomy is exercised responsibly — catching missing prerequisites, sequencing dependent work correctly, and surfacing risk before it becomes a costly mistake, rather than after. This mission is deliberately larger than today's implementation; §3.4 binds every capability the mission implies, both already built and still latent, to an explicit contract.

### 3.3 Core Responsibilities

- **Milestone structuring** — group a goal's work into coherent phases so a large objective doesn't read as an undifferentiated task list.
- **Prioritization and sequencing** — determine the order in which tasks should be attempted, accounting for dependency structure and estimated complexity.
- **Readiness gating** — never let a task be selected for execution before its dependencies and required resources are actually in place.
- **Pre-execution validation** — coordinate with the Validation Engine to catch missing credentials, unsupported integrations, and approval-requiring actions before execution is attempted.
- **Risk-aware decisioning** — produce a proceed/hold/escalate judgment for significant tasks, grounded in both deterministic and AI-assisted risk signals.
- **Outcome adaptation** — respond to real execution outcomes (success or failure) by updating plan state, notifying the user when warranted, and capturing a lesson for the future.
- **Auditability** — leave a durable, inspectable record of every planning decision made, not just its outcome.
- **User and project scoping** — ensure every plan, decision, and audit record is correctly isolated to its owning user and project.

Each responsibility above decomposes into one or more of the thirteen capabilities bound to contracts in §3.4.

### 3.4 Core Capability Contracts

Every capability implied by the mission (§3.2) is bound below to an explicit **Capability Contract**, using the field set and maturity scale fixed in Chapter 1 (§3.4) — reproduced there in full; see that chapter for the canonical L0–L5 definitions, not redefined here.

---

#### 3.4.1 Milestone Planning — Capability Contract
**Current Maturity:** L3 · **Target Maturity:** L3 (mature; growth is in assignment quality, not the AI step)

- **Purpose:** Break a large goal into coherent phases so work reads as a structured plan rather than a flat task list.
- **Authority:** Authorized to generate and persist milestone (`ash_milestones`) rows for the active goal via AI, and to assign tasks to milestones. Not authorized to alter task content, ownership, or the goal itself.
- **Responsibilities:** Detect goals large enough to warrant phasing; generate milestone structure via `planMilestonesForGoal`; assign tasks to milestones via `assignTasksToMilestones`.
- **What This Capability Will Never Do:** Never invent a milestone unconnected to the resolved goal's actual content; never assign a task to a milestone outside the task's own project; never block the rest of the planning pass if milestone generation fails.
- **Inputs:** The resolved goal's description, the current task list.
- **Outputs:** `ash_milestones` rows; a milestone assignment per new task.
- **Dependencies:** `lib/openrouter` (`MODELS.utility`), Goal Management (Chapter 1, §3.4.2 — runs after goal resolution).
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** A 220-character threshold on the goal description gates whether milestone generation runs at all; assignment uses round-robin, not content-based matching — explicitly documented as a cheap heuristic for this development phase.
- **Success Criteria / KPIs:** Milestone-generation AI-call failure rate; round-robin assignment accuracy vs. a human's intended grouping (currently unmeasured).
- **Failure Modes:** `planMilestonesForGoal` failure falls back to an empty milestone list, silently leaving all tasks unphased; round-robin assignment can group unrelated tasks into the same phase.
- **Fallback Strategy:** On AI-call failure, fall back to an empty array (no milestones) rather than blocking the plan — consistent with the chapter-wide fail-open posture.
- **Security Requirements:** Milestone generation and assignment must remain scoped to the resolved project's own tasks; no cross-project milestone assignment may occur.
- **Extension Rules:** Round-robin assignment may be upgraded to content-based/AI-assisted matching as an additive extension, provided round-robin remains available as a fallback beneath it, per Upgrade Before Replace; the 220-character threshold may only be changed in lockstep with a documented decision (see §3.9 item 4), not adjusted incidentally.

#### 3.4.2 Task Prioritization & Sequencing — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L3/L4

- **Purpose:** Determine the order tasks should be attempted in, so dependency structure and complexity — not arrival order — drive execution sequencing.
- **Authority:** Authorized to compute and persist `priorityScore`, `complexityScore`, `dependencyScore`, `estimatedDurationMinutes`, and `executionOrder` on `ash_tasks` rows within the current project. Not authorized to reorder tasks across projects or to override a task's assigned execution engine (Executive Brain's Delegation capability, Chapter 1 §3.4.6).
- **Responsibilities:** Score every task in the project on complexity and dependency weight; derive a single `executionOrder`.
- **What This Capability Will Never Do:** Never change which engine a task is delegated to; never produce an execution order that schedules a task ahead of an unresolved hard dependency; never persist a score without a deterministic, inspectable basis.
- **Inputs:** The project's task list, including each task's declared dependencies.
- **Outputs:** Updated scoring fields on `ash_tasks`, consumed by Readiness Classification (§3.4.3).
- **Dependencies:** `ash_tasks` schema; runs after Milestone Planning and Validation Coordination in the fixed sequence.
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Purely deterministic heuristic scoring — no model call is made at this step today.
- **Success Criteria / KPIs:** Correlation between computed priority and actual completion order chosen by users when given the choice (currently unmeasured).
- **Failure Modes:** A heuristic-only score can misjudge true complexity for tasks whose difficulty isn't well captured by dependency count or text length alone.
- **Fallback Strategy:** Not applicable — this step has no external call to fail; a scoring bug would need to be caught by validation/testing rather than a runtime fallback.
- **Security Requirements:** Scoring must only read/write tasks within the resolved project; no cross-project scoring inputs may be considered.
- **Extension Rules:** An AI-assisted or outcome-informed (L4) scoring model may be added as an additive layer above the existing deterministic heuristic, which must remain available as a fallback beneath it.

#### 3.4.3 Dependency & Readiness Management — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L2/L3 (mature; growth is in trigger latency, not the classification logic)

- **Purpose:** Guarantee that only genuinely executable work is ever offered up as "the next task," so execution never starts on something that isn't actually ready.
- **Authority:** Authorized to classify every task's readiness state and to select the single next task to work on. Not authorized to mark a task complete or failed itself — that is Task Outcome Adaptation's responsibility (§3.4.6), and ultimately Execution Coordination's (Chapter 1 §3.4.13) once execution genuinely occurs.
- **Responsibilities:** Classify each task as `ready`, `waiting`, `blocked`, `in_progress`, or terminal; select the next task via `pickNextReadyTask`, respecting `executionOrder`.
- **What This Capability Will Never Do:** Never select a task as "next" while its dependencies are unresolved; never leave a task in a stale readiness state indefinitely once the condition that produced it has changed (subject to §3.9 item 3's latency question).
- **Inputs:** Task dependency graph, `executionOrder` from Prioritization (§3.4.2), Validation Coordination's blocked-status output (§3.4.4).
- **Outputs:** A readiness classification per task; a single selected `nextTask`.
- **Dependencies:** Prioritization (§3.4.2), Validation Coordination (§3.4.4).
- **Events Published:** None.
- **Events Consumed:** None today (target: could consume a `task.completed` event to trigger `unlockDependentTasks` immediately rather than waiting for the next planning pass — see §3.9 item 3).
- **Decision Logic:** Deterministic graph classification — a task is `waiting` if any dependency is unresolved, `blocked` if the Validation Engine flagged a missing resource, otherwise `ready`/`in_progress`/terminal based on its own status field.
- **Success Criteria / KPIs:** Time between a dependency resolving and its dependents becoming selectable (currently bounded by "next planning pass," not measured precisely).
- **Failure Modes:** A dependency graph with a cycle or a dangling reference could leave a task perpetually `waiting`; this failure mode is not explicitly named as handled in the current implementation and is worth confirming during Review.
- **Fallback Strategy:** Not applicable — this is a pure read-time classification with no external call to fail.
- **Security Requirements:** Classification must only consider dependencies within the same project; no cross-project dependency resolution may occur.
- **Extension Rules:** `unlockDependentTasks` (already named in the current implementation) is the sanctioned seam for moving from pass-boundary re-evaluation to event-driven, immediate re-evaluation, without changing the classification logic itself.

#### 3.4.4 Validation Coordination — Capability Contract
**Current Maturity:** L2 (coordination layer; underlying rules vary in sophistication — see Chapter 1.3) · **Target Maturity:** L2 (mature; this capability is intentionally thin by design)

- **Purpose:** Ensure no task proceeds to execution with a missing credential, unsupported integration, or unresolved approval requirement, without the Planning Engine reimplementing that judgment itself.
- **Authority:** Authorized to invoke the Validation Engine (Chapter 1.3) against new and previously-blocked tasks, and to persist the resulting `status`/`blockedReason` onto `ash_tasks`. Not authorized to define, modify, or bypass validation rules — that ownership belongs entirely to the Validation Engine chapter.
- **Responsibilities:** Call `validateProjectTasks` at the correct point in the planning sequence; persist blocking outcomes; re-run validation for previously-blocked tasks on each pass.
- **What This Capability Will Never Do:** Never bypass the Validation Engine for a task class without an approved, documented exception; never unblock a task without a genuine re-validation pass; never duplicate the Validation Engine's own rule logic inside this module.
- **Inputs:** New and previously-blocked tasks in the current project.
- **Outputs:** `status="blocked"`/`blockedReason` persisted on `ash_tasks`, consumed by Readiness Classification (§3.4.3).
- **Dependencies:** `validation-engine/` (Chapter 1.3), `lib/connectors/registry.ts`, `lib/approvals.ts` — all owned by the Validation Engine chapter, not this one.
- **Events Published:** None directly (any approval-creation event belongs to the Validation Engine chapter).
- **Events Consumed:** None.
- **Decision Logic:** None of its own — this capability is a thin, deliberate pass-through to the Validation Engine's rule registry; the rules themselves (credential, integration, approval, API/tool/file requirement checks) are documented in Chapter 1.3, not restated here.
- **Success Criteria / KPIs:** Re-validation latency (how many planning passes a resolved blocker takes to clear); false-block rate.
- **Failure Modes:** If the Validation Engine call itself fails, the task's prior blocked state may persist inaccurately until the next successful pass.
- **Fallback Strategy:** A Validation Engine call failure should degrade to leaving the task's existing status unchanged rather than either falsely clearing or falsely blocking it — confirm this is the actual current behavior during Review (not independently verified in this drafting pass).
- **Security Requirements:** Validation must remain scoped to the resolved project's own tasks and the requesting user's own credentials/connectors.
- **Extension Rules:** New validation concerns are added to the Validation Engine's own rule registry (`ALL_VALIDATION_RULES`), never to this coordination layer directly.

#### 3.4.5 Execution Decision Evaluation — Capability Contract
**Current Maturity:** L3 · **Target Maturity:** L3/L4

- **Purpose:** Give significant tasks a final, AI-assisted sanity check on goal alignment, confidence, and risk immediately before they would be handed to execution.
- **Authority:** Authorized to produce a `proceed`/`hold`/`escalate` recommendation for the selected next task and record it to `ash_plan_decisions`. Not authorized to itself gate or unblock a task — that enforcement authority belongs to Validation Coordination (§3.4.4); a `hold`/`escalate` outcome here is advisory context for the orchestrator, not a database-enforced block.
- **Responsibilities:** Run `evaluateExecutionDecision` for "major" tasks; score goal alignment, confidence, and risk; write the decision and its reasoning to the audit log.
- **What This Capability Will Never Do:** Never let a hold/escalate recommendation go unrecorded in `ash_plan_decisions`; never present a fabricated goal-alignment or confidence score not derived from an actual model call or its documented fallback; never treat its own "proceed" as equivalent to the Validation Engine's approval — the two are independent signals.
- **Inputs:** The selected next task, its `blockedReason` if any, the resolved goal.
- **Outputs:** A `decision` value (`proceed`/`hold`/`escalate`), folded into the `contextNote`; an `ash_plan_decisions` row.
- **Dependencies:** `lib/openrouter` (`MODELS.utility`), Readiness Classification (§3.4.3, must run after next-task selection).
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** An AI call (`deriveDecision`) scores goal alignment, confidence, and risk for "major" tasks; smaller/routine tasks are fast-pathed to "proceed" without a model call, but still logged.
- **Success Criteria / KPIs:** Decision-AI-call failure rate; agreement rate between this capability's risk assessment and the Validation Engine's independent `detectRisks` signal (currently unmeasured, and the two are not reconciled today — see §3.10).
- **Failure Modes:** AI-call failure; the "major task" significance threshold could mis-classify a genuinely risky small-looking task as routine, skipping the AI-scored review path entirely.
- **Fallback Strategy:** On AI-call failure, fall back to a `proceed` decision with a low-risk designation — a documented, deliberate default, not a silent gap, but one that trades safety for availability and is worth confirming as the right default during Review.
- **Security Requirements:** None additional beyond the resolved project/task scoping already enforced upstream.
- **Extension Rules:** This capability's risk assessment may be reconciled with the Validation Engine's `detectRisks` output as an additive integration (see Risk Aggregation Coordination, §3.4.10) without either module absorbing the other's logic, per Upgrade Before Replace.

#### 3.4.6 Task Outcome Adaptation — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L3

- **Purpose:** Turn a real execution outcome — success or failure — into updated plan state, an informed user, and a durable lesson, rather than a plan that silently goes stale.
- **Authority:** Authorized to reclassify a task's state on completion/failure, trigger a user notification for escalation-worthy failures, and write a lesson-learned memory entry. Not authorized to retry or re-execute a task itself — a currently-latent capability that belongs to Executive Brain's Recovery Coordination (Chapter 1 §3.4.14) once it exists.
- **Responsibilities:** Handle `handleTaskFailure`/`handleTaskCompletion` calls from the outcome-reporting route; classify failures; notify the user when warranted; capture a lesson via the Memory Engine.
- **What This Capability Will Never Do:** Never silently drop a failed task without either notifying the user or recording a lesson; never misclassify a failure using context from an unrelated task; never write to the Memory Engine through anything other than its own sanctioned `addProjectMemory` interface.
- **Inputs:** A reported task outcome (success/failure) and its detail, via `PATCH /executive-brain/tasks/:id`.
- **Outputs:** Updated task/rollup state; a user notification (on escalation); a `lesson_learned` memory entry.
- **Dependencies:** `lib/memory-engine/project-memory.ts` (`addProjectMemory`), the notification system (`notifyUser`).
- **Events Published:** None directly at this layer — the resulting `task.completed` event, if applicable, is published by the route (§3.4.9), not this module; this boundary is worth confirming during Architecture Review (§3.9 item 6 area).
- **Events Consumed:** None — outcomes arrive as direct function-call arguments from the reporting route, not via a subscribed event.
- **Decision Logic:** Failure classification is regex-based pattern matching against the failure detail text — deterministic, not AI-assisted, and named as technical debt in §3.1/§3.10.
- **Success Criteria / KPIs:** Failure-classification accuracy vs. a human's judgment of the true failure category; notification precision (escalations that were genuinely worth surfacing).
- **Failure Modes:** Regex-based classification can mis-bucket a novel failure message it has no pattern for, potentially under-notifying a genuinely important failure.
- **Fallback Strategy:** An unclassifiable failure should default to the more conservative option (notify + record) rather than silently proceeding — confirm this is the actual current default during Review.
- **Security Requirements:** Lesson entries and notifications must remain scoped to the task's own project/user; no cross-user lesson capture may occur.
- **Extension Rules:** Regex-based classification may be upgraded to AI-assisted classification as an additive layer, with the regex path retained as a fast, cheap fallback beneath it, per Upgrade Before Replace.

#### 3.4.7 Plan Decision Audit Logging — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L2 (mature; growth is in retention policy, not the logging mechanism)

- **Purpose:** Leave a durable, inspectable trail of every planning decision made, so "why did the plan do that" is always answerable after the fact.
- **Authority:** Authorized to write one `ash_plan_decisions` row per planning pass for the selected next task. Not authorized to omit a decision record or retroactively edit one after it is written.
- **Responsibilities:** Persist `projectId`, `taskId`, `decision`, `goalAlignmentScore`, `confidenceScore`, `riskLevel`, `risks`, `requiredResources`, `selectedPath`, and `reasoning` for every decision, including fast-pathed "proceed" outcomes.
- **What This Capability Will Never Do:** Never skip writing an audit entry for a decision that was actually made; never allow a decision record to be mutated after it is written (verify this is enforced, not merely conventional, during Review — see §3.9 item 6).
- **Inputs:** The output of Execution Decision Evaluation (§3.4.5).
- **Outputs:** `ash_plan_decisions` rows.
- **Dependencies:** Execution Decision Evaluation (§3.4.5).
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Unconditional write on every pass — no filtering or sampling logic exists today.
- **Success Criteria / KPIs:** Row-growth rate over time relative to plan complexity (a proxy for whether retention policy will eventually be needed).
- **Failure Modes:** Because every pass — including fast-path proceeds — writes a row, high-frequency projects could accumulate a large audit volume with no documented retention or archival policy.
- **Fallback Strategy:** Not applicable — this is a direct, synchronous persistence step with no external call to degrade.
- **Security Requirements:** Audit rows must remain scoped and queryable only by the owning project's user, consistent with every other capability in this chapter.
- **Extension Rules:** A retention/archival policy may be added as an additive operational concern without changing what gets logged or its schema; the log's append-only nature must not be weakened by any future extension.

#### 3.4.8 Plan State Exposure (Reporting) — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L2/L3 (mature; growth is in richness of the surfaced data, not the authorization model)

- **Purpose:** Let the user (and the frontend on their behalf) see the actual state of their plan — its milestones and what's ready to work on — directly, not only inferred from chat responses.
- **Authority:** Authorized to serve a project's milestone and readiness state to that project's verified owner via the two GET routes. Not authorized to serve this data to any user other than the verified owner.
- **Responsibilities:** Serve `GET /executive-brain/projects/:id/milestones` and `GET /executive-brain/projects/:id/readiness`, after verifying ownership.
- **What This Capability Will Never Do:** Never return milestone/readiness data before the `getProject(userId, projectId)` ownership check succeeds; never accept a client-supplied project ID as authorization on its own.
- **Inputs:** `userId` (from `requireAuthActive`), `projectId` (route param).
- **Outputs:** Milestone list; readiness classification per task.
- **Dependencies:** Milestone Planning (§3.4.1), Dependency & Readiness Management (§3.4.3), `requireAuthActive` middleware.
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Straightforward authorize-then-read; no business logic beyond the ownership check and a direct read of already-computed state.
- **Success Criteria / KPIs:** Ownership-check rejection rate (a spike could indicate a client bug or probing, mirroring the same signal named for Business Coordination in Chapter 1 §3.4.10).
- **Failure Modes:** A stale readiness/milestone read (i.e., served before the latest planning pass completes) could show the user an outdated plan state; no explicit staleness handling is documented.
- **Fallback Strategy:** On ownership failure, reject the request outright — this is a security boundary and must not degrade gracefully, mirroring Chapter 1's treatment of Business Coordination (§3.4.10, §3.9 item 8).
- **Security Requirements:** The `getProject(userId, projectId)` ownership check is the sole gate protecting this data and must never be weakened, cached across users, or bypassed.
- **Extension Rules:** Additional read endpoints (e.g. decision-audit history) may reuse the same `requireAuthActive` + `getProject(userId, projectId)` pattern rather than introducing a new authorization mechanism.

#### 3.4.9 Event Publishing Coordination — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L2/L3

- **Purpose:** Let other parts of the platform (and, eventually, other Executive Brain capabilities) react to planning-driven state changes without polling this subsystem directly.
- **Authority:** Authorized to publish `task.completed`, `project.completed`, and `project.updated` events through the existing Business Intelligence outbox pattern. Not authorized to introduce a second, parallel event mechanism.
- **Responsibilities:** Call `publishBusinessEvent` at the correct points in the request lifecycle as planning-driven state actually changes.
- **What This Capability Will Never Do:** Never publish an event for a state change that did not actually occur; never bypass the shared outbox pattern for a new event type without an approved extension.
- **Inputs:** Task/project state transitions resulting from a planning pass or an outcome report.
- **Outputs:** `task.completed`, `project.completed`, `project.updated` events on the shared outbox.
- **Dependencies:** The Business Intelligence outbox/event-bus pattern (Master X-RAY §4.1).
- **Events Published:** `task.completed`, `project.completed`, `project.updated`.
- **Events Consumed:** None.
- **Decision Logic:** Direct, deterministic publication tied to specific state-transition points in `routes/executive-brain.ts` — currently the route, not `lib/planning-engine/` itself, calls this (see §3.1, §3.9).
- **Success Criteria / KPIs:** Event-publication reliability (published vs. actual state-change count); consumer lag, once any consumer beyond the outbox itself exists.
- **Failure Modes:** If publication happens in the route rather than the engine, a future refactor of the route could silently drop an event without the Planning Engine itself noticing — a coupling risk worth resolving during Review.
- **Fallback Strategy:** Not documented; a publish failure's handling (retry, drop, or fail the request) should be confirmed during Review.
- **Security Requirements:** Events must carry only the originating user's/project's own data; no cross-tenant event content may be published.
- **Extension Rules:** New event types must reuse the existing outbox pattern; this capability may be relocated from the route into `lib/planning-engine/` itself as a clarity improvement without changing the event contract, pending Review sign-off.

#### 3.4.10 Risk Aggregation Coordination — Capability Contract (target capability)
**Current Maturity:** L0 (two independent, unreconciled risk signals exist; no aggregate) · **Target Maturity:** L3

- **Purpose:** Give the user (and the Executive Brain's own latent Risk Coordination, Chapter 1 §3.4.11) one coherent view of a project's risk, rather than two separate, potentially disagreeing signals.
- **Authority (target):** Authorized only to read and roll up risk signals already produced by the Validation Engine's `risk-detector.ts` and the Decision Engine's per-decision AI-derived risk assessments into a single project-level view. Never authorized to compute risk via a third, independent methodology.
- **Responsibilities (target):** Reconcile the two existing risk signals (§3.1) into one aggregate; surface it to Plan State Exposure (§3.4.8) and, eventually, Executive Brain's Risk Coordination (Chapter 1 §3.4.11).
- **What This Capability Will Never Do:** Never compute an independent, third risk-scoring mechanism alongside the two that already exist; never suppress a high-risk finding from either underlying source when rolling it up.
- **Inputs (target):** Validation Engine `detectRisks` output; Decision Engine per-decision risk assessments.
- **Outputs (target):** A project-level risk profile, exposed via Plan State Exposure and consumable by Chapter 1's Risk Coordination.
- **Dependencies (target):** `validation-engine/risk-detector.ts`, `decision-engine.ts`.
- **Events Published (target):** A candidate `project.risk_profile_updated` event.
- **Events Consumed (target):** Risk signals from the two existing sources — not modeled as discrete events today; would need a defined contract.
- **Decision Logic:** Not designed; whether to take the maximum, a weighted combination, or a most-recent-wins approach across the two existing signals is an open question (§3.9), not decided here.
- **Success Criteria / KPIs (proposed):** Reduction in disagreement rate between the two underlying signals once surfaced together; user-reported usefulness of a single risk view.
- **Failure Modes:** Without this, a user (or Chapter 1's future Risk Coordination) has no single place to look and could reasonably trust whichever signal they happen to see, missing the other.
- **Fallback Strategy (target):** If either underlying signal is unavailable, surface the one that is, clearly labeled, rather than blocking or fabricating an aggregate.
- **Security Requirements:** None beyond what the two underlying sources already enforce.
- **Extension Rules:** This capability is itself the extension point — a pure read-and-reconcile layer over two already-existing, already-authorized signals; it may never replace either underlying detector.

#### 3.4.11 Plan Learning Coordination — Capability Contract (partial capability)
**Current Maturity:** L1 (write side implemented; read side absent) · **Target Maturity:** L4

- **Purpose:** Let every future plan benefit from what was actually learned from past task failures and escalations, not just record that learning for its own sake.
- **Authority:** Authorized (today) to write lesson-learned entries via the Memory Engine's `addProjectMemory` on task failure/escalation. Authorized (target) to read prior lessons and `ash_plan_decisions` history back into Prioritization (§3.4.2) and Execution Decision Evaluation (§3.4.5). Not authorized to bypass the Memory Engine's own interfaces for either.
- **Responsibilities:** Capture a lesson on every qualifying failure/escalation (implemented, via Task Outcome Adaptation, §3.4.6); (target) consult accumulated lessons and past decisions during prioritization and decision scoring.
- **What This Capability Will Never Do:** Never let a read-side lesson-consultation failure block plan generation; never write or expose a lesson containing another user's or project's data.
- **Inputs:** Task outcome detail (write side, via §3.4.6); (target) prior `ash_plan_decisions` and project-memory lesson entries (read side).
- **Outputs:** Project-memory `lesson_learned` entries (write side); (target) lesson-informed scoring/decision inputs (read side).
- **Dependencies:** `lib/memory-engine/project-memory.ts`; (target) `ash_plan_decisions`.
- **Events Published:** None (memory capture is a direct write, not an event).
- **Events Consumed (target):** None directly — would query project memory/lessons on demand rather than subscribe to an event.
- **Decision Logic:** Write side is unconditional on qualifying outcomes; read-side consultation logic does not exist and is not designed here.
- **Success Criteria / KPIs (proposed):** Fraction of prioritization/decision outcomes that would have changed had lesson history been consulted (measurable retrospectively even before the read side is built).
- **Failure Modes:** Without the read side, the same class of failure can recur across multiple projects with no mechanism for the Planning Engine to have "seen this before."
- **Fallback Strategy:** Write side already degrades gracefully via the shared Memory Engine contract (Chapter 1 §3.4.9); a future read side must follow the same pattern — omit lesson context rather than block scoring if the lookup fails.
- **Security Requirements:** Any read-side consultation must remain scoped per project/user, consistent with the write side's existing scoping.
- **Extension Rules:** The read side should consult the Memory Engine's existing project-memory interface first (the same store already written to), per Upgrade Before Replace, before considering a separate consultation of the ASH Self-Improving Brain's `ash_lessons` table (Chapter 1.4) — this precedence is an open question, not decided here (see §3.9 item 5).

#### 3.4.12 Escalation-to-Approval Coordination — Capability Contract (target capability)
**Current Maturity:** L1 (an escalation signal exists but is advisory-only, not structural) · **Target Maturity:** L3

- **Purpose:** Ensure an "escalate" or "hold" judgment from Execution Decision Evaluation is reliably acted on, rather than depending on the AI Orchestrator correctly interpreting injected prose.
- **Authority (target):** Authorized to formally register a `hold`/`escalate` outcome as a structured, auditable escalation — most plausibly by reusing the Validation Engine's existing `approvalRule`/`pending_approvals` mechanism rather than inventing a second one. Never authorized to auto-approve, resolve, or dismiss the escalation itself.
- **Responsibilities (target):** Convert an advisory `hold`/`escalate` decision into a structured record a user can see and act on, distinct from the free-text `contextNote` annotation that exists today.
- **What This Capability Will Never Do:** Never let an escalation depend solely on the AI Orchestrator correctly interpreting free-text guidance embedded in the context note; never resolve an escalation without an explicit user decision; never create a second, parallel approval mechanism alongside the Validation Engine's existing one without an approved justification.
- **Inputs (target):** The `hold`/`escalate` decision and its reasoning from Execution Decision Evaluation (§3.4.5).
- **Outputs (target):** A structured escalation record (most plausibly a `pending_approvals` row), visible via Plan State Exposure (§3.4.8) or a future dedicated surface.
- **Dependencies (target):** The Validation Engine's existing approval mechanism (Chapter 1.3), `lib/approvals.ts`.
- **Events Published (target):** A candidate `plan.escalation_raised` event.
- **Events Consumed:** None.
- **Decision Logic:** Not designed; whether every `hold`/`escalate` should generate a structured record, or only ones above some severity, is an open question (§3.9 item 2), not decided here.
- **Success Criteria / KPIs (proposed):** Rate at which a `hold`/`escalate` decision is actually seen and acted on by the user, before vs. after this capability exists.
- **Failure Modes:** Today, if the AI Orchestrator's response doesn't clearly convey the hold/escalate guidance, the user may never learn the Planning Engine flagged a concern at all.
- **Fallback Strategy:** Not applicable until designed; once built, failure to create the structured record should surface as a logged error, not a silent skip.
- **Security Requirements:** Any structured escalation record must remain scoped to the originating task's project/user, consistent with the Validation Engine's existing `pending_approvals` scoping.
- **Extension Rules:** This capability is itself the extension point, and must reuse the Validation Engine's existing approval infrastructure rather than introduce a parallel one, per Upgrade Before Replace and per §3.9 item 2.

#### 3.4.13 Cross-Project / Cross-Business Plan Coordination — Capability Contract (target capability)
**Current Maturity:** L0 (strictly single-project scoped today) · **Target Maturity:** L3

- **Purpose:** Let planning account for the fact that a user's projects compete for the same finite attention and resources, rather than treating each project as if it were the user's only one.
- **Authority (target):** Authorized to read (never silently merge or auto-reprioritize) multiple of a single user's own projects when resource contention or portfolio-level sequencing is relevant. Never authorized to plan across a project or business the requesting user does not own, mirroring Business Coordination's ownership gate (Chapter 1 §3.4.10) exactly.
- **Responsibilities (target):** Surface cross-project tradeoffs to the user (e.g. "these two projects both need your attention this week") without unilaterally deciding between them.
- **What This Capability Will Never Do:** Never plan across a business boundary without the same ownership verification Business Coordination already enforces; never silently reprioritize one project's tasks because of another project's state without surfacing that tradeoff to the user first.
- **Inputs (target):** A user's full set of active projects and their current readiness/priority state.
- **Outputs (target):** A cross-project tradeoff surface, not an automatic reordering.
- **Dependencies (target):** Prioritization (§3.4.2) per project; Business Intelligence's existing Business Command Center portfolio view (as prior art to extend, not duplicate — see §3.9 item 7).
- **Events Published:** None.
- **Events Consumed (target):** `project.updated` events (§3.4.9) from sibling projects, reusing the same outbox rather than polling.
- **Decision Logic:** Not designed; whether this belongs in the Planning Engine at all, given the Business Command Center already exists one layer up, is an explicit open question (§3.9 item 7), not decided here.
- **Success Criteria / KPIs (proposed):** User-reported usefulness of surfaced tradeoffs, once built.
- **Failure Modes:** Without this, a user managing several concurrent projects has no system-level visibility into resource contention across them — each project's plan is optimized in isolation.
- **Fallback Strategy:** Not applicable until designed.
- **Security Requirements:** Must reuse Business Coordination's exact ownership-verification gate (Chapter 1 §3.4.10) for every project/business considered — no new authorization path may be introduced.
- **Extension Rules:** This capability is itself the extension point, and is explicitly the capstone capability of this chapter — it should not be built before the Business Command Center's own portfolio-level architecture (a separate chapter) has matured enough to define the handoff contract.

### 3.5 Inputs (Engine-level aggregate)

*The per-capability Inputs above are the authoritative detail; this section is the aggregate view across the whole subsystem.*

- **From the Executive Brain (Chapter 1):** the resolved `project`, `goal`, and `tasks` for the current request, plus `userId` and `isNewProject`.
- **Persisted state read at planning time:** `ash_tasks` (dependencies, current status), `ash_milestones` (existing phases), `ash_plan_decisions` (for adaptation/audit context).
- **Validation Engine output (Chapter 1.3):** blocked-status and `blockedReason` per task, and any `pending_approvals` already created for the project.
- **Outcome reports:** task success/failure detail arriving via `PATCH /executive-brain/tasks/:id`, originating from the four execution engines the Executive Brain delegates to (Chapter 1 §3.4.6).
- **AI-derived inputs:** outputs of `planMilestonesForGoal` and `deriveDecision`, both OpenRouter completions consumed as input to the step that follows them.

### 3.6 Outputs (Engine-level aggregate)

*The per-capability Outputs above are the authoritative detail; this section is the aggregate view across the whole subsystem.*

- **`planningContextNote`** — appended alongside the Executive Brain's `brainContextNote` into the message forwarded to the AI Orchestrator.
- **Persisted state writes:** `ash_milestones` (new phases), `ash_tasks` (scoring fields, blocked status, milestone assignment), `ash_plan_decisions` (one row per planning pass).
- **Direct API responses:** milestone and readiness data served via the two `GET` routes (§3.4.8).
- **Outbox events:** `task.completed`, `project.completed`, `project.updated` (§3.4.9).
- **Side effects on outcome reports:** user notifications for escalation-worthy failures; `lesson_learned` memory entries (§3.4.6, §3.4.11).

### 3.7 Integration Map

| Subsystem | Direction | Nature of the integration |
|---|---|---|
| Executive Brain (Chapter 1) | Executive Brain → Planning Engine | In-process call to `runPlanningEngine` immediately after `runExecutiveBrain`; consumes the resolved project/goal/tasks; its `contextNote` is appended alongside the Executive Brain's own note. |
| Validation Engine (Chapter 1.3) | Planning Engine → Validation Engine | `validateProjectTasks` calls into the Validation Engine's rule registry; the Planning Engine treats this entirely as an integration point and owns none of the rule logic itself. |
| AI Orchestrator | Planning Engine → Orchestrator (indirect) | The `planningContextNote` reaches the Orchestrator only via the same forwarded message the Executive Brain constructs — the Planning Engine has no direct call site of its own. |
| Memory Engine (Chapter 1.4/1.5) | Planning Engine → Memory Engine | `addProjectMemory`, called from `adaptation.ts` on task failure/escalation, writing `lesson_learned` entries through the Memory Engine's own sanctioned interface. |
| Business Intelligence outbox | Planning Engine (via route) → Outbox | `publishBusinessEvent` calls in `routes/executive-brain.ts` emit `task.completed`/`project.completed`/`project.updated`, reusing Business Intelligence's existing event-bus pattern rather than a bespoke one. |
| `lib/connectors/registry.ts`, `lib/approvals.ts` | Consumed indirectly, via Validation Engine | Not called directly by the Planning Engine; reached only through the Validation Engine's own rule implementations (credential and approval rules). |
| ASH Self-Improving Brain (Chapter 1.4) | Not integrated today | No call site found from `lib/planning-engine/` into `AshBrain`/`ash_lessons`; Plan Learning Coordination's target read side (§3.4.11) would be the first such integration. |
| Runtime Job Worker | Not integrated today | The Planning Engine operates on the same synchronous request path as the Executive Brain; outcome reporting arrives via a separate `PATCH` call from whatever reported the outcome, not via the asynchronous job queue directly. |
| Business Command Center | Not integrated today | No cross-project or portfolio-level read found; Cross-Project/Cross-Business Plan Coordination (§3.4.13) is the named future integration point, contingent on that chapter's own maturity. |

### 3.8 Future Growth

The following extension points would allow the Planning Engine to grow toward the mission in §3.2 without redesigning its current five-step core sequence, consistent with the Upgrade Before Replace law. This list is superseded in detail by each capability contract's own Extension Rules field in §3.4; it is retained here as a single cross-cutting summary.

- **Risk Aggregation** (§3.4.10): a pure read-and-reconcile layer over the two already-existing risk signals (Validation Engine's `detectRisks`, Decision Engine's AI-derived risk) — no new detection logic required.
- **Structured escalation** (§3.4.12): reuse the Validation Engine's existing `approvalRule`/`pending_approvals` mechanism rather than building a parallel one.
- **Event-driven readiness** (§3.4.3): `unlockDependentTasks` is already named in the codebase as the seam for moving from pass-boundary to event-driven dependency resolution.
- **Plan Learning read side** (§3.4.11): the Memory Engine's existing project-memory store, already written to by this subsystem, is the natural first read-side integration before considering the separate ASH Self-Improving Brain lesson store.
- **Cross-project coordination** (§3.4.13): should extend the Business Command Center's future portfolio view rather than build an independent one — explicitly sequenced last, pending that chapter's own maturity.
- **Milestone assignment quality** (§3.4.1): round-robin assignment is a named, deliberate placeholder — a natural, low-risk upgrade path to content-based or AI-assisted assignment exists without touching milestone generation itself.

### 3.9 Open Architecture Questions

The following require review and a decision before any related implementation work proceeds — they are flagged here, not resolved:

1. Should Risk Aggregation Coordination (§3.4.10) become a first-class Planning Engine capability that also feeds the Executive Brain's own latent Risk Coordination (Chapter 1 §3.4.11), or should project-level risk aggregation live entirely inside the Validation Engine chapter instead, with the Planning Engine only ever consuming its output?
2. Should the Decision Engine's `hold`/`escalate` outcome (§3.4.5) be upgraded into a structured, auditable escalation (§3.4.12), or is the Validation Engine's existing `approvalRule` (which already creates `pending_approvals`) sufficient on its own, making a second escalation mechanism unnecessary duplication?
3. `dependency-manager.ts`'s readiness classification currently only re-evaluates on the next planning pass. Should `handleTaskCompletion` (§3.4.6) actively call `unlockDependentTasks` synchronously, or is "re-check on next pass" latency acceptable by design given the platform's current usage patterns?
4. The 220-character milestone-generation threshold (§3.4.1) mirrors the Executive Brain's own 220-character task-decomposition threshold (Chapter 1 §3.1). Is this intentional or coincidental, and should both eventually be unified into one configurable/learned value shared across chapters?
5. Should Plan Learning Coordination's read side (§3.4.11) consult the Memory Engine's project-memory lesson entries this subsystem already writes, the ASH Self-Improving Brain's separate `ash_lessons` distillation (Chapter 1.4), or both — and in what precedence? This is the same store-boundary question Chapter 1 raised about its own domain (§3.9 item 6 there), one layer down.
6. `ash_plan_decisions` is written on every planning pass, including fast-pathed "proceed" decisions (§3.4.7). Is this the intended audit granularity long-term, or should only AI-scored "major" decisions be persisted individually, with fast-path proceeds logged only in aggregate?
7. Should Cross-Project/Cross-Business Plan Coordination (§3.4.13) exist inside the Planning Engine at all, or is strict single-project scoping a permanent, intentional boundary — given that portfolio-level coordination already exists one layer up in Business Intelligence's Business Command Center?
8. `ash_milestones`, `ash_plan_decisions`, and this subsystem's other tables remain outside the Business Intelligence Governance/Data Access Layer (Master X-RAY §1.8, Phase A) — the same open question Chapter 1 raised about its own `ash_*` tables (§3.9 item 7 there). Should this chapter's data be brought under an equivalent ownership/audit contract, and does that belong here or in a Volume 6 governance chapter?
9. `adaptation.ts`'s failure classification is regex-based (named technical debt, §3.1/§3.4.6/§3.10). Is upgrading this to AI-assisted classification a Planning Engine concern, or does it belong to whichever execution engine actually produces the failure detail in the first place, closer to the source?
10. Several Planning Engine functions (e.g. `countConnectedCredentials`, `listMilestones`) are exported but unused outside the module. Are these intentional public seams reserved for a future dedicated planning API, or dead exports that should be pruned during a future Optimization pass?

### 3.10 Architecture Summary

*This section closes out the Architecture stage of this chapter's lifecycle. It consolidates the chapter's own findings; it does not introduce new architecture beyond what §3.1–3.9 already establish.*

**Current maturity assessment.** Of the thirteen capabilities bound to contracts in §3.4, seven are implemented today at L2 or L3 (Milestone Planning, Task Prioritization & Sequencing, Dependency & Readiness Management, Validation Coordination, Execution Decision Evaluation, Task Outcome Adaptation, Plan Decision Audit Logging, Plan State Exposure, Event Publishing Coordination — nine, on recount), one is a partial capability with only its write side implemented (Plan Learning Coordination, L1), and three are entirely latent (Risk Aggregation, Escalation-to-Approval, and Cross-Project/Cross-Business Coordination, all L0). None has yet reached L4 or L5. In short: the Planning Engine today reliably turns a resolved goal into an ordered, dependency-safe, individually-risk-checked plan; the mission in §3.2 additionally requires it to present risk as one coherent signal, make escalation structurally reliable rather than advisory, and eventually reason across a user's full project portfolio — none of which exists yet.

| Maturity band | Capabilities |
|---|---|
| L3 (AI-assisted, implemented) | Milestone Planning, Execution Decision Evaluation |
| L2 (deterministic, implemented) | Task Prioritization & Sequencing, Dependency & Readiness Management, Validation Coordination, Task Outcome Adaptation, Plan Decision Audit Logging, Plan State Exposure, Event Publishing Coordination |
| L1 (partial / implicit) | Plan Learning Coordination |
| L0 (absent) | Risk Aggregation Coordination, Escalation-to-Approval Coordination, Cross-Project/Cross-Business Plan Coordination |

**Technical debt.** Surfaced during this chapter's own analysis, consistent with (and extending) the Master X-RAY's treatment of this subsystem:
- Two independent, unreconciled risk-assessment mechanisms (Validation Engine's regex-based `detectRisks`, Decision Engine's LLM-derived risk) can disagree with no aggregation layer to reconcile them (§3.1, §3.4.10).
- `adaptation.ts`'s failure classification is regex-based with no AI-assisted fallback path, unlike most other judgment points in this chapter (§3.4.6).
- The 220-character milestone-generation threshold duplicates the Executive Brain's own 220-character decomposition threshold without a confirmed shared origin (§3.9 item 4).
- Several exported functions (`countConnectedCredentials`, `listMilestones`) are unused outside the module — an unconfirmed seam vs. dead code (§3.9 item 10).
- `ash_plan_decisions` grows unconditionally with every planning pass, with no documented retention policy (§3.4.7).
- `ash_milestones`, `ash_plan_decisions`, and this subsystem's other tables sit outside the Business Intelligence Governance/Data Access Layer (Phase A), the same gap already named for the Executive Brain's own tables (§3.9 item 8).
- Event publication (`publishBusinessEvent`) currently lives in the route layer rather than inside `lib/planning-engine/` itself, a coupling that could silently break on an unrelated route refactor (§3.4.9).

**Deferred architectural decisions.** All ten items in §3.9 are formally deferred pending the project owner's review; none has been decided in this chapter. Items #1 and #2 carry the most leverage, since both Risk Aggregation and Escalation-to-Approval Coordination are pure read/reconciliation layers over signals and mechanisms that already exist — resolving how they should be wired is largely a sequencing and ownership decision, not a new-technology decision.

**Risks.**
- **Escalation reliability gap**: today, a `hold`/`escalate` decision (§3.4.5) is communicated only as prose injected into the AI Orchestrator's context — if the model fails to convey it clearly, the user may never learn the Planning Engine flagged a concern at all.
- **Inconsistent risk signals**: the two independent risk-detection paths (§3.1, §3.4.10) could give a user or a future automated consumer contradictory readings of the same task's risk.
- **Unbounded audit growth**: `ash_plan_decisions` (§3.4.7) has no retention policy and grows with every planning pass, including routine fast-path proceeds.
- **Stale readiness windows**: readiness re-evaluation only happens on the next planning pass (§3.4.3), so a resolved dependency may not immediately unlock its dependents.
- **Single-project blindness**: with no portfolio-level view (§3.4.13), a user juggling several active projects has no system-level signal about resource contention between them.

**Future roadmap** *(sequencing only; no phase is authorized by this chapter)*:
- **Near-term candidate:** build Risk Aggregation Coordination (§3.4.10) as a pure read/reconcile layer over the two existing risk signals — resolves the "inconsistent risk signals" risk above with no new detection logic.
- **Near-term candidate:** resolve §3.9 item 2 and, if warranted, wire Escalation-to-Approval Coordination (§3.4.12) through the Validation Engine's existing `pending_approvals` mechanism — resolves the "escalation reliability gap" risk above.
- **Mid-term candidate:** wire `unlockDependentTasks` for event-driven readiness re-evaluation (§3.4.3, §3.9 item 3).
- **Mid-term candidate:** build Plan Learning Coordination's read side (§3.4.11), consulting the Memory Engine's already-written project-memory lessons first.
- **Longer-term candidate:** Cross-Project/Cross-Business Plan Coordination (§3.4.13), explicitly sequenced last and contingent on the Business Command Center's own portfolio-level architecture maturing first.
- **Ongoing, not phase-gated:** retention policy for `ash_plan_decisions`, resolving the unused-export question (§3.9 item 10), and relocating event publication into `lib/planning-engine/` itself can all proceed independently of the above sequencing.

**Chapter approval checklist.** For the project owner's use in deciding whether to move this chapter to the Architecture Review stage:
- [ ] The mission statement (§3.2) is confirmed as an accurate statement of long-term intent for the Planning Engine.
- [ ] All thirteen Capability Contracts (§3.4) have been read, and their Authority/Never-Do boundaries are confirmed correct.
- [ ] The chapter boundary with the Validation Engine (Chapter 1.3) — treating it strictly as an integration point rather than re-documenting its internals — is confirmed correct.
- [ ] The ten Open Architecture Questions (§3.9) each have either a decision or an explicit "defer to a later chapter/cycle" disposition.
- [ ] The two unreconciled risk-detection mechanisms (§3.1, §3.4.10) and the advisory-only escalation mechanism (§3.4.5, §3.4.12) are acknowledged as named risks, with a disposition (fix now, defer, or accept) recorded.
- [ ] The Future Roadmap sequencing (above) is confirmed as a reasonable order, or reordered by the project owner.
- [ ] No implementation, refactor, or code change has occurred as part of this chapter — confirmed.
- [ ] The chapter is approved to proceed to Stage 2 (Architecture Review), or returned with specific requested changes.

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
