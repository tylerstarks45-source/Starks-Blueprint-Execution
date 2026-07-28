---
name: ASH Brain v2.0 — Executive Brain Foundation (Phase 1.1)
description: Multi-phase project layering a Project/Goal/Task planning brain above the existing AI Orchestrator. Read before touching Phase 1.2+ of this initiative.
---

Multi-phase user-driven build: user hands one phase spec at a time, expects "phase completed" + architecture diagram/new-files/modified-files/integration-points/concerns after each, then sends the next phase. Do not treat this as project-tasks work — it's a single ongoing conversation build.

## What Phase 1.1 built
- New tables (`lib/db/src/schema/executive_brain.ts`): `ash_projects`, `ash_goals`, `ash_tasks`. Deliberately separate from `ash_lessons.ts` ("ASH brain" = the older SQL-distillation lessons engine) — different concept, kept the naming collision from causing confusion.
- New lib `artifacts/api-server/src/lib/executive-brain/` (project-manager, goal-manager, task-planner, index.ts `runExecutiveBrain()`). Each manager does one cheap heuristic decision first (continue vs. new project, reuse vs. new goal, decompose vs. single task) and only calls `complete()` with `MODELS.utility` when it adds real value; every AI call has a deterministic fallback so a model failure never blocks the request.
- New route `artifacts/api-server/src/routes/executive-brain.ts`: `POST /api/executive-brain/stream` is the new front door. It runs the brain phase, emits one `brain_state` SSE event, then internally HTTP-calls the **untouched** `POST /api/ai-orchestrator/stream` at `http://127.0.0.1:$PORT` (with the caller's Authorization header) and pipes its SSE stream straight through — the existing orchestrator file was never modified. Brain context (project/goal/tasks) is appended as plain text to the forwarded `message` so ASH gets awareness without any orchestrator schema change. If the brain phase throws, it logs and forwards the original message unchanged (fails open, chat never breaks).
- Read/CRUD endpoints: `GET /api/executive-brain/projects[/:id[/goals|/tasks]]`, `PATCH /api/executive-brain/projects/:id`.
- Verified end-to-end with curl: first message creates a project+goal+task; a follow-up message reuses the same project/goal and appends a new task (continuation logic confirmed working).

## Decisions to stay consistent with in later phases
- **Frontend is NOT yet switched** to call `/api/executive-brain/stream` — BuilderPage still calls `/api/ai-orchestrator/stream` directly. Cutting the main chat UI over is a deliberate later decision (Phase 1.2+ or explicit user ask), not assumed here, to keep Phase 1.1 purely additive/foundational.
- **Why the self-HTTP-call proxy pattern** (not an in-process function extraction): the orchestrator's stream handler is a single ~1100-line route body, not an exported function. Refactoring it to be callable in-process is real surgery on a load-bearing file; proxying over loopback HTTP keeps that file at zero risk while still satisfying "reuse the existing pipeline unchanged."
- `estimatedCompletion` on goals is free-text from an AI call, unvalidated — it can produce nonsense/hallucinated dates (seen: a past date for a new goal). Don't treat it as a real date without adding format validation first.

## Gotcha hit this session
`artifacts/api-server/src/routes/index.ts` requires **both** an `import` line and a separate `router.use(...)` line for every route file. Adding only the import compiles clean (TS doesn't complain about an unused default import that's later referenced) — the route then 404s at runtime with no build error. Always grep the resulting bundle (`grep -c "<route-path>" dist/index.mjs`) or curl the new route after any new router registration, not just after adding the import.

## Phase 1.2 — Memory Engine
- 5-layer memory in `artifacts/api-server/src/lib/memory-engine/`: Working (derived live, no storage), Long-Term (`user_memory` extended with category/importance/tags/confidence/lastAccessed — existing CRUD route/behavior untouched), Project (`ash_project_memory`, new), Business (`business_memory`, new, one row per `businesses.id`), Knowledge (`ash_knowledge_entries`, new, per-user — explicitly distinct from the older cross-user `ash_lessons` distillation table).
- Retrieval has no vector DB — relevance is a cheap keyword-overlap + importance + confidence + recency heuristic (`relevance.ts`). Good enough for this foundation phase; revisit if retrieval quality becomes a complaint.
- Business Memory is resolved via `ash_projects.systemInstanceId → businesses.systemInstanceId`, which is often null early in a project's life. When no business is linked yet, "business" layer facts fall back to being stored as project memory instead of being dropped — don't remove that fallback without another home for that data.
- Auto Memory (zero frontend involvement) and completion-learning both fire-and-forget **after** the response is already sent (auto-memory after the SSE stream ends, learning after the PATCH response is sent) — verified end-to-end this adds no user-facing latency, only extra background AI calls (cost tradeoff, flagged to user).
- Verified end-to-end: a message stating business facts got captured into project memory; a *later, separate* request with empty history correctly recalled those facts purely from injected memory (not from conversation history) — confirms retrieval+injection actually works, not just capture.
- Maintenance sweep (cleanup/dedup/compression) added to `runtime/scheduler.ts` following the existing module-level `lastRun` + interval-guard pattern; only touches auto-captured rows (`category IS NOT NULL` on `user_memory`), never manually-created ones.
