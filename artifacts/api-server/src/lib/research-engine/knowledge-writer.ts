import { db, ashKnowledgeEntriesTable, ashResearchProfilesTable, type AshResearchType, type AshKnowledgeEntry } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../logger";
import { categoryForResearchType } from "./knowledge-lookup";
import type { ScoredSource, StructuredSummary } from "./types";

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
  params: { summary: StructuredSummary; sources: ScoredSource[] },
): Promise<AshKnowledgeEntry> {
  const [updated] = await db
    .update(ashKnowledgeEntriesTable)
    .set({
      title: params.summary.title,
      content: params.summary.summary,
      tags: params.summary.tags,
      keyFindings: params.summary.keyFindings,
      sources: params.sources,
      confidenceScore: params.summary.confidenceScore,
      lastAccessedAt: new Date(),
    })
    .where(eq(ashKnowledgeEntriesTable.id, existingEntryId))
    .returning();

  logger.info({ knowledgeEntryId: updated.id }, "Research Engine: updated existing Knowledge Memory entry with newer research");
  return updated;
}

async function insertNewEntry(params: {
  userId: number;
  sourceProjectId: number | null;
  researchType: AshResearchType;
  summary: StructuredSummary;
  sources: ScoredSource[];
}): Promise<AshKnowledgeEntry> {
  const [entry] = await db
    .insert(ashKnowledgeEntriesTable)
    .values({
      userId: params.userId,
      sourceProjectId: params.sourceProjectId,
      category: categoryForResearchType(params.researchType),
      title: params.summary.title,
      content: params.summary.summary,
      tags: params.summary.tags,
      keyFindings: params.summary.keyFindings,
      sources: params.sources,
      confidenceScore: params.summary.confidenceScore,
      lastAccessedAt: new Date(),
    })
    .returning();
  return entry;
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
