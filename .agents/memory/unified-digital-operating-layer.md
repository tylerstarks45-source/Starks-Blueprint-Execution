---
name: Unified Digital Operating Layer
description: Build 043 — runtime execution layer for all external interactions; 9 tables, 8 EPs, 310 cumulative EPs; 6 engines; 14 operating domains; execution_sessions collision note; Unified Operating Law enacted.
---

## Core facts

- **9 new tables**: `digital_workspaces`, `dol_execution_sessions` (NOT `execution_sessions` — see collision note), `environment_profiles`, `capability_bindings`, `execution_channels`, `execution_receipts`, `runtime_diagnostics`, `operating_registry`, `operating_snapshots`
- **8 EPs** → **310 cumulative** (confirmed in boot log)
- **Routes**: `/api/operating` — 4 POST (discover/session/channel/diagnostics) + 6 GET (workspaces/environments/channels/receipts/registry/snapshots)
- **EB throttle**: 300 cycles (`DOL_THROTTLE_CYCLES = 300`)
- **Integration file**: `executive-brain/digital-operating-layer-integration.ts`
- **Main init fn**: `initializeOperatingLayer(userId)` in `digital-operating-layer/dol-orchestrator.ts`

## CRITICAL: Table name collision

`execution_sessions` is already exported from `universal_execution.ts` AND has FK constraints referencing it from 6 other tables. The DOL schema uses `dolExecutionSessions` → table `dol_execution_sessions`. Do NOT create a table named `execution_sessions` in any new build.

## Architecture

The Operating Layer executes approved work — it never decides, plans, or authorizes. Separation of concerns: reasoning (EB) / authority (governance) / execution (DOL).

14 operating domains: desktop, filesystem, browser, terminal, operating_system, cloud_infrastructure, databases, developer_tools, communication_platforms, business_platforms, ai_providers, api_services, automation_platforms, future_connectors.

Every external action must produce:
1. Execution receipt (`execution_receipts`)
2. Audit evidence (in receipt `evidence` jsonb)
3. Authority reference (`authority_ref` field)
4. Session reference (`session_id` FK)
5. Rollback metadata (`rollback_ref` field, when applicable)

## Session pattern

`createSession()` returns a managed session with TTL (default 30 min). Sessions auto-expire via `expireStaleSessionsLocal()`. Registry `session_count` is updated best-effort (fire-and-forget SQL).

## Unified Operating Law

"Every external action performed by ASH shall execute through the Unified Digital Operating Layer. No browser automation, desktop automation, filesystem operation, cloud operation, connector, or API execution may bypass the operating layer. Every operation must produce: execution receipt, audit evidence, authority reference, session reference, rollback metadata (when applicable)."

**Why:** Without a single runtime chokepoint, external actions can bypass audit trails, operate without authority validation, and create untracked side effects in external systems.

**How to apply:** Any future build that performs an external action (API call, file write, browser click, DB query) must call `createReceipt()` before returning. `openChannel()` must precede any channel-specific operation. All of this is scoped within a `createSession()` lifecycle.
