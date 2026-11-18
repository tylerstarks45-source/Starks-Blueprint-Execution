/** Venture Factory: setup on create, idempotent backfill, team pause, ledger expenses, isolation. */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app";
import { db, usersTable, businessWorkspaces, businessesTable } from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import { ensureVenture, isTeamMemberPaused } from "../lib/ventures";

let ownerId: number;
let otherId: number;
const as = (id: number) => ({ Authorization: `Bearer ${jwt.sign({ sub: id, email: "", role: "USER", tokenVersion: 1 }, process.env["SESSION_SECRET"]!)}` });

beforeAll(async () => {
  const stamp = Date.now();
  const [o, x] = await db.insert(usersTable).values([
    { email: `vf_owner_${stamp}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "starter" },
    { email: `vf_other_${stamp}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "starter" },
  ]).returning({ id: usersTable.id });
  ownerId = o!.id; otherId = x!.id;
}, 120_000);
afterAll(async () => { await db.delete(usersTable).where(inArray(usersTable.id, [ownerId, otherId])); });

describe("venture factory", () => {
  it("sets up workspace, memory, team and ledger for a new business, once", async () => {
    const c = await request(app).post("/api/empire/businesses").set(as(ownerId)).send({ name: "Venture Co", typeKey: "saas" });
    expect(c.status).toBe(201);
    const id = c.body.business.id;
    const v = (await request(app).get(`/api/empire/businesses/${id}/venture`).set(as(ownerId))).body;
    expect(v.setup).toEqual({ workspace: true, memory: true, team: true, ledger: true, mission: false });
    expect(v.team.map((t: { role: string }) => t.role)).toEqual(["strategy", "research", "marketing", "operations", "finance"]);
    expect(v.ledger).toMatchObject({ revenueTracked: false, verifiedRevenueLast30Cents: null, netLast30Cents: null, expensesLast30Cents: 0 });
    await Promise.all([ensureVenture(ownerId, id), ensureVenture(ownerId, id)]);
    const ws = await db.select().from(businessWorkspaces).where(and(eq(businessWorkspaces.userId, ownerId), eq(businessWorkspaces.businessId, id)));
    expect(ws).toHaveLength(1);
    expect((await request(app).get(`/api/empire/businesses/${id}/venture`).set(as(ownerId))).body.team).toHaveLength(5);
  });

  it("backfills older businesses lazily and seeds memory from an approved plan", async () => {
    const [b] = await db.insert(businessesTable).values({ ownerId, name: "Old Biz", businessType: "other", origin: "imported" }).returning();
    expect(await ensureVenture(otherId, b!.id)).toBe(false);
    await ensureVenture(ownerId, b!.id, { goal: "Make $5,000 per month", plan: {
      businessName: "Old Biz", typeKey: "newsletter", newType: null, market: "Indie founders", strategy: "Weekly newsletter with sponsorships",
      timeline: "", risks: [], permissions: [], milestones: [], startupCostCents: 0, monthlyCostCents: 0 } });
    const v = (await request(app).get(`/api/empire/businesses/${b!.id}/venture`).set(as(ownerId))).body;
    expect(v.memory).toMatchObject({ marketingStrategy: "Weekly newsletter with sponsorships", revenueGoals: "Make $5,000 per month" });
  });

  it("records expenses, pauses employees, and keeps other accounts out", async () => {
    const c = await request(app).post("/api/empire/businesses").set(as(ownerId)).send({ name: "Ledger Co", typeKey: "saas" });
    const id = c.body.business.id;
    expect((await request(app).post(`/api/empire/businesses/${id}/expenses`).set(as(ownerId)).send({ amountCents: -5, description: "x" })).status).toBe(400);
    const e = await request(app).post(`/api/empire/businesses/${id}/expenses`).set(as(ownerId)).send({ amountCents: 4900, category: "software", description: "Email tool" });
    expect(e.status).toBe(201);
    expect((await request(app).post(`/api/empire/businesses/${id}/expenses`).set(as(ownerId)).send({ amountCents: 100, description: "x", streamId: 999999999 })).status).toBe(400);
    const v = (await request(app).get(`/api/empire/businesses/${id}/venture`).set(as(ownerId))).body;
    expect(v.ledger.expensesLast30Cents).toBe(4900);
    expect(v.ledger.expenses[0]).toMatchObject({ description: "Email tool", category: "software" });

    expect((await request(app).post(`/api/empire/businesses/${id}/team/marketing`).set(as(ownerId)).send({ status: "paused" })).body.status).toBe("paused");
    expect(await isTeamMemberPaused(ownerId, id, "marketing")).toBe(true);

    expect((await request(app).get(`/api/empire/businesses/${id}/venture`).set(as(otherId))).status).toBe(404);
    expect((await request(app).post(`/api/empire/businesses/${id}/expenses`).set(as(otherId)).send({ amountCents: 1, description: "x" })).status).toBe(404);
    expect((await request(app).delete(`/api/empire/businesses/${id}/expenses/${e.body.id}`).set(as(otherId))).status).toBe(404);
    expect((await request(app).post(`/api/empire/businesses/${id}/team/marketing`).set(as(otherId)).send({ status: "active" })).status).toBe(404);
    expect((await request(app).delete(`/api/empire/businesses/${id}/expenses/${e.body.id}`).set(as(ownerId))).status).toBe(204);
  });
});
