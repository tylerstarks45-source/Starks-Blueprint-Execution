import { db, ashKnowledgeEntriesTable, ashResearchProfilesTable, type AshResearchType, type AshKnowledgeEntry } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../logger";
import { categoryForResearchType } from "./knowledge-lookup";
import type { ScoredSource, StructuredSummary } from "./types";
import { insertKnowledgeEntry, updateKnowledgeEntry } from "../governance/writes/knowledge-writes";
import { actorFor, type GovernedWriteContext } from "../governance/types";

// Research & Knowledge Engine findings are always AI-synthesized (this is
// the only writer for ashResearchType-driven entries) and owned by the
// requesting user directly — same no-join rule as knowledge-memory.ts.
//
// Note: ashResearchProfilesTable (upsertResearchProfile below) is
// deliberately NOT governed. It wasn't named in Phase A's table list and is
// a satellite/derived projection of an already-governed knowledge entry
// (deleted and fully rewritten on every update, never independently
// mutated), so instrumenting it would add audit noise without protecting
// any fact not already covered by its parent ash_knowledge_entries row. Left
// as an explicit, documented Phase B candidate if that changes.
function researchKnowledgeContext(userId: number, businessId?: number | null): GovernedWriteContext {
  return { ownerUserId: userId, sourceEngine: "research_engine.knowledge_writer", actor: actorFor("ai"), businessId: businessId ?? null };
}

// ─── Save or update Knowledge Memory (step 7 of the workflow) ──────────────
// "Save reusable findings into Knowledge Memory when appropriate... update
// existing knowledge if newer information is found." Gated on a minimum
// confidence so low-signal, mostly-unfounded research doesn't overwrite good
// existing knowledge or pollute future lookups with a bad new entry.
const MIN_CONFIDENCE_TO_SAVE = 40;

export type KnowledgeWriteAction = "created" | "updated" | "skipped";

export interface KnowledgeWriteResult {
  entry: AshKnowledgeEntry | null;
  action: KnowledgeWriteAction;
}

export async function saveOrUpdateKnowledgeMemory(params: {
  userId: number;
  sourceProjectId: number | null;
  researchType: AshResearchType;
  summary: StructuredSummary;
  sources: ScoredSource[];
  /** id of an existing entry on the same topic (from findExistingEntryForTopic), or null for a genuinely new topic. */
  existingEntryId: number | null;
  businessId?: number | null;
}): Promise<KnowledgeWriteResult> {
  if (params.summary.confidenceScore < MIN_CONFIDENCE_TO_SAVE) {
    logger.info(
      { userId: params.userId, researchType: params.researchType, confidence: params.summary.confidenceScore },
      "Research Engine: confidence too low, not saving to Knowledge Memory",
    );
    return { entry: null, action: "skipped" };
  }

  const entry = params.existingEntryId
    ? await updateExistingEntry(params.existingEntryId, params)
    : await insertNewEntry(params);

  await upsertResearchProfile(entry.id, params);

  return { entry, action: params.existingEntryId ? "updated" : "created" };
}

async function updateExistingEntry(
  existingEntryId: number,
  params: { userId: number; summary: StructuredSummary; sources: ScoredSource[] },
): Promise<AshKnowledgeEntry> {
  // Fetched fresh (the caller only holds the id from findExistingEntryForTopic)
  // so updateKnowledgeEntry gets a real pre-update snapshot for its audit diff.
  const [before] = await db.select().from(ashKnowledgeEntriesTable).where(eq(ashKnowledgeEntriesTable.id, existingEntryId));
  if (!before) throw new Error(`Knowledge entry ${existingEntryId} not found`);

  const updated = await updateKnowledgeEntry(db, researchKnowledgeContext(params.userId, before.businessId), before, {
    title: params.summary.title,
    content: params.summary.summary,
    tags: params.summary.tags,
    keyFindings: params.summary.keyFindings,
    sources: params.sources,
    confidenceScore: params.summary.confidenceScore,
    lastAccessedAt: new Date(),
  });

  logger.info({ knowledgeEntryId: updated.id }, "Research Engine: updated existing Knowledge Memory entry with newer research");
  return updated;
}

async function insertNewEntry(params: {
  userId: number;
  sourceProjectId: number | null;
  researchType: AshResearchType;
  summary: StructuredSummary;
  sources: ScoredSource[];
  businessId?: number | null;
}): Promise<AshKnowledgeEntry> {
  return insertKnowledgeEntry(db, researchKnowledgeContext(params.userId, params.businessId), {
    userId: params.userId,
    businessId: params.businessId ?? null,
    sourceProjectId: params.sourceProjectId,
    category: categoryForResearchType(params.researchType),
    title: params.summary.title,
    content: params.summary.summary,
    tags: params.summary.tags,
    keyFindings: params.summary.keyFindings,
    sources: params.sources,
    confidenceScore: params.summary.confidenceScore,
    lastAccessedAt: new Date(),
  });
}

// Persists the richer, type-specific structured profile alongside the
// searchable knowledge card when one was produced. Replaces any prior
// profile for the same entry on update rather than accumulating duplicates.
async function upsertResearchProfile(
  knowledgeEntryId: number,
  params: { userId: number; sourceProjectId: number | null; summary: StructuredSummary },
): Promise<void> {
  const profileType = params.summary.competitorProfile ? "competitor" : params.summary.aiToolProfile ? "ai_tool" : null;
  if (!profileType) return;

  try {
    await db.delete(ashResearchProfilesTable).where(eq(ashResearchProfilesTable.knowledgeEntryId, knowledgeEntryId));
    await db.insert(ashResearchProfilesTable).values({
      userId: params.userId,
      sourceProjectId: params.sourceProjectId,
      knowledgeEntryId,
      profileType,
      name: params.summary.title,
      data: (params.summary.competitorProfile ?? params.summary.aiToolProfile) as Record<string, unknown>,
    });
  } catch (err) {
    logger.warn({ err, knowledgeEntryId }, "Research Engine: failed to save structured profile, knowledge entry still saved");
  }
}
