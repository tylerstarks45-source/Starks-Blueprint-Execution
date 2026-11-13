import { complete } from "./openrouter";
import { MODELS, chainFor } from "./models";
import { logEvent } from "./log-event";
import { logger } from "./logger";

// ─── Root-cause research loop (Task #248, step 3) ──────────────────────────
// Triggered by Continuous Monitoring / self-healing when a system error is
// NOT fixable by the whitelisted low-risk actions in self-healing.ts (i.e.
// right before it would otherwise be escalated as a bare Pending Approval).
//
// "Browser research" here is the codebase's existing web-grounded search
// primitive — an OpenRouter completion against a Perplexity `-online` model,
// the same mechanism already used by the ASH Research Lab tools
// (see routes/research.ts, "Phase 1: Perplexity web searches"). The
// Playwright-driven browser agent (lib/browser/agent.ts) requires a specific
// startUrl to navigate to, which we don't have for an arbitrary error
// message — there is no "search and compare" entry point that takes a bare
// query, so rather than bolt on a fragile new browser-automation mode for a
// job the platform already does well with grounded search, we reuse the
// established pattern.
const RESEARCH_MODEL = MODELS.research;
const SYNTHESIS_MODEL = MODELS.utility;

export interface RootCauseResearchInput {
  systemInstanceId: number | null;
  businessId: number | null;
  component: string; // e.g. "connector:shopify", "runtime_job:send_email", "worker"
  errorMessage: string;
  context?: string; // any extra detail (job type, connector id, attempts made, etc.)
}

export interface RootCauseResearchResult {
  diagnosis: string;
  proposedFix: string;
  explanationForUser: string;
  confidence: number; // 0-100
  isKnownWhitelistedFix: boolean; // true only if the fix maps to an already-whitelisted self-heal action
  sourcesSummary: string;
}

/**
 * Research the current, up-to-date root cause of an unresolved system error
 * and propose a fix. Never throws — on any failure returns a low-confidence
 * fallback result so callers can still create a meaningful Pending Approval.
 */
export async function runRootCauseResearch(input: RootCauseResearchInput): Promise<RootCauseResearchResult> {
  await logEvent({
    systemInstanceId: input.systemInstanceId,
    businessId: input.businessId,
    category: "recovery",
    severity: "info",
    component: "research-loop",
    action: "research_started",
    message: `Root-cause research started for ${input.component}: ${input.errorMessage.slice(0, 200)}`,
  });

  try {
    const searchQuery = `Current official documentation and known fixes (as of today) for this error in "${input.component}": "${input.errorMessage}". ${input.context ?? ""}`.trim();

    const searchResult = await complete({
      prompt: searchQuery,
      models: chainFor("research"),
    }).catch((err) => {
      logger.warn({ err }, "Research loop: web search step failed, continuing with base knowledge only");
      return { content: "[Web search unavailable — using base knowledge only]", model: RESEARCH_MODEL, promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: null };
    });

    const synthesisPrompt = `You are ASH, diagnosing an unresolved system error for an autonomous business-operations platform.

Component: ${input.component}
Error: ${input.errorMessage}
Additional context: ${input.context ?? "(none)"}

Current research findings:
${searchResult.content}

Respond with ONLY a single JSON object (no markdown, no prose) shaped exactly like:
{
  "diagnosis": "<1-3 sentence technical root cause>",
  "proposedFix": "<concrete, specific fix a human or automation could apply>",
  "explanationForUser": "<1-2 sentence plain-language explanation for a non-technical business owner>",
  "confidence": <0-100 integer>,
  "isKnownWhitelistedFix": <true only if the fix is simply retrying, reconnecting, or restarting the affected component — false for anything requiring new credentials, code changes, or manual configuration>
}`;

    const synthesis = await complete({
      prompt: synthesisPrompt,
      systemPrompt:
        "You are ASH's root-cause research engine. You give specific, evidence-based diagnoses — never vague filler. " +
        "Always respond with strictly valid JSON matching the requested shape.",
      model: SYNTHESIS_MODEL,
    });

    const jsonMatch = synthesis.content.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : synthesis.content) as Partial<RootCauseResearchResult>;

    const result: RootCauseResearchResult = {
      diagnosis: typeof parsed.diagnosis === "string" ? parsed.diagnosis.slice(0, 500) : "Unable to determine a specific root cause from available research.",
      proposedFix: typeof parsed.proposedFix === "string" ? parsed.proposedFix.slice(0, 500) : "Manual investigation is required.",
      explanationForUser: typeof parsed.explanationForUser === "string" ? parsed.explanationForUser.slice(0, 300) : "ASH found an issue that needs your attention.",
      confidence: Math.max(0, Math.min(100, Math.round(Number(parsed.confidence) || 40))),
      isKnownWhitelistedFix: parsed.isKnownWhitelistedFix === true,
      sourcesSummary: searchResult.content.slice(0, 1000),
    };

    await logEvent({
      systemInstanceId: input.systemInstanceId,
      businessId: input.businessId,
      category: "recovery",
      severity: "info",
      component: "research-loop",
      action: "research_completed",
      message: `Root-cause research completed for ${input.component}: ${result.diagnosis}`,
      metadata: { confidence: result.confidence, isKnownWhitelistedFix: result.isKnownWhitelistedFix },
    });

    return result;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    logger.warn({ err, component: input.component }, "Root-cause research loop failed");
    await logEvent({
      systemInstanceId: input.systemInstanceId,
      businessId: input.businessId,
      category: "recovery",
      severity: "warning",
      component: "research-loop",
      action: "research_failed",
      message: `Root-cause research failed for ${input.component}: ${detail}`,
    });
    return {
      diagnosis: "Automated research could not complete — manual investigation is required.",
      proposedFix: "Manual investigation is required.",
      explanationForUser: "ASH ran into a problem and couldn't finish researching this automatically. It needs your attention.",
      confidence: 20,
      isKnownWhitelistedFix: false,
      sourcesSummary: `Research failed: ${detail}`,
    };
  }
}
