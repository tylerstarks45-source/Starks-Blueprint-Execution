---
name: Unified Platform Operating System (UPOS)
description: Build 046 — UPOS architecture, tables, endpoints, EB integration pattern, and gotchas.
---

## The Rule
Every authenticated experience runs through UPOS. No application may implement its own workspace, project, search, notifications, activity, command routing, or runtime context system.

**Why:** Prevents fragmented UX and duplicated infrastructure across the platform's growing application surface.

**How to apply:** All new applications must register via the Application Registry (`platform_applications`). All new commands must be declared in the manifest and seeded into `platform_commands`. Navigation context must be updated via `PATCH /api/platform/context` on every page load.

---

## DB Tables (10)
- `platform_workspaces` — workspace containers per user
- `platform_projects` — work units inside workspaces (linked to an app via `app_id`)
- `platform_applications` — registered app manifests (unique on `app_id`); mutable (upsert on re-register)
- `platform_sessions` — active UPOS sessions
- `platform_context` — **one mutable row per user** (upserted via `PATCH /api/platform/context`)
- `platform_commands` — global command registry (unique on `command_id`)
- `platform_notifications` — user notification feed (append-only)
- `platform_activity` — append-only activity timeline
- `platform_registry` — mutable per-app aggregate health row (upserted)
- `platform_snapshots` — append-only runtime snapshots

## Built-in Apps (seeded at init)
| App | app_id | domain |
|-----|--------|--------|
| Website Builder | `com.starksglobal.website-builder` | builder |
| CRM | `com.starksglobal.crm` | crm |
| Automation Builder | `com.starksglobal.automation-builder` | automation |
| Dashboard | `com.starksglobal.dashboard` | analytics |

## REST Mount
All 14 endpoints at `/api/platform/*` — mounted in `routes/index.ts` as `router.use("/platform", unifiedPlatformRouter)`.

## EB Integration
- Pre-warm: `fetchUPOSView(userId)` runs concurrently with LLM calls (A-01 pattern)
- Background trigger: every 320 EB cycles (`UPOS_THROTTLE_CYCLES = 320`)
- Context note advisory: UPOS summary + context snapshot delivered to ASH each cycle
- `uposSummary?` field added to `ExecutiveBrainResult` type

## EP Boot Declaration
`declareUPOSExtensionPoints()` must be called in `cognitive-foundation/index.ts` — same boot sequence as all prior builds. 8 EPs → total now 342.

## Governance
Unified Platform Law stored in `executive_policies` (not a separate table). `policy_type = 'constitutional'`, `status = 'approved'`, `priority = 1`.

## Key Gotchas
- `platform_workspaces` table name can silently fail to create if the DDL semicolon split hits a SQL comment line — verify with `pg_tables` after creation.
- `AppManifest` interface needs a `manifest?: Record<string, unknown>` optional field to match the DB column.
- Router `insert().returning()` returns `any[] | QueryResult<never>` — type-assert as `any[]` then index `[0]` to avoid TS2488.
- `governance_policies` (referenced in cert types) is `executive_policies` in the actual DB — the cert check label is misleading.
- Dead code snippet `const { default: _ignore, ...rest } = { default: null }` was in `upos-orchestrator.ts initializeUPOS` — removed.
