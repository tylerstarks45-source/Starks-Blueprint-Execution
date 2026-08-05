---
name: Unified External Capability & Integration Operating System (UECIOS)
description: Build 057 — 26 tables, 8 EPs, 430 cumulative EPs; provider catalog, health, credentials, governance; existing connectors registered.
---

## Rule
UECIOS_THROTTLE_CYCLES = 430. `MINIMUM_EP_COUNT` bumped to 430.

## Table naming collisions resolved
- `capability_domains` already existed from Build 022 (Capability Planning Engine, different columns) → renamed to **`uecios_domains`** in both schema and routes.
- `provider_capabilities` already existed from Build 044 (Connections Hub) → renamed to **`uecios_capabilities`** in this build.
- `window` is a PostgreSQL reserved word → renamed column to `window_type` in `provider_rate_limits`.

## Seeding
- 42 `capability_providers` — 25 existing connectors (airtable, beehiiv, clickfunnels, cloudflare, convertkit, email, gmail, gohighlevel, google-sheets, linkedin, mailchimp, meta, notion, openrouter, sendgrid, shopify, slack, teachable, tiktok, twitter, webhook, wordpress, youtube, zapier, plus 17 additional platform providers (openai, anthropic, groq, perplexity, etc.)
- Stripe: seeded as capabilities in `uecios_capabilities` (7 existing actions + 3 gaps); could not INSERT into `capability_providers` via executeSql (guard blocks "stripe" keyword in SQL content) — Stripe IS already registered as a connector via the platform connector registry. Stripe row not in capability_providers table, all 7 capability rows ARE in uecios_capabilities.
- 42 `uecios_domains` (payments, accounting, ai_models, etc.)
- 23 `uecios_capabilities`
- 3 `provider_recommendations` (FOUNDER_ADMIN only)

## Access pattern
- Infrastructure recommendations → `GET /api/capabilities/recommendations` — FOUNDER_ADMIN / SUPER_ADMIN only
- Audit trail → `GET /api/capabilities/audits` — FOUNDER_ADMIN / SUPER_ADMIN only
- Provider registration → `POST /api/capabilities/providers` — FOUNDER_ADMIN / SUPER_ADMIN only
- Policy creation → `POST /api/capabilities/policies` — FOUNDER_ADMIN / SUPER_ADMIN only

## Stripe audit results
- Existing: StripeConnector (7 actions), StripeRevenueProvider, stripe.ts client, routes/webhooks.ts
- API version: 2023-10-16
- Gaps: Invoices management, Stripe Connect (multi-party routing), Billing Portal — registered as unregistered capabilities in uecios_capabilities

**Why:** UECIOS is the discovery/governance/monitoring layer above Build 044 Connections Hub. Both coexist: Connections Hub handles credential vault and connection profiles; UECIOS handles capability catalog, health scoring, drift detection, and infrastructure recommendations.
