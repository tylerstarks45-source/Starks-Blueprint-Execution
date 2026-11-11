/**
 * Research & Knowledge Engine — Knowledge Reuse Validation
 *
 * Demonstrates the "search Knowledge Memory before researching" contract
 * end to end against the real database (AI calls mocked for determinism):
 *
 *  1. No existing knowledge  -> full research pipeline runs, a NEW
 *     ash_knowledge_entries row is created.
 *  2. Identical/near-identical objective, fresh + high-confidence entry
 *     -> Knowledge Memory is reused, NO new AI research call is made.
 *  3. Same topic, but the existing entry is stale (or otherwise not
 *     reusable) and new research succeeds -> the EXISTING entry is
 *     UPDATED in place (same row id), not duplicated.
 *  4. A low-confidence new research result never overwrites good existing
 *     knowledge.
 *
 * Mocks:
 *  - openrouter.complete — deterministic plan/search/summary responses, and
 *    a call counter to assert step 2 truly skips new research.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { eq, and } from "drizzle-orm";

vi.mock("../lib/openrouter", () => ({
  complete: vi.fn(),
  streamCompletion: vi.fn(),
}));

import {
  db,
  usersTable,
  ashKnowledgeEntriesTable,
  ashResearchSessionsTable,
  type AshKnowledgeEntry,
} from "@workspace/db";
import { complete as _complete } from "../lib/openrouter";
import { runResearchEngine, findReusableKnowledge, findExistingEntryForTopic } from "../lib/research-engine";

const mockComplete = vi.mocked(_complete);

let testUserId: number;
const TEST_EMAIL = `research_reuse_${Date.now()}@test.internal`;

beforeAll(async () => {
  const [user] = await db
    .insert(usersTable)
    .values({ email: TEST_EMAIL, role: "USER", membershipStatus: "active", membershipTier: "starter" })
    .returning({ id: usersTable.id });
  testUserId = user.id;
});

afterAll(async () => {
  if (testUserId) {
    await db.delete(usersTable).where(eq(usersTable.id, testUserId));
  }
});

beforeEach(() => {
  mockComplete.mockReset();
});

function fakeCompletion(content: string) {
  return { content, model: "openai/gpt-4o-mini", promptTokens: 10, completionTokens: 20, totalTokens: 30, estimatedCost: null };
}

// Every runResearchEngine() call that actually researches makes 2 complete()
// calls minimum: one for the plan (planner.ts, MODELS.utility) and at least
// one gather call per plan step (gatherer.ts -> perplexity provider ->
// MODELS.research), plus one for the structured summary (summarizer.ts).
// Queue a deterministic sequence covering a 2-step plan.
function queueFullResearchRun(summaryJson: Record<string, unknown>) {
  mockComplete
    .mockResolvedValueOnce(fakeCompletion(JSON.stringify({ steps: [{ query: "best ai captioning tools", purpose: "primary" }] }))) // plan
    .mockResolvedValueOnce(fakeCompletion("According to techcrunch.com, the leading tool is CaptionAI, praised for accuracy.")) // gather step 1
    .mockResolvedValueOnce(fakeCompletion(JSON.stringify(summaryJson))); // summary
}

async function getEntry(userId: number, category: string): Promise<AshKnowledgeEntry | undefined> {
  const rows = await db
    .select()
    .from(ashKnowledgeEntriesTable)
    .where(and(eq(ashKnowledgeEntriesTable.userId, userId), eq(ashKnowledgeEntriesTable.category, category)));
  return rows[0];
}

describe("Research & Knowledge Engine — knowledge-first reuse", () => {
  // Deletes all knowledge entries/sessions for the test user between tests
  // so each scenario starts from a clean slate without needing a fresh user.
  afterEach(async () => {
    await db.delete(ashResearchSessionsTable).where(eq(ashResearchSessionsTable.userId, testUserId));
    await db.delete(ashKnowledgeEntriesTable).where(eq(ashKnowledgeEntriesTable.userId, testUserId));
  });

  it("no existing knowledge: runs full research and creates a new entry", async () => {
    queueFullResearchRun({
      title: "Best AI captioning tools",
      summary: "CaptionAI leads the market for short-form video captioning accuracy.",
      keyFindings: ["CaptionAI is the top-rated tool", "Accuracy is the key differentiator"],
      tags: ["ai_tool", "captioning"],
      confidenceScore: 75,
    });

    const result = await runResearchEngine({
      userId: testUserId,
      projectId: null,
      researchType: "ai_tool",
      objective: "Find the best AI tool for generating short-form video captions",
    });

    expect(result.reusedExistingKnowledge).toBe(false);
    expect(result.knowledgeAction).toBe("created");
    expect(result.confidenceScore).toBe(75);
    expect(mockComplete).toHaveBeenCalledTimes(3); // plan + gather + summary — real research happened

    const entry = await getEntry(testUserId, "ai_tool_profile");
    expect(entry).toBeDefined();
    expect(entry!.title).toBe("Best AI captioning tools");
    expect(entry!.confidenceScore).toBe(75);

    // Verify the session row also recorded a completed, non-reused run.
    const [session] = await db
      .select()
      .from(ashResearchSessionsTable)
      .where(eq(ashResearchSessionsTable.id, result.sessionId));
    expect(session.status).toBe("completed");
    expect(session.reusedExistingKnowledge).toBe(0);
    expect(session.resultKnowledgeEntryId).toBe(entry!.id);
  });

  it("fresh, high-confidence match: reuses Knowledge Memory and performs NO new research", async () => {
    // Seed a fresh, confident entry directly (bypassing the pipeline) so this
    // test only exercises the reuse decision, not research generation.
    await db.insert(ashKnowledgeEntriesTable).values({
      userId: testUserId,
      ownerUserId: testUserId,
      category: "ai_tool_profile",
      title: "Best AI tools for short-form video captions",
      content: "CaptionAI and SubtitleGenie are the two leading options for automated short-form video captioning.",
      tags: ["ai_tool", "video", "captions"],
      keyFindings: ["CaptionAI leads on accuracy", "SubtitleGenie is cheaper"],
      confidenceScore: 80,
      lastAccessedAt: new Date(),
    });

    const lookup = await findReusableKnowledge({
      userId: testUserId,
      researchType: "ai_tool",
      objective: "Find the best AI tool for generating short-form video captions",
    });
    expect(lookup.reusable).not.toBeNull();
    expect(lookup.reusable!.title).toContain("Best AI tools for short-form video captions");

    const result = await runResearchEngine({
      userId: testUserId,
      projectId: null,
      researchType: "ai_tool",
      objective: "Find the best AI tool for generating short-form video captions",
    });

    expect(result.reusedExistingKnowledge).toBe(true);
    expect(result.knowledgeAction).toBe("reused");
    expect(result.knowledgeEntryId).toBe(lookup.reusable!.id);
    expect(mockComplete).not.toHaveBeenCalled(); // no plan/gather/summary calls at all — knowledge-first lookup short-circuited everything

    const [session] = await db
      .select()
      .from(ashResearchSessionsTable)
      .where(eq(ashResearchSessionsTable.id, result.sessionId));
    expect(session.reusedExistingKnowledge).toBe(1);
  });

  it("stale existing entry + successful new research: UPDATES the existing row instead of duplicating it", async () => {
    const [stale] = await db
      .insert(ashKnowledgeEntriesTable)
      .values({
        userId: testUserId,
        ownerUserId: testUserId,
        category: "trend_research",
        title: "Short-form video trends",
        content: "Old data from a while ago about short-form video trends.",
        tags: ["trend"],
        confidenceScore: 90, // high confidence, but trend research goes stale after 14 days
        lastAccessedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days old — stale for "trend"
        updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      })
      .returning();

    // Confirm the staleness gate correctly refuses to reuse it...
    const reuseLookup = await findReusableKnowledge({ userId: testUserId, researchType: "trend", objective: "Short-form video trends 2026" });
    expect(reuseLookup.reusable).toBeNull();
    // ...but the topic-match lookup (used for update-vs-insert) still finds it.
    const topicMatch = await findExistingEntryForTopic({ userId: testUserId, researchType: "trend", objective: "Short-form video trends 2026" });
    expect(topicMatch?.id).toBe(stale.id);

    queueFullResearchRun({
      title: "Short-form video trends 2026",
      summary: "Vertical AI-generated micro-documentaries are the fastest-growing short-form video trend in 2026.",
      keyFindings: ["AI micro-documentaries are surging", "Watch time on sub-30s clips is up sharply"],
      tags: ["trend", "video"],
      confidenceScore: 70,
    });

    const result = await runResearchEngine({
      userId: testUserId,
      projectId: null,
      researchType: "trend",
      objective: "Short-form video trends 2026",
    });

    expect(result.knowledgeAction).toBe("updated");
    expect(result.knowledgeEntryId).toBe(stale.id); // same row, not a new one

    const rows = await db
      .select()
      .from(ashKnowledgeEntriesTable)
      .where(and(eq(ashKnowledgeEntriesTable.userId, testUserId), eq(ashKnowledgeEntriesTable.category, "trend_research")));
    expect(rows.length).toBe(1); // still exactly one entry for this topic — no duplicate
    expect(rows[0].title).toBe("Short-form video trends 2026");
    expect(rows[0].content).toContain("micro-documentaries");
  });

  it("low-confidence new research never overwrites good existing knowledge", async () => {
    const [good] = await db
      .insert(ashKnowledgeEntriesTable)
      .values({
        userId: testUserId,
        ownerUserId: testUserId,
        category: "market_research",
        title: "Pet supplement market size",
        content: "The pet supplement market is valued at roughly $3B and growing steadily.",
        tags: ["market"],
        confidenceScore: 85,
        lastAccessedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // stale for "market" (45-day threshold)
        updatedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      })
      .returning();

    // New research comes back thin/unfounded (below the save/update threshold).
    mockComplete
      .mockResolvedValueOnce(fakeCompletion(JSON.stringify({ steps: [{ query: "pet supplement market size", purpose: "primary" }] })))
      .mockResolvedValueOnce(fakeCompletion("")); // gather returns nothing usable -> filtered out -> summarizer falls back

    const result = await runResearchEngine({
      userId: testUserId,
      projectId: null,
      researchType: "market",
      objective: "Pet supplement market size",
    });

    expect(result.knowledgeAction).toBe("skipped");

    const [unchanged] = await db.select().from(ashKnowledgeEntriesTable).where(eq(ashKnowledgeEntriesTable.id, good.id));
    expect(unchanged.title).toBe("Pet supplement market size");
    expect(unchanged.content).toContain("$3B"); // untouched
    expect(unchanged.confidenceScore).toBe(85); // untouched
  });
});

describe("Research & Knowledge Engine — per-business weekly updates (forceFresh + businessId)", () => {
  afterEach(async () => {
    await db.delete(ashResearchSessionsTable).where(eq(ashResearchSessionsTable.userId, testUserId));
    await db.delete(ashKnowledgeEntriesTable).where(eq(ashKnowledgeEntriesTable.userId, testUserId));
  });

  it("replaces only the same business's previous entry", async () => {
    const { businessesTable } = await import("@workspace/db");
    const [a, b] = await db
      .insert(businessesTable)
      .values([
        { ownerId: testUserId, name: "Shop A", businessType: "ecommerce", status: "active" },
        { ownerId: testUserId, name: "Shop B", businessType: "ecommerce", status: "active" },
      ])
      .returning({ id: businessesTable.id });
    const summary = (title: string) => ({ title, summary: `${title} summary`, keyFindings: ["x"], tags: ["market"], confidenceScore: 80 });
    const run = (businessId: number) =>
      runResearchEngine({ userId: testUserId, projectId: null, researchType: "market", objective: "Weekly update for ecommerce shop", forceFresh: true, businessId });

    queueFullResearchRun(summary("A week 1"));
    const a1 = await run(a!.id);
    queueFullResearchRun(summary("B week 1"));
    const b1 = await run(b!.id);
    const [unrelated] = await db
      .insert(ashKnowledgeEntriesTable)
      .values({ userId: testUserId, businessId: a!.id, ownerUserId: testUserId, category: "market_research", title: "A pricing study", content: "keep me", tags: ["market"] })
      .returning({ id: ashKnowledgeEntriesTable.id });

    queueFullResearchRun(summary("A week 2"));
    const a2 = await run(a!.id);

    expect(a1.knowledgeAction).toBe("created");
    expect(b1.knowledgeAction).toBe("created");
    expect(a2.knowledgeAction).toBe("updated");
    expect(a2.knowledgeEntryId).toBe(a1.knowledgeEntryId);
    expect(b1.knowledgeEntryId).not.toBe(a1.knowledgeEntryId);

    const rows = await db.select().from(ashKnowledgeEntriesTable).where(eq(ashKnowledgeEntriesTable.userId, testUserId));
    expect(rows.map((r) => [r.businessId, r.title]).sort()).toEqual([[a!.id, "A pricing study"], [a!.id, "A week 2"], [b!.id, "B week 1"]].sort());
    expect(rows.find((r) => r.id === unrelated!.id)!.content).toBe("keep me");

    await db.delete(businessesTable).where(eq(businessesTable.ownerId, testUserId));
  });

  it("tagged scheduled research replaces only its own topic entry and is never overwritten interactively", async () => {
    const summary = (title: string) => ({ title, summary: `${title} summary`, keyFindings: ["x"], tags: ["trend"], confidenceScore: 80 });
    const run = (tag: string) =>
      runResearchEngine({ userId: testUserId, projectId: null, researchType: "trend", objective: "Online income opportunities right now", forceFresh: true, knowledgeTag: tag });
    queueFullResearchRun(summary("Digital products v1"));
    const d1 = await run("online_opportunity:digital_products");
    queueFullResearchRun(summary("Micro SaaS v1"));
    const m1 = await run("online_opportunity:micro_saas");
    queueFullResearchRun(summary("Digital products v2"));
    const d2 = await run("online_opportunity:digital_products");
    expect(d2.knowledgeEntryId).toBe(d1.knowledgeEntryId);
    expect(m1.knowledgeEntryId).not.toBe(d1.knowledgeEntryId);
    const rows = await db.select().from(ashKnowledgeEntriesTable).where(eq(ashKnowledgeEntriesTable.userId, testUserId));
    expect(rows.map((r) => r.title).sort()).toEqual(["Digital products v2", "Micro SaaS v1"]);
    expect(rows.find((r) => r.id === d2.knowledgeEntryId)!.tags).toContain("online_opportunity:digital_products");
    expect(await findExistingEntryForTopic({ userId: testUserId, researchType: "trend", objective: "Online income opportunities right now" })).toBeNull();
  });

  it("interactive research never picks a weekly entry to overwrite", async () => {
    await db.insert(ashKnowledgeEntriesTable).values({
      userId: testUserId, ownerUserId: testUserId, category: "market_research",
      title: "Ecommerce shop market trends", content: "Ecommerce shop market trends and competitors", tags: ["market", "business_update"],
    });
    const objective = "Ecommerce shop market trends and competitors";
    expect(await findExistingEntryForTopic({ userId: testUserId, researchType: "market", objective })).toBeNull();
    await db.update(ashKnowledgeEntriesTable).set({ tags: ["market"] }).where(eq(ashKnowledgeEntriesTable.userId, testUserId));
    expect(await findExistingEntryForTopic({ userId: testUserId, researchType: "market", objective })).not.toBeNull();
  });
});
