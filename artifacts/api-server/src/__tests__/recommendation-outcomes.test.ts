import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { and, eq } from "drizzle-orm";
import { db, usersTable, businessesTable, businessHealthScoresTable, businessRecommendationsTable, ashLessonsTable, type AshLesson } from "@workspace/db";
import app from "../app";
import {
  MEASURE_AFTER_MS,
  measureRecommendationOutcomes,
  distillRecommendationLessons,
  verdictFor,
  calibrateConfidence,
  type RecommendationOutcome,
} from "../lib/recommendation-outcomes";

const DAY = 24 * 60 * 60 * 1000;
const scores = (seo: number) => ({
  overallHealth: 50, automationScore: 50, growthScore: 50, marketingScore: 50, seoScore: seo, contentScore: 50,
});

describe("recommendation outcome measurement", () => {
  const EMAIL = `rec_outcomes_${Date.now()}@test.internal`;
  const PASSWORD = "RecOutcomes1234!";
  const category = `seo_test_${Date.now()}`;
  let userId = 0;
  let token = "";
  let businessId = 0;
  let otherUserIds: number[] = [];

  beforeAll(async () => {
    const reg = await request(app).post("/api/auth/register").send({ email: EMAIL, password: PASSWORD, name: "Outcome Test" });
    expect(reg.status, JSON.stringify(reg.body)).toBe(201);
    userId = Number((reg.body as { user?: { id: string } }).user?.id ?? 0);
    const login = await request(app).post("/api/auth/login").send({ email: EMAIL, password: PASSWORD });
    token = (login.body as { token?: string }).token ?? "";
    const [b] = await db.insert(businessesTable).values({ ownerId: userId, name: "Outcome Co", businessType: "saas" }).returning({ id: businessesTable.id });
    businessId = b.id;
  });

  afterAll(async () => {
    await db.delete(ashLessonsTable).where(and(eq(ashLessonsTable.scopeType, "recommendation_category"), eq(ashLessonsTable.scopeKey, category)));
    for (const id of [userId, ...otherUserIds].filter(Boolean)) await db.delete(usersTable).where(eq(usersTable.id, id));
  });

  async function addScore(seo: number, at: Date) {
    const [row] = await db.insert(businessHealthScoresTable).values({ businessId, ownerUserId: userId, ...scores(seo) }).returning({ id: businessHealthScoresTable.id });
    await db.update(businessHealthScoresTable).set({ createdAt: at } as never).where(eq(businessHealthScoresTable.id, row.id));
  }

  it("classifies score changes with a noise threshold", () => {
    expect(verdictFor(5)).toBe("improved");
    expect(verdictFor(2)).toBe("unchanged");
    expect(verdictFor(-4)).toBe("declined");
  });

  it("stores a baseline on apply, measures after two weeks, and distills a lesson", async () => {
    await addScore(40, new Date(Date.now() - DAY));
    const [rec] = await db.insert(businessRecommendationsTable)
      .values({ businessId, category: "seo", title: "Add meta descriptions", ownerUserId: userId })
      .returning();

    const res = await request(app).post(`/api/businesses/${businessId}/recommendations/${rec.id}/apply`).set("Authorization", `Bearer ${token}`);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const [applied] = await db.select().from(businessRecommendationsTable).where(eq(businessRecommendationsTable.id, rec.id));
    const outcome = (applied.payload as { outcome: RecommendationOutcome }).outcome;
    expect(outcome).toMatchObject({ metric: "seoScore", baseline: 40 });

    // Applying again must not reset the baseline.
    await request(app).post(`/api/businesses/${businessId}/recommendations/${rec.id}/apply`).set("Authorization", `Bearer ${token}`);
    const [again] = await db.select().from(businessRecommendationsTable).where(eq(businessRecommendationsTable.id, rec.id));
    expect((again.payload as { outcome: RecommendationOutcome }).outcome.baselineAt).toBe(outcome.baselineAt);

    const later = new Date(Date.now() + MEASURE_AFTER_MS + DAY);
    // Only a score from before day 14 exists: stays pending, the early score is not the result.
    await addScore(70, new Date(Date.now() + 1000));
    expect((await measureRecommendationOutcomes(later)).measured).toBe(0);
    const [pending] = await db.select().from(businessRecommendationsTable).where(eq(businessRecommendationsTable.id, rec.id));
    expect((pending.payload as { outcome: RecommendationOutcome }).outcome.result).toBeUndefined();

    await addScore(55, new Date(Date.now() + MEASURE_AFTER_MS + 1000));
    // Too early: nothing measured.
    expect((await measureRecommendationOutcomes(new Date())).measured).toBe(0);
    await measureRecommendationOutcomes(later);
    const [measured] = await db.select().from(businessRecommendationsTable).where(eq(businessRecommendationsTable.id, rec.id));
    expect((measured.payload as { outcome: RecommendationOutcome }).outcome.result).toMatchObject({ value: 55, delta: 15, verdict: "improved" });

    // Distill from this category only, renamed so other test data can't affect it.
    await db.update(businessRecommendationsTable).set({ category }).where(eq(businessRecommendationsTable.id, rec.id));
    // One owner's result alone is never published as a shared lesson.
    expect(await distillRecommendationLessons()).not.toContain(`recommendation_category::${category}`);

    const others = await db.insert(usersTable).values([1, 2].map((i) => ({
      email: `rec_outcomes_other${i}_${Date.now()}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "free",
    }))).returning({ id: usersTable.id });
    otherUserIds = others.map((u) => u.id);
    for (const [i, u] of others.entries()) {
      const [b] = await db.insert(businessesTable).values({ ownerId: u.id, name: `Other ${i}`, businessType: "saas" }).returning({ id: businessesTable.id });
      const delta = i === 0 ? 6 : -1;
      await db.insert(businessRecommendationsTable).values({
        businessId: b.id, ownerUserId: u.id, category, title: "Other rec", status: "applied", resolvedAt: new Date(),
        payload: { outcome: { metric: "seoScore", baseline: 50, baselineAt: new Date().toISOString(), result: { value: 50 + delta, delta, verdict: verdictFor(delta), measuredAt: new Date().toISOString() } } },
      });
    }
    expect(await distillRecommendationLessons()).toContain(`recommendation_category::${category}`);
    const [lesson] = await db.select().from(ashLessonsTable)
      .where(and(eq(ashLessonsTable.scopeType, "recommendation_category"), eq(ashLessonsTable.scopeKey, category)));
    expect(lesson).toMatchObject({ sampleSize: 3, successCount: 2 });
    expect(lesson.summary).toContain("2 of 3");
  });
});

describe("calibrateConfidence", () => {
  const lesson = (sampleSize: number, successCount: number, confidence: number) =>
    ({ sampleSize, successCount, confidence, outcome: "proven" }) as AshLesson;

  it("leaves the model's confidence alone without trustworthy evidence", () => {
    expect(calibrateConfidence(70, undefined).confidence).toBe(70);
    expect(calibrateConfidence(70, lesson(2, 2, 20)).confidence).toBe(70);
  });

  it("pulls confidence toward the measured success rate, weighted by lesson confidence", () => {
    // 10% success, lesson confidence 100 → 50% weight: 80*0.5 + 10*0.5 = 45
    expect(calibrateConfidence(80, lesson(10, 1, 100))).toMatchObject({ confidence: 45, aiConfidence: 80, measuredSuccessRate: 10 });
    // 90% success, lesson confidence 50 → 25% weight: 40*0.75 + 90*0.25 = 52.5 → 53
    expect(calibrateConfidence(40, lesson(10, 9, 50)).confidence).toBe(53);
  });
});
