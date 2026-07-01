---
name: Social OAuth connector pattern
description: How OAuth2 flows for social platforms (Twitter/LinkedIn/Meta/TikTok) integrate with existing manual-paste connectors without connector code changes.
---

## Decision

OAuth-issued access tokens are stored under the exact same `userCredentialsTable` credential keys that the existing manual-paste connectors already read (e.g. `TWITTER_BEARER_TOKEN`, `LINKEDIN_ACCESS_TOKEN`, `META_ACCESS_TOKEN` + `META_PAGE_ID`, `TIKTOK_ACCESS_TOKEN`). Facebook and Instagram both route through the same Meta Graph API app/token, so both OAuth flows write to the same `META_ACCESS_TOKEN`/`META_PAGE_ID` keys.

**Why:** Connector classes (`BaseConnector` subclasses in `artifacts/api-server/src/lib/connectors/`) only care about which credential keys are present, not how they got there. Reusing the keys meant zero changes to connector `execute()` logic — only a new `/api/social/oauth/:platform/{authorize,callback}` router and an `social-oauth.ts` lib (state signing via JWT, PKCE, token exchange) were needed.

## How to apply

- The `/authorize` route is a top-level browser navigation, not a fetch call, so it can't read an `Authorization` header — pass the JWT via `?token=` query param instead and verify it the same way `getUserId()` would (wrap in a fake `{ headers: { authorization: 'Bearer ...' } }` object).
- OAuth state (PKCE verifier, target userId, redirect URI) has nowhere server-side to live between the authorize redirect and the provider's callback — sign it into a short-lived (10 min) JWT and pass it via the `state` param; verify on callback.
- When client ID/secret env vars aren't configured, `/authorize` must return a friendly JSON error (not crash) naming exactly which secrets are missing — OAuth apps are opt-in per platform and most won't be configured until the user registers a developer app.
- Frontend "Connected" badges and publish-time credential lookups must key off the *same* credential key the OAuth callback writes to — always check `requiredCredentials` on the connector class as the source of truth, not a key hardcoded in a page component or publish handler.
- When multiple sibling platforms share one OAuth app (e.g. Facebook + Instagram both authenticate via the same Meta Page token), publish handlers must accept the shared key as a fallback (e.g. `FACEBOOK_PAGE_ID ?? META_PAGE_ID`) rather than assuming every platform gets its own dedicated credential — otherwise OAuth-connected users silently fail to publish on the platform that doesn't own the primary key. For a platform-specific ID that Meta doesn't hand back directly (e.g. Instagram's business account ID), resolve it lazily via a Graph API lookup off the shared Page ID at publish time instead of requiring the user to paste it manually.
