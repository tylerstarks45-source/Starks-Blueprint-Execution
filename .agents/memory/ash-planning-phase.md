---
name: ASH Planning Phase Architecture
description: How the new 3-phase ASH build flow works — present_plan → collect_credentials → start_build
---

## The 3-Phase Build Flow

Phase 1 → `present_plan`: ASH returns full plan (architecture, tool stack, build steps, revenue projections, credentials list) WITHOUT collecting credentials yet.

Phase 2 → `collect_credentials`: After user confirms plan (sends "I've reviewed the plan and I'm ready to proceed").

Phase 3 → `start_build`: After credentials submitted.

## Frontend State

- `pendingPlanData`: `{ blueprint, systemName, buildSteps[], requiredCredentials[] }` — set when action is `present_plan`
- `phase === 'planning'`: triggers violet-themed plan card in chat + status bar
- Session/checkpoint restore converts `planning` → `idle` (pendingPlanData not persisted)
- `isInputDisabled` only disables in planning phase when `pendingPlanData` is non-null

## Key Rule

When user says "I confirm" / "ready" / "proceed" → ASH must return `collect_credentials` (not `present_plan` again). Enforced by system prompt.

**Why:** User testing showed original flow (jump straight to credentials) was confusing — users didn't understand what they were building before committing credentials.
