---
name: Browser Agent Architecture
description: ASH browser control — Playwright+Chromium via system Nix package, SSE streaming, BrowserView UI
---

## Browser agent — system Chromium (Nix)

Chromium is installed via `pkgs.chromium` in `replit.nix` and pointed to by `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` env var.
All `npx playwright install` downloads are unnecessary and will timeout. The binary is at the Nix store path set in the env var.

**Current approach:** Playwright with system Chromium — full JS execution, real browser, works with Gmail/Google/SPA apps.

**Why Playwright over fetch+cheerio:** fetch+cheerio cannot execute JS, so modern SPA apps (Gmail, Google dashboards, React/Vue apps) render blank. Playwright runs a real browser for full fidelity. RAM usage ~300-500MB per session.

**PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH** must be set in environment secrets to the Nix store path of the installed chromium binary.
If this env var is missing on restart, Playwright will look for its downloaded binary (which doesn't exist) and fail with "Executable doesn't exist".

**Files:**
- `artifacts/api-server/src/lib/browser/crawler.ts` — fetchPage(), submitForm(), createBrowserContext() using Playwright+Chromium
- `artifacts/api-server/src/lib/browser/agent.ts` — async generator AI loop (max 15 steps), streams BrowserEvent objects; uses getPageData(), executeAction()
- `artifacts/api-server/src/routes/browser-agent.ts` — POST /api/browser-agent/run (SSE stream)
- `artifacts/web/src/components/builder/BrowserView.jsx` — browser-chrome UI, iframe+action log

## CompletionResult field name
`complete()` returns `{ content: string, model: string, ... }` — field is `content`, NOT `text`.

## SSE with POST body
Cannot use EventSource (GET only). Frontend uses `fetch()` + `response.body.getReader()` to decode the SSE stream. Events are `data: {...}\n\n` lines.

## ASH browser_use action
SBEP_DATA: `{ "action": "browser_use", "task": "...", "startUrl": "https://..." }`  
BuilderPage: sets `activeBrowser` state → renders BrowserView inline in chat area.  
BrowserView `onResult` callback posts result back as assistant message.

**Why:** Full browser execution needed for modern web automation (Gmail, Google, any SPA). RAM tradeoff is acceptable in dev; for production scale consider a cloud browser service.
