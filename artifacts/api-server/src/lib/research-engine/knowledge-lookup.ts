import { db, ashKnowledgeEntriesTable, type AshKnowledgeEntry, type AshResearchType } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { scoreRelevance } from "../memory-engine/relevance";
import type { AshKnowledgeCategory } from "@workspace/db";

// ─── Knowledge-first lookup (Phase 1.4) ────────────────────────────────────
// Spec: "Before generating recommendations: Search Knowledge Memory first.
// Only perform new research when necessary." Reuses the existing Memory
// Engine relevance scorer (Phase 1.2) rather than inventing a second
// similarity metric — this IS "reuse existing capabilities, don't duplicate
// functionality" applied to search-adjacent infra, not just web search.

const RESEARCH_TYPE_TO_CATEGORY: Record<AshResearchType, AshKnowledgeCategory> = {
  business: "business_research",
  competitor: "competitor_profile",
  market: "market_research",
  seo: "seo_research",
  product: "product_research",
  technology: "technology_research",
  ai_tool: "ai_tool_profile",
  trend: "trend_research",
};

// Trend/market research goes stale fast; competitor/AI-tool profiles and
// evergreen frameworks stay useful much longer.
const STALENESS_DAYS: Partial<Record<AshResearchType, number>> = {
  trend: 14,
  market: 45,
};
const DEFAULT_STALENESS_DAYS = 120;

const REUSE_RELEVANCE_THRESHOLD = 0.45;
const REUSE_CONFIDENCE_THRESHOLD = 60;

export function categoryForResearchType(researchType: AshResearchType): AshKnowledgeCategory {
  return RESEARCH_TYPE_TO_CATEGORY[researchType];
}

export interface KnowledgeLookupResult {
  reusable: AshKnowledgeEntry | null;
}

export async function findReusableKnowledge(params: {
  userId: number;
  researchType: AshResearchType;
  objective: string;
}): Promise<KnowledgeLookupResult> {
  const category = categoryForResearchType(params.researchType);
  const rows = await db
    .select()
    .from(ashKnowledgeEntriesTable)
    .where(and(eq(ashKnowledgeEntriesTable.userId, params.userId), eq(ashKnowledgeEntriesTable.category, category)));

  const staleAfterDays = STALENESS_DAYS[params.researchType] ?? DEFAULT_STALENESS_DAYS;
  const now = Date.now();

  let best: { entry: AshKnowledgeEntry; score: number } | null = null;
  for (const entry of rows) {
    const ageDays = (now - new Date(entry.updatedAt).getTime()) / (24 * 60 * 60 * 1000);
    if (ageDays > staleAfterDays) continue;
    if (entry.confidenceScore < REUSE_CONFIDENCE_THRESHOLD) continue;

    const score = scoreRelevance({
      message: params.objective,
      content: `${entry.title} ${entry.content}`,
      tags: entry.tags,
      importanceScore: entry.importanceScore,
      confidenceScore: entry.confidenceScore,
      lastAccessedAt: entry.lastAccessedAt,
    });
    if (score >= REUSE_RELEVANCE_THRESHOLD && (!best || score > best.score)) {
      best = { entry, score };
    }
  }

  return { reusable: best?.entry ?? null };
}
