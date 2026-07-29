# 1.5 — Research & Knowledge Engine

**Status:** Architecture Drafted — Draft (Volume 1 batch; pending architectural review)
**Volume:** 1 — Core Cognitive Architecture
**Last Updated:** 2026-07-29

**Template note:** This chapter follows the structure, quality bar, and Capability Contract format locked in [Chapter 1.1 — Executive Brain](./01-executive-brain.md) (see `00-INDEX.md`, "Chapter Template"). Per the project owner's 2026-07-29 workflow update, this chapter is drafted in a single pass and left in Draft status alongside the rest of Volume 1, rather than paused individually for approval. It has twelve capability contracts, spanning its full pipeline (intent, planning, gathering, deduplication, scoring, summarization, persistence) plus its two forward-looking extension points.

---

## 1. Purpose & Scope

This chapter is the permanent architecture reference for the Research & Knowledge Engine — the subsystem that turns a user's need for external, real-world information into a scored, structured, and reusable piece of knowledge, without re-researching the same question every time it comes up. It documents the subsystem exactly as it exists today, defines its long-term mission, and binds every capability implied by that mission — implemented and latent alike — to an explicit Capability Contract. Per the Upgrade Before Replace law, no replacement of any existing component is proposed anywhere in this chapter; every future-state contract below explicitly reuses or extends an existing seam in the current implementation. No implementation, code change, or refactor is proposed or performed by this chapter.

## 2. Baseline Reference

See Master X-RAY §1.7 (Research & Knowledge Engine) for the summary-level as-built description (`lib/research-engine/`, `lib/search-providers/`). This chapter shares the `ash_knowledge_entries` table with the Memory Engine's Knowledge Memory layer (Chapter 1.4 §3.4.5) — this chapter is authoritative for how entries in that table get created and updated; Chapter 1.4 is authoritative for how they get retrieved and ranked for use in a live conversation. See §3.7 for the precise boundary.

## 3. Architecture

### 3.1 Current Architecture Summary

*This section documents the Research & Knowledge Engine exactly as it exists today. It is not redesigned here.*

**Entry point and control flow.** The subsystem's entry point is `runResearchEngine` in `lib/research-engine/index.ts`, called from `routes/executive-brain.ts` immediately after `runPlanningEngine` (Chapter 1.2). It accepts a `ResearchRequest` (`userId`, `projectId`, `researchType`, `objective`) and runs a fixed, ordered pipeline:

1. **Knowledge Lookup** (`knowledge-lookup.ts`, `findReusableKnowledge`) — checks for an existing knowledge entry that is both fresh (within a staleness window) and high-confidence (`REUSE_CONFIDENCE_THRESHOLD = 70`). If found, the entire remaining pipeline is skipped and the existing entry is returned directly — this is the subsystem's single most important cost- and latency-saving mechanism.
2. **Research Planning** (`planner.ts`, `generateResearchPlan`) — an AI call (`MODELS.utility`) generates 2-4 search queries; a deterministic `fallbackPlan` exists for when the AI call fails, so planning never fully halts the pipeline.
3. **Information Gathering** (`gatherer.ts`) — executes the generated queries via the Search Provider Abstraction (§3.1, Search Provider layer below).
4. **Finding Deduplication** (`removeDuplicateFindings`) — removes near-duplicate findings using Jaccard similarity over text shingles, at a 0.5 similarity threshold.
5. **Source Reliability Scoring** (`scoreAllSources`) — assigns each source a reliability score using fixed tiers (90 for `.gov`/`.edu` domains, 80 for recognized data-publication sources, 35 for sources with no clear citation).
6. **Structured Summarization** (`summarizer.ts`, `generateStructuredSummary`) — an AI call synthesizes the deduplicated, scored findings into a structured object (title, summary, key findings, tags, confidence score), using `PROFILE_INSTRUCTIONS` to produce a type-specific "profile" for certain research types (e.g. competitor profiles).
7. **Knowledge Persistence** (`knowledge-writer.ts`, `saveOrUpdateKnowledgeMemory`) — decides whether to insert a new `ash_knowledge_entries` row or update an existing one, gated by `MIN_CONFIDENCE_TO_SAVE = 40` (a result below this confidence is not persisted at all).

**Failure handling is fail-open end to end.** The entire pipeline runs inside a single try/catch in `runResearchEngine`; any failure at any step returns a `failed`-status result with a context note explaining the failure, rather than throwing or blocking the caller. The Executive Brain route treats a research failure exactly like any other non-fatal subsystem outcome — the user's request proceeds regardless.

**Research intent detection.** `intent.ts` matches the incoming request against `RESEARCH_TYPE_PATTERNS` — a fixed set of categories (competitor, market, SEO, trend, and others) — deliberately narrower than the platform's lightweight, always-on search capability, specifically to avoid triggering a full multi-step research pipeline for a question that a single quick lookup could answer.

**Two distinct reuse checks exist for a reason.** `findReusableKnowledge` (pre-research, gates whether research runs at all) requires both freshness and a 70-confidence bar; `findExistingEntryForTopic` (post-research, used only to decide insert vs. update once research has already run) is a looser, relevance-only match with no confidence bar. This mirrors a documented platform-wide pattern (see this chapter's own §3.9 and the Memory Engine's parallel design) of using a stricter bar for "skip work entirely" than for "don't create a duplicate row."

**Search Provider Abstraction.** `lib/search-providers/index.ts` defines a `PROVIDER_PRIORITY` fallback chain: `tavily-provider.ts` (gated on `TAVILY_API_KEY`), `serper-provider.ts` (gated on `SERPER_API_KEY`), and `perplexity-provider.ts` (the default, using OpenRouter's `MODELS.research`, requiring no separate per-provider API key). `searchWeb` iterates the priority list and falls through to the next available provider on failure — this is the same Platform Registry & Search Provider Abstraction pattern already named in this project's memory as a cross-cutting design principle: never hardcode a provider or a platform list.

**AI/model usage.** Three of the seven pipeline steps involve a model call: Research Planning (query generation, with a deterministic fallback), Information Gathering (when routed to the Perplexity provider specifically, which itself performs AI-assisted synthesis as part of returning results), and Structured Summarization (the final synthesis step). The other four steps — Knowledge Lookup, Deduplication, Reliability Scoring, and Knowledge Persistence's insert/update decision — are entirely deterministic.

**Database interaction.** Reads/writes `ash_knowledge_entries` (shared with the Memory Engine, Chapter 1.4 §3.4.5), `ash_research_sessions`, and `ash_research_profiles`.

**Authorization.** Knowledge entries are scoped by `userId` and, when available, `businessId`, at write time. Both `insertKnowledgeEntry` and `updateKnowledgeEntry` are described by this chapter's own investigation as "governance-aware" functions — consistent with the Memory Engine's own Phase A governance integration for this same shared table (Chapter 1.4 §3.4.10).

**Existing extension points.** `RESEARCH_TYPE_PATTERNS` (intent categories), `PROVIDER_PRIORITY` (search provider chain), and `RELIABILITY_TIERS` (source-scoring tiers) are all named, additive extension points in the current implementation — none requires touching the pipeline's control flow to extend.

### 3.2 Research & Knowledge Engine Mission

The Research & Knowledge Engine's long-term mission within the AI Business Operating System is to be **the platform's connection to ground truth outside its own accumulated data** — the subsystem responsible for going out into the world, finding real, current, sourced information, and turning it into reusable knowledge the rest of the platform can draw on without re-researching the same question every time it recurs. Where the Memory Engine (Chapter 1.4) remembers what has already been learned about a specific user or business, the Research & Knowledge Engine is how anything genuinely new — a competitor's current pricing, a market trend, a platform's current policy — gets learned in the first place, scored for reliability, and made reusable. As ASH is trusted to make more consequential business recommendations, this subsystem is the layer responsible for making sure those recommendations are grounded in real, current, sourced information rather than a model's unverified assumption. This mission is deliberately larger than today's implementation; §3.4 binds every capability the mission implies, both already built and still latent, to an explicit contract.

### 3.3 Core Responsibilities

- **Intent recognition** — trigger full research only when a request genuinely warrants it, not for every question that mentions a fact.
- **Reuse-first economics** — never re-research a question the platform already has fresh, confident knowledge about.
- **Provider-resilient information gathering** — retrieve real information from the web via a resilient, swappable chain of providers.
- **Quality control** — deduplicate redundant findings and weight sources by actual reliability before synthesizing anything.
- **Structured synthesis** — turn raw findings into a scored, structured, reusable knowledge artifact, not just a prose answer.
- **Reusable persistence** — decide correctly between creating new knowledge and updating stale existing knowledge.
- **Fail-open integration** — never let a research failure block or degrade the user's underlying request.

Each responsibility above decomposes into one or more of the twelve capabilities bound to contracts in §3.4.

### 3.4 Core Capability Contracts

Every capability implied by the mission (§3.2) is bound below to an explicit **Capability Contract**, using the field set and maturity scale fixed in Chapter 1 (§3.4) — reproduced there in full; see that chapter for the canonical L0–L5 definitions, not redefined here.

---

#### 3.4.1 Research Intent Detection — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L2/L3

- **Purpose:** Trigger the full, comparatively expensive research pipeline only when a request genuinely warrants it, keeping the platform's lightweight search capability as the default for simple questions.
- **Authority:** Authorized to classify an incoming request against `RESEARCH_TYPE_PATTERNS` and decide whether to invoke `runResearchEngine` at all. Not authorized to itself perform any research — a classification-only capability.
- **Responsibilities:** Pattern-match the request against fixed research-type categories; gate pipeline invocation.
- **What This Capability Will Never Do:** Never trigger the full pipeline for a request better served by a quick, single-provider lookup; never silently expand its own category list without a documented addition.
- **Inputs:** The user's request/objective text.
- **Outputs:** A boolean trigger decision plus a classified `researchType`.
- **Dependencies:** `RESEARCH_TYPE_PATTERNS` (fixed category list).
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Deterministic pattern matching, deliberately narrower than general search-trigger detection to control cost.
- **Success Criteria / KPIs:** False-positive rate (triggering full research for a request a quick lookup would have served); false-negative rate (missing a request that genuinely warranted research).
- **Failure Modes:** Novel phrasing of a genuine research need may not match any pattern and fail to trigger.
- **Fallback Strategy:** Not applicable — a missed trigger simply means the request falls through to the platform's default lightweight search behavior, not a broken state.
- **Security Requirements:** None beyond reading the request text already available to this rule.
- **Extension Rules:** New research-type categories are added to `RESEARCH_TYPE_PATTERNS` directly, without altering the pipeline downstream of the trigger decision.

#### 3.4.2 Knowledge Reuse Lookup — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L2/L3

- **Purpose:** Never spend the cost and latency of a full research pass when the platform already has fresh, confident knowledge on the exact same question.
- **Authority:** Authorized to check `ash_knowledge_entries` for a fresh (within the staleness window), high-confidence (≥70) match, and to short-circuit the entire pipeline when one exists. Not authorized to return a stale or low-confidence match as if it were fresh — the bar is intentionally strict because this decision skips real research entirely.
- **Responsibilities:** Run `findReusableKnowledge` first in the pipeline; return the existing entry directly on a match.
- **What This Capability Will Never Do:** Never skip research for a match below the 70-confidence bar or outside the staleness window, however close; never confuse this strict reuse check with the looser post-research topic lookup used for insert/update decisions (§3.4.8) — the two intentionally have different bars for different purposes.
- **Inputs:** The research objective; `userId`/`businessId` scope.
- **Outputs:** Either a direct-return existing knowledge entry, or a pipeline-continue signal.
- **Dependencies:** `ash_knowledge_entries` (shared with Chapter 1.4 §3.4.5).
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** A hard AND of freshness (staleness window) and confidence (≥70) — either condition failing means the pipeline proceeds.
- **Success Criteria / KPIs:** Reuse rate (fraction of research requests served from cache); false-reuse rate (serving genuinely outdated knowledge as if fresh — must remain at zero by design, not merely low).
- **Failure Modes:** A table-read failure here should default to proceeding with fresh research, not to a false skip.
- **Fallback Strategy:** On lookup failure, proceed to full research — the safe default, since the cost of an unnecessary research pass is far lower than the cost of serving stale knowledge as current.
- **Security Requirements:** Reuse lookups must be scoped to the requesting user's/business's own knowledge entries.
- **Extension Rules:** The staleness window and the 70-confidence threshold may be tuned per research type as an additive configuration change, without altering the underlying AND-gate logic.

#### 3.4.3 Research Planning — Capability Contract
**Current Maturity:** L3 · **Target Maturity:** L3 (mature; growth is in query quality, not the mechanism)

- **Purpose:** Turn a research objective into a small set of concrete, targeted search queries likely to actually surface the needed information.
- **Authority:** Authorized to generate 2-4 search queries via an AI call for the research objective. Not authorized to execute those queries itself — that is Information Gathering's responsibility (§3.4.4).
- **Responsibilities:** Run `generateResearchPlan`; fall back to `fallbackPlan` (deterministic) on AI-call failure.
- **What This Capability Will Never Do:** Never generate a query set so large it defeats the cost-control purpose of the reuse-first design (§3.4.2); never leave the pipeline without any queries at all, even on AI failure.
- **Inputs:** The research objective; `researchType`.
- **Outputs:** 2-4 search queries.
- **Dependencies:** `lib/openrouter` (`MODELS.utility`); Knowledge Reuse Lookup (§3.4.2), which must have already determined research is actually needed.
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** An AI call generates queries; `fallbackPlan` provides a deterministic query set derived directly from the objective text when the AI call fails.
- **Success Criteria / KPIs:** AI-call failure rate; downstream finding yield per generated query (a proxy for query quality, currently unmeasured).
- **Failure Modes:** An AI-call failure degrades query quality (via the deterministic fallback) but never halts the pipeline.
- **Fallback Strategy:** On AI-call failure, use `fallbackPlan`'s deterministic query derivation — an explicit, named fallback, not a silent gap.
- **Security Requirements:** None beyond the objective text already available to this step.
- **Extension Rules:** `fallbackPlan`'s deterministic derivation logic may be improved independently of the AI-based path, and vice versa, since the two are already cleanly separated.

#### 3.4.4 Search Provider Abstraction & Information Gathering — Capability Contract
**Current Maturity:** L2 (orchestration) · **Target Maturity:** L2/L3

- **Purpose:** Actually retrieve real information from the web for each planned query, resiliently, without the rest of the pipeline needing to know or care which underlying search provider served the request.
- **Authority:** Authorized to execute queries against the `PROVIDER_PRIORITY` chain (Tavily, Serper, Perplexity) and fall through to the next available provider on failure. Not authorized to hardcode a provider choice bypassing the registry — the same Platform Registry & Search Provider Abstraction pattern enforced elsewhere in the platform.
- **Responsibilities:** Run `gatherInformation`, calling `searchWeb` per query; iterate the priority chain on provider failure.
- **What This Capability Will Never Do:** Never fail the entire gathering step because a single non-default provider is unavailable, so long as at least one provider in the chain (Perplexity, requiring no separate API key, is always available) succeeds; never silently drop a query without attempting it against at least one provider.
- **Inputs:** The planned search queries (§3.4.3).
- **Outputs:** Raw search results/findings per query.
- **Dependencies:** `lib/search-providers/` (`tavily-provider.ts`, `serper-provider.ts`, `perplexity-provider.ts`).
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Deterministic priority-order iteration with fallthrough on provider failure; `perplexity-provider.ts` is always available since it requires no separate API key beyond the platform's own OpenRouter access.
- **Success Criteria / KPIs:** Per-provider failure rate; fallthrough frequency (how often the chain falls past Tavily/Serper to Perplexity).
- **Failure Modes:** If every configured provider fails simultaneously (an unlikely but possible outage scenario), gathering returns no findings for that query, which downstream steps must handle gracefully rather than erroring.
- **Fallback Strategy:** Provider fallthrough is itself the fallback mechanism — Tavily → Serper → Perplexity, with Perplexity as the guaranteed-available floor.
- **Security Requirements:** Provider API keys (`TAVILY_API_KEY`, `SERPER_API_KEY`) are read via standard environment-secret handling; this capability never logs or exposes key values.
- **Extension Rules:** A new provider is added to `PROVIDER_PRIORITY` and implements the same provider interface as the existing three — no change to the gathering/fallthrough logic itself is required.

#### 3.4.5 Finding Deduplication — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L2 (mature; growth is in threshold tuning, not the mechanism)

- **Purpose:** Prevent the same fact, found by multiple queries or providers, from being counted or synthesized as if it were independent corroborating evidence.
- **Authority:** Authorized to remove findings judged near-duplicate via Jaccard similarity over text shingles at a 0.5 threshold. Not authorized to alter a finding's content — only to decide whether to keep or discard it relative to another.
- **Responsibilities:** Run `removeDuplicateFindings` after gathering, before scoring.
- **What This Capability Will Never Do:** Never discard two findings that are merely topically related but not near-duplicate text; never discard a finding without a comparison against another finding actually exceeding the similarity threshold.
- **Inputs:** Raw findings from Information Gathering (§3.4.4).
- **Outputs:** A deduplicated finding set.
- **Dependencies:** None beyond the raw findings themselves.
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Jaccard similarity over text shingles, 0.5 threshold — deterministic, no model call.
- **Success Criteria / KPIs:** Deduplication precision (avoiding false merges of genuinely distinct findings) and recall (catching genuine near-duplicates), both currently unmeasured.
- **Failure Modes:** A 0.5 threshold is a fixed compromise — too strict, and true duplicates slip through inflating apparent corroboration; too loose, and genuinely distinct findings get merged.
- **Fallback Strategy:** Not applicable — a pure deterministic text-comparison step with no external call to degrade.
- **Security Requirements:** None beyond the finding text already available to this step.
- **Extension Rules:** The 0.5 similarity threshold may be tuned as an additive configuration change without altering the shingle-based comparison mechanism itself.

#### 3.4.6 Source Reliability Scoring — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L2/L3

- **Purpose:** Weight findings by how trustworthy their source actually is, so a synthesized summary doesn't treat an authoritative source and an uncited claim as equally credible.
- **Authority:** Authorized to assign each finding a reliability score using the fixed `RELIABILITY_TIERS` (90 for `.gov`/`.edu`, 80 for recognized data publications, 35 for uncited sources). Not authorized to discard a low-scoring finding outright — scoring, not filtering, is this capability's role; the Summarizer (§3.4.7) decides how to weight low-reliability findings.
- **Responsibilities:** Run `scoreAllSources` on the deduplicated finding set.
- **What This Capability Will Never Do:** Never assign a score outside the fixed tier system without a documented tier addition; never present an unscored finding to the Summarizer.
- **Inputs:** Deduplicated findings (§3.4.5), including each finding's source domain/citation.
- **Outputs:** A reliability score per finding.
- **Dependencies:** `RELIABILITY_TIERS` (fixed tier definitions).
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Deterministic domain/citation-pattern matching against fixed tiers — no model call.
- **Success Criteria / KPIs:** Tier-assignment accuracy against a human's judgment of source credibility (currently unmeasured, and inherently somewhat subjective).
- **Failure Modes:** A source that doesn't match any tier pattern receives no explicit score — verify what the actual default is during Review (§3.9), not independently confirmed in this drafting pass.
- **Fallback Strategy:** Not applicable — a pure deterministic classification step.
- **Security Requirements:** None beyond the finding's own source metadata.
- **Extension Rules:** New reliability tiers (e.g. a dedicated tier for recognized industry-publication domains) are added to `RELIABILITY_TIERS` directly, without altering the summarizer's downstream consumption of scores.

#### 3.4.7 Structured Summarization — Capability Contract
**Current Maturity:** L3 · **Target Maturity:** L3 (mature; growth is in profile coverage, not the summarization mechanism)

- **Purpose:** Synthesize scored, deduplicated findings into a structured, reusable knowledge artifact — not a prose answer, but a title, summary, key findings, tags, and a confidence score the rest of the platform can act on programmatically.
- **Authority:** Authorized to run an AI call over the deduplicated, scored findings and produce the structured output shape, including type-specific "profiles" (e.g. competitor profiles) per `PROFILE_INSTRUCTIONS`. Not authorized to persist its own output — that is Knowledge Persistence's responsibility (§3.4.8).
- **Responsibilities:** Run `generateStructuredSummary`; select the correct `PROFILE_INSTRUCTIONS` variant for the research type; compute a confidence score for the synthesis.
- **What This Capability Will Never Do:** Never fabricate a key finding not traceable to at least one actual gathered finding; never assign a confidence score disconnected from the underlying findings' own reliability scores (§3.4.6).
- **Inputs:** Deduplicated, reliability-scored findings; `researchType`.
- **Outputs:** A structured summary object (title, summary, key findings, tags, confidence score, optional type-specific profile).
- **Dependencies:** `lib/openrouter` (`MODELS.utility`); Source Reliability Scoring (§3.4.6), whose scores should inform confidence.
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** An AI call performs synthesis; `PROFILE_INSTRUCTIONS` is a lookup keyed by `researchType`, not a decision the AI makes on its own.
- **Success Criteria / KPIs:** AI-call failure rate; confidence-score calibration (whether a high confidence score actually correlates with findings a human would also trust — currently unmeasured).
- **Failure Modes:** An AI-call failure at this final synthesis step means the entire research pass produces no usable output, despite gathering having already succeeded — the highest-cost failure point in the pipeline, since all prior work is wasted.
- **Fallback Strategy:** On AI-call failure, the pipeline should return a `failed` result (per §3.1's fail-open pattern) rather than persist a partial or fabricated summary — verify no partial-save path exists during Review (§3.9).
- **Security Requirements:** None additional beyond the finding data already available to this step.
- **Extension Rules:** New `PROFILE_INSTRUCTIONS` variants are added for new research types as an additive lookup-table change, without altering the core summarization call.

#### 3.4.8 Knowledge Persistence (Insert/Update Coordination) — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L2 (mature; shared ownership with Chapter 1.4 is the growth axis, see §3.9)

- **Purpose:** Decide correctly between creating a new knowledge entry and updating an existing one, so the same topic doesn't accumulate duplicate, conflicting entries over time.
- **Authority:** Authorized to insert into or update `ash_knowledge_entries` when a synthesized result meets `MIN_CONFIDENCE_TO_SAVE = 40`, using `findExistingEntryForTopic`'s looser, relevance-only match to decide which. Not authorized to persist any result below the 40-confidence floor, however marginally.
- **Responsibilities:** Run `saveOrUpdateKnowledgeMemory`; call `findExistingEntryForTopic` to check for a same-topic entry; call `insertNewEntry` or `updateExistingEntry` accordingly.
- **What This Capability Will Never Do:** Never persist a result below `MIN_CONFIDENCE_TO_SAVE`; never create a duplicate entry for a topic `findExistingEntryForTopic` already matched, when an update was the correct action; never conflate this looser topic-match bar with Knowledge Reuse Lookup's (§3.4.2) much stricter reuse bar — the two serve different purposes and must not be unified into one threshold.
- **Inputs:** The structured summary (§3.4.7); existing `ash_knowledge_entries` rows for topic matching.
- **Outputs:** An inserted or updated `ash_knowledge_entries` row.
- **Dependencies:** Structured Summarization (§3.4.7); the same table read by the Memory Engine's Knowledge Memory layer (Chapter 1.4 §3.4.5).
- **Events Published:** None observed directly from this module; `task.completed`/`project.completed` events are published from the route layer, per the pattern already established in Chapter 1.2 §3.4.9.
- **Events Consumed:** None.
- **Decision Logic:** A hard confidence floor (40) gates persistence at all; `findExistingEntryForTopic`'s relevance-only match (no confidence bar) then decides insert vs. update.
- **Success Criteria / KPIs:** Duplicate-entry rate for the same underlying topic (should trend toward zero); update-vs-insert accuracy against a human's judgment of "is this really the same topic."
- **Failure Modes:** A topic-match false negative creates an unnecessary duplicate entry; a false positive incorrectly overwrites what should have been a distinct new entry.
- **Fallback Strategy:** On a persistence-layer failure, the research result should still be returned to the caller (per §3.1's fail-open design) even if it could not be saved for future reuse — a failed save degrades future reuse economics, not the current request.
- **Security Requirements:** Writes must be attributed to the requesting `userId`/`businessId`, via the governance-aware insert/update functions already integrated with the Data Access Layer, consistent with the Memory Engine's parallel treatment of this same table (Chapter 1.4 §3.4.10).
- **Extension Rules:** The relationship between this capability's write-side logic and the Memory Engine's read-side ownership of the same table (Chapter 1.4 §3.4.5) should be formalized as an explicit shared-table contract, per §3.9, rather than left as an implicit convention.

#### 3.4.9 Research Session & Profile Auditing — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L2 (mature; growth is in retention policy, not the logging mechanism)

- **Purpose:** Leave a durable, inspectable record of every research pass actually run — what was asked, what was found, and what was produced — independent of the reusable knowledge entry it may or may not have produced.
- **Authority:** Authorized to write to `ash_research_sessions` and `ash_research_profiles` for every research pass, whether or not it ultimately met the persistence confidence floor (§3.4.8). Not authorized to omit a session record for a pass that was actually attempted.
- **Responsibilities:** Persist session-level metadata (objective, research type, outcome) and, for research types with a structured profile, the profile record itself.
- **What This Capability Will Never Do:** Never skip writing a session record because the research pass ultimately failed or fell below the persistence confidence floor — those outcomes are themselves worth auditing.
- **Inputs:** The full research pass's request, outcome, and (if applicable) structured profile.
- **Outputs:** `ash_research_sessions` and `ash_research_profiles` rows.
- **Dependencies:** All prior pipeline steps, as the source of what gets audited.
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Unconditional write per pass — no filtering or sampling logic.
- **Success Criteria / KPIs:** Row-growth rate relative to research volume (a proxy for whether retention policy will eventually be needed, mirroring the same open question already raised for the Planning Engine's own audit log, Chapter 1.2 §3.4.7).
- **Failure Modes:** No documented retention or archival policy exists yet for either table.
- **Fallback Strategy:** Not applicable — a direct, synchronous persistence step.
- **Security Requirements:** Session and profile records must remain scoped and queryable only by the owning user/business.
- **Extension Rules:** A retention/archival policy may be added as an additive operational concern without changing what gets logged or its schema.

#### 3.4.10 Executive Brain Integration & Fail-Open Coordination — Capability Contract
**Current Maturity:** L2 · **Target Maturity:** L2 (mature; this capability is intentionally thin by design)

- **Purpose:** Let the Executive Brain draw on real, current research without ever risking the user's underlying request on a research failure.
- **Authority:** Authorized to run after `runPlanningEngine` completes and to prepend `research.contextNote` to the message forwarded to the AI Orchestrator. Not authorized to block, delay, or fail the overall request on a research-pipeline failure — the fail-open guarantee is absolute for this integration point.
- **Responsibilities:** Call `runResearchEngine` from `routes/executive-brain.ts` at the correct point in the request sequence; fold its context note into the forwarded message; contain any failure entirely within this integration boundary.
- **What This Capability Will Never Do:** Never let an unhandled exception from the research pipeline propagate to the route handler and fail the user's request; never silently drop a research failure without at least a context note explaining what happened.
- **Inputs:** The resolved project/goal/tasks from the Planning Engine (Chapter 1.2).
- **Outputs:** A `research.contextNote`, appended alongside the Executive Brain's, Planning Engine's, and Memory Engine's own context notes.
- **Dependencies:** The Planning Engine (Chapter 1.2), which must run first; the full research pipeline (§3.4.1–3.4.9).
- **Events Published:** None from this integration point directly.
- **Events Consumed:** None.
- **Decision Logic:** A single try/catch boundary around the entire pipeline invocation — deterministic, not AI-assisted.
- **Success Criteria / KPIs:** Zero incidents of a research-pipeline failure causing a user-facing request failure (a hard requirement, not a trend to improve).
- **Failure Modes:** None beyond what is already handled — this capability's entire purpose is to be the last line of defense against pipeline failures reaching the user.
- **Fallback Strategy:** On any pipeline failure, return a `failed`-status result with an explanatory context note; the request proceeds without research-derived context.
- **Security Requirements:** None additional beyond what the pipeline itself already enforces.
- **Extension Rules:** This integration boundary should remain exactly as thin as it is today even as the pipeline itself grows in sophistication — additional capability should never come at the cost of loosening this fail-open guarantee.

#### 3.4.11 Adaptive Provider Selection — Capability Contract (target capability)
**Current Maturity:** L0 (provider order is a fixed, static priority list today) · **Target Maturity:** L3

- **Purpose:** Route each query to the provider most likely to serve it well and cheaply, based on real observed performance, rather than always trying providers in the same fixed order.
- **Authority (target):** Authorized to read historical per-provider success/latency/cost signals and reorder `PROVIDER_PRIORITY` dynamically for a given query type. Never authorized to remove a provider from consideration entirely based on recent failures alone — a provider having a bad hour should be deprioritized, not permanently excluded, without a separate, deliberate decision.
- **Responsibilities (target):** Track per-provider outcome signals; adjust routing order per query type/research type.
- **What This Capability Will Never Do:** Never route around the existing static fallthrough chain (§3.4.4) as a safety net — dynamic ordering should reorder that chain, not replace its guarantee that some provider is always tried.
- **Inputs (target):** Historical provider success/latency/cost data, by research/query type.
- **Outputs (target):** A dynamically ordered provider sequence, consumed by Information Gathering (§3.4.4).
- **Dependencies (target):** Search Provider Abstraction & Information Gathering (§3.4.4), as the mechanism this capability reorders rather than replaces.
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Not designed; whether to weight by success rate, latency, cost, or some combination, is an open question (§3.9), not decided here.
- **Success Criteria / KPIs (proposed):** Aggregate research-pass latency and cost improvement over the static-priority baseline, once built and measured.
- **Failure Modes:** Until built, the platform pays whatever the static priority order costs on average, even when a different order would perform better for a specific query type.
- **Fallback Strategy:** Not applicable until designed; once built, a failure to compute a dynamic order should fall back to the existing static `PROVIDER_PRIORITY` order, never to an undefined order.
- **Security Requirements:** None beyond what the existing provider abstraction already enforces.
- **Extension Rules:** This capability must be built as an additive reordering layer above the existing static chain (§3.4.4), per Upgrade Before Replace — the static chain remains the always-available fallback beneath it.

#### 3.4.12 Knowledge Lifecycle & Decay Coordination — Capability Contract (target capability)
**Current Maturity:** L1 (a staleness *check* exists at reuse time, §3.4.2; no active decay/expiry of stored entries exists) · **Target Maturity:** L3

- **Purpose:** Ensure knowledge entries don't just sit unchanged until the next time someone happens to research the same topic, but are actively identified as aging and, where warranted, proactively refreshed.
- **Authority (target):** Authorized to identify `ash_knowledge_entries` rows approaching or past their staleness window and either flag them for proactive re-research or lower their effective confidence over time. Never authorized to delete a knowledge entry outright — decay should reduce reuse eligibility (§3.4.2), never destroy the historical record, consistent with the Memory Engine's own maintenance philosophy (Chapter 1.4 §3.4.9) of never destructively deleting what a pruning pass merely deprioritizes.
- **Responsibilities (target):** Periodically scan for aging entries; apply a confidence/staleness decay function; optionally trigger proactive re-research for high-value, high-traffic topics.
- **What This Capability Will Never Do:** Never silently continue to serve a stale entry as fresh through Knowledge Reuse Lookup (§3.4.2) once it has decayed past the reuse threshold — decay must actually gate reuse, not merely be recorded.
- **Inputs (target):** `ash_knowledge_entries` age and current confidence; topic-level usage frequency (for prioritizing proactive re-research candidates).
- **Outputs (target):** Decayed confidence values, feeding directly into Knowledge Reuse Lookup's (§3.4.2) existing threshold check; optionally, newly triggered research passes for high-value stale topics.
- **Dependencies (target):** Knowledge Reuse Lookup (§3.4.2), whose confidence check this capability's output feeds; the Memory Engine's Memory Maintenance & Decay (Chapter 1.4 §3.4.9), as the closest existing analog and prior art to extend from, per Upgrade Before Replace.
- **Events Published:** None.
- **Events Consumed:** None.
- **Decision Logic:** Not designed; the specific decay function and the criteria for triggering proactive re-research versus passive decay are open questions (§3.9), not decided here.
- **Success Criteria / KPIs (proposed):** Reduction in stale-knowledge-served incidents; proactive-refresh hit rate for high-traffic topics, once built and measured.
- **Failure Modes:** Until built, a knowledge entry's confidence value is set once at creation/update time and never adjusted purely by the passage of time — a topic could remain "confidently" answerable by increasingly outdated information until someone happens to re-research it.
- **Fallback Strategy:** Not applicable until designed; once built, a failure to compute decay should leave an entry's existing confidence and staleness window unchanged — the current, already-safe default — rather than either falsely decaying or falsely preserving it.
- **Security Requirements:** Must respect the same `userId`/`businessId` scoping as every other capability touching `ash_knowledge_entries`.
- **Extension Rules:** This capability should be modeled explicitly on the Memory Engine's existing Memory Maintenance & Decay mechanism (Chapter 1.4 §3.4.9) rather than invented independently, per Upgrade Before Replace and per §3.9's cross-chapter reconciliation question.

### 3.5 Inputs (Engine-level aggregate)

*The per-capability Inputs above are the authoritative detail; this section is the aggregate view across the whole subsystem.*

- **From the Executive Brain (Chapter 1.1) and Planning Engine (Chapter 1.2):** the resolved project/goal, `userId`, `businessId`, and the request that triggered intent detection.
- **Persisted state read at research time:** `ash_knowledge_entries` (for both the strict reuse check and the looser topic match), `ash_research_sessions`, `ash_research_profiles`.
- **External data:** live web search results via the Search Provider Abstraction (Tavily, Serper, Perplexity).
- **AI-derived inputs:** query plans (`generateResearchPlan`) and structured summaries (`generateStructuredSummary`), both OpenRouter completions.

### 3.6 Outputs (Engine-level aggregate)

*The per-capability Outputs above are the authoritative detail; this section is the aggregate view across the whole subsystem.*

- **`research.contextNote`** — appended alongside the Executive Brain's, Planning Engine's, and Memory Engine's own context notes into the message forwarded to the AI Orchestrator.
- **Persisted state writes:** `ash_knowledge_entries` (new or updated entries, shared with the Memory Engine), `ash_research_sessions`, `ash_research_profiles`.
- **Outbox events:** `task.completed`, `project.completed`, published from the route layer per the pattern already established in Chapter 1.2 §3.4.9.

### 3.7 Integration Map

| Subsystem | Direction | Nature of the integration |
|---|---|---|
| Executive Brain (Chapter 1.1) / Planning Engine (Chapter 1.2) | Executive Brain → Research Engine | `runResearchEngine` is called from `routes/executive-brain.ts` immediately after `runPlanningEngine`; its context note is prepended to the same forwarded message. |
| Memory Engine — Knowledge Memory (Chapter 1.4 §3.4.5) | Research Engine ↔ Memory Engine | Both subsystems read and write `ash_knowledge_entries`; this chapter owns the insert/update decision logic (§3.4.8), Chapter 1.4 owns retrieval and ranking for live conversation use. |
| Search Provider Abstraction (`lib/search-providers/`) | Research Engine → Search Providers | `gatherInformation` calls `searchWeb`, which iterates `PROVIDER_PRIORITY` (Tavily → Serper → Perplexity). |
| Business Intelligence Governance / Data Access Layer (Phase A) | Research Engine → Governance | Knowledge writes use governance-aware `insertKnowledgeEntry`/`updateKnowledgeEntry` functions, consistent with the Memory Engine's parallel treatment of this same table. |
| ASH Self-Improving Brain (Chapter 1.6) | Not integrated today | No call site found between the research pipeline and `AshBrain`/`ash_lessons`; these remain two entirely independent sources of platform "learning." |
| Validation Engine (Chapter 1.3) | Not integrated today | Research requests are not currently subject to Validation Engine checks (e.g. credential or approval gating) — worth confirming whether any research action should ever require gating, given it is read-only against external sources (§3.9). |

### 3.8 Future Growth

The following extension points would allow the Research & Knowledge Engine to grow toward the mission in §3.2 without redesigning its current seven-step pipeline, consistent with the Upgrade Before Replace law. This list is superseded in detail by each capability contract's own Extension Rules field in §3.4; it is retained here as a single cross-cutting summary.

- **Adaptive Provider Selection** (§3.4.11): reorder the existing static provider chain based on real observed performance, without removing the chain's guaranteed-fallthrough safety net.
- **Knowledge Lifecycle & Decay Coordination** (§3.4.12): extend the Memory Engine's existing maintenance/decay philosophy (Chapter 1.4 §3.4.9) to `ash_knowledge_entries`, rather than inventing an independent decay mechanism.
- **Formalized shared-table contract with the Memory Engine** (§3.4.8, §3.9): make the write-side (this chapter) / read-side (Chapter 1.4) division of `ash_knowledge_entries` an explicit, documented contract rather than an implicit convention.
- **Expanded reliability tiers** (§3.4.6): additional `RELIABILITY_TIERS` entries as new categories of trustworthy sources are identified.

### 3.9 Open Architecture Questions

The following require review and a decision before any related implementation work proceeds — they are flagged here, not resolved:

1. Should the write-side (this chapter) / read-side (Chapter 1.4) division of `ash_knowledge_entries` be formalized as an explicit shared-table contract, given that two different chapters currently reason about the same table independently?
2. What should Adaptive Provider Selection (§3.4.11) actually weight — success rate, latency, cost, or a combination — and should the weighting be tunable per research type?
3. Should Knowledge Lifecycle & Decay Coordination (§3.4.12) be built as an extension of the Memory Engine's existing maintenance job (Chapter 1.4 §3.4.9), or as its own dedicated scheduled process — given that it operates on a table this chapter, not Chapter 1.4, is the primary writer of?
4. Should any research action ever be subject to Validation Engine (Chapter 1.3) gating, given that research is read-only against external sources and does not appear to carry the same risk profile as the write-capable actions that subsystem was designed to gate?
5. What is the actual default reliability score (§3.4.6) for a source that matches none of the fixed `RELIABILITY_TIERS` patterns — is it a documented floor value, or an unhandled case worth confirming during Review?
6. Is `MIN_CONFIDENCE_TO_SAVE = 40` (§3.4.8) the right floor, and should it vary by research type, given that some research types (e.g. competitor profiles) may warrant a higher bar than others (e.g. general trend summaries)?
7. Should the relationship between this chapter's knowledge distillation and the ASH Self-Improving Brain's separate `ash_lessons` distillation (Chapter 1.6) be documented or reconciled at all, given both are independent "the platform learned something" mechanisms with no current cross-reference?

### 3.10 Architecture Summary

*This section closes out the Architecture stage of this chapter's lifecycle. It consolidates the chapter's own findings; it does not introduce new architecture beyond what §3.1–3.9 already establish.*

**Current maturity assessment.** Of the twelve capabilities bound to contracts in §3.4, ten are implemented today — three at L3 (Research Planning, Structured Summarization, and Information Gathering's AI-assisted Perplexity path within §3.4.4) and seven at L2 (Research Intent Detection, Knowledge Reuse Lookup, the deterministic orchestration portion of Search Provider Abstraction, Finding Deduplication, Source Reliability Scoring, Knowledge Persistence, Research Session & Profile Auditing, Executive Brain Integration & Fail-Open Coordination — recount: eight at L2). Two are latent or partial (Adaptive Provider Selection at L0, Knowledge Lifecycle & Decay Coordination at L1 — a staleness check exists, but active decay does not). None has yet reached L4 or L5. In short: the Research & Knowledge Engine today reliably turns a research-worthy request into scored, structured, reusable knowledge, resiliently across provider outages, and never at the cost of the user's underlying request; the mission in §3.2 additionally requires it to get smarter about which provider to use for which query, and to actively manage the aging of what it already knows rather than treating a knowledge entry as permanently as-current as the moment it was written.

| Maturity band | Capabilities |
|---|---|
| L3 (AI-assisted, implemented) | Research Planning, Structured Summarization, Search Provider Abstraction & Information Gathering (Perplexity path) |
| L2 (deterministic, implemented) | Research Intent Detection, Knowledge Reuse Lookup, Finding Deduplication, Source Reliability Scoring, Knowledge Persistence, Research Session & Profile Auditing, Executive Brain Integration & Fail-Open Coordination |
| L1 (partial / implicit) | Knowledge Lifecycle & Decay Coordination |
| L0 (absent) | Adaptive Provider Selection |

**Deferred architectural decisions.** All seven items in §3.9 are formally deferred pending the project owner's review; none has been decided in this chapter. Item #1 (formalizing the shared-table contract with the Memory Engine) is the highest-leverage item, since it is a pure documentation/ownership clarification with no new mechanism required.

**Risks.**
- **Implicit shared-table ownership** (§3.4.8, §3.9 item 1): two chapters (this one and Chapter 1.4) reason about `ash_knowledge_entries` independently, with no formalized contract governing the boundary — a plausible source of future write conflicts as either chapter evolves.
- **Static provider ordering** (§3.4.11): the platform always tries providers in the same fixed order regardless of actual observed performance, leaving latency/cost savings unrealized.
- **Passive-only staleness** (§3.4.12): knowledge entries are checked for staleness only at reuse time, never proactively refreshed — a high-traffic topic could serve increasingly outdated information for a long time before someone happens to trigger fresh research on it.
- **Unaudited default reliability score** (§3.9 item 5): the behavior for a source matching no reliability tier was not independently confirmed in this drafting pass.

**Future roadmap** *(sequencing only; no phase is authorized by this chapter)*:
- **Near-term candidate:** formalize the shared `ash_knowledge_entries` contract with the Memory Engine (§3.9 item 1) — a documentation-only clarification with no new mechanism required.
- **Near-term candidate:** confirm the default reliability-score behavior (§3.9 item 5) during Review.
- **Mid-term candidate:** build Knowledge Lifecycle & Decay Coordination (§3.4.12) as an extension of the Memory Engine's existing maintenance job, per §3.9 item 3.
- **Mid-term candidate:** build Adaptive Provider Selection (§3.4.11) once sufficient per-provider outcome data has accumulated to make dynamic ordering meaningful.
- **Ongoing, not phase-gated:** tuning `MIN_CONFIDENCE_TO_SAVE` and the reuse-confidence threshold (§3.9 item 6) can proceed independently of the above sequencing.

**Chapter approval checklist.** For the project owner's use in deciding whether to move this chapter to the Architecture Review stage:
- [ ] The mission statement (§3.2) is confirmed as an accurate statement of long-term intent for the Research & Knowledge Engine.
- [ ] All twelve Capability Contracts (§3.4) have been read, and their Authority/Never-Do boundaries are confirmed correct.
- [ ] The shared-ownership boundary of `ash_knowledge_entries` with the Memory Engine (Chapter 1.4) is confirmed correct.
- [ ] The seven Open Architecture Questions (§3.9) each have either a decision or an explicit "defer to a later chapter/cycle" disposition.
- [ ] The implicit shared-table ownership risk and the passive-only staleness risk are acknowledged, with a disposition recorded.
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
