import { logger } from "../logger";
import { perplexitySearchProvider } from "./providers/perplexity-provider";
import { tavilySearchProvider } from "./providers/tavily-provider";
import { serperSearchProvider } from "./providers/serper-provider";
import type { SearchProvider, SearchProviderResponse } from "./types";

export type { SearchProvider, SearchProviderResponse, SearchResultItem } from "./types";

// ─── Search Provider Abstraction ────────────────────────────────────────────
// Callers (the Research Engine today, any future engine tomorrow) call
// searchWeb() and never import a concrete provider. Providers are tried in
// priority order; the first one whose isAvailable() returns true is used.
// Today only "Existing Search" (Perplexity) is configured, so behavior is
// byte-for-byte the same as before this abstraction existed — Tavily/Serper
// activate automatically the moment their API keys are added as secrets,
// with no code changes anywhere that calls searchWeb().
const PROVIDER_PRIORITY: SearchProvider[] = [
  tavilySearchProvider,
  serperSearchProvider,
  perplexitySearchProvider, // existing search — the guaranteed fallback
];

export function getActiveSearchProvider(): SearchProvider {
  return PROVIDER_PRIORITY.find((p) => p.isAvailable()) ?? perplexitySearchProvider;
}

export function listSearchProviders(): SearchProvider[] {
  return PROVIDER_PRIORITY;
}

export async function searchWeb(query: string, opts?: { userId?: number }): Promise<SearchProviderResponse> {
  const provider = getActiveSearchProvider();
  try {
    return await provider.search(query, opts);
  } catch (err) {
    logger.warn({ err, provider: provider.id, query }, "Search provider failed, trying next available provider");
    for (const fallback of PROVIDER_PRIORITY) {
      if (fallback.id === provider.id || !fallback.isAvailable()) continue;
      try {
        return await fallback.search(query, opts);
      } catch (fallbackErr) {
        logger.warn({ err: fallbackErr, provider: fallback.id, query }, "Fallback search provider also failed");
      }
    }
    throw err;
  }
}
