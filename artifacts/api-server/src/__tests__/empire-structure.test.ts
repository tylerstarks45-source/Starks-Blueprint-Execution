/**
 * Empire structure: business types, income streams, asset vault, sharing,
 * overview and search are scoped to the signed-in owner, and projected revenue
 * is never reported as verified.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

vi.mock("../lib/openrouter", () => ({ complete: vi.fn(), streamCompletion: vi.fn() }));

import app from "../app";
import { db, usersTable, businessesTable, systemInstancesTable, systemActivityEventsTable, landingPagesTable } from "@workspace/db";
import { inArray } from "drizzle-orm";
import { getTool } from "../lib/ash-agent/tools";

let ownerId: number;
let otherId: number;
const token = (id: number) => jwt.sign({ sub: id, email: "", role: "USER", tokenVersion: 1 }, process.env["SESSION_SECRET"]!);
const as = (id: number) => ({ Authorization: `Bearer ${token(id)}` });

beforeAll(async () => {
  const stamp = Date.now();
  const [owner, other] = await db.insert(usersTable).values([
    { email: `empire_owner_${stamp}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "starter" },
    { email: `empire_other_${stamp}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "starter" },
  ]).returning({ id: usersTable.id });
  ownerId = owner.id;
  otherId = other.id;
}, 120_000);

afterAll(async () => {
  await db.delete(businessesTable).where(inArray(businessesTable.ownerId, [ownerId, otherId]));
  await db.delete(usersTable).where(inArray(usersTable.id, [ownerId, otherId]));
});

describe("empire structure", () => {
  let bizA: number;
  let bizB: number;

  it("lists built-in types and keeps custom types per owner", async () => {
    const list = await request(app).get("/api/empire/business-types").set(as(ownerId));
    expect(list.status).toBe(200);
    expect(list.body.types.some((t: { key: string; builtin: boolean }) => t.key === "saas" && t.builtin)).toBe(true);

    const created = await request(app).post("/api/empire/business-types").set(as(ownerId))
      .send({ name: "Vending Routes", streamTypes: ["physical_products"] });
    expect(created.status).toBe(201);
    expect(created.body.key).toBe("vending_routes");
    expect((await request(app).post("/api/empire/business-types").set(as(ownerId)).send({ name: "Vending Routes" })).status).toBe(409);
    expect((await request(app).post("/api/empire/business-types").set(as(ownerId)).send({ name: "SaaS" })).status).toBe(409);

    const otherList = await request(app).get("/api/empire/business-types").set(as(otherId));
    expect(otherList.body.types.some((t: { key: string }) => t.key === "vending_routes")).toBe(false);
  });

  it("creates businesses with a registry type and default projected streams", async () => {
    const a = await request(app).post("/api/empire/businesses").set(as(ownerId))
      .send({ name: "Alpha SaaS", typeKey: "saas", createDefaultStreams: true });
    expect(a.status).toBe(201);
    expect(a.body.business.typeKey).toBe("saas");
    expect(a.body.streams.length).toBeGreaterThan(0);
    expect(a.body.streams.every((s: { status: string }) => s.status === "projected")).toBe(true);
    bizA = a.body.business.id;

    const b = await request(app).post("/api/empire/businesses").set(as(ownerId)).send({ name: "Beta Vending", typeKey: "vending_routes" });
    expect(b.status).toBe(201);
    bizB = b.body.business.id;

    expect((await request(app).post("/api/empire/businesses").set(as(otherId)).send({ name: "X", typeKey: "vending_routes" })).status).toBe(400);
    expect((await request(app).delete("/api/empire/business-types/vending_routes").set(as(ownerId))).status).toBe(409);
  });

  it("scopes income streams to the owner's businesses", async () => {
    const s = await request(app).post("/api/empire/streams").set(as(ownerId))
      .send({ businessId: bizB, title: "Snack sales", streamType: "physical_products", estimatedMonthlyRevenue: 500 });
    expect(s.status).toBe(201);
    expect((await request(app).post("/api/empire/streams").set(as(otherId))
      .send({ businessId: bizB, title: "Hijack", streamType: "services" })).status).toBe(404);
    expect((await request(app).patch(`/api/empire/streams/${s.body.id}`).set(as(otherId)).send({ title: "x" })).status).toBe(404);
    expect((await request(app).delete(`/api/empire/streams/${s.body.id}`).set(as(otherId))).status).toBe(404);
    const otherStreams = await request(app).get("/api/empire/streams").set(as(otherId));
    expect(otherStreams.body).toEqual([]);
    const bStreams = await request(app).get(`/api/empire/streams?businessId=${bizB}`).set(as(ownerId));
    expect(bStreams.body.map((r: { title: string }) => r.title)).toEqual(["Snack sales"]);
  });

  it("vaults assets, backfills existing builders and shares only with explicit owner action", async () => {
    await db.insert(landingPagesTable).values({ userId: ownerId, title: "Alpha launch page", slug: `alpha-${Date.now()}`, isPublished: true });
    const created = await request(app).post("/api/empire/assets").set(as(ownerId))
      .send({ name: "Alpha logo", classKey: "brand_asset", businessId: bizA });
    expect(created.status).toBe(201);
    const assetId = created.body.id;

    expect((await request(app).post("/api/empire/assets").set(as(otherId)).send({ name: "x", classKey: "other", businessId: bizA })).status).toBe(404);

    const all = await request(app).get("/api/empire/assets").set(as(ownerId));
    expect(all.body.some((a: { builderSource: string; name: string }) => a.builderSource === "landing_pages" && a.name === "Alpha launch page")).toBe(true);
    expect((await request(app).get("/api/empire/assets").set(as(otherId))).body).toEqual([]);

    let inB = await request(app).get(`/api/empire/assets?businessId=${bizB}`).set(as(ownerId));
    expect(inB.body.some((a: { id: number }) => a.id === assetId)).toBe(false);

    expect((await request(app).post(`/api/empire/assets/${assetId}/shares`).set(as(otherId)).send({ businessId: bizB })).status).toBe(404);
    expect((await request(app).post(`/api/empire/assets/${assetId}/shares`).set(as(ownerId)).send({ businessId: bizA })).status).toBe(400);
    expect((await request(app).post(`/api/empire/assets/${assetId}/shares`).set(as(ownerId)).send({ businessId: bizB })).status).toBe(201);
    inB = await request(app).get(`/api/empire/assets?businessId=${bizB}`).set(as(ownerId));
    const shared = inB.body.find((a: { id: number }) => a.id === assetId);
    expect(shared?.sharedWith).toEqual([bizB]);

    expect((await request(app).delete(`/api/empire/assets/${assetId}/shares/${bizB}`).set(as(ownerId))).status).toBe(204);
    inB = await request(app).get(`/api/empire/assets?businessId=${bizB}`).set(as(ownerId));
    expect(inB.body.some((a: { id: number }) => a.id === assetId)).toBe(false);
  });

  it("reports verified revenue from the ledger only, and projections separately", async () => {
    const [inst] = await db.insert(systemInstancesTable).values({ userId: ownerId, name: "Alpha system" }).returning({ id: systemInstancesTable.id });
    await db.update(businessesTable).set({ systemInstanceId: inst.id }).where(inArray(businessesTable.id, [bizA]));
    await db.insert(systemActivityEventsTable).values({ systemInstanceId: inst.id, eventType: "revenue", description: "Stripe sale", amountCents: 4200 });

    const res = await request(app).get("/api/empire/overview").set(as(ownerId));
    expect(res.status).toBe(200);
    const a = res.body.businesses.find((b: { id: number }) => b.id === bizA);
    const b = res.body.businesses.find((x: { id: number }) => x.id === bizB);
    expect(a.verifiedRevenueCents).toEqual({ last30: 4200, lifetime: 4200 });
    expect(b.verifiedRevenueCents).toBeNull();
    expect(b.revenueTracked).toBe(false);
    expect(b.projectedMonthlyUsd).toBe(500);
    expect(res.body.totals.verifiedRevenueCents.lifetime).toBe(4200);
    expect(res.body.totals.projectedMonthlyUsd).toBeGreaterThanOrEqual(500);

    const other = await request(app).get("/api/empire/overview").set(as(otherId));
    expect(other.body.totals.businesses).toBe(0);
  });

  it("searches only the caller's empire", async () => {
    const mine = await request(app).get("/api/empire/search?q=alpha").set(as(ownerId));
    expect(mine.body.businesses.map((b: { id: number }) => b.id)).toContain(bizA);
    const theirs = await request(app).get("/api/empire/search?q=alpha").set(as(otherId));
    expect(theirs.body).toEqual({ businesses: [], streams: [], assets: [] });
  });

  it("ASH tools create businesses, streams and assets for the calling user only", async () => {
    const created = await getTool("create_business")!.run!(ownerId, { name: "Gamma Store", typeKey: "ecommerce" }) as { businessId: number };
    expect(created.businessId).toBeGreaterThan(0);
    const stream = await getTool("add_income_stream")!.run!(otherId, { businessId: created.businessId, title: "x", streamType: "services" });
    expect(stream).toEqual({ error: "Business not found" });
    const asset = await getTool("register_asset")!.run!(ownerId, { name: "Gamma storefront", classKey: "website", businessId: created.businessId }) as { assetId: number };
    expect(asset.assetId).toBeGreaterThan(0);
    expect(await getTool("register_asset")!.run!(otherId, { name: "x", classKey: "website", businessId: created.businessId })).toEqual({ error: "Business not found" });
    const overview = await getTool("get_empire_overview")!.run!(ownerId, {}) as { totals: { businesses: number } };
    expect(overview.totals.businesses).toBe(3);
  });

  it("rejects unauthenticated requests", async () => {
    expect((await request(app).get("/api/empire/overview")).status).toBe(401);
    expect((await request(app).post("/api/empire/businesses").send({ name: "x", typeKey: "saas" })).status).toBe(401);
  });
});
