---
name: Unified Application Framework (UAF)
description: Build 050 — UAF architecture, 10 tables, 6 engines, EB integration, 14 seeded platform apps, and gotchas.
---

## The Rule (Unified Application Law)
Every application inside the platform registers through UAF. Applications own user experiences. The platform owns infrastructure. ASH owns orchestration.

**Why:** Eliminates per-app duplication of registration, navigation, lifecycle, capability declaration, and health monitoring. Every new app inherits enterprise-grade application infrastructure from day one.

**How to apply:** New apps register via POST /api/applications/register, declare pages via /pages, declare capabilities via /capabilities. UAF owns all metadata; the app owns rendering.

---

## DB Tables (10)
- `platform_app_manifests` — immutable versioned manifests with SHA-256 hash (append-only)
- `platform_pages` — navigation pages per app (append-only)
- `platform_views` — view modes within pages: table/kanban/calendar/etc. (append-only)
- `platform_panels` — sidebars, drawers, inspectors (append-only)
- `platform_widgets` — reusable UI widgets; `is_platform_widget=true` means available everywhere (append-only)
- `platform_services` — backend services exposed by an app (append-only)
- `application_capabilities` — what each app can do; `ash_can_invoke=true` means ASH can invoke it (append-only)
- `application_registry` — **mutable** current state per app (UNIQUE on `app_id`); only mutable table
- `application_snapshots` — platform-wide app state snapshots (append-only)
- `application_diagnostics` — per-app and platform health diagnostics (append-only)

## REST Mount
13 endpoints at `/api/applications/*` — mounted as `router.use("/applications", unifiedApplicationFrameworkRouter)`.

## EB Integration
- Pre-warm: `fetchUAFView(userId)` runs concurrently with LLM calls
- Background trigger: every 360 EB cycles (`UAF_THROTTLE_CYCLES = 360`) — snapshot
- Advisory: total apps, enabled, capabilities ASH-invocable, pages, widgets, services
- `uafSummary?` added to `ExecutiveBrainResult` type

## EP Boot Declaration
`declareUAFExtensionPoints()` called in `cognitive-foundation/index.ts`. 8 EPs → total now 374.

## Governance
Unified Application Law stored in `executive_policies` (constitutional, priority=1, status=approved).

## Seeded Data
- 14 platform applications (all `is_platform_app=true`, `lifecycle_state=enabled`)
- 14 manifests (v1.0.0 for each app)
- 13 default pages (one per non-reserved app)
- 37 capabilities (4 per builder app × 8 builders = 32; 5 platform apps × 1 = 5; total 37)

## Key Gotchas
- **`application_registry` has UNIQUE constraint on `app_id`** — use `ON CONFLICT (app_id) DO NOTHING` or check before insert; never assume first insert will succeed on a re-seed.
- **Platform apps cannot be disabled** — `disableApplication()` checks `isPlatformApp` and returns `{ success: false }` for platform apps. This is an API-level guard (no DB constraint), so direct SQL updates are still possible.
- **Manifests are immutable** — each version = new row. Update the registry's `manifest_id` to roll back. Never UPDATE a manifest row.
- **Capabilities are append-only** — no soft-delete. Capabilities persist across upgrades for backward compatibility.
- **`ash_can_invoke=true` is default for all capabilities** — restrict post-hoc via `requires_permissions` if admin-only; don't toggle `ash_can_invoke=false` unless the capability genuinely shouldn't be invocable by ASH.
- **Navigation tree built on-demand** — `getNavigationMenu()` queries `platform_pages` with `ORDER BY sort_order`. Sidebar = rows with `menu_placement='sidebar'`. No hardcoded routes anywhere.
- **`requireAdmin` is async** in all POST routes — must `await requireAdmin(req, res)` and check for `null`.
- **All GET endpoints are open (no auth required)** — this is intentional; application metadata is not sensitive.
- **Build 051 note**: Website Builder etc. will use UAF at registration + UBRE at edit time. Don't conflate registration (UAF) with editing sessions (UBRE). They are separate layers for different purposes.
