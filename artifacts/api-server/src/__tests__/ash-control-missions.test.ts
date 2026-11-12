/**
 * ASH Control (autonomy levels, approvals for held-back actions, spend limits)
 * and missions (planning, background steps, owner pauses, approval resumes).
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

vi.mock("../lib/openrouter", () => ({ complete: vi.fn(), streamCompletion: vi.fn() }));

import app from "../app";
import { complete } from "../lib/openrouter";
import { db, usersTable, businessesTable, ashMissionsTable, ashSpendEventsTable, pendingApprovalsTable } from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import { decide } from "../lib/ash-control/policy";
import { runAshTurn } from "../lib/ash-agent";
import { claimDueMissions, runMissionOnce } from "../lib/ash-missions/runner";

const mockComplete = vi.mocked(complete);
let ownerId: number;
let otherId: number;
let bizId: number;
const token = (id: number) => jwt.sign({ sub: id, email: "", role: "USER", tokenVersion: 1 }, process.env["SESSION_SECRET"]!);
const as = (id: number) => ({ Authorization: `Bearer ${token(id)}` });
const toolCall = (name: string, args: Record<string, unknown>) => ({
  content: "", model: "test", toolCalls: [{ id: `c-${Math.random()}`, type: "function" as const, function: { name, arguments: JSON.stringify(args) } }],
});
const reply = (content: string) => ({ content, model: "test" });
const setLevel = (level: string, extra: Record<string, unknown> = {}) =>
  request(app).put("/api/ash-control").set(as(ownerId)).send({ level, approvalRequired: ["spend", "delete", "legal"], ...extra });
const ownerBusinesses = () => db.select().from(businessesTable).where(eq(businessesTable.ownerId, ownerId));

beforeAll(async () => {
  const stamp = Date.now();
  const [owner, other] = await db.insert(usersTable).values([
    { email: `ctl_owner_${stamp}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "starter" },
    { email: `ctl_other_${stamp}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "starter" },
  ]).returning({ id: usersTable.id });
  ownerId = owner!.id;
  otherId = other!.id;
  const b = await request(app).post("/api/empire/businesses").set(as(ownerId)).send({ name: "Control Co", typeKey: "saas" });
  bizId = b.body.business.id;
}, 120_000);

afterAll(async () => {
  await db.delete(businessesTable).where(inArray(businessesTable.ownerId, [ownerId, otherId]));
  await db.delete(usersTable).where(inArray(usersTable.id, [ownerId, otherId]));
});

beforeEach(() => mockComplete.mockReset());

describe("ASH Control settings", () => {
  it("defaults to co-pilot and keeps settings per owner", async () => {
    const def = await request(app).get("/api/ash-control").set(as(ownerId));
    expect(def.status).toBe(200);
    expect(def.body.isDefault).toBe(true);
    expect(def.body.account.level).toBe("copilot");

    expect((await setLevel("operator", { dailySpendLimitCents: 5000 })).status).toBe(200);
    expect((await setLevel("operator", { dailySpendLimitCents: 6000 })).body.dailySpendLimitCents).toBe(6000);
    expect((await request(app).put("/api/ash-control").set(as(ownerId)).send({ level: "god" })).status).toBe(400);

    const o = await request(app).put(`/api/ash-control/businesses/${bizId}`).set(as(ownerId)).send({ level: "advisor" });
    expect(o.status).toBe(200);
    expect((await request(app).put(`/api/ash-control/businesses/${bizId}`).set(as(otherId)).send({ level: "autopilot" })).status).toBe(404);

    const mine = await request(app).get("/api/ash-control").set(as(ownerId));
    expect(mine.body.account.level).toBe("operator");
    expect(mine.body.businesses.find((b: { businessId: number }) => b.businessId === bizId).override.level).toBe("advisor");
    const theirs = await request(app).get("/api/ash-control").set(as(otherId));
    expect(theirs.body.isDefault).toBe(true);
    expect(theirs.body.businesses).toHaveLength(0);

    expect((await request(app).delete(`/api/ash-control/businesses/${bizId}`).set(as(ownerId))).status).toBe(204);
  });

  it("decides allow / approve / block by level, action kind and spend limits", async () => {
    const d = (kind: Parameters<typeof decide>[0]["kind"], interactive = false, extra = {}) =>
      decide({ userId: ownerId, businessId: null, kind, interactive, ...extra }).then((r) => r.decision);

    await setLevel("advisor");
    expect(await d("read")).toBe("allow");
    expect(await d("build")).toBe("approve");
    expect(await d("build", true, { clientTool: true })).toBe("block");

    await setLevel("copilot");
    expect(await d("build")).toBe("allow");
    expect(await d("publish")).toBe("approve");
    expect(await d("publish", true)).toBe("allow");
    expect(await d("delete", true)).toBe("approve");
    expect(await d("spend", true)).toBe("approve");

    await setLevel("operator");
    expect(await d("publish")).toBe("allow");
    expect(await d("spend")).toBe("approve");

    await setLevel("autopilot", { approvalRequired: [], dailySpendLimitCents: 1000 });
    expect(await d("spend", false, { costCents: 500 })).toBe("allow");
    await db.insert(ashSpendEventsTable).values({ userId: ownerId, amountCents: 800, description: "test domain" });
    expect(await d("spend", false, { costCents: 500 })).toBe("approve");
    expect(await d("legal")).toBe("approve");
    await db.delete(ashSpendEventsTable).where(eq(ashSpendEventsTable.userId, ownerId));
  });
});

describe("ASH tool gating", () => {
  it("queues a held-back action for approval and runs it when the owner approves", async () => {
    await setLevel("advisor");
    mockComplete
      .mockResolvedValueOnce(toolCall("create_business", { name: "Queued Biz", typeKey: "saas" }))
      .mockResolvedValueOnce(reply("Queued for your approval."));
    const turn = await runAshTurn({ userId: ownerId, message: "start Queued Biz", history: [] });
    const step = turn.steps.find((s) => s.tool === "create_business")!;
    expect(step.approvalId).toBeTypeOf("number");
    expect((await ownerBusinesses()).some((b) => b.name === "Queued Biz")).toBe(false);

    expect((await request(app).post(`/api/approvals/${step.approvalId}/approve`).set(as(otherId))).status).toBe(404);
    const ok = await request(app).post(`/api/approvals/${step.approvalId}/approve`).set(as(ownerId));
    expect(ok.status).toBe(200);
    expect(ok.body.executedAt).not.toBeNull();
    expect((await ownerBusinesses()).some((b) => b.name === "Queued Biz")).toBe(true);
  });

  it("lets co-pilot build directly in chat", async () => {
    await setLevel("copilot");
    mockComplete
      .mockResolvedValueOnce(toolCall("create_business", { name: "Direct Biz", typeKey: "saas" }))
      .mockResolvedValueOnce(reply("Done."));
    const turn = await runAshTurn({ userId: ownerId, message: "start Direct Biz", history: [] });
    expect(turn.steps[0]).toMatchObject({ tool: "create_business", ok: true });
    expect(turn.steps[0]!.approvalId).toBeUndefined();
    expect((await ownerBusinesses()).some((b) => b.name === "Direct Biz")).toBe(true);
  });
});

describe("missions", () => {
  const runDue = async (id: number) => {
    await db.update(ashMissionsTable).set({ nextRunAt: new Date(0), leaseUntil: null }).where(eq(ashMissionsTable.id, id));
    const claimed = await claimDueMissions(50);
    const m = claimed.find((x) => x.id === id)!;
    expect(m).toBeDefined();
    await runMissionOnce(m);
    const [after] = await db.select().from(ashMissionsTable).where(eq(ashMissionsTable.id, id));
    return after!;
  };

  it("is scoped to the owner", async () => {
    const m = await request(app).post("/api/missions").set(as(ownerId)).send({ goal: "Grow Control Co", businessId: bizId });
    expect(m.status).toBe(201);
    expect((await request(app).get(`/api/missions/${m.body.id}`).set(as(otherId))).status).toBe(404);
    expect((await request(app).post(`/api/missions/${m.body.id}/cancel`).set(as(otherId))).status).toBe(404);
    expect((await request(app).post("/api/missions").set(as(otherId)).send({ goal: "Hijack", businessId: bizId })).status).toBe(404);
    expect((await request(app).get("/api/missions").set(as(otherId))).body).toHaveLength(0);
    expect((await request(app).post(`/api/missions/${m.body.id}/cancel`).set(as(ownerId))).body.status).toBe("cancelled");
  });

  it("plans, works step by step, waits for approval and finishes", async () => {
    await setLevel("copilot");
    const created = await request(app).post("/api/missions").set(as(ownerId)).send({ goal: "Add two income streams to Control Co", businessId: bizId });
    const id = created.body.id as number;

    mockComplete.mockResolvedValueOnce(reply('{"steps": ["Add a subscription stream", "Schedule a launch post"]}'));
    let m = await runDue(id);
    expect(m.status).toBe("running");
    expect(m.steps.map((s) => s.title)).toEqual(["Add a subscription stream", "Schedule a launch post"]);

    // A second claim while leased returns nothing.
    await db.update(ashMissionsTable).set({ nextRunAt: new Date(0), leaseUntil: null }).where(eq(ashMissionsTable.id, id));
    expect((await claimDueMissions(50)).some((x) => x.id === id)).toBe(true);
    expect((await claimDueMissions(50)).some((x) => x.id === id)).toBe(false);

    mockComplete
      .mockResolvedValueOnce(toolCall("add_income_stream", { businessId: bizId, title: "Pro plan", streamType: "subscriptions" }))
      .mockResolvedValueOnce(reply("Added the Pro plan stream (projected)."));
    m = await runDue(id);
    expect(m.steps[0]!.status).toBe("done");
    expect(m.status).toBe("running");

    // Background work at advisor level gets queued, and the mission waits.
    await setLevel("advisor");
    mockComplete
      .mockResolvedValueOnce(toolCall("register_asset", { name: "Launch post draft", classKey: "document", businessId: bizId }))
      .mockResolvedValueOnce(reply("Queued the draft for approval."));
    m = await runDue(id);
    expect(m.status).toBe("waiting_approval");
    expect(m.approvalId).toBeTypeOf("number");
    const [approval] = await db.select().from(pendingApprovalsTable).where(eq(pendingApprovalsTable.id, m.approvalId!));
    expect(approval!.category).toBe("ashAction");
    expect((approval!.payload as { missionId: number }).missionId).toBe(id);

    expect((await request(app).post(`/api/approvals/${m.approvalId}/reject`).set(as(ownerId))).status).toBe(200);
    [m] = await db.select().from(ashMissionsTable).where(eq(ashMissionsTable.id, id)) as [typeof m];
    expect(m.status).toBe("running");
    expect(m.log.some((e) => e.message.includes("rejected"))).toBe(true);

    await setLevel("copilot");
    mockComplete.mockResolvedValueOnce(reply("Wrote the launch post plan in the mission notes instead."));
    m = await runDue(id);
    expect(m.status).toBe("completed");
    expect(m.completedAt).not.toBeNull();
  });

  it("pauses for owner-only steps and resumes with the owner's note", async () => {
    const created = await request(app).post("/api/missions").set(as(ownerId)).send({ goal: "Open a Stripe account for Control Co", businessId: bizId });
    const id = created.body.id as number;
    mockComplete.mockResolvedValueOnce(reply('{"steps": ["Ask the owner to create the Stripe account"]}'));
    await runDue(id);
    mockComplete
      .mockResolvedValueOnce(toolCall("request_owner_action", { message: "Create a Stripe account and connect it on Connections." }))
      .mockResolvedValueOnce(reply("Waiting on the owner."));
    let m = await runDue(id);
    expect(m.status).toBe("waiting_owner");
    expect(m.waitingFor).toContain("Stripe");

    expect((await request(app).post(`/api/missions/${id}/pause`).set(as(ownerId))).body.status).toBe("paused");
    const resumed = await request(app).post(`/api/missions/${id}/resume`).set(as(ownerId)).send({ note: "Done, Stripe is connected" });
    expect(resumed.body.status).toBe("running");
    expect(resumed.body.log.some((e: { message: string }) => e.message.includes("Stripe is connected"))).toBe(true);
    expect((await request(app).post(`/api/missions/${id}/resume`).set(as(ownerId))).status).toBe(409);
  });

  it("does not let a paused mission be overwritten by an in-flight step", async () => {
    const created = await request(app).post("/api/missions").set(as(ownerId)).send({ goal: "Research pricing", businessId: bizId });
    const id = created.body.id as number;
    await db.update(ashMissionsTable).set({ nextRunAt: new Date(0) }).where(eq(ashMissionsTable.id, id));
    const [m] = (await claimDueMissions(50)).filter((x) => x.id === id);
    await request(app).post(`/api/missions/${id}/pause`).set(as(ownerId));
    mockComplete.mockResolvedValueOnce(reply('{"steps": ["Look up competitor pricing"]}'));
    await runMissionOnce(m!);
    const [after] = await db.select().from(ashMissionsTable).where(and(eq(ashMissionsTable.id, id)));
    expect(after!.status).toBe("paused");
    expect(after!.leaseUntil).toBeNull();
  });
});
