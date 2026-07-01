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
- Frontend "Connected" badges must key off the *same* credential key the OAuth callback writes to. If the UI's manual-paste key differs from the connector's actual `requiredCredentials` key (as was the case for Facebook/Instagram before this fix), OAuth-connected users won't show as connected — always check `requiredCredentials` on the connector class as the source of truth for credential keys, not what's hardcoded in a page component.
