---
name: Universal Canvas Engine
description: Build 052 — UCE; 10 tables, 8 EPs, total 390 EPs; 4 renderers, 9 canvas modes; canvas_registry only mutable; stateless layout API; UCE_THROTTLE_CYCLES=380.
---

# Universal Canvas Engine (UCE) — Build 052

**Why:** One shared visual editing surface for every platform builder. ASH reasons over the canvas, not builder-specific rendering. No builder may implement its own canvas.

## Key Numbers
- 10 tables: `canvas_registry`, `canvas_sessions`, `canvas_views`, `canvas_history`, `canvas_layers`, `canvas_guides`, `canvas_snapshots`, `canvas_preferences`, `canvas_diagnostics`, `canvas_renderers`
- 8 extension points declared by `declareUCEExtensionPoints()`
- Cumulative EPs after this build: **390**
- `UCE_THROTTLE_CYCLES = 380` (EB fires maintenance every 380 cycles)
- Route prefix: `/api/canvas/*` (13 endpoints)

## Mutable Table
`canvas_registry` — UNIQUE on `canvas_id`; all others are append-only.

## Canvas Modes (9 + future)
`website_layout`, `workflow_graph`, `automation_graph`, `dashboard_layout`, `application_layout`, `database_diagram`, `knowledge_map`, `business_process_map`, `ai_agent_flow`, `future_mode`

## Platform Renderers (4)
- `dom-layout` — DOM — website/dashboard/application layouts
- `graph-svg` — SVG — workflow/automation/AI agent/database diagram
- `knowledge-canvas2d` — Canvas2D — knowledge map/business process
- `future-webgl` — WebGL — future modes

## Architecture Notes
- **Stateless layout API** — `POST /api/canvas/layout` runs pure geometry (align/distribute/overlap) and returns transformed nodes; no DB write.
- **Append-only history** — undo/redo uses `is_undone` flag, never deletes history rows.
- **Session-scoped clipboard** — clipboard state lives in `canvas_sessions.clipboard_data`, queryable by ASH.
- **Builder-independent rendering** — `canvas_renderers` is a contract registry; actual rendering lives in the frontend.

## How to Apply
- Register a new canvas: `POST /api/canvas/session` (start session) + insert into `canvas_registry` via SQL
- Add a renderer for a new builder: direct SQL insert into `canvas_renderers`
- Layout geometry: `POST /api/canvas/layout` with `operation=align|distribute|overlapping`
- EB advisory: `buildUCEAdvisory(uceSummary)` in `uce-integration.ts`
