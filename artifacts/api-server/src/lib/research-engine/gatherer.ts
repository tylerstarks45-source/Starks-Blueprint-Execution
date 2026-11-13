import { searchWeb } from "../search-providers";
import { logger } from "../logger";
import { OutOfCreditsError, DailyAiLimitError } from "../credits";
import type { ResearchPlanStep, RawFinding } from "./types";

// ─── Information gathering (step 3 of the workflow) ─────────────────────────
// Goes through the Search Provider Abstraction (../search-providers) instead
// of calling any single provider directly — the Research Engine never knows
// or cares which provider actually answered. Today that resolves to the
// same web-grounded primitive already used by routes/research.ts,
// lib/research-loop.ts, and ai-orchestrator.ts's auto-search, so behavior is
// unchanged; adding Tavily/Serper credentials later upgrades this
// automatically with no changes here.
export async function gatherInformation(steps: ResearchPlanStep[], userId: number): Promise<RawFinding[]> {
  const results = await Promise.all(
    steps.map(async (step): Promise<RawFinding> => {
      try {
        const result = await searchWeb(step.query, { userId });
        return { query: step.query, content: result.content, sourceResults: result.results };
      } catch (err) {
        // Credit errors must abort the run so schedulers retry instead of recording an empty success.
        if (err instanceof OutOfCreditsError || err instanceof DailyAiLimitError) throw err;
        logger.warn({ err, query: step.query }, "Research Engine: gather step failed, continuing with other queries");
        return { query: step.query, content: "" };
      }
    }),
  );
  return results.filter((r) => r.content.trim().length > 0);
}
