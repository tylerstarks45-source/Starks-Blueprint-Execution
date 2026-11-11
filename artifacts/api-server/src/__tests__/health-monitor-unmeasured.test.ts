import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import { db, usersTable, businessesTable, businessConnectionsTable, systemInstancesTable } from "@workspace/db";
import app from "../app";
import {
  buildIssues,
  computeBusinessHealth,
  computeSystemHealth,
  overall,
  statusToLevel,
  type ScoreSet,
} from "../lib/health-monitor";

const UNMEASURED: ScoreSet = {
  connectionScore: null,
  hostingScore: null,
  apiScore: null,
  seoScore: null,
  performanceScore: null,
  securityScore: null,
  revenueScore: null,
  automationScore: null,
};

describe("health scoring helpers", () => {
  it("averages only measured dimensions and reports unknown when none are measured", () => {
    expect(overall(UNMEASURED)).toBeNull();
    expect(statusToLevel(null)).toBe("unknown");
    expect(overall({ ...UNMEASURED, connectionScore: 100, securityScore: 40 })).toBe(70);
    expect(statusToLevel(40)).toBe("critical");
    expect(statusToLevel(74)).toBe("degraded");
    expect(statusToLevel(75)).toBe("healthy");
  });

  it("never raises issues for unmeasured dimensions", () => {
    expect(buildIssues(UNMEASURED)).toEqual([]);
    const issues = buildIssues({ ...UNMEASURED, apiScore: 30 });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ dimension: "api", severity: "high" });
  });
});

describe("monitoring health for entities with no data", () => {
  const EMAIL = `health_unmeasured_${Date.now()}@test.internal`;
  const PASSWORD = "HealthUnmeasured1234!";
  let userId = 0;
  let token = "";
  let businessId = 0;

  beforeAll(async () => {
    const reg = await request(app).post("/api/auth/register").send({ email: EMAIL, password: PASSWORD, name: "Health Test" });
    expect(reg.status, JSON.stringify(reg.body)).toBe(201);
    userId = Number((reg.body as { user?: { id: string } }).user?.id ?? 0);
    const login = await request(app).post("/api/auth/login").send({ email: EMAIL, password: PASSWORD });
    expect(login.status).toBe(200);
    token = (login.body as { token?: string }).token ?? "";
    const [business] = await db
      .insert(businessesTable)
      .values({ ownerId: userId, name: "Brand New Co", businessType: "saas", websiteUrl: "https://brandnew.example" })
      .returning({ id: businessesTable.id });
    businessId = business.id;
  });

  afterAll(async () => {
    if (userId) await db.delete(usersTable).where(eq(usersTable.id, userId));
  });

  it("a brand-new business is 'unknown' with every dimension unmeasured, not a default healthy score", async () => {
    const row = await computeBusinessHealth(businessId);
    expect(row.overallScore).toBeNull();
    expect(row.status).toBe("unknown");
    for (const key of Object.keys(UNMEASURED) as (keyof ScoreSet)[]) {
      expect(row[key], key).toBeNull();
    }
    expect(row.issues).toEqual([]);
  });

  it("scores only the dimensions that gain a real signal", async () => {
    await db.insert(businessConnectionsTable).values({ businessId, platformName: "stripe", status: "connected" });
    const row = await computeBusinessHealth(businessId);
    expect(row.connectionScore).toBe(100);
    expect(row.securityScore).toBe(90);
    expect(row.hostingScore).toBeNull();
    expect(row.seoScore).toBeNull();
    expect(row.revenueScore).toBeNull();
    expect(row.overallScore).toBe(95);
    expect(row.status).toBe("healthy");
  });

  it("a system instance with no connectors, jobs, tasks or providers is unknown", async () => {
    const [instance] = await db
      .insert(systemInstancesTable)
      .values({ userId, name: "Empty System" })
      .returning({ id: systemInstancesTable.id });
    const row = await computeSystemHealth(instance.id);
    expect(row.overallScore).toBeNull();
    expect(row.status).toBe("unknown");
    expect(row.seoScore).toBeNull();
    expect(row.hostingScore).toBeNull();
  });

  it("monitoring routes return null scores for unmeasured dimensions", async () => {
    const [fresh] = await db
      .insert(businessesTable)
      .values({ ownerId: userId, name: "Route Fresh Co", businessType: "ecommerce" })
      .returning({ id: businessesTable.id });
    const auth = { Authorization: `Bearer ${token}` };

    const recompute = await request(app).post(`/api/businesses/${fresh.id}/monitoring/recompute`).set(auth);
    expect(recompute.status).toBe(200);
    expect(recompute.body.overallScore).toBeNull();
    expect(recompute.body.status).toBe("unknown");

    const res = await request(app).get(`/api/businesses/${fresh.id}/monitoring`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.latest.overallScore).toBeNull();
    expect(res.body.latest.status).toBe("unknown");
    expect(res.body.latest.seoScore).toBeNull();
  });
});
