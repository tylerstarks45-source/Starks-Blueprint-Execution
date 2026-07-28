// ─── Shared relevance scoring (Memory Engine) ──────────────────────────────
// No vector DB in this stack — relevance is a cheap heuristic combining
// keyword overlap with the current message, importance, confidence, and
// recency of access. Good enough to keep "inject only relevant memory"
// honest without adding a new infra dependency in this foundation phase.

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "to", "of", "in", "on", "for", "with",
  "is", "are", "was", "were", "be", "been", "it", "this", "that", "i", "you",
  "we", "my", "your", "our", "me", "us", "want", "please", "help", "can",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function keywordOverlapScore(messageTokens: Set<string>, candidate: string, tags: unknown): number {
  const candidateTokens = new Set([
    ...tokenize(candidate),
    ...(Array.isArray(tags) ? tags.flatMap((t) => tokenize(String(t))) : []),
  ]);
  if (candidateTokens.size === 0) return 0;
  let hits = 0;
  for (const t of messageTokens) if (candidateTokens.has(t)) hits++;
  return hits / candidateTokens.size;
}

export function scoreRelevance(params: {
  message: string;
  content: string;
  tags?: unknown;
  importanceScore?: number | null;
  confidenceScore?: number | null;
  lastAccessedAt?: Date | string | null;
}): number {
  const messageTokens = new Set(tokenize(params.message));
  const overlap = keywordOverlapScore(messageTokens, params.content, params.tags);
  const importance = (params.importanceScore ?? 50) / 100;
  const confidence = (params.confidenceScore ?? 100) / 100;

  let recency = 0.5;
  if (params.lastAccessedAt) {
    const ageMs = Date.now() - new Date(params.lastAccessedAt).getTime();
    const ageDays = ageMs / (24 * 60 * 60 * 1000);
    recency = Math.max(0, 1 - ageDays / 60); // decays to 0 over ~60 days
  }

  // Keyword overlap dominates (it's the "relevant to this ask" signal);
  // importance/confidence/recency break ties and surface durable facts even
  // without an exact keyword hit.
  return overlap * 0.6 + importance * 0.2 + confidence * 0.1 + recency * 0.1;
}

export function topByRelevance<T>(
  items: T[],
  message: string,
  extract: (item: T) => { content: string; tags?: unknown; importanceScore?: number | null; confidenceScore?: number | null; lastAccessedAt?: Date | string | null },
  limit: number,
): T[] {
  return items
    .map((item) => ({ item, score: scoreRelevance({ message, ...extract(item) }) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.item);
}
