---
name: Platform Registry & Search Provider Abstraction
description: Config-driven platform support list and swappable web-search backend used by Validation/Research engines; where they live and how they compose.
---

## Platform Registry
Lives at `artifacts/api-server/src/lib/platform-registry/` (top-level under `lib`, not nested in one engine) so any engine can import it.
- Supported platforms are derived **live** from the connector registry (`listConnectors()`) — never hardcode a "supported" list, it will drift from the real connector set.
- Unsupported/known-competitor platforms are pure data in `unsupported-platforms.ts`, extensible without touching logic.
- `findPlatformMentions(text)` is the shared entry point other engines should call instead of writing their own keyword scan.

**Why:** the Validation Engine's integration rule used to hardcode its own unsupported-platform array; any other engine wanting the same check would have duplicated and drifted from it.

## Search Provider Abstraction
Lives at `artifacts/api-server/src/lib/search-providers/`. A `SearchProvider` interface (`id`, `displayName`, `isAvailable()`, `search()`) lets callers depend on `searchWeb()` instead of any one backend.
- Priority order: Tavily → Serper → Perplexity, with automatic fallback to the next provider on failure.
- Perplexity provider wraps the existing `complete()` + `MODELS.research` primitive and is always available (OpenRouter key is a platform requirement) — guaranteed fallback so the feature never goes fully dark.
- Tavily/Serper are real fetch-based providers gated on their own env keys; inactive (not attempted) until those secrets are added.
- `RawFinding.sourceResults?: SearchResultItem[]` carries structured citations through to `reliability.ts`, which scores real URLs when a structured-result provider is active and falls back to the old prose-regex heuristic for Perplexity.

**Why:** requirement was "Research Engine must never depend on one search provider directly" — this makes adding a provider additive (new file + priority-order entry), not a rewrite of gatherer/reliability logic.
