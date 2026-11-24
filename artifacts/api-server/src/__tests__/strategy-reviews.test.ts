/** Strategy reviews: measured results vs target, proposed steps, owner apply/dismiss, auto-apply on Operator, isolation. */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

const { reply } = vi.hoisted(() => ({ reply: vi.fn() }));
vi.mock("../lib/openrouter", () => ({ complete: (opts: unknown) => reply(opts), streamCompletion: vi.fn() }));

import app from "../app";
import { db, usersTable, businessesTable, ashMissionsTable, incomePlansTable, ashControlSettingsTable, strategyReviewsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { runDueStrategyReviews, applyHeldReviews } from "../lib/strategy-reviews";
import { isExpensiveAiRequest } from "../middlewares/security";

let ownerId: number;
let otherId: number;
let missionId: number;
const as = (id: number) => ({ Authorization: `Bearer ${jwt.sign({ sub: id, email: "", role: "USER", tokenVersion: 1 }, process.env["SESSION_SECRET"]!)}` });
const llm = (obj: unknown) => ({ content: JSON.stringify(obj), model: "test", promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: null });

async function incomeMission(userId: number, status: string, createdAt = new Date()) {
  const [b] = await db.insert(businessesTable).values({ ownerId: userId, name: "Review Co", businessType: "other", origin: "imported" }).returning();
  const [p] = await db.insert(incomePlansTable).values({
    userId, status: "approved", goal: "Make $5,000 a month", businessId: b!.id,
    objective: { targetMonthlyRevenueCents: 500_000, budgetCents: null, timelineMonths: 6, constraints: [] },
    plan: { businessName: "Review Co", typeKey: "other", newType: null, market: "m", strategy: "s", timeline: "t", risks: [], permissions: [], milestones: [], startupCostCents: 0, monthlyCostCents: 0 },
  }).returning();
  const [m] = await db.insert(ashMissionsTable).values({
    userId, businessId: b!.id, planId: p!.id, goal: "Make $5,000 a month", status, createdAt,
    steps: [{ title: "Build the offer page", status: "done" }], ...(status === "completed" ? { completedAt: new Date() } : {}),
  }).returning();
  return m!.id;
}

beforeAll(async () => {
  const stamp = Date.now();
  const [o, x] = await db.insert(usersTable).values([
    { email: `sr_owner_${stamp}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "starter" },
    { email: `sr_other_${stamp}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "starter" },
  ]).returning({ id: usersTable.id });
  ownerId = o!.id; otherId = x!.id;
  missionId = await incomeMission(ownerId, "completed");
}, 120_000);
afterAll(async () => { await db.delete(usersTable).where(inArray(usersTable.id, [ownerId, otherId])); });

describe("strategy reviews", () => {
  it("reports no_data without tracked revenue, skips pending duplicates, and applying reopens a finished mission", async () => {
    reply.mockResolvedValueOnce(llm({ verdict: "on_track", summary: "Too early to tell.", adjustments: ["Connect Stripe to measure revenue", "Build the offer page", "Launch a pricing page"] }));
    const r = await request(app).post(`/api/missions/${missionId}/strategy-reviews`).set(as(ownerId));
    expect(r.status).toBe(201);
    expect(r.body.autoApplied).toBe(false);
    expect(r.body.review).toMatchObject({ verdict: "no_data", status: "proposed" });
    expect(r.body.review.adjustments).toEqual(["Connect Stripe to measure revenue", "Build the offer page", "Launch a pricing page"]);
    expect(r.body.review.metrics).toMatchObject({ revenueTracked: false, targetMonthlyRevenueCents: 500_000, milestonesDone: 1 });

    expect((await request(app).post(`/api/strategy-reviews/${r.body.review.id}/apply`).set(as(otherId))).status).toBe(404);
    expect((await request(app).get(`/api/missions/${missionId}/strategy-reviews`).set(as(otherId))).body).toEqual([]);
    expect((await request(app).post(`/api/missions/${missionId}/strategy-reviews`).set(as(otherId))).status).toBe(404);

    const applied = await request(app).post(`/api/strategy-reviews/${r.body.review.id}/apply`).set(as(ownerId));
    expect(applied.body.status).toBe("applied");
    const [m] = await db.select().from(ashMissionsTable).where(eq(ashMissionsTable.id, missionId));
    expect(m!.status).toBe("running");
    expect(m!.completedAt).toBeNull();
    expect(m!.steps.filter((s) => s.status === "pending").map((s) => s.title)).toEqual(["Connect Stripe to measure revenue", "Build the offer page", "Launch a pricing page"]);
    expect((await request(app).post(`/api/strategy-reviews/${r.body.review.id}/dismiss`).set(as(ownerId))).status).toBe(409);
  });

  it("drops steps already pending and auto-applies on Operator", async () => {
    await db.insert(ashControlSettingsTable).values({ userId: ownerId, level: "operator" });
    reply.mockResolvedValueOnce(llm({ verdict: "behind", summary: "Behind.", adjustments: ["Launch a pricing page", "Email past leads"] }));
    const r = await request(app).post(`/api/missions/${missionId}/strategy-reviews`).set(as(ownerId));
    expect(r.body).toMatchObject({ autoApplied: true, review: { status: "applied", adjustments: ["Email past leads"] } });

    await db.update(ashMissionsTable).set({ leaseUntil: new Date(Date.now() + 600_000) }).where(eq(ashMissionsTable.id, missionId));
    reply.mockResolvedValueOnce(llm({ verdict: "behind", summary: "Behind.", adjustments: ["Change the welcome email"] }));
    const older = await request(app).post(`/api/missions/${missionId}/strategy-reviews`).set(as(ownerId));
    expect(older.body.review.status).toBe("queued");
    reply.mockResolvedValueOnce(llm({ verdict: "behind", summary: "Behind.", adjustments: ["Post a launch thread"] }));
    const busy = await request(app).post(`/api/missions/${missionId}/strategy-reviews`).set(as(ownerId));
    expect(busy.body).toMatchObject({ autoApplied: false, review: { status: "queued" } });
    await applyHeldReviews();
    expect((await db.select().from(strategyReviewsTable).where(eq(strategyReviewsTable.id, busy.body.review.id)))[0]!.status).toBe("queued");
    await db.update(ashMissionsTable).set({ leaseUntil: null }).where(eq(ashMissionsTable.id, missionId));
    await applyHeldReviews();
    expect((await db.select().from(strategyReviewsTable).where(eq(strategyReviewsTable.id, busy.body.review.id)))[0]!.status).toBe("applied");
    expect((await db.select().from(strategyReviewsTable).where(eq(strategyReviewsTable.id, older.body.review.id)))[0]!.status).toBe("superseded");
    const [mission] = await db.select().from(ashMissionsTable).where(eq(ashMissionsTable.id, missionId));
    expect(mission!.steps.map((s) => s.title)).not.toContain("Change the welcome email");

    await db.update(ashControlSettingsTable).set({ approvalRequired: ["build"] }).where(eq(ashControlSettingsTable.userId, ownerId));
    reply.mockResolvedValueOnce(llm({ verdict: "behind", summary: "Behind.", adjustments: ["Run a referral offer"] }));
    const held = await request(app).post(`/api/missions/${missionId}/strategy-reviews`).set(as(ownerId));
    expect(held.body).toMatchObject({ autoApplied: false, review: { status: "proposed" } });
    await db.update(ashMissionsTable).set({ leaseUntil: new Date(Date.now() + 600_000) }).where(eq(ashMissionsTable.id, missionId));
    expect((await request(app).post(`/api/strategy-reviews/${held.body.review.id}/apply`).set(as(ownerId))).status).toBe(409);
    await db.update(ashMissionsTable).set({ leaseUntil: null }).where(eq(ashMissionsTable.id, missionId));
    await db.update(ashControlSettingsTable).set({ approvalRequired: [] }).where(eq(ashControlSettingsTable.userId, ownerId));
    await applyHeldReviews();
    expect((await db.select().from(strategyReviewsTable).where(eq(strategyReviewsTable.id, held.body.review.id)))[0]!.status).toBe("proposed");
    await request(app).post(`/api/strategy-reviews/${held.body.review.id}/dismiss`).set(as(ownerId));
  });

  it("records only the steps that fit under the mission's step cap", async () => {
    const full = await incomeMission(ownerId, "running");
    await db.update(ashMissionsTable).set({ steps: Array.from({ length: 39 }, (_, i) => ({ title: `Step ${i}`, status: "done" as const })) }).where(eq(ashMissionsTable.id, full));
    await db.update(ashControlSettingsTable).set({ level: "copilot" }).where(eq(ashControlSettingsTable.userId, ownerId));
    reply.mockResolvedValueOnce(llm({ verdict: "behind", summary: "Behind.", adjustments: ["One", "Two"] }));
    const r = await request(app).post(`/api/missions/${full}/strategy-reviews`).set(as(ownerId));
    const applied = await request(app).post(`/api/strategy-reviews/${r.body.review.id}/apply`).set(as(ownerId));
    expect(applied.body).toMatchObject({ status: "applied", adjustments: ["One"] });
  });

  it("rejects unusable replies and non-income missions", async () => {
    for (const id of ["12", "%2012", "1e1", "0x0c"]) expect(isExpensiveAiRequest("POST", `/missions/${id}/strategy-reviews`)).toBe(true);
    reply.mockResolvedValueOnce(llm({ nope: true }));
    expect((await request(app).post(`/api/missions/${missionId}/strategy-reviews`).set(as(ownerId))).status).toBe(502);
    const [plain] = await db.insert(ashMissionsTable).values({ userId: ownerId, goal: "Plain", status: "running" }).returning();
    expect((await request(app).post(`/api/missions/${plain!.id}/strategy-reviews`).set(as(ownerId))).status).toBe(400);
  });

  it("does not save a stale review after the business is deleted", async () => {
    const deleted = await incomeMission(otherId, "running");
    const [mission] = await db.select().from(ashMissionsTable).where(eq(ashMissionsTable.id, deleted));
    reply.mockImplementationOnce(async () => {
      await db.delete(businessesTable).where(eq(businessesTable.id, mission!.businessId!));
      return llm({ verdict: "no_data", summary: "Connect payments.", adjustments: [] });
    });
    const result = await request(app).post(`/api/missions/${deleted}/strategy-reviews`).set(as(otherId));
    expect(result.status).toBe(409);
    expect(await db.select().from(strategyReviewsTable).where(eq(strategyReviewsTable.missionId, deleted))).toHaveLength(0);
  });

  it("the scheduler reviews week-old income missions once", async () => {
    const old = await incomeMission(otherId, "running", new Date(Date.now() - 8 * 86_400_000));
    reply.mockResolvedValue(llm({ verdict: "no_data", summary: "Connect payments.", adjustments: [] }));
    await runDueStrategyReviews(500);
    await runDueStrategyReviews(500);
    const rows = await db.select().from(strategyReviewsTable).where(eq(strategyReviewsTable.missionId, old));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ userId: otherId, status: "proposed" });
  });
});
