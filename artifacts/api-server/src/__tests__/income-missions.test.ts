/**
 * Income missions: goal parsing, researched plan drafts, owner approval creating the
 * business + mission (including a business type not in the registry), and the dashboard.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

const { queued } = vi.hoisted(() => ({ queued: vi.fn() }));
vi.mock("../lib/openrouter", () => ({
  complete: (opts: { systemPrompt?: string }) => (String(opts?.systemPrompt ?? "").startsWith("You infer likely business facts")
    ? Promise.resolve({ content: "{}", model: "test", promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: null })
    : queued(opts)),
  streamCompletion: vi.fn(),
}));

import app from "../app";
import { db, usersTable, businessesTable, customBusinessTypesTable, ashMissionsTable, incomePlansTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { parseIncomeGoal } from "../lib/income-missions";

let ownerId: number;
let otherId: number;
const token = (id: number) => jwt.sign({ sub: id, email: "", role: "USER", tokenVersion: 1 }, process.env["SESSION_SECRET"]!);
const as = (id: number) => ({ Authorization: `Bearer ${token(id)}` });
const reply = (obj: unknown) => ({ content: "Here is the plan:\n" + JSON.stringify(obj), model: "test", promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: null });
const opt = (name: string, typeKey: string, score: number) => ({ name, typeKey, newType: false, summary: name, startupCostCents: 50000, monthlyCostCents: 10000, monthsToTarget: 6, score, why: "evidence" });
const planBody = (selectedTypeKey: string, newType: unknown = null) => ({
  options: [opt("Voice receptionist agency", selectedTypeKey, 82), opt("Template shop", "digital_products", 70), opt("Niche newsletter", "newsletter", 61)],
  selectedIndex: 0,
  plan: {
    businessName: "Ring Ready AI", newType, market: "Local clinics miss calls.", strategy: "Sell AI phone answering on monthly retainers.",
    timeline: "Month 1 build, month 2 first clients.", risks: ["Slow sales cycle"], permissions: ["Connect Stripe"],
    milestones: ["Research 50 target clinics", "Build the offer page", "Prepare outreach sequence"],
  },
});

beforeAll(async () => {
  const stamp = Date.now();
  const [owner, other] = await db.insert(usersTable).values([
    { email: `inc_owner_${stamp}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "starter" },
    { email: `inc_other_${stamp}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "starter" },
  ]).returning({ id: usersTable.id });
  ownerId = owner!.id;
  otherId = other!.id;
}, 120_000);

afterAll(async () => {
  await db.delete(businessesTable).where(inArray(businessesTable.ownerId, [ownerId, otherId]));
  await db.delete(usersTable).where(inArray(usersTable.id, [ownerId, otherId]));
});

beforeEach(() => queued.mockReset());

describe("parseIncomeGoal", () => {
  it("reads target, budget, timeline and constraints", () => {
    expect(parseIncomeGoal("ASH, I want to make $5,000 per month. I don't care what kind of business it is.")).toEqual({
      targetMonthlyRevenueCents: 500000, budgetCents: null, timelineMonths: null, constraints: ["Any legitimate business model"],
    });
    const o = parseIncomeGoal("Get me to $10k a month within 6 months, starting with $500, no inventory");
    expect(o).toMatchObject({ targetMonthlyRevenueCents: 1000000, budgetCents: 50000, timelineMonths: 6 });
    expect(o.constraints).toContain("No physical inventory");
    expect(parseIncomeGoal("build me something").targetMonthlyRevenueCents).toBeNull();
    expect(parseIncomeGoal("Make $3,000 a month, I can spend $500 a month").budgetCents).toBeNull();
    expect(parseIncomeGoal("Make $3,000 a month starting with $2k").budgetCents).toBe(200000);
  });
});

describe("Income plans", () => {
  it("drafts a plan for an unregistered business type and builds it only after approval", async () => {
    queued.mockResolvedValueOnce(reply(planBody("ai_voice_receptionist", { name: "AI voice receptionist", category: "services", description: "AI answers calls for local businesses", streamTypes: ["retainers", "bogus"] })));
    const d = await request(app).post("/api/income-plans").set(as(ownerId))
      .send({ goal: "ASH, I want to make $5,000 a month. Find a business opportunity, build it, and run it for me." });
    expect(d.status).toBe(201);
    expect(d.body.status).toBe("draft");
    expect(d.body.objective.targetMonthlyRevenueCents).toBe(500000);
    expect(d.body.options).toHaveLength(3);
    expect(d.body.options[0].newType).toBe(true);
    expect(d.body.plan.newType.streamTypes).toEqual(["retainers"]);
    expect((await db.select().from(businessesTable).where(eq(businessesTable.ownerId, ownerId)))).toHaveLength(0);

    expect((await request(app).get(`/api/income-plans/${d.body.id}`).set(as(otherId))).status).toBe(404);
    expect((await request(app).post(`/api/income-plans/${d.body.id}/approve`).set(as(otherId))).status).toBe(404);

    const [a1, a2] = await Promise.all([
      request(app).post(`/api/income-plans/${d.body.id}/approve`).set(as(ownerId)),
      request(app).post(`/api/income-plans/${d.body.id}/approve`).set(as(ownerId)),
    ]);
    expect([a1.status, a2.status].sort()).toEqual([200, 409]);
    const ok = a1.status === 200 ? a1 : a2;
    expect(ok.body.status).toBe("approved");

    const [type] = await db.select().from(customBusinessTypesTable).where(eq(customBusinessTypesTable.ownerId, ownerId));
    expect(type?.key).toBe("ai_voice_receptionist");
    const biz = await db.select().from(businessesTable).where(eq(businessesTable.ownerId, ownerId));
    expect(biz).toHaveLength(1);
    expect(biz[0]!.typeKey).toBe("ai_voice_receptionist");
    const [m] = await db.select().from(ashMissionsTable).where(eq(ashMissionsTable.id, ok.body.missionId));
    expect(m).toMatchObject({ status: "running", planId: d.body.id, businessId: biz[0]!.id });
    expect(m!.steps.map((s) => s.title)).toEqual(planBody("x").plan.milestones);

    const dash = await request(app).get(`/api/missions/${m!.id}/dashboard`).set(as(ownerId));
    expect(dash.status).toBe(200);
    expect(dash.body.revenue).toMatchObject({ verifiedLast30Cents: null, revenueTracked: false, netLast30Cents: null, progressPct: null, targetMonthlyRevenueCents: 500000 });
    expect(dash.body.milestones).toEqual({ done: 0, total: 3 });
    expect(dash.body.nextActions[0]).toBe("Research 50 target clinics");
    expect((await request(app).get(`/api/missions/${m!.id}/dashboard`).set(as(otherId))).status).toBe(404);
  });

  it("uses a registered type as is, and a rejected plan builds nothing", async () => {
    queued.mockResolvedValueOnce(reply(planBody("digital_products")));
    const d = await request(app).post("/api/income-plans").set(as(otherId)).send({ goal: "Make $2,000 a month with templates" });
    expect(d.status).toBe(201);
    expect(d.body.plan.newType).toBeNull();
    expect((await request(app).post(`/api/income-plans/${d.body.id}/reject`).set(as(otherId))).body.status).toBe("rejected");
    expect((await request(app).post(`/api/income-plans/${d.body.id}/approve`).set(as(otherId))).status).toBe(409);
    expect(await db.select().from(businessesTable).where(eq(businessesTable.ownerId, otherId))).toHaveLength(0);
  });

  it("retakes an approval cut off mid-way and reuses the business it already created", async () => {
    queued.mockResolvedValueOnce(reply(planBody("digital_products")));
    const d = await request(app).post("/api/income-plans").set(as(otherId)).send({ goal: "Make $1,500 a month selling templates" });
    const b = await request(app).post("/api/empire/businesses").set(as(otherId)).send({ name: "Half-built", typeKey: "digital_products" });
    await db.update(incomePlansTable).set({ status: "approving", decidedAt: new Date(Date.now() - 60_000), businessId: b.body.business.id }).where(eq(incomePlansTable.id, d.body.id));
    expect((await request(app).post(`/api/income-plans/${d.body.id}/approve`).set(as(otherId))).status).toBe(409);
    await db.update(incomePlansTable).set({ decidedAt: new Date(Date.now() - 11 * 60_000) }).where(eq(incomePlansTable.id, d.body.id));
    const a = await request(app).post(`/api/income-plans/${d.body.id}/approve`).set(as(otherId));
    expect(a.status).toBe(200);
    expect(a.body).toMatchObject({ status: "approved", businessId: b.body.business.id });
    expect(await db.select().from(businessesTable).where(eq(businessesTable.ownerId, otherId))).toHaveLength(1);
  });

  it("returns an error instead of saving when the model reply isn't a usable plan", async () => {
    queued.mockResolvedValueOnce({ content: "I think you should start a blog!", model: "test", promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: null });
    const d = await request(app).post("/api/income-plans").set(as(ownerId)).send({ goal: "Make $1,000 a month" });
    expect(d.status).toBe(502);
    expect((await request(app).get("/api/income-plans").set(as(ownerId))).body).toHaveLength(1);
  });
});
