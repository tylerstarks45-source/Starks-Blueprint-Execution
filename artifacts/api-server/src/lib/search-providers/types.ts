// ─── Search Provider Abstraction — shared types ────────────────────────────
// The Research Engine (and any future engine that needs live web
// information) depends on this interface, never on a concrete provider.
export interface SearchResultItem {
  title?: string;
  url?: string;
  snippet?: string;
}

export interface SearchProviderResponse {
  /** Always present — either the provider's own summarized answer or a join of result snippets. */
  content: string;
  /** Present when the provider returns structured results (Tavily/Serper); absent for prose-only providers like Perplexity. */
  results?: SearchResultItem[];
  /** id of the provider that actually produced this response. */
  provider: string;
}

export interface SearchProvider {
  id: string;
  displayName: string;
  /** True when the provider is configured and usable right now (e.g. its API key is set). */
  isAvailable(): boolean;
  search(query: string, opts?: { userId?: number }): Promise<SearchProviderResponse>;
}
