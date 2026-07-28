import { db, ashKnowledgeEntriesTable, ashResearchProfilesTable, type AshResearchType, type AshKnowledgeEntry } from "@workspace/db";
import { logger } from "../logger";
import { categoryForResearchType } from "./knowledge-lookup";
import type { ScoredSource, StructuredSummary } from "./types";

// ─── Save reusable findings into Knowledge Memory (step 7 of the workflow) ─
// "Save reusable findings into Knowledge Memory when appropriate" — gated on
// a minimum confidence so low-signal, mostly-unfounded research doesn't
// pollute future knowledge lookups with bad answers.
const MIN_CONFIDENCE_TO_SAVE = 40;

export async function saveToKnowledgeMemory(params: {
  userId: number;
  sourceProjectId: number | null;
  researchType: AshResearchType;
  summary: StructuredSummary;
  sources: ScoredSource[];
}): Promise<AshKnowledgeEntry | null> {
  if (params.summary.confidenceScore < MIN_CONFIDENCE_TO_SAVE) {
    logger.info({ userId: params.userId, researchType: params.researchType, confidence: params.summary.confidenceScore }, "Research Engine: confidence too low, not saving to Knowledge Memory");
    return null;
  }

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

  // Persist the richer, type-specific structured profile alongside the
  // searchable knowledge card when one was produced.
  const profileType = params.summary.competitorProfile ? "competitor" : params.summary.aiToolProfile ? "ai_tool" : null;
  if (profileType) {
    try {
      await db.insert(ashResearchProfilesTable).values({
        userId: params.userId,
        sourceProjectId: params.sourceProjectId,
        knowledgeEntryId: entry.id,
        profileType,
        name: params.summary.title,
        data: (params.summary.competitorProfile ?? params.summary.aiToolProfile) as Record<string, unknown>,
      });
    } catch (err) {
      logger.warn({ err, knowledgeEntryId: entry.id }, "Research Engine: failed to save structured profile, knowledge entry still saved");
    }
  }

  return entry;
}
