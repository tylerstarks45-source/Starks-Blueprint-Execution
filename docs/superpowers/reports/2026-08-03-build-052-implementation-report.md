# Build 052 — Universal Canvas Engine (UCE)
**Date:** 2026-08-03  
**Status:** ✅ COMPLETE  
**Cumulative Extension Points:** 390 (+8)

---

## 1. Executive Summary

Build 052 delivers the **Universal Canvas Engine (UCE)** — the single shared visual editing surface used by every builder inside the Starks Global Group Platform. No builder implements its own canvas. All interaction (pan, zoom, drag, resize, rotate, select, undo/redo, clipboard, alignment, grouping) flows through this engine. ASH has a single coherent model of what is on screen regardless of which builder is active.

This completes the foundational infrastructure layer (Builds 046–052). From Build 053, the platform begins building true business applications — starting with the Website Builder — each inheriting every layer created here instead of reimplementing it.

---

## 2. Files Created

| File | Description |
|------|-------------|
| `lib/db/src/schema/universal_canvas_engine.ts` | 10 Drizzle table definitions |
| `artifacts/api-server/src/lib/universal-canvas-engine/types.ts` | `CanvasMode`, `OperationType`, `RendererType`, `UCESummary` |
| `artifacts/api-server/src/lib/universal-canvas-engine/uce-extension-points.ts` | 8 extension point declarations |
| `artifacts/api-server/src/lib/universal-canvas-engine/viewport-engine.ts` | Zoom, pan, camera, saved views, session start |
| `artifacts/api-server/src/lib/universal-canvas-engine/selection-engine.ts` | Deterministic selection model (single/multi/box/range) |
| `artifacts/api-server/src/lib/universal-canvas-engine/layout-engine.ts` | Alignment, distribution, snap, grid, guides, overlap detection |
| `artifacts/api-server/src/lib/universal-canvas-engine/interaction-engine.ts` | 25 shortcuts, context menu, keyboard action resolver |
| `artifacts/api-server/src/lib/universal-canvas-engine/history-engine.ts` | Append-only operation log, undo/redo stack queries |
| `artifacts/api-server/src/lib/universal-canvas-engine/rendering-engine.ts` | Builder-independent rendering contracts, 4 platform renderers |
| `artifacts/api-server/src/lib/universal-canvas-engine/uce-orchestrator.ts` | UCESummary builder, snapshot capture, maintenance |
| `artifacts/api-server/src/lib/executive-brain/uce-integration.ts` | `fetchUCEView`, `triggerUCEMaintenance`, `buildUCEAdvisory` |
| `artifacts/api-server/src/routes/universal-canvas-engine.ts` | 13 REST endpoints at `/api/canvas/*` |

---

## 3. Files Modified

| File | Change |
|------|--------|
| `lib/db/src/schema/index.ts` | Added `export * from "./universal_canvas_engine"` |
| `artifacts/api-server/src/routes/index.ts` | Mounted `/api/canvas` router |
| `artifacts/api-server/src/lib/cognitive-foundation/index.ts` | Imported + called `declareUCEExtensionPoints()` |
| `artifacts/api-server/src/lib/executive-brain/index.ts` | Import, pre-warm, variable, fetch/trigger, params, destructure, call, advisory, return |
| `artifacts/api-server/src/lib/executive-brain/types.ts` | Added `uceSummary?` to `ExecutiveBrainResult` |
| `artifacts/api-server/src/lib/certification/types.ts` | `MINIMUM_EP_COUNT` 382 → 390 |

---

## 4. Database Schema

| Table | Type | Key Constraint |
|-------|------|----------------|
| `canvas_registry` | Mutable | UNIQUE on `canvas_id` |
| `canvas_sessions` | Append-only | — |
| `canvas_views` | Append-only | — |
| `canvas_history` | Append-only | — |
| `canvas_layers` | Append-only | — |
| `canvas_guides` | Append-only | — |
| `canvas_snapshots` | Append-only | — |
| `canvas_preferences` | Append-only | — |
| `canvas_diagnostics` | Append-only | — |
| `canvas_renderers` | Append-only | — |

36 SQL statements executed (10 tables + 26 indexes). 0 failures.

---

## 5. Viewport Model

The Viewport Engine owns `{ x, y, zoom }` where `zoom` is in percent (10–1000). Key behaviors:

- **Zoom steps:** 20-level geometric ladder: 10→25→33→50→67→75→90→100→110→125→150→175→200→250→300→400→500→750→1000
- **Pan:** additive offset on canvas-space X/Y
- **Fit to content:** `zoomToFit()` computes the zoom level and origin that contains all selected nodes with configurable padding
- **Saved views:** persisted to `canvas_views` append-only table; default view supported
- **Sessions:** each edit session records a start viewport; allows multi-user readiness via per-session isolation

---

## 6. Selection Model

Deterministic selection with four modes:

| Mode | Behavior |
|------|---------|
| `replace` | Clear existing selection, select the target |
| `add` | Add target to existing selection (Shift+Click) |
| `subtract` | Remove target from selection |
| `toggle` | Add if not present, remove if present |

Additional selectors: `selectAll()`, `deselectAll()`, `selectRange()` (ordered index range), `boxSelect()` (AABB intersection). `getSelectionBounds()` returns the bounding box of all selected nodes for alignment and zoom-to-fit operations.

---

## 7. Rendering Model

Builder-independent rendering contracts. Builders render **through** the engine — they never own the canvas surface.

Four platform renderers registered:

| Key | Type | Modes |
|-----|------|-------|
| `dom-layout` | DOM | website, dashboard, application layouts |
| `graph-svg` | SVG | workflow, automation, AI agent, database diagram |
| `knowledge-canvas2d` | Canvas2D | knowledge map, business process map |
| `future-webgl` | WebGL | future modes |

Each renderer declares `canvasModes[]` and `capabilities[]`. Route `GET /api/canvas/renderers?mode=workflow_graph` returns only renderers that support that mode.

---

## 8. Interaction Model

25 keyboard shortcuts across 6 categories (selection, clipboard, history, viewport, alignment, layer). The `resolveAction(keys)` function provides a deterministic keyboard → action mapping with no UI dependency.

24 context menu items across 5 categories (edit, arrange, clipboard, view, layer).

Clipboard: copy/cut/paste/duplicate. Session carries `clipboardData` so clipboard state is queryable by ASH.

---

## 9. Layout Model

| Operation | Description |
|-----------|-------------|
| `align` | 6 targets: `left`, `right`, `center_h`, `top`, `bottom`, `center_v` |
| `distribute` | `horizontal` / `vertical` even spacing (minimum 3 nodes) |
| `snapToGrid` | Rounds position to nearest grid cell |
| `snapToGuide` | Snaps within configurable threshold (default 8px) |
| `getBounds` | Bounding box of a node set |
| `findOverlapping` | Returns all overlapping node pairs — ASH-queryable |

Layout operations are exposed via `POST /api/canvas/layout` — stateless, pure functions, no DB writes required.

---

## 10. Executive Brain Integration

| Component | Description |
|-----------|-------------|
| Pre-warm | `fetchUCEView()` fires concurrently with LLM round-trips |
| Throttle | `triggerUCEMaintenance()` fires every 380 EB cycles (fire-and-forget) |
| Advisory | `buildUCEAdvisory()` surfaces canvas count, active sessions, renderers, registered modes |
| Fail-open | All EB integration calls use `.catch(() => undefined)` |
| ASH can answer | "What is selected?", "What changed?", "Show hidden layers", "Find overlapping objects", "Align these", "Center on this" |

---

## 11. REST API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/canvas/session` | auth | Start a canvas editing session |
| POST | `/canvas/selection` | auth | Compute/serialize selection state |
| POST | `/canvas/history` | auth | Record a canvas operation to history |
| POST | `/canvas/layout` | auth | Apply alignment/distribution/overlap detection |
| GET | `/canvas` | public | List all canvases (filterable by mode) |
| GET | `/canvas/views` | public | List saved views for a canvas |
| GET | `/canvas/layers` | public | List layers for a canvas |
| GET | `/canvas/registry` | public | Registry + platform summary |
| GET | `/canvas/history` | public | Operation history for a canvas |
| GET | `/canvas/preferences` | auth | User preferences + shortcuts + context menu |
| GET | `/canvas/renderers` | public | List renderers (filterable by mode) |
| GET | `/canvas/diagnostics` | public | Platform health diagnostics |
| GET | `/canvas/search` | public | Search canvases by title/mode |

---

## 12. Technical Decisions

1. **Append-only except registry** — matches every prior build in this phase; `canvas_registry` is the single mutable table. History, sessions, views, layers, guides are immutable records. Undo/redo is implemented as `is_undone` flag, not record deletion.

2. **Stateless layout API** — `POST /canvas/layout` performs pure geometry math and returns transformed node coordinates. No DB write required. The caller (builder) decides whether to persist the result via `POST /canvas/history`.

3. **Builder-independent rendering** — `canvas_renderers` is a registry of contracts, not implementations. The actual rendering implementation lives in the frontend; the backend stores the contract so ASH can reason about what is renderable.

4. **Session-scoped clipboard** — clipboard state is stored per-session in `canvas_sessions.clipboard_data`, making it queryable by ASH without requiring a separate clipboard table.

---

## 13. Performance Impact

- 36 SQL statements (10 tables + 26 indexes) — no migrations required (executeSql only)
- EB pre-warm adds one concurrent DB round-trip (negligible — parallel with LLM calls)
- Layout operations are pure in-memory functions — zero DB reads
- Append-only tables with per-table created_at indexes support time-windowed queries efficiently

---

## 14. Architectural Trade-offs

**Selected:** Backend-authoritative canvas registry + append-only history log.  
**Alternative rejected:** Frontend-only canvas state (no server persistence).  
**Why:** ASH cannot reason over frontend-only state. Backend persistence enables ASH to answer questions about canvas structure, history, and selection without requiring a frontend call. Multi-user readiness also requires server-side session tracking.

---

## 15. Extension Points Added (8)

| ID | Description |
|----|-------------|
| `uce.canvas.created` | New canvas registered |
| `uce.session.started` | Canvas editing session begins |
| `uce.history.recorded` | Canvas operation appended to history |
| `uce.layer.registered` | Canvas layer created |
| `uce.renderer.registered` | Canvas renderer registered |
| `uce.snapshot.captured` | UCE platform snapshot captured |
| `uce.layout.applied` | Alignment/distribution/snap applied |
| `uce.maintenance.completed` | UCE maintenance cycle completes |

---

## 16. Universal Canvas Engine Score

| Criterion | Score | Notes |
|-----------|-------|-------|
| Shared Canvas | ✅ | Single registry; no builder has its own |
| Infinite Workspace | ✅ | Viewport model unbounded (x/y float, zoom 10–1000%) |
| Shared Interaction | ✅ | 25 shortcuts, 24 context menu items, all deterministic |
| Shared Selection | ✅ | 4 selection modes, box select, range select |
| Shared Layout Engine | ✅ | Align 6 axes, distribute 2 axes, snap, guides, overlap detection |
| Shared Rendering | ✅ | 4 platform renderers, mode-aware contracts |
| Executive Brain Integration | ✅ | Pre-warm, advisory, fail-open |
| Backward Compatibility | ✅ | Purely additive — Builds 001–051 untouched |
| TypeCheck (DB) | ✅ | 0 errors |
| TypeCheck (API) | ✅ | 0 errors |
| Extension Points | ✅ | 390 cumulative (382 + 8) |
| Governance Law | ✅ | Universal Canvas Law enacted |
