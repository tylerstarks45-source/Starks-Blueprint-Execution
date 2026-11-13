import type { AshResearchType } from "@workspace/db";
import { complete } from "../openrouter";
import { MODELS } from "../models";
import { logger } from "../logger";
import type { RawFinding, StructuredSummary } from "./types";

// ─── Structured summary generation (step 6 of the workflow) ────────────────
// Produces a strict JSON object so it can populate ash_knowledge_entries'
// structured fields directly (title/summary/keyFindings/tags/confidence),
// plus an optional type-specific profile block for competitor/AI-tool
// research (spec: "COMPETITOR ANALYSIS" / "AI TOOL KNOWLEDGE" sections).

const PROFILE_INSTRUCTIONS: Partial<Record<AshResearchType, string>> = {
  competitor: `Also include a "competitorProfile" object with these keys: companyOverview, products, services, pricing, strengths, weaknesses, opportunities, threats, marketingStrategy, seoPresence, technologyStack. Use short strings or string arrays for each; write "Unknown" where the research doesn't say.`,
  ai_tool: `Also include an "aiToolProfile" object with these keys: purpose, features (array), pricing, strengths (array), weaknesses (array), recommendedUseCases (array). Write "Unknown" where the research doesn't say.`,
};

export async function generateStructuredSummary(params: {
  researchType: AshResearchType;
  objective: string;
  findings: RawFinding[];
  userId?: number;
}): Promise<StructuredSummary> {
  const { researchType, objective, findings, userId } = params;
  const findingsText = findings.map((f, i) => `### Finding ${i + 1} (query: "${f.query}")\n${f.content}`).join("\n\n");
  const profileInstruction = PROFILE_INSTRUCTIONS[researchType] ?? "";

  const fallback: StructuredSummary = {
    title: objective.slice(0, 120),
    summary: findings.map((f) => f.content).join(" ").slice(0, 800) || "No research findings were gathered.",
    keyFindings: findings.slice(0, 5).map((f) => f.content.slice(0, 200)),
    tags: [researchType],
    confidenceScore: findings.length > 0 ? 45 : 20,
  };

  if (findings.length === 0) return fallback;

  try {
    const result = await complete({
      userId,
      systemPrompt: `You are ASH's Research & Knowledge Engine summarizer. Turn raw web research into a structured, reusable knowledge object. Be specific and honest — if the research doesn't support a claim, say so rather than inventing detail.
${profileInstruction}
Return ONLY valid JSON shaped exactly like:
{
  "title": "short descriptive title",
  "summary": "2-4 sentence overview",
  "keyFindings": ["finding 1", "finding 2", "..."],
  "tags": ["tag1", "tag2"],
  "confidenceScore": <0-100 integer, honest about how well-supported this is>
}`,
      prompt: `Research type: ${researchType}\nObjective: ${objective}\n\nRaw findings:\n${findingsText}`,
      model: MODELS.utility,
    });

    const match = result.content.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : result.content) as Partial<StructuredSummary>;

    return {
      title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.slice(0, 150) : fallback.title,
      summary: typeof parsed.summary === "string" && parsed.summary.trim() ? parsed.summary.slice(0, 1500) : fallback.summary,
      keyFindings: Array.isArray(parsed.keyFindings) ? parsed.keyFindings.filter((f) => typeof f === "string").slice(0, 10) : fallback.keyFindings,
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter((t) => typeof t === "string").slice(0, 8) : fallback.tags,
      confidenceScore: Math.max(0, Math.min(100, Math.round(Number(parsed.confidenceScore) || fallback.confidenceScore))),
      competitorProfile: typeof parsed.competitorProfile === "object" && parsed.competitorProfile ? parsed.competitorProfile : undefined,
      aiToolProfile: typeof parsed.aiToolProfile === "object" && parsed.aiToolProfile ? parsed.aiToolProfile : undefined,
    };
  } catch (err) {
    logger.warn({ err, researchType }, "Research Engine: summary generation failed, using fallback summary");
    return fallback;
  }
}
