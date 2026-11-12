/**
 * Weekly research runs only for active Operations Mode businesses on an
 * Operator+ plan, at most once a week each.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { db, usersTable, businessesTable, businessOperationsSettingsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

vi.mock("../lib/research-engine/index", () => ({ runResearchEngine: vi.fn(async () => ({ sessionId: 1, knowledgeAction: "created" })) }));
import { runResearchEngine } from "../lib/research-engine/index";
import { runScheduledResearch, researchStateKey, SCHEDULED_RESEARCH_INTERVAL_MS } from "../lib/research-engine/scheduled";

let operator: number;
let free: number;
let biz: Record<string, number> = {};

beforeAll(async () => {
  const stamp = Date.now();
  const [o, f] = await db
    .insert(usersTable)
    .values([
      { email: `sr_op_${stamp}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "operator" },
      { email: `sr_free_${stamp}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "free" },
    ])
    .returning({ id: usersTable.id });
  operator = o.id;
  free = f.id;
  const rows = await db
    .insert(businessesTable)
    .values([
      { ownerId: operator, name: "Ops On", businessType: "ecommerce", status: "active" },
      { ownerId: operator, name: "Ops Off", businessType: "agency", status: "active" },
      { ownerId: free, name: "Free Plan", businessType: "agency", status: "active" },
    ])
    .returning({ id: businessesTable.id, name: businessesTable.name });
  biz = Object.fromEntries(rows.map((r) => [r.name, r.id]));
  await db.insert(businessOperationsSettingsTable).values([
    { businessId: biz["Ops On"]!, enabled: true },
    { businessId: biz["Ops Off"]!, enabled: false },
    { businessId: biz["Free Plan"]!, enabled: true },
  ]);
});
afterAll(async () => {
  await db.delete(businessesTable).where(inArray(businessesTable.id, Object.values(biz)));
  await db.delete(usersTable).where(inArray(usersTable.id, [operator, free]));
});

describe("runScheduledResearch", () => {
  it("researches eligible businesses once per week", async () => {
    const state = new Map<string, number>();
    const opts = { lastRun: (k: string) => state.get(k) ?? 0, markRun: async (k: string, ts: number) => void state.set(k, ts) };
    const now = Date.now();

    await runScheduledResearch({ now, ...opts });
    const calls = vi.mocked(runResearchEngine).mock.calls.map((c) => c[0]);
    const mine = calls.filter((c) => c.userId === operator || c.userId === free);
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ userId: operator, researchType: "market", projectId: null, forceFresh: true, businessId: biz["Ops On"] });
    expect(mine[0]!.objective).toContain("Ops On (ecommerce)");
    expect(state.get(researchStateKey(biz["Ops On"]!))).toBe(now);

    vi.mocked(runResearchEngine).mockClear();
    await runScheduledResearch({ now: now + 60_000, ...opts });
    expect(vi.mocked(runResearchEngine).mock.calls.filter((c) => c[0].userId === operator)).toHaveLength(0);

    await runScheduledResearch({ now: now + SCHEDULED_RESEARCH_INTERVAL_MS, ...opts });
    expect(vi.mocked(runResearchEngine).mock.calls.filter((c) => c[0].userId === operator)).toHaveLength(1);
  });

  it("a failed run is retried on the next tick, not next week", async () => {
    const state = new Map<string, number>();
    const opts = { lastRun: (k: string) => state.get(k) ?? 0, markRun: async (k: string, ts: number) => void state.set(k, ts) };
    vi.mocked(runResearchEngine).mockClear();
    vi.mocked(runResearchEngine).mockResolvedValueOnce({ sessionId: 2, knowledgeAction: "failed" } as never);
    const now = Date.now();
    const r = await runScheduledResearch({ now, ...opts });
    expect(r.failed).toBeGreaterThanOrEqual(1);
    expect(state.get(researchStateKey(biz["Ops On"]!))).toBe(0);
    await runScheduledResearch({ now: now + 60_000, ...opts });
    expect(vi.mocked(runResearchEngine).mock.calls.filter((c) => c[0].userId === operator)).toHaveLength(2);
  });
});
