---
name: ash-tools route prefix rule
description: Routes in ash-tools.ts must use /ai-orchestrator/ prefix, not /ash/, due to URL rewrite middleware in app.ts.
---

# ash-tools Route Prefix Rule

All routes registered in `artifacts/api-server/src/routes/ash-tools.ts` MUST use the `/ai-orchestrator/` prefix.

**Why:** `app.ts` contains a URL rewrite middleware that runs before the router:
```js
app.use((req, _res, next) => {
  if (req.url.startsWith("/api/ash/")) {
    req.url = req.url.replace("/api/ash/", "/api/ai-orchestrator/");
  }
  next();
});
```
This rewrites all `/api/ash/*` requests to `/api/ai-orchestrator/*` before the Express router processes them. Routes registered as `/ash/X` sit at `/api/ash/X`, but by the time the router sees the request, the URL is already `/api/ai-orchestrator/X`, so they never match.

**How to apply:**
- When adding a route to `ash-tools.ts`, register it as `router.post("/ai-orchestrator/my-route", ...)` not `router.post("/ash/my-route", ...)`.
- Frontend can call it as either `/api/ash/my-route` (gets rewritten) or `/api/ai-orchestrator/my-route` (direct).
- All routes in `ash-tools.ts` use `/ai-orchestrator/` prefix.
