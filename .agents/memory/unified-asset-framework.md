---
name: Unified Business Asset Framework (UBAF)
description: Build 048 — UBAF architecture, 30 canonical classes, 6 engines, EB integration, and gotchas.
---

## The Rule (Unified Asset Law)
Every platform object shall maintain one immutable canonical asset identity independent of the builder that created it. No builder may redefine an asset already represented by UBAF.

**Why:** Prevents each builder from inventing its own data model. Enables ASH to reason about businesses in canonical terms, not builder-specific terms.

**How to apply:** All new builders must call `POST /api/assets/translate` when creating any persistent object. UBAF owns identity; builders own editing.

---

## DB Tables (10)
- `asset_classes` — 30 canonical class definitions (seed, never update)
- `canonical_assets` — master identity record (one per platform object, append+update)
- `asset_metadata` — normalized metadata fields (append-only)
- `asset_manifests` — immutable point-in-time manifests (append-only, semver versioned)
- `asset_capabilities` — what each asset can do (append-only)
- `asset_relationships_v2` — semantic relationships between canonical assets (append-only; DISTINCT from UWPS structural relationships)
- `asset_translation` — builder-to-canonical translation records (append-only)
- `asset_registry` — **mutable** aggregate per asset (UNIQUE on asset_id; upserted)
- `asset_snapshots` — platform-wide snapshots (append-only)
- `asset_lifecycle` — lifecycle events per asset (append-only, 13 event types)

## 30 Canonical Classes (7 categories)
product (5): business, application, website, page, component  
infrastructure (8): workflow, automation, database, table, api, endpoint, integration, deployment  
intelligence (3): ai_agent, prompt, knowledge_base  
content (3): document, brand_asset, campaign  
commerce (7): customer, lead, product, service, offer, revenue_stream, marketing_funnel  
data (1): analytics_dashboard  
process (2): task, process  
future (1): future_asset (fallback for unknown types)

## Translation Pipeline (idempotent)
9 steps: lookup existing → classify → normalize metadata → INSERT canonical_assets → INSERT asset_translation → persist metadata → seed default capabilities → UPSERT registry → INSERT lifecycle event. Safe to retry — returns existing canonicalAssetId if (builderSource, builderObjectId) already translated.

## REST Mount
13 endpoints at `/api/assets/*` — mounted as `router.use("/assets", unifiedAssetRouter)`.

## EB Integration
- Pre-warm: `fetchUBAFView(userId)` runs concurrently with LLM calls
- Background trigger: every 340 EB cycles (`UBAF_THROTTLE_CYCLES = 340`)
- Advisory: total assets, active assets, relationships, revenue assets, duplicates, missing classes → ASH can answer all 7 spec questions
- `ubafSummary?` field added to `ExecutiveBrainResult` type

## EP Boot Declaration
`declareUBAFExtensionPoints()` called in `cognitive-foundation/index.ts`. 8 EPs → total now 358.

## Governance
Unified Asset Law stored in `executive_policies` (constitutional, priority=1, status=approved).

## Key Gotchas
- `requireAdmin` is **async** — must be `await`ed: `const admin = await requireAdmin(req, res); if (!admin) return;`
- `requireAuth` is synchronous (returns number | null directly). Do not confuse the two.
- `asset_relationships_v2` ≠ UWPS `asset_relationships`: v2 = semantic meaning (what business relationship?); UWPS = structural dependency (what breaks?). Keep them separate.
- `asset_registry.asset_id` has a UNIQUE constraint — use `.onConflictDoNothing()` when upserting.
- Manifest semver: `deriveVersion(null)` → `"1.0.0"`; each subsequent manifest bumps patch version. Previous manifests are marked `is_latest=false` before inserting new one.
- BFS traversal is depth-bounded at 4 hops — configurable per-call via `maxDepth` parameter.
- `future_asset` class is the fallback when `classifyBuilderObject` can't map the builder type — never throw, always return a valid class.
