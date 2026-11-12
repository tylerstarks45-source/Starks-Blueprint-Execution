// ─── Centralized model selection — single source of truth ────────────────────
//
// Task #282: ASH must ALWAYS use the best available OpenRouter model for anything
// the user actually sees — conversation, planning, build reasoning, generated
// content. Cost is not a consideration for user-facing quality. Lightweight
// models are reserved ONLY for trivial internal classification / JSON extraction
// where the output is never shown to the user and quality is imperceptible.
//
// Every user-facing call site should route through this module instead of
// hardcoding a model string, so the "best model" policy lives in exactly one
// place and can be tuned globally.

export type ModelChain = string[];

// Media models (OpenRouter /audio/transcriptions, /audio/speech, /images).
export const MEDIA_MODELS = {
  transcription: "openai/whisper-large-v3",
  speech: "deepgram/aura-2",
  image: "openai/gpt-image-2",
} as const;

// Canonical model IDs used across the platform. Keep these as the ONLY place
// raw OpenRouter model strings live.
export const MODELS = {
  // Absolute best reasoning / build / deep-analysis model.
  flagship: "anthropic/claude-opus-5.5",
  // Best balance of frontier quality + responsiveness for conversation & planning.
  reasoning: "anthropic/claude-sonnet-5.5",
  // Fast frontier model for snappy iteration — still top-tier, never "budget".
  swift: "openai/gpt-4o",
  // Lightweight — ONLY for trivial internal classification / JSON extraction.
  utility: "openai/gpt-4o-mini",
  // Online-capable research model for live web search.
  research: "perplexity/sonar-pro",
  // Cheaper online model, used as the research fallback.
  researchLite: "perplexity/sonar",
} as const;

// Ordered best-first fallback chains. OpenRouter's native `models` routing tries
// each in order and skips any that are unavailable, so a single deprecated /
// rate-limited model never takes ASH down — it silently drops to the next-best.
export const CHAINS = {
  flagship: [MODELS.flagship, MODELS.reasoning, MODELS.swift],
  reasoning: [MODELS.reasoning, MODELS.swift, MODELS.flagship],
  swift: [MODELS.swift, MODELS.reasoning],
  utility: [MODELS.utility, MODELS.swift],
  research: [MODELS.research, MODELS.researchLite],
} as const satisfies Record<string, ModelChain>;

export type Situation = keyof typeof CHAINS;

// Returns a fresh copy of a situation's fallback chain (safe to mutate).
export function chainFor(situation: Situation): ModelChain {
  return [...CHAINS[situation]];
}

// Agent modes are DEPTH / SCOPE presets — every mode is backed by a frontier
// model. "fast" trades a little depth for speed but is still a strong frontier
// model (never a budget one). Higher tiers unlock the deepest reasoning model
// and more thorough, multi-pass planning. When the mode is unknown/unset we
// default to high quality (reasoning), NOT a budget model.
export function chainForAgentMode(mode: string | undefined | null): ModelChain {
  switch (mode) {
    case "fast":
      return chainFor("swift");
    case "business":
      return chainFor("reasoning");
    case "expert":
    case "empire":
      return chainFor("flagship");
    default:
      return chainFor("reasoning");
  }
}

// ─── Tier-based agent-mode gating ────────────────────────────────────────────
// The best-model policy above means EVERY mode is backed by a frontier model, so
// the only thing an agent mode changes is depth/scope — and therefore how many
// credits a response burns. Higher modes (expert/empire) route to the most
// expensive flagship model, so they must be gated to the caller's paid tier;
// otherwise a free user could burn flagship credits via a crafted API call.
//
// Membership tiers ranked low→high (legacy aliases map to their canonical rank).
export const TIER_RANK: Record<string, number> = {
  free: 0,
  starter: 1,
  pro: 1,
  builder: 1,
  operator: 2,
  enterprise: 3,
  empire: 3,
};

// Minimum tier rank required to use each agent mode. Modes not listed here are
// unknown and fall through to the default chain WITHOUT gating.
export const MODE_MIN_RANK: Record<string, number> = {
  fast: 0,
  business: 0,
  expert: 1,   // Builder+
  empire: 2,   // Operator+
};

// Best→cheapest preference used to pick the richest mode a tier can afford when
// the requested mode is above the caller's tier.
const MODE_PREFERENCE = ["empire", "expert", "business", "fast"] as const;

export function tierRank(tier: string | undefined | null): number {
  return TIER_RANK[(tier ?? "free").toLowerCase()] ?? 0;
}

// Resolves the effective agent mode for a caller. Returns the requested mode when
// the tier permits it, otherwise safely downgrades to the richest mode the tier
// can afford. FOUNDER_ADMIN bypasses the gate (usage is still tracked elsewhere).
// `tier`/`isFounder` MUST come from the server-verified role/tier, never a
// client-supplied flag.
export function resolveAgentMode(
  requestedMode: string | undefined | null,
  tier: string | undefined | null,
  isFounder = false,
): { mode: string; downgraded: boolean; requested: string } {
  const requested = requestedMode ?? "business";
  const minRank = MODE_MIN_RANK[requested];
  if (isFounder || minRank === undefined) {
    return { mode: requested, downgraded: false, requested };
  }
  const rank = tierRank(tier);
  if (rank >= minRank) {
    return { mode: requested, downgraded: false, requested };
  }
  const fallback = MODE_PREFERENCE.find((m) => rank >= MODE_MIN_RANK[m]) ?? "fast";
  return { mode: fallback, downgraded: true, requested };
}

// Human-readable depth guidance injected into the system prompt so the model
// calibrates thoroughness (not intelligence) to the selected mode.
export function depthNoteForAgentMode(mode: string | undefined | null): string {
  switch (mode) {
    case "fast":
      return `\n\n=== RESPONSE DEPTH: SWIFT ===\nThe user wants fast, high-signal answers. Be sharp and concise — get to the point quickly without sacrificing correctness. Skip exhaustive breakdowns unless asked.`;
    case "business":
      return `\n\n=== RESPONSE DEPTH: BALANCED ===\nGive thorough, well-reasoned answers with concrete detail and clear next steps, but stay readable. This is the default depth for real production work.`;
    case "expert":
      return `\n\n=== RESPONSE DEPTH: DEEP ===\nGo deep. Reason carefully through edge cases, tradeoffs, and second-order effects. Produce rigorous, detailed plans and analysis. Thoroughness matters more than brevity here.`;
    case "empire":
      return `\n\n=== RESPONSE DEPTH: MAXIMUM (MULTI-AGENT) ===\nOperate at maximum depth. Think like a team of specialists — research, architecture, execution, and validation — reasoning through the whole system end to end. Leave nothing important unaddressed.`;
    default:
      return "";
  }
}
