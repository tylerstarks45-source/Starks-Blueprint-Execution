import { db, ashKnowledgeEntriesTable, type AshKnowledgeEntry, type AshResearchType } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
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

// Same relevance scan used by both lookup functions below — factored out so
// "find the best-matching entry for this objective" has exactly one
// implementation regardless of whether the caller also wants a staleness gate.
function bestMatch(
  rows: AshKnowledgeEntry[],
  objective: string,
  opts: { minRelevance: number; requireFresh?: { staleAfterDays: number; minConfidence: number } },
): { entry: AshKnowledgeEntry; score: number } | null {
  const now = Date.now();
  let best: { entry: AshKnowledgeEntry; score: number } | null = null;

  for (const entry of rows) {
    if (opts.requireFresh) {
      const ageDays = (now - new Date(entry.updatedAt).getTime()) / (24 * 60 * 60 * 1000);
      if (ageDays > opts.requireFresh.staleAfterDays) continue;
      if (entry.confidenceScore < opts.requireFresh.minConfidence) continue;
    }

    const score = scoreRelevance({
      message: objective,
      content: `${entry.title} ${entry.content}`,
      tags: entry.tags,
      importanceScore: entry.importanceScore,
      confidenceScore: entry.confidenceScore,
      lastAccessedAt: entry.lastAccessedAt,
    });
    if (score >= opts.minRelevance && (!best || score > best.score)) {
      best = { entry, score };
    }
  }
  return best;
}

/**
 * Step 0 of the workflow: "search Knowledge Memory before performing new
 * research." Only returns an entry fresh and confident enough to skip
 * research entirely — a stale or low-confidence match is NOT reusable, even
 * if it's the best topical match (see findExistingEntryForTopic for that case).
 */
export async function findReusableKnowledge(params: {
  userId: number;
  researchType: AshResearchType;
  objective: string;
}): Promise<KnowledgeLookupResult> {
  const rows = await entriesForCategory(params.userId, params.researchType);
  const staleAfterDays = STALENESS_DAYS[params.researchType] ?? DEFAULT_STALENESS_DAYS;

  const best = bestMatch(rows, params.objective, {
    minRelevance: REUSE_RELEVANCE_THRESHOLD,
    requireFresh: { staleAfterDays, minConfidence: REUSE_CONFIDENCE_THRESHOLD },
  });

  return { reusable: best?.entry ?? null };
}

/**
 * Finds the best-matching knowledge entry for this objective REGARDLESS of
 * staleness or confidence — used after a fresh research run completes to
 * decide "update this existing entry with newer information" vs. "this is a
 * genuinely new topic, insert a new entry." Uses the SAME relevance bar as
 * the reuse check (same "is this topically the same entry" question) — the
 * only thing this lookup drops is the freshness/confidence gate, since a
 * stale-but-topically-matching entry is exactly the case we want to update
 * rather than duplicate.
 */
export async function findExistingEntryForTopic(params: {
  userId: number;
  researchType: AshResearchType;
  objective: string;
}): Promise<AshKnowledgeEntry | null> {
  // Per-business weekly entries may be read (reused) but are only ever rewritten by weekly research.
  const rows = (await entriesForCategory(params.userId, params.researchType))
    .filter((e) => !(Array.isArray(e.tags) && e.tags.some((t) => isScheduledTag(String(t)))));
  const best = bestMatch(rows, params.objective, { minRelevance: REUSE_RELEVANCE_THRESHOLD });
  return best?.entry ?? null;
}

async function entriesForCategory(userId: number, researchType: AshResearchType): Promise<AshKnowledgeEntry[]> {
  const category = categoryForResearchType(researchType);
  return db
    .select()
    .from(ashKnowledgeEntriesTable)
    .where(and(eq(ashKnowledgeEntriesTable.userId, userId), eq(ashKnowledgeEntriesTable.category, category)));
}

/** Tag on entries written by per-business weekly research; only those are ever replaced. */
export const BUSINESS_UPDATE_TAG = "business_update";
/** Prefix of the per-topic tag on entries written by the daily online-opportunity scan. */
export const OPPORTUNITY_TAG_PREFIX = "online_opportunity:";
const isScheduledTag = (t: string) => t === BUSINESS_UPDATE_TAG || t.startsWith(OPPORTUNITY_TAG_PREFIX);

/** The most recent entry of this research type carrying `tag`. */
export async function findTaggedEntry(params: {
  userId: number;
  tag: string;
  researchType: AshResearchType;
}): Promise<AshKnowledgeEntry | null> {
  const [row] = await db
    .select()
    .from(ashKnowledgeEntriesTable)
    .where(and(
      eq(ashKnowledgeEntriesTable.userId, params.userId),
      eq(ashKnowledgeEntriesTable.category, categoryForResearchType(params.researchType)),
      sql`${ashKnowledgeEntriesTable.tags} @> ${JSON.stringify([params.tag])}::jsonb`,
    ))
    .orderBy(desc(ashKnowledgeEntriesTable.updatedAt))
    .limit(1);
  return row ?? null;
}

/** The most recent per-business update entry of this research type. */
export async function findBusinessEntry(params: {
  userId: number;
  businessId: number;
  researchType: AshResearchType;
}): Promise<AshKnowledgeEntry | null> {
  const [row] = await db
    .select()
    .from(ashKnowledgeEntriesTable)
    .where(and(
      eq(ashKnowledgeEntriesTable.userId, params.userId),
      eq(ashKnowledgeEntriesTable.businessId, params.businessId),
      eq(ashKnowledgeEntriesTable.category, categoryForResearchType(params.researchType)),
      sql`${ashKnowledgeEntriesTable.tags} @> ${JSON.stringify([BUSINESS_UPDATE_TAG])}::jsonb`,
    ))
    .orderBy(desc(ashKnowledgeEntriesTable.updatedAt))
    .limit(1);
  return row ?? null;
}
