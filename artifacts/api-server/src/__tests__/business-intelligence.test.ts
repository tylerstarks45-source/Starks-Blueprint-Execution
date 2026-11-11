/**
 * Business Intelligence Engine (ASH Brain v2.0 — Phase 1.5A) — Regression Tests
 *
 * Covers:
 *  1. Import-first DNA initialization (no redundant setup prompts)
 *  2. Truth resolution: user-confirmed values are permanent; high-impact
 *     conflicts escalate; low-impact conflicts route to the review queue;
 *     equivalent non-strengthening evidence is truly idempotent (no version
 *     row, no event); a weaker inference never downgrades verified data
 *  3. computeRecommendedAction's full decision matrix
 *  4. AI-assisted inference for missing catalog fields (confidence-based
 *     trust level), never contesting an existing claim
 *  5. Capability derivation, including "gap" hints for unavailable ones
 *  6. Business Event Bus hardening: a failing subscriber never blocks
 *     timeline recording or sibling subscribers; duplicate (deduped) events
 *     never re-fire subscribers
 *  7. Business Context Isolation — Cross-Business Analysis: explicit-only
 *     trigger (flag OR heuristic phrase), scope-filter behavior, and
 *     portfolio-wide aggregation
 *  8. Fail-open wording when Business Intelligence context is unavailable
 *  9. HTTP route-level conflict-decision matrix (keep_current / accept_new /
 *     edit_value / defer), including the recommendedAction surfaced by GET
 *     /businesses/:id/conflicts, and cross-owner 404 authorization
 *
 * Mocks:
 *  - openrouter.complete — deterministic responses; defaults to "no
 *    inferences" so existing import/reconciliation assertions are
 *    unaffected, overridden per-test where inference itself is under test.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach, vi } from "vitest";

// ─── Mock openrouter BEFORE importing anything that transitively uses it ────

vi.mock("../lib/openrouter", () => ({
  complete: vi.fn(),
  streamCompletion: vi.fn(),
}));

// ─── Now import app/db/lib (after the mock is hoisted) ──────────────────────

import request from "supertest";
import { and, eq } from "drizzle-orm";
import {
  db,
  usersTable,
  businessesTable,
  businessMemoryTable,
  businessDnaClaimsTable,
  businessDnaVersionsTable,
  businessDnaConflictsTable,
  businessReviewQueueTable,
  businessTimelineEventsTable,
  businessDomainEventsTable,
} from "@workspace/db";
import {
  applyUserConfirmedDnaValue,
  initializeBusinessDna,
  reconcileDnaEvidence,
  publishBusinessEvent,
  registerBusinessEventSubscriber,
  assembleBusinessContextPackage,
  assembleCrossBusinessSummary,
  getBusinessCapabilities,
  computeRecommendedAction,
  detectCrossBusinessIntent,
  resolveRelevantKnowledgeScopes,
  buildBusinessIntelligenceUnavailableNote,
} from "../lib/business-intelligence";
import { complete as _complete } from "../lib/openrouter";
import app from "../app";

const mockComplete = vi.mocked(_complete);

function fakeCompletion(content: string) {
  return { content, model: "openai/gpt-4o-mini", promptTokens: 10, completionTokens: 20, totalTokens: 30, estimatedCost: null };
}

let userId: number;
let otherUserId: number;
let businessId: number;
let otherBusinessId: number;
const EMAIL = `bi_engine_${Date.now()}@test.internal`;
const OTHER_EMAIL = `bi_engine_other_${Date.now()}@test.internal`;

beforeAll(async () => {
  const [user, other] = await Promise.all([
    db.insert(usersTable).values({ email: EMAIL, role: "USER", membershipStatus: "active", membershipTier: "starter" }).returning({ id: usersTable.id }),
    db.insert(usersTable).values({ email: OTHER_EMAIL, role: "USER", membershipStatus: "active", membershipTier: "starter" }).returning({ id: usersTable.id }),
  ]);
  userId = user[0].id;
  otherUserId = other[0].id;
  const [business, otherBusiness] = await Promise.all([
    db.insert(businessesTable).values({ ownerId: userId, name: "North Star Studio", businessType: "agency", revenueModel: "retainer", websiteUrl: "https://northstar.example" }).returning({ id: businessesTable.id }),
    db.insert(businessesTable).values({ ownerId: otherUserId, name: "Private Other Business", businessType: "saas" }).returning({ id: businessesTable.id }),
  ]);
  businessId = business[0].id;
  otherBusinessId = otherBusiness[0].id;
  await db.insert(businessMemoryTable).values({
    businessId,
    ownerUserId: userId,
    businessModel: "Service agency",
    services: ["Brand strategy", "Website design"],
    customers: ["Growing B2B companies"],
    revenueGoals: "$25,000 MRR",
    confidenceScore: 85,
  });
});

// Every test gets a deterministic, no-op-by-default AI mock: inference
// contributes nothing unless a test explicitly queues a response, so the
// existing import/reconciliation assertions never depend on (or make) real
// network calls.
beforeEach(() => {
  mockComplete.mockReset();
  mockComplete.mockResolvedValue(fakeCompletion("[]"));
});

afterEach(async () => {
  await db.delete(businessDomainEventsTable).where(eq(businessDomainEventsTable.businessId, businessId));
  await db.delete(businessTimelineEventsTable).where(eq(businessTimelineEventsTable.businessId, businessId));
  await db.delete(businessReviewQueueTable).where(eq(businessReviewQueueTable.businessId, businessId));
  await db.delete(businessDnaConflictsTable).where(eq(businessDnaConflictsTable.businessId, businessId));
  await db.delete(businessDnaClaimsTable).where(eq(businessDnaClaimsTable.businessId, businessId));
});

afterAll(async () => {
  await db.delete(usersTable).where(eq(usersTable.id, userId));
  await db.delete(usersTable).where(eq(usersTable.id, otherUserId));
});

describe("Business Intelligence Engine — Phase 1.5A", () => {
  it("imports existing business-owned data before inference without a redundant confirmation prompt", async () => {
    await initializeBusinessDna(businessId);
    const claims = await db.select().from(businessDnaClaimsTable).where(eq(businessDnaClaimsTable.businessId, businessId));
    const names = new Map(claims.map((claim) => [claim.fieldKey, claim]));
    expect(names.get("business_name")?.currentValue).toBe("North Star Studio");
    expect(names.get("business_name")?.trustLevel).toBe("verified_system_data");
    expect(names.get("services")?.currentValue).toEqual(["Brand strategy", "Website design"]);
    expect(names.get("revenue_goals")?.currentValue).toBe("$25,000 MRR");

    // Spec requirement: "Import-first DNA initialization and no redundant
    // confirmation prompt" — a fresh import can never raise a conflict
    // against itself, and the single guided-confirmation prompt the review
    // queue is allowed to surface (spec: "ask only one prioritized,
    // context-aware question ... There is no mandatory setup wizard") must
    // never reference a field this import already successfully populated.
    const reviewItems = await db.select().from(businessReviewQueueTable).where(eq(businessReviewQueueTable.businessId, businessId));
    expect(reviewItems.every((item) => item.kind !== "conflict")).toBe(true);
    const importedFieldKeys = new Set(Array.from(names.keys()));
    for (const item of reviewItems) {
      if (item.kind !== "confirmation") continue;
      const fieldKey = (item.payload as { fieldKey?: string } | null)?.fieldKey ?? "";
      expect(importedFieldKeys.has(fieldKey)).toBe(false);
    }
  });

  it("never overwrites a user-confirmed value and escalates high-impact conflicts", async () => {
    await reconcileDnaEvidence(businessId, {
      fieldKey: "website_url",
      value: "https://owner-confirmed.example",
      confidenceScore: 100,
      trustLevel: "user_confirmed",
      source: "user_edit",
    });
    const result = await reconcileDnaEvidence(businessId, {
      fieldKey: "website_url",
      value: "https://discovered-conflict.example",
      confidenceScore: 96,
      trustLevel: "verified_system_data",
      source: "website_crawler",
    });
    expect(result.action).toBe("conflict");
    const [claim] = await db.select().from(businessDnaClaimsTable).where(and(eq(businessDnaClaimsTable.businessId, businessId), eq(businessDnaClaimsTable.fieldKey, "website_url")));
    expect(claim.currentValue).toBe("https://owner-confirmed.example");
    const [conflict] = await db.select().from(businessDnaConflictsTable).where(eq(businessDnaConflictsTable.id, result.conflictId!));
    expect(conflict.impactScore).toBeGreaterThanOrEqual(70);
    const events = await db.select().from(businessTimelineEventsTable).where(eq(businessTimelineEventsTable.businessId, businessId));
    expect(events.some((event) => event.eventType === "conflict.high_impact")).toBe(true);
  });

  it("promotes a higher-confidence inference and preserves immutable version history", async () => {
    await reconcileDnaEvidence(businessId, {
      fieldKey: "target_audience",
      value: ["small companies"],
      confidenceScore: 40,
      trustLevel: "low_confidence_inference",
      source: "initial_inference",
    });
    const result = await reconcileDnaEvidence(businessId, {
      fieldKey: "target_audience",
      value: ["Growing B2B companies"],
      confidenceScore: 80,
      trustLevel: "high_confidence_inference",
      source: "project_evidence",
    });
    expect(result.action).toBe("promoted");
    expect(result.claim.currentValue).toEqual(["Growing B2B companies"]);
    expect(result.claim.version).toBe(2);
    const history = await db.select().from(businessDnaVersionsTable).where(eq(businessDnaVersionsTable.claimId, result.claim.id));
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history.some((version) => version.changeType === "promoted")).toBe(true);
  });

  it("routes low-impact conflicts to the Business Review Queue instead of interrupting", async () => {
    await reconcileDnaEvidence(businessId, {
      fieldKey: "brand_voice",
      value: "professional",
      confidenceScore: 100,
      trustLevel: "user_confirmed",
      source: "user_edit",
    });
    const result = await reconcileDnaEvidence(businessId, {
      fieldKey: "brand_voice",
      value: "playful",
      confidenceScore: 70,
      trustLevel: "high_confidence_inference",
      source: "content_analysis",
    });
    const [conflict] = await db.select().from(businessDnaConflictsTable).where(eq(businessDnaConflictsTable.id, result.conflictId!));
    expect(conflict.impactScore).toBeLessThan(70);
    const reviews = await db.select().from(businessReviewQueueTable).where(eq(businessReviewQueueTable.conflictId, conflict.id));
    expect(reviews).toHaveLength(1);
  });

  it("is truly idempotent for equivalent, non-strengthening evidence — no new version row, no event", async () => {
    const first = await reconcileDnaEvidence(businessId, {
      fieldKey: "seo_strategy",
      value: "Content-led SEO targeting long-tail keywords",
      confidenceScore: 90,
      trustLevel: "verified_system_data",
      source: "seo_audit",
    });
    const versionsAfterFirst = await db.select().from(businessDnaVersionsTable).where(eq(businessDnaVersionsTable.claimId, first.claim.id));

    const second = await reconcileDnaEvidence(businessId, {
      fieldKey: "seo_strategy",
      value: "Content-led SEO targeting long-tail keywords",
      confidenceScore: 90,
      trustLevel: "verified_system_data",
      source: "seo_audit",
    });
    expect(second.action).toBe("preserved");
    expect(second.claim.version).toBe(first.claim.version);

    const versionsAfterSecond = await db.select().from(businessDnaVersionsTable).where(eq(businessDnaVersionsTable.claimId, first.claim.id));
    expect(versionsAfterSecond).toHaveLength(versionsAfterFirst.length);

    const changeEvents = await db.select().from(businessDomainEventsTable).where(and(eq(businessDomainEventsTable.businessId, businessId), eq(businessDomainEventsTable.eventType, "dna.changed")));
    expect(changeEvents).toHaveLength(0);
  });

  it("preserves a verified value when a weaker inference disagrees, recording a conflict instead of downgrading", async () => {
    await reconcileDnaEvidence(businessId, {
      fieldKey: "revenue_model",
      value: "retainer",
      confidenceScore: 95,
      trustLevel: "verified_system_data",
      source: "existing_business_records",
    });
    const result = await reconcileDnaEvidence(businessId, {
      fieldKey: "revenue_model",
      value: "one_time_project",
      confidenceScore: 45,
      trustLevel: "low_confidence_inference",
      source: "ai_inference",
    });
    expect(result.action).toBe("conflict");
    const [claim] = await db.select().from(businessDnaClaimsTable).where(and(eq(businessDnaClaimsTable.businessId, businessId), eq(businessDnaClaimsTable.fieldKey, "revenue_model")));
    expect(claim.currentValue).toBe("retainer");
    expect(claim.trustLevel).toBe("verified_system_data");
  });

  it("allows an explicit owner decision to replace a previously confirmed value while preserving history", async () => {
    await applyUserConfirmedDnaValue(businessId, {
      fieldKey: "website_url",
      value: "https://old-confirmed.example",
      confidenceScore: 100,
      trustLevel: "user_confirmed",
      source: "user_edit",
    });
    const result = await applyUserConfirmedDnaValue(businessId, {
      fieldKey: "website_url",
      value: "https://new-confirmed.example",
      confidenceScore: 100,
      trustLevel: "user_confirmed",
      source: "user_conflict_decision",
    });
    expect(result.claim.currentValue).toBe("https://new-confirmed.example");
    expect(result.claim.trustLevel).toBe("user_confirmed");
    expect(result.claim.version).toBe(2);
    const versions = await db.select().from(businessDnaVersionsTable).where(eq(businessDnaVersionsTable.claimId, result.claim.id));
    expect(versions.some((version) => version.changeType === "user_decision")).toBe(true);
  });

  it("records idempotent business events in the timeline", async () => {
    const event = {
      businessId,
      eventType: "project.completed",
      source: "test",
      payload: { description: "Project completed for timeline test." },
      dedupeKey: `timeline-test:${businessId}`,
    };
    await publishBusinessEvent(event);
    await publishBusinessEvent(event);
    const events = await db.select().from(businessTimelineEventsTable).where(and(eq(businessTimelineEventsTable.businessId, businessId), eq(businessTimelineEventsTable.eventType, "project.completed")));
    expect(events).toHaveLength(1);
  });

  it("derives capabilities (with gap hints for unavailable ones) and keeps business context strictly owner-scoped", async () => {
    await initializeBusinessDna(businessId);
    const capabilities = await getBusinessCapabilities(businessId, userId);
    const website = capabilities?.find((capability) => capability.key === "website");
    const services = capabilities?.find((capability) => capability.key === "services");
    const crm = capabilities?.find((capability) => capability.key === "crm");
    expect(website?.available).toBe(true);
    expect(website?.gap).toBeNull();
    expect(services?.available).toBe(true);
    expect(services?.gap).toBeNull();
    expect(crm?.available).toBe(false);
    expect(crm?.gap).toBe("No CRM is connected for this business.");

    const ownContext = await assembleBusinessContextPackage({ businessId, userId });
    const crossBusinessContext = await assembleBusinessContextPackage({ businessId: otherBusinessId, userId });
    expect(ownContext?.businessName).toBe("North Star Studio");
    expect(crossBusinessContext).toBeNull();
  });
});

describe("Business Intelligence Engine — computeRecommendedAction", () => {
  it("recommends keep_current when the current value is user_confirmed, regardless of incoming strength", () => {
    const rec = computeRecommendedAction({ currentTrustLevel: "user_confirmed", incomingTrustLevel: "verified_system_data", incomingConfidenceScore: 99, impactScore: 80 });
    expect(rec.action).toBe("keep_current");
  });

  it("recommends accept_new when the incoming trust level ranks higher", () => {
    const rec = computeRecommendedAction({ currentTrustLevel: "low_confidence_inference", incomingTrustLevel: "verified_system_data", incomingConfidenceScore: 60, impactScore: 30 });
    expect(rec.action).toBe("accept_new");
  });

  it("recommends accept_new when trust levels tie but incoming confidence is notably higher", () => {
    const rec = computeRecommendedAction({ currentTrustLevel: "high_confidence_inference", incomingTrustLevel: "high_confidence_inference", incomingConfidenceScore: 80, impactScore: 30 });
    expect(rec.action).toBe("accept_new");
  });

  it("recommends defer for a high-impact conflict that doesn't clearly favor either value", () => {
    const rec = computeRecommendedAction({ currentTrustLevel: "verified_system_data", incomingTrustLevel: "verified_system_data", incomingConfidenceScore: 50, impactScore: 80 });
    expect(rec.action).toBe("defer");
  });

  it("recommends keep_current for a low-impact conflict that doesn't clearly favor the incoming value", () => {
    const rec = computeRecommendedAction({ currentTrustLevel: "verified_system_data", incomingTrustLevel: "high_confidence_inference", incomingConfidenceScore: 50, impactScore: 30 });
    expect(rec.action).toBe("keep_current");
  });
});

describe("Business Intelligence Engine — DNA inference (AI-assisted)", () => {
  it("infers missing catalog fields via AI, assigning trust level by confidence, without ever contesting an existing claim", async () => {
    const [inferenceBusiness] = await db.insert(businessesTable).values({ ownerId: userId, name: "Inference Test Co", businessType: "saas" }).returning({ id: businessesTable.id });
    const inferenceBusinessId = inferenceBusiness.id;
    try {
      mockComplete.mockResolvedValueOnce(fakeCompletion(JSON.stringify([
        { fieldKey: "target_audience", value: ["Early-stage SaaS founders"], confidenceScore: 82, reasoning: "Business type and name strongly imply this audience." },
        { fieldKey: "brand_voice", value: "professional", confidenceScore: 55, reasoning: "Weak inference from limited evidence." },
      ])));
      await initializeBusinessDna(inferenceBusinessId);

      const claims = await db.select().from(businessDnaClaimsTable).where(eq(businessDnaClaimsTable.businessId, inferenceBusinessId));
      const byKey = new Map(claims.map((claim) => [claim.fieldKey, claim]));
      expect(byKey.get("target_audience")?.currentValue).toEqual(["Early-stage SaaS founders"]);
      expect(byKey.get("target_audience")?.trustLevel).toBe("high_confidence_inference");
      expect(byKey.get("target_audience")?.source).toBe("ai_inference");
      expect(byKey.get("brand_voice")?.trustLevel).toBe("low_confidence_inference");

      // Business name is never inferable — it must come from the
      // unconditional system import, not the AI inference pass.
      expect(byKey.get("business_name")?.trustLevel).toBe("verified_system_data");
    } finally {
      await db.delete(businessDomainEventsTable).where(eq(businessDomainEventsTable.businessId, inferenceBusinessId));
      await db.delete(businessTimelineEventsTable).where(eq(businessTimelineEventsTable.businessId, inferenceBusinessId));
      await db.delete(businessReviewQueueTable).where(eq(businessReviewQueueTable.businessId, inferenceBusinessId));
      await db.delete(businessDnaConflictsTable).where(eq(businessDnaConflictsTable.businessId, inferenceBusinessId));
      await db.delete(businessDnaVersionsTable).where(eq(businessDnaVersionsTable.businessId, inferenceBusinessId));
      await db.delete(businessDnaClaimsTable).where(eq(businessDnaClaimsTable.businessId, inferenceBusinessId));
      await db.delete(businessesTable).where(eq(businessesTable.id, inferenceBusinessId));
    }
  });
});

describe("Business Intelligence Engine — Event Bus hardening", () => {
  it("a failing event subscriber never blocks timeline recording or sibling subscribers", async () => {
    const eventType = `test.failing_subscriber_${Date.now()}`;
    let otherHandlerRan = false;
    registerBusinessEventSubscriber([eventType], async () => {
      throw new Error("boom - simulated subscriber failure");
    });
    registerBusinessEventSubscriber([eventType], async () => {
      otherHandlerRan = true;
    });

    await publishBusinessEvent({
      businessId,
      eventType,
      source: "test",
      payload: { description: "Testing failed-subscriber isolation." },
      dedupeKey: `failing-subscriber-test:${businessId}`,
    });

    const [event] = await db.select().from(businessDomainEventsTable).where(and(eq(businessDomainEventsTable.businessId, businessId), eq(businessDomainEventsTable.eventType, eventType)));
    expect(event.status).toBe("failed");
    expect(event.errorMessage).toContain("boom");

    const timelineRows = await db.select().from(businessTimelineEventsTable).where(and(eq(businessTimelineEventsTable.businessId, businessId), eq(businessTimelineEventsTable.eventType, eventType)));
    expect(timelineRows).toHaveLength(1);
    expect(otherHandlerRan).toBe(true);
  });

  it("a duplicate published event (same dedupeKey) never re-fires subscribers", async () => {
    const eventType = `test.subscriber_idempotency_${Date.now()}`;
    let callCount = 0;
    registerBusinessEventSubscriber([eventType], async () => {
      callCount += 1;
    });
    const input = {
      businessId,
      eventType,
      source: "test",
      payload: { description: "Testing subscriber call-count idempotency." },
      dedupeKey: `subscriber-idempotency-test:${businessId}:${Date.now()}`,
    };
    await publishBusinessEvent(input);
    await publishBusinessEvent(input);
    expect(callCount).toBe(1);
  });
});

describe("Business Context Isolation — Cross-Business Analysis", () => {
  it("detects explicit natural-language cross-business intent, and only that pattern", () => {
    expect(detectCrossBusinessIntent("Can you compare all my businesses?")).toBe(true);
    expect(detectCrossBusinessIntent("Give me a portfolio-wide summary")).toBe(true);
    expect(detectCrossBusinessIntent("how is my website doing?")).toBe(false);
    expect(detectCrossBusinessIntent("what should I work on today?")).toBe(false);
  });

  it("resolveRelevantKnowledgeScopes only restricts to one business when an active business is set and cross-business mode is off", () => {
    const restricted = resolveRelevantKnowledgeScopes({ businessId, crossBusinessMode: false });
    expect(restricted.restrictToBusiness).toBe(true);
    expect(restricted.allowedBusinessId).toBe(businessId);

    const crossBusiness = resolveRelevantKnowledgeScopes({ businessId, crossBusinessMode: true });
    expect(crossBusiness.restrictToBusiness).toBe(false);
    expect(crossBusiness.allowedBusinessId).toBeNull();

    const noActiveBusiness = resolveRelevantKnowledgeScopes({ businessId: null });
    expect(noActiveBusiness.restrictToBusiness).toBe(false);
  });

  it("assembleCrossBusinessSummary aggregates every business owned by the caller, and only the caller", async () => {
    const [secondBusiness] = await db.insert(businessesTable).values({ ownerId: userId, name: "Second Venture", businessType: "ecommerce" }).returning({ id: businessesTable.id });
    try {
      const summary = await assembleCrossBusinessSummary(userId);
      const names = summary.businesses.map((b) => b.businessName);
      expect(names).toContain("North Star Studio");
      expect(names).toContain("Second Venture");
      expect(names).not.toContain("Private Other Business");
      expect(summary.contextNote).toContain("CROSS-BUSINESS ANALYSIS");
    } finally {
      await db.delete(businessesTable).where(eq(businessesTable.id, secondBusiness.id));
    }
  });
});

describe("Business Intelligence Engine — fail-open behavior", () => {
  it("builds a clearly-labeled fail-open note when Business Intelligence context is unavailable", () => {
    const note = buildBusinessIntelligenceUnavailableNote("business context assembly failed");
    expect(note).toContain("BUSINESS INTELLIGENCE (unavailable)");
    expect(note).toContain("business context assembly failed");
    expect(note.toLowerCase()).toContain("unverified");
  });
});

describe("Business Intelligence Engine — HTTP routes (conflict decisions)", () => {
  let routeUserId: number;
  let routeAuthToken: string;
  let routeBusinessId: number;
  const ROUTE_EMAIL = `bi_routes_${Date.now()}@test.internal`;
  const ROUTE_PASSWORD = "BiRoutesTest1234!";

  beforeAll(async () => {
    const reg = await request(app).post("/api/auth/register").send({ email: ROUTE_EMAIL, password: ROUTE_PASSWORD, name: "BI Routes Test" });
    expect(reg.status, `Register failed: ${JSON.stringify(reg.body)}`).toBe(201);
    routeUserId = Number((reg.body as { user?: { id: string } }).user?.id ?? 0);

    const login = await request(app).post("/api/auth/login").send({ email: ROUTE_EMAIL, password: ROUTE_PASSWORD });
    expect(login.status, `Login failed: ${JSON.stringify(login.body)}`).toBe(200);
    routeAuthToken = (login.body as { token?: string }).token ?? "";

    const [business] = await db.insert(businessesTable).values({ ownerId: routeUserId, name: "Route Test Co", businessType: "saas" }).returning({ id: businessesTable.id });
    routeBusinessId = business.id;
  });

  afterAll(async () => {
    if (routeUserId) await db.delete(usersTable).where(eq(usersTable.id, routeUserId));
  });

  afterEach(async () => {
    await db.delete(businessDomainEventsTable).where(eq(businessDomainEventsTable.businessId, routeBusinessId));
    await db.delete(businessTimelineEventsTable).where(eq(businessTimelineEventsTable.businessId, routeBusinessId));
    await db.delete(businessReviewQueueTable).where(eq(businessReviewQueueTable.businessId, routeBusinessId));
    await db.delete(businessDnaConflictsTable).where(eq(businessDnaConflictsTable.businessId, routeBusinessId));
    await db.delete(businessDnaVersionsTable).where(eq(businessDnaVersionsTable.businessId, routeBusinessId));
    await db.delete(businessDnaClaimsTable).where(eq(businessDnaClaimsTable.businessId, routeBusinessId));
  });

  function routeAuth() {
    return { Authorization: `Bearer ${routeAuthToken}` };
  }

  // Confirming a value as user_confirmed and then reconciling a differing
  // value against it ALWAYS produces a conflict (user_confirmed values are
  // never silently overwritten), regardless of the incoming trust level —
  // the most reliable way to seed a conflict row deterministically.
  async function seedConflict(fieldKey: string, currentValue: unknown, incomingValue: unknown): Promise<number> {
    await applyUserConfirmedDnaValue(routeBusinessId, { fieldKey, value: currentValue, confidenceScore: 100, trustLevel: "user_confirmed", source: "user_edit" });
    const result = await reconcileDnaEvidence(routeBusinessId, { fieldKey, value: incomingValue, confidenceScore: 90, trustLevel: "verified_system_data", source: "test_source" });
    return result.conflictId!;
  }

  it("GET /businesses/:id/conflicts includes a recommendedAction for each open conflict", async () => {
    await seedConflict("website_url", "https://old.example", "https://new.example");
    const res = await request(app).get(`/api/businesses/${routeBusinessId}/conflicts`).set(routeAuth());
    expect(res.status).toBe(200);
    expect(res.body.conflicts).toHaveLength(1);
    // The current value is user_confirmed, so the recommendation is always
    // to keep it regardless of the incoming evidence's trust/confidence.
    expect(res.body.conflicts[0].recommendedAction).toMatchObject({ action: "keep_current" });
    expect(typeof res.body.conflicts[0].recommendedAction.reason).toBe("string");
  });

  it("decision=keep_current resolves the conflict without changing DNA", async () => {
    const conflictId = await seedConflict("brand_voice", "professional", "playful");
    const res = await request(app).post(`/api/businesses/${routeBusinessId}/conflicts/${conflictId}/decision`).set(routeAuth()).send({ action: "keep_current" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("resolved");
    expect(res.body.resolution).toBe("keep_current");
    const [claim] = await db.select().from(businessDnaClaimsTable).where(and(eq(businessDnaClaimsTable.businessId, routeBusinessId), eq(businessDnaClaimsTable.fieldKey, "brand_voice")));
    expect(claim.currentValue).toBe("professional");
  });

  it("decision=accept_new promotes the incoming value to a user-confirmed claim", async () => {
    const conflictId = await seedConflict("brand_voice", "professional", "playful");
    const res = await request(app).post(`/api/businesses/${routeBusinessId}/conflicts/${conflictId}/decision`).set(routeAuth()).send({ action: "accept_new" });
    expect(res.status).toBe(200);
    expect(res.body.resolution).toBe("accept_new");
    const [claim] = await db.select().from(businessDnaClaimsTable).where(and(eq(businessDnaClaimsTable.businessId, routeBusinessId), eq(businessDnaClaimsTable.fieldKey, "brand_voice")));
    expect(claim.currentValue).toBe("playful");
    expect(claim.trustLevel).toBe("user_confirmed");
  });

  it("decision=edit_value writes the caller-provided value as user-confirmed", async () => {
    const conflictId = await seedConflict("brand_voice", "professional", "playful");
    const res = await request(app).post(`/api/businesses/${routeBusinessId}/conflicts/${conflictId}/decision`).set(routeAuth()).send({ action: "edit_value", value: "warm and direct" });
    expect(res.status).toBe(200);
    expect(res.body.resolution).toBe("edit_value");
    const [claim] = await db.select().from(businessDnaClaimsTable).where(and(eq(businessDnaClaimsTable.businessId, routeBusinessId), eq(businessDnaClaimsTable.fieldKey, "brand_voice")));
    expect(claim.currentValue).toBe("warm and direct");
    expect(claim.trustLevel).toBe("user_confirmed");
  });

  it("decision=defer marks the conflict deferred and leaves DNA untouched", async () => {
    const conflictId = await seedConflict("brand_voice", "professional", "playful");
    const res = await request(app).post(`/api/businesses/${routeBusinessId}/conflicts/${conflictId}/decision`).set(routeAuth()).send({ action: "defer" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("deferred");
    expect(res.body.resolution).toBe("defer");
    const [claim] = await db.select().from(businessDnaClaimsTable).where(and(eq(businessDnaClaimsTable.businessId, routeBusinessId), eq(businessDnaClaimsTable.fieldKey, "brand_voice")));
    expect(claim.currentValue).toBe("professional");
  });

  it("rejects a decision when the path business isn't owned by the caller (authorization gate)", async () => {
    const conflictId = await seedConflict("brand_voice", "professional", "playful");
    const res = await request(app).post(`/api/businesses/${otherBusinessId}/conflicts/${conflictId}/decision`).set(routeAuth()).send({ action: "keep_current" });
    expect(res.status).toBe(404);
  });

  // Route-precedence regression guard: businesses.ts registers GET
  // /businesses/:id, which would otherwise greedily match "cross-business-summary"
  // as :id and shadow this handler entirely (Express matches routers/routes in
  // mount order). If that regresses, GetBusinessParams' numeric :id parse fails
  // and this request comes back as a 400 { error } instead of the real summary
  // payload below — so asserting the full success shape is sufficient to catch it.
  it.each([
    "/api/businesses/summary/cross-business",
    "/api/businesses/cross-business-summary",
  ])("GET %s reaches the BI handler and is not shadowed by GET /businesses/:id", async (path) => {
    const res = await request(app).get(path).set(routeAuth());
    expect(res.status).toBe(200);
    expect(res.body.businessCount).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.body.businesses)).toBe(true);
    expect(res.body.businesses.some((b: { businessId: number }) => b.businessId === routeBusinessId)).toBe(true);
    expect(typeof res.body.contextNote).toBe("string");
    expect(res.body.contextNote).toContain("CROSS-BUSINESS ANALYSIS");
  });
});
