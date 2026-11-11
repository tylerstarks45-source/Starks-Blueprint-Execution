/**
 * Daily online-opportunity scan: one topic per day under the founder account,
 * retried on failure, and surfaced to ASH chat only for money-related requests.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { db, usersTable, ashKnowledgeEntriesTable } from "@workspace/db";
import { asc, eq } from "drizzle-orm";

vi.mock("../lib/research-engine/index", () => ({ runResearchEngine: vi.fn(async () => ({ sessionId: 1, knowledgeAction: "created" })) }));
import { runResearchEngine } from "../lib/research-engine/index";
import {
  runOpportunityScan,
  buildOpportunityResearchNote,
  topicForDay,
  opportunityTag,
  OPPORTUNITY_SCAN_INTERVAL_MS,
  OPPORTUNITY_SCAN_STATE_KEY,
  OPPORTUNITY_TOPICS,
} from "../lib/research-engine/opportunity-scan";

let createdFounder: number | null = null;
let founder = 0;

beforeAll(async () => {
  const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "FOUNDER_ADMIN")).orderBy(asc(usersTable.id)).limit(1);
  if (existing) founder = existing.id;
  else {
    const [u] = await db.insert(usersTable).values({ email: `opp_founder_${Date.now()}@test.internal`, role: "FOUNDER_ADMIN", membershipStatus: "active", membershipTier: "empire" }).returning({ id: usersTable.id });
    founder = createdFounder = u.id;
  }
});
afterAll(async () => {
  await db.delete(ashKnowledgeEntriesTable).where(eq(ashKnowledgeEntriesTable.title, "Test: AI agencies selling automations"));
  if (createdFounder) await db.delete(usersTable).where(eq(usersTable.id, createdFounder));
});
beforeEach(() => vi.mocked(runResearchEngine).mockClear());

const harness = () => {
  const state = new Map<string, number>();
  return { state, lastRun: (k: string) => state.get(k) ?? 0, markRun: async (k: string, ts: number) => void state.set(k, ts) };
};

describe("runOpportunityScan", () => {
  it("rotates through every topic, one per day", () => {
    const keys = new Set(Array.from({ length: OPPORTUNITY_TOPICS.length }, (_, i) => topicForDay(i * OPPORTUNITY_SCAN_INTERVAL_MS).key));
    expect(keys.size).toBe(OPPORTUNITY_TOPICS.length);
  });

  it("researches today's topic as fresh tagged trend research, at most once a day", async () => {
    const h = harness();
    const now = Date.now();
    const res = await runOpportunityScan({ now, ...h });
    expect(res).toMatchObject({ ran: true, topic: topicForDay(now).key });
    expect(vi.mocked(runResearchEngine).mock.calls[0]![0]).toMatchObject({
      userId: founder, researchType: "trend", projectId: null, forceFresh: true, knowledgeTag: opportunityTag(topicForDay(now).key),
    });
    expect(h.state.get(OPPORTUNITY_SCAN_STATE_KEY)).toBe(now);

    expect(await runOpportunityScan({ now: now + 1000, ...h })).toMatchObject({ ran: false, reason: "not_due" });
    expect(runResearchEngine).toHaveBeenCalledTimes(1);
  });

  it("restores the previous run time on failure so the next tick retries", async () => {
    const h = harness();
    h.state.set(OPPORTUNITY_SCAN_STATE_KEY, 5);
    vi.mocked(runResearchEngine).mockResolvedValueOnce({ sessionId: 1, knowledgeAction: "failed" } as never);
    expect(await runOpportunityScan({ now: Date.now(), ...h })).toMatchObject({ ran: false, reason: "failed" });
    expect(h.state.get(OPPORTUNITY_SCAN_STATE_KEY)).toBe(5);
  });
});

describe("buildOpportunityResearchNote", () => {
  it("includes the newest scan findings only for money-related requests", async () => {
    await db.insert(ashKnowledgeEntriesTable).values({
      userId: founder, ownerUserId: founder, category: "trend_research",
      title: "Test: AI agencies selling automations", content: "Small AI automation agencies charge $2k-5k per build.",
      keyFindings: ["Retainers of $500/mo are common"], tags: ["trend", opportunityTag("ai_services")],
    });
    const note = await buildOpportunityResearchNote("How can I make money online this month?");
    expect(note).toContain("CURRENT ONLINE INCOME RESEARCH");
    expect(note).toContain("Test: AI agencies selling automations");
    expect(note).toContain("Retainers of $500/mo are common");
    expect(await buildOpportunityResearchNote("Change my logo color to blue")).toBe("");
  });
});
