# 1.1 — Executive Brain

**Status:** Architecture Drafted (v2 — Capability Specification) — Pending Review
**Volume:** 1 — Core Cognitive Architecture
**Last Updated:** 2026-07-29

**Revision note (v2):** The first draft of this chapter was an architectural inventory — accurate, but scoped to describing today's implementation. Per review feedback, this revision evolves the chapter into a complete engineering capability specification: every capability named in the chapter now has its own full specification (Mission, Purpose, Responsibilities, Inputs, Outputs, Decision Logic, Dependencies, Events, KPIs, Failure Modes, Fallback Behavior, Security Considerations, Extension Points, Future Maturity Level), so the chapter can serve as a genuine design document for a long-term AI Business Operating System, not just a snapshot of what exists today. The current implementation (§3.1, and the "Current Level" stated in each capability spec) remains the unmodified baseline throughout — no redesign is proposed anywhere in this revision, and every forward-looking statement below is framed as an addition to, not a replacement of, existing architecture, per the Upgrade Before Replace law. This chapter remains unapproved and is returned for architectural review before any further chapter is started.

---

## 1. Purpose & Scope

This chapter is the permanent architecture reference for the Executive Brain — the multi-phase planning layer that sits between an incoming user request and the AI Orchestrator, responsible for resolving what project, goal, and task a request belongs to before any model call happens. It documents the subsystem exactly as it exists today (per the Master X-RAY baseline), defines its long-term mission, and specifies every capability implied by that mission — both those implemented today and those the mission requires in the future — as full engineering specifications. It identifies the extension points and open questions that will govern the Executive Brain's growth toward those specifications, without proposing any implementation change today. Per the Upgrade Before Replace law, no replacement of any existing component is proposed anywhere in this chapter; every future-state capability spec below explicitly reuses or extends an existing seam in the current implementation.

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

The Executive Brain's long-term mission within the AI Business Operating System is to be the **single point of continuity** between a user's ongoing work and every stateless reasoning pass the system makes on their behalf. Every other Brain subsystem (Planning, Business Intelligence, Research, Memory) answers a question in isolation; the Executive Brain is what remembers *which* project, *which* goal, and *which* task those answers belong to, so that a user's relationship with the system reads as one continuous collaboration rather than a sequence of disconnected completions. As the platform grows from single-request chat into autonomous, multi-step, multi-day project execution, the Executive Brain is the layer responsible for keeping that execution coherent, resumable, and auditable — the executive function of the system, in the same sense the term is used for human cognition. This mission is deliberately larger than today's implementation; §3.4 specifies every capability the mission implies, both those already built and those still latent, as a complete engineering roadmap for closing that gap over time.

### 3.3 Core Responsibilities

- **Project continuity** — determine, for every incoming request, which `AshProject` it belongs to (an existing one, or the start of a new one), and maintain that project's lifecycle state.
- **Goal resolution** — determine which `AshGoal` within the active project the request advances, or derive a new one when none fits.
- **Task decomposition** — break a request down into one or more concrete `AshTask` units, sized appropriately to the request, and assign each to the engine responsible for executing it.
- **Project rollup maintenance** — keep the project's `currentPhase` and `currentTaskId` synchronized with the live state of its tasks.
- **Context handoff** — produce a concise, structured summary (the `brainContextNote`) that gives the AI Orchestrator and downstream model call the project/goal/task context it needs, without requiring the orchestrator to understand project/goal/task modeling itself.
- **Non-blocking operation** — guarantee that failures anywhere in this resolution process degrade gracefully rather than blocking the user's underlying request.
- **User and business scoping** — ensure every project, goal, and task resolution is correctly isolated to the requesting user, and to the correct business context when a `systemInstanceId` is present.

Each responsibility above decomposes into one or more of the twenty individually specified capabilities in §3.4.

### 3.4 Core Capability Specifications

Every capability implied by the mission (§3.2) is specified below as a standalone engineering unit, whether it is fully implemented today, partially implemented, or entirely latent. Each spec uses the same fourteen-field template, and states a **Current Level** and **Target Level** against the maturity scale below, so that the distance between today's implementation and the long-term mission is explicit and reviewable rather than implied.

**Maturity scale** (used consistently across every capability below):

| Level | Name | Meaning |
|---|---|---|
| **L0** | Absent | No implementation; the responsibility is not currently discharged by any part of the system. |
| **L1** | Implicit | Discharged only as a side effect of another capability's logic, with no dedicated code path of its own. |
| **L2** | Explicit / Deterministic | Has its own dedicated code path, driven by fixed deterministic rules (keyword tables, thresholds); no model call, no learning. |
| **L3** | AI-Assisted | Uses a model call for judgment, with a deterministic fallback when the model call fails or is skipped. |
| **L4** | Adaptive | Incorporates real outcome data (e.g. from the ASH Self-Improving Brain's SQL-distilled lessons) to improve its own future decisions. |
| **L5** | Autonomous / Cross-Scope | Reasons and self-optimizes across multiple goals, projects, or businesses without per-instance human tuning. |

A capability's target level is a design intention for future review, not committed work; nothing in §3.4 authorizes implementation on its own.

---

#### 3.4.1 Decision Making
**Current Level:** L2 (embedded, narrow) · **Target Level:** L4

- **Mission:** Serve as the seat of judgment for "what happens next" across every Executive Brain resolution step, so downstream engines execute a coherent, correctly-scoped plan rather than each independently guessing intent.
- **Purpose:** Today this underlies the specific new-vs-continuing decisions used by Project and Goal resolution (§3.4.4, §3.4.2); it exists narrowly, embedded inside those two managers rather than as a standalone module.
- **Responsibilities:** Decide whether an incoming request continues existing project/goal state or starts new state; provide one point of judgment so Project/Goal/Task Coordination don't each reimplement it independently.
- **Inputs:** Incoming message text, `systemInstanceId`, most-recent-active project/goal rows.
- **Outputs:** A continue/start-new boolean per project and per goal, consumed by Project and Goal Coordination.
- **Decision Logic:** Deterministic keyword match against `NEW_PROJECT_KEYWORDS` for project continuation; goal continuation defaults to "reuse most recent active goal" unless none exists. No weighting, scoring, or model call is used for either decision today.
- **Dependencies:** `project-manager.ts`, `goal-manager.ts`.
- **Events:** None emitted today; a decision is an in-process return value, not a domain event.
- **KPIs (proposed):** False-new-project rate (existing work incorrectly treated as new); false-continuation rate (new intent incorrectly folded into an old project). Both currently unmeasured.
- **Failure Modes:** A keyword match can mis-fire on a message that merely mentions a keyword figuratively, forking an unwanted new project.
- **Fallback Behavior:** None needed at this level — the decision itself is fallback-free; if the surrounding request fails, this decision is simply not reached (fail-open at a higher level).
- **Security Considerations:** Inputs are already scoped to the requesting `userId`/`systemInstanceId`; no cross-user data is consulted.
- **Extension Points:** Replacing the flat keyword match with a scored/AI-assisted classifier is a natural, additive step — extending, not replacing, today's deterministic path (e.g. keep the keyword match as a fast-path/fallback under a future model-assisted classifier).
- **Future Maturity Level:** Target L4 — informed by the ASH Self-Improving Brain's outcome data, so keyword-only misfires shrink over time without discarding the deterministic fast path.

#### 3.4.2 Goal Management
**Current Level:** L3 · **Target Level:** L4

- **Mission:** Keep every unit of planned work traceable to a single, coherent objective, so a project's task list always answers "in service of what."
- **Purpose:** Provide the function that either reuses an existing active goal or derives a new one, giving Task Coordination something concrete to plan against.
- **Responsibilities:** Resolve the goal a request advances; derive new goals via AI extraction when none exists or a new project has started; maintain `ash_goals` as the durable record.
- **Inputs:** Project resolution result (§3.4.4), incoming message, most-recent-active goal row.
- **Outputs:** A resolved/created `AshGoal` row, passed into Task Coordination and into the `brainContextNote`.
- **Decision Logic:** Reuse-most-recent-active-goal by default; call `deriveGoal` (an OpenRouter completion) only when no active goal exists for the project. No confidence threshold or multi-candidate ranking is applied today.
- **Dependencies:** `lib/openrouter`, `ash_goals` table, Project Coordination (must run after project resolution).
- **Events:** None emitted; goal changes are visible only via row updates and the `brainContextNote` text.
- **KPIs (proposed):** Goal-derivation AI-call failure rate; goal churn rate (how often a project's active goal changes within a short window).
- **Failure Modes:** `deriveGoal` can fail or return a low-quality goal statement; a stale "active" goal can be incorrectly reused for a request that has moved on to a different objective.
- **Fallback Behavior:** On `deriveGoal` failure, the goal step degrades per the fail-open contract and the request proceeds without a newly derived goal; the exact fallback value used in that case is an open question (§3.9).
- **Security Considerations:** Goal rows are scoped per `userId`/project; no cross-project or cross-user goal data is read.
- **Extension Points:** `deriveGoal` is already isolated behind a single function — a ready seam for future confidence scoring or multi-candidate generation without touching surrounding control flow.
- **Future Maturity Level:** Target L4 — goal quality assessed against downstream task success/outcome data, closing the loop the current one-shot derivation lacks.

#### 3.4.3 Task Coordination
**Current Level:** L2/L3 · **Target Level:** L4

- **Mission:** Translate a resolved goal into concrete, appropriately-sized, correctly-routed units of executable work.
- **Purpose:** Decompose the current request into one or more `AshTask` rows and assign each to the correct downstream execution engine.
- **Responsibilities:** Decide single-task vs. multi-task decomposition; assign each task to an execution engine; persist tasks to `ash_tasks` for tracking and rollup.
- **Inputs:** Resolved goal, incoming message, `DECOMPOSE_THRESHOLD_CHARS` (220) and `ENGINE_KEYWORDS` constants.
- **Outputs:** One or more `AshTask` rows with status and assigned engine, folded into the `brainContextNote`.
- **Decision Logic:** Messages under 220 characters become a single task; longer messages go to `decomposeIntoTasks` (AI call) producing 2–6 ordered tasks; each task's engine is chosen by `guessEngine`, a keyword classifier against `ENGINE_KEYWORDS`.
- **Dependencies:** `lib/openrouter`, Goal Management (must run after goal resolution), the four named downstream execution engines.
- **Events:** None emitted at creation; task status changes are tracked only via direct row updates (`updateTaskStatus`, currently unused internally — §3.1).
- **KPIs (proposed):** Decomposition granularity accuracy vs. human judgment; engine-assignment accuracy (tasks later manually reassigned or that failed in their assigned engine).
- **Failure Modes:** The 220-character threshold can force an artificially single-task treatment of a compound request just under the cutoff, or an unnecessary split just over it; `guessEngine` can mis-route ambiguous tasks.
- **Fallback Behavior:** `decomposeIntoTasks` failure is caught and degrades to the fail-open contract at the route level; no documented per-task retry or re-classification fallback exists today.
- **Security Considerations:** Tasks are always created under the resolved project's `userId`; no engine-assignment path routes a task outside the requesting user's own execution context.
- **Extension Points:** `updateTaskStatus`'s existing-but-unused export (§3.1) is the direct seam for wiring true Execution Coordination (§3.4.13) into this capability without new schema.
- **Future Maturity Level:** Target L4 — engine assignment informed by historical success rates per engine/keyword combination from the Self-Improving Brain, rather than a static keyword table alone.

#### 3.4.4 Project Coordination
**Current Level:** L2/L3 · **Target Level:** L4

- **Mission:** Maintain one authoritative, continuously-updated container for all work a user is doing toward a given initiative, across arbitrarily many requests over time.
- **Purpose:** Resolve which `AshProject` a request belongs to, create new ones when warranted, and keep project-level rollup state accurate.
- **Responsibilities:** Resolve or create the active project for a request; name new projects; keep `currentPhase`/`currentTaskId` synchronized via `updateProjectRollup`.
- **Inputs:** `systemInstanceId` (pin, if present), most-recent-active project lookup, incoming message (for keyword detection and naming).
- **Outputs:** A resolved/created `AshProject` row; updated rollup fields after each planning pass.
- **Decision Logic:** `systemInstanceId` pin takes priority; otherwise most-recent-active project is reused unless `NEW_PROJECT_KEYWORDS` matches, in which case a new project is created and named via `deriveProjectName` (falling back to a message slice on AI failure).
- **Dependencies:** `lib/openrouter` (naming), `ash_projects` table, Decision Making (§3.4.1).
- **Events:** None emitted; visible only via row state and the `brainContextNote`.
- **KPIs (proposed):** Unwanted-new-project rate; project abandonment rate; naming quality (fallback-slice usage rate as a proxy for AI naming reliability).
- **Failure Modes:** `deriveProjectName` failure silently degrades to a message-slice name, which can be low-quality if it recurs often; `systemInstanceId` pinning bypasses the keyword heuristic entirely — correct by design, but means a user inside a pinned system instance has no path to genuinely start fresh today (flagged, not solved, here).
- **Fallback Behavior:** Naming falls back to a message slice on AI failure; project resolution itself has no fallback other than proceeding without a project (fail-open at the route level).
- **Security Considerations:** Resolution is scoped to `userId` throughout; `systemInstanceId` pinning requires prior resolution against `businessesTable.ownerId` upstream in `routes/executive-brain.ts`, preventing cross-tenant project pinning.
- **Extension Points:** `updateProjectRollup` is already the single seam for rollup logic; a future multi-signal rollup (e.g. incorporating Business Health Scores) could extend it without touching resolution logic.
- **Future Maturity Level:** Target L4 — continuation decisions and naming quality improved using accumulated project outcome data rather than static keywords and single-shot AI naming.

#### 3.4.5 Context Assembly
**Current Level:** L2 · **Target Level:** L3/L4

- **Mission:** Give every downstream reasoning step a compact, faithful summary of "where things stand" without requiring that step to understand project/goal/task modeling itself.
- **Purpose:** Build the `brainContextNote` from resolved project, goal, and task state.
- **Responsibilities:** Assemble project name/phase, current goal, and the planned task list (with status and assigned engine) into one text block; keep it small enough not to meaningfully burden the orchestrator's context window.
- **Inputs:** Resolved `AshProject`, `AshGoal`, and `AshTask[]` state from §3.4.2–3.4.4.
- **Outputs:** The `=== EXECUTIVE BRAIN PLAN ===`-delimited `brainContextNote` string, appended to the forwarded `message`.
- **Decision Logic:** Fixed string-template assembly — no summarization judgment, truncation policy, or prioritization logic is applied today (a related limitation is already flagged in the Master X-RAY §8, Technical Debt).
- **Dependencies:** Project/Goal/Task Coordination (must run after all three).
- **Events:** None; the note is inlined directly into the forwarded request rather than published anywhere.
- **KPIs (proposed):** Note length distribution over time (growth could signal upcoming context-budget pressure); correlation between note presence and orchestrator response quality — currently unmeasured.
- **Failure Modes:** An unbounded task list could eventually produce an unexpectedly large note; because assembly is purely template-based, it silently reflects whatever state exists even if stale or contradictory (e.g. a rollup lagging actual task completion).
- **Fallback Behavior:** No fallback branch of its own; if any upstream capability fails, that section of the template is simply omitted rather than blocking note construction, consistent with the broader fail-open contract.
- **Security Considerations:** Because the note is built entirely from the requesting user's own resolved state, no cross-user data can leak into it under current scoping — but every future capability that appends to this note (e.g. §3.4.11, §3.4.12, §3.4.19) should be reviewed individually for cross-tenant leakage risk before merging into it.
- **Extension Points:** Because assembly is one function operating over already-resolved state, it is a ready seam for future prioritization/summarization logic (e.g. capping task-list length, prioritizing at-risk tasks first) without changing how upstream state is resolved.
- **Future Maturity Level:** Target L3 — an AI-assisted or rule-based summarization/prioritization pass once note size or task-list length materially grows, still assembled from the same underlying resolved state.

#### 3.4.6 Delegation
**Current Level:** L2 (implicit, embedded in Task Coordination) · **Target Level:** L4

- **Mission:** Ensure every unit of planned work reaches the execution engine best equipped to carry it out, as the roster of specialized engines grows.
- **Purpose:** Assign each planned task to one of the four current execution engines.
- **Responsibilities:** Classify each task's likely execution engine; (future) balance load or capability fit across engines as the roster grows beyond four.
- **Inputs:** Task text, `ENGINE_KEYWORDS` table.
- **Outputs:** An engine label attached to each `AshTask` row.
- **Decision Logic:** `guessEngine`, a keyword-membership classifier against a fixed table; first/best keyword match wins, with no confidence scoring or secondary-engine option recorded.
- **Dependencies:** `task-planner.ts` (embedded here, not standalone), the four engines it can name.
- **Events:** None; assignment is a task field, not a dispatched message.
- **KPIs (proposed):** Mis-assignment rate (tasks whose assigned engine failed to execute them meaningfully or required manual reassignment).
- **Failure Modes:** Ambiguous or multi-engine tasks (e.g. needing both research and build-engine work) receive only a single label under the current model, with no representation for split/sequenced delegation.
- **Fallback Behavior:** No dedicated fallback beyond whatever default `guessEngine` returns when no keyword matches; that default's downstream handling is itself an open question worth resolving before extension.
- **Security Considerations:** Delegation only selects among engines available to the requesting user's own execution context; no assignment crosses tenant boundaries.
- **Extension Points:** Because `guessEngine` is already isolated as a single function, splitting it out from Task Coordination into a standalone Delegation module is a low-risk, additive first step toward multi-engine/split delegation.
- **Future Maturity Level:** Target L4 — delegation informed by per-engine historical success rates (Self-Improving Brain), and capable of representing multi-engine task decomposition, not just a single label per task.

#### 3.4.7 Planning Coordination
**Current Level:** L3 (call-out to a mature Planning Engine) · **Target Level:** L4 (tighter feedback loop)

- **Mission:** Ensure every plan the Executive Brain hands off has already been checked for milestone structure, dependency ordering, and risk before it reaches execution.
- **Purpose:** Invoke the Planning Engine (`runPlanningEngine`) with the Executive Brain's resolved context, and fold its response into the forwarded request.
- **Responsibilities:** Supply the Planning Engine with correctly-resolved context; independently catch and degrade on its failure.
- **Inputs:** Resolved project/goal/task state from §3.4.2–3.4.4.
- **Outputs:** A `planningContextNote`, appended alongside the `brainContextNote`.
- **Decision Logic:** Unconditional call today — the Planning Engine runs on every request; its own internal risk-scoring and validation logic belongs to the Planning Engine chapter (Volume 1, Chapter 2), not restated here.
- **Dependencies:** `lib/planning-engine` (`runPlanningEngine`), Volume 1 Chapter 3 (Validation Engine) transitively.
- **Events:** None emitted directly by this coordination call; any risk/approval events belong to the Planning/Validation Engines themselves.
- **KPIs (proposed):** Planning-call latency contribution to time-to-first-token (Master X-RAY §9 already flags sequential phase accumulation); planning-call failure rate.
- **Failure Modes:** An unconditional call means every request pays the Planning Engine's cost even when planning judgment isn't materially needed.
- **Fallback Behavior:** Caught independently in `routes/executive-brain.ts`; failure degrades this one note without blocking the rest of the pipeline.
- **Security Considerations:** None additional beyond what's already enforced by the resolved project/goal/task scoping passed into the call.
- **Extension Points:** Making this call conditional (e.g. skip for trivial/continuation requests) is a plausible low-risk optimization, named here as a future option only.
- **Future Maturity Level:** Target L4 — selectively invoked based on request complexity/risk signals rather than unconditionally on every request, closing part of the sequential-latency gap named in the X-RAY.

#### 3.4.8 Research Coordination
**Current Level:** L3 · **Target Level:** L3/L4 (mature; growth is in trigger precision)

- **Mission:** Ensure a request that requires factual/external grounding gets it, without paying a research pass's cost on requests that don't need it.
- **Purpose:** Conditionally invoke the Research & Knowledge Engine when research intent is detected.
- **Responsibilities:** Detect research intent; invoke `runResearchEngine`; fold its output into the forwarded request.
- **Inputs:** Incoming message (for intent detection), resolved business/goal context.
- **Outputs:** A research context note, appended alongside the others.
- **Decision Logic:** Conditional invocation based on a research-intent detection step; the Research Engine's own knowledge-first-then-live-search logic is documented in Volume 1, Chapter 5, not restated here.
- **Dependencies:** `lib/research-engine`.
- **Events:** None emitted by this coordination call itself.
- **KPIs (proposed):** Research-trigger precision/recall (correctly invoked vs. incorrectly skipped or incorrectly triggered).
- **Failure Modes:** Intent-detection false negatives silently skip research a request actually needed; false positives add unnecessary latency.
- **Fallback Behavior:** Caught independently; failure degrades this one note without blocking the rest of the pipeline, per the shared fail-open contract.
- **Security Considerations:** None additional; research is scoped to the same resolved business/user context as the rest of the request.
- **Extension Points:** Intent detection is already isolated as a single decision point — a ready seam for future AI-assisted or confidence-scored detection instead of the current binary trigger.
- **Future Maturity Level:** Target L4 — trigger decisions informed by historical research-value data per request pattern.

#### 3.4.9 Memory Coordination
**Current Level:** L3 · **Target Level:** L4

- **Mission:** Ground every plan and every model call in the user's and business's accumulated history, without re-deriving context from scratch on every request.
- **Purpose:** Retrieve relevant memory before planning, and capture new memory after a request completes.
- **Responsibilities:** Call `retrieveRelevantMemory` before planning; call `captureAutoMemory` on stream completion (detected via SSE "done"-event peeking).
- **Inputs:** Resolved user/project/business identifiers; the completed SSE stream (for capture).
- **Outputs:** Retrieved memory folded into planning/context inputs; new memory rows written post-completion.
- **Decision Logic:** Retrieval and capture both run unconditionally around the core sequence today; the Memory Engine's own 5-layer ranking/capping logic is documented in Volume 1, Chapter 4, not restated here.
- **Dependencies:** `lib/memory-engine` (`retrieveRelevantMemory`, `captureAutoMemory`).
- **Events:** None emitted directly by this coordination layer.
- **KPIs (proposed):** Retrieval relevance (Memory-Engine-owned); capture completeness (fraction of completed streams that successfully trigger a capture).
- **Failure Modes:** SSE "done"-event peeking is a stream-parsing dependency; a change in the orchestrator's SSE event shape could silently break capture triggering without an obvious symptom.
- **Fallback Behavior:** Caught independently; a retrieval failure degrades gracefully to planning without that context, per the fail-open contract.
- **Security Considerations:** Already scoped per user/business per the Memory Engine's own isolation guarantees (Master X-RAY §1.5).
- **Extension Points:** The "done"-event peek is a narrow, single-purpose seam; a more robust completion-detection contract (e.g. an explicit completion callback from the orchestrator) is a plausible additive hardening, named here as an option only.
- **Future Maturity Level:** Target L4 — capture quality assessed against which captured memories actually get retrieved and used in later requests, closing today's open write-without-feedback loop.

#### 3.4.10 Business Coordination
**Current Level:** L3 · **Target Level:** L4

- **Mission:** Keep every plan grounded in the specific business it concerns, so multi-business users never receive cross-contaminated context.
- **Purpose:** Assemble business context (`assembleBusinessContextPackage`) scoped to `systemInstanceId`/`businessId`.
- **Responsibilities:** Resolve the correct business scope; verify ownership before assembling context; fold the resulting package into planning.
- **Inputs:** `systemInstanceId`, `businessType`/`revenueGoal` (optional request fields), `businessesTable` state.
- **Outputs:** A business context package, consumed by planning and folded into the `brainContextNote`'s implicit grounding.
- **Decision Logic:** Ownership is checked against `businessesTable.ownerId` in `routes/executive-brain.ts` before assembly is invoked at all — an authorization gate, not a business-selection heuristic; cross-business analysis only runs when an explicit `crossBusinessMode` opt-in flag is set.
- **Dependencies:** `lib/business-intelligence` (`assembleBusinessContextPackage`).
- **Events:** None emitted directly here; Business Intelligence's own domain events (Master X-RAY §4.1) are triggered by writes, not by this read-only coordination.
- **KPIs (proposed):** Ownership-check rejection rate (a spike could indicate an attack pattern or a client bug sending stale `systemInstanceId`s).
- **Failure Modes:** An ownership-check failure must hard-stop rather than silently degrade — unlike most capabilities in this chapter, this is a security boundary, not a quality-of-response concern, so it should not follow the general fail-open contract without qualification (flagged for review, §3.9).
- **Fallback Behavior:** On failed assembly *after* successful authorization, the request degrades to proceeding without business context per the general fail-open pattern; on failed *authorization*, the request must be rejected, not silently degraded — confirming this distinction is an explicit open review item, not assumed here.
- **Security Considerations:** This is the chapter's clearest security-critical path — `businessesTable.ownerId` verification is the sole gate preventing cross-tenant business data from entering a plan; any future capability reading business context must go through this same gate, never bypass it.
- **Extension Points:** The existing `crossBusinessMode` opt-in flag is the designed seam for a future explicit "compare across my businesses" capability without weakening default single-business isolation.
- **Future Maturity Level:** Target L4 — richer business context (Business Recommendations, Health Scores) folded in as first-class planning input, still behind the same ownership gate.

#### 3.4.11 Risk Coordination
**Current Level:** L0 at this layer (L3 exists one layer down, inside the Validation Engine) · **Target Level:** L3

- **Mission:** Ensure the Executive Brain's own plan reflects known risk before it is handed to execution, not only at the Validation Engine's separate checkpoint.
- **Purpose:** Today, none at this layer — risk scoring is entirely owned by the Planning Engine's Validation Engine (Volume 1, Chapter 3); the Executive Brain has no visibility into that scoring.
- **Responsibilities (target):** Read (not compute) risk signals already produced by the Validation Engine and reflect them in the `brainContextNote`/rollup state.
- **Inputs (target):** Validation Engine risk-level output for the current plan.
- **Outputs (target):** A risk-annotated `brainContextNote` section.
- **Decision Logic:** None exists at this layer today; this would be a pure read-through of an existing signal, deliberately not a second risk-scoring implementation, per Upgrade Before Replace (reuse the Validation Engine's existing scoring rather than duplicating it).
- **Dependencies (target):** `lib/planning-engine/validation-engine`.
- **Events:** None today.
- **KPIs (proposed):** Correlation between surfaced risk level and actual task outcome, once wired.
- **Failure Modes:** Without this, a user-facing plan summary can look "clean" even when the Validation Engine has already flagged elevated risk internally — a visibility gap, not a scoring gap.
- **Fallback Behavior (target):** If the Validation Engine's risk signal is unavailable, omit the annotation rather than block the note, consistent with the chapter's existing fail-open pattern.
- **Security Considerations:** None beyond what the Validation Engine already enforces; this would only ever read an existing authorized signal.
- **Extension Points:** This capability is itself the extension point — a read-only addition once approved.
- **Future Maturity Level:** Target L3 (read-through of existing scoring); whether the Executive Brain should "see" risk at all, or remain deliberately unaware by design, is an open question (§3.9), not decided here.

#### 3.4.12 Approval Coordination
**Current Level:** L0 · **Target Level:** L3

- **Mission:** Give a user a coherent view of "what is my plan waiting on" when part of it requires human approval, rather than a plan that silently stalls.
- **Purpose:** Today, none — `pending_approvals` rows are created and resolved entirely within the Validation Engine/approval executor (Master X-RAY §4.4), invisible to the Executive Brain.
- **Responsibilities (target):** Surface pending-approval state for tasks the Executive Brain itself planned.
- **Inputs (target):** `pending_approvals` rows keyed to the current plan's tasks.
- **Outputs (target):** A "blocked on approval" annotation in the `brainContextNote` and/or rollup `currentPhase`.
- **Decision Logic:** Read-only surfacing of existing approval state; no new approval logic proposed.
- **Dependencies (target):** `routes/approvals.ts`, `pending_approvals` table.
- **Events:** None today; approvals already flow through their own workflow (Master X-RAY §4.4) independent of this chapter.
- **KPIs (proposed):** Time-to-approval-visibility (currently the user only discovers a block indirectly).
- **Failure Modes:** Without this, a task can sit blocked on approval indefinitely while the Executive Brain's own rollup still reports it as simply "planned" or "in progress," misrepresenting true state.
- **Fallback Behavior (target):** If approval-state lookup fails, omit the annotation rather than block note construction.
- **Security Considerations:** Any such lookup must remain scoped to the approval's own `userId` (see the approval-executor authorization note in Master X-RAY §4.4) — never surface another user's approval queue.
- **Extension Points:** This capability is itself the extension point.
- **Future Maturity Level:** Target L3; whether the Executive Brain should carry this visibility at all is an open question (§3.9).

#### 3.4.13 Execution Coordination
**Current Level:** L1 (a seam exists — `updateTaskStatus` — but is unused internally) · **Target Level:** L4

- **Mission:** Track a planned task through to a real outcome, so "planned" is never confused with "done."
- **Purpose:** Today, task status updates are exposed to the route layer via `updateTaskStatus` but not consumed by the Executive Brain's own control flow.
- **Responsibilities (target):** Observe task execution outcomes from the engines tasks are delegated to (§3.4.6) and reflect them in `ash_tasks`/rollup state.
- **Inputs (target):** Execution results from `media_gen`, `browser_agent`, `build_engine`, `research`.
- **Outputs (target):** Updated task status, feeding rollup (§3.4.4) and, eventually, Recovery Coordination (§3.4.14).
- **Decision Logic:** None implemented; would need a defined contract for how each execution engine reports completion/failure back to the Executive Brain — an open architectural question (§3.9), not decided here.
- **Dependencies (target):** The four execution engines; `runtime_jobs` if execution is asynchronous.
- **Events (target):** A natural fit for the existing domain-event outbox pattern already used by Business Intelligence (Master X-RAY §4.1) — reuse, not a new mechanism, per Upgrade Before Replace.
- **KPIs (proposed):** Task completion rate; time-to-completion per engine.
- **Failure Modes:** Without this, a stalled or silently-failed task has no mechanism to surface back to the user or trigger re-planning.
- **Fallback Behavior:** Undefined until a reporting contract exists; flagged, not designed, here.
- **Security Considerations:** Execution results must be attributable and scoped to the originating task's `userId`/project, consistent with every other capability in this chapter.
- **Extension Points:** `updateTaskStatus`'s existing export is the concrete, already-present seam to build this on.
- **Future Maturity Level:** Target L4 — full execution tracking feeding both Recovery Coordination and outcome data back to the Self-Improving Brain.

#### 3.4.14 Recovery Coordination
**Current Level:** L0 · **Target Level:** L3/L4

- **Mission:** Turn a stalled or failed task into a re-plan rather than a silent dead end.
- **Purpose:** Today, none exists — there is no detection of stalled/failed tasks at this layer.
- **Responsibilities (target):** Detect a task that has failed or stalled past a reasonable threshold; decide whether to retry, re-decompose, or surface the failure to the user.
- **Inputs (target):** Execution Coordination outcomes (§3.4.13), once that capability exists.
- **Outputs (target):** A re-plan action, a retry, or a user-facing failure notice.
- **Decision Logic:** Not designed; explicitly depends on Execution Coordination existing first, and its policy (auto-retry vs. always-ask-user) is an open question, not decided here.
- **Dependencies (target):** Execution Coordination, Task Coordination (for re-decomposition), the Scheduler's existing exponential-backoff pattern for user-defined tasks (Master X-RAY §4.3) as prior art to reuse rather than reinvent.
- **Events (target):** Could reuse the domain-event outbox pattern for a `task.stalled`/`task.failed` event, consistent with Upgrade Before Replace.
- **KPIs (proposed):** Recovery success rate; mean time to recovery.
- **Failure Modes:** Without this, a user's only recourse today is to notice a stalled task themselves and re-prompt manually.
- **Fallback Behavior:** None exists; once built, degrading to "surface the failure to the user" rather than retrying silently is the safer default — named here as a design principle for when this is built, not as committed work.
- **Security Considerations:** Any auto-retry must not re-execute a task using credentials or context different from the original authorized request.
- **Extension Points:** This capability is itself the extension point.
- **Future Maturity Level:** Target L3 initially (rule-based retry/backoff, reusing the Scheduler's existing pattern), L4 longer-term (informed by which failure types historically recover on retry vs. require user input).

#### 3.4.15 Learning Coordination
**Current Level:** L2 (capture exists; consultation does not) · **Target Level:** L4

- **Mission:** Make every future plan a little better informed by every past one.
- **Purpose:** Trigger memory capture on stream completion (§3.4.9) as the write side of learning; the Executive Brain does not currently consult the ASH Self-Improving Brain's distilled lessons on the read side.
- **Responsibilities:** Trigger `captureAutoMemory` on completion; (target) consult `AshBrain`'s SQL-distilled lessons during goal/task derivation.
- **Inputs:** Completed SSE stream (write side); (target) `ash_lessons` table (read side).
- **Outputs:** New memory rows (write side); (target) lesson-informed derivation prompts (read side).
- **Decision Logic:** Capture is unconditional on stream completion; consultation logic does not exist and is not designed here.
- **Dependencies:** `lib/memory-engine`; (target) `lib/ash-brain.ts`.
- **Events:** None emitted; capture is a direct write, and the Self-Improving Brain's distillation is itself a deterministic SQL pass (Master X-RAY §1.4), not event-driven.
- **KPIs (proposed):** Fraction of goal/task derivations that would have changed had lesson data been consulted (measurable retrospectively even before this is built).
- **Failure Modes:** Without read-side consultation, `deriveGoal`/`decomposeIntoTasks` never benefit from the platform's own hard-data outcome patterns, relying solely on the LLM's general judgment.
- **Fallback Behavior:** Capture already degrades gracefully on failure (§3.4.9); a future consultation step should follow the same pattern — omit lesson context rather than block derivation if the lookup fails.
- **Security Considerations:** `ash_lessons` is aggregate/deterministic SQL output, not per-user data — care must be taken that any future consultation doesn't fold cross-tenant specifics into a single user's prompt beyond aggregate pattern data.
- **Extension Points:** `AshBrain`'s existing class-based interface (Master X-RAY §1.4) is the ready seam to consult from `deriveGoal`/`decomposeIntoTasks` without changing the Self-Improving Brain itself.
- **Future Maturity Level:** Target L4 — full write+read learning loop, closing the one-directional gap that exists today.

#### 3.4.16 Model Coordination
**Current Level:** L3 (delegated wholesale to a mature centralized policy) · **Target Level:** L3 (mature; growth is in observability, not new logic)

- **Mission:** Ensure every AI call this chapter makes uses the right model for its importance and cost profile, without this chapter needing its own model policy.
- **Purpose:** Route the Executive Brain's own AI calls (naming, goal derivation, task decomposition) through `lib/openrouter`, which defers to `lib/models.ts`'s centralized best-model policy.
- **Responsibilities:** Call the shared OpenRouter client correctly; do not implement independent model selection.
- **Inputs:** `lib/models.ts`'s `MODELS`/`CHAINS` configuration (owned elsewhere, consumed here).
- **Outputs:** Model completions consumed by naming/derivation/decomposition.
- **Decision Logic:** Entirely delegated — this chapter deliberately does not decide which model runs; that policy lives in `lib/models.ts` (Master X-RAY §3) by design, and duplicating it here would violate Upgrade Before Replace by fragmenting an already-centralized policy.
- **Dependencies:** `lib/openrouter`, `lib/models.ts`.
- **Events:** None.
- **KPIs (proposed, owned upstream):** Model-call latency/cost/failure rate per named use (naming, goal derivation, decomposition) — currently not broken out per call site, only in aggregate.
- **Failure Modes:** A model-policy change made centrally in `lib/models.ts` could shift the cost/quality profile of every Executive Brain AI call without this chapter having its own visibility, absent per-call-site metrics.
- **Fallback Behavior:** Fallback chains (`CHAINS`) are already handled centrally; this chapter's only responsibility is to surface a clean failure into its own fail-open contract when the centralized policy exhausts its fallback chain.
- **Security Considerations:** None additional beyond what the centralized client already enforces.
- **Extension Points:** Per-call-site metrics tagging (naming vs. goal derivation vs. decomposition) is a low-risk observability addition that would not touch `lib/models.ts` itself.
- **Future Maturity Level:** Remains L3 by design — this capability's maturity ceiling is intentionally the centralized policy's own maturity, not something this chapter should independently push further.

#### 3.4.17 Tool Coordination
**Current Level:** L0 at this layer (fully owned by the Orchestrator downstream) · **Target Level:** L0 by design, pending future review

- **Mission:** Undetermined at this layer — whether the Executive Brain should ever have tool-coordination visibility is itself an open question (§3.9), not a capability gap assumed to need closing.
- **Purpose:** None today; no direct import of `ash-tools` exists in `lib/executive-brain/`, and tool execution happens entirely inside the Orchestrator after handoff.
- **Responsibilities:** None at this layer today.
- **Inputs / Outputs:** None.
- **Decision Logic:** None; deliberately out of scope today.
- **Dependencies:** None.
- **Events:** Tool-execution events, if any, are owned by `routes/ash-tools.ts`, not this chapter.
- **KPIs:** Not applicable at this layer.
- **Failure Modes:** None specific to this chapter; tool-execution failures are the Orchestrator's concern.
- **Fallback Behavior:** Not applicable.
- **Security Considerations:** Not applicable at this layer.
- **Extension Points:** None proposed; this capability is listed for completeness against the mission's full coordination surface (§3.2), not because a gap has been identified.
- **Future Maturity Level:** Held at L0 pending the open question in §3.9 on whether tool/model visibility should ever move up into the Executive Brain's own context assembly.

#### 3.4.18 Communication Coordination
**Current Level:** L2 (working but narrow SSE pipe-through) · **Target Level:** L3

- **Mission:** Deliver the Executive Brain's plan and the Orchestrator's response to the user as one coherent, low-latency stream, not two disjointed calls.
- **Purpose:** Pipe the Orchestrator's SSE response back to the original client while peeking for the terminal "done" event.
- **Responsibilities:** Forward the augmented request; relay the SSE stream; detect stream completion to trigger memory capture (§3.4.9).
- **Inputs:** The Orchestrator's SSE stream.
- **Outputs:** The same SSE stream, relayed to the caller.
- **Decision Logic:** Pass-through with a single side-effect trigger (completion detection); no transformation of the underlying content occurs at this layer.
- **Dependencies:** `routes/ai-orchestrator.ts`'s SSE contract.
- **Events:** None emitted as domain events; this is transport-layer relay, not business-event publishing.
- **KPIs (proposed):** Relay latency overhead vs. a direct orchestrator call; stream-parsing error rate.
- **Failure Modes:** As noted in §3.4.9, a change to the Orchestrator's SSE event shape could silently break "done"-event detection without an obvious failure signal.
- **Fallback Behavior:** If the loopback HTTP call itself fails, `logger.error` records it and the request fails at that point — one of the few points in the chapter where full fail-open degradation is not possible, since without a successful orchestrator call there is nothing left to relay.
- **Security Considerations:** The `Authorization` header is forwarded through unchanged on the internal loopback call; this relies on the loopback call being genuinely local/trusted (`127.0.0.1`) and not exposed externally.
- **Extension Points:** A more robust completion contract (§3.4.9) would strengthen this capability as a side effect.
- **Future Maturity Level:** Target L3 — a defined, versioned completion-event contract with the Orchestrator rather than implicit event-shape peeking.

#### 3.4.19 Opportunity Coordination
**Current Level:** L0 · **Target Level:** L3

- **Mission:** Turn insight the platform already has about a business into forward motion for that business's active project, rather than leaving Business Recommendations as a separate surface the user must notice and act on themselves.
- **Purpose:** Today, none — no integration exists between Business Recommendations (Volume 2, Chapter 5) and Goal Management (§3.4.2).
- **Responsibilities (target):** Surface high-impact, unactioned recommendations as candidate goals during goal derivation.
- **Inputs (target):** `business_recommendations` rows for the resolved business.
- **Outputs (target):** Candidate goal suggestions folded into `deriveGoal`'s prompt, or presented to the user for confirmation.
- **Decision Logic:** Not designed; whether suggested goals should be auto-adopted or require explicit user confirmation is an open question, not decided here.
- **Dependencies (target):** `lib/business-intelligence` recommendations surface.
- **Events:** Recommendation generation already exists as part of Business Intelligence's own event-driven pipeline (Master X-RAY §1.1); this capability would only consume that existing surface, not add a new one.
- **KPIs (proposed):** Recommendation-to-goal adoption rate, once built.
- **Failure Modes:** Without this, high-value recommendations can go unseen if a user doesn't separately check the recommendations surface.
- **Fallback Behavior (target):** Omit the suggestion if recommendation lookup fails, consistent with this chapter's fail-open contract.
- **Security Considerations:** Recommendations must be scoped through the same business-ownership gate as Business Coordination (§3.4.10) — no new authorization path should be introduced for this.
- **Extension Points:** This capability is itself the extension point, and it deliberately reuses Business Coordination's existing ownership gate rather than introducing a parallel one.
- **Future Maturity Level:** Target L3 initially (surfaced suggestions, human-confirmed), L4 longer-term if adoption-outcome data supports more autonomous suggestion.

#### 3.4.20 Self Review Coordination
**Current Level:** L0 · **Target Level:** L3

- **Mission:** Let the Executive Brain's own resolution quality improve over time by examining its own past decisions, not just the outcomes of the tasks it plans.
- **Purpose:** Today, none — no mechanism exists for the Executive Brain to review its own past project/goal/task resolution decisions for quality.
- **Responsibilities (target):** Periodically or retrospectively assess whether past project-continuation, goal-derivation, and task-decomposition decisions were sound, using outcome data.
- **Inputs (target):** Historical `ash_projects`/`ash_goals`/`ash_tasks` state plus outcome data from Execution Coordination (§3.4.13), once it exists.
- **Outputs (target):** A feedback signal consumable by Decision Making (§3.4.1) and Learning Coordination (§3.4.15) to refine future heuristics.
- **Decision Logic:** Not designed; explicitly depends on Execution Coordination existing first, so genuine outcomes (not just plans) are available to review against.
- **Dependencies (target):** Execution Coordination; the ASH Self-Improving Brain's existing distillation pattern (Master X-RAY §1.4) as prior art to extend into this chapter's own domain rather than building a second distillation mechanism.
- **Events:** None today.
- **KPIs (proposed):** Rate of self-identified resolution errors; agreement between self-review and actual downstream success.
- **Failure Modes:** Without this, every heuristic in this chapter (keyword tables, thresholds) can only ever be tuned by a human noticing a pattern manually.
- **Fallback Behavior:** Not applicable until designed.
- **Security Considerations:** Any self-review process must operate over already-authorized, already-scoped historical data — it introduces no new read paths beyond what Execution Coordination and existing tables already expose.
- **Extension Points:** This capability is itself the extension point — explicitly the capstone capability, since it depends on Execution Coordination, Recovery Coordination, and Learning Coordination all existing first.
- **Future Maturity Level:** Target L3 — the last capability in this chapter's maturity roadmap by design, since it depends on every other latent capability above it being built first.

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

The following are extension points that would allow the Executive Brain to grow toward the mission in §3.2 without redesigning its current five-step core sequence — consistent with the Upgrade Before Replace law, each below is framed as an addition to, not a replacement of, existing architecture. This list is now superseded in detail by each capability's own Extension Points field in §3.4; it is retained here as a single cross-cutting summary for convenience.

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
