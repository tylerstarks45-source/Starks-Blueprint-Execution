---
name: Unified Workspace & Project System (UWPS)
description: Build 047 — UWPS architecture, tables, engines, EB integration, and gotchas.
---

## The Rule (Unified Workspace Law)
Every object created inside the platform shall belong to a Business and Project. No builder or application may create orphaned assets. Projects own assets, not applications. ASH reasons over projects, not files.

**Why:** Prevents fragmented data. Enables cross-builder reasoning, health scoring, dependency analysis, and long-term business management.

**How to apply:** All new builders must call `registerAsset()` when creating any persistent object. Pass `projectId` (required) and `businessId`/`workspaceId` (recommended).

---

## DB Tables (10)
- `business_workspaces` — workspace containers per business (mutable status)
- `business_projects` — projects with phase lifecycle (mutable status/phase)
- `project_assets` — every registered platform asset (mutable status/version/deployment)
- `asset_relationships` — **append-only** directed dependency graph (8 types, 3 strengths)
- `asset_versions` — **append-only** version lineage per asset
- `project_activity` — **append-only** workspace activity timeline (13 types, 3 actors)
- `project_health` — **append-only** health score snapshots (6 dimensions, 0–100)
- `project_registry` — **mutable** per-project aggregate (UNIQUE on project_id; upserted on creation + health recompute)
- `workspace_snapshots` — **append-only** runtime snapshots
- `project_templates` — built-in templates (append+seed, idempotent)

## Built-in Templates (seeded at init)
website, crm, automation, saas, dashboard

## REST Mount
All 15 endpoints at `/api/workspace/*` — mounted as `router.use("/workspace", unifiedWorkspaceRouter)`.

## EB Integration
- Pre-warm: `fetchUWPSView(userId)` runs concurrently with LLM calls
- Background trigger: every 330 EB cycles (`UWPS_THROTTLE_CYCLES = 330`)
- Advisory: project count, asset count, avg health score, low-health projects → ASH can answer "what's missing?", "what next?", "can I delete this?"
- `uwpsSummary?` field added to `ExecutiveBrainResult` type

## EP Boot Declaration
`declareUWPSExtensionPoints()` called in `cognitive-foundation/index.ts`. 8 EPs → total now 350.

## Governance
Unified Workspace Law stored in `executive_policies` (constitutional, priority=1, status=approved).

## Project Health Dimensions
Completeness (30%) + Activity (15%) + Dependency (20%) + Deployment (15%) + Documentation (10%) + Automation (10%) = Overall (0–100).

## Key Gotchas
- `ExtensionPointDefinition` only has 3 fields: `id`, `description`, `declaredBy` — no `name`, `category`, `engineId`, `version`.
- `requireAuth` and `requireAdmin` both live in `lib/auth.ts`, not a `middleware/` directory.
- `requireAdmin` is Express middleware `(req, res, next)` — pass it directly in the route chain, don't call it.
- `project_registry` is the ONLY mutable table — all others are append-only.
- `project_registry` uniqueness is on `project_id` (not `id`) — use `ON CONFLICT DO NOTHING` or check before insert.
- Soft FK: `business_workspaces.business_id` has no DB constraint — additive-only, existing businesses table untouched.
- Health `DISTINCT ON (project_id)` query needs `ORDER BY project_id, computed_at DESC` to get latest score per project.
