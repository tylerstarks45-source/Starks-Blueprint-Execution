import type { SearchProvider, SearchProviderResponse } from "../types";

// ─── Tavily search provider ─────────────────────────────────────────────────
// Inactive until TAVILY_API_KEY is configured as a secret — isAvailable()
// gates it out automatically, so it's safe to ship now and switch on later
// with zero further code changes. Structured results (title/url/snippet)
// let downstream reliability scoring use real citation URLs instead of the
// text-pattern heuristic Perplexity forces us to fall back to.
export const tavilySearchProvider: SearchProvider = {
  id: "tavily",
  displayName: "Tavily",
  isAvailable(): boolean {
    return Boolean(process.env.TAVILY_API_KEY);
  },
  async search(query): Promise<SearchProviderResponse> {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) throw new Error("TAVILY_API_KEY is not configured");

    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey, query, search_depth: "advanced", include_answer: true }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Tavily search failed (${res.status}): ${text.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      answer?: string;
      results?: Array<{ title?: string; url?: string; content?: string }>;
    };
    const results = (data.results ?? []).map((r) => ({ title: r.title, url: r.url, snippet: r.content }));
    const content = data.answer || results.map((r) => r.snippet).filter(Boolean).join("\n\n");
    return { content, results, provider: "tavily" };
  },
};
