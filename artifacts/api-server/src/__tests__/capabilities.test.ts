/**
 * Capability registry: live status per owner, plan checks, requests opened on approval,
 * auto-resolution once a service is connected, and owner isolation.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
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
import { db, usersTable, businessesTable, userCredentialsTable } from "@workspace/db";
import { inArray } from "drizzle-orm";
import { capabilitiesForPlan } from "../lib/capabilities";

let ownerId: number;
let otherId: number;
const as = (id: number) => ({ Authorization: `Bearer ${jwt.sign({ sub: id, email: "", role: "USER", tokenVersion: 1 }, process.env["SESSION_SECRET"]!)}` });
const opt = (name: string, typeKey: string, score: number) => ({ name, typeKey, newType: false, summary: name, startupCostCents: 50000, monthlyCostCents: 10000, monthsToTarget: 6, score, why: "evidence" });
const planReply = {
  options: [opt("Template shop", "digital_products", 80), opt("Newsletter", "newsletter", 60)],
  selectedIndex: 0,
  plan: {
    businessName: "Template Co", newType: null, market: "Creators", strategy: "Sell templates.", timeline: "3 months",
    risks: [], permissions: ["Connect Stripe"], milestones: ["Research niches", "Build templates", "Prepare launch"],
    capabilities: ["payments", "email_marketing", "Podcast hosting"],
  },
};

beforeAll(async () => {
  const stamp = Date.now();
  const [owner, other] = await db.insert(usersTable).values([
    { email: `cap_owner_${stamp}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "starter" },
    { email: `cap_other_${stamp}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "starter" },
  ]).returning({ id: usersTable.id });
  ownerId = owner!.id;
  otherId = other!.id;
}, 120_000);

afterAll(async () => {
  await db.delete(businessesTable).where(inArray(businessesTable.ownerId, [ownerId, otherId]));
  await db.delete(usersTable).where(inArray(usersTable.id, [ownerId, otherId]));
});

describe("capabilitiesForPlan", () => {
  it("adds the base capabilities and ones implied by the plan's words", () => {
    expect(capabilitiesForPlan({ permissions: ["Stripe account", "Domain purchase"], milestones: ["Launch the Shopify store"], capabilities: ["Podcast hosting"] }))
      .toEqual(expect.arrayContaining(["research", "business_workspace", "podcast_hosting", "payments", "domain_dns", "online_store"]));
  });
});

describe("capability registry", () => {
  it("reports each capability's status for the owner", async () => {
    const r = await request(app).get("/api/capabilities").set(as(ownerId));
    expect(r.status).toBe(200);
    const by = Object.fromEntries(r.body.capabilities.map((c: { key: string }) => [c.key, c]));
    expect(by.research.status).toBe("ready");
    expect(by.payments.status).toBe("connect");
    expect(by.payments.providers.map((p: { id: string }) => p.id)).toContain("stripe");
    expect(by.advertising.status).toBe("manual");
    expect(r.body.requests).toEqual([]);
    expect((await request(app).get("/api/capabilities")).status).toBe(401);
  });

  it("checks a plan, opens requests on approval, shows them as blockers and resolves them once connected", async () => {
    queued.mockResolvedValueOnce({ content: JSON.stringify(planReply), model: "test", promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: null });
    const d = await request(app).post("/api/income-plans").set(as(ownerId)).send({ goal: "Make $2,000 a month selling templates" });
    expect(d.status).toBe(201);
    const check = Object.fromEntries(d.body.capabilityCheck.map((c: { key: string; status: string }) => [c.key, c.status]));
    expect(check).toMatchObject({ research: "ready", payments: "connect", email_marketing: "connect", podcast_hosting: "missing" });
    expect((await request(app).get("/api/capabilities").set(as(ownerId))).body.requests).toHaveLength(0);

    const a = await request(app).post(`/api/income-plans/${d.body.id}/approve`).set(as(ownerId));
    expect(a.status).toBe(200);
    let caps = await request(app).get("/api/capabilities").set(as(ownerId));
    expect(caps.body.requests.map((r: { capability: string }) => r.capability).sort()).toEqual(["email_marketing", "payments", "podcast_hosting"]);
    expect(caps.body.requests.every((r: { missionId: number }) => r.missionId === a.body.missionId)).toBe(true);
    const dash = await request(app).get(`/api/missions/${a.body.missionId}/dashboard`).set(as(ownerId));
    expect(dash.body.blockers).toEqual(expect.arrayContaining(["Connect: Take payments", "ASH can't do yet: podcast hosting"]));

    // Requesting it again doesn't duplicate; the other account sees none and can't dismiss.
    expect((await request(app).post("/api/capability-requests").set(as(ownerId)).send({ capability: "payments" })).body.created).toEqual([]);
    expect((await request(app).get("/api/capabilities").set(as(otherId))).body.requests).toEqual([]);
    const podcast = caps.body.requests.find((r: { capability: string }) => r.capability === "podcast_hosting");
    expect((await request(app).post(`/api/capability-requests/${podcast.id}/dismiss`).set(as(otherId))).status).toBe(404);
    expect((await request(app).post(`/api/capability-requests/${podcast.id}/dismiss`).set(as(ownerId))).body.status).toBe("dismissed");

    await db.insert(userCredentialsTable).values({ userId: ownerId, credentialKey: "STRIPE_SECRET_KEY", encryptedValue: "x", status: "connected" });
    caps = await request(app).get("/api/capabilities").set(as(ownerId));
    expect(caps.body.capabilities.find((c: { key: string }) => c.key === "payments").status).toBe("ready");
    expect(caps.body.requests.map((r: { capability: string }) => r.capability)).toEqual(["email_marketing"]);
  });
});
