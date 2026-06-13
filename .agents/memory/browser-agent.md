---
name: Browser Agent Architecture
description: ASH browser control — fetch+cheerio AI loop, SSE streaming, BrowserView UI
---

## Browser agent — no chromium needed

Chromium binary download timed out in sandbox (~180MB). Use native `fetch` (Node 24 global) + `cheerio` for all web browsing — works in dev and production.

**Files:**
- `artifacts/api-server/src/lib/browser/crawler.ts` — fetchPage(), submitForm() using fetch+cheerio
- `artifacts/api-server/src/lib/browser/agent.ts` — async generator, AI loop (max 8 steps), streams BrowserEvent objects
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

**Why fetch+cheerio:** No binary download, works in any environment, pages with X-Frame-Options show extracted text content, iframe shows real page where CORS allows.
