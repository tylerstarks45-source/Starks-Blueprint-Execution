# 1.4 — Memory Engine

**Status:** Architecture Drafted — Draft (Volume 1 batch; pending architectural review)
**Volume:** 1 — Core Cognitive Architecture
**Last Updated:** 2026-07-29

**Template note:** This chapter follows the structure, quality bar, and Capability Contract format locked in [Chapter 1.1 — Executive Brain](./01-executive-brain.md) (see `00-INDEX.md`, "Chapter Template"). Per the project owner's 2026-07-29 workflow update, this chapter is drafted in a single pass and left in Draft status alongside the rest of Volume 1, rather than paused individually for approval. It has eleven capability contracts, reflecting five distinct memory layers plus the cross-cutting ranking, capture, maintenance, and governance mechanisms that operate across all of them.

---

## 1. Purpose & Scope

This chapter is the permanent architecture reference for the Memory Engine — the subsystem that gives ASH continuity across turns, projects, and businesses by retrieving relevant prior context before a response is generated, and by capturing new facts worth remembering after one is given. It documents the subsystem exactly as it exists today, defines its long-term mission, and binds every capability implied by that mission — implemented and latent alike — to an explicit Capability Contract. Per the Upgrade Before Replace law, no replacement of any existing component is proposed anywhere in this chapter; every future-state contract below explicitly reuses or extends an existing seam in the current implementation. No implementation, code change, or refactor is proposed or performed by this chapter.

## 2. Baseline Reference

See Master X-RAY §1.5 (Memory Engine) for the summary-level as-built description of the five-layer retrieval architecture (`lib/memory-engine/`). This chapter treats the Research & Knowledge Engine (Chapter 1.5) as a distinct subsystem that happens to write into the same Knowledge layer this chapter also reads and writes — see §3.7 for the precise integration boundary, rather than a re-documentation of the Research Engine's own internals.

## 3. Architecture

### 3.1 Current Architecture Summary

*This section documents the Memory Engine exactly as it exists today. It is not redesigned here.*

**Entry points and control flow.** The subsystem exposes two primary entry points, both called from `routes/executive-brain.ts`. `retrieveRelevantMemory` (`index.ts`) is called before a response is generated — it accepts `userId`, the current `message`, the active `project`/`goal`/`tasks`, conversation `history`, `businessId`, and a `crossBusinessMode` flag, and returns a `RelevantMemoryBundle` aggregating all five layers plus a `contextNote` string folded into the same forwarded message the Executive Brain's and Planning Engine's own notes are appended to. `captureAutoMemory` (`auto-memory.ts`) is called fire-and-forget after the SSE stream to the user completes — it never blocks the user-facing response.

**The five memory layers.**
1. **Working Memory** (`working-memory.ts`, `buildWorkingMemory`) — not backed by a dedicated table; derived on the fly from the active project, goal, tasks, and the last six conversation turns. The shortest-lived and cheapest layer.
2. **Long-Term Memory** (`long-term-memory.ts`, `getRelevantLongTermMemory`) — reads/writes `user_memory`; stores durable user-level preferences and facts, capped at 5 entries per retrieval.
3. **Project Memory** (`project-memory.ts`, `getRelevantProjectMemory` / `addProjectMemory`) — reads/writes `ash_project_memory`; scoped to a single project, capped at 5 entries per retrieval. This is the same store the Planning Engine's Task Outcome Adaptation (Chapter 1.2 §3.4.6) writes `lesson_learned` entries into.
4. **Business Memory** (`business-memory.ts`, `getBusinessMemoryForSystemInstance`) — reads/writes `business_memory`; one structured row per business, resolved via `systemInstanceId`. `mergeBusinessMemory` unions list-typed fields (products, services, etc.) on write, so a new fact never silently overwrites an existing one in the same field.
5. **Knowledge Memory** (`knowledge-memory.ts`, `getRelevantKnowledge`) — reads/writes `ash_knowledge_entries`; capped at 3 entries per retrieval. This is the same table the Research & Knowledge Engine's knowledge-writer (Chapter 1.5 §3.4.8) writes into — this chapter's Knowledge layer is a shared store, not a private one.

**Relevance ranking.** `relevance.ts` scores candidate memories with a fixed heuristic weighting — keyword overlap (60%), stated importance (20%), model-assigned confidence (10%), and recency (10%), with recency decaying over roughly 60 days. There is no vector/embedding-based similarity search anywhere in this subsystem today; ranking is entirely lexical and metadata-driven.

**Automated capture.** `captureAutoMemory` uses `MODELS.utility` (OpenRouter) to extract up to three memory-worthy items per conversation turn from the user message and assistant reply, routing each to the appropriate layer by classification. Items scored below an importance threshold of 30 are discarded rather than stored. A separate function, `recordProjectCompletionLessons` (`learning.ts`), also calls the model to extract lessons specifically at project completion, writing into Project Memory. Both capture paths fail open: an extraction failure is caught and logged, never surfaced to or blocking the user-facing request.

**Maintenance.** `maintenance.ts`, run on a schedule via `runtime/scheduler.ts`, prunes memories older than 120 days with an importance score below 25, deduplicates `user_memory` rows (via raw SQL, because Drizzle's ORM lacked a clean `IN`-array helper for this specific case), and truncates any single memory's content to 600 characters.

**Governance integration (Phase A).** Following the Business Intelligence ownership and audit governance work, writes to Business Memory and Knowledge Memory now go through the Data Access Layer (`lib/governance/writes/`) for ownership stamping and audit-trail recording. Writes to Long-Term Memory (`user_memory`) and Project Memory (`ash_project_memory`) remain outside this governance layer today — a residual gap, named as risk in §3.10, not resolved here.

**Event publishing.** `task.completed` and `project.completed` events are published via `publishBusinessEvent` from the `executive-brain.ts` route as memory-relevant state changes occur — the same outbox pattern already documented in Chapter 1.2 (§3.4.9); this subsystem does not publish events from within `lib/memory-engine/` itself.

**Authorization.** Business Memory resolves scope via `systemInstanceId`, which is itself resolved from an ownership-checked business lookup upstream; Project Memory is scoped by `projectId`; Long-Term Memory is scoped by `userId` directly. `crossBusinessMode` is an explicit, named parameter to `retrieveRelevantMemory` — its exact authorization boundary (what does "cross-business" retrieval mean for a user who owns multiple businesses, and can it ever cross to a business the requesting user does not own) is not independently confirmed in this drafting pass and is flagged in §3.9.

### 3.2 Memory Engine Mission

The Memory Engine's long-term mission within the AI Business Operating System is to be **the reason ASH gets better at knowing a specific user and a specific business the longer it works with them** — carrying forward what matters across a single conversation, a single project, a single business's whole lifetime, and eventually across the platform's collective experience, without ever conflating one user's or one business's context with another's. Where the Executive Brain (Chapter 1.1) decides what a request is about right now, the Memory Engine is what lets that decision be informed by everything relevant that has already happened — a stated preference, a hard-won lesson from a failed task, a business fact recorded weeks ago. As ASH is trusted with longer-running, more autonomous work, the Memory Engine is the layer responsible for making sure that autonomy is grounded in real accumulated context rather than a fresh, forgetful start every time. This mission is deliberately larger than today's implementation; §3.4 binds every capability the mission implies, both already built and still latent, to an explicit contract.

### 3.3 Core Responsibilities

- **Layered retrieval** — surface the right memory from the right layer (working, long-term, project, business, knowledge) for the request at hand.
- **Relevance ranking** — ensure the memories surfaced are actually pertinent to the current message, not merely recent or numerous.
- **Automated capture** — extract memory-worthy facts from ordinary conversation without requiring the user to explicitly "save" anything.
- **Business-scoped isolation** — never let one business's facts bleed into another business's context, even when owned by the same user.
- **Maintenance and hygiene** — keep the memory stores from growing unbounded or stale, without deleting anything a user still relies on.
- **Governed persistence** — ensure every memory write is attributable and auditable, consistent with the platform's governance model.

Each responsibility above decomposes into one or more of the eleven capabilities bound to contracts in §3.4.

### 3.4 Core Capability Contracts

Every capability implied by the mission (§3.2) is bound below to an explicit **Capability Contract**, using the field set and maturity scale fixed in Chapter 1 (§3.4) — reproduced there in full; see that chapter for the canonical L0–L5 definitions, not redefined here.

---

#### 3.4.1 Working Memory Construction — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L2 (mature; deliberately the cheapest, most ephemeral layer)

- **Purpose:** Give every request immediate access to the active project, goal, tasks, and recent conversation, without a database round-trip.
- **Authority:** Authorized to read the current in-flight project/goal/tasks state and the last six conversation turns. Not authorized to persist anything — this layer produces no durable record of its own.
- **Responsibilities:** Assemble `buildWorkingMemory`'s bundle on every request that calls `retrieveRelevantMemory`.
- **What This Capability Will Never Do:** Never read another project's or another user's active state; never attempt to persist working memory as if it were long-term memory.
- **Inputs:** The active project, goal, tasks; the last six conversation turns.
- **Outputs:** A working-memory bundle, folded into `RelevantMemoryBundle`.
- **Dependencies:** The Executive Brain's already-resolved project/goal/tasks (Chapter 1.1).
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Deterministic assembly — no ranking or filtering beyond the fixed six-turn window.
- **Success Criteria / KPIs:** Construction latency (should remain negligible, given no I/O).
- **Failure Modes:** None distinct from an upstream failure to resolve the active project/goal/tasks in the first place.
- **Fallback Strategy:** Not applicable — no external call exists to fail.
- **Security Requirements:** Must only ever reflect the requesting user's own active session state.
- **Extension Rules:** The six-turn window may be extended or made adaptive (e.g. token-budget-aware) as an additive change without altering the layer's fundamentally ephemeral, non-persisted nature.

#### 3.4.2 Long-Term Memory Retrieval & Storage — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L2 (mature; growth is in what populates it, via §3.4.7)

- **Purpose:** Remember a user's durable preferences and facts across every project and business they ever work on.
- **Authority:** Authorized to read/write `user_memory`, scoped strictly to the requesting user. Not authorized to write a project- or business-scoped fact into this layer — that is a routing decision made by Automated Memory Capture (§3.4.7).
- **Responsibilities:** Serve `getRelevantLongTermMemory`, capped at 5 entries per retrieval, ranked by Relevance Ranking (§3.4.6).
- **What This Capability Will Never Do:** Never surface another user's `user_memory` rows; never exceed its 5-entry retrieval cap regardless of how many rows match.
- **Inputs:** `userId`; the current message, for ranking.
- **Outputs:** Up to 5 ranked `user_memory` entries, folded into `RelevantMemoryBundle`.
- **Dependencies:** Relevance Ranking (§3.4.6); Memory Maintenance & Decay (§3.4.9) for pruning.
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Retrieval is a scored, capped read; storage is a direct insert routed here by Automated Memory Capture (§3.4.7).
- **Success Criteria / KPIs:** Retrieval precision (fraction of the 5 surfaced entries actually relevant to the current message, currently unmeasured).
- **Failure Modes:** A table-read failure degrades to an empty long-term memory contribution rather than blocking the request.
- **Fallback Strategy:** On read failure, return an empty result for this layer only — the other four layers and the request itself proceed unaffected.
- **Security Requirements:** Every query must filter by the requesting `userId` — no cross-user read path exists or should ever exist here.
- **Extension Rules:** The 5-entry cap and the ranking weights it relies on (§3.4.6) may be tuned as additive configuration changes without altering the underlying table or storage contract.

#### 3.4.3 Project Memory Retrieval & Storage — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L2 (mature; growth is in what populates it, via §3.4.7 and Chapter 1.2 §3.4.6)

- **Purpose:** Remember facts and lessons specific to a single project, so a long-running project doesn't lose context between sessions.
- **Authority:** Authorized to read/write `ash_project_memory`, scoped strictly to the owning project. Not authorized to promote a project-scoped fact to Long-Term or Business Memory on its own — that is a capture-time routing decision (§3.4.7), not a runtime promotion.
- **Responsibilities:** Serve `getRelevantProjectMemory`, capped at 5 entries; accept writes via `addProjectMemory`, including `lesson_learned` entries written by the Planning Engine's Task Outcome Adaptation (Chapter 1.2 §3.4.6) and this chapter's own Automated Memory Capture (§3.4.7).
- **What This Capability Will Never Do:** Never surface another project's memory entries; never accept a write attributed to a project the requesting user does not own.
- **Inputs:** `projectId`; the current message, for ranking.
- **Outputs:** Up to 5 ranked `ash_project_memory` entries.
- **Dependencies:** Relevance Ranking (§3.4.6); consumed by File & Resource Requirement Validation (Chapter 1.3 §3.4.5), which reads this same table for `file_ref` records.
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Retrieval is a scored, capped read; writes arrive from two distinct callers (this chapter's own capture, and the Planning Engine's adaptation logic) into the same table and shape.
- **Success Criteria / KPIs:** Retrieval precision; write volume relative to project length (a proxy for whether the 5-entry cap will eventually need to grow).
- **Failure Modes:** A table-read failure degrades to an empty project-memory contribution.
- **Fallback Strategy:** On read failure, return an empty result for this layer only.
- **Security Requirements:** Every query and write must filter by/attribute to the specific `projectId`, itself resolved through an ownership-checked project lookup upstream.
- **Extension Rules:** This layer is currently outside the Phase A governance/audit contract (§3.9, §3.10) — bringing it in is an additive integration, not a schema or interface change.

#### 3.4.4 Business Memory Retrieval & Storage — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L2 (mature; growth is in field richness, not the isolation mechanism)

- **Purpose:** Maintain one authoritative, structured memory of facts about a specific business — its products, services, audience, and other durable attributes — regardless of which project or conversation a fact was first learned in.
- **Authority:** Authorized to read/write the single `business_memory` row per business, resolved via `systemInstanceId`. Not authorized to overwrite an existing list-typed field wholesale on a new fact — must merge via `mergeBusinessMemory`.
- **Responsibilities:** Serve `getBusinessMemoryForSystemInstance`; merge new facts into existing list fields without data loss.
- **What This Capability Will Never Do:** Never resolve or write to a `business_memory` row for a business the requesting user does not own; never let a merge operation silently drop an existing list entry.
- **Inputs:** `systemInstanceId` (resolved to a specific business).
- **Outputs:** A single structured `business_memory` row, folded into `RelevantMemoryBundle`.
- **Dependencies:** Governance-Compliant Memory Writes (§3.4.10) — this layer's writes are already governed.
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Deterministic merge-on-write for list-typed fields; a direct, single-row read for retrieval — no ranking needed, since there is exactly one row per business.
- **Success Criteria / KPIs:** Merge correctness (no data loss across repeated writes) — qualitatively confirmed by the existence of `mergeBusinessMemory` as a dedicated function, not independently tested in this drafting pass.
- **Failure Modes:** A failed resolution of `systemInstanceId` to a business would degrade to an empty business-memory contribution rather than a request failure.
- **Fallback Strategy:** On read/resolution failure, return an empty result for this layer only.
- **Security Requirements:** `systemInstanceId` resolution must enforce the same business-ownership check already established for Business Coordination (Chapter 1.1 §3.4.10) — verify this is the actual shared code path during Review, not independently confirmed in this drafting pass.
- **Extension Rules:** New structured fields may be added to `business_memory` and its `mergeBusinessMemory` logic as an additive schema change, without altering the one-row-per-business isolation model.

#### 3.4.5 Knowledge Memory Retrieval & Storage — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L2/L3 (mature retrieval; growth is in write-side sophistication, owned by Chapter 1.5)

- **Purpose:** Surface reusable, pattern-level knowledge — playbooks, learned facts about markets or tools — that isn't tied to any single project or business.
- **Authority:** Authorized to read `ash_knowledge_entries`, capped at 3 entries per retrieval. This table's write path is shared with, and substantially owned by, the Research & Knowledge Engine's Knowledge Persistence capability (Chapter 1.5 §3.4.8) — this chapter is not the sole writer.
- **Responsibilities:** Serve `getRelevantKnowledge`, ranked by Relevance Ranking (§3.4.6).
- **What This Capability Will Never Do:** Never exceed its 3-entry retrieval cap; never treat this shared table as if it belonged exclusively to this chapter when reasoning about write conflicts.
- **Inputs:** The current message, for ranking.
- **Outputs:** Up to 3 ranked `ash_knowledge_entries` rows.
- **Dependencies:** Relevance Ranking (§3.4.6); the Research & Knowledge Engine's Knowledge Persistence (Chapter 1.5 §3.4.8), as the other principal writer of this same table.
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Retrieval is a scored, capped read, identical in mechanism to the other four layers; write coordination between this chapter and Chapter 1.5 is not this capability's own logic to define.
- **Success Criteria / KPIs:** Retrieval precision; the same 3-entry cap's adequacy as knowledge volume grows.
- **Failure Modes:** A table-read failure degrades to an empty knowledge contribution.
- **Fallback Strategy:** On read failure, return an empty result for this layer only.
- **Security Requirements:** Knowledge is scoped by `userId`/`businessId` at the row level (per Chapter 1.5's write-side scoping); this layer's reads must honor the same scoping, not treat the table as globally shared.
- **Extension Rules:** Any change to how knowledge entries are written (freshness gates, confidence thresholds) belongs to Chapter 1.5's Knowledge Persistence contract, not this one; this layer's own extension surface is limited to retrieval ranking and cap tuning.

#### 3.4.6 Relevance Ranking & Retrieval Composition — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L3/L4

- **Purpose:** Ensure the memories surfaced across all five layers are the ones actually pertinent to the current request, not simply the most recent or most numerous.
- **Authority:** Authorized to score and rank candidate memories from every layer using the fixed heuristic weighting, and to compose the final `RelevantMemoryBundle` and `contextNote`. Not authorized to alter what gets stored — this capability governs retrieval only.
- **Responsibilities:** Apply the keyword-overlap/importance/confidence/recency weighting to every candidate; enforce each layer's retrieval cap; assemble the final bundle and context note.
- **What This Capability Will Never Do:** Never surface a memory below whatever minimum relevance threshold is in force; never let one layer's ranking logic leak into another layer's cap or scope.
- **Inputs:** Candidate memories from all five layers; the current message.
- **Outputs:** A ranked, capped selection per layer; the composed `RelevantMemoryBundle` and `contextNote`.
- **Dependencies:** All five memory layers (§3.4.1–3.4.5).
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** A fixed heuristic weighting — keyword overlap (60%), importance (20%), confidence (10%), recency (10%), with ~60-day recency decay. No embedding or vector similarity is used today.
- **Success Criteria / KPIs:** Ranking precision/recall against a human's judgment of "actually relevant" (currently unmeasured, and hard to measure without a labeled evaluation set).
- **Failure Modes:** Purely lexical keyword overlap can miss a semantically relevant memory that shares no vocabulary with the current message — the central limitation motivating this capability's L3/L4 target.
- **Fallback Strategy:** Not applicable — this is the ranking layer itself; a ranking bug would need to be caught by testing, not a runtime fallback.
- **Security Requirements:** Ranking must never be the mechanism by which a memory crosses a scoping boundary another layer already enforces — it operates only within each layer's already-scoped candidate set.
- **Extension Rules:** An embedding-based semantic similarity signal may be added as an additive input to the existing weighted score, with the current lexical weighting retained as a fallback signal beneath it, per Upgrade Before Replace — this is the single highest-leverage upgrade available to this chapter.

#### 3.4.7 Automated Memory Capture — Capability Contract
**Current Maturity:** L3 · **Target Maturity:** L3/L4

- **Purpose:** Extract memory-worthy facts from ordinary conversation automatically, so a user never has to explicitly ask ASH to "remember" something for it to actually happen.
- **Authority:** Authorized to run a model call over a completed conversation turn, extract up to three candidate memory items, classify each to a layer, and write items scoring above the importance threshold. Not authorized to block or delay the user-facing response — this capability runs strictly after the SSE stream completes.
- **Responsibilities:** Run `captureAutoMemory` post-response; extract and score candidate items; route each above-threshold item to the correct layer's write path.
- **What This Capability Will Never Do:** Never run synchronously in the user-facing request path; never store an item scoring below the importance threshold of 30; never misattribute a captured fact to the wrong user, project, or business.
- **Inputs:** The completed user message and assistant reply for the turn.
- **Outputs:** Up to three new memory entries, routed to Long-Term (§3.4.2), Project (§3.4.3), or Business (§3.4.4) Memory as classified.
- **Dependencies:** `lib/openrouter` (`MODELS.utility`); the write paths of the three layers it can route into.
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** A single AI call performs extraction, layer classification, and importance scoring together; anything below 30 is discarded.
- **Success Criteria / KPIs:** Extraction-call failure rate; precision of captured items (fraction later judged genuinely worth remembering, currently unmeasured).
- **Failure Modes:** An extraction-call failure silently results in no capture for that turn — a fact the user mentioned may simply never be remembered, with no visible signal that capture was attempted and failed.
- **Fallback Strategy:** On AI-call failure, capture nothing for that turn and log the failure — a deliberate fail-open default, since blocking or retrying synchronously would cost latency on the user-facing path for a background capability.
- **Security Requirements:** Extraction must operate only on the current turn's own user/assistant content — no cross-user or cross-turn data may be included in the extraction call.
- **Extension Rules:** The three-item-per-turn cap and the importance threshold of 30 may be tuned as additive configuration changes; a future outcome-informed (L4) version could adjust the importance threshold per user based on how often their captured memories are later actually surfaced and useful.

#### 3.4.8 Project Completion Lesson Capture — Capability Contract
**Current Maturity:** L3 · **Target Maturity:** L3 (mature; growth is in what consumes these lessons, via Chapter 1.6)

- **Purpose:** Deliberately extract lessons at the moment a project actually concludes, rather than relying solely on turn-by-turn automated capture to have caught everything relevant.
- **Authority:** Authorized to run a model call over a completed project's history at completion time and write resulting lessons into Project Memory (§3.4.3). Not authorized to run at any point other than project completion, and not authorized to write into any layer other than Project Memory.
- **Responsibilities:** Run `recordProjectCompletionLessons` (`learning.ts`) on project completion; extract and write completion-specific lessons.
- **What This Capability Will Never Do:** Never run mid-project; never fabricate a lesson unsupported by the project's actual recorded history.
- **Inputs:** The completed project's full task/outcome history.
- **Outputs:** Lesson entries written to `ash_project_memory` (§3.4.3).
- **Dependencies:** `lib/openrouter` (`MODELS.utility`); triggered by project-completion state managed by the Executive Brain (Chapter 1.1) and Planning Engine (Chapter 1.2).
- **Events Published:** None directly — the triggering `project.completed` event is published by the route layer, per Chapter 1.2 §3.4.9.
- **Events Consumed:** Implicitly triggered by project completion, though whether this is a subscribed event or a direct function call at the completion code path was not independently confirmed in this drafting pass (§3.9).
- **Decision Logic:** A single AI call summarizing the whole project's outcome history into discrete lessons.
- **Success Criteria / KPIs:** Extraction-call failure rate; whether these lessons are ever actually retrieved and used in a future, similar project (currently unmeasured — the retrieval side is Project Memory's own, §3.4.3).
- **Failure Modes:** An extraction-call failure at project completion means that project's lessons are never captured at all, with no retry mechanism named in this drafting pass.
- **Fallback Strategy:** On AI-call failure, log and skip — consistent with this chapter's fail-open posture elsewhere, though the one-time nature of "project completion" makes a missed capture here harder to recover than a missed turn-by-turn capture.
- **Security Requirements:** Must operate only on the completing project's own history — no cross-project data in the extraction call.
- **Extension Rules:** This capability's relationship to the separate ASH Self-Improving Brain's own SQL-based lesson distillation (Chapter 1.6) is an explicit open question (§3.9) — the two are not the same mechanism and should not be conflated without a deliberate decision.

#### 3.4.9 Memory Maintenance & Decay — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L2/L3

- **Purpose:** Keep the memory stores from growing unbounded or accumulating stale, low-value entries, without ever deleting something a user still actively relies on.
- **Authority:** Authorized to prune memories older than 120 days with an importance score below 25, deduplicate `user_memory` rows, and truncate any single memory's content to 600 characters. Not authorized to prune a memory based on age or importance alone if it has been recently retrieved and used — verify this exception exists during Review (§3.9), not independently confirmed in this drafting pass.
- **Responsibilities:** Run on the scheduler's cadence via `runtime/scheduler.ts`; execute pruning, deduplication, and truncation passes.
- **What This Capability Will Never Do:** Never prune a memory that doesn't meet both the age and importance thresholds simultaneously; never truncate a memory in a way that changes its factual meaning (truncation is a length cap, not a summarization).
- **Inputs:** All memory rows across the layers with dedicated tables (Long-Term, Project, Business, Knowledge).
- **Outputs:** Pruned/deduplicated/truncated memory tables.
- **Dependencies:** `runtime/scheduler.ts` for cadence.
- **Events Published:** None.
- **Events Consumed:** None — runs on a fixed schedule, not in response to an event.
- **Decision Logic:** Deterministic thresholding — 120-day age AND sub-25 importance for pruning; raw-SQL-based deduplication for `user_memory` specifically, because the ORM lacked a suitable array-based helper for this case.
- **Success Criteria / KPIs:** Table growth rate over time relative to active user/business count (a proxy for whether current thresholds are keeping pace).
- **Failure Modes:** A maintenance pass failure would leave stale/duplicate data in place until the next successful run, rather than corrupting anything — a safe failure mode.
- **Fallback Strategy:** Not applicable in the availability sense — this is a background hygiene job; a failed run simply means maintenance is deferred to the next scheduled pass.
- **Security Requirements:** Must operate identically regardless of which user/business owns a given row — no differential treatment that could constitute a fairness or privacy issue.
- **Extension Rules:** Thresholds (120 days, importance 25, 600-character cap) may be tuned as additive configuration changes; the raw-SQL deduplication path for `user_memory` should be revisited if the ORM gains a suitable array helper, per standard engineering hygiene, but is explicitly not urgent.

#### 3.4.10 Governance-Compliant Memory Writes — Capability Contract
**Current Maturity:** L2 (partial — two of four persisted layers) · **Target Maturity:** L2 (full coverage across all persisted layers)

- **Purpose:** Ensure every memory write is attributable to its true owner and recorded in an audit trail, consistent with the Business Intelligence ownership and audit governance model established in Phase A.
- **Authority:** Authorized to route Business Memory (§3.4.4) and Knowledge Memory (§3.4.5) writes through the Data Access Layer (`lib/governance/writes/`) for ownership stamping and audit-trail recording. Not yet authorized — because not yet built — to do the same for Long-Term Memory (§3.4.2) or Project Memory (§3.4.3) writes, which remain outside this governance layer today.
- **Responsibilities:** Ensure Business and Knowledge Memory writes carry ownership metadata and generate an audit record; extend the same treatment to Long-Term and Project Memory as a target-state responsibility.
- **What This Capability Will Never Do:** Never allow a governed layer's write to bypass the Data Access Layer through a secondary, ungoverned code path; never silently claim governance coverage for a layer that doesn't actually have it — this contract states plainly which two layers remain uncovered today.
- **Inputs:** A write request to any of the four persisted memory layers.
- **Outputs:** An ownership-stamped, audit-logged write (for Business and Knowledge Memory today); a plain, ungoverned write (for Long-Term and Project Memory today).
- **Dependencies:** `lib/governance/writes/` (the Data Access Layer, Phase A).
- **Events Published:** Audit-trail records, per the Phase A governance model's own mechanism (owned by that governance chapter, not restated here).
- **Events Consumed:** None.
- **Decision Logic:** Which layer's writes are governed today is a fact of current implementation, not a designed rule — Business and Knowledge Memory happened to be brought under governance in Phase A; Long-Term and Project Memory were not yet in scope.
- **Success Criteria / KPIs:** Percentage of persisted memory writes that are governed (currently 2 of 4 layers, i.e. roughly half by layer count, not necessarily by write volume).
- **Failure Modes:** An ungoverned write to Long-Term or Project Memory today has no audit trail — if a dispute or investigation ever required "who wrote this memory and when," those two layers could not answer it as reliably as the other two.
- **Fallback Strategy:** Not applicable — this is a coverage gap, not a runtime failure mode with a fallback.
- **Security Requirements:** Any future extension to Long-Term/Project Memory governance must use the exact same Data Access Layer already proven for Business/Knowledge Memory, not a second, parallel governance mechanism.
- **Extension Rules:** Bringing Long-Term and Project Memory writes under the Data Access Layer is a pure additive integration — reusing the exact mechanism already live for the other two layers — and is the single most direct way to close this chapter's largest named governance gap, per Upgrade Before Replace.

#### 3.4.11 Cross-Business Memory Isolation — Capability Contract
**Current Maturity:** L2 (isolation enforced for standard retrieval; `crossBusinessMode`'s exact semantics unconfirmed) · **Target Maturity:** L2/L3

- **Purpose:** Guarantee that a user who owns multiple businesses never has one business's memory bleed into another's context, while still allowing a deliberate, explicit cross-business view when the user actually wants one.
- **Authority:** Authorized to resolve Business Memory strictly by `systemInstanceId` for standard retrieval, and to honor an explicit `crossBusinessMode` flag when set. Not authorized to default to cross-business retrieval — isolation must be the default, and any broadening must be explicit and user-initiated.
- **Responsibilities:** Enforce single-business scoping on every standard `retrieveRelevantMemory` call; define and enforce the actual authorization boundary of `crossBusinessMode` when it is set.
- **What This Capability Will Never Do:** Never resolve a business's memory the requesting user does not own, in any mode; never treat `crossBusinessMode` as a way to bypass ownership checks — at most, it should broaden retrieval across the *requesting user's own* multiple businesses, never any other user's.
- **Inputs:** `businessId`/`systemInstanceId`; the `crossBusinessMode` flag; `userId`.
- **Outputs:** A business-memory contribution scoped to one business (standard mode) or the user's own multiple businesses (cross-business mode).
- **Dependencies:** Business Memory Retrieval & Storage (§3.4.4); the same ownership-verification pattern established for Business Coordination (Chapter 1.1 §3.4.10).
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Not fully confirmed in this drafting pass — the presence of `crossBusinessMode` as a named parameter is established, but its exact resolution logic (which businesses it includes, and how ownership is re-verified for each) was not traced to source in this pass and is the subject of §3.9.
- **Success Criteria / KPIs:** Zero cross-user isolation violations (a hard requirement, not a target to trend toward); user-reported usefulness of cross-business mode where legitimately used.
- **Failure Modes:** If `crossBusinessMode`'s authorization boundary is looser than intended, a user with multiple businesses (or, worse, any user) could see another business's memory unintentionally — this is the single highest-severity risk named in this chapter.
- **Fallback Strategy:** Any ambiguity in `crossBusinessMode`'s resolution should default to the narrower, single-business behavior, never the broader one, until its exact semantics are confirmed during Review.
- **Security Requirements:** This is the chapter's most security-critical capability; `crossBusinessMode`'s exact implementation must be independently verified against the same ownership-check pattern used everywhere else in the platform before this chapter can be considered compliance-ready.
- **Extension Rules:** Any broadening of what `crossBusinessMode` can access must be implemented as an explicit, auditable extension of the existing single-business ownership check — never a separate, parallel authorization path.

### 3.5 Inputs (Engine-level aggregate)

*The per-capability Inputs above are the authoritative detail; this section is the aggregate view across the whole subsystem.*

- **From the Executive Brain (Chapter 1.1) and Planning Engine (Chapter 1.2):** the active project, goal, tasks, `userId`, `businessId`, and conversation history for the current request.
- **Persisted state read at retrieval time:** `user_memory`, `ash_project_memory`, `business_memory`, `ash_knowledge_entries`.
- **Cross-chapter writes into shared layers:** `lesson_learned` entries from the Planning Engine's Task Outcome Adaptation (Chapter 1.2 §3.4.6) into Project Memory; knowledge entries from the Research & Knowledge Engine's Knowledge Persistence (Chapter 1.5 §3.4.8) into Knowledge Memory.
- **Conversation content:** the completed user message and assistant reply, for Automated Memory Capture (§3.4.7).

### 3.6 Outputs (Engine-level aggregate)

*The per-capability Outputs above are the authoritative detail; this section is the aggregate view across the whole subsystem.*

- **`RelevantMemoryBundle` and `contextNote`** — folded into the same forwarded message the Executive Brain and Planning Engine append their own context notes to.
- **Persisted state writes:** `user_memory`, `ash_project_memory`, `business_memory`, `ash_knowledge_entries` (the last shared with Chapter 1.5).
- **Governance side effects:** ownership-stamped, audit-logged writes for Business and Knowledge Memory (§3.4.10).
- **Outbox events:** `task.completed`, `project.completed`, published from the route layer, not from within `lib/memory-engine/` itself.

### 3.7 Integration Map

| Subsystem | Direction | Nature of the integration |
|---|---|---|
| Executive Brain (Chapter 1.1) | Executive Brain → Memory Engine | Calls `retrieveRelevantMemory` before response generation and `captureAutoMemory` after the SSE stream completes. |
| Planning Engine (Chapter 1.2) | Planning Engine → Memory Engine | `adaptation.ts`'s Task Outcome Adaptation (§3.4.6 there) writes `lesson_learned` entries directly into Project Memory via `addProjectMemory`. |
| Validation Engine (Chapter 1.3) | Validation Engine → Memory Engine | `file-requirement-rule.ts` (§3.4.5 there) reads `ashProjectMemoryTable` for `file_ref` records. |
| Research & Knowledge Engine (Chapter 1.5) | Research Engine ↔ Memory Engine | Both subsystems read and write `ash_knowledge_entries` — this chapter's Knowledge Memory layer (§3.4.5) is retrieval-focused; Chapter 1.5's Knowledge Persistence (§3.4.8 there) owns the insert/update decision logic. |
| ASH Self-Improving Brain (Chapter 1.6) | Not integrated today | `ash_lessons` (Chapter 1.6's own distillation table) is entirely separate from this chapter's memory tables; Project Completion Lesson Capture's (§3.4.8) relationship to that subsystem is an explicit open question (§3.9). |
| Business Intelligence Governance / Data Access Layer (Phase A) | Memory Engine → Governance | Business Memory and Knowledge Memory writes are routed through it; Long-Term and Project Memory writes are not yet integrated (§3.4.10). |
| `runtime/scheduler.ts` | Scheduler → Memory Engine | Drives Memory Maintenance & Decay's (§3.4.9) periodic pruning/deduplication/truncation pass. |

### 3.8 Future Growth

The following extension points would allow the Memory Engine to grow toward the mission in §3.2 without redesigning its current five-layer architecture, consistent with the Upgrade Before Replace law. This list is superseded in detail by each capability contract's own Extension Rules field in §3.4; it is retained here as a single cross-cutting summary.

- **Semantic relevance ranking** (§3.4.6): an embedding-based similarity signal added additively above the existing lexical weighting — the single highest-leverage upgrade available to this chapter.
- **Full governance coverage** (§3.4.10): extending the Data Access Layer to Long-Term and Project Memory writes, reusing the exact mechanism already proven for Business and Knowledge Memory.
- **Confirmed cross-business boundary** (§3.4.11): formally documenting and, if necessary, hardening `crossBusinessMode`'s exact authorization semantics.
- **Outcome-informed capture tuning** (§3.4.7): adjusting the importance threshold per user based on how often their captured memories are later actually retrieved and used.

### 3.9 Open Architecture Questions

The following require review and a decision before any related implementation work proceeds — they are flagged here, not resolved:

1. What is the exact authorization boundary of `crossBusinessMode` (§3.4.11) — does it ever resolve businesses beyond the requesting user's own, and is this independently verified against the platform's standard ownership-check pattern?
2. Should Long-Term Memory and Project Memory writes (§3.4.10) be brought under the Data Access Layer as a near-term priority, given that Business and Knowledge Memory already are, and the mechanism to reuse already exists?
3. What is the precise relationship between Project Completion Lesson Capture (§3.4.8, this chapter) and the ASH Self-Improving Brain's own SQL-based distillation (Chapter 1.6)? Are these two genuinely independent lesson-generation mechanisms, and if so, should a future capability reconcile or cross-reference them?
4. Is Project Completion Lesson Capture (§3.4.8) triggered by a subscribed `project.completed` event, or called directly at the completion code path? This affects whether a capture failure is retryable via the event system or is a one-time, unrecoverable miss.
5. Should the Knowledge Memory layer (§3.4.5) and the Research & Knowledge Engine's Knowledge Persistence (Chapter 1.5 §3.4.8) have an explicit, documented write-conflict policy, given that both can write to `ash_knowledge_entries`?
6. Is the 60-day recency decay and the 60/20/10/10 relevance weighting (§3.4.6) the right balance, or should it be tunable per user/business based on how much history is actually available and useful?
7. Should Memory Maintenance & Decay (§3.4.9) skip pruning a memory that has been recently retrieved and actually used, even if it meets the age/importance thresholds — i.e. should retrieval frequency itself be an input to the pruning decision?

### 3.10 Architecture Summary

*This section closes out the Architecture stage of this chapter's lifecycle. It consolidates the chapter's own findings; it does not introduce new architecture beyond what §3.1–3.9 already establish.*

**Current maturity assessment.** Of the eleven capabilities bound to contracts in §3.4, ten are implemented today (Working Memory Construction and the four layer-specific Retrieval & Storage capabilities at L2; Relevance Ranking & Retrieval Composition at L2; Automated Memory Capture and Project Completion Lesson Capture at L3; Memory Maintenance & Decay at L2; Governance-Compliant Memory Writes at a partial L2 covering two of four layers; Cross-Business Memory Isolation at L2 with an unconfirmed boundary). None is entirely absent (L0) — this chapter's mission is already substantially realized in breadth, and its open questions are concentrated in depth, correctness, and governance completeness rather than missing capabilities outright. In short: the Memory Engine today reliably retrieves and captures layered context using deterministic and lexical methods; the mission in §3.2 additionally requires semantic (not merely lexical) relevance, full governance coverage across all four persisted layers, and a confirmed, hardened cross-business isolation boundary.

| Maturity band | Capabilities |
|---|---|
| L3 (AI-assisted, implemented) | Automated Memory Capture, Project Completion Lesson Capture |
| L2 (deterministic, implemented) | Working Memory Construction, Long-Term Memory Retrieval & Storage, Project Memory Retrieval & Storage, Business Memory Retrieval & Storage, Knowledge Memory Retrieval & Storage, Relevance Ranking & Retrieval Composition, Memory Maintenance & Decay, Governance-Compliant Memory Writes (partial), Cross-Business Memory Isolation (boundary unconfirmed) |
| L0 (absent) | None |

**Deferred architectural decisions.** All seven items in §3.9 are formally deferred pending the project owner's review; none has been decided in this chapter. Item #1 (the exact `crossBusinessMode` boundary) is the highest-priority item in this chapter, given its direct bearing on cross-user/cross-business data isolation — the platform's most serious class of failure.

**Risks.**
- **Unconfirmed cross-business boundary** (§3.4.11, §3.9 item 1): the single highest-severity risk in this chapter — an unverified `crossBusinessMode` implementation is a plausible vector for one business's data appearing in another's context.
- **Partial governance coverage** (§3.4.10): Long-Term and Project Memory writes remain outside the Phase A Data Access Layer, unlike Business and Knowledge Memory — an inconsistency that should be closed, not left as a permanent asymmetry.
- **Lexical-only ranking ceiling** (§3.4.6): keyword-overlap-based relevance will systematically miss semantically related but differently-worded context, capping retrieval quality regardless of how much data accumulates.
- **Dual lesson-generation ambiguity** (§3.4.8, §3.9 item 3): this chapter's Project Completion Lesson Capture and the separate ASH Self-Improving Brain (Chapter 1.6) both generate "lessons" from project/business outcomes via different mechanisms, with no documented relationship between them.

**Future roadmap** *(sequencing only; no phase is authorized by this chapter)*:
- **Near-term candidate:** independently verify and, if necessary, harden `crossBusinessMode`'s (§3.4.11) authorization boundary — the highest-priority item in this chapter given its security implications.
- **Near-term candidate:** extend Governance-Compliant Memory Writes (§3.4.10) to Long-Term and Project Memory, reusing the existing Data Access Layer mechanism.
- **Mid-term candidate:** add semantic relevance ranking (§3.4.6) as an additive signal alongside the existing lexical weighting.
- **Mid-term candidate:** resolve §3.9 item 3 and document the relationship between this chapter's lesson capture and Chapter 1.6's distillation.
- **Ongoing, not phase-gated:** tuning the recency-decay and relevance-weighting constants (§3.9 item 6) can proceed independently of the above sequencing.

**Chapter approval checklist.** For the project owner's use in deciding whether to move this chapter to the Architecture Review stage:
- [ ] The mission statement (§3.2) is confirmed as an accurate statement of long-term intent for the Memory Engine.
- [ ] All eleven Capability Contracts (§3.4) have been read, and their Authority/Never-Do boundaries are confirmed correct.
- [ ] `crossBusinessMode`'s (§3.4.11) actual authorization semantics have been independently verified against source, not merely documented from its named existence.
- [ ] The seven Open Architecture Questions (§3.9) each have either a decision or an explicit "defer to a later chapter/cycle" disposition.
- [ ] The partial governance coverage (§3.4.10) and the dual lesson-generation ambiguity (§3.4.8, §3.9 item 3) are acknowledged as named risks, with a disposition recorded.
- [ ] The Future Roadmap sequencing (above) is confirmed as a reasonable order, or reordered by the project owner.
- [ ] No implementation, refactor, or code change has occurred as part of this chapter — confirmed.
- [ ] The chapter is approved to proceed to Stage 2 (Architecture Review), or returned with specific requested changes.

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
