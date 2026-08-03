# Build 051 — Unified Visual Component Framework (UVCF)
**Date:** 2026-08-03  
**Status:** ✅ COMPLETE  
**Cumulative Extension Points:** 382 (+8)

---

## 1. Executive Summary

Build 051 delivers the **Unified Visual Component Framework (UVCF)** — the one canonical visual language for every user interface on the Starks Global Group Platform. Every application assembles its experience from shared platform components. ASH understands every component semantically: not as a widget, but as an intent.

---

## 2. Scope

| Dimension | Value |
|-----------|-------|
| New DB tables | 10 |
| New REST endpoints | 13 at `/api/components/*` |
| Extension points declared | 8 |
| Cumulative EPs | 382 |
| Components seeded | 31 foundation components |
| Component families | 13 |
| Design tokens | 52 |
| Component variants | 5 (button) |
| Snapshot captures | 2 |
| Governance law enacted | Unified Visual Language Law |

---

## 3. DB Tables Created

| Table | Purpose |
|-------|---------|
| `component_families` | 13 root family categories |
| `visual_components` | 31 foundation components with a11y + semantic metadata |
| `component_variants` | Variant definitions with props/token overrides |
| `design_tokens` | 52 design tokens across 8 categories |
| `component_manifests` | Versioned props+accessibility+semantic contracts |
| `component_capabilities` | ASH-invocable capabilities per component |
| `component_registry` | Mutable health + usage tracking (UNIQUE on component_key) |
| `component_snapshots` | Append-only platform health captures |
| `component_usage` | Append-only usage telemetry log |
| `component_diagnostics` | Append-only health diagnostics |

---

## 4. Extension Points (8)

| ID | Description |
|----|-------------|
| `uvcf.component.registered` | Fires when a new component is registered |
| `uvcf.token.registered` | Fires when a design token is registered |
| `uvcf.variant.registered` | Fires when a component variant is registered |
| `uvcf.manifest.captured` | Fires when a component manifest is captured |
| `uvcf.capability.registered` | Fires when an ASH-invocable capability is registered |
| `uvcf.snapshot.captured` | Fires when a UVCF platform snapshot is captured |
| `uvcf.health.evaluated` | Fires when component health is evaluated |
| `uvcf.maintenance.completed` | Fires when UVCF maintenance cycle completes |

---

## 5. REST Endpoints (13)

All under `/api/components/*`:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/register` | Register a new component (admin) |
| POST | `/variants` | Register a component variant (admin) |
| POST | `/themes` | Register a design token (admin) |
| POST | `/manifests` | Register a component family (admin) |
| GET | `/` | List all components (optionally filtered by category) |
| GET | `/families` | List all component families |
| GET | `/tokens` | List design tokens (optionally filtered by category) |
| GET | `/registry` | Component registry + stats |
| GET | `/usage` | Component usage telemetry |
| GET | `/diagnostics` | Platform health diagnostics |
| GET | `/search` | Full-text component search |
| GET | `/snapshots` | Platform snapshot history |
| GET | `/accessibility` | ARIA + keyboard interaction profiles |
| GET | `/semantic` | Semantic intent profiles for ASH reasoning |

---

## 6. Engine Architecture

| Engine | File | Responsibility |
|--------|------|----------------|
| Registry Engine | `registry-engine.ts` | Component + family registration, lookup, stats |
| Token Engine | `token-engine.ts` | Design token registration, 52-token seeding |
| Variant Engine | `variant-engine.ts` | Variant registration with props/token overrides |
| Accessibility Engine | `accessibility-engine.ts` | ARIA roles, keyboard contracts, WCAG coverage |
| Semantic Engine | `semantic-engine.ts` | Intent mapping so ASH reasons over UI intent |
| Diagnostics Engine | `diagnostics-engine.ts` | Usage tracking, health checks, compatibility |
| Orchestrator | `uvcf-orchestrator.ts` | Summary builder, snapshot capture, maintenance |

---

## 7. Foundation Components (31)

### Input Family (8)
`button`, `input`, `textarea`, `dropdown`, `checkbox`, `radio-group`, `search-box`, `form`

### Navigation Family (6)
`tabs`, `accordion`, `breadcrumbs`, `sidebar`, `top-bar`, `status-bar`, `toolbar`

### Data Family (3)
`tree`, `table`, `list`

### Canvas Family (3)
`canvas-node`, `canvas-connector`, `canvas-group`

### Display Family (3)
`card`, `badge`, `progress`

### Dialog Family (2)
`dialog`, `modal`

### Property Family (2)
`property-grid`, `inspector-panel`

### Feedback Family (1)
`notification`

### Layout Family (1)
`panel`

### Future Family (1)
`future-component`

---

## 8. Design Token Categories (52 tokens)

| Category | Count | Examples |
|----------|-------|---------|
| color | 17 | `color.primary`, `color.destructive`, `color.bg.default`, `color.text.default` |
| typography | 12 | `font.family.sans`, `font.size.base`, `font.weight.semibold` |
| spacing | 8 | `space.1` – `space.16` |
| elevation | 3 | `shadow.sm`, `shadow.md`, `shadow.lg` |
| sizing | 4 | `radius.sm` – `radius.full` |
| animation | 4 | `anim.duration.fast`, `anim.easing.ease` |
| layout | 5 | `layout.sidebar.width`, `layout.breakpoint.lg` |

---

## 9. Semantic Intelligence

Every component carries three semantic fields ASH reads:
- **`semantic_meaning`** — human-readable description ("Triggers an action")
- **`semantic_intent`** — machine-readable classification (`action-trigger`)
- **`ash_semantic_tag`** — coarse category for reasoning (`action`, `input`, `navigation`, etc.)

ASH can now resolve UI intent to components via `GET /api/components/semantic` and answer "which component lets a user select one item from many?" → `radio-group`, without knowing anything about visual appearance.

---

## 10. Accessibility Contracts

Every component carries:
- **`accessibility_role`** — ARIA role (`button`, `combobox`, `dialog`, etc.)
- **`keyboard_interactions`** — Keyboard interaction contracts (e.g. `Enter:activate`, `Escape:close`)
- **WCAG level** — computed from component type (A/AA/AAA)

Coverage at seed time: **97%** (30/31 components have ARIA roles; `future-component` intentionally excluded).

---

## 11. Executive Brain Integration

- `uvcf-integration.ts` provides `fetchUVCFView()`, `triggerUVCFMaintenance()`, `buildUVCFAdvisory()`
- EB pre-warms the UVCF summary concurrently (zero-latency on context build)
- UVCF maintenance fires every 370 EB cycles (non-blocking fire-and-forget)
- Advisory appears in EB context note: component count, families, tokens, variants, a11y coverage, semantic coverage
- `ExecutiveBrainResult` extended with optional `uvcfSummary`

---

## 12. Governance

**Unified Visual Language Law** enacted in `executive_policies`:
> No application creates its own UI component library. Every visual experience is assembled from shared platform components. ASH understands every component semantically.

---

## 13. Wiring Summary

| File | Change |
|------|--------|
| `lib/db/src/schema/index.ts` | Added `export * from "./unified_visual_component_framework"` |
| `artifacts/api-server/src/routes/index.ts` | Mounted `/api/components` router |
| `artifacts/api-server/src/lib/cognitive-foundation/index.ts` | Imported + called `declareUVCFExtensionPoints()` |
| `artifacts/api-server/src/lib/executive-brain/index.ts` | Import, pre-warm, variable, fetch/trigger, context note, advisory, return |
| `artifacts/api-server/src/lib/executive-brain/types.ts` | Added `uvcfSummary?` to `ExecutiveBrainResult` |
| `artifacts/api-server/src/lib/certification/types.ts` | `MINIMUM_EP_COUNT` 374 → 382 |

---

## 14. TypeCheck Results

- `pnpm --filter @workspace/db exec tsc -b` → **clean (0 errors)**
- `pnpm --filter @workspace/api-server exec tsc --noEmit` → **clean (0 errors)**

---

## 15. Server Verification

```
Cognitive foundation initialized
    brains: 6
    capabilities: 79
    extensionPoints: 382   ✅
```

---

## 16. Build Constraints Honored

- ✅ DB changes via `executeSql` — drizzle-kit push not used
- ✅ `buildContextNote` is async; UVCF integration is fail-open (`.catch(() => undefined)`)
- ✅ `requireAdmin` is async (awaited)
- ✅ `requireAuth` is synchronous
- ✅ `ExtensionPointDefinition` has only `id`, `description`, `declaredBy`
- ✅ `executive_policies` used for governance law (not `governance_policies`)
- ✅ No table name collisions with Builds 001–050
- ✅ Build 051 is purely additive — Builds 001–050 untouched except the 6 permitted wiring files
- ✅ `MINIMUM_EP_COUNT` updated to 382 (floor; no upper bound)
