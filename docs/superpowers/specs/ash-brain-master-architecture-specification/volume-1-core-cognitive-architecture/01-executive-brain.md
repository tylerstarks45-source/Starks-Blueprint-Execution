# 1.1 — Executive Brain

**Status:** Approved (Architecture Stage) — Locked as the Official Chapter Template
**Volume:** 1 — Core Cognitive Architecture
**Last Updated:** 2026-07-29

**Revision history:**
- **v1:** Architecture description — an accurate inventory of today's implementation.
- **v2:** Evolved into a capability specification — every capability given a full engineering spec (Mission, Purpose, Responsibilities, Inputs, Outputs, Decision Logic, Dependencies, Events, KPIs, Failure Modes, Fallback Behavior, Security Considerations, Extension Points, Future Maturity Level).
- **v3:** Evolved further into binding **Capability Contracts** — each capability now defines its own Authority boundary and explicit "will never do" constraints, splits Events into Published/Consumed, and the chapter closes with a consolidated Architecture Summary (maturity assessment, technical debt, deferred decisions, risks, roadmap, and an approval checklist). The current implementation (§3.1, and the Current Maturity stated in every contract) remains the unmodified baseline throughout — no redesign is proposed anywhere in this revision, and every forward-looking statement is framed as an addition to, not a replacement of, existing architecture, per the Upgrade Before Replace law.
- **Approved (2026-07-29):** v3 approved by the project owner and designated the **official structural and quality template** for every chapter in this specification (see §5). This chapter is now locked against further edits except when a future template-wide change is deliberately applied consistently across all chapters — see `00-INDEX.md`, "Chapter Template."

---

## 1. Purpose & Scope

This chapter is the permanent architecture reference for the Executive Brain — the multi-phase planning layer that sits between an incoming user request and the AI Orchestrator, responsible for resolving what project, goal, and task a request belongs to before any model call happens. It documents the subsystem exactly as it exists today (per the Master X-RAY baseline), defines its long-term mission, and binds every capability implied by that mission — both those implemented today and those the mission requires in the future — to an explicit Capability Contract: what it is authorized to do, what it must never do, and how it will mature. It identifies the extension points, risks, technical debt, and open questions that govern the Executive Brain's growth toward those contracts, without proposing any implementation change today. Per the Upgrade Before Replace law, no replacement of any existing component is proposed anywhere in this chapter; every future-state contract below explicitly reuses or extends an existing seam in the current implementation.

## 2. Baseline Reference

See Master X-RAY §1.2 (Executive Brain) for the summary-level as-built description, and §2.3 for its data-store footprint (`ash_projects`, `ash_goals`, `ash_tasks`, `ash_project_memory` — currently ungoverned, a documented Phase B candidate, not addressed by this chapter). §3.1 below expands that baseline in more detail; it does not revise it.

## 3. Architecture

### 3.1 Current Architecture Summary

*This section documents the Executive Brain exactly as it exists today. It is not redesigned here.*

**Entry point and control flow.** The subsystem's entry function is `runExecutiveBrain(req: ExecutiveBrainRequest)` in `lib/executive-brain/index.ts`, invoked from `routes/executive-brain.ts` at `POST /api/executive-brain/stream`. On each request it runs a fixed five-step sequence:

1. **Resolve Project** — `resolveActiveProject` (in `project-manager.ts`) finds or creates an `AshProject` row.
2. **Resolve Goal** — `resolveGoalForRequest` (in `goal-manager.ts`) maps the request to an `AshGoal`.
3. **Plan Tasks** — `planTasks` (in `task-planner.ts`) decomposes the request into one or more `AshTask` rows.
4. **Update Rollup** — `updateProjectRollup` syncs the project's `currentPhase` and `currentTaskId` from the resulting plan.
5. **Build Context** — assembles the `brainContextNote` (see §3.6, Outputs) for the AI Orchestrator.

Around this core sequence, `routes/executive-brain.ts` additionally invokes the Planning Engine (`runPlanningEngine`), the Business Intelligence context assembler (`assembleBusinessContextPackage`), the Research Engine (`runResearchEngine`, conditionally, when research intent is detected), and the Memory Engine (`retrieveRelevantMemory` / `captureAutoMemory`) — each independently, around the Executive Brain's own five-step sequence.

**Project resolution logic.** `resolveActiveProject` first checks for an explicit `systemInstanceId` pin; if present, it resolves the project already associated with that system instance. Otherwise it looks for the caller's most recent active project. A new project is started when the incoming message matches one of a fixed set of `NEW_PROJECT_KEYWORDS` (e.g. "new business", "start over", "from scratch"). New projects are named via a lightweight AI call, `deriveProjectName`, which falls back to a plain slice of the user's message if the AI call fails.

**Goal resolution logic.** `resolveGoalForRequest` reuses the most recent active goal for an existing project. For a new project, or when no active goal exists, it derives one via `deriveGoal` (an AI extraction call).

**Task planning logic.** `planTasks` uses a length heuristic: messages under `DECOMPOSE_THRESHOLD_CHARS` (220 characters) become a single task; longer messages are passed to `decomposeIntoTasks` (AI-driven), which produces 2–6 ordered tasks. Each task is assigned to a downstream engine — `media_gen`, `browser_agent`, `build_engine`, or `research` — via `guessEngine`, a keyword-based classifier (`ENGINE_KEYWORDS`).

**Fail-open behavior.** The whole subsystem is designed so a failure here never blocks the underlying chat/orchestrator call. `routes/executive-brain.ts` wraps `runExecutiveBrain` and each of the surrounding engine calls (Planning, Research, Memory, Business Intelligence) in independent `try...catch` blocks, so a failure in any one of them degrades that one contribution — logged via `logger.warn` (engine-level) or `logger.error` (forwarding failures) — while the rest proceed and the original request is still forwarded to the orchestrator, unchanged if every enrichment step fails.

**Dependencies and strengths.** The Executive Brain depends on `lib/memory-engine/` (project/business/knowledge memory retrieval and capture), `lib/business-intelligence/` (business context and DNA), `lib/planning-engine/` (milestone and validation), `lib/research-engine/` (conditional), and `lib/openrouter` (AI calls for naming, goal extraction, and task decomposition). Its principal strength is that this project/goal/task resolution runs as a cheap pre-pass, entirely decoupled from — and fail-open with respect to — the expensive orchestrator/tool-execution path, so improving or breaking the Executive Brain never threatens basic chat availability.

**Existing extension points.** `guessEngine`'s keyword table and `NEW_PROJECT_KEYWORDS` are both simple, centralized lookup tables that can absorb new keywords without touching call sites. `task-planner.ts` already exposes an `updateTaskStatus` function to `routes/executive-brain.ts` that is not yet used internally by the Executive Brain itself — a seam already present in the code, noted here as observed fact, not a proposal.

### 3.2 Executive Brain Mission

The Executive Brain's long-term mission within the AI Business Operating System is to be the **single point of continuity** between a user's ongoing work and every stateless reasoning pass the system makes on their behalf. Every other Brain subsystem (Planning, Business Intelligence, Research, Memory) answers a question in isolation; the Executive Brain is what remembers *which* project, *which* goal, and *which* task those answers belong to, so that a user's relationship with the system reads as one continuous collaboration rather than a sequence of disconnected completions. As the platform grows from single-request chat into autonomous, multi-step, multi-day project execution, the Executive Brain is the layer responsible for keeping that execution coherent, resumable, and auditable — the executive function of the system, in the same sense the term is used for human cognition. This mission is deliberately larger than today's implementation; §3.4 binds every capability the mission implies, both those already built and those still latent, to an explicit contract, as a complete engineering roadmap for closing that gap over time.

### 3.3 Core Responsibilities

- **Project continuity** — determine, for every incoming request, which `AshProject` it belongs to (an existing one, or the start of a new one), and maintain that project's lifecycle state.
- **Goal resolution** — determine which `AshGoal` within the active project the request advances, or derive a new one when none fits.
- **Task decomposition** — break a request down into one or more concrete `AshTask` units, sized appropriately to the request, and assign each to the engine responsible for executing it.
- **Project rollup maintenance** — keep the project's `currentPhase` and `currentTaskId` synchronized with the live state of its tasks.
- **Context handoff** — produce a concise, structured summary (the `brainContextNote`) that gives the AI Orchestrator and downstream model call the project/goal/task context it needs, without requiring the orchestrator to understand project/goal/task modeling itself.
- **Non-blocking operation** — guarantee that failures anywhere in this resolution process degrade gracefully rather than blocking the user's underlying request.
- **User and business scoping** — ensure every project, goal, and task resolution is correctly isolated to the requesting user, and to the correct business context when a `systemInstanceId` is present.

Each responsibility above decomposes into one or more of the twenty capabilities bound to contracts in §3.4.

### 3.4 Core Capability Contracts

Every capability implied by the mission (§3.2) is bound below to an explicit **Capability Contract** — whether the capability is fully implemented today, partially implemented, or entirely latent. A contract is stricter than a specification: alongside what a capability does, it states what it is authorized to decide (**Authority**) and what it is bound never to do (**What This Capability Will Never Do**), so that future implementation, review, and audit all have an unambiguous boundary to check against. Each contract also states its **Current Maturity** and **Target Maturity** against the scale below.

**Maturity scale** (used consistently across every contract below):

| Level | Name | Meaning |
|---|---|---|
| **L0** | Absent | No implementation; the responsibility is not currently discharged by any part of the system. |
| **L1** | Implicit | Discharged only as a side effect of another capability's logic, with no dedicated code path of its own. |
| **L2** | Explicit / Deterministic | Has its own dedicated code path, driven by fixed deterministic rules (keyword tables, thresholds); no model call, no learning. |
| **L3** | AI-Assisted | Uses a model call for judgment, with a deterministic fallback when the model call fails or is skipped. |
| **L4** | Adaptive | Incorporates real outcome data (e.g. from the ASH Self-Improving Brain's SQL-distilled lessons) to improve its own future decisions. |
| **L5** | Autonomous / Cross-Scope | Reasons and self-optimizes across multiple goals, projects, or businesses without per-instance human tuning. |

A capability's target maturity is a design intention for future review, not committed work; nothing in §3.4 authorizes implementation on its own.

---

#### 3.4.1 Decision Making — Capability Contract
**Current Maturity:** L2 (embedded, narrow) · **Target Maturity:** L4

- **Purpose:** Serve as the seat of judgment for "what happens next" across every Executive Brain resolution step, so downstream engines execute a coherent, correctly-scoped plan rather than each independently guessing intent.
- **Authority:** Authorized to make the continue-vs-new binary decision for project and goal continuity, autonomously and without human confirmation. Not authorized to make any decision affecting execution, spend, external side effects, or cross-tenant data access.
- **Responsibilities:** Decide whether an incoming request continues existing project/goal state or starts new state; provide one point of judgment so Project/Goal/Task Coordination don't each reimplement it independently.
- **What This Capability Will Never Do:** Never decide to execute, delegate, or approve a task; never override an explicit user instruction to start fresh or continue; never make a decision that requires business-ownership verification (that authority belongs solely to Business Coordination, §3.4.10).
- **Inputs:** Incoming message text, `systemInstanceId`, most-recent-active project/goal rows.
- **Outputs:** A continue/start-new boolean per project and per goal, consumed by Project and Goal Coordination.
- **Dependencies:** `project-manager.ts`, `goal-manager.ts`.
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Deterministic keyword match against `NEW_PROJECT_KEYWORDS` for project continuation; goal continuation defaults to "reuse most recent active goal" unless none exists. No weighting, scoring, or model call is used for either decision today.
- **Success Criteria / KPIs:** False-new-project rate (existing work incorrectly treated as new); false-continuation rate (new intent incorrectly folded into an old project). Both currently unmeasured.
- **Failure Modes:** A keyword match can mis-fire on a message that merely mentions a keyword figuratively, forking an unwanted new project.
- **Fallback Strategy:** None required at this level — the decision itself is fallback-free; if the surrounding request fails, this decision is simply not reached (fail-open at a higher level).
- **Security Requirements:** Inputs must remain scoped to the requesting `userId`/`systemInstanceId` at all times; no cross-user data may be consulted.
- **Extension Rules:** Replacing the flat keyword match with a scored/AI-assisted classifier is permitted as an additive extension only — the keyword match must remain available as a fast-path/fallback beneath any future model-assisted classifier, per Upgrade Before Replace.

#### 3.4.2 Goal Management — Capability Contract
**Current Maturity:** L3 · **Target Maturity:** L4

- **Purpose:** Keep every unit of planned work traceable to a single, coherent objective, so a project's task list always answers "in service of what."
- **Authority:** Authorized to create and update `ash_goals` rows and to invoke `deriveGoal`. Not authorized to modify project or task state directly.
- **Responsibilities:** Resolve the goal a request advances; derive new goals via AI extraction when none exists or a new project has started; maintain `ash_goals` as the durable record.
- **What This Capability Will Never Do:** Never fabricate a goal that contradicts the resolved project's stated purpose; never silently discard an existing active goal without a resolution decision from Decision Making (§3.4.1); never write goal data outside the requesting user's own scope.
- **Inputs:** Project resolution result (§3.4.4), incoming message, most-recent-active goal row.
- **Outputs:** A resolved/created `AshGoal` row, passed into Task Coordination and into the `brainContextNote`.
- **Dependencies:** `lib/openrouter`, `ash_goals` table, Project Coordination (must run after project resolution).
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Reuse-most-recent-active-goal by default; call `deriveGoal` (an OpenRouter completion) only when no active goal exists for the project. No confidence threshold or multi-candidate ranking is applied today.
- **Success Criteria / KPIs:** Goal-derivation AI-call failure rate; goal churn rate (how often a project's active goal changes within a short window).
- **Failure Modes:** `deriveGoal` can fail or return a low-quality goal statement; a stale "active" goal can be incorrectly reused for a request that has moved on to a different objective.
- **Fallback Strategy:** On `deriveGoal` failure, the goal step degrades per the fail-open contract and the request proceeds without a newly derived goal; the exact fallback value used in that case is an open question (§3.9).
- **Security Requirements:** Goal rows must remain scoped per `userId`/project; no cross-project or cross-user goal data may be read.
- **Extension Rules:** `deriveGoal` is already isolated behind a single function and may be extended with confidence scoring or multi-candidate generation without touching surrounding control flow; it may not be replaced with a different mechanism absent an Upgrade Before Replace justification.

#### 3.4.3 Task Coordination — Capability Contract
**Current Maturity:** L2/L3 · **Target Maturity:** L4

- **Purpose:** Translate a resolved goal into concrete, appropriately-sized, correctly-routed units of executable work.
- **Authority:** Authorized to create and update `ash_tasks` rows and assign an execution engine per task. Not authorized to execute tasks or invoke execution engines directly.
- **Responsibilities:** Decide single-task vs. multi-task decomposition; assign each task to an execution engine; persist tasks to `ash_tasks` for tracking and rollup.
- **What This Capability Will Never Do:** Never execute a task itself; never assign a task to an engine outside the four sanctioned execution engines without an approved extension; never silently drop a task from the plan without recording it.
- **Inputs:** Resolved goal, incoming message, `DECOMPOSE_THRESHOLD_CHARS` (220) and `ENGINE_KEYWORDS` constants.
- **Outputs:** One or more `AshTask` rows with status and assigned engine, folded into the `brainContextNote`.
- **Dependencies:** `lib/openrouter`, Goal Management (must run after goal resolution), the four named downstream execution engines.
- **Events Published:** None today (target: a `task.created` event is a candidate once Execution Coordination, §3.4.13, defines an event contract).
- **Events Consumed:** None.
- **Decision Logic:** Messages under 220 characters become a single task; longer messages go to `decomposeIntoTasks` (AI call) producing 2–6 ordered tasks; each task's engine is chosen by `guessEngine`, a keyword classifier against `ENGINE_KEYWORDS`.
- **Success Criteria / KPIs:** Decomposition granularity accuracy vs. human judgment; engine-assignment accuracy (tasks later manually reassigned or that failed in their assigned engine).
- **Failure Modes:** The 220-character threshold can force an artificially single-task treatment of a compound request just under the cutoff, or an unnecessary split just over it; `guessEngine` can mis-route ambiguous tasks.
- **Fallback Strategy:** `decomposeIntoTasks` failure is caught and degrades to the fail-open contract at the route level; no documented per-task retry or re-classification fallback exists today.
- **Security Requirements:** Tasks must always be created under the resolved project's `userId`; no engine-assignment path may route a task outside the requesting user's own execution context.
- **Extension Rules:** `updateTaskStatus`'s existing-but-unused export (§3.1) is the sanctioned seam for wiring Execution Coordination (§3.4.13) into this capability without new schema; any new execution engine must be added to `ENGINE_KEYWORDS` rather than via a parallel classification mechanism.

#### 3.4.4 Project Coordination — Capability Contract
**Current Maturity:** L2/L3 · **Target Maturity:** L4

- **Purpose:** Maintain one authoritative, continuously-updated container for all work a user is doing toward a given initiative, across arbitrarily many requests over time.
- **Authority:** Authorized to create and update `ash_projects` rows including rollup state. Not authorized to create or resolve a project for a `systemInstanceId` the requesting user does not own.
- **Responsibilities:** Resolve or create the active project for a request; name new projects; keep `currentPhase`/`currentTaskId` synchronized via `updateProjectRollup`.
- **What This Capability Will Never Do:** Never create or resolve a project across a business the requesting user does not own; never overwrite another user's project state; never bypass the `systemInstanceId`-pin authorization check.
- **Inputs:** `systemInstanceId` (pin, if present), most-recent-active project lookup, incoming message (for keyword detection and naming).
- **Outputs:** A resolved/created `AshProject` row; updated rollup fields after each planning pass.
- **Dependencies:** `lib/openrouter` (naming), `ash_projects` table, Decision Making (§3.4.1).
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** `systemInstanceId` pin takes priority; otherwise most-recent-active project is reused unless `NEW_PROJECT_KEYWORDS` matches, in which case a new project is created and named via `deriveProjectName` (falling back to a message slice on AI failure).
- **Success Criteria / KPIs:** Unwanted-new-project rate; project abandonment rate; naming quality (fallback-slice usage rate as a proxy for AI naming reliability).
- **Failure Modes:** `deriveProjectName` failure silently degrades to a message-slice name, which can be low-quality if it recurs often; `systemInstanceId` pinning bypasses the keyword heuristic entirely — correct by design, but means a user inside a pinned system instance has no path to genuinely start fresh today (flagged, not solved, here).
- **Fallback Strategy:** Naming falls back to a message slice on AI failure; project resolution itself has no fallback other than proceeding without a project (fail-open at the route level).
- **Security Requirements:** Resolution must remain scoped to `userId` throughout; `systemInstanceId` pinning requires prior resolution against `businessesTable.ownerId` upstream in `routes/executive-brain.ts`, and this check may never be skipped or weakened.
- **Extension Rules:** `updateProjectRollup` is the sanctioned seam for rollup logic and may be extended with additional signals (e.g. Business Health Scores) without touching resolution logic; resolution logic itself may only be extended, not replaced, absent an Upgrade Before Replace justification.

#### 3.4.5 Context Assembly — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L3/L4

- **Purpose:** Give every downstream reasoning step a compact, faithful summary of "where things stand" without requiring that step to understand project/goal/task modeling itself.
- **Authority:** Authorized to read already-resolved project/goal/task state and compose it into the `brainContextNote`. Not authorized to originate new project/goal/task decisions itself.
- **Responsibilities:** Assemble project name/phase, current goal, and the planned task list (with status and assigned engine) into one text block; keep it small enough not to meaningfully burden the orchestrator's context window.
- **What This Capability Will Never Do:** Never include another user's or another business's data in a note; never fabricate plan content not backed by actual resolved state; never let note construction block the request if any input is missing.
- **Inputs:** Resolved `AshProject`, `AshGoal`, and `AshTask[]` state from §3.4.2–3.4.4.
- **Outputs:** The `=== EXECUTIVE BRAIN PLAN ===`-delimited `brainContextNote` string, appended to the forwarded `message`.
- **Dependencies:** Project/Goal/Task Coordination (must run after all three).
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Fixed string-template assembly — no summarization judgment, truncation policy, or prioritization logic is applied today (a related limitation is already flagged in the Master X-RAY §8, Technical Debt).
- **Success Criteria / KPIs:** Note length distribution over time (growth could signal upcoming context-budget pressure); correlation between note presence and orchestrator response quality — currently unmeasured.
- **Failure Modes:** An unbounded task list could eventually produce an unexpectedly large note; because assembly is purely template-based, it silently reflects whatever state exists even if stale or contradictory (e.g. a rollup lagging actual task completion).
- **Fallback Strategy:** No fallback branch of its own; if any upstream capability fails, that section of the template is simply omitted rather than blocking note construction, consistent with the broader fail-open contract.
- **Security Requirements:** Because the note is built entirely from the requesting user's own resolved state, it must never absorb cross-user data; every future capability that appends to this note (e.g. §3.4.11, §3.4.12, §3.4.19) must be reviewed individually for cross-tenant leakage risk before merging into it.
- **Extension Rules:** Assembly is one function operating over already-resolved state and may be extended with prioritization/summarization logic (e.g. capping task-list length) without changing how upstream state is resolved; it may not be extended to read state outside what Project/Goal/Task Coordination have already resolved and authorized.

#### 3.4.6 Delegation — Capability Contract
**Current Maturity:** L2 (implicit, embedded in Task Coordination) · **Target Maturity:** L4

- **Purpose:** Ensure every unit of planned work reaches the execution engine best equipped to carry it out, as the roster of specialized engines grows.
- **Authority:** Authorized to attach an engine label to a task. Not authorized to determine task content or override Task Coordination's decomposition.
- **Responsibilities:** Classify each task's likely execution engine; (future) balance load or capability fit across engines as the roster grows beyond four.
- **What This Capability Will Never Do:** Never route a task to an engine outside the four sanctioned execution engines without an approved extension; never assign a task to an engine outside the requesting user's own execution context.
- **Inputs:** Task text, `ENGINE_KEYWORDS` table.
- **Outputs:** An engine label attached to each `AshTask` row.
- **Dependencies:** `task-planner.ts` (embedded here, not standalone), the four engines it can name.
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** `guessEngine`, a keyword-membership classifier against a fixed table; first/best keyword match wins, with no confidence scoring or secondary-engine option recorded.
- **Success Criteria / KPIs:** Mis-assignment rate (tasks whose assigned engine failed to execute them meaningfully or required manual reassignment).
- **Failure Modes:** Ambiguous or multi-engine tasks (e.g. needing both research and build-engine work) receive only a single label under the current model, with no representation for split/sequenced delegation.
- **Fallback Strategy:** No dedicated fallback beyond whatever default `guessEngine` returns when no keyword matches; that default's downstream handling is itself an open question worth resolving before extension.
- **Security Requirements:** Delegation must only select among engines available to the requesting user's own execution context; no assignment may cross tenant boundaries.
- **Extension Rules:** `guessEngine` may be split out from Task Coordination into a standalone Delegation module — a low-risk, additive first step toward multi-engine/split delegation; the four-engine roster may only be extended by adding to `ENGINE_KEYWORDS`, not by introducing a parallel classification path.

#### 3.4.7 Planning Coordination — Capability Contract
**Current Maturity:** L3 (call-out to a mature Planning Engine) · **Target Maturity:** L4 (tighter feedback loop)

- **Purpose:** Ensure every plan the Executive Brain hands off has already been checked for milestone structure, dependency ordering, and risk before it reaches execution.
- **Authority:** Authorized to invoke the Planning Engine and forward its output. Not authorized to alter, suppress, or override any Planning Engine risk or validation outcome.
- **Responsibilities:** Supply the Planning Engine with correctly-resolved context; independently catch and degrade on its failure.
- **What This Capability Will Never Do:** Never suppress or rewrite a Planning Engine risk finding; never bypass the Planning Engine call for a request class without an approved, documented exception.
- **Inputs:** Resolved project/goal/task state from §3.4.2–3.4.4.
- **Outputs:** A `planningContextNote`, appended alongside the `brainContextNote`.
- **Dependencies:** `lib/planning-engine` (`runPlanningEngine`), Volume 1 Chapter 3 (Validation Engine) transitively.
- **Events Published:** None.
- **Events Consumed:** None directly — receives a return value from `runPlanningEngine`, not an event; any risk/approval events belong to the Planning/Validation Engines themselves.
- **Decision Logic:** Unconditional call today — the Planning Engine runs on every request; its own internal risk-scoring and validation logic belongs to the Planning Engine chapter (Volume 1, Chapter 2), not restated here.
- **Success Criteria / KPIs:** Planning-call latency contribution to time-to-first-token (Master X-RAY §9 already flags sequential phase accumulation); planning-call failure rate.
- **Failure Modes:** An unconditional call means every request pays the Planning Engine's cost even when planning judgment isn't materially needed.
- **Fallback Strategy:** Caught independently in `routes/executive-brain.ts`; failure degrades this one note without blocking the rest of the pipeline.
- **Security Requirements:** None additional beyond what's already enforced by the resolved project/goal/task scoping passed into the call.
- **Extension Rules:** Making this call conditional (e.g. skip for trivial/continuation requests) is permitted as a future optimization; the Planning Engine's own risk logic may never be duplicated here.

#### 3.4.8 Research Coordination — Capability Contract
**Current Maturity:** L3 · **Target Maturity:** L3/L4 (mature; growth is in trigger precision)

- **Purpose:** Ensure a request that requires factual/external grounding gets it, without paying a research pass's cost on requests that don't need it.
- **Authority:** Authorized to detect research intent and invoke the Research Engine. Not authorized to perform research itself or fabricate research results.
- **Responsibilities:** Detect research intent; invoke `runResearchEngine`; fold its output into the forwarded request.
- **What This Capability Will Never Do:** Never present unretrieved information as if it came from the Research Engine; never invoke research using another user's or business's identity or credentials.
- **Inputs:** Incoming message (for intent detection), resolved business/goal context.
- **Outputs:** A research context note, appended alongside the others.
- **Dependencies:** `lib/research-engine`.
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Conditional invocation based on a research-intent detection step; the Research Engine's own knowledge-first-then-live-search logic is documented in Volume 1, Chapter 5, not restated here.
- **Success Criteria / KPIs:** Research-trigger precision/recall (correctly invoked vs. incorrectly skipped or incorrectly triggered).
- **Failure Modes:** Intent-detection false negatives silently skip research a request actually needed; false positives add unnecessary latency.
- **Fallback Strategy:** Caught independently; failure degrades this one note without blocking the rest of the pipeline, per the shared fail-open contract.
- **Security Requirements:** Research must remain scoped to the same resolved business/user context as the rest of the request.
- **Extension Rules:** Intent detection may be extended with AI-assisted or confidence-scored detection instead of the current binary trigger; it may not bypass the shared business/user scoping to do so.

#### 3.4.9 Memory Coordination — Capability Contract
**Current Maturity:** L3 · **Target Maturity:** L4

- **Purpose:** Ground every plan and every model call in the user's and business's accumulated history, without re-deriving context from scratch on every request.
- **Authority:** Authorized to read and write memory only through the Memory Engine's own sanctioned interfaces (`retrieveRelevantMemory`, `captureAutoMemory`). Not authorized to read or write memory directly against the underlying tables.
- **Responsibilities:** Call `retrieveRelevantMemory` before planning; call `captureAutoMemory` on stream completion (detected via SSE "done"-event peeking).
- **What This Capability Will Never Do:** Never bypass the Memory Engine's own isolation guarantees; never capture memory containing another user's data; never block the response on a memory failure.
- **Inputs:** Resolved user/project/business identifiers; the completed SSE stream (for capture).
- **Outputs:** Retrieved memory folded into planning/context inputs; new memory rows written post-completion.
- **Dependencies:** `lib/memory-engine` (`retrieveRelevantMemory`, `captureAutoMemory`).
- **Events Published:** None (memory capture is a direct write, not an event).
- **Events Consumed:** None.
- **Decision Logic:** Retrieval and capture both run unconditionally around the core sequence today; the Memory Engine's own 5-layer ranking/capping logic is documented in Volume 1, Chapter 4, not restated here.
- **Success Criteria / KPIs:** Retrieval relevance (Memory-Engine-owned); capture completeness (fraction of completed streams that successfully trigger a capture).
- **Failure Modes:** SSE "done"-event peeking is a stream-parsing dependency; a change in the orchestrator's SSE event shape could silently break capture triggering without an obvious symptom.
- **Fallback Strategy:** Caught independently; a retrieval failure degrades gracefully to planning without that context, per the fail-open contract.
- **Security Requirements:** Retrieval/capture must remain scoped per user/business per the Memory Engine's own isolation guarantees (Master X-RAY §1.5) at all times.
- **Extension Rules:** The "done"-event peek may be hardened into a defined, versioned completion contract with the Orchestrator; this capability may never read/write memory tables directly, only through the Memory Engine's interfaces, regardless of how completion detection evolves.

#### 3.4.10 Business Coordination — Capability Contract
**Current Maturity:** L3 · **Target Maturity:** L4

- **Purpose:** Keep every plan grounded in the specific business it concerns, so multi-business users never receive cross-contaminated context.
- **Authority:** Authorized to assemble business context only after `businessesTable.ownerId` verification succeeds. Not authorized to assemble or expose business context for a business the requesting user does not own, regardless of any other input — including a malformed or spoofed `systemInstanceId`.
- **Responsibilities:** Resolve the correct business scope; verify ownership before assembling context; fold the resulting package into planning.
- **What This Capability Will Never Do:** Never assemble business context before ownership verification; never treat a client-supplied `businessId`/`systemInstanceId` as authoritative without server-side ownership confirmation; never silently fall back to another business's data on lookup failure.
- **Inputs:** `systemInstanceId`, `businessType`/`revenueGoal` (optional request fields), `businessesTable` state.
- **Outputs:** A business context package, consumed by planning and folded into the `brainContextNote`'s implicit grounding.
- **Dependencies:** `lib/business-intelligence` (`assembleBusinessContextPackage`).
- **Events Published:** None (Business Intelligence's own domain events, e.g. `project.completed`, `integration.connected`, are published by that subsystem on writes, not by this read-only coordination).
- **Events Consumed:** None directly.
- **Decision Logic:** Ownership is checked against `businessesTable.ownerId` in `routes/executive-brain.ts` before assembly is invoked at all — an authorization gate, not a business-selection heuristic; cross-business analysis only runs when an explicit `crossBusinessMode` opt-in flag is set.
- **Success Criteria / KPIs:** Ownership-check rejection rate (a spike could indicate an attack pattern or a client bug sending stale `systemInstanceId`s).
- **Failure Modes:** An ownership-check failure must hard-stop rather than silently degrade — unlike most capabilities in this chapter, this is a security boundary, not a quality-of-response concern, so it must not follow the general fail-open contract without qualification (flagged for review, §3.9).
- **Fallback Strategy:** On failed assembly *after* successful authorization, the request degrades to proceeding without business context per the general fail-open pattern; on failed *authorization*, the request must be rejected, not silently degraded — confirming this distinction is an explicit open review item, not assumed here.
- **Security Requirements:** This is the chapter's clearest security-critical path — `businessesTable.ownerId` verification is the sole gate preventing cross-tenant business data from entering a plan; every future capability reading business context must go through this same gate, and may never bypass it.
- **Extension Rules:** The existing `crossBusinessMode` opt-in flag is the sole sanctioned seam for a future explicit "compare across my businesses" capability; no extension may weaken the default single-business isolation or the ownership gate itself.

#### 3.4.11 Risk Coordination — Capability Contract (target capability)
**Current Maturity:** L0 at this layer (L3 exists one layer down, inside the Validation Engine) · **Target Maturity:** L3

- **Purpose:** Ensure the Executive Brain's own plan reflects known risk before it is handed to execution, not only at the Validation Engine's separate checkpoint.
- **Authority (target):** Authorized only to read and surface risk signals already produced by the Validation Engine. Never authorized to compute or override a risk score itself.
- **Responsibilities (target):** Read (not compute) risk signals already produced by the Validation Engine and reflect them in the `brainContextNote`/rollup state.
- **What This Capability Will Never Do:** Never compute an independent risk score; never suppress a Validation Engine risk finding from the note.
- **Inputs (target):** Validation Engine risk-level output for the current plan.
- **Outputs (target):** A risk-annotated `brainContextNote` section.
- **Dependencies (target):** `lib/planning-engine/validation-engine`.
- **Events Published:** None today.
- **Events Consumed (target):** A risk-level signal from the Validation Engine — not modeled as a discrete event today; would need a defined contract if built.
- **Decision Logic:** None exists at this layer today; this would be a pure read-through of an existing signal, deliberately not a second risk-scoring implementation, per Upgrade Before Replace.
- **Success Criteria / KPIs (proposed):** Correlation between surfaced risk level and actual task outcome, once wired.
- **Failure Modes:** Without this, a user-facing plan summary can look "clean" even when the Validation Engine has already flagged elevated risk internally — a visibility gap, not a scoring gap.
- **Fallback Strategy (target):** If the Validation Engine's risk signal is unavailable, omit the annotation rather than block the note, consistent with the chapter's existing fail-open pattern.
- **Security Requirements:** None beyond what the Validation Engine already enforces; this would only ever read an existing authorized signal.
- **Extension Rules:** This capability is itself the extension point — permitted only as a read-only addition once approved; whether the Executive Brain should "see" risk at all, or remain deliberately unaware by design, is an open question (§3.9), not decided here.

#### 3.4.12 Approval Coordination — Capability Contract (target capability)
**Current Maturity:** L0 · **Target Maturity:** L3

- **Purpose:** Give a user a coherent view of "what is my plan waiting on" when part of it requires human approval, rather than a plan that silently stalls.
- **Authority (target):** Authorized only to read `pending_approvals` state scoped to the approval's own `userId`. Never authorized to approve, reject, or modify an approval.
- **Responsibilities (target):** Surface pending-approval state for tasks the Executive Brain itself planned.
- **What This Capability Will Never Do:** Never approve or reject an approval; never surface another user's approval queue.
- **Inputs (target):** `pending_approvals` rows keyed to the current plan's tasks.
- **Outputs (target):** A "blocked on approval" annotation in the `brainContextNote` and/or rollup `currentPhase`.
- **Dependencies (target):** `routes/approvals.ts`, `pending_approvals` table.
- **Events Published:** None today.
- **Events Consumed (target):** `pending_approvals` state changes — not modeled as a discrete event today.
- **Decision Logic:** Read-only surfacing of existing approval state; no new approval logic proposed.
- **Success Criteria / KPIs (proposed):** Time-to-approval-visibility (currently the user only discovers a block indirectly).
- **Failure Modes:** Without this, a task can sit blocked on approval indefinitely while the Executive Brain's own rollup still reports it as simply "planned" or "in progress," misrepresenting true state.
- **Fallback Strategy (target):** If approval-state lookup fails, omit the annotation rather than block note construction.
- **Security Requirements:** Any such lookup must remain scoped to the approval's own `userId` (see the approval-executor authorization note in Master X-RAY §4.4) and must never surface another user's approval queue.
- **Extension Rules:** This capability is itself the extension point; whether the Executive Brain should carry this visibility at all is an open question (§3.9).

#### 3.4.13 Execution Coordination — Capability Contract (target capability)
**Current Maturity:** L1 (a seam exists — `updateTaskStatus` — but is unused internally) · **Target Maturity:** L4

- **Purpose:** Track a planned task through to a real outcome, so "planned" is never confused with "done."
- **Authority (target):** Authorized to read execution outcomes reported by the four execution engines and update `ash_tasks`/rollup state accordingly. Not authorized to directly control or halt execution engine behavior.
- **Responsibilities (target):** Observe task execution outcomes from the engines tasks are delegated to (§3.4.6) and reflect them in `ash_tasks`/rollup state.
- **What This Capability Will Never Do:** Never claim a task succeeded without a genuine outcome report; never mark a task complete based on assumption rather than an authoritative execution result.
- **Inputs (target):** Execution results from `media_gen`, `browser_agent`, `build_engine`, `research`.
- **Outputs (target):** Updated task status, feeding rollup (§3.4.4) and, eventually, Recovery Coordination (§3.4.14).
- **Dependencies (target):** The four execution engines; `runtime_jobs` if execution is asynchronous.
- **Events Published (target):** Candidate `task.completed`/`task.failed` events, reusing the Business Intelligence outbox pattern (Master X-RAY §4.1) rather than inventing a new mechanism.
- **Events Consumed (target):** Completion/failure signals from the four execution engines.
- **Decision Logic:** None implemented; would need a defined contract for how each execution engine reports completion/failure back to the Executive Brain — an open architectural question (§3.9), not decided here.
- **Success Criteria / KPIs (proposed):** Task completion rate; time-to-completion per engine.
- **Failure Modes:** Without this, a stalled or silently-failed task has no mechanism to surface back to the user or trigger re-planning.
- **Fallback Strategy:** Undefined until a reporting contract exists; flagged, not designed, here.
- **Security Requirements:** Execution results must be attributable and scoped to the originating task's `userId`/project, consistent with every other capability in this chapter.
- **Extension Rules:** `updateTaskStatus`'s existing export is the sanctioned seam to build this on; any new reporting contract must reuse the existing domain-event outbox pattern rather than introduce a second event mechanism, per Upgrade Before Replace.

#### 3.4.14 Recovery Coordination — Capability Contract (target capability)
**Current Maturity:** L0 · **Target Maturity:** L3/L4

- **Purpose:** Turn a stalled or failed task into a re-plan rather than a silent dead end.
- **Authority (target):** Authorized to trigger a bounded retry or re-decomposition of a stalled/failed task per an approved policy. Not authorized to retry indefinitely or to re-execute using different credentials/context than the original request.
- **Responsibilities (target):** Detect a task that has failed or stalled past a reasonable threshold; decide whether to retry, re-decompose, or surface the failure to the user.
- **What This Capability Will Never Do:** Never retry a task using different user credentials or a different authorization context than the one that originally created it; never exceed an approved retry ceiling; never silently drop a failed task without surfacing it.
- **Inputs (target):** Execution Coordination outcomes (§3.4.13), once that capability exists.
- **Outputs (target):** A re-plan action, a retry, or a user-facing failure notice.
- **Dependencies (target):** Execution Coordination, Task Coordination (for re-decomposition), the Scheduler's existing exponential-backoff pattern for user-defined tasks (Master X-RAY §4.3) as prior art to reuse rather than reinvent.
- **Events Published (target):** Candidate `task.stalled`/`task.recovery_attempted` events.
- **Events Consumed (target):** `task.failed`/`task.stalled` events from Execution Coordination.
- **Decision Logic:** Not designed; explicitly depends on Execution Coordination existing first, and its policy (auto-retry vs. always-ask-user) is an open question, not decided here.
- **Success Criteria / KPIs (proposed):** Recovery success rate; mean time to recovery.
- **Failure Modes:** Without this, a user's only recourse today is to notice a stalled task themselves and re-prompt manually.
- **Fallback Strategy:** None exists; once built, degrading to "surface the failure to the user" rather than retrying silently is the required default.
- **Security Requirements:** Any auto-retry must not re-execute a task using credentials or context different from the original authorized request.
- **Extension Rules:** This capability is itself the extension point; its retry policy must reuse the Scheduler's existing exponential-backoff pattern rather than introduce a new one, per Upgrade Before Replace.

#### 3.4.15 Learning Coordination — Capability Contract
**Current Maturity:** L2 (capture exists; consultation does not) · **Target Maturity:** L4

- **Purpose:** Make every future plan a little better informed by every past one.
- **Authority:** Authorized to write memory via `captureAutoMemory` and (target) to read aggregate lesson data via `AshBrain`. Not authorized to write directly to the `ash_lessons` distillation pipeline — that remains the Self-Improving Brain's own responsibility.
- **Responsibilities:** Trigger `captureAutoMemory` on completion; (target) consult `AshBrain`'s SQL-distilled lessons during goal/task derivation.
- **What This Capability Will Never Do:** Never capture or expose another user's raw data as a "lesson"; never let a lesson-consultation failure block goal/task derivation.
- **Inputs:** Completed SSE stream (write side); (target) `ash_lessons` table (read side).
- **Outputs:** New memory rows (write side); (target) lesson-informed derivation prompts (read side).
- **Dependencies:** `lib/memory-engine`; (target) `lib/ash-brain.ts`.
- **Events Published:** None (memory capture is a direct write, not an event).
- **Events Consumed (target):** None directly — would query `ash_lessons` on demand rather than subscribe to an event.
- **Decision Logic:** Capture is unconditional on stream completion; consultation logic does not exist and is not designed here.
- **Success Criteria / KPIs (proposed):** Fraction of goal/task derivations that would have changed had lesson data been consulted (measurable retrospectively even before this is built).
- **Failure Modes:** Without read-side consultation, `deriveGoal`/`decomposeIntoTasks` never benefit from the platform's own hard-data outcome patterns, relying solely on the LLM's general judgment.
- **Fallback Strategy:** Capture already degrades gracefully on failure (§3.4.9); a future consultation step must follow the same pattern — omit lesson context rather than block derivation if the lookup fails.
- **Security Requirements:** `ash_lessons` is aggregate/deterministic SQL output, not per-user data — any future consultation must not fold cross-tenant specifics into a single user's prompt beyond aggregate pattern data.
- **Extension Rules:** `AshBrain`'s existing class-based interface (Master X-RAY §1.4) is the sanctioned seam to consult from `deriveGoal`/`decomposeIntoTasks`; this capability may not build a second, parallel distillation mechanism.

#### 3.4.16 Model Coordination — Capability Contract
**Current Maturity:** L3 (delegated wholesale to a mature centralized policy) · **Target Maturity:** L3 (mature; growth is in observability, not new logic)

- **Purpose:** Ensure every AI call this chapter makes uses the right model for its importance and cost profile, without this chapter needing its own model policy.
- **Authority:** Authorized only to call the centralized OpenRouter client per its existing policy. Not authorized to select a model or provider independently of `lib/models.ts`.
- **Responsibilities:** Call the shared OpenRouter client correctly; do not implement independent model selection.
- **What This Capability Will Never Do:** Never implement independent model-selection logic; never bypass the centralized fallback-chain policy.
- **Inputs:** `lib/models.ts`'s `MODELS`/`CHAINS` configuration (owned elsewhere, consumed here).
- **Outputs:** Model completions consumed by naming/derivation/decomposition.
- **Dependencies:** `lib/openrouter`, `lib/models.ts`.
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Entirely delegated — this chapter deliberately does not decide which model runs; that policy lives in `lib/models.ts` (Master X-RAY §3) by design.
- **Success Criteria / KPIs (proposed, owned upstream):** Model-call latency/cost/failure rate per named use (naming, goal derivation, decomposition) — currently not broken out per call site, only in aggregate.
- **Failure Modes:** A model-policy change made centrally in `lib/models.ts` could shift the cost/quality profile of every Executive Brain AI call without this chapter having its own visibility, absent per-call-site metrics.
- **Fallback Strategy:** Fallback chains (`CHAINS`) are already handled centrally; this chapter's only responsibility is to surface a clean failure into its own fail-open contract when the centralized policy exhausts its fallback chain.
- **Security Requirements:** None additional beyond what the centralized client already enforces.
- **Extension Rules:** Per-call-site metrics tagging (naming vs. goal derivation vs. decomposition) is a permitted, low-risk observability addition; this capability may never fragment model-selection policy out of `lib/models.ts`.

#### 3.4.17 Tool Coordination — Capability Contract (not currently authorized)
**Current Maturity:** L0 at this layer (fully owned by the Orchestrator downstream) · **Target Maturity:** L0 by design, pending future review

- **Purpose:** Undetermined at this layer — whether the Executive Brain should ever have tool-coordination visibility is itself an open question (§3.9), not a capability gap assumed to need closing.
- **Authority:** None at this layer today; holds no authority over tool selection or execution.
- **Responsibilities:** None at this layer today.
- **What This Capability Will Never Do:** Never invoke a tool directly from within the Executive Brain layer under the current architecture; any change to this boundary requires an approved architectural decision (§3.9), not an incidental addition.
- **Inputs / Outputs:** None.
- **Dependencies:** None.
- **Events Published:** None.
- **Events Consumed:** None. Tool-execution events, if any, are owned by `routes/ash-tools.ts`, not this chapter.
- **Decision Logic:** None; deliberately out of scope today.
- **Success Criteria / KPIs:** Not applicable at this layer.
- **Failure Modes:** None specific to this chapter; tool-execution failures are the Orchestrator's concern.
- **Fallback Strategy:** Not applicable.
- **Security Requirements:** Not applicable at this layer.
- **Extension Rules:** None proposed; this capability is listed for completeness against the mission's full coordination surface (§3.2), not because a gap has been identified.

#### 3.4.18 Communication Coordination — Capability Contract
**Current Maturity:** L2 (working but narrow SSE pipe-through) · **Target Maturity:** L3

- **Purpose:** Deliver the Executive Brain's plan and the Orchestrator's response to the user as one coherent, low-latency stream, not two disjointed calls.
- **Authority:** Authorized to relay the Orchestrator's SSE stream and forward the augmented request. Not authorized to alter response content originating from the Orchestrator.
- **Responsibilities:** Forward the augmented request; relay the SSE stream; detect stream completion to trigger memory capture (§3.4.9).
- **What This Capability Will Never Do:** Never modify or truncate the Orchestrator's streamed content; never forward a request with a fabricated or altered `Authorization` header.
- **Inputs:** The Orchestrator's SSE stream.
- **Outputs:** The same SSE stream, relayed to the caller.
- **Dependencies:** `routes/ai-orchestrator.ts`'s SSE contract.
- **Events Published:** None (transport-layer relay, not business-event publishing).
- **Events Consumed:** None; this capability relays a stream, it does not subscribe to domain events.
- **Decision Logic:** Pass-through with a single side-effect trigger (completion detection); no transformation of the underlying content occurs at this layer.
- **Success Criteria / KPIs (proposed):** Relay latency overhead vs. a direct orchestrator call; stream-parsing error rate.
- **Failure Modes:** As noted in §3.4.9, a change to the Orchestrator's SSE event shape could silently break "done"-event detection without an obvious failure signal.
- **Fallback Strategy:** If the loopback HTTP call itself fails, `logger.error` records it and the request fails at that point — one of the few points in the chapter where full fail-open degradation is not possible, since without a successful orchestrator call there is nothing left to relay.
- **Security Requirements:** The `Authorization` header must be forwarded through unchanged on the internal loopback call; this relies on the loopback call remaining genuinely local/trusted (`127.0.0.1`) and never exposed externally.
- **Extension Rules:** A more robust, versioned completion contract with the Orchestrator is a permitted extension; this capability may never independently alter Orchestrator response content.

#### 3.4.19 Opportunity Coordination — Capability Contract (target capability)
**Current Maturity:** L0 · **Target Maturity:** L3

- **Purpose:** Turn insight the platform already has about a business into forward motion for that business's active project, rather than leaving Business Recommendations as a separate surface the user must notice and act on themselves.
- **Authority (target):** Authorized to read `business_recommendations` (through the existing ownership gate, §3.4.10) and surface candidate goals. Not authorized to unilaterally adopt a recommendation as an active goal without the confirmation policy resolved in §3.9.
- **Responsibilities (target):** Surface high-impact, unactioned recommendations as candidate goals during goal derivation.
- **What This Capability Will Never Do:** Never adopt a recommendation as a binding goal without going through whatever confirmation policy is ultimately approved; never read recommendations for a business the user does not own.
- **Inputs (target):** `business_recommendations` rows for the resolved business.
- **Outputs (target):** Candidate goal suggestions folded into `deriveGoal`'s prompt, or presented to the user for confirmation.
- **Dependencies (target):** `lib/business-intelligence` recommendations surface.
- **Events Published:** None.
- **Events Consumed (target):** Could consume Business Intelligence's existing recommendation-generation event, if one exists, rather than polling — to be confirmed during the Architecture Review stage.
- **Decision Logic:** Not designed; whether suggested goals should be auto-adopted or require explicit user confirmation is an open question, not decided here.
- **Success Criteria / KPIs (proposed):** Recommendation-to-goal adoption rate, once built.
- **Failure Modes:** Without this, high-value recommendations can go unseen if a user doesn't separately check the recommendations surface.
- **Fallback Strategy (target):** Omit the suggestion if recommendation lookup fails, consistent with this chapter's fail-open contract.
- **Security Requirements:** Recommendations must be scoped through the same business-ownership gate as Business Coordination (§3.4.10) — no new authorization path may be introduced for this.
- **Extension Rules:** This capability is itself the extension point, and must reuse Business Coordination's existing ownership gate rather than introduce a parallel one.

#### 3.4.20 Self Review Coordination — Capability Contract (target capability)
**Current Maturity:** L0 · **Target Maturity:** L3

- **Purpose:** Let the Executive Brain's own resolution quality improve over time by examining its own past decisions, not just the outcomes of the tasks it plans.
- **Authority (target):** Authorized to read historical resolution and outcome data and produce a feedback signal. Not authorized to autonomously alter live decision logic (e.g. keyword tables, thresholds) without human review of its findings.
- **Responsibilities (target):** Periodically or retrospectively assess whether past project-continuation, goal-derivation, and task-decomposition decisions were sound, using outcome data.
- **What This Capability Will Never Do:** Never modify Decision Making's or Delegation's live rules automatically; never treat its own retrospective findings as authoritative without human review.
- **Inputs (target):** Historical `ash_projects`/`ash_goals`/`ash_tasks` state plus outcome data from Execution Coordination (§3.4.13), once it exists.
- **Outputs (target):** A feedback signal consumable by Decision Making (§3.4.1) and Learning Coordination (§3.4.15) to refine future heuristics.
- **Dependencies (target):** Execution Coordination; the ASH Self-Improving Brain's existing distillation pattern (Master X-RAY §1.4) as prior art to extend into this chapter's own domain rather than building a second distillation mechanism.
- **Events Published (target):** A candidate `resolution.reviewed` event/finding.
- **Events Consumed (target):** Outcome data from Execution Coordination and Recovery Coordination.
- **Decision Logic:** Not designed; explicitly depends on Execution Coordination existing first, so genuine outcomes (not just plans) are available to review against.
- **Success Criteria / KPIs (proposed):** Rate of self-identified resolution errors; agreement between self-review and actual downstream success.
- **Failure Modes:** Without this, every heuristic in this chapter (keyword tables, thresholds) can only ever be tuned by a human noticing a pattern manually.
- **Fallback Strategy:** Not applicable until designed.
- **Security Requirements:** Any self-review process must operate over already-authorized, already-scoped historical data — it may introduce no new read paths beyond what Execution Coordination and existing tables already expose.
- **Extension Rules:** This capability is itself the extension point — explicitly the capstone capability, since it depends on Execution Coordination, Recovery Coordination, and Learning Coordination all existing first; it may never bypass human review to self-modify live logic.

---

### 3.5 Inputs (Brain-level aggregate)

*The per-capability Inputs above are the authoritative detail; this section is the aggregate view across the whole subsystem.*

- **Request body (`ExecutiveBrainRequest`):** `userId`, `message`, `history` (role/content pairs), and the optional fields `systemInstanceId`, `businessType`, `revenueGoal`.
- **Request headers:** `Authorization`, forwarded through to the orchestrator loopback call unchanged.
- **Persisted state read at request time:** `ash_projects` and `ash_goals` (most-recent-active and `systemInstanceId`-pinned lookups), `ash_tasks` (for rollup and continuation).
- **Memory Engine retrieval:** long-term memory (`ash_memories`), project memory (`ash_project_memory`), business memory (`ash_business_memory`), and knowledge memory (`ash_knowledge_memory`), via `retrieveRelevantMemory`.
- **Business Intelligence context:** business identity/context resolved from `businessesTable`, scoped via `systemInstanceId`, via `assembleBusinessContextPackage`; ownership is checked against `businessesTable.ownerId` before this context is assembled.
- **AI-derived inputs:** outputs of `deriveProjectName`, `deriveGoal`, and `decomposeIntoTasks` — each an OpenRouter completion consumed as input to the resolution step that follows it.

### 3.6 Outputs (Brain-level aggregate)

*The per-capability Outputs above are the authoritative detail; this section is the aggregate view across the whole subsystem.*

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
| Memory Engine | Executive Brain ↔ Memory Engine | `retrieveRelevantMemory` (read, pre-call) and `captureAutoMemory` (write, on stream completion); `ash_project_memory` is itself owned and managed by the Memory Engine, not the Executive Brain, despite living alongside `ash_projects` in the Executive Brain's domain naming. |
| ASH Self-Improving Brain | Not integrated today | No call site found; the Executive Brain does not currently consult or contribute to SQL-distilled lessons (see §3.4.15). |
| ash-tools / Tool Execution | Not integrated today | No direct import found in `lib/executive-brain/`; tool execution happens downstream, inside the Orchestrator's own request handling, after the Executive Brain has already handed off (see §3.4.17). |
| Runtime Job Worker | Not integrated today | The Executive Brain operates only on the live, synchronous request path; no interaction with the asynchronous `runtime_jobs` queue was found (see §3.4.13). |
| Validation Engine / Approvals | Indirect only | Runs inside the Planning Engine call, not directly invoked by the Executive Brain; the Executive Brain has no visibility into `pending_approvals` state for tasks it plans (see §3.4.11, §3.4.12). |

### 3.8 Future Growth

The following are extension points that would allow the Executive Brain to grow toward the mission in §3.2 without redesigning its current five-step core sequence — consistent with the Upgrade Before Replace law, each below is framed as an addition to, not a replacement of, existing architecture. This list is superseded in detail by each capability contract's own Extension Rules field in §3.4; it is retained here as a single cross-cutting summary for convenience.

- **Execution and Recovery Coordination** (§3.4.13, §3.4.14): `task-planner.ts`'s already-exposed but internally-unused `updateTaskStatus` is the natural seam for closing the loop between planned tasks and their actual execution outcome.
- **Approval and Risk visibility** (§3.4.11, §3.4.12): both are read-only additions of existing signals already produced by the Planning/Validation Engines.
- **Tool/model coordination visibility** (§3.4.16, §3.4.17): as `lib/models.ts` and the connector registry already centralize their respective policies, any future visibility here would be an observability addition, not new policy logic.
- **Multi-user/team workspace growth:** the subsystem's existing `userId`-scoped queries are the natural foundation to extend toward the reserved `teamWorkspaceId` concept (see Master X-RAY §7, and Volume 6 Chapter 5) once that concept is formally approved elsewhere in this specification — not a change required here.
- **Learning Coordination** (§3.4.15): a read-only consultation of the ASH Self-Improving Brain's lesson store during task decomposition is a plausible future enrichment that would not require changing the decomposition control flow, only its inputs.
- **Opportunity Coordination** (§3.4.19): Business Recommendations already exist as a subsystem; a future read-only integration is a natural extension of the existing goal-derivation seam.
- **Keyword-table centralization** (§3.4.1, §3.4.3, §3.4.4, §3.4.6): `NEW_PROJECT_KEYWORDS` and `ENGINE_KEYWORDS` are already isolated, centralized lookup tables — a ready seam for future data-driven or configurable classification without touching surrounding control flow.

### 3.9 Open Architecture Questions

The following require review and a decision before any related implementation work proceeds — they are flagged here, not resolved:

1. Should Risk Coordination (§3.4.11) and Approval Coordination (§3.4.12) become first-class Executive Brain responsibilities (i.e. does the Executive Brain need to *see* validation/approval state to plan well), or should they remain entirely owned by the Planning/Validation Engines with the Executive Brain staying unaware of them by design?
2. Should Execution Coordination (§3.4.13) and Recovery Coordination (§3.4.14) be added to the Executive Brain itself, or does that responsibility belong more naturally to the Runtime Job Worker / Scheduler, with the Executive Brain only ever producing a plan and never tracking its outcome?
3. Is the current keyword-based decision logic (§3.4.1, §3.4.6) intended to remain a simple heuristic long-term, or is this an area the mission (§3.2) expects to become AI-driven or learned over time? Any such change would need to satisfy the Upgrade Before Replace justification fields, and is explicitly not decided here.
4. How should the Executive Brain's project/goal/task model (`ash_*` tables) relate to the reserved `teamWorkspaceId` concept once a Team Workspace / RBAC chapter (Volume 6) is approved — does multi-user collaboration on a single project require new schema, or does the existing `userId`-scoped model already generalize?
5. Should Tool Coordination (§3.4.17) and Model Coordination (§3.4.16) visibility move up into the Executive Brain's own context assembly, or is keeping the Executive Brain deliberately unaware of tool/model specifics — as it is today — the correct long-term separation of concerns?
6. `ash_project_memory` is schema-adjacent to the Executive Brain's own tables but is owned and managed by the Memory Engine (§3.7). Is this split intentional and permanent, or should chapter boundaries between Volume 1 Chapter 1 (Executive Brain) and Volume 1 Chapter 4 (Memory Engine) be clarified regarding which one is the source of truth for project-scoped memory?
7. `ash_projects`, `ash_goals`, and `ash_tasks` remain outside the Business Intelligence Governance/Data Access Layer (Phase A) per the Master X-RAY (§6, explicitly out of scope). Should the Executive Brain's data eventually be brought under an equivalent ownership/audit contract, and if so, does that belong to this chapter or to the Volume 6 Governance chapters?
8. Business Coordination's ownership check (§3.4.10) is a security boundary, not a quality concern — should it, and any other security-critical gate in this chapter, be explicitly exempted from the general fail-open contract (i.e. fail *closed* on authorization failure, fail *open* on everything else)? The chapter currently states this as a distinction to confirm, not an implemented rule.
9. What is the reporting contract by which execution engines (`media_gen`, `browser_agent`, `build_engine`, `research`) communicate completion/failure back to the Executive Brain — a prerequisite for both Execution Coordination (§3.4.13) and Recovery Coordination (§3.4.14)? Candidate approaches (e.g. reusing the Business Intelligence domain-event outbox, Master X-RAY §4.1) are named as prior art in §3.4.13, not selected here.
10. Should recommendation-derived goals (Opportunity Coordination, §3.4.19) ever be auto-adopted, or must they always require explicit user confirmation? This has direct product/trust implications beyond pure architecture and is flagged for the project owner's judgment.

### 3.10 Architecture Summary

*This section closes out the Architecture stage of this chapter's lifecycle. It consolidates the chapter's own findings; it does not introduce new architecture beyond what §3.1–3.9 already establish.*

**Current maturity assessment.** Of the twenty capabilities bound to contracts in §3.4, nine are implemented today at L2 or L3 (Decision Making, Goal Management, Task Coordination, Project Coordination, Context Assembly, Delegation, Planning Coordination, Research Coordination, Memory Coordination, Business Coordination, Learning Coordination, and Model Coordination — twelve, on recount), one is a defined-but-unused seam (Execution Coordination, L1), six are entirely latent (Risk, Approval, Recovery, Opportunity, and Self Review Coordination, plus Tool Coordination which is latent by design pending a scope decision), and none has yet reached L4 or L5. In short: the Executive Brain today is a solid, fail-open, deterministic-with-AI-assist planning pre-pass; the mission in §3.2 requires it to also become execution-aware, risk-aware, and self-improving, none of which exists yet.

| Maturity band | Capabilities |
|---|---|
| L3 (AI-assisted, implemented) | Goal Management, Task Coordination (partial), Project Coordination (partial), Planning Coordination, Research Coordination, Memory Coordination, Business Coordination, Model Coordination |
| L2 (deterministic, implemented) | Decision Making, Context Assembly, Delegation, Learning Coordination (write side only) |
| L1 (seam only) | Execution Coordination |
| L0 (absent / not authorized) | Risk Coordination, Approval Coordination, Recovery Coordination, Tool Coordination, Opportunity Coordination, Self Review Coordination |

**Technical debt.** Carried forward from the Master X-RAY (§8) where it names this subsystem, plus debt surfaced during this chapter's own analysis:
- Mixed `zod`/`zod/v4` imports observed in `executive-brain.ts` (Master X-RAY §8), suggesting an incomplete migration.
- `updateTaskStatus` is exported but internally unused (§3.1, §3.4.13) — a half-finished seam rather than a clean absence.
- SSE "done"-event completion detection (§3.4.9, §3.4.18) is an implicit peek at event shape rather than a defined contract, making it fragile to unrelated Orchestrator changes.
- `brainContextNote` assembly (§3.4.5) has no truncation or prioritization policy, a latent scaling risk as task lists grow (also flagged in Master X-RAY §8 for a related component).
- Four separate AI call sites in this chapter (`deriveProjectName`, `deriveGoal`, `decomposeIntoTasks`, and the Communication layer's implicit reliance on Orchestrator model calls) have no per-call-site cost/latency/failure metrics, only aggregate visibility (§3.4.16).
- Two deterministic keyword tables (`NEW_PROJECT_KEYWORDS`, `ENGINE_KEYWORDS`) carry real product behavior with no test coverage or drift-detection named in this chapter's investigation.

**Deferred architectural decisions.** All ten items in §3.9 are formally deferred pending the project owner's review; none has been decided in this chapter. The two with the most architectural leverage over everything else in this chapter are #2 (whether Execution/Recovery Coordination belong here or in the Runtime Job Worker/Scheduler) and #9 (the execution-engine completion-reporting contract), since five of the six latent capabilities (Execution, Recovery, Learning's read side, Self Review, and indirectly Opportunity Coordination) all depend on that contract existing first.

**Risks.** 
- **Security ambiguity in the fail-open contract** (§3.9 item 8): Business Coordination's ownership gate is a hard security boundary sitting inside a chapter whose default posture everywhere else is graceful degradation; until this distinction is explicitly ratified, there is a real risk that a future contributor extends the fail-open pattern into a security-critical path by analogy with the rest of the chapter.
- **Silent execution blindness**: because Execution and Recovery Coordination don't exist, a stalled or failed task is invisible to both the user and the system today — this risk compounds as autonomous, multi-step project execution (the chapter's own stated mission) grows.
- **SSE contract fragility**: Memory capture and the broader Communication Coordination both depend on informally peeking the Orchestrator's stream shape; an unrelated change to the Orchestrator could silently break memory capture with no error surfaced anywhere.
- **Context growth**: `brainContextNote` assembly has no size governance; as projects accumulate history this is a plausible future latency/cost/quality risk with no mitigation currently in place.
- **Unmeasured heuristics**: every keyword-table and threshold-based decision in this chapter (project continuation, engine delegation, decomposition threshold) currently has proposed but uninstrumented KPIs — meaning today there is no way to detect if these heuristics are degrading in accuracy as usage patterns shift.

**Future roadmap** *(sequencing only; no phase is authorized by this chapter)*:
- **Near-term candidate:** define the execution-engine completion-reporting contract (§3.9 item 9) and wire Execution Coordination through the existing `updateTaskStatus` seam — this unlocks Recovery, deeper Learning, and Self Review Coordination as later steps, and resolves the "silent execution blindness" risk above.
- **Near-term candidate:** ratify the fail-open/fail-closed distinction for security-critical gates (§3.9 item 8) and audit Business Coordination against it explicitly.
- **Mid-term candidate:** wire Risk and Approval Coordination as read-only additions once Execution Coordination exists to give them something concrete to annotate.
- **Mid-term candidate:** harden the SSE completion contract (§3.4.9, §3.4.18) into a versioned, explicit mechanism rather than event-shape peeking.
- **Longer-term candidate:** Learning Coordination's read side, Opportunity Coordination, and finally Self Review Coordination — in that order, since each depends on the one before it having real outcome data to work from.
- **Ongoing, not phase-gated:** per-call-site AI metrics (naming/derivation/decomposition) and keyword-table test coverage can be added at any time without sequencing dependency on the above.

**Chapter approval checklist.** For the project owner's use in deciding whether to move this chapter to the Architecture Review stage:
- [ ] The mission statement (§3.2) is confirmed as an accurate statement of long-term intent for the Executive Brain.
- [ ] All twenty Capability Contracts (§3.4) have been read, and their Authority/Never-Do boundaries are confirmed correct.
- [ ] The ten Open Architecture Questions (§3.9) each have either a decision or an explicit "defer to a later chapter/cycle" disposition.
- [ ] The fail-open vs. fail-closed distinction for security-critical gates (§3.9 item 8, §3.4.10) has been explicitly ratified.
- [ ] The Future Roadmap sequencing (above) is confirmed as a reasonable order, or reordered by the project owner.
- [ ] No implementation, refactor, or code change has occurred as part of this chapter — confirmed.
- [ ] The chapter is approved to proceed to Stage 2 (Architecture Review), or returned with specific requested changes.

## 4. Architecture Review
_Not separately conducted as a distinct stage: the project owner reviewed v1 and v2 in-line (each returned with named refinement requests, which produced v2 and v3 respectively) and approved v3 directly. No open reviewer items remain outstanding._

## 5. Approval

- **Approved by:** Project owner.
- **Date:** 2026-07-29.
- **Scope of approval:** The v3 architecture content in §1–§3 (Purpose & Scope, Baseline Reference, and all of §3's Architecture content, including all 20 Capability Contracts and the Architecture Summary).
- **Condition attached:** This chapter is additionally designated the **official architecture chapter template** for the entire ASH Brain Master Architecture Specification — its structure, section ordering, Capability Contract field set, maturity scale, and Architecture Summary format are binding on every chapter in every volume from this point forward (see `00-INDEX.md`, "Chapter Template").
- **Change control:** This chapter must not be revisited for incremental refinement. If a future chapter's work reveals a genuine improvement to the template itself, that improvement is proposed and applied consistently across all chapters (including this one) as a deliberate, explicit template revision — never as an isolated edit to this chapter alone.

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
