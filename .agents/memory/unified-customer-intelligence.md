---
name: Unified Customer Intelligence Engine
description: Build 054 — UCIE; 10 tables, 8 EPs, total 406 EPs; 16 entity types; customer_registry only mutable; RFM engagement scoring; 7-stage lifecycle FSM; UCIE_THROTTLE_CYCLES=400; Unified Customer Law.
---

# Unified Customer Intelligence Engine (UCIE) — Build 054

**Why:** Every future application (Commerce, CRM, Marketing, Support, Finance) must resolve to one canonical customer identity rather than building its own contact model. UCIE is the foundational customer layer — not a CRM.

## Key Numbers
- 10 tables: `customer_profiles`, `organization_profiles`, `customer_relationships`, `customer_segments`, `customer_engagement`, `customer_lifecycle`, `customer_interactions`, `customer_registry`, `customer_snapshots`, `customer_quality`
- 8 extension points declared by `declareUCIEExtensionPoints()`
- Cumulative EPs after this build: **406**
- `UCIE_THROTTLE_CYCLES = 400` (EB fires maintenance every 400 cycles)
- Route prefix: `/api/customers/*` (13 endpoints)

## Mutable Table
`customer_registry` — UNIQUE on `customer_id`; all other tables are append-only.

## Entity Types (16)
`person`, `business`, `organization`, `household`, `partner`, `supplier`, `vendor`, `affiliate`, `lead`, `prospect`, `customer`, `client`, `member`, `subscriber`, `employee_contact`, `investor`, plus `future_type`.

## Lifecycle Stages (7)
`lead → prospect → opportunity → customer → advocate → inactive → archived`

Each transition creates a new row in `customer_lifecycle` (append-only). `customer_registry.current_stage` is the live view.

## Engagement Health (6 statuses)
`champion` (score≥75), `healthy` (score≥50), `at_risk` (score≥20), `new` (score<20), `dormant` (>60 days), `lost` (>180 days). Derived from RFM composite.

## Architecture Notes
- **customer_registry is the live view** — single-row UPDATEs by all engines; query this for current state.
- **All source tables are append-only** — lifecycle, engagement, interactions, quality never UPDATE.
- **Engagement recomputed on interaction** — `createInteraction()` fires `computeEngagementScore()` automatically.
- **Lifecycle init on profile creation** — `POST /customers/profiles` calls `initLifecycle()` in the same handler.
- **Duplicate detection uses exact email match** — `customer_quality` flags same-email pairs at 0.90 confidence.
- **BFS relationship graph capped at depth 3** — avoids n+1 spirals in dense graphs.

## How to Apply
- Create customer: `POST /api/customers/profiles` → also initializes lifecycle at `lead`
- Record interaction: `POST /api/customers/interactions` → auto-recomputes engagement
- Advance lifecycle: call `advanceLifecycle(customerId, newStage)` directly in engine code
- Quality check: `GET /api/customers/quality?customerId=X` → runs analysis on demand
- Graph traversal: `GET /api/customers/relationships?customerId=X` → BFS up to depth 3
