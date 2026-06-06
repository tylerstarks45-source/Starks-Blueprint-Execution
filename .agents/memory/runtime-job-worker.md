---
name: Runtime Job Worker
description: Critical quirks for the PostgreSQL SKIP LOCKED job worker (Phase 9 runtime engine)
---

## pool.query() returns snake_case — always map rows

`pool.query()` returns raw PostgreSQL column names: `job_type`, `system_instance_id`, `max_attempts`, `queued_at`, etc. The TypeScript `RuntimeJob` interface uses camelCase. A `mapRow()` function in `jobs.ts` handles the conversion. Without it, `job.jobType` is `undefined` and the worker logs "Unknown job type: undefined".

**Why:** Drizzle ORM maps columns automatically for its own queries; raw `pool.query` does not.

**How to apply:** Any new raw SQL queries returning runtime_jobs rows must call `mapRow()` before passing to the worker.

## complete() takes {prompt, model?, systemPrompt?} — not a messages array

The `complete()` function in `lib/openrouter.ts` has signature:
```typescript
complete(request: { prompt: string; model?: string; systemPrompt?: string; userId?: number; systemInstanceId?: number })
```
It builds the messages array internally. Do NOT call it with `(messages[], {model, maxTokens})` — that's the wrong signature and will result in "Input must have at least 1 token" errors from OpenRouter.

**Why:** The function predates the connector framework and was never updated to accept a raw messages array.

## Startup orphan recovery is required

When the API process restarts, any jobs in "active" state are orphaned — the old worker claimed them but was killed before completing. Without recovery, they stay stuck as "active" forever.

`resetOrphanedJobs()` in `jobs.ts` runs a bulk UPDATE to reset `status = 'queued'` for all active jobs. Called in `startWorker()` before the first poll cycle.

**Why:** SKIP LOCKED doesn't re-claim active jobs — only queued/retrying ones. A crashed process creates ghost-active jobs that block the queue.

## POST /api/system-instances requires both userId AND blueprintId

Both fields are non-optional in the Zod insert schema. Tests must supply both. The admin user's ID comes from `{"user": {"id": "1", ...}}` (nested under "user" key in /api/auth/me response).

## System detail page route is /system/:id (not /systems/:id)

The React Router path for the system detail page uses singular `/system/:id`.
