---
name: Root-cause research loop design
description: How autonomous root-cause diagnosis of unresolved system errors is implemented (task #248), and why it uses OpenRouter web search instead of the Playwright browser agent.
---

`artifacts/api-server/src/lib/research-loop.ts` (`runRootCauseResearch()`) is the "browser research" primitive self-healing.ts calls right before creating a Pending Approval for an error that survived a whitelisted auto-fix attempt (reconnect connector, retry job, restart worker).

It is implemented as two chained OpenRouter completions:
1. A web-grounded search via `complete({ prompt, model: "perplexity/llama-3.1-sonar-large-128k-online" })` — same pattern already used by the ASH Research Lab (`routes/research.ts`).
2. A synthesis step against `gpt-4o-mini` that turns the search result + error context into strict JSON: `{diagnosis, proposedFix, explanationForUser, confidence, isKnownWhitelistedFix}`.

**Why not the real Playwright browser agent (`lib/browser/agent.ts`)?** `runBrowserAgent(startUrl, ...)` requires a known starting URL to navigate to. Root-cause research starts from an arbitrary error message with no URL — there's no "search and compare" entry point for bare queries. Reusing the existing Perplexity-backed completion pattern satisfies the "browser research" intent without inventing a new automation mode.

**How to apply:** If a future task needs deeper agentic web research triggered by an error (not a URL), reuse `runRootCauseResearch()` or its two-step pattern rather than trying to force the Playwright agent into a URL-less flow. Never throws — always returns a (possibly low-confidence) result so callers can still create a meaningful approval.
