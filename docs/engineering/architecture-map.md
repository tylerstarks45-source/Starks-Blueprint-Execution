# Architecture map (as built)

Verified against `main` at `b4f5816`, plus open PRs #1–#3. Counts were produced with `grep`/`wc` over the tree, so treat them as approximate.

## Source of truth

- **Authoritative code:** GitHub `tylerstarks45-source/Starks-Blueprint-Execution`, branch `main`. Replit pushes to `main` as "Replit Agent".
- **Replit workspace:** private and not inspectable from this environment, so Replit-to-GitHub parity is unverified. Any uncommitted Replit edits are not covered here.
- **`tylerstarks45-source/starks-global-group`:** empty. It is not a source.
- **`starksglobalgroup.net`:** serves Replit's "app isn't live" placeholder. There is no production deployment to compare against.

## Workspace layout (pnpm 10 monorepo, Node 24, TypeScript 5.9)

| Package | Role |
|---|---|
| `artifacts/api-server` | Express 5 API. 112 route files, 26 top-level `lib/*.ts` helpers, 67 `lib/*/` engine directories. |
| `artifacts/web` | React and Vite 7 PWA (Tailwind v3). The main UI. |
| `artifacts/mobile` | Expo app. Excluded from the pnpm workspace glob. |
| `artifacts/desktop` | Tauri v2 shell around the web build. |
| `artifacts/mockup-sandbox` | Design mockups. Typechecked, not shipped. |
| `lib/db` | Drizzle schema: 131 schema files, about 557 `pgTable`s. Versioned migrations under `lib/db/drizzle` from PR #3. |
| `lib/api-spec` | OpenAPI spec and Orval config. Codegen is currently not reproducible (see below). |
| `lib/api-zod`, `lib/api-client-react` | Generated Zod schemas and React Query client. |
| `lib/integrations-openai-ai-server` | Replit-managed OpenAI client, used as a TTS fallback. |
| `scripts` | Seeds, plus `db:migrate` and `db:baseline` (PR #3). |

## Request path

```
Browser (web / desktop / mobile)
  -> Express app.ts
       securityHeaders (helmet), CORS allowlist, JSON body
       /api/ash/*  -> rewritten to /api/ai-orchestrator/*
       apiKeyMiddleware (per-tier API-key limits)
       createAiRateLimiter (per user, provider-spending routes only)      [PR #1]
       redactServerErrors (5xx bodies: no stack/details/config leaks)     [PR #1]
       router (112 route files)
       jsonErrorHandler                                                   [PR #1]
```

### ASH (the AI operator)

```
POST /api/ai-orchestrator/{chat,stream,execute}       routes/ai-orchestrator.ts (2,631 lines)
  - builds the system prompt with memory, business-intelligence and brain context
  - lib/openrouter.ts complete()/streamCompletion()   credit check, usage log, model chains from lib/models.ts
  - parses an SBEP_DATA JSON block from the model's text (prompt-embedded tool protocol)
      actions: present_plan, collect_credentials, start_build, browser_use,
               build_landing_page, create_schedule, tool_calls{search,image,video,music,tts}, ...
POST /api/executive-brain/stream                      lib/executive-brain (5,286 lines)
  - project/goal/task resolution, planning-engine, research-engine, memory-engine
  - then forwards in-process over HTTP to /api/ai-orchestrator/stream
  - not called by the web UI
```

### Background runtime (one process with the API)

| Component | File | Behavior |
|---|---|---|
| Job worker | `lib/runtime/worker.ts`, `jobs.ts` | DB-backed job queue, 5 s poll, retries with backoff, orphan reset. |
| Scheduler | `lib/runtime/scheduler.ts` | 60 s poll: scheduled tasks, digests, social posts, health checks and self-healing, daily improvement pass. Last-run state in `scheduler_state` (tracked by Drizzle from PR #3). |
| Revenue sync | `lib/revenue/sync.ts` | Hourly: Stripe, PayPal, Gumroad, ClickBank. |

There is no leader election. If the API is autoscaled to more than one replica, every replica runs the worker and the scheduler.

## AI routing (OpenRouter rule)

- Central path: `lib/openrouter.ts` and `lib/models.ts`, imported by 29 files.
- Direct calls that bypass credits and usage logging:
  - `routes/media-gen.ts:115`: image generation.
  - `routes/ai-orchestrator.ts:2535`: `/audio/transcriptions`.
  - `routes/admin.ts:72`: admin calls.
  - `routes/user-credentials.ts:319`: model list (read-only, acceptable).
- Non-OpenRouter providers:
  - The Replit OpenAI integration as the TTS fallback.
  - ElevenLabs, using each user's own key.
  - Both need an explicit owner exception, since OpenRouter has no TTS.

## Engines: which ones are actually AI

Of the 67 `lib/*/` directories, 9 import the OpenRouter helper: `executive-brain`, `runtime`, `planning-engine`, `memory-engine`, `research-engine`, `connectors`, `business-intelligence`, `browser`, `search-providers`. The other 58 are deterministic TypeScript: rules and scoring over DB rows, or static catalogs. That includes the Build 015–057 families (`executive-*`, `unified-*`, `*-intelligence`, `*-planning`, `technology-*`, `cognitive-foundation`). That code is real and tested in places, but it is not model-driven reasoning.

## Data

- PostgreSQL, about 557 tables, Drizzle ORM. Tenant isolation is enforced in the route handlers (`userId`/`businessId` filters). There is no row-level security.
- Memory tables:
  - `user_memory`, `business_memory`, `ash_project_memory` (memory-engine, 5 layers).
  - `ash_lessons` (ash-brain).
  - Cognitive-memory and executive-learning tables.
  - Retrieval is SQL/keyword relevance only, with no embeddings.
- Migrations: before PR #3, the only path was `drizzle-kit push`. `scripts/post-merge.sh` still runs `pnpm --filter db push` until existing databases are baselined (see `database-migrations.md`).

## Auth and authorization

- JWT, 7-day expiry, revocable via `tokenVersion`.
- bcrypt password hashing.
- Roles: `USER`, `ADMIN`, `SUPER_ADMIN`, `FOUNDER_ADMIN`.
- Membership tiers gate agent modes. Credits gate AI spend.
- API keys carry per-tier rate limits.
- `/api/auth/admin-bootstrap` is enabled only while `ADMIN_BOOTSTRAP_TOKEN` is set. See `security-runbook.md`.

## Known tooling gaps

- Orval codegen rewrites unrelated generated files and fails on a duplicate `UpdatePlatformContextBody` export. Generated types are hand-edited for now.
- Before PR #3 there was no CI. PR #3 adds GitHub Actions: Postgres 16, migrate, seed twice, drift check, typecheck, API tests, web build.
