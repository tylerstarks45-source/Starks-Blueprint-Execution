---
name: Graceful degradation for optional third-party APIs
description: Pattern for handling missing optional platform credentials (e.g. Namecheap) without breaking the UI
---

When a feature depends on optional platform-level credentials that may not be configured (e.g. Namecheap domain registration keys), API routes should never throw a 503 or unhandled error. Instead:

- Add a small `isXConfigured()` helper that checks all required env vars are present.
- Routes return HTTP 200 with a `configured: false` (or `success: false`) flag plus a human-readable `reason`/`message`, rather than failing the request.
- Add a dedicated `GET /.../status` health-check endpoint reporting `{configured, mode, reachable, message}` so the frontend can proactively show a banner instead of discovering the failure via a failed action.

**Why:** A hard 503 makes the whole feature look broken and gives the frontend nothing to render gracefully. Returning 200 with a status flag lets the UI stay fully functional (e.g. domain search still works and shows real availability once configured) while clearly communicating what's missing and how to fix it (env var names, contact support, etc).

**How to apply:** Any feature gated on optional per-platform secrets (not per-user credentials) that may be absent in a given deployment — mirror this pattern rather than throwing.
