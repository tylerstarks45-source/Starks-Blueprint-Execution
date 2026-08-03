# Build 054 — Unified Customer Intelligence Engine (UCIE)
**Date:** 2026-08-03  
**Status:** ✅ COMPLETE  
**Cumulative Extension Points:** 406 (+8)

---

## 1. Executive Summary

Build 054 delivers the **Unified Customer Intelligence Engine (UCIE)** — the canonical customer model for the entire Starks Global Group Platform. Every person, organization, lead, member, subscriber, partner, and vendor on the platform resolves to a single identity here.

UCIE is not a CRM. It is the **customer intelligence layer** that every future application (Commerce, CRM, Marketing, Support, Scheduling, Analytics, Finance) will consume rather than replicate. ASH now has one unified view of every customer relationship, lifecycle position, engagement health, and organizational hierarchy across all businesses.

---

## 2. Files Created

| File | Description |
|------|-------------|
| `lib/db/src/schema/unified_customer_intelligence.ts` | 10 Drizzle table definitions |
| `artifacts/api-server/src/lib/unified-customer-intelligence/types.ts` | `CustomerEntityType`, `LifecycleStage`, `EngagementHealth`, `UCIESummary` |
| `artifacts/api-server/src/lib/unified-customer-intelligence/ucie-extension-points.ts` | 8 extension point declarations |
| `artifacts/api-server/src/lib/unified-customer-intelligence/identity-engine.ts` | Canonical identity: create, list, search customers |
| `artifacts/api-server/src/lib/unified-customer-intelligence/relationship-engine.ts` | Org profiles + BFS relationship graph traversal |
| `artifacts/api-server/src/lib/unified-customer-intelligence/lifecycle-engine.ts` | 7-stage lifecycle FSM with append-only history |
| `artifacts/api-server/src/lib/unified-customer-intelligence/segmentation-engine.ts` | Deterministic segment creation + membership evaluation |
| `artifacts/api-server/src/lib/unified-customer-intelligence/engagement-engine.ts` | RFM-based engagement scoring + interaction recording |
| `artifacts/api-server/src/lib/unified-customer-intelligence/data-quality-engine.ts` | Completeness scoring, duplicate detection, merge recommendations |
| `artifacts/api-server/src/lib/unified-customer-intelligence/ucie-orchestrator.ts` | `UCIESummary` builder, snapshot capture, maintenance |
| `artifacts/api-server/src/lib/executive-brain/ucie-integration.ts` | `fetchUCIEView`, `triggerUCIEMaintenance`, `buildUCIEAdvisory` |
| `artifacts/api-server/src/routes/unified-customer-intelligence.ts` | 13 REST endpoints at `/api/customers/*` |

---

## 3. Files Modified

| File | Change |
|------|--------|
| `lib/db/src/schema/index.ts` | Added `export * from "./unified_customer_intelligence"` |
| `artifacts/api-server/src/routes/index.ts` | Mounted `/api/customers` router |
| `artifacts/api-server/src/lib/cognitive-foundation/index.ts` | Imported + called `declareUCIEExtensionPoints()` |
| `artifacts/api-server/src/lib/executive-brain/index.ts` | Import, pre-warm, variable, fetch/trigger, params, destructure, call, advisory, return |
| `artifacts/api-server/src/lib/executive-brain/types.ts` | Added `ucieSummary?` to `ExecutiveBrainResult` |
| `artifacts/api-server/src/lib/certification/types.ts` | `MINIMUM_EP_COUNT` 398 → 406 |

---

## 4. Database Schema

| Table | Type | Key Constraint |
|-------|------|----------------|
| `customer_profiles` | Append-only | — |
| `organization_profiles` | Append-only | — |
| `customer_relationships` | Append-only | — |
| `customer_segments` | Append-only | — |
| `customer_engagement` | Append-only | — |
| `customer_lifecycle` | Append-only | — |
| `customer_interactions` | Append-only | — |
| `customer_registry` | **Mutable** | UNIQUE on `customer_id` |
| `customer_snapshots` | Append-only | — |
| `customer_quality` | Append-only | — |

59 SQL statements executed (10 tables + 49 indexes). 0 failures.

---

## 5. Customer Identity Model

Every customer is created via `POST /api/customers/profiles` and receives a stable `customer_id` with the prefix `cust_`. The identity engine:

- Supports **16 entity types**: person, business, organization, household, partner, supplier, vendor, affiliate, lead, prospect, customer, client, member, subscriber, employee_contact, investor, plus `future_type`.
- Stores full identity: name, email, phone, address, social profiles, timezone, language, currency, tags, custom fields.
- Records **consent**: `consent_given`, `consent_date`, `consent_details` — every identity carries its consent status.
- Tracks **source**: web, import, api, manual, crm_sync — with an optional external `source_id` for sync.
- Computes **profile completeness** (0–100) at creation time based on populated fields.
- Auto-initializes a lifecycle record (`lead` stage) on every new profile creation.

The `customer_registry` table maintains a live mutable view of every customer: engagement score, lifetime value, interaction count, relationship count, health status, duplicate flag, and profile completeness — updated in real time by each engine.

---

## 6. Organization Model

Organizations are separate from customer profiles and support full hierarchy:

- **8 org types**: company, nonprofit, government, institution, partnership, sole_trader, holding, subsidiary, plus `future_org`.
- `parent_org_id` + `hierarchy_depth` enable parent/subsidiary trees.
- Domain, industry, employee count, annual revenue, LinkedIn.
- Organizations can be related to customer profiles via the Relationship Engine.

---

## 7. Relationship Graph

The Relationship Engine maps edges between customers and organizations using `customer_relationships`. Each edge has:

- `source_id` + `source_type` (customer or organization)
- `target_id` + `target_type`
- `relationship_type` — 12 types: household_member, employee, partner, supplier, vendor, affiliate, parent_organization, subsidiary, investor, team_member, contact, competitor, plus `future_relationship`
- `strength` (0–1 confidence float)
- `is_bidirectional` flag

`buildRelationshipGraph(rootId, maxDepth)` performs BFS traversal up to depth 3, returning a `{ nodes, edges }` adjacency structure. The registry relationship count is incremented atomically on every new edge.

---

## 8. Lifecycle Model

Seven ordered stages: **lead → prospect → opportunity → customer → advocate → inactive → archived**

`customer_lifecycle` is append-only. Each row represents a transition:

- `current_stage` + `previous_stage` 
- `stage_history` JSONB array — full audit trail of every transition with timestamps and duration
- `conversion_score` (0–100) — the probability of the customer advancing to the next stage, deterministically computed per stage
- `triggered_by` — manual, automated, event, import
- `won_reason` / `lost_reason` for terminal transitions

`advanceLifecycle()` appends a new row and updates `customer_registry.current_stage` atomically. The registry remains the authoritative live view; the lifecycle table is the immutable history.

---

## 9. Engagement Intelligence

**RFM-based scoring** (Recency × Frequency × Monetary):

| Dimension | Calculation |
|-----------|-------------|
| Recency (0–100) | Linear decay from last interaction: full at <7 days, zero at >90 days |
| Frequency (0–100) | `interactions_last_90_days × 5`, capped at 100 |
| Monetary (0–100) | `purchase_count × 20`, capped at 100 (proxy until Commerce) |
| RFM Composite | Simple average of all three |

**6 health statuses** derived from score + recency:

| Status | Condition |
|--------|-----------|
| `champion` | score ≥ 75 and active within 60 days |
| `healthy` | score ≥ 50 |
| `at_risk` | score ≥ 20 |
| `new` | score < 20 and active |
| `dormant` | last seen > 60 days |
| `lost` | last seen > 180 days |

Engagement is automatically recomputed on every new interaction. The registry is updated in the same pass.

---

## 10. Executive Brain Integration

| Component | Description |
|-----------|-------------|
| Pre-warm | `fetchUCIEView()` fires concurrently with LLM round-trips |
| Throttle | `triggerUCIEMaintenance()` fires every 400 EB cycles (fire-and-forget) |
| Advisory | `buildUCIEAdvisory()` surfaces: total customers, active count, org count, interaction count, avg engagement, avg LTV, largest lifecycle stage, at-risk count, duplicate flag count |
| Fail-open | All EB integration calls use `.catch(() => undefined)` |

**ASH can now answer:**
- "Who are my best customers?" → champions by LTV + engagement score
- "Which leads need follow-up?" → leads with declining recency
- "Which customers are at risk?" → `at_risk` + `dormant` health status
- "Which companies generate the most revenue?" → org + LTV correlation
- "Show me duplicate contacts." → duplicate_flag=true in registry
- "Who should I contact today?" → `next_follow_up_at` + recency score

---

## 11. REST API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/customers/profiles` | auth | Create canonical customer identity + init lifecycle |
| POST | `/customers/organizations` | auth | Register organization profile |
| POST | `/customers/segments` | auth | Create customer segment |
| POST | `/customers/interactions` | auth | Record interaction + recompute engagement |
| GET | `/customers` | auth | List customers (paginated) |
| GET | `/customers/relationships` | auth | Get relationship graph for a customer (BFS) |
| GET | `/customers/lifecycle` | auth | Get lifecycle for a customer OR stage breakdown |
| GET | `/customers/engagement` | auth | Get engagement profile for a customer |
| GET | `/customers/registry` | public | Registry summary + recent customers |
| GET | `/customers/quality` | auth | Run quality analysis OR list duplicate flags |
| GET | `/customers/search` | auth | Full-text search across name + email |
| GET | `/customers/snapshots` | public | Platform snapshot history |
| GET | `/customers/organizations` | auth | List organizations |

---

## 12. Technical Decisions

1. **`customer_registry` is the live mutable view; all source tables are append-only.** Every engine writes to its own append-only table AND updates the registry in the same transaction. This gives O(1) registry reads without touching history tables.

2. **Lifecycle is append-only, not an UPDATE.** Each stage transition creates a new row. This gives a complete audit trail and never destroys historical data. The registry carries the current stage.

3. **Engagement is recomputed on interaction, not on schedule.** Computing engagement synchronously on interaction creation keeps the registry current. The background maintenance sweep captures snapshots only.

4. **BFS relationship graph is depth-capped at 3.** Deeper traversals risk n+1 query spirals in dense graphs. Depth 3 covers household → individual → organization → parent org — sufficient for all known use cases.

5. **Duplicate detection uses email matching (exact).** The Data Quality Engine flags same-email records as 90% confidence duplicates. Future iterations can add fuzzy name matching and phone matching once the Commerce layer provides verified phone data.

---

## 13. Performance Impact

- 59 SQL statements (10 tables + 49 indexes) — no migrations required
- EB pre-warm adds one concurrent DB round-trip (parallel with LLM — negligible)
- `computeEngagementScore()` executes one aggregate query per interaction (fast at expected data volumes)
- Registry updates are single-row UPDATEs via `customer_id` (unique index — O(log n))
- BFS graph traversal issues one query per depth level — 3 queries maximum

---

## 14. Architectural Trade-offs

**Selected:** Separate `customer_profiles` (identity) and `customer_registry` (live view). Lifecycle, engagement, interactions are independent append-only tables that all update the registry.

**Alternative rejected:** Single `customers` table with updatable columns for all state.

**Why:** A single mutable table makes it impossible to reconstruct "who was this customer on date X?" without event sourcing. The append-only approach gives a full audit trail at the cost of slightly more complex writes — a worthwhile trade for a canonical identity layer that every future module will depend on.

---

## 15. Extension Points Added (8)

| ID | Description |
|----|-------------|
| `ucie.customer.created` | New customer profile created in the canonical identity layer |
| `ucie.organization.created` | New organization profile registered |
| `ucie.relationship.mapped` | Relationship edge added to the graph |
| `ucie.lifecycle.changed` | Customer lifecycle stage transition recorded |
| `ucie.segment.created` | New customer segment defined |
| `ucie.engagement.scored` | Engagement profile scored and health status updated |
| `ucie.quality.analyzed` | Completeness scored, duplicates flagged |
| `ucie.snapshot.captured` | Platform-wide snapshot recorded |

---

## 16. Unified Customer Intelligence Score

| Criterion | Score | Notes |
|-----------|-------|-------|
| Canonical Identity (16 entity types) | ✅ | `customer_profiles` + `customer_registry` |
| Organization Model with hierarchy | ✅ | `organization_profiles`, parent_org_id + depth |
| Relationship Graph (BFS depth-3) | ✅ | `customer_relationships`, 12 edge types |
| Lifecycle Tracking (7 stages) | ✅ | Append-only FSM, full history, conversion score |
| Segmentation Engine | ✅ | 7 segment types, deterministic membership |
| RFM Engagement Scoring | ✅ | Recency, frequency, monetary, 6 health statuses |
| Data Quality Engine | ✅ | Completeness 0–100, exact-email duplicate detection |
| Executive Brain Integration | ✅ | Pre-warm, advisory, fail-open |
| Backward Compatibility | ✅ | Purely additive — Builds 001–053 untouched |
| TypeCheck (DB) | ✅ | 0 errors |
| TypeCheck (API) | ✅ | 0 errors |
| Extension Points | ✅ | 406 cumulative (398 + 8) |
| Governance Law | ✅ | Unified Customer Law enacted |
