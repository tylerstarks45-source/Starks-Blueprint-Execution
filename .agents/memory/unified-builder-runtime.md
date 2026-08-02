---
name: Unified Builder Runtime Engine (UBRE)
description: Build 049 — UBRE architecture, 10 tables, 6 engines, EB integration, and gotchas.
---

## The Rule (Unified Builder Runtime Law)
Every visual builder executes inside UBRE. No builder may implement its own autosave, undo, redo, editing sessions, runtime events, recovery, or validation lifecycle.

**Why:** Eliminates duplicated editing infrastructure. Every new builder inherits enterprise-grade editing (autosave, undo/redo, recovery, validation, locking) from day one.

**How to apply:** New builders call UBRE endpoints on every user action. Builder is responsible only for rendering and capability declaration. UBRE owns execution state.

---

## DB Tables (10)
- `builder_sessions` — active editing sessions (mutable: session_state, draft_id, has_unsaved_work)
- `builder_drafts` — immutable draft revisions with full content JSONB snapshots (append-only)
- `builder_history` — undo/redo operation chains with before/after state (append-only)
- `builder_events` — lifecycle events for every builder action (append-only, 14 event types)
- `builder_validation` — validation results per draft/publish attempt (append-only)
- `builder_locks` — collaborative editing locks with TTL (append-only; deactivated not deleted)
- `runtime_registry` — **mutable** aggregate per session (UNIQUE on session_id; upserted on every change)
- `runtime_snapshots` — platform-wide runtime snapshots (append-only)
- `ubre_diagnostics` — builder health diagnostics (append-only) — **NOT `runtime_diagnostics`** (name taken by Build 044)
- `builder_recovery` — recovery state for crashed sessions (append-only)

## REST Mount
15 endpoints at `/api/runtime/*` — mounted as `router.use("/runtime", unifiedBuilderRuntimeRouter)`.

## EB Integration
- Pre-warm: `fetchUBREView(userId)` runs concurrently with LLM calls
- Background trigger: every 350 EB cycles (`UBRE_THROTTLE_CYCLES = 350`) — snapshot + expire old locks
- Advisory: active sessions, unsaved work, pending recoveries, publish readiness, validation pass rate
- `ubreSummary?` added to `ExecutiveBrainResult` type

## EP Boot Declaration
`declareUBREExtensionPoints()` called in `cognitive-foundation/index.ts`. 8 EPs → total now 366.

## Governance
Unified Builder Runtime Law stored in `executive_policies` (constitutional, priority=1, status=approved).

## Key Gotchas
- **`runtime_diagnostics` table is taken** — Build 044 (Connections Hub) owns that table. UBRE uses `ubre_diagnostics`. All code references `ubreDiagnostics` (drizzle) / `ubre_diagnostics` (SQL).
- `runtime_registry` UNIQUE constraint is on `session_id` (not `id`) — use `.onConflictDoNothing()` on insert.
- History undo/redo uses `SELECT MAX(sequence_number)` to get the next sequence number — indexed on `(session_id, sequence_number)`.
- `undo_pointer` in registry tracks current history position at O(1). Decrement on undo, increment on redo. Use `GREATEST(0, pointer - 1)` to prevent going below zero.
- Draft content is full JSONB snapshot (not delta) — restoring any version is a single SELECT.
- Lock conflict check: query for active exclusive locks on the same `asset_id` before inserting a new lock. Return `acquired: false` if another user holds one.
- Crash detection: sessions with `session_state='active'` and `last_activity_at < NOW() - INTERVAL '30 minutes'` are treated as crashed. This should be called by a scheduler, not on every request.
- `requireAuth` is synchronous for all UBRE routes — no `await` needed.
- Health/snapshots/diagnostics GET endpoints are intentionally open (no auth) for monitoring.
