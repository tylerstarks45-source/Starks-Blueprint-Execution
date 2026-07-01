---
name: Social scheduler pattern
description: How content-calendar/social post scheduling is wired end-to-end (ASH tool, DB, scheduler loop, click tracking) so future features follow the same shape.
---

Content-calendar scheduling is its own vertical slice, not a generalization of the runtime job worker or `create_schedule` tool:

- A dedicated table (`scheduledPostsTable`) holds platform, content, scheduledAt, status, and click tracking columns — separate from generic system-instance schedules.
- ASH gets a dedicated `schedule_post` tool_calls type in the orchestrator system prompt/handling block, distinct from the generic scheduling tools. It validates platform + ownership server-side and writes the row directly (no LLM-side DB access).
- A background scheduler tick (`processDuePosts`, same loop cadence as other runtime jobs) claims due rows with `FOR UPDATE SKIP LOCKED`, calls the shared `publish()` dispatcher (per-platform handlers in `lib/publishing/index.ts`), and updates status/notifications/activity events.
- Click tracking is a public (unauthenticated) redirect route (`/api/r/:postId` pattern) that increments a counter and 302s — kept outside the authed CRUD router.

**Why:** keeping this as an isolated vertical (own table, own tool type, own scheduler function) avoided overloading the generic job/schedule infrastructure with platform-specific publish logic and made click-tracking's public-route requirement easy to isolate from authed CRUD.

**How to apply:** when adding a new "scheduled X that gets published/dispatched later" feature, replicate this shape (dedicated table + dedicated ASH tool + claim-and-publish scheduler tick) rather than trying to bolt it onto the existing generic runtime job worker.
