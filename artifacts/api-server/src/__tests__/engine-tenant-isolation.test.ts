/**
 * Build 015-024 engines: a signed-in user must not be able to read another
 * user's business-scoped engine data. Cross-owner requests get 404; the owner
 * is never blocked by the guard.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

vi.mock("../lib/openrouter", () => ({ complete: vi.fn(), streamCompletion: vi.fn() }));

import app from "../app";
import { db, usersTable, businessesTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

let ownerId: number;
let otherId: number;
let ownerToken: string;
let otherToken: string;
let businessId: number;

const token = (id: number) => jwt.sign({ sub: id, email: "", role: "USER", tokenVersion: 1 }, process.env["SESSION_SECRET"]!);

beforeAll(async () => {
  const stamp = Date.now();
  const [owner, other] = await db
    .insert(usersTable)
    .values([
      { email: `tenant_owner_${stamp}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "starter" },
      { email: `tenant_other_${stamp}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "starter" },
    ])
    .returning({ id: usersTable.id });
  ownerId = owner.id;
  otherId = other.id;
  ownerToken = token(ownerId);
  otherToken = token(otherId);
  const [biz] = await db.insert(businessesTable).values({ ownerId, name: "Tenant Co", businessType: "saas" }).returning({ id: businessesTable.id });
  businessId = biz.id;
});

afterAll(async () => {
  await db.delete(businessesTable).where(eq(businessesTable.id, businessId));
  await db.delete(usersTable).where(inArray(usersTable.id, [ownerId, otherId]));
});

const businessScoped = () => [
  `/api/business-analysis/businesses/${businessId}/reports`,
  `/api/business-analysis/businesses/${businessId}/registry`,
  `/api/opportunity-discovery/businesses/${businessId}/opportunities`,
  `/api/opportunity-discovery/businesses/${businessId}/reports`,
  `/api/future-simulation/businesses/${businessId}/scenarios`,
  `/api/future-simulation/businesses/${businessId}/reports`,
  `/api/decision-intelligence/reports/${businessId}`,
  `/api/decision-intelligence/decisions/${businessId}`,
  `/api/executive-strategy/pillars/${businessId}`,
  `/api/executive-strategy/reports/${businessId}`,
  `/api/strategic-planning/programs/${businessId}`,
  `/api/strategic-planning/reports/${businessId}`,
  `/api/capability-planning/domains/${businessId}`,
  `/api/capability-planning/gaps/${businessId}`,
  `/api/operational-planning/businesses/${businessId}/reports`,
  `/api/execution-orchestration/businesses/${businessId}/reports`,
];

describe("engine tenant isolation", () => {
  it("returns 404 to a different user on business-scoped engine routes", async () => {
    const leaked: string[] = [];
    for (const url of businessScoped()) {
      const res = await request(app).get(url).set("Authorization", `Bearer ${otherToken}`);
      if (res.status !== 404) leaked.push(`${url} -> ${res.status}`);
    }
    expect(leaked).toEqual([]);
  });

  it("lets the owner through the guard", async () => {
    const blocked: string[] = [];
    for (const url of businessScoped()) {
      const res = await request(app).get(url).set("Authorization", `Bearer ${ownerToken}`);
      if (res.status === 401 || res.status === 403 || (res.status === 404 && res.body?.error === "Not found")) blocked.push(`${url} -> ${res.status}`);
    }
    expect(blocked).toEqual([]);
  });

  it("returns 404 for child records the caller does not own", async () => {
    for (const url of [
      "/api/business-analysis/reports/missing/findings",
      "/api/opportunity-discovery/opportunities/missing/evidence",
      "/api/future-simulation/scenarios/missing",
      `/api/decision-intelligence/decisions/${businessId}/missing/rationales`,
      `/api/executive-strategy/pillars/${businessId}/missing/objectives`,
      `/api/strategic-planning/programs/${businessId}/missing/initiatives`,
      `/api/strategic-planning/initiatives/${businessId}/missing/milestones`,
      `/api/capability-planning/domains/${businessId}/missing/requirements`,
      "/api/operational-planning/reports/missing",
      "/api/operational-planning/plans/missing/phases",
      "/api/execution-orchestration/reports/missing",
      "/api/execution-orchestration/plans/missing/assignments",
    ]) {
      const res = await request(app).get(url).set("Authorization", `Bearer ${ownerToken}`);
      expect(res.status, url).toBe(404);
    }
  });

  it("rejects non-canonical ids that parse differently in the guard and the handler", async () => {
    const [mine] = await db.insert(businessesTable).values({ ownerId: otherId, name: "Other Co", businessType: "saas" }).returning({ id: businessesTable.id });
    try {
      for (const id of [`${businessId}.0`, `0x${businessId.toString(16)}`, ` ${businessId}`, `${businessId}abc`]) {
        const res = await request(app).get(`/api/business-analysis/businesses/${encodeURIComponent(id)}/reports`).set("Authorization", `Bearer ${otherToken}`);
        expect(res.status, id).toBe(404);
      }
    } finally {
      await db.delete(businessesTable).where(eq(businessesTable.id, mine.id));
    }
  });

  it("only serves a user's own planning summaries", async () => {
    for (const engine of ["strategic-planning", "capability-planning"]) {
      const res = await request(app).get(`/api/${engine}/summary/${ownerId}`).set("Authorization", `Bearer ${otherToken}`);
      expect(res.status, engine).toBe(404);
      expect(res.body.error).toBe("Not found");
    }
  });
});
