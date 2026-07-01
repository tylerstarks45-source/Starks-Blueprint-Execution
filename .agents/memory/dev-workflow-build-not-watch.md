---
name: Dev workflow build-not-watch gotcha
description: Why new/changed api-server routes 404 until the workflow is restarted, even in "dev" mode.
---

The `artifacts/api-server` dev command is `build && start` — it bundles once with esbuild and runs the resulting `dist/index.mjs`. It does not watch for file changes.

**Why:** After editing/adding routes, the running server still serves the stale bundle. Hitting a brand-new route returns Express's default HTML 404 page (not a JSON 404 from your route), which looks like a routing bug but is actually a stale build.

**How to apply:** After adding or changing server routes/logic in `artifacts/api-server`, restart the `artifacts/api-server: API Server` workflow before testing via curl or e2e tests. If a new endpoint 404s with an HTML error page immediately after being added, restart the workflow first before debugging routing.
