import { db, ashResearchSessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../logger";
import { findReusableKnowledge, findExistingEntryForTopic } from "./knowledge-lookup";
import { generateResearchPlan } from "./planner";
import { gatherInformation } from "./gatherer";
import { removeDuplicateFindings } from "./deduper";
import { scoreAllSources, averageReliability } from "./reliability";
import { generateStructuredSummary } from "./summarizer";
import { saveOrUpdateKnowledgeMemory } from "./knowledge-writer";
import type { ResearchRequest, ResearchEngineResult } from "./types";

export * from "./types";
export { findReusableKnowledge, findExistingEntryForTopic, categoryForResearchType } from "./knowledge-lookup";
export { detectResearchIntent } from "./intent";

// ─── Research & Knowledge Engine (Phase 1.4) ───────────────────────────────
// Integration: Executive Brain → Research & Knowledge Engine → existing AI
// Orchestrator → existing search/tool systems. This module is the
// orchestrator of that middle layer's own 7-step workflow:
//   1. Understand the objective        (caller supplies researchType + objective)
//   2. Generate a research plan        (planner.ts)
//   3. Gather information              (gatherer.ts — reuses existing search primitive)
//   4. Remove duplicate information    (deduper.ts)
//   5. Score source reliability        (reliability.ts)
//   6. Generate a structured summary   (summarizer.ts)
//   7. Save reusable findings          (knowledge-writer.ts)
// Step 0 (knowledge-lookup.ts) runs first: "search Knowledge Memory before
// performing new research" — if a good match already exists, the whole
// gather/dedupe/score/summarize pipeline is skipped entirely.
//
// Never throws: on any failure, returns a low-confidence result with a
// contextNote explaining the shortfall so the Executive Brain flow this sits
// in front of can proceed unaffected (same fail-open contract as Planning
// and Memory Engine call sites in routes/executive-brain.ts).
export async function runResearchEngine(request: ResearchRequest): Promise<ResearchEngineResult> {
  const [session] = await db
    .insert(ashResearchSessionsTable)
    .values({
      userId: request.userId,
      projectId: request.projectId,
      researchType: request.researchType,
      objective: request.objective,
      status: "researching",
    })
    .returning();

  try {
    // Step 0: knowledge-first lookup.
    const { reusable } = await findReusableKnowledge({
      userId: request.userId,
      researchType: request.researchType,
      objective: request.objective,
    });

    if (reusable) {
      await db.update(ashResearchSessionsTable).set({
        status: "completed",
        reusedExistingKnowledge: 1,
        findingsSummary: reusable.content,
        resultKnowledgeEntryId: reusable.id,
        completedAt: new Date(),
      }).where(eq(ashResearchSessionsTable.id, session.id));

      return {
        sessionId: session.id,
        reusedExistingKnowledge: true,
        knowledgeEntryId: reusable.id,
        knowledgeAction: "reused",
        summary: reusable.content,
        keyFindings: Array.isArray(reusable.keyFindings) ? (reusable.keyFindings as string[]) : [],
        confidenceScore: reusable.confidenceScore,
        contextNote: `\n\n=== RESEARCH & KNOWLEDGE ENGINE (from memory, no new research needed) ===\n${reusable.title}: ${reusable.content}`,
      };
    }

    // Steps 1-2: plan.
    const plan = await generateResearchPlan(request.researchType, request.objective);
    await db.update(ashResearchSessionsTable).set({ plan }).where(eq(ashResearchSessionsTable.id, session.id));

    // Step 3: gather (reuses the existing search primitive, see gatherer.ts).
    const rawFindings = await gatherInformation(plan.steps, request.userId);

    // Step 4: dedupe.
    const dedupedFindings = removeDuplicateFindings(rawFindings);

    // Step 5: score reliability.
    const sources = scoreAllSources(dedupedFindings);
    const avgReliability = averageReliability(sources);

    // Step 6: structured summary.
    const summary = await generateStructuredSummary({
      researchType: request.researchType,
      objective: request.objective,
      findings: dedupedFindings,
    });

    // Step 6.5: is this a genuinely new topic, or newer information about
    // something already in Knowledge Memory? Checked regardless of the
    // step-0 staleness gate above — a stale-but-matching entry should be
    // UPDATED with this fresher research, not duplicated.
    const existingEntry = await findExistingEntryForTopic({
      userId: request.userId,
      researchType: request.researchType,
      objective: request.objective,
    });

    // Step 7: save (insert) or update when appropriate.
    const { entry: knowledgeEntry, action } = await saveOrUpdateKnowledgeMemory({
      userId: request.userId,
      sourceProjectId: request.projectId,
      researchType: request.researchType,
      summary,
      sources,
      existingEntryId: existingEntry?.id ?? null,
    });

    await db.update(ashResearchSessionsTable).set({
      status: "completed",
      sourcesCount: sources.length,
      avgReliabilityScore: avgReliability || null,
      findingsSummary: summary.summary,
      resultKnowledgeEntryId: knowledgeEntry?.id ?? null,
      completedAt: new Date(),
    }).where(eq(ashResearchSessionsTable.id, session.id));

    const actionLabel = action === "updated" ? "updated existing knowledge with newer research" : action === "created" ? "new knowledge saved" : "not saved — low confidence";
    return {
      sessionId: session.id,
      reusedExistingKnowledge: false,
      knowledgeEntryId: knowledgeEntry?.id ?? null,
      knowledgeAction: action,
      summary: summary.summary,
      keyFindings: summary.keyFindings,
      confidenceScore: summary.confidenceScore,
      contextNote: `\n\n=== RESEARCH & KNOWLEDGE ENGINE (${request.researchType} research, ${sources.length} source(s), avg reliability ${avgReliability}/100, ${actionLabel}) ===\n${summary.title}\n${summary.summary}\nKey findings: ${summary.keyFindings.join("; ")}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn({ err, userId: request.userId, researchType: request.researchType }, "Research Engine: run failed");
    await db.update(ashResearchSessionsTable).set({
      status: "failed",
      errorMessage: message.slice(0, 500),
      completedAt: new Date(),
    }).where(eq(ashResearchSessionsTable.id, session.id)).catch(() => {});

    return {
      sessionId: session.id,
      reusedExistingKnowledge: false,
      knowledgeEntryId: null,
      knowledgeAction: "failed",
      summary: "Research could not be completed automatically.",
      keyFindings: [],
      confidenceScore: 0,
      contextNote: "",
    };
  }
}
