# ASH Brain Master Architecture X-RAY

**Purpose of this document:** a complete, as-built architectural inventory of the current system — not a compliance audit, not a redesign. It is the baseline the ASH Brain Master Architecture Roadmap will be planned against. Everything below describes the system exactly as it exists on 2026-07-29.

---

## 1. Brain Subsystems

### 1.1 Business Intelligence Engine
- **Purpose:** the source-of-truth layer for business identity ("DNA") and health — reconciles conflicting data signals (user input, system derivation, AI inference) into one resolved state per business.
- **Responsibilities:** reconcile DNA evidence via a tiered trust ranking; manage per-business events and the narrative timeline; track health/capabilities; run conflict resolution and a human-in-the-loop review queue.
- **Major components:** `lib/business-intelligence/dna.ts` (truth resolution, field inference), `events.ts` (outbox-pattern event bus), `context.ts` (LLM context-package assembly), `health-subscriber.ts` (event-driven health recompute).
- **Status:** Implemented, and — as of today — Compliance Complete for its governance layer (see §6). Phase 1.5A (the engine itself) has its own prior compliance report.
- **Dependencies:** `lib/governance/` for all writes, `lib/health-monitor.ts`, `lib/openrouter.ts`.
- **Integration points:** exposed via `routes/business-intelligence.ts`; consumed by `lib/memory-engine/` and the Executive Brain's context assembly.

### 1.2 Executive Brain (ASH Brain v2.0, Phase 1.1 foundation)
- **Purpose:** multi-phase planning layer between the user and the AI Orchestrator — resolves "what project/goal/task is this request about" before any model call happens.
- **Responsibilities:** resolve the active project and goal for a request; maintain project/task rollup state; hand a `brainContextNote` downstream.
- **Major components:** `lib/executive-brain/index.ts` (entry, fail-open contract), `project-manager.ts`, `goal-manager.ts`, `task-planner.ts`.
- **Status:** Implemented (Phase 1.1 foundation), fully wired into the live request path.
- **Dependencies:** `lib/memory-engine/`, `lib/business-intelligence/`.
- **Integration points:** `routes/executive-brain.ts` (`/executive-brain/stream`); internally forwards to the AI Orchestrator's `/ai-orchestrator/stream` over a loopback HTTP call.

### 1.3 Planning Engine
- **Purpose:** turns Executive Brain goals into milestones/tasks with dependency tracking and go/hold/escalate decisions.
- **Responsibilities:** milestone + dependency management (`dependency-manager.ts`); pre-execution validation and risk scoring of proposed plans.
- **Major components:** `lib/planning-engine/index.ts` (`runPlanningEngine`), `validation-engine/` (rule registry — see 1.6), `validation-engine/risk-detector.ts`.
- **Status:** Implemented (Phase 1.3/1.4).
- **Dependencies:** `lib/connectors/registry.ts`, `lib/approvals.ts`.
- **Integration points:** runs during the Executive Brain's planning phase; its `planningContextNote` is injected into the same request pipeline.

### 1.4 ASH Self-Improving Brain
- **Purpose:** a deterministic (non-LLM) knowledge layer that distills "lessons" from real SQL data (revenue, health outcomes) rather than model guesswork.
- **Responsibilities:** aggregate successful patterns (top tools, niches, blueprint categories); classify outcomes as proven/promising/struggling from hard data; surface these to ground LLM reasoning.
- **Major components:** `lib/ash-brain.ts` (`AshBrain` class, pure-SQL distillation).
- **Status:** Implemented. Uses the `ash_lessons` table.
- **Dependencies:** `@workspace/db` only — no LLM call in the distillation path itself.
- **Integration points:** consulted during recommendation generation and planning to ground outputs in real outcomes.

### 1.5 Memory Engine (5-layer retrieval)
- **Purpose:** relevance-ranked retrieval across five memory layers so requests get grounded context without flooding the model's context window.
- **Responsibilities:** manage Working, Long-Term, Project, Business, and Knowledge memory layers; rank/cap retrieval; auto-capture lessons from completed projects; enforce business-scoped isolation.
- **Major components:** `lib/memory-engine/index.ts` (`retrieveRelevantMemory`, parallelized via `Promise.all` across layers), `relevance.ts`, `business-memory.ts`, `knowledge-memory.ts`, `maintenance.ts`.
- **Status:** Implemented.
- **Dependencies:** `lib/governance/` (writes, as of Phase A), `lib/business-intelligence/`.
- **Integration points:** called from the AI Orchestrator request path; feeds `businessMemoryContextNote`/`knowledgeContextNote`.

### 1.6 Validation Engine
- **Purpose:** modular, rule-based pre-execution validation of AI-proposed plans/actions (replaced an earlier hardcoded keyword-array approach).
- **Responsibilities:** run a registry of independent rules (credential checks, tool-requirement checks, approval-required checks) against a proposed plan; aggregate into a risk level.
- **Major components:** `lib/planning-engine/validation-engine/index.ts` (runner), `rules/` (e.g. `credential-rule.ts`, `tool-requirement-rule.ts`, `approval-rule.ts`), `risk-detector.ts`.
- **Status:** Implemented.
- **Dependencies:** `lib/connectors/registry.ts`, `lib/approvals.ts`.
- **Integration points:** runs inside the Planning Engine; an `approval-rule` match creates a `pending_approvals` row and blocks the task until a user approves it (see §4.4).

### 1.7 Research & Knowledge Engine
- **Purpose:** knowledge-first research — check existing memory before spending a live web-research pass.
- **Responsibilities:** multi-step flow (intent → planner → gatherer → summarizer → knowledge-writer); reuse-vs-update decisions against existing knowledge entries.
- **Major components:** `lib/research-engine/index.ts` (`runResearchEngine`), `knowledge-writer.ts`.
- **Status:** Implemented (Phase 1.4).
- **Dependencies:** `lib/search-providers/` (see 1.9), `lib/governance/` for knowledge writes.
- **Integration points:** invoked from the AI Orchestrator when a request needs external/factual grounding.

### 1.8 Governance / Data Access Layer (Business Intelligence, Phase A — new today)
- **Purpose:** centralized ownership enforcement and audit trail for Business Intelligence data.
- **Responsibilities:** stamp every governed write with ownership metadata; write a paired audit entry for every mutation, in the same transaction.
- **Major components:** `lib/governance/index.ts` (barrel), `ownership.ts` (`findOwnedBusiness`, `resolveBusinessOwnerUserId`), `audit.ts` (`recordAudit`), `writes/*-writes.ts` (one file per BI sub-engine).
- **Status:** Implemented, Compliance Complete (verified today — see the two Phase A documents referenced in §6).
- **Dependencies:** `@workspace/db`.
- **Integration points:** the sanctioned write path for every BI engine and route; see full detail in §6.

### 1.9 Platform Registry & Search Provider Abstraction
- **Purpose:** two related abstractions — a live, connector-derived list of supported platforms, and a swappable multi-provider search layer.
- **Responsibilities:** Platform Registry merges live connector data with a static "unsupported platforms" list so the Brain always reasons from a current platform list, not a hardcoded one. Search Provider Abstraction runs a priority-ordered fallback chain (Tavily → Serper → Perplexity).
- **Major components:** `lib/platform-registry/index.ts`, `lib/search-providers/index.ts` (`PROVIDER_PRIORITY`).
- **Status:** Implemented.
- **Dependencies:** `lib/connectors/registry.ts`.
- **Integration points:** consumed by the Research Engine and by planning/validation when reasoning about what's technically supportable.

### 1.10 Browser Agent
- **Purpose:** autonomous browser control for tasks that need real interaction with a web UI (e.g. credential-gated third-party consoles).
- **Responsibilities:** Playwright-driven navigation, JS execution, form fill, screenshotting; secure credential fetch for login flows.
- **Major components:** `lib/browser/agent.ts`.
- **Status:** Implemented, running on system Chromium (Nix).
- **Dependencies:** Playwright, `lib/browser-agent` credential-fetch endpoint.
- **Integration points:** invoked as an ASH tool during autonomous build/setup flows.

### 1.11 Social Scheduler
- **Purpose:** scheduled publishing of social/content-calendar posts.
- **Responsibilities:** claim due `scheduled_posts` rows and dispatch them via the publishing layer.
- **Major components:** logic lives inside `lib/runtime/scheduler.ts` (the `social_calendar` internal cron, hourly) rather than its own module — see Technical Debt (§8).
- **Status:** Implemented, but structurally embedded rather than a standalone engine.
- **Dependencies:** `lib/publishing/`, OAuth-connected social connectors.
- **Integration points:** the general Scheduler's polling loop; connector registry for platform-specific publish calls.

### 1.12 AI Orchestrator / Runtime Job Worker
- **Purpose:** the core execution loop — the layer that actually talks to the LLM provider and executes tools — plus the background async job processor.
- **Responsibilities:** stream completions, manage tool-call turns, run structured-output recovery; separately, `runtime/worker.ts` processes queued async jobs (webhook-triggered AI tasks, scheduled health analysis, business improvement passes).
- **Major components:** `routes/ai-orchestrator.ts`, `routes/ash-tools.ts`, `lib/models.ts` (provider/model routing), `lib/runtime/worker.ts`.
- **Status:** Implemented; this is the most mature, longest-running subsystem in the inventory.
- **Dependencies:** OpenRouter, `lib/connectors/registry.ts`.
- **Integration points:** every upstream Brain phase (Executive Brain, Planning, BI, Research, Memory) injects a context note here before the model call; see the request-flow diagram in §3.

---

## 2. Data Architecture

### 2.1 Governance & Audit store
| Table | Purpose | Key columns | Governed? |
|---|---|---|---|
| `audit_trail_entries` | Central append-only ledger of BI mutations (create/update/delete) | `recordTable`, `recordId`, `action`, `actorType`/`actorUserId`, `ownerUserId`, `sourceEngine`, `changes` (JSONB diff) | N/A (it *is* the audit layer) |

### 2.2 Business Intelligence store (Knowledge / Context / Event / Timeline)
All 11 tables below carry the full ownership contract (`ownerUserId NOT NULL`, `teamWorkspaceId`, `sourceEngine`, `createdByUserId`/`updatedByUserId`, `governanceStatus`, `recordVersion`) as of Phase A, completed today.

| Table | Purpose | Key columns |
|---|---|---|
| `business_dna_claims` | Current resolved value per business attribute | `fieldKey`, `currentValue`, `confidenceScore`, `trustLevel`, `version` |
| `business_dna_versions` | Immutable history of DNA value changes | `claimId`, `value`, `changeType` |
| `business_dna_conflicts` | Contradictory evidence awaiting resolution | `incomingValue`, `impactScore`, `status`, `resolution` |
| `business_review_queue` | Human-in-the-loop queue for conflicts/stale data | `kind`, `priority`, `payload` |
| `business_timeline_events` | Narrative history of business events (human/AI-readable) | `eventType`, `description`, `trigger`, `occurredAt` |
| `business_domain_events` | Durable outbox for system event processing | `eventType`, `payload`, `dedupeKey`, `status` |
| `business_memory` | Long-term contextual memory per business | `contextKey`, `memoryValue` |
| `business_recommendations` | AI-generated actionable growth insights | `category`, `impact`, `status` |
| `business_health_metrics` | Raw time-series health data points | `metricKey`, `metricValue`, `capturedAt` |
| `business_health_scores` | Aggregated health indices | `scoreType`, `scoreValue`, `trend` |
| `ash_knowledge_entries` | Business-scoped reusable knowledge/facts | `content`, `tags`, `sourceType` |

### 2.3 Executive Brain store (ungoverned by Phase A, in scope for Phase B)
| Table | Purpose | Governed? |
|---|---|---|
| `ash_projects` | Top-level container for autonomous work | No |
| `ash_project_memory` | Transient working memory for the ASH agent | No |
| `ash_tasks` / `ash_goals` | Task/goal decomposition under a project | No |
| `ash_research_profiles` | Satellite projection of a knowledge entry | No (explicitly excluded — see §6) |

### 2.4 Core platform store (identity / billing — untouched by Phase A)
`users`, `businesses` (source of truth for `ownerId`), `client_workspaces` (agency/white-label — distinct from the reserved `teamWorkspaceId` concept, never to be conflated), `subscriptions`.

### 2.5 System & utility store
`system_logs`, `runtime_jobs` (async job queue backing the Runtime Job Worker), `api_key_usage_events`, `scheduler_state` (untracked, hand-managed raw-SQL table backing internal cron survival across restarts — see the drizzle-kit hazard noted in project memory), `pending_approvals`, `webhook_endpoints` / `webhook_logs`, `scheduled_tasks` / `scheduled_posts`.

### 2.6 Data architecture observations
- **Denormalized ownership** (`ownerUserId` on every BI table) trades a join for a DAL-enforced invariant — intentional, but means the Data Access Layer is the only thing standing between this and drift from `businesses.ownerId`.
- **Naming convention split**: `ash_*` (Executive Brain domain) vs `business_*` (Business Intelligence domain) — two live domains, not a single naming scheme; worth knowing before extending either.
- **No raw/untracked schema drift found** in Drizzle-managed tables — the one known exception is `scheduler_state`, which is intentionally hand-managed outside Drizzle (see memory: never run `drizzle-kit push` in this project, it will offer to drop it).
- **`audit_trail_entries` has no partitioning strategy** yet; as a platform-wide append-only log this is the one table most likely to need one as volume grows.

---

## 3. Runtime Architecture & Request Flow

```text
[HTTP POST /api/executive-brain/stream]
            │
            ▼
    [Executive Brain]  ── resolves project/goal/task, emits brainContextNote
            │
            ▼
    [Planning Engine]  ── milestones, dependencies, validation-engine risk check
            │
            ▼
  [Business Intelligence] ── DNA/health/lifecycle context assembly
            │
            ▼
    [Research Engine]  ── knowledge-first lookup, falls back to live search
            │
            ▼
    [Memory Engine]    ── 5-layer parallel retrieval (Promise.all)
            │
            ▼
[HTTP POST /api/ai-orchestrator/stream]  ── internal loopback forward
            │
            ▼
    [OpenRouter Client] ── best-model policy + fallback chains (lib/models.ts)
            │
            ▼
      [LLM completion]
            │
            ▼
    [Tool Execution]   ── ash-tools.ts + connector registry (real side effects)
            │
            ▼
   [SSE stream to user]
```

- Each upstream phase (Executive Brain → Planning → BI → Research → Memory) is **fail-open**: if a phase errors, it degrades gracefully rather than blocking the underlying chat/orchestrator call — a deliberate design choice so advanced reasoning never becomes a single point of failure for basic chat.
- **Provider/model routing** (`lib/models.ts`) centralizes a best-model policy: frontier models for anything user-facing, ordered fallback `CHAINS` (e.g. flagship → reasoning → swift), and tier-gated agent modes (`resolveAgentMode`, gating Expert/Empire depth behind membership tier).
- **Async work** (webhook-triggered AI tasks, scheduled business-health analysis, business-improvement passes) runs through `lib/runtime/worker.ts`, a separate poll loop from the live request path, backed by the `runtime_jobs` queue.

---

## 4. Event Architecture

### 4.1 Domain events (Business Intelligence)
Transactional outbox (`business_domain_events`): `publishBusinessEventTx` inserts inside the caller's transaction, `processBusinessEvent` runs subscribers post-commit. Subscribers today: `HealthSubscriber` (health recompute on `project.completed`/`integration.connected`), `DnaSubscriber` (DNA init/refresh), and an implicit Business Timeline write on every event. Subscriber isolation via `Promise.allSettled` — one failing subscriber never blocks another or the timeline. No automatic subscriber retry; failures are recorded on the outbox row (`status: failed`) for manual follow-up.

### 4.2 Business Timeline
A side effect of domain-event processing (`recordTimelineForEvent`) — narrates events for humans/AI, deliberately kept separate in purpose from the new Audit Trail (§6), which exists for compliance traceability, not narrative.

### 4.3 Scheduler
`lib/runtime/scheduler.ts` runs both user-defined `scheduled_tasks` (60s poll) and a fixed set of internal crons, state-tracked in `scheduler_state` so they survive restarts: `weekly_digest` (7d), `ab_test_check` (1h), `email_sequence` (5m), `social_calendar` (1h), `reclaim_hung_jobs` (5m watchdog for stuck jobs). User-defined task failures back off exponentially (5m→10m→20m→40m…) up to 5 attempts before the task is disabled and the user notified.

### 4.4 Workflow abstractions & approvals
High-risk ASH tool calls can be intercepted by the Validation Engine's `approval-rule`, which creates a `pending_approvals` row and blocks the originating task until a user approves/rejects it via `routes/approvals.ts`. Approved actions execute through an approval executor that re-scopes the target resource to the approval's own `userId` (see memory: approval-executor-authz — payload ids are treated as untrusted).

### 4.5 Webhooks
`routes/webhooks.ts` — external POST to a per-integration token URL, dispatched via `setImmediate` after a 202 response; every attempt is logged to `webhook_logs` with response/error capture. Supported action types: `run_ash_task`, `send_email`, `publish_content`, `connector_action`, `log_event`.

### 4.6 Runtime job bus
`lib/runtime/jobs.ts` — a Postgres-backed priority queue (`runtime_jobs`) shared by webhooks, ASH, and the scheduler; `reclaimHungJobs` resets jobs stuck "active" past a type-specific timeout.

---

## 5. API Inventory

### 5.1 Route files (under `artifacts/api-server/src/routes/`, mounted under `/api`)
**System/internal:** `health.ts` (liveness), `auth.ts` (register/login/logout/session), `admin.ts`/`admin-ai.ts` (platform monitoring, OpenRouter usage), `scheduled-tasks.ts`, `webhooks.ts`, `logs.ts`, `monitoring.ts` (multi-tenant instance health).

**Domain/user-facing:** `business-intelligence.ts`, `business-health.ts`, `business-recommendations.ts` (BI surface); `ai-orchestrator.ts`, `ash-tools.ts`, `executive-brain.ts` (AI orchestration surface — `/api/ash/*` transparently aliases to `/api/ai-orchestrator/*` in `app.ts`); `build-engine.ts`, `build-sessions.ts`, `blueprints.ts` (system-instance build/deploy lifecycle); `public-pages.ts`, `ab-tests.ts`, `referrals.ts` (public/growth surfaces).

### 5.2 Shared libraries (`lib/` at monorepo root)
- **`@workspace/db`** — Drizzle instance, pool, all table schemas; consumed by virtually every api-server file.
- **`@workspace/api-zod`** — Zod schemas/types generated from `openapi.yaml`; used for request validation.
- **`@workspace/api-client-react`** — TanStack Query hooks + fetcher, consumed by `artifacts/web` and `artifacts/mobile`.
- **Codegen:** Orval (`lib/api-spec/orval.config.ts`) turns `openapi.yaml` into both `api-zod` and `api-client-react`.

### 5.3 Cross-cutting patterns
- Ownership governance: `findOwnedBusiness` (from `lib/governance/ownership.ts`, added Phase A) is now the single shared tenant-isolation check used across BI, health, and monitoring routes — replacing five independently duplicated copies.
- Unified auth: `middlewares/apiKey.ts` validates `X-API-Key`, enforces rate limits and plan-tier gating before a request reaches any router.
- URL aliasing: `app.ts` rewrites `/api/ash/*` → `/api/ai-orchestrator/*`.
- Manual raw-body handling for Stripe/SendGrid webhook signature verification bypasses standard Express body-parsing middleware by design.

---

## 6. Ownership & Governance

*(This section is authored directly from today's Phase A work rather than delegated exploration — see the two linked documents for full detail.)*

- **Ownership model:** every governed table carries `ownerUserId` (NOT NULL, denormalized from `businesses.ownerId`), `teamWorkspaceId` (reserved, inert, for a future generic Team Workspace concept — never conflated with the unrelated, existing `client_workspaces` agency/white-label table), `sourceEngine`, `createdByUserId`/`updatedByUserId` (null = system/AI), `governanceStatus`, and `recordVersion` (optimistic concurrency).
- **Data Access Layer:** `artifacts/api-server/src/lib/governance/` is the sole write path for the 11 governed Business Intelligence tables — `ownership.ts` for authorization (`findOwnedBusiness`) and lookup (`resolveBusinessOwnerUserId`), `audit.ts` for the paired audit write, `writes/*-writes.ts` per sub-engine. Verified via full-source grep: zero raw inserts/updates on any governed table outside this layer.
- **Validation:** enforced at the route boundary — every mutating BI route calls `findOwnedBusiness(businessId, caller.id)` before any governed write proceeds, rejecting cross-user/cross-business access before it reaches the database. (Cross-reference: the API Inventory explorer flagged this as per-handler manual calls rather than a parameterized middleware — a legitimate structural observation, tracked as debt in §8, not a gap in enforcement.)
- **Scope isolation:** Business Context Isolation (pre-existing, Phase 1.5A) plus the new ownership stamping mean BI reads and writes are both scoped per business; background jobs (worker, scheduler) act on a `businessId`/`userId` already resolved at job-scheduling time, not an ad hoc external caller.
- **Audit layer:** `audit_trail_entries`, append-only, mutations-only (reads and bookkeeping-only touches — e.g. `lastAccessedAt` bumps — are exempt by design), written in the same transaction as its paired mutation.
- **Full detail:** [`2026-07-29-business-intelligence-governance-design.md`](./2026-07-29-business-intelligence-governance-design.md) (architecture/data-flow/ownership-flow/audit-flow diagrams, extension points, technical debt, performance impact) and [`2026-07-29-business-intelligence-governance-compliance-report.md`](./2026-07-29-business-intelligence-governance-compliance-report.md) (6/6 requirements verified against real code, tests, and a live smoke test).
- **Explicitly out of Phase A scope:** everything outside the 11 BI tables — `ash_projects`/`ash_tasks`/`ash_goals`/`ash_project_memory` (Executive Brain), `ash_research_profiles` (satellite/derived, ruled out), system instances (`findOwnedSystemInstance` kept as a deliberately separate, ungoverned check). These are Phase B candidates, not gaps.

---

## 7. Extension Points

Collected from every domain above — the seams the system was deliberately built with:

- **Governance/ownership:** `teamWorkspaceId` (reserved on every governed table) and the `GovernedActor`/`GovernedWriteContext` actor-type model are the designed seam for a future Team Workspace + RBAC layer. `audit_trail_entries`' schema-generic `recordTable` column lets any future Phase B subsystem write to it without a migration. `lib/governance/writes/` is the designated place to add new governed tables.
- **Validation:** `lib/planning-engine/validation-engine/rules/` is built for drop-in rule additions.
- **Search/platform data:** `PROVIDER_PRIORITY` in `lib/search-providers/` and `unsupported-platforms.ts` in the Platform Registry both let new providers/platform knowledge be added without touching call sites.
- **Connectors:** `lib/connectors/registry.ts` is the single seam that makes a new third-party integration immediately available to webhooks, scheduled tasks, and ASH tool calls at once.
- **Event bus:** `BusinessEventBus`'s interface is explicitly designed to be swapped from the current Postgres outbox to a message broker without changing call sites.
- **Model routing:** `MODELS`/`CHAINS` in `lib/models.ts` centralize provider/model changes so they don't ripple to call sites.
- **Memory layers:** `retrieveRelevantMemory`'s layer-aggregator design is built to accommodate new memory layers.

---

## 8. Technical Debt

- **Social Scheduler has no dedicated module** — its logic lives inline in the general `lib/runtime/scheduler.ts` rather than its own `lib/social-scheduler/` directory the way other engines are structured.
- **Duplicate credential-loading logic** — `loadUserCredentials` is independently redefined (with minor variations) in `scheduler.ts`, `webhooks.ts`, and `worker.ts`.
- **Hardcoded cron keys** — internal scheduler state keys (`"weekly_digest"`, etc.) are bare strings scattered through `scheduler.ts` rather than a centralized enum.
- **Implicit subscriber registration** — Business Intelligence event subscribers register via import-time side effects; relies on barrel-file import order, a latent race/miss-registration risk if that order ever changes.
- **Mixed Zod versions** — both `zod` and `zod/v4` are imported (seen in `executive-brain.ts`), suggesting an incomplete migration.
- **Fragile structured-output extraction** — multiple places (`ash-tools.ts`, `ai-orchestrator.ts`) extract JSON from LLM output via a regex match rather than a structured-output contract.
- **Manual per-handler ownership checks, not middleware** — every mutating BI route calls `findOwnedBusiness` explicitly rather than through a parameterized auth middleware; functionally correct today (consolidated to one implementation in Phase A) but means every new route must remember to call it.
- **Redundant manual body-parsing** — `app.ts` hand-rolls stream-to-buffer logic for Stripe/SendGrid webhook paths, bypassing standard Express middleware.
- **`business_dna_claims`/`business_dna_versions` naming split from `ash_*`** — two live domain prefixes (Business Intelligence vs. Executive Brain) with no unifying convention.
- **`ash_research_profiles` and system instances remain intentionally ungoverned** (documented Phase B candidates from Phase A, not oversights).
- **`business_intelligence/context.ts`'s cross-business summary** uses basic template strings; likely needs more sophisticated summarization as business counts grow.
- **`lib/memory-engine/maintenance.ts`** has placeholder, not-yet-aggressive long-term pruning logic.
- **No partitioning strategy on `audit_trail_entries`**, a platform-wide append-only log that will only grow.

---

## 9. Performance

- **Sequential phase accumulation on the hot path:** Executive Brain → Planning → BI → Research → Memory run in sequence before the Orchestrator is even called, adding to time-to-first-token; only Memory's own internal layers are parallelized (`Promise.all`).
- **Internal loopback HTTP call:** Executive Brain forwards to the AI Orchestrator via a local HTTP fetch (not an in-process call), adding overhead and a dependency on `PORT` being correctly wired for loopback.
- **DNA resolution cost:** `reconcileDnaEvidence` performs multiple DB lookups plus an LLM call per invocation; rapid-fire evidence updates could bottleneck.
- **Browser Agent resource use:** Chromium-backed, with up to 4s "networkidle" waits that can tie up worker capacity if not scaled carefully.
- **Event bus runs subscribers inline:** no dedicated worker process for BI event subscribers — they run within the same transaction/request path as the triggering write, extending its latency.
- **Scheduler polling at scale:** `processDueTasks`'s `LIMIT 50` + sequential processing could develop a backlog as `scheduled_tasks` volume grows.
- **Database-as-queue pressure:** high-frequency writes (webhook `log_event`, `webhook_logs`) are synchronous, a potential bottleneck under heavy external load.
- **JSONB growth:** heavy reliance on JSONB columns (`business_dna_claims.currentValue`, `business_domain_events.payload`, `audit_trail_entries.changes`) risks storage/index overhead as these fields accumulate.
- **Cascade deletes:** extensive `onDelete: cascade` from `businesses`/`users` down through BI and Audit tables — deleting a high-volume business/user could trigger a large, blocking recursive delete.
- **Governance's one extra write per mutation** (the paired audit row) is proportional to BI's existing low write volume today — flagged in the Phase A design doc as the one place to revisit first if that volume changes materially.

---

## 10. Brain Completion Matrix

| Subsystem | Status |
|---|---|
| Business Intelligence Engine (core: DNA, health, timeline, events) | Compliance Complete |
| Business Intelligence — Governance / Data Access Layer (Phase A) | Compliance Complete |
| Executive Brain (project/goal/task resolution) | Implementation Complete |
| Planning Engine (milestones, dependencies) | Implementation Complete |
| Validation Engine (rule registry, risk detection) | Implementation Complete |
| ASH Self-Improving Brain (SQL lesson distillation) | Implementation Complete |
| Memory Engine (5-layer retrieval) | Implementation Complete |
| Research & Knowledge Engine | Implementation Complete |
| AI Orchestrator / Runtime Job Worker | Implementation Complete |
| Platform Registry & Search Provider Abstraction | Implementation Complete |
| Browser Agent | Implementation Complete |
| Social Scheduler | Implementation Complete (structurally embedded, not a standalone module — see §8) |
| Governance for the rest of the platform (Phase B: files, landing pages, automations, analytics, connectors, Executive Brain tables) | Not Started (explicitly deferred, pending separate authorization) |
| Multi-user Team Workspaces & RBAC enforcement | Not Started (extension points exist — `teamWorkspaceId`, actor-type model — but no workspace/role UI or enforcement) |

No subsystem is formally "Locked" as of this X-RAY — every subsystem above remains open to further iteration; "Locked" is reserved for a future, explicit freeze decision this document does not make.

---

## Sources

Produced from a live architectural inventory conducted today via five parallel read-only explorations (Brain subsystems, data architecture, runtime architecture, event architecture, API inventory), synthesized against the Phase A governance work completed the same day. No files were modified to produce this document; per the request, nothing here is a redesign recommendation.
