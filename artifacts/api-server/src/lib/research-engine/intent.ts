import type { AshResearchType } from "@workspace/db";

// ─── Research intent detection ──────────────────────────────────────────────
// Deliberately narrower than the existing AI Orchestrator's SEARCH_PATTERNS
// (see routes/ai-orchestrator.ts detectAutoTools) — those exist for quick,
// one-off factual lookups ("what's the price of X") and stay completely
// untouched. This only matches requests worth the full plan → gather →
// dedupe → score → summarize → SAVE pipeline: multi-step research that
// produces genuinely reusable knowledge. Avoids duplicating the
// orchestrator's lightweight auto-search for simple queries.
const RESEARCH_TYPE_PATTERNS: Array<[AshResearchType, RegExp]> = [
  ["competitor", /\b(competitor|competitors|competitive analysis|who else (is|does)|spy on)\b/i],
  ["market", /\b(market research|market size|market analysis|total addressable market|market opportunity)\b/i],
  ["seo", /\b(seo research|keyword research|search rankings|backlink)\b/i],
  ["product", /\b(product research|best products to sell|winning products|product validation)\b/i],
  ["technology", /\b(tech stack|which technology|compare (frameworks|platforms|databases)|technology research)\b/i],
  ["ai_tool", /\b(ai tools? for|best ai tool|which ai tool|compare (ai )?tools|software (for|to)\b.{0,20}\b(recommend|compare))\b/i],
  ["trend", /\b(trend(s|ing)?\b.{0,15}\b(radar|research|report)|what'?s trending|emerging trends)\b/i],
  ["business", /\b(research (my|this|the) (business|idea|niche)|validate (this|my) (idea|business)|business research)\b/i],
];

export function detectResearchIntent(message: string): AshResearchType | null {
  for (const [type, pattern] of RESEARCH_TYPE_PATTERNS) {
    if (pattern.test(message)) return type;
  }
  return null;
}
