---
name: Unified Visual Component Framework
description: Build 051 — UVCF; 10 tables, 8 EPs, total 382 EPs; 31 components, 13 families, 52 tokens, 5 variants; semantic + a11y contracts; UVCF_THROTTLE_CYCLES=370.
---

# Unified Visual Component Framework (UVCF) — Build 051

**Why:** One canonical visual language for every platform application. ASH reasons over component semantic intent, not widget appearance.

## Key Numbers
- 10 tables: `component_families`, `visual_components`, `component_variants`, `design_tokens`, `component_manifests`, `component_capabilities`, `component_registry`, `component_snapshots`, `component_usage`, `component_diagnostics`
- 8 extension points declared by `declareUVCFExtensionPoints()`
- Cumulative EPs after this build: **382**
- `UVCF_THROTTLE_CYCLES = 370` (EB fires maintenance every 370 cycles)
- Route prefix: `/api/components/*` (13 endpoints)

## Mutable Table
`component_registry` — UNIQUE on `component_key`; all other tables are append-only or insert-only.

## Semantic Intelligence
Every `visual_components` row carries:
- `semantic_meaning` — human-readable ("Triggers an action")
- `semantic_intent` — machine tag (`action-trigger`, `data-entry`, `navigation`, etc.)
- `ash_semantic_tag` — coarse category (`action`, `input`, `navigation`, `toggle`, `data`, `container`, `dialog`, `feedback`, `status`, `search`, `canvas`, `editor`, `future`)

ASH resolves intent → component via `GET /api/components/semantic`.

## Seeded at Build
- 13 component families (layout/navigation/input/display/data/feedback/builder/canvas/property/dialog/command/visualization/future)
- 31 foundation components with full accessibility roles + semantic metadata
- 52 design tokens (color×17, typography×12, spacing×8, elevation×3, sizing×4, animation×4, layout×5)
- 5 button variants (primary/secondary/destructive/ghost/outline)
- 2 initial snapshots (seed + post-seed)
- Unified Visual Language Law in `executive_policies`

## How to Apply
- Adding a new platform component: `POST /api/components/register` (admin)
- Adding a design token: `POST /api/components/themes` (admin)
- Adding a variant: `POST /api/components/variants` (admin)
- EB advisory: `buildUVCFAdvisory(uvcfSummary)` in `uvcf-integration.ts`
- Platform apps must use UVCF components; no bespoke widget libraries allowed.
