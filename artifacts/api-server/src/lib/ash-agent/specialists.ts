// Specialist agents ASH can delegate to with the consult_specialist tool. Each
// specialist reuses the same agent loop, models and billing as ASH, with a
// focused prompt and a read-only subset of server tools (no workspace actions,
// no further delegation).

export interface Specialist {
  title: string;
  prompt: string;
  tools: string[];
}

const RULES = `Ground every claim in tool results. Never invent metrics; if a value isn't measured, say so.
Reply to ASH (not the end user) with concise findings and 3-5 concrete, prioritized recommendations.`;

export const SPECIALISTS = {
  finance: {
    title: "Finance",
    prompt: `You are ASH's finance specialist: revenue, pricing, margins, unit economics, cash flow and financial risk.\n${RULES}`,
    tools: ["list_businesses", "get_business_context", "get_portfolio_summary", "get_learned_patterns"],
  },
  marketing: {
    title: "Marketing",
    prompt: `You are ASH's marketing specialist: positioning, channels, SEO, content, social, conversion and customer acquisition.\n${RULES}`,
    tools: ["list_businesses", "get_business_context", "research", "get_learned_patterns"],
  },
  operations: {
    title: "Operations",
    prompt: `You are ASH's operations specialist: processes, automation, fulfilment, tooling and operational risk.\n${RULES}`,
    tools: ["list_businesses", "get_business_context", "get_learned_patterns"],
  },
  research: {
    title: "Market research",
    prompt: `You are ASH's market research specialist: markets, competitors, trends, demand signals and current online opportunities. Cite sources and dates where known.\n${RULES}`,
    tools: ["research", "get_learned_patterns"],
  },
  strategy: {
    title: "Strategy",
    prompt: `You are ASH's strategy specialist: portfolio priorities, growth bets, trade-offs and sequencing across the user's businesses.\n${RULES}`,
    tools: ["list_businesses", "get_business_context", "get_portfolio_summary", "research", "get_learned_patterns"],
  },
} as const satisfies Record<string, Specialist>;

export type SpecialistKey = keyof typeof SPECIALISTS;
export const SPECIALIST_KEYS = Object.keys(SPECIALISTS) as SpecialistKey[];
export const SPECIALIST_MAX_STEPS = 3;
