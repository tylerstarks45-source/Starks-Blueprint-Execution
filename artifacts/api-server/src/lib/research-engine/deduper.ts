import type { RawFinding } from "./types";

// ─── Duplicate removal (step 4 of the workflow) ─────────────────────────────
// No AI call needed — a cheap shingle/Jaccard similarity heuristic is enough
// to catch findings that just restate each other (common when plan steps
// overlap slightly). Keeps the workflow fast and deterministic.

function shingles(text: string, size = 5): Set<string> {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const result = new Set<string>();
  for (let i = 0; i <= words.length - size; i++) {
    result.add(words.slice(i, i + size).join(" "));
  }
  return result;
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const s of a) if (b.has(s)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

const SIMILARITY_THRESHOLD = 0.5;

export function removeDuplicateFindings(findings: RawFinding[]): RawFinding[] {
  const kept: RawFinding[] = [];
  const keptShingles: Set<string>[] = [];

  for (const finding of findings) {
    const s = shingles(finding.content);
    const isDuplicate = keptShingles.some((existing) => jaccardSimilarity(s, existing) >= SIMILARITY_THRESHOLD);
    if (!isDuplicate) {
      kept.push(finding);
      keptShingles.push(s);
    }
  }
  return kept;
}
