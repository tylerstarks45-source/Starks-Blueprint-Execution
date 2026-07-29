---
name: Executive Context Engine (Build 006)
description: Architecture of the shared cognitive context layer — tables, modules, boot wiring, and integration with Executive Brain.
---

## Tables (4 new, applied manually via Pool.query)
- `executive_contexts` — the full context model (24 cols, UUID PK, JSONB arrays for objectives/constraints/priorities/risks/etc)
- `context_snapshots` — immutable write-once snapshots (no updated_at); created before each Executive Brain reasoning cycle
- `context_timeline_events` — append-only audit trail; ON DELETE CASCADE from executive_contexts
- `context_entity_links` — polymorphic entity links (context ↔ project/goal/artifact/cluster/brain/etc); UNIQUE(context_id, entity_type, entity_id)

## Drizzle schema
- `lib/db/src/schema/executive_context.ts` — schema definitions + Zod schemas
- `lib/db/src/schema/index.ts` — added `export * from "./executive_context"`
- **Must run `pnpm --filter @workspace/db exec tsc` after schema changes** — the api-server uses TypeScript project references and resolves `@workspace/db` from compiled `dist/` declarations, not from source directly.

## Module files (artifacts/api-server/src/lib/executive-context/)
- `types.ts` — all types defined locally (NOT re-exported from @workspace/db) to avoid the project-references rebuild requirement for type consumers
- `context-registry.ts` — CRUD, validate, timeline events, entity links
- `context-resolution.ts` — `resolveContextSnapshot()` builds one immutable snapshot; `freezeSnapshot()` takes `Omit<ExecutiveContextSnapshot, "id" | "createdAt">` (includes userId)
- `context-services.ts` — getCurrentContext, getRelevantContext, getContextTimeline, getContextSummary, getContextDiagnostics
- `context-extension-points.ts` — declares 6 seams via existing `declareExtensionPoint`; re-exports `CONTEXT_EXTENSION_POINT_IDS` from types
- `index.ts` — barrel

## Routes
- `artifacts/api-server/src/routes/executive-context.ts` — 18 endpoints under `/api/executive-context/`
- Registered in `routes/index.ts` after `executiveBrainRouter`
- Auth: uses `requireAuthActive(req, res)` pattern (not middleware-style requireAuth)

## Boot wiring
- `cognitive-foundation/index.ts` `initializeCognitiveFoundation()` now calls `declareContextExtensionPoints()` — extension points count: 27 total (21 previous + 6 context)

## Executive Brain integration
- `executive-brain/index.ts` calls `resolveContextSnapshot(userId, message)` at the START of `runExecutiveBrain()` (before planning)
- `contextSnapshotId` stored in consolidation metadata for Decision Records
- `contextSnapshotId?` added to `ExecutiveBrainResult`
- `buildContextNote()` includes context advisory (objectives, priorities, constraints, conflict flags)

## Key architectural rule
**Why:** `types.ts` defines constants locally rather than re-exporting from `@workspace/db` — this avoids the project-references rebuild requirement in application-layer modules that only need types, not DB access.
**How to apply:** Any future Build that adds types to the DB schema and needs them in the api-server layer should define application-layer types locally and only import the table objects (not const arrays or type aliases) from `@workspace/db`.
