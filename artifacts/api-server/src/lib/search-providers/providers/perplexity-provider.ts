import { complete } from "../../openrouter";
import { MODELS } from "../../models";
import type { SearchProvider, SearchProviderResponse } from "../types";

// ─── Existing Search (Perplexity via OpenRouter) ───────────────────────────
// Wraps the exact same primitive already used across the codebase
// (routes/research.ts, lib/research-loop.ts, ai-orchestrator.ts auto-search)
// so routing the Research Engine through the provider abstraction changes
// NOTHING about current behavior. Always available — OPENROUTER_API_KEY is
// a platform-level requirement already, making this the guaranteed fallback.
export const perplexitySearchProvider: SearchProvider = {
  id: "perplexity",
  displayName: "Existing Search (Perplexity via OpenRouter)",
  isAvailable(): boolean {
    return Boolean(process.env.OPENROUTER_API_KEY);
  },
  async search(query, opts): Promise<SearchProviderResponse> {
    const result = await complete({ prompt: query, model: MODELS.research, userId: opts?.userId });
    return { content: result.content, provider: "perplexity" };
  },
};
