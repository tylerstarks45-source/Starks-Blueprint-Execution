import type { AshResearchType } from "@workspace/db";
import { complete } from "../openrouter";
import { MODELS } from "../models";
import { logger } from "../logger";
import type { ResearchPlan } from "./types";

// ─── Research plan generation (step 1-2 of the workflow) ───────────────────
// "1. Understand the objective. 2. Generate a research plan." Cheap-first:
// a deterministic per-type fallback plan always exists, so a planner AI call
// failing never stops the workflow — it just falls back to a single,
// perfectly serviceable generic query.

const RESEARCH_TYPE_LABEL: Record<AshResearchType, string> = {
  business: "business research",
  competitor: "competitor research",
  market: "market research",
  seo: "SEO research",
  product: "product research",
  technology: "technology research",
  ai_tool: "AI tool / software research",
  trend: "trend research",
};

function fallbackPlan(researchType: AshResearchType, objective: string): ResearchPlan {
  const label = RESEARCH_TYPE_LABEL[researchType];
  return {
    steps: [
      { query: objective, purpose: `Direct ${label} on the stated objective.` },
      { query: `${objective} current data statistics 2025 2026`, purpose: `Ground the findings in current, verifiable data.` },
    ],
  };
}

export async function generateResearchPlan(researchType: AshResearchType, objective: string): Promise<ResearchPlan> {
  try {
    const result = await complete({
      systemPrompt: `You are ASH's Research & Knowledge Engine planner. Given a research objective, produce 2-4 specific, non-redundant web search queries that together cover it thoroughly for ${RESEARCH_TYPE_LABEL[researchType]}.
Return ONLY valid JSON: { "steps": [ { "query": "...", "purpose": "..." } ] }. No markdown, no extra text.`,
      prompt: `Research type: ${researchType}\nObjective: ${objective}`,
      model: MODELS.utility,
    });
    const match = result.content.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : result.content) as Partial<ResearchPlan>;
    if (Array.isArray(parsed.steps) && parsed.steps.length > 0) {
      const steps = parsed.steps
        .filter((s): s is { query: string; purpose: string } => typeof s?.query === "string" && s.query.trim().length > 0)
        .slice(0, 4)
        .map((s) => ({ query: s.query.trim(), purpose: typeof s.purpose === "string" ? s.purpose : "" }));
      if (steps.length > 0) return { steps };
    }
  } catch (err) {
    logger.warn({ err, researchType }, "Research Engine: plan generation failed, using fallback plan");
  }
  return fallbackPlan(researchType, objective);
}
