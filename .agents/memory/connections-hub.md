---
name: Unified Connections & Integration Hub
description: Build 044 — single authoritative service for every external connection; 9 tables, 8 EPs, 318 cumulative EPs; 6 engines; 20 domains; 39 seeded providers; credentials stored as references only.
---

## Core facts

- **9 new tables**: `connection_providers`, `provider_capabilities`, `connection_profiles`, `credential_references`, `connection_health`, `provider_compatibility`, `connection_registry`, `connection_snapshots`, `connection_audit`
- **8 EPs** → **318 cumulative** (confirmed in boot log)
- **Routes**: `/api/connections` — 4 POST (register/discover/evaluate/refresh) + 6 GET (providers/health/capabilities/registry/snapshots/audit)
- **EB throttle**: 310 cycles (`HUB_THROTTLE_CYCLES = 310`)
- **Integration file**: `executive-brain/connections-hub-integration.ts`
- **Main init fn**: `initializeConnectionsHub(userId)` in `connections-hub/hub-orchestrator.ts`

## CRITICAL: Credentials

The `credential_references` table stores ONLY reference keys into the existing credential vault (user_credentials table or equivalent). It NEVER stores actual API keys, tokens, passwords, or secrets. The `credentialRefKey` field is a pointer — treat it as a foreign key to the credential store.

## Architecture

The Hub owns connection intelligence only — it does NOT execute work (that is DOL's responsibility). Separation:
- Hub: provider registration, capability discovery, health tracking, compatibility mapping, lifecycle tracking, recommendations
- DOL: runtime execution of external actions

## 20 Connection Domains

ai_providers, cloud_providers, source_control, developer_platforms, payment_platforms, accounting_platforms, crm_platforms, marketing_platforms, advertising_platforms, communication_platforms, storage_providers, databases, productivity_platforms, automation_platforms, identity_providers, analytics_platforms, browser_providers, desktop_providers, mcp_servers, future_providers

## 39 Seeded Providers

OpenRouter, OpenAI, Anthropic, Google Gemini, ElevenLabs, AWS, Google Cloud, Azure, GitHub, GitLab, Stripe, Whop, HubSpot, Salesforce, Resend, Slack, Twilio, Cloudflare R2, AWS S3, PostgreSQL, Redis, Vercel, Linear, Mixpanel, Amplitude, Notion, Google Workspace, Zapier, Make, Clerk, Auth0, Mailchimp, Google Ads, Playwright, Tauri, MCP Generic, QuickBooks, Xero, Future Connector

`seedProviderCatalog()` is idempotent — uses INSERT where name NOT EXISTS to avoid duplicates.

## Connection Lifecycle States

created → connected → suspended | revoked | expired | migrated | archived

## Health Score Formula

`healthScore = avail * 0.5 + quotaRemaining * 0.3 + authOk * 0.2`
Clamped to [0, 1]. Risk flag if score < 0.7 or authState ≠ 'valid'.

## Unified Connection Law

Every external integration = one canonical provider record. Every connection maintains: provider identity, capability catalog, auth profile, credential reference, health status, compatibility metadata, audit history. No duplicate provider definitions. No connector owns credentials.

**Why:** Without canonical provider records, connectors independently manage lifecycle, causing health blind spots, duplicate credentials, and no failover intelligence.

**How to apply:** Any new connector (AI, cloud, API, browser, MCP) must call `registerProvider()` before use. Capabilities must be declared via `addCapability()`. The hub is the source of truth — connectors query it, not their own state.
