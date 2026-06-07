---
name: Connections Hub architecture
description: How the Connections Hub (formerly Credential Vault) is built — schema, endpoints, catalog, and builder integration.
---

## The upgrade pattern

The Credential Vault was upgraded to a full Connections Hub by:

1. **DB schema** (`lib/db/src/schema/user_credentials.ts`) — added `status`, `connectedAt`, `lastSyncAt`, `expiresAt`, `usageCount`, `metadata` columns to `user_credentials` table. Run `pnpm --filter @workspace/db run push` after any changes.

2. **API routes** (`artifacts/api-server/src/routes/user-credentials.ts`) — new endpoints:
   - `POST /api/user-credentials/:id/test` — live validation, updates `status` + `lastSyncAt`
   - `PATCH /api/user-credentials/:id` — update status/metadata without touching secret
   - Updated `POST` upsert to set `status='connected'` + `connectedAt` on first save
   - Updated `GET /summary` to return `usedBySystems` array (system id + name)

3. **Frontend** (`artifacts/web/src/pages/ConnectionsHubPage.jsx`) — replaces `CredentialVaultPage.jsx` at `/connections`. Contains:
   - `CATALOG` — 40+ integration definitions with key, category, icon, affiliateUrl, testable flag
   - `CATEGORIES` — 10 categories: ai-models, video-ai, voice-ai, social, marketing, ecommerce, automation, infrastructure, analytics, crm
   - `STATUS_CONFIG` — 6 statuses: connected, disconnected, expired, needs_reconnect, rate_limited, invalid
   - Health KPI strip, category tabs, per-integration cards with metadata, marketplace upsell, custom integration modal
   - `?connect=CREDENTIAL_KEY` URL param auto-opens the slide-over for that integration

4. **Builder integration** (`artifacts/web/src/pages/BuilderPage.jsx`) — when `phase === 'collecting'`, shows a "Required Connections" panel listing each required credential with green dot (connected) or amber dot + "Connect →" link to `/connections?connect=KEY`.

**Why:**
`serialize()` must still be called before `.parse()` on any Drizzle rows returned from DB queries that include the new timestamp columns.

**How to apply:**
When adding new integrations to the catalog: add to `CATALOG` array in `ConnectionsHubPage.jsx` only — no DB changes needed unless you're adding a new category or testable endpoint.
