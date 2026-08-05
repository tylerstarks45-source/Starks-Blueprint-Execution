---
name: Unified Revenue, Commerce & Monetization Platform (URCMP)
description: Build 056 — first Expanded Domain Build; 25 tables, 8 EPs, 422 cumulative; canonical monetization OS for the platform.
---

## Key facts

- **Tables:** 25 (largest single-build schema file in the platform)
- **Extension points:** 8 → 422 cumulative
- **Throttle:** `URCMP_THROTTLE_CYCLES = 420`
- **Route prefix:** `/api/commerce/*` (19 endpoints)
- **Mutable table:** `commerce_registry` only — UNIQUE on `business_id`, upserted via `ON CONFLICT (business_id) DO UPDATE`

## Schema naming: collision risks

- `contracts` — legal/commercial documents. NOT the same as `subscription_contracts` (billing FSM). Both tables exist and are linked via `invoice_profiles.subscription_contract_id`.
- `pricing_models` — do NOT confuse with `pricing_rules` (subordinate rows within a model).
- `quotes` — bare table name, no prefix. If a future build needs quotes for another domain, rename.

## Architecture rules

- **No payment execution** — `payment_gateway` columns are reference strings only; execution routes through Connections Hub adapters.
- **29/29 revenue domains** covered via type discriminators (`product_type`, `service_type`, `stream_type`, `contract_type`).
- **Regional pricing** stored as `region_overrides` JSONB on `pricing_models` — not normalized; queryability trade-off intentional.
- **Inventory** is a counter (`inventory_qty`), not an atomic lock — real inventory management needs a Connections Hub adapter.

## EB integration

- Pre-warms concurrently with LLM round-trips
- Advisory clipped at 600 chars (largest budget in platform)
- Detects: missing subscriptions, no offers, no pricing models, no active revenue streams, no bundles, unsent draft quotes, abandoned carts

## What this build introduced

First "Expanded Domain Build" — pattern change from Build 056 onwards: each build completes an entire business domain rather than isolated capabilities.
