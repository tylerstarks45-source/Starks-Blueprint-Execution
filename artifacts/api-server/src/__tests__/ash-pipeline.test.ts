/**
 * ASH Build Pipeline — Regression Tests
 *
 * Covers:
 *  1. POST /api/ai-orchestrator/execute  — creates instance with buildStatus="building"
 *  2. POST /api/build-engine/execute-step — completes steps, inserts activity events
 *  3. Final step transitions system to buildStatus="active", healthStatus="healthy",
 *     session status="completed"
 *  4. Build-step execution NEVER fabricates a "revenue" activity event —
 *     real revenue only ever comes from the connected-provider sync (task #272)
 *  5. POST /api/ai-orchestrator/chat     — returns structuredData (smoke test)
 *
 * Mocks:
 *  - openrouter.complete — returns deterministic AI responses (no real API calls)
 *  - credits.hasCredits  — always returns true so credit gates don't block tests
 *
 * Database:
 *  A unique test user is created in beforeAll and deleted (cascade) in afterAll.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";

// ─── Mock openrouter BEFORE importing app ────────────────────────────────────

vi.mock("../lib/openrouter", () => ({
  complete: vi.fn(),
  streamCompletion: vi.fn(),
}));

vi.mock("../lib/credits", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/credits")>();
  return {
    ...actual,
    hasCredits: vi.fn().mockResolvedValue(true),
  };
});

// ─── Now import app and DB (after mocks are hoisted) ─────────────────────────

import app from "../app";
import { db, usersTable, systemInstancesTable, buildSessionsTable, buildProgressTable, systemActivityEventsTable, userCredentialsTable } from "@workspace/db";
import { complete as _complete } from "../lib/openrouter";
import { encrypt } from "../lib/crypto";
import { TwitterConnector } from "../lib/connectors/twitter-connector";

const mockComplete = vi.mocked(_complete);

// ─── Test user state ──────────────────────────────────────────────────────────

let testUserId: number;
let authToken: string;

// A unique email per test-run so parallel CI runs don't clash.
const TEST_EMAIL = `ash_regtest_${Date.now()}@test.internal`;
const TEST_PASSWORD = "AshTest1234!";

// ─── Lifecycle ────────────────────────────────────────────────────────────────

beforeAll(async () => {
  // Register
  const reg = await request(app)
    .post("/api/auth/register")
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD, name: "ASH Regression" });
  expect(reg.status, `Register failed: ${JSON.stringify(reg.body)}`).toBe(201);

  testUserId = Number((reg.body as { user?: { id: string } }).user?.id ?? 0);
  expect(testUserId).toBeGreaterThan(0);

  // Login
  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
  expect(login.status, `Login failed: ${JSON.stringify(login.body)}`).toBe(200);

  authToken = (login.body as { token?: string }).token ?? "";
  expect(authToken).toBeTruthy();
});

afterAll(async () => {
  if (testUserId) {
    // Deleting the user cascades to system_instances → build_sessions →
    // build_progress, system_activity_events, user_credentials, etc.
    await db.delete(usersTable).where(eq(usersTable.id, testUserId));
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function auth() {
  return { Authorization: `Bearer ${authToken}` };
}

/** Returns a fake CompletionResult suitable for the openrouter mock. */
function fakeCompletion(content: string) {
  return {
    content,
    model: "openai/gpt-4o-mini",
    promptTokens: 10,
    completionTokens: 20,
    totalTokens: 30,
    estimatedCost: null,
  };
}

// ─── 1. POST /api/ai-orchestrator/execute ────────────────────────────────────

describe("POST /api/ai-orchestrator/execute", () => {
  it("creates a system instance with buildStatus=building and returns session + steps", async () => {
    // The execute endpoint calls complete() once to generate the build plan.
    mockComplete.mockResolvedValueOnce(
      fakeCompletion(
        JSON.stringify({
          categoryIds: [1],
          buildPlan: [
            "Step 1: Configure AI content generation tool",
            "Step 2: Deploy affiliate link tracker for revenue attribution",
            "Step 3: Launch email campaign to subscriber list",
          ],
        }),
      ),
    );

    const res = await request(app)
      .post("/api/ai-orchestrator/execute")
      .set(auth())
      .send({ blueprintSlug: "ai-blog-machine", systemName: "Regression Test System" });

    expect(res.status, JSON.stringify(res.body)).toBe(201);

    const body = res.body as {
      instanceId: number;
      sessionId: number;
      steps: Array<{ id: number; stepNumber: number; status: string }>;
      blueprint: { slug: string };
      buildPlan: string[];
    };

    expect(body.instanceId).toBeGreaterThan(0);
    expect(body.sessionId).toBeGreaterThan(0);
    expect(body.blueprint.slug).toBe("ai-blog-machine");
    expect(Array.isArray(body.steps)).toBe(true);
    expect(body.steps.length).toBeGreaterThanOrEqual(3);

    // First step should be in_progress, rest pending
    const sorted = [...body.steps].sort((a, b) => a.stepNumber - b.stepNumber);
    expect(sorted[0].status).toBe("in_progress");
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].status).toBe("pending");
    }

    // Verify DB: instance has buildStatus="building"
    const [instance] = await db
      .select({ buildStatus: systemInstancesTable.buildStatus, name: systemInstancesTable.name })
      .from(systemInstancesTable)
      .where(eq(systemInstancesTable.id, body.instanceId));

    expect(instance).toBeDefined();
    expect(instance.buildStatus).toBe("building");
    expect(instance.name).toBe("Regression Test System");

    // Verify build-start activity event was inserted
    const events = await db
      .select()
      .from(systemActivityEventsTable)
      .where(eq(systemActivityEventsTable.systemInstanceId, body.instanceId));

    expect(events.length).toBeGreaterThanOrEqual(1);
    const startEvent = events.find((e) => e.description.includes("Build initiated"));
    expect(startEvent).toBeDefined();
    expect(startEvent?.eventType).toBe("action");
  });
});

// ─── 2. POST /api/build-engine/execute-step — non-final step ─────────────────

describe("POST /api/build-engine/execute-step", () => {
  let instanceId: number;
  let sessionId: number;
  let steps: Array<{ id: number; stepNumber: number; status: string; notes: string }>;

  beforeAll(async () => {
    // Set up a fresh system instance with 3 build steps.
    mockComplete.mockResolvedValueOnce(
      fakeCompletion(
        JSON.stringify({
          categoryIds: [1],
          buildPlan: [
            "Step 1: Configure API integrations and service accounts",
            "Step 2: Deploy affiliate link tracker for revenue attribution",
            "Step 3: Launch email campaign to subscriber list",
          ],
        }),
      ),
    );

    const res = await request(app)
      .post("/api/ai-orchestrator/execute")
      .set(auth())
      .send({ blueprintSlug: "ai-blog-machine", systemName: "Step Test System" });

    expect(res.status).toBe(201);
    const body = res.body as { instanceId: number; sessionId: number; steps: typeof steps };
    instanceId = body.instanceId;
    sessionId = body.sessionId;
    steps = body.steps;
  });

  it("step 1 (non-final): marks step completed, inserts action event, advances session", async () => {
    const step1 = steps.find((s) => s.stepNumber === 1)!;
    expect(step1).toBeDefined();

    // execute-step calls complete() once for the AI-generated output
    mockComplete.mockResolvedValueOnce(
      fakeCompletion(
        "Configured OpenRouter API key, set up content generation pipeline, validated webhook endpoints.",
      ),
    );

    const res = await request(app)
      .post("/api/build-engine/execute-step")
      .set(auth())
      .send({
        stepId: step1.id,
        stepDescription: step1.notes,
        blueprintName: "AI Blog Content Machine",
        stepNumber: 1,
        totalSteps: steps.length,
        systemInstanceId: instanceId,
        sessionId,
      });

    expect(res.status, JSON.stringify(res.body)).toBe(200);

    const body = res.body as { step: { status: string }; nextStepId: number | null };
    expect(body.step.status).toBe("completed");
    expect(body.nextStepId).toBeGreaterThan(0); // there is a next step

    // Verify DB: step 1 completed
    const [dbStep] = await db
      .select({ status: buildProgressTable.status })
      .from(buildProgressTable)
      .where(eq(buildProgressTable.id, step1.id));
    expect(dbStep.status).toBe("completed");

    // Verify DB: step 2 now in_progress
    const step2 = steps.find((s) => s.stepNumber === 2)!;
    const [dbStep2] = await db
      .select({ status: buildProgressTable.status })
      .from(buildProgressTable)
      .where(eq(buildProgressTable.id, step2.id));
    expect(dbStep2.status).toBe("in_progress");

    // Verify session currentStepNumber advanced
    const [session] = await db
      .select({ currentStepNumber: buildSessionsTable.currentStepNumber })
      .from(buildSessionsTable)
      .where(eq(buildSessionsTable.id, sessionId));
    expect(session.currentStepNumber).toBe(2);

    // Verify action event inserted for step
    const events = await db
      .select()
      .from(systemActivityEventsTable)
      .where(eq(systemActivityEventsTable.systemInstanceId, instanceId));
    const stepEvent = events.find((e) => e.description.includes("Step 1/"));
    expect(stepEvent).toBeDefined();
    expect(stepEvent?.eventType).toBe("action");
  });

  it("REGRESSION (task #272): step mentioning revenue keywords never fabricates a revenue event", async () => {
    const step2 = steps.find((s) => s.stepNumber === 2)!;
    expect(step2).toBeDefined();

    // Even though this step's narrative and description are packed with
    // revenue-signal language ("affiliate link tracker", "$4.50 earned", a
    // literal legacy <SBEP_REVENUE> tag an AI model might still emit), the
    // pipeline must NEVER translate any of this into a real "revenue"
    // activity event or a non-zero response field. Real revenue only comes
    // from the connected-provider sync (lib/revenue/sync.ts).
    mockComplete.mockResolvedValueOnce(
      fakeCompletion(
        "Deployed the affiliate link tracker, configured ClickBank webhook, tracking links active — $4.50 earned.\n" +
          '<SBEP_REVENUE>{"revenueCents": 450, "source": "affiliate", "description": "Affiliate click recorded"}</SBEP_REVENUE>',
      ),
    );

    const res = await request(app)
      .post("/api/build-engine/execute-step")
      .set(auth())
      .send({
        stepId: step2.id,
        stepDescription: "Deploy affiliate link tracker for revenue attribution",
        blueprintName: "AI Blog Content Machine",
        stepNumber: 2,
        totalSteps: steps.length,
        systemInstanceId: instanceId,
        sessionId,
      });

    expect(res.status, JSON.stringify(res.body)).toBe(200);

    // The response must not carry any fabricated revenue figure.
    expect((res.body as Record<string, unknown>).revenueCents).toBeUndefined();

    // Any leftover legacy <SBEP_REVENUE> tag content must be stripped from
    // the stored step narrative, never left dangling as a "confirmed" figure.
    const [dbStep] = await db
      .select({ notes: buildProgressTable.notes })
      .from(buildProgressTable)
      .where(eq(buildProgressTable.id, step2.id));
    expect(dbStep.notes).not.toContain("SBEP_REVENUE");

    // No revenue activity event was inserted for this system instance.
    const events = await db
      .select()
      .from(systemActivityEventsTable)
      .where(eq(systemActivityEventsTable.systemInstanceId, instanceId));
    const revenueEvent = events.find((e) => e.eventType === "revenue");
    expect(revenueEvent).toBeUndefined();
  });

  it("REGRESSION (task #272): AI narrative dollar claims are stripped, never stored or shown verbatim", async () => {
    const step2 = steps.find((s) => s.stepNumber === 2)!;
    expect(step2).toBeDefined();

    mockComplete.mockResolvedValueOnce(
      fakeCompletion(
        "Deployed the affiliate link tracker, configured ClickBank webhook — $4.50 earned so far, with $1,200 in projected monthly revenue.",
      ),
    );

    const res = await request(app)
      .post("/api/build-engine/execute-step")
      .set(auth())
      .send({
        stepId: step2.id,
        stepDescription: "Deploy affiliate link tracker for revenue attribution",
        blueprintName: "AI Blog Content Machine",
        stepNumber: 2,
        totalSteps: steps.length,
        systemInstanceId: instanceId,
        sessionId,
      });

    expect(res.status, JSON.stringify(res.body)).toBe(200);

    // The API response's own output/notes must never surface a raw,
    // unverified dollar figure — narrative dollar claims are sanitized
    // server-side regardless of what the AI model says.
    const responseText = JSON.stringify(res.body);
    expect(responseText).not.toMatch(/\$\s?\d/);

    const [dbStep] = await db
      .select({ notes: buildProgressTable.notes })
      .from(buildProgressTable)
      .where(eq(buildProgressTable.id, step2.id));
    expect(dbStep.notes).not.toMatch(/\$\s?\d/);

    const events = await db
      .select()
      .from(systemActivityEventsTable)
      .where(eq(systemActivityEventsTable.systemInstanceId, instanceId));
    for (const e of events) {
      expect(e.description).not.toMatch(/\$\s?\d/);
    }
  });

  it("final step: sets buildStatus=active, healthStatus=healthy, session=completed", async () => {
    const lastStep = steps.find((s) => s.stepNumber === steps.length)!;
    expect(lastStep).toBeDefined();

    mockComplete.mockResolvedValueOnce(
      fakeCompletion(
        "Email campaign launched, subscriber list activated, monetisation layer live.",
      ),
    );

    const res = await request(app)
      .post("/api/build-engine/execute-step")
      .set(auth())
      .send({
        stepId: lastStep.id,
        stepDescription: "Launch email campaign to subscriber list",
        blueprintName: "AI Blog Content Machine",
        stepNumber: steps.length,
        totalSteps: steps.length,
        systemInstanceId: instanceId,
        sessionId,
      });

    expect(res.status, JSON.stringify(res.body)).toBe(200);

    const body = res.body as { nextStepId: null };
    // No more steps
    expect(body.nextStepId).toBeNull();

    // Verify system instance: buildStatus=active, healthStatus=healthy
    const [instance] = await db
      .select({
        buildStatus: systemInstancesTable.buildStatus,
        healthStatus: systemInstancesTable.healthStatus,
      })
      .from(systemInstancesTable)
      .where(eq(systemInstancesTable.id, instanceId));

    expect(instance.buildStatus).toBe("active");
    expect(instance.healthStatus).toBe("healthy");

    // Verify build session: status=completed
    const [session] = await db
      .select({ status: buildSessionsTable.status })
      .from(buildSessionsTable)
      .where(eq(buildSessionsTable.id, sessionId));

    expect(session.status).toBe("completed");

    // Verify system-live activity event was inserted
    const events = await db
      .select()
      .from(systemActivityEventsTable)
      .where(eq(systemActivityEventsTable.systemInstanceId, instanceId));
    const liveEvent = events.find((e) => e.description.includes("System is now live"));
    expect(liveEvent).toBeDefined();
    expect(liveEvent?.eventType).toBe("action");
  });
});

// ─── 2b. Live Mode really calls connector.execute() (task #272) ─────────────

describe("POST /api/build-engine/execute-step (liveMode)", () => {
  it("REGRESSION (task #272): live mode invokes the real connector.execute(), not just narrative text", async () => {
    // Give the test user a fake Twitter credential so the endpoint's
    // credential-derived connector detection recognises "twitter" as available.
    await db.insert(userCredentialsTable).values({
      userId: testUserId,
      credentialKey: "TWITTER_BEARER_TOKEN",
      encryptedValue: encrypt("fake-bearer-token-for-test"),
      status: "connected",
    });

    // Spy on the real connector's execute() method so we can assert it was
    // actually invoked with the parsed action/params — proving Live Mode
    // performs a genuine connector call rather than only generating narrative.
    const executeSpy = vi
      .spyOn(TwitterConnector.prototype, "execute")
      .mockResolvedValueOnce({ ok: true, data: { id: "tweet_123" } });

    try {
      // Fresh single-step instance so this test is independent of step ordering elsewhere.
      mockComplete.mockResolvedValueOnce(
        fakeCompletion(
          JSON.stringify({ categoryIds: [1], buildPlan: ["Step 1: announce launch on social media"] }),
        ),
      );
      const execRes = await request(app)
        .post("/api/ai-orchestrator/execute")
        .set(auth())
        .send({ blueprintSlug: "ai-blog-machine", systemName: "Live Mode Connector Test System" });
      expect(execRes.status, JSON.stringify(execRes.body)).toBe(201);
      const { instanceId, sessionId, steps: liveSteps } = execRes.body as {
        instanceId: number;
        sessionId: number;
        steps: Array<{ id: number; stepNumber: number; notes: string }>;
      };

      // Re-queue the postTweet AI response since the plan-generation call above consumed one mock.
      mockComplete.mockResolvedValueOnce(
        fakeCompletion(
          '<SBEP_ACTIONS>{"calls":[{"type":"connector_action","connectorId":"twitter","action":"postTweet","params":{"text":"Launching our new system!"}}]}</SBEP_ACTIONS>\n' +
            "Posted an update to Twitter announcing the launch.",
        ),
      );

      const res = await request(app)
        .post("/api/build-engine/execute-step")
        .set(auth())
        .send({
          stepId: liveSteps[0].id,
          stepDescription: liveSteps[0].notes,
          blueprintName: "AI Blog Content Machine",
          stepNumber: 1,
          totalSteps: 1,
          systemInstanceId: instanceId,
          sessionId,
          liveMode: true,
        });

      expect(res.status, JSON.stringify(res.body)).toBe(200);

      // The real TwitterConnector.execute() was actually called with the
      // parsed action/params — this is the "genuine connector action" guarantee,
      // not just an AI narrative claiming an action happened.
      expect(executeSpy).toHaveBeenCalledTimes(1);
      expect(executeSpy).toHaveBeenCalledWith("postTweet", { text: "Launching our new system!" });

      // A connector_executed activity event (not a "revenue" event) was recorded.
      const events = await db
        .select()
        .from(systemActivityEventsTable)
        .where(eq(systemActivityEventsTable.systemInstanceId, instanceId));
      const connectorEvent = events.find((e) => e.eventType === "connector_executed");
      expect(connectorEvent).toBeDefined();
      expect(connectorEvent?.description).toContain("Twitter");
    } finally {
      executeSpy.mockRestore();
      await db.delete(userCredentialsTable).where(eq(userCredentialsTable.userId, testUserId));
    }
  });
});

// ─── 3. GET /api/build-engine/:id/status — reflects live DB state ─────────────

describe("GET /api/build-engine/:id/status", () => {
  it("returns the instance, session, and steps after a full build", async () => {
    // Use the execute endpoint to create a 1-step instance, then complete it.
    mockComplete
      .mockResolvedValueOnce(
        fakeCompletion(
          JSON.stringify({ categoryIds: [1], buildPlan: ["Step 1: deploy live system"] }),
        ),
      )
      .mockResolvedValueOnce(
        fakeCompletion("System deployed live."),
      );

    const execRes = await request(app)
      .post("/api/ai-orchestrator/execute")
      .set(auth())
      .send({ blueprintSlug: "ai-blog-machine", systemName: "Status Check System" });
    expect(execRes.status).toBe(201);

    const { instanceId, sessionId, steps } = execRes.body as {
      instanceId: number;
      sessionId: number;
      steps: Array<{ id: number; stepNumber: number; notes: string }>;
    };

    await request(app)
      .post("/api/build-engine/execute-step")
      .set(auth())
      .send({
        stepId: steps[0].id,
        stepDescription: steps[0].notes,
        blueprintName: "AI Blog Content Machine",
        stepNumber: 1,
        totalSteps: 1,
        systemInstanceId: instanceId,
        sessionId,
      });

    const statusRes = await request(app)
      .get(`/api/build-engine/${instanceId}/status`)
      .set(auth());

    expect(statusRes.status, JSON.stringify(statusRes.body)).toBe(200);

    const body = statusRes.body as {
      instance: { buildStatus: string; healthStatus: string };
      session: { status: string };
      steps: Array<{ status: string }>;
    };

    expect(body.instance.buildStatus).toBe("active");
    expect(body.instance.healthStatus).toBe("healthy");
    expect(body.session.status).toBe("completed");
    expect(body.steps.every((s) => s.status === "completed")).toBe(true);
  });
});

// ─── 4. POST /api/ai-orchestrator/chat — smoke test ──────────────────────────

describe("POST /api/ai-orchestrator/chat", () => {
  it("returns structuredData when SBEP_DATA block is present", async () => {
    const sbepData = {
      action: "present_plan",
      blueprint: { slug: "ai-blog-machine", name: "AI Blog Content Machine" },
      systemName: "TikTok Affiliate Blog System",
      buildSteps: [
        "Step 1: Configure AI content generation",
        "Step 2: Deploy affiliate link tracker",
      ],
      requiredCredentials: [],
    };

    mockComplete.mockResolvedValueOnce(
      fakeCompletion(
        `Here is your build plan.\n\n<SBEP_DATA>${JSON.stringify(sbepData)}</SBEP_DATA>`,
      ),
    );

    const res = await request(app)
      .post("/api/ai-orchestrator/chat")
      .set(auth())
      .send({
        message: "Build me a TikTok affiliate income system",
        history: [],
      });

    expect(res.status, JSON.stringify(res.body)).toBe(200);

    const body = res.body as {
      content: string;
      structuredData: Record<string, unknown> | null;
    };

    expect(body.structuredData).not.toBeNull();
    expect(body.structuredData?.action).toBe("present_plan");
    expect((body.structuredData?.blueprint as { slug: string } | undefined)?.slug).toBe("ai-blog-machine");
    expect(body.structuredData?.systemName).toBe("TikTok Affiliate Blog System");

    // Display content should have the SBEP_DATA block stripped
    expect(body.content).not.toContain("<SBEP_DATA>");
    expect(body.content).toContain("Here is your build plan.");
  });

  it("returns structuredData=null when SBEP_DATA block is absent (reliability regression)", async () => {
    // Simulates the known intermittent issue where gpt-4o-mini omits the SBEP_DATA block.
    // The endpoint should NOT crash — it should return null structuredData gracefully.
    mockComplete.mockResolvedValueOnce(
      fakeCompletion("Here is a detailed plan in prose format without any SBEP_DATA block."),
    );

    const res = await request(app)
      .post("/api/ai-orchestrator/chat")
      .set(auth())
      .send({
        message: "Build me a dropshipping store",
        history: [],
      });

    expect(res.status).toBe(200);
    expect((res.body as { structuredData: null }).structuredData).toBeNull();
  });

  it("filters out history messages with no content field (regression: history 400 bug)", async () => {
    // The server-side Zod schema requires content: z.string() on history entries.
    // The frontend fix filters these out before sending. This test verifies the
    // server rejects malformed history with a 400 (not a 500).
    const res = await request(app)
      .post("/api/ai-orchestrator/chat")
      .set(auth())
      .send({
        message: "Follow-up question",
        history: [
          { role: "user", content: "Build me a system" },
          // This entry has no content field — it's the root cause of the bug.
          { role: "assistant" },
        ],
      });

    // Server-side Zod validation should reject this with 400
    expect(res.status).toBe(400);
  });

  it("rejects request when message is empty", async () => {
    const res = await request(app)
      .post("/api/ai-orchestrator/chat")
      .set(auth())
      .send({ message: "", history: [] });

    expect(res.status).toBe(400);
  });
});

// ─── 5. Auth guard — unauthenticated requests are rejected ───────────────────

describe("Auth guards", () => {
  it("execute endpoint returns 401 without token", async () => {
    const res = await request(app)
      .post("/api/ai-orchestrator/execute")
      .send({ blueprintSlug: "ai-blog-machine" });
    expect(res.status).toBe(401);
  });

  it("execute-step endpoint returns 401 without token", async () => {
    const res = await request(app)
      .post("/api/build-engine/execute-step")
      .send({ stepId: 1, stepDescription: "test", blueprintName: "test", stepNumber: 1, totalSteps: 1, systemInstanceId: 1, sessionId: 1 });
    expect(res.status).toBe(401);
  });

  it("chat endpoint returns 401 without token", async () => {
    const res = await request(app)
      .post("/api/ai-orchestrator/chat")
      .send({ message: "hello", history: [] });
    expect(res.status).toBe(401);
  });
});
