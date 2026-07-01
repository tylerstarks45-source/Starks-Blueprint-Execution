---
name: Business Health Analysis Engine
description: How ASH's async business health scoring pipeline is triggered, stored, and polled — read before touching business_health_scores or its routes/worker.
---

The `business_health_scores` table is written by a `business_health_analysis` runtime job (same async job-queue/poll pattern as build progress), not synchronously in a route handler. `GET /businesses/:id/health` returns `{latest, history, analyzing}` where `analyzing` is derived by scanning recent `runtime_jobs` rows for a queued/active/retrying job whose JSON payload matches the business id (payload isn't indexed/queryable directly).

Analysis is auto-triggered (fire-and-forget, wrapped in try/catch, never blocks the response) from two places on business creation: the `imported` path in `routes/businesses.ts` POST, and the `built` path in `lib/built-businesses.ts` `ensureBuiltBusiness()`. `backfillBuiltBusinesses()` (startup backfill for pre-existing system instances) deliberately does NOT trigger analysis — only fresh creation does, to avoid mass-enqueuing jobs on every restart.

**Why:** matches the existing build-progress polling UX users already know, and keeps the credit-gated OpenRouter call (via `complete()`) off the request path.

**How to apply:** after any `lib/db` schema change here, remember `pnpm --filter @workspace/db run push` must be run in *every* environment separately (dev DB pushes don't propagate automatically) — a missing table produced a raw Drizzle "Failed query" HTML error page with no schema hint, not a clean 404/500.

Any server-side crawl/fetch of a user-supplied URL (e.g. `business.websiteUrl`) must be checked with `lib/connectors/ssrf-guard.ts`'s `isBlockedUrl()`/`validateExternalUrl()` before calling Playwright's `fetchPage()`. That guard already exists for the connector integrations — reuse it, don't write a new one, for any future feature that fetches a stored/user-controlled URL server-side.
