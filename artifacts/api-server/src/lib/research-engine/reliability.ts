import type { RawFinding, ScoredSource } from "./types";

// ─── Source reliability scoring (step 5 of the workflow) ────────────────────
// Honest heuristic, not false precision. When the active search provider
// returned structured results (Tavily/Serper — see search-providers/),
// score against their real URLs. Perplexity-style grounded completions
// rarely return a structured source list, so for those we fall back to
// extracting whatever domain/publication signal is present in the prose,
// scored from a small, extensible tier table — same "rule-based,
// extensible" shape as the Validation Engine's risk detector.

interface ReliabilityTier {
  score: number;
  patterns: RegExp[];
  reasoning: string;
}

const RELIABILITY_TIERS: ReliabilityTier[] = [
  { score: 90, patterns: [/\.gov\b/i, /\.edu\b/i], reasoning: "Government or academic source cited." },
  { score: 80, patterns: [/statista|reuters|bloomberg|wall street journal|wsj\.com|financial times|ft\.com|sec\.gov/i], reasoning: "Recognized data/financial publication cited." },
  { score: 70, patterns: [/techcrunch|forbes|the verge|wired|harvard business review|hbr\.org|mckinsey|gartner|nielsen/i], reasoning: "Recognized industry publication or research firm cited." },
  { score: 60, patterns: [/wikipedia/i], reasoning: "Wikipedia cited — generally reliable but not primary." },
  { score: 55, patterns: [/https?:\/\/[^\s)]+/i], reasoning: "A specific URL was cited, source unclassified." },
];

const NO_CITATION_SCORE = 35; // AI's own knowledge, no live grounding signal detected.

function scoreText(text: string): { score: number; reasoning: string } {
  for (const tier of RELIABILITY_TIERS) {
    if (tier.patterns.some((p) => p.test(text))) return { score: tier.score, reasoning: tier.reasoning };
  }
  return { score: NO_CITATION_SCORE, reasoning: "No explicit citation detected — treat as unverified." };
}

export function scoreSourceReliability(finding: RawFinding): ScoredSource {
  if (finding.sourceResults && finding.sourceResults.length > 0) {
    // Structured results from a real search provider: score each cited URL
    // and take the best, since a provider-level finding is only as reliable
    // as its strongest supporting source.
    const scored = finding.sourceResults.map((r) => scoreText(r.url ?? r.title ?? ""));
    const best = scored.reduce((a, b) => (b.score > a.score ? b : a), scored[0]);
    return { label: finding.query, reliability: best.score, reasoning: `${best.reasoning} (${finding.sourceResults.length} source(s) returned by provider)` };
  }

  const { score, reasoning } = scoreText(finding.content);
  return { label: finding.query, reliability: score, reasoning };
}

export function scoreAllSources(findings: RawFinding[]): ScoredSource[] {
  return findings.map(scoreSourceReliability);
}

export function averageReliability(sources: ScoredSource[]): number {
  if (sources.length === 0) return 0;
  return Math.round(sources.reduce((sum, s) => sum + s.reliability, 0) / sources.length);
}
