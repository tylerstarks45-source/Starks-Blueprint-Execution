---
name: Executive Execution Engine
description: Build 010 — execution layer for the ASH Cognitive OS; 6 tables, 10-state machine, adapter interfaces, 54 EPs at boot.
---

## Rule
Execution NEVER plans, judges, or changes goals. It only coordinates execution of approved plans.
`db` client imports from `@workspace/db` (not `../db`). All `.then(rows => rows[0]!)` calls need explicit row types or they trigger TS7006.

**Why:** This was learned during typecheck — `../db` doesn't exist; the Drizzle `db` pool is exported directly from `@workspace/db`.

**How to apply:** Every new registry/history file in `lib/executive-execution/` must import `db` from `@workspace/db`, not a local path.

## State machine
Valid transitions (terminal: completed, failed, cancelled):
- pending → approved, cancelled
- approved → running, cancelled
- running → waiting, paused, blocked, retrying, completed, failed, cancelled
- waiting → running, cancelled, failed
- paused → running, cancelled
- blocked → running, cancelled, failed
- retrying → running, failed, cancelled
- failed → retrying, cancelled

Step statuses: pending, running, paused, completed, failed, skipped, retrying, cancelled
("blocked" is NOT a valid step status — only an execution-level status)

## Extension points (10 new, 54 total at boot)
execution-started, execution-completed, execution-failed, execution-paused,
execution-resumed, execution-cancelled, execution-step-started,
execution-step-completed, execution-step-failed, execution-retry-triggered

## Files
- `lib/db/src/schema/executive_execution.ts` — 6 tables
- `lib/executive-execution/types.ts` — all types (self-contained)
- `lib/executive-execution/execution-extension-points.ts` — 10 EPs
- `lib/executive-execution/execution-state-machine.ts` — transition validation (pure)
- `lib/executive-execution/execution-step-engine.ts` — step transition helpers (pure)
- `lib/executive-execution/execution-coordinator.ts` — coordination logic (pure)
- `lib/executive-execution/execution-history.ts` — immutable event log
- `lib/executive-execution/execution-adapters.ts` — adapter interfaces only (not implemented)
- `lib/executive-execution/execution-registry.ts` — all persistence
- `lib/executive-execution/execution-services.ts` — shared barrel
- `lib/executive-brain/execution-integration.ts` — EB integration (fetchActiveExecutions, ensureExecutionForActivePlan)
- `routes/executive-execution.ts` — ~25 REST endpoints under /api/executive-execution/
