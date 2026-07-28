import { complete } from "../openrouter";
import { MODELS } from "../models";
import { logger } from "../logger";
import type { ResearchPlanStep, RawFinding } from "./types";

// ─── Information gathering (step 3 of the workflow) ─────────────────────────
// IMPORTANT: reuses the exact same web-grounded search primitive already
// used by routes/research.ts, lib/research-loop.ts, and
// routes/ai-orchestrator.ts's auto-search — an OpenRouter completion against
// MODELS.research (a Perplexity `-online` model). No new search mechanism is
// introduced; this only adds the plan/dedupe/score/summarize/save workflow
// around that existing primitive.
export async function gatherInformation(steps: ResearchPlanStep[], userId: number): Promise<RawFinding[]> {
  const results = await Promise.all(
    steps.map(async (step): Promise<RawFinding> => {
      try {
        const result = await complete({ prompt: step.query, model: MODELS.research, userId });
        return { query: step.query, content: result.content };
      } catch (err) {
        logger.warn({ err, query: step.query }, "Research Engine: gather step failed, continuing with other queries");
        return { query: step.query, content: "" };
      }
    }),
  );
  return results.filter((r) => r.content.trim().length > 0);
}
