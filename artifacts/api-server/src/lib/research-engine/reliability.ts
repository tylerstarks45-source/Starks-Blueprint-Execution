import type { RawFinding, ScoredSource } from "./types";

// ─── Source reliability scoring (step 5 of the workflow) ────────────────────
// Honest heuristic, not false precision: Perplexity-style grounded
// completions often cite domains/publications in prose but rarely return a
// structured source list. This extracts whatever domain/publication signals
// are present and scores from a small, extensible tier table — same
// "rule-based, extensible" shape as the Validation Engine's risk detector.

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

export function scoreSourceReliability(finding: RawFinding): ScoredSource {
  for (const tier of RELIABILITY_TIERS) {
    if (tier.patterns.some((p) => p.test(finding.content))) {
      return { label: finding.query, reliability: tier.score, reasoning: tier.reasoning };
    }
  }
  return { label: finding.query, reliability: NO_CITATION_SCORE, reasoning: "No explicit citation detected — treat as unverified." };
}

export function scoreAllSources(findings: RawFinding[]): ScoredSource[] {
  return findings.map(scoreSourceReliability);
}

export function averageReliability(sources: ScoredSource[]): number {
  if (sources.length === 0) return 0;
  return Math.round(sources.reduce((sum, s) => sum + s.reliability, 0) / sources.length);
}
