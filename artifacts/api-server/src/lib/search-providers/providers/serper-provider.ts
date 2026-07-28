import type { SearchProvider, SearchProviderResponse } from "../types";

// ─── Serper search provider ─────────────────────────────────────────────────
// Same "inactive until configured" pattern as tavily-provider.ts — gated on
// SERPER_API_KEY, ready to switch on without touching the Research Engine.
export const serperSearchProvider: SearchProvider = {
  id: "serper",
  displayName: "Serper",
  isAvailable(): boolean {
    return Boolean(process.env.SERPER_API_KEY);
  },
  async search(query): Promise<SearchProviderResponse> {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) throw new Error("SERPER_API_KEY is not configured");

    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Serper search failed (${res.status}): ${text.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      organic?: Array<{ title?: string; link?: string; snippet?: string }>;
      answerBox?: { answer?: string; snippet?: string };
    };
    const results = (data.organic ?? []).map((r) => ({ title: r.title, url: r.link, snippet: r.snippet }));
    const content = data.answerBox?.answer || data.answerBox?.snippet || results.map((r) => r.snippet).filter(Boolean).join("\n\n");
    return { content, results, provider: "serper" };
  },
};
