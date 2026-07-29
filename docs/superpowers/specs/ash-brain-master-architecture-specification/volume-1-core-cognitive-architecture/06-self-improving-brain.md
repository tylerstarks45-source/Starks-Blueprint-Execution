# 1.6 — ASH Self-Improving Brain (Lesson Distillation)

**Status:** Architecture Drafted — Draft (Volume 1 batch; pending architectural review)
**Volume:** 1 — Core Cognitive Architecture
**Last Updated:** 2026-07-29

**Template note:** This chapter follows the structure, quality bar, and Capability Contract format locked in [Chapter 1.1 — Executive Brain](./01-executive-brain.md) (see `00-INDEX.md`, "Chapter Template"). Per the project owner's 2026-07-29 workflow update, this chapter is drafted in a single pass and left in Draft status alongside the rest of Volume 1, rather than paused individually for approval. It has twelve capability contracts, reflecting a subsystem that is architecturally compact but operationally significant — a scheduled, concurrency-safe, privacy-bounded distillation job with several distinct consumers.

---

## 1. Purpose & Scope

This chapter is the permanent architecture reference for the ASH Self-Improving Brain — the subsystem that distills the platform's own aggregate outcome history (revenue, health scores, tool usage, across every business and blueprint) into concise, honest, per-scope lessons that ground the platform's recommendations and plans in what has actually worked, rather than in a model's unverified assumption. It documents the subsystem exactly as it exists today, defines its long-term mission, and binds every capability implied by that mission — implemented and latent alike — to an explicit Capability Contract. Per the Upgrade Before Replace law, no replacement of any existing component is proposed anywhere in this chapter; every future-state contract below explicitly reuses or extends an existing seam in the current implementation. No implementation, code change, or refactor is proposed or performed by this chapter.

## 2. Baseline Reference

See Master X-RAY §1.4 (ASH Self-Improving Brain) for the summary-level as-built description (`lib/ash-brain.ts`, the `AshBrain` class, SQL-based distillation into `ash_lessons`). This chapter documents a subsystem that is deliberately, entirely free of model calls in its own distillation path — a materially different design from every other chapter in this volume, and a distinction preserved throughout this chapter rather than treated as a gap to close.

## 3. Architecture

### 3.1 Current Architecture Summary

*This section documents the ASH Self-Improving Brain exactly as it exists today. It is not redesigned here.*

**The `AshBrain` class.** The subsystem's implementation is a single class, `AshBrain` (`lib/ash-brain.ts`), exposing a small set of public methods: `runDistillation` (the core distillation job), `retrieveRelevantLessons` (consumption-time ranked retrieval), `formatLessonsForPrompt` (prompt-ready serialization), and `getBrainOverview` (aggregate reporting for admin/UI use).

**Distillation is genuinely, entirely SQL-based.** `runDistillation` computes lessons via deterministic SQL aggregation and TypeScript arithmetic — no model call occurs anywhere in the distillation path. It draws from `system_instances` (the base entity), `businesses` (niche/business type), `blueprints` and `blueprint_categories` (category names), `system_activity_events` (filtered to `event_type = 'revenue'`, summed as `amount_cents`), `business_health_scores` (the latest `overall_health` via a lateral join), and `user_tool_selections`/`tools` (for tool-name aggregation). This is a deliberate, load-bearing design choice, explicitly documented in the codebase: the platform's own claims about "what works" must be traceable to real aggregate data, never to an LLM's own unverifiable synthesis.

**The `ash_lessons` table.** Each row represents one distilled scope — `scope_type` (`niche`, `blueprint_category`, or `tool`), `scope_key`, `scope_label`, `sample_size`, `success_count`, `total_revenue_cents`, `avg_revenue_cents`, `avg_health`, `top_tools` (JSONB), `outcome`, a templated `summary`, a computed `confidence`, a `metrics` JSONB column, and `last_distilled_at`.

**Outcome classification and confidence.** A scope is classified `emerging` if its sample size is below 3 or its confidence is below 25; otherwise `proven` if its success ratio is at least 0.5, `promising` if its success ratio is above zero but below `proven`'s bar, and `struggling` if its success ratio is exactly zero. Confidence is computed as `100 × volumeFactor × (0.35 + 0.65 × successRatio)`, where `volumeFactor` saturates at a sample size of 8 (`min(1, sampleSize / 8)`) — meaning confidence can never be artificially inflated by sample size alone once past that floor, and always remains grounded in the actual success ratio.

**Consumption.** Two distinct call sites consult `AshBrain` today: `lib/runtime/worker.ts`'s `handleBusinessImprovementPass`, which weights growth recommendations by retrieved lessons, and `routes/ai-orchestrator.ts`, which consults lessons during plan generation and chat to ground the model's own system prompt in learned patterns. `formatLessonsForPrompt` explicitly instructs the model not to fabricate results if the retrieved lesson data is insufficient — a guardrail against the model overriding the very honesty this subsystem exists to provide.

**Scheduled cadence and manual override.** `lib/runtime/scheduler.ts` runs `processBrainDistillation` on a fixed 24-hour cadence (`BRAIN_DISTILL_INTERVAL_MS`), tracked via a last-run timestamp persisted in the `scheduler_state` table — the same custom scheduler loop (60-second poll interval) that drives the Planning Engine's readiness re-evaluation cadence and other periodic platform jobs. A separate, admin-only manual trigger exists at `POST /api/ai-orchestrator/brain/distill` for on-demand re-distillation outside the normal cadence.

**Concurrency safety.** `runDistillation` acquires a Postgres advisory lock (`pg_try_advisory_lock(831299312)`) before running; if a concurrent run is already in progress (whether from the scheduler or the manual trigger), the new attempt skips entirely rather than waiting or queuing — a deliberate "skip, don't block" design, using the same underlying Postgres advisory-lock mechanism already used elsewhere in the platform's own self-improvement mutex (Executive Brain, Chapter 1.1), though this is a materially distinct lock and lock key, not a shared one.

**Stale-lesson pruning.** Each distillation pass explicitly deletes any `ash_lessons` row whose `scope_type`/`scope_key` combination was not re-encountered in the current pass — the mechanism by which a lesson naturally disappears when its underlying business, project, or blueprint is deleted, rather than lingering as an orphaned, misleading record.

**Privacy-preserving aggregation is an explicit, load-bearing design boundary.** The codebase carries an explicit comment establishing that this subsystem distills aggregate patterns across many businesses, never a single user's private data — every `ash_lessons` row represents a scope (a niche, a blueprint category, a tool), never an individual business or user, by construction. This is treated in this chapter as a security/privacy requirement, not merely a design note (§3.4.10).

**Authorization.** Because `ash_lessons` rows are global, cross-user aggregates by design, there is no per-user or per-business ownership check on read — every row is, by definition, safe for any authenticated context to consult, since no row can be traced back to a single business's private figures. This is a fundamentally different authorization model from every other chapter in this volume, all of which enforce per-user/per-business scoping; this chapter's safety instead rests entirely on the aggregation boundary itself never being violated.

### 3.2 ASH Self-Improving Brain Mission

The ASH Self-Improving Brain's long-term mission within the AI Business Operating System is to be **the platform's honest, ever-growing record of what actually works** — a store of evidence-grounded, non-fabricated lessons about which niches, blueprint categories, and tools genuinely produce results, distilled directly from the platform's own accumulated outcome history rather than from any model's synthesized guess. Where the Research & Knowledge Engine (Chapter 1.5) brings in ground truth from the outside world, this subsystem is the platform's ground truth about itself — what its own users have actually experienced, in aggregate, at scale. As the platform's collective outcome history grows, this subsystem is the layer responsible for making sure that growth actually makes every user's recommendations better, not merely making the platform's own dataset larger without ever putting it to use. This mission is deliberately larger than today's implementation; §3.4 binds every capability the mission implies, both already built and still latent, to an explicit contract.

### 3.3 Core Responsibilities

- **Evidence-grounded distillation** — turn raw outcome data into per-scope lessons using deterministic math, never model synthesis.
- **Honest confidence signaling** — ensure a lesson's stated confidence genuinely reflects its underlying sample size and success ratio, never inflated.
- **Consumption-ready delivery** — make lessons easy and safe for other subsystems to retrieve, rank, and inject into a model prompt without risk of fabrication.
- **Operational reliability** — run on a predictable cadence, safely under concurrent triggers, without ever corrupting or duplicating its own output.
- **Lifecycle hygiene** — remove lessons whose underlying data no longer exists, rather than let them linger as stale, misleading records.
- **Privacy-preserving aggregation** — never let a lesson be traceable back to a single business's or user's private data.

Each responsibility above decomposes into one or more of the twelve capabilities bound to contracts in §3.4.

### 3.4 Core Capability Contracts

Every capability implied by the mission (§3.2) is bound below to an explicit **Capability Contract**, using the field set and maturity scale fixed in Chapter 1 (§3.4) — reproduced there in full; see that chapter for the canonical L0–L5 definitions, not redefined here.

---

#### 3.4.1 Deterministic Lesson Distillation — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L2 (mature; deliberately, permanently model-free — see Extension Rules)

- **Purpose:** Turn raw platform-wide outcome data into per-scope aggregate statistics, using nothing but deterministic SQL and arithmetic, so every downstream lesson is fully traceable to real data.
- **Authority:** Authorized to read `system_instances`, `businesses`, `blueprints`/`blueprint_categories`, `system_activity_events`, `business_health_scores`, and `user_tool_selections`/`tools`, and to compute aggregate statistics per scope. Not authorized to make any model call as part of this computation, under any circumstance.
- **Responsibilities:** Run `runDistillation`; compute `sample_size`, `success_count`, `total_revenue_cents`, `avg_revenue_cents`, `avg_health`, and `top_tools` per scope.
- **What This Capability Will Never Do:** Never call an LLM as part of computing these statistics; never compute a statistic that cannot be traced back to a specific SQL aggregation over real rows; never distill a scope with a sample size that would violate the privacy-preserving aggregation boundary (§3.4.10).
- **Inputs:** The six source tables named above, across the entire platform (not scoped to a single user).
- **Outputs:** Per-scope aggregate statistics, feeding Outcome Classification & Confidence Scoring (§3.4.2).
- **Dependencies:** The platform's own transactional tables listed above; no dependency on any AI/model provider.
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Pure SQL aggregation and arithmetic — fully deterministic, fully re-runnable, and reproducible given the same underlying data.
- **Success Criteria / KPIs:** Distillation run duration relative to platform data volume; zero model-call incidents in this code path (a hard requirement, not a trend to improve).
- **Failure Modes:** A source-table schema change (e.g. a renamed column) could silently break an aggregation query; a slow query against a growing `system_activity_events` table could extend run duration over time.
- **Fallback Strategy:** A failed distillation run should leave the existing `ash_lessons` table entirely unchanged (no partial overwrite) and be retried on the next scheduled cadence — verify this is the actual current behavior during Review (§3.9), not independently confirmed in this drafting pass.
- **Security Requirements:** Must never aggregate at a granularity fine enough to identify a single business or user — see Privacy-Preserving Aggregation Boundary (§3.4.10) for the explicit safeguard this depends on.
- **Extension Rules:** This capability must remain permanently, deliberately free of model calls — any future enhancement to distillation quality must be achieved through better SQL/statistical methods, never by introducing an LLM into this specific code path, per this chapter's own explicit design commitment (not merely a target-state Upgrade Before Replace preference, but a standing architectural constraint).

#### 3.4.2 Outcome Classification & Confidence Scoring — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L2 (mature; growth is in threshold calibration, not the mechanism)

- **Purpose:** Turn raw per-scope statistics into an honest, easily-consumed classification (`proven`, `promising`, `struggling`, `emerging`) and a confidence value that genuinely reflects how much evidence backs it.
- **Authority:** Authorized to classify a scope using the fixed rule set (sample size < 3 or confidence < 25 → `emerging`; success ratio ≥ 0.5 → `proven`; success ratio > 0 → `promising`; success ratio = 0 → `struggling`) and to compute confidence via the fixed formula. Not authorized to classify a scope as `proven` or `promising` without a genuine, computed success ratio backing it.
- **Responsibilities:** Apply the classification rules and confidence formula to every scope's aggregate statistics from Deterministic Lesson Distillation (§3.4.1).
- **What This Capability Will Never Do:** Never let sample size alone (independent of actual success ratio) inflate confidence past what `volumeFactor`'s saturation at 8 samples permits; never classify a scope as `proven` on a thin sample that should instead read as `emerging`.
- **Inputs:** Per-scope `sample_size`, `success_count` (and derived success ratio) from §3.4.1.
- **Outputs:** `outcome` and `confidence` values per `ash_lessons` row.
- **Dependencies:** Deterministic Lesson Distillation (§3.4.1).
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** A fixed, deterministic rule set and formula — `confidence = 100 × min(1, sampleSize/8) × (0.35 + 0.65 × successRatio)`.
- **Success Criteria / KPIs:** Calibration — whether a `proven` classification with high confidence actually correlates with genuinely strong future outcomes (an inherently long-horizon metric, not measurable in a single distillation pass).
- **Failure Modes:** The fixed thresholds (3 samples, confidence 25, success ratio 0.5) are a static design choice; as platform scale grows, these thresholds may need recalibration to remain meaningful, and there is no self-tuning mechanism today.
- **Fallback Strategy:** Not applicable — a pure, deterministic computation with no external call to degrade.
- **Security Requirements:** None beyond what Deterministic Lesson Distillation (§3.4.1) already enforces on its inputs.
- **Extension Rules:** The fixed thresholds and formula constants may be tuned as an additive configuration change, provided the underlying principle — confidence must always be grounded in actual success ratio, never sample size alone — is preserved.

#### 3.4.3 Lesson Retrieval & Consumption Ranking — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L2/L3

- **Purpose:** Let a consuming subsystem retrieve the most relevant lessons for its specific context (a business type, a blueprint category, a stated goal), ranked so the most pertinent evidence surfaces first.
- **Authority:** Authorized to score and rank `ash_lessons` rows against a caller's `businessType`, `blueprintCategory`, and `goalText`, and return the top-ranked subset. Not authorized to fabricate or interpolate a lesson for a scope that has no distilled row.
- **Responsibilities:** Run `retrieveRelevantLessons`; score exact matches highest (100/90 points), keyword overlap next (30-40 points), with confidence and outcome as tie-breakers.
- **What This Capability Will Never Do:** Never return a lesson for a scope with no corresponding `ash_lessons` row; never rank a lower-confidence lesson above a higher-confidence one for an otherwise equally relevant match.
- **Inputs:** `businessType`, `blueprintCategory`, `goalText` (caller-provided context).
- **Outputs:** A ranked subset of `ash_lessons` rows.
- **Dependencies:** `ash_lessons` (populated by §3.4.1–3.4.2).
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** A deterministic scoring heuristic — exact-match bonuses, keyword-overlap scoring, confidence/outcome tie-breaking.
- **Success Criteria / KPIs:** Retrieval precision (fraction of returned lessons actually relevant to the caller's context, currently unmeasured).
- **Failure Modes:** A caller with an unusual or highly specific `businessType`/`goalText` combination not well-matched by any distilled scope receives no strongly relevant lessons — a coverage gap, not a bug.
- **Fallback Strategy:** When no strong match exists, the documented behavior is to fall back to "the strongest general lessons" available (a named comment in the codebase, §3.10) — a general-prior fallback, not an empty result.
- **Security Requirements:** None beyond the global, aggregate-only nature of `ash_lessons` itself (§3.4.10) — no per-caller authorization is needed since every row is safe for any context.
- **Extension Rules:** The scoring heuristic's exact/keyword/tie-break weighting may be tuned, or upgraded to embedding-based semantic matching (mirroring the same upgrade path named for the Memory Engine's Relevance Ranking, Chapter 1.4 §3.4.6), as an additive layer above the existing heuristic.

#### 3.4.4 Prompt-Ready Lesson Formatting (Anti-Fabrication Guardrail) — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L2 (mature; this capability is intentionally simple by design)

- **Purpose:** Turn retrieved lessons into a prompt-ready text block that explicitly instructs the consuming model never to fabricate results when the actual data is insufficient — closing the loop between this subsystem's own honesty guarantee and how a downstream model actually uses its output.
- **Authority:** Authorized to serialize retrieved lessons (§3.4.3) into a formatted string block, including an explicit anti-fabrication instruction. Not authorized to alter the underlying lesson data during formatting — a pure presentation transform.
- **Responsibilities:** Run `formatLessonsForPrompt`; include the anti-fabrication instruction unconditionally, regardless of how many or how few lessons were retrieved.
- **What This Capability Will Never Do:** Never omit the anti-fabrication instruction, even when lessons were successfully retrieved; never present a lesson's confidence or outcome in a way that overstates what the underlying data actually supports.
- **Inputs:** The ranked lesson subset from §3.4.3.
- **Outputs:** A formatted prompt-block string, consumed by the AI Orchestrator and the Runtime Job Worker.
- **Dependencies:** Lesson Retrieval & Consumption Ranking (§3.4.3).
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Deterministic string templating — no model call.
- **Success Criteria / KPIs:** Consumer compliance with the anti-fabrication instruction (an inherently hard-to-measure downstream metric, dependent on the consuming model's own behavior, not this capability's).
- **Failure Modes:** A consuming model could still choose to ignore the anti-fabrication instruction — this capability can only instruct, not enforce, since enforcement would require inspecting the model's own eventual output, which is out of scope for this subsystem.
- **Fallback Strategy:** Not applicable — a pure deterministic formatting step.
- **Security Requirements:** None beyond what §3.4.3 already provides.
- **Extension Rules:** The formatting template may be revised for clarity or conciseness as an additive change, provided the anti-fabrication instruction is never weakened or removed.

#### 3.4.5 Brain Overview Aggregation (Admin/UI Reporting) — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L2 (mature; growth is in reporting richness, not the mechanism)

- **Purpose:** Give an administrator or an internal dashboard a top-level view of the platform's collective learned evidence — aggregate revenue, average confidence, and the top lessons overall — without requiring a direct database query.
- **Authority:** Authorized to compute and return platform-wide aggregate statistics and a top-N lesson list. Not authorized to expose any information that would violate the privacy-preserving aggregation boundary (§3.4.10) — the same constraint every other capability in this chapter respects.
- **Responsibilities:** Run `getBrainOverview(limit)`; aggregate total revenue and average confidence across `ash_lessons`; return the top N lessons.
- **What This Capability Will Never Do:** Never surface a business- or user-identifiable figure as part of this overview — only scope-level aggregates.
- **Inputs:** `limit` (how many top lessons to return).
- **Outputs:** Aggregate platform statistics; a top-N lesson list.
- **Dependencies:** `ash_lessons` (populated by §3.4.1–3.4.2).
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Deterministic aggregation and sorting — no model call.
- **Success Criteria / KPIs:** Query latency at scale (a proxy for whether this endpoint remains suitable for a live dashboard as `ash_lessons` grows).
- **Failure Modes:** A very large `ash_lessons` table could make this aggregation slower over time without an index or materialized-view strategy — not confirmed as a current problem, but a plausible future one.
- **Fallback Strategy:** Not applicable — a direct, synchronous read-and-aggregate step.
- **Security Requirements:** Access to this endpoint should itself be gated to admin roles at the route layer (verify during Review, §3.9 — not independently confirmed in this drafting pass, though the aggregate-only nature of the underlying data limits the severity of any gap here).
- **Extension Rules:** Additional aggregate views (e.g. trend-over-time, per-scope-type breakdowns) may be added as additive query variants without altering the underlying `ash_lessons` schema.

#### 3.4.6 Scheduled Distillation Cadence — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L2 (mature; growth is in cadence tuning, not the mechanism)

- **Purpose:** Keep `ash_lessons` reasonably current without requiring anyone to remember to trigger distillation manually.
- **Authority:** Authorized to invoke `processBrainDistillation` once every 24 hours via the platform's own scheduler loop, tracking the last-run timestamp in `scheduler_state`. Not authorized to run distillation more frequently than the configured interval via this path — that is Manual Distillation Trigger's exclusive role (§3.4.7).
- **Responsibilities:** Register with `runtime/scheduler.ts`'s 60-second poll loop; fire distillation when the 24-hour interval has elapsed since the last recorded run.
- **What This Capability Will Never Do:** Never fire distillation twice within the same 24-hour window through this scheduled path; never lose track of the last-run timestamp across a server restart, since it is persisted in `scheduler_state`, not in memory.
- **Inputs:** The current time; the last-recorded `scheduler_state` timestamp for this job.
- **Outputs:** A triggered `runDistillation` call, subject to Concurrency-Safe Distillation's (§3.4.8) advisory lock.
- **Dependencies:** `runtime/scheduler.ts`; `scheduler_state` table.
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Deterministic interval comparison against a persisted timestamp.
- **Success Criteria / KPIs:** Cadence adherence (actual time between successful distillation runs staying close to 24 hours); zero missed cycles due to server restarts.
- **Failure Modes:** A server restart mid-cycle should not cause a double-fire or a missed cycle, given the persisted timestamp — this is the same class of concern named in the platform's own scheduled-task-duplication task tracking, and this chapter's `scheduler_state` persistence is the relevant safeguard.
- **Fallback Strategy:** If a scheduled fire is missed for any reason, the next poll cycle (within 60 seconds) will re-evaluate and fire as soon as the interval has genuinely elapsed — self-correcting rather than requiring manual recovery.
- **Security Requirements:** None — a purely internal, non-user-triggered scheduling mechanism.
- **Extension Rules:** The 24-hour interval may be tuned as an additive configuration change without altering the underlying scheduler-registration mechanism.

#### 3.4.7 Manual Distillation Trigger (Admin Override) — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L2 (mature; growth is in access-control confirmation, see §3.9)

- **Purpose:** Let an administrator force a fresh distillation pass on demand — for debugging, immediately after a data correction, or ahead of a scheduled cadence — without waiting for the next 24-hour cycle.
- **Authority:** Authorized to invoke `runDistillation` directly via `POST /api/ai-orchestrator/brain/distill`, subject to the same advisory-lock concurrency guard as the scheduled path (§3.4.8). Not authorized to bypass that concurrency guard — a manual trigger during an in-progress scheduled run must still skip, not force a concurrent second run.
- **Responsibilities:** Expose the admin-only manual trigger route; invoke the same `runDistillation` entry point as the scheduler.
- **What This Capability Will Never Do:** Never run a second concurrent distillation pass alongside an already-in-progress one, whether the other pass was scheduled or manual; never be reachable by a non-admin caller.
- **Inputs:** An admin-authenticated HTTP request.
- **Outputs:** A triggered `runDistillation` call (or a skip, if one is already in progress).
- **Dependencies:** Concurrency-Safe Distillation (§3.4.8); the platform's admin-role authentication/authorization middleware.
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** A direct, unconditional call to the same distillation entry point the scheduler uses — no separate logic path exists for "manual" distillation beyond the trigger mechanism itself.
- **Success Criteria / KPIs:** Zero unauthorized-access incidents on this route (a hard requirement, not a trend); usage frequency (a proxy for whether admins actually need this override in practice).
- **Failure Modes:** If admin-role gating on this route were ever misconfigured, any authenticated user could force a distillation run — low severity given the read-only, aggregate-only nature of the operation itself, but still an availability/cost-abuse concern worth confirming.
- **Fallback Strategy:** Not applicable — a direct route invocation with no external call to degrade beyond `runDistillation` itself.
- **Security Requirements:** This route's admin-only gating should be independently verified during Review (§3.9) — not independently confirmed against source in this drafting pass.
- **Extension Rules:** This capability should continue to invoke the exact same `runDistillation` entry point as the scheduled path (§3.4.6), never a parallel or abbreviated distillation routine, to guarantee manual and scheduled runs always produce identical, trustworthy results.

#### 3.4.8 Concurrency-Safe Distillation (Advisory Lock) — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L2 (mature; this capability is intentionally simple by design)

- **Purpose:** Guarantee that two distillation passes — whether both scheduled, both manual, or one of each — can never run concurrently and corrupt or duplicate `ash_lessons` output.
- **Authority:** Authorized to acquire a Postgres advisory lock (`pg_try_advisory_lock(831299312)`) before any distillation run, and to skip the run entirely if the lock is already held. Not authorized to wait or queue for the lock — the design is skip, not block.
- **Responsibilities:** Wrap `runDistillation`'s actual work in an advisory-lock acquisition attempt; release the lock on completion (success or failure).
- **What This Capability Will Never Do:** Never allow two distillation passes to write to `ash_lessons` concurrently; never hold the lock indefinitely on a crashed or hung run — Postgres advisory locks are session-scoped and release automatically if the holding session ends, which is the relevant safety property here (verify this is the actual behavior in this specific implementation during Review, not independently confirmed in this drafting pass).
- **Inputs:** A distillation-run request, from either the scheduler (§3.4.6) or the manual trigger (§3.4.7).
- **Outputs:** Either a completed distillation run, or a clean skip with no side effects.
- **Dependencies:** Postgres's own advisory-lock mechanism.
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** A `pg_try_advisory_lock` call — non-blocking, returns immediately whether or not the lock was acquired.
- **Success Criteria / KPIs:** Zero concurrent-write incidents on `ash_lessons` (a hard requirement); skip frequency (how often a scheduled and manual trigger genuinely overlap in practice).
- **Failure Modes:** If the specific lock key (`831299312`) were ever accidentally reused by an unrelated piece of code elsewhere in the platform, this mechanism's guarantee would silently weaken — worth confirming the key is uniquely reserved during Review.
- **Fallback Strategy:** A skipped run due to lock contention is not an error state — it is retried naturally on the next scheduled cycle (§3.4.6) or the next manual trigger (§3.4.7).
- **Security Requirements:** None beyond database-level access already required to run distillation at all.
- **Extension Rules:** This capability's lock key and skip-don't-block design should not be changed without a clear reason — it is a simple, proven pattern already reused from the platform's own Executive Brain self-improvement mutex (Chapter 1.1), and any future queuing/waiting behavior would be a deliberate, separate design decision, not an incidental change.

#### 3.4.9 Stale Lesson Pruning — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L2 (mature; this capability is intentionally simple by design)

- **Purpose:** Ensure a lesson never outlives the data that justified it — when a business, project, or blueprint disappears, any lesson scoped to it that is no longer re-encountered in a fresh distillation pass is removed, not left as a stale, misleading record.
- **Authority:** Authorized to delete any `ash_lessons` row whose `scope_type`/`scope_key` was not re-encountered in the current distillation pass. Not authorized to delete a row that *was* re-encountered, however low its resulting confidence or sample size — a low-confidence current lesson is still a real, current lesson, distinct from a stale one.
- **Responsibilities:** Run as the final step of `runDistillation`, after all current scopes have been computed; delete any row not present in the current pass's scope set.
- **What This Capability Will Never Do:** Never delete a lesson still backed by real, current data; never run independently of a full distillation pass — pruning is a byproduct of a complete, fresh computation, not a separate maintenance job with its own schedule.
- **Inputs:** The full set of scopes computed in the current distillation pass (§3.4.1); the full existing `ash_lessons` table.
- **Outputs:** A pruned `ash_lessons` table containing only currently-justified rows.
- **Dependencies:** Deterministic Lesson Distillation (§3.4.1), whose current-pass scope set this capability diffs against.
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** A set-difference operation — delete anything in the old table not present in the new pass's scope set.
- **Success Criteria / KPIs:** Zero orphaned lessons persisting more than one distillation cycle past their underlying data's deletion.
- **Failure Modes:** If a distillation pass itself fails partway through (§3.4.1's fallback strategy), pruning must not run against an incomplete scope set — verify the pruning step only executes after a fully successful computation, during Review (§3.9).
- **Fallback Strategy:** A failed distillation pass should skip pruning entirely, leaving the existing `ash_lessons` table (including any lessons that would otherwise have been pruned) unchanged until the next successful pass.
- **Security Requirements:** None beyond what §3.4.1 already enforces on the underlying data.
- **Extension Rules:** This capability's tight coupling to a complete distillation pass (rather than an independent scheduled prune) is a deliberate correctness guarantee and should be preserved in any future change.

#### 3.4.10 Privacy-Preserving Aggregation Boundary — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L2 (mature; this is a standing constraint, not a growth axis)

- **Purpose:** Guarantee that no `ash_lessons` row, no matter how it is computed, ranked, formatted, or reported, can ever be traced back to a single business's or user's private outcome data.
- **Authority:** Authorized to require that every distilled scope (`niche`, `blueprint_category`, `tool`) represent an aggregate over multiple businesses, never a single one. Not authorized — under any future extension request — to add a scope type or reporting view that could identify an individual business or user's figures.
- **Responsibilities:** Enforce (by construction, in how scopes are defined) that distillation never produces a business- or user-level row; this is a cross-cutting constraint every other capability in this chapter (§3.4.1–3.4.9) must respect, not a separate runtime check layered on top.
- **What This Capability Will Never Do:** Never permit a scope definition granular enough to identify a single business, even indirectly (e.g. a `scope_type` of "business" would violate this boundary outright); never expose a per-business figure through Brain Overview Aggregation (§3.4.5) or any other reporting surface.
- **Inputs:** The scope-type design itself (`niche`, `blueprint_category`, `tool`) — this capability's actual "input" is an architectural constraint on every other capability's design, not runtime data.
- **Outputs:** The ongoing guarantee that `ash_lessons` remains safe to consult from any authenticated context without an ownership check, which is precisely what makes Lesson Retrieval & Consumption Ranking's (§3.4.3) authorization-free design correct.
- **Dependencies:** Every capability in this chapter that touches `ash_lessons`'s schema or scope definitions.
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Not a runtime decision — this is an architectural constraint enforced by the fixed set of scope types themselves, verified by code review and this chapter's own audit process rather than a checkable runtime assertion.
- **Success Criteria / KPIs:** Zero instances, ever, of a business- or user-identifiable figure appearing in `ash_lessons` or any of its consuming surfaces — a hard requirement, not a trend to improve.
- **Failure Modes:** The only realistic failure mode is a future change introducing a new scope type or reporting view that violates this boundary without anyone recognizing the violation — the risk is process/review failure, not a runtime bug.
- **Fallback Strategy:** Not applicable — this is a design invariant, not a runtime behavior with a degraded mode.
- **Security Requirements:** This is itself the chapter's central security requirement; every other capability's own "Security Requirements" field should be read as subordinate to this one.
- **Extension Rules:** Any future scope type, reporting view, or consumption path must be reviewed explicitly against this boundary before being added — this is the one capability in this chapter where Upgrade Before Replace's normal "extend freely" posture is deliberately constrained by a standing, non-negotiable privacy requirement.

#### 3.4.11 Consumption Integration (Recommendations & Planning Grounding) — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L2/L3

- **Purpose:** Make sure the lessons this subsystem distills actually change what the platform recommends and how it plans, rather than existing as an unused, purely internal dataset.
- **Authority:** Authorized to be consulted by `lib/runtime/worker.ts`'s `handleBusinessImprovementPass` and `routes/ai-orchestrator.ts`'s plan generation/chat flow. Not authorized to itself alter a recommendation or plan — this subsystem only supplies grounding context; the decision to act on it belongs entirely to the consuming subsystem.
- **Responsibilities:** Provide `retrieveRelevantLessons`/`formatLessonsForPrompt` output to both named call sites at the correct point in their own logic.
- **What This Capability Will Never Do:** Never be silently bypassed by a consuming subsystem that could have consulted it but didn't, without that being a visible, reviewable design choice at the call site, not an accidental omission.
- **Inputs:** Consumption requests from the two named call sites, each supplying their own `businessType`/`blueprintCategory`/`goalText` context.
- **Outputs:** Formatted lesson context, folded into each consumer's own prompt or scoring logic.
- **Dependencies:** Lesson Retrieval & Consumption Ranking (§3.4.3); Prompt-Ready Lesson Formatting (§3.4.4).
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Not this capability's own — each consumer decides how to weight or use the supplied lessons; this capability's contract is limited to supplying them correctly.
- **Success Criteria / KPIs:** Coverage (fraction of recommendation/planning decisions that actually consult this subsystem, versus those that could but don't); measurable improvement in recommendation quality attributable to lesson grounding (long-horizon, not measurable in a single pass).
- **Failure Modes:** A new recommendation-generating or planning-adjacent subsystem introduced elsewhere in the platform could simply never wire in a consultation to this subsystem, silently missing the grounding it was designed to provide.
- **Fallback Strategy:** If a consultation call fails, each consumer's own fallback logic applies — this subsystem's own contract is to fail in a way that degrades to "no lessons available," not a crash, consistent with the anti-fabrication guardrail already built into §3.4.4.
- **Security Requirements:** None beyond what §3.4.10 already guarantees for all `ash_lessons` consumption.
- **Extension Rules:** Any new subsystem whose output would benefit from evidence-grounded lessons (e.g. a future Business Health Analysis capability, or a future Planning Engine risk-scoring upgrade) should be wired to this exact consultation pattern, per Upgrade Before Replace, rather than building a parallel "what works" mechanism.

#### 3.4.12 AI-Assisted Lesson Narration — Capability Contract (target capability)
**Current Maturity:** L0 (the current `summary` field is a fixed `switch(outcome)` template, not AI-generated) · **Target Maturity:** L3

- **Purpose:** Make a lesson's `summary` field read as a genuinely informative, specific narrative rather than one of four fixed template strings selected purely by `outcome` classification.
- **Authority (target):** Authorized to run a model call over a scope's own computed statistics (§3.4.1–3.4.2) to generate a more specific, readable summary sentence. Never authorized to introduce any statistic, claim, or number into the summary that isn't already present in the scope's own deterministically-computed data — this capability may only narrate existing numbers more naturally, never invent new ones.
- **Responsibilities (target):** Generate a natural-language summary grounded strictly in the scope's own `sample_size`, `success_count`, revenue figures, and `top_tools`; fall back to the existing fixed template on any AI-call failure.
- **What This Capability Will Never Do:** Never let this narration step introduce any figure, claim, or comparison not directly derivable from the scope's own already-computed statistics — this would reintroduce exactly the fabrication risk Deterministic Lesson Distillation (§3.4.1) was designed to avoid; never replace or bypass the deterministic distillation math itself (§3.4.1) — this capability only narrates its output, never computes it.
- **Inputs (target):** A scope's own computed statistics (§3.4.1–3.4.2) — nothing else.
- **Outputs (target):** A generated `summary` string, replacing the fixed-template version, with the fixed template retained as the guaranteed fallback.
- **Dependencies (target):** `lib/openrouter` (`MODELS.utility`); Deterministic Lesson Distillation (§3.4.1) and Outcome Classification & Confidence Scoring (§3.4.2), as the sole source of truth this narration must stay grounded in.
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Not designed; whether narration should run at distillation time (cached in the row) or at retrieval time (generated fresh per consumption) is an open question (§3.9), not decided here.
- **Success Criteria / KPIs (proposed):** Zero instances of a narrated summary introducing a figure not present in the underlying scope's own statistics (a hard requirement, not a trend); qualitative readability improvement over the fixed-template baseline, once built.
- **Failure Modes:** An AI-call failure at narration time must not affect the underlying lesson data (§3.4.1–3.4.2) in any way — this capability sits strictly downstream of, and never inside, the distillation path itself.
- **Fallback Strategy:** On AI-call failure, use the existing fixed `switch(outcome)` template exactly as it works today — this is the permanent, guaranteed fallback for this capability, per Upgrade Before Replace.
- **Security Requirements:** Because narration is grounded only in already-aggregate, already-privacy-safe statistics (§3.4.10), no new security exposure is introduced by adding this capability, provided the "never invent a new figure" constraint above is genuinely enforced.
- **Extension Rules:** This capability is itself the extension point; it must be built strictly as an additive narration layer over Deterministic Lesson Distillation's (§3.4.1) existing, unchanged output — the SQL-based math this chapter is built around must never be replaced or bypassed by this or any future upgrade.

### 3.5 Inputs (Engine-level aggregate)

*The per-capability Inputs above are the authoritative detail; this section is the aggregate view across the whole subsystem.*

- **Platform-wide source tables:** `system_instances`, `businesses`, `blueprints`/`blueprint_categories`, `system_activity_events` (revenue events), `business_health_scores`, `user_tool_selections`/`tools` — read across the entire platform, not scoped to a single user.
- **Consumption-time context:** `businessType`, `blueprintCategory`, `goalText`, supplied by the two named consuming call sites (§3.4.11).
- **Scheduling/trigger inputs:** the scheduler's 24-hour cadence (§3.4.6) and the admin manual trigger (§3.4.7).

### 3.6 Outputs (Engine-level aggregate)

*The per-capability Outputs above are the authoritative detail; this section is the aggregate view across the whole subsystem.*

- **`ash_lessons` rows** — the subsystem's primary durable output, refreshed on every successful distillation pass.
- **Formatted, prompt-ready lesson context** — supplied to the Runtime Job Worker and AI Orchestrator (§3.4.11).
- **Brain Overview aggregates** — for admin/UI reporting (§3.4.5).
- **No events, tables outside `ash_lessons`, or side effects on any other subsystem's own data** — this chapter's blast radius is deliberately narrow and entirely contained within its own table.

### 3.7 Integration Map

| Subsystem | Direction | Nature of the integration |
|---|---|---|
| Runtime Job Worker (`lib/runtime/worker.ts`) | Runtime Worker → Self-Improving Brain | `handleBusinessImprovementPass` consults `AshBrain` to weight growth recommendations. |
| AI Orchestrator (`routes/ai-orchestrator.ts`) | AI Orchestrator → Self-Improving Brain | Consulted during plan generation and chat to ground the model's system prompt; also hosts the admin manual-trigger route (§3.4.7). |
| `runtime/scheduler.ts` | Scheduler → Self-Improving Brain | Drives the 24-hour distillation cadence (§3.4.6), the same scheduler loop used by other periodic platform jobs. |
| Business Intelligence (source data) | Business Intelligence → Self-Improving Brain (read-only) | `business_health_scores` and `system_activity_events` are read as source data for distillation; this chapter has no write access to, and no other integration with, Business Intelligence's own subsystems. |
| Memory Engine (Chapter 1.4) / Research & Knowledge Engine (Chapter 1.5) | Not integrated today | Both are independent "the platform learned something" mechanisms with no cross-reference to this chapter's distillation — named as an open question from both directions (Chapter 1.4 §3.9 item 3; Chapter 1.5 §3.9 item 7). |
| Executive Brain (Chapter 1.1) self-improvement mutex | Prior art, not a shared mechanism | Both this chapter's Concurrency-Safe Distillation (§3.4.8) and the Executive Brain's own self-improving mechanism use Postgres advisory locks, but with distinct lock keys — architecturally similar, operationally independent. |

### 3.8 Future Growth

The following extension points would allow the ASH Self-Improving Brain to grow toward the mission in §3.2 without redesigning its current SQL-first architecture, consistent with the Upgrade Before Replace law. This list is superseded in detail by each capability contract's own Extension Rules field in §3.4; it is retained here as a single cross-cutting summary.

- **AI-Assisted Lesson Narration** (§3.4.12): an additive narration layer strictly downstream of the existing deterministic distillation math, never a replacement for it.
- **Semantic lesson retrieval** (§3.4.3): an embedding-based upgrade to the existing keyword/exact-match scoring heuristic, mirroring the same upgrade path named for the Memory Engine (Chapter 1.4 §3.4.6).
- **Broader consumption integration** (§3.4.11): wiring future recommendation- or planning-adjacent subsystems into this exact consultation pattern as they are built, rather than each inventing its own "what works" mechanism.
- **Cross-chapter lesson reconciliation** (§3.7): resolving, in one place, the open relationship between this chapter's distillation and the Memory Engine's/Research Engine's own lesson-adjacent mechanisms, closing an open question already raised from three different chapters.

### 3.9 Open Architecture Questions

The following require review and a decision before any related implementation work proceeds — they are flagged here, not resolved:

1. What is the actual relationship between this chapter's SQL-based distillation and the Memory Engine's Project Completion Lesson Capture (Chapter 1.4 §3.4.8) and the Research & Knowledge Engine's knowledge distillation (Chapter 1.5)? All three are independent "the platform learned something" mechanisms; should any be reconciled, cross-referenced, or unified in a future chapter?
2. Should AI-Assisted Lesson Narration (§3.4.12) generate its narrative at distillation time (cached in the row, refreshed every 24 hours) or at retrieval time (generated fresh per consultation, at the cost of added latency and model-call volume)?
3. Is `POST /api/ai-orchestrator/brain/distill` (§3.4.7) actually gated to admin roles at the route layer, and is this independently verified, given the low but non-zero severity of an unauthorized caller being able to force a distillation run?
4. Does a failed distillation pass (§3.4.1) genuinely leave `ash_lessons` entirely unchanged, or is there any risk of a partial write under specific failure conditions (e.g. a crash mid-transaction)?
5. Is the advisory-lock key (`831299312`, §3.4.8) confirmed to be uniquely reserved for this subsystem, with no risk of collision with an unrelated advisory lock elsewhere in the platform?
6. As platform scale grows, will the fixed classification thresholds (sample size 3, confidence 25, success ratio 0.5, §3.4.2) and the volume-factor saturation point (8 samples) need recalibration to remain meaningful, and who owns deciding when that recalibration is warranted?
7. Should Brain Overview Aggregation (§3.4.5) gain a materialized-view or caching strategy as `ash_lessons` grows, to keep its admin/UI reporting latency low?

### 3.10 Architecture Summary

*This section closes out the Architecture stage of this chapter's lifecycle. It consolidates the chapter's own findings; it does not introduce new architecture beyond what §3.1–3.9 already establish.*

**Current maturity assessment.** Of the twelve capabilities bound to contracts in §3.4, eleven are implemented today, all at L2 (Deterministic Lesson Distillation, Outcome Classification & Confidence Scoring, Lesson Retrieval & Consumption Ranking, Prompt-Ready Lesson Formatting, Brain Overview Aggregation, Scheduled Distillation Cadence, Manual Distillation Trigger, Concurrency-Safe Distillation, Stale Lesson Pruning, Privacy-Preserving Aggregation Boundary, Consumption Integration). One is entirely latent (AI-Assisted Lesson Narration, L0). This is the flattest, most uniform maturity profile of any chapter in this volume so far — a direct consequence of this subsystem's deliberate, load-bearing design commitment to remain genuinely model-free in its core distillation path. In short: the ASH Self-Improving Brain today reliably turns real platform outcome data into honest, confidence-scored, privacy-safe lessons on a predictable cadence, and reliably feeds them into the two subsystems that currently consult it; the mission in §3.2 additionally requires broader consumption coverage across future recommendation- and planning-adjacent subsystems, and — optionally, carefully — more readable narration without ever compromising the evidence-grounded core that makes this subsystem trustworthy in the first place.

| Maturity band | Capabilities |
|---|---|
| L2 (deterministic, implemented) | Deterministic Lesson Distillation, Outcome Classification & Confidence Scoring, Lesson Retrieval & Consumption Ranking, Prompt-Ready Lesson Formatting, Brain Overview Aggregation, Scheduled Distillation Cadence, Manual Distillation Trigger, Concurrency-Safe Distillation, Stale Lesson Pruning, Privacy-Preserving Aggregation Boundary, Consumption Integration |
| L0 (absent) | AI-Assisted Lesson Narration |

**Deferred architectural decisions.** All seven items in §3.9 are formally deferred pending the project owner's review; none has been decided in this chapter. Item #1 (the three-way relationship between this chapter's distillation and the Memory Engine's and Research Engine's own lesson-adjacent mechanisms) is the highest-leverage cross-chapter item in this entire volume, since it has now been independently raised from three separate chapters.

**Risks.**
- **Unresolved three-way lesson-mechanism overlap** (§3.9 item 1): this chapter, the Memory Engine (Chapter 1.4), and the Research & Knowledge Engine (Chapter 1.5) each independently generate or store "what was learned" without any documented relationship between them — a plausible source of future confusion about which mechanism is authoritative for what.
- **Admin-route gating unconfirmed** (§3.4.7, §3.9 item 3): the manual distillation trigger's access control was not independently verified against source in this drafting pass.
- **Static classification thresholds** (§3.4.2, §3.9 item 6): the fixed thresholds and saturation point have no self-tuning mechanism and may need manual recalibration as platform scale grows.
- **Fabrication risk in any future narration layer** (§3.4.12): explicitly named and constrained in this chapter precisely because it is the most obvious way this subsystem's honesty guarantee could be accidentally weakened by a well-intentioned future enhancement.

**Future roadmap** *(sequencing only; no phase is authorized by this chapter)*:
- **Near-term candidate:** confirm the manual-trigger admin gating (§3.9 item 3) and the advisory-lock key's uniqueness (§3.9 item 5) during Review — both are low-cost verification items.
- **Near-term candidate:** resolve §3.9 item 1 — document (or formally decide against reconciling) the relationship between this chapter's distillation and the Memory/Research Engines' own lesson-adjacent mechanisms.
- **Mid-term candidate:** build AI-Assisted Lesson Narration (§3.4.12), starting with distillation-time (cached) generation as the lower-latency, lower-cost option, per §3.9 item 2.
- **Mid-term candidate:** wire additional recommendation-/planning-adjacent subsystems into Consumption Integration's (§3.4.11) existing pattern as they are built.
- **Ongoing, not phase-gated:** monitoring classification-threshold calibration (§3.9 item 6) as platform scale grows can proceed independently of the above sequencing.

**Chapter approval checklist.** For the project owner's use in deciding whether to move this chapter to the Architecture Review stage:
- [ ] The mission statement (§3.2) is confirmed as an accurate statement of long-term intent for the ASH Self-Improving Brain.
- [ ] All twelve Capability Contracts (§3.4) have been read, and their Authority/Never-Do boundaries are confirmed correct.
- [ ] The permanent, deliberate model-free constraint on Deterministic Lesson Distillation (§3.4.1) and the Privacy-Preserving Aggregation Boundary (§3.4.10) are confirmed as standing constraints, not open questions.
- [ ] The seven Open Architecture Questions (§3.9) each have either a decision or an explicit "defer to a later chapter/cycle" disposition.
- [ ] The three-way lesson-mechanism overlap with the Memory Engine (Chapter 1.4) and Research & Knowledge Engine (Chapter 1.5) is acknowledged as a named cross-chapter risk, with a disposition recorded.
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
