/**
 * ASH Platform Tools — Route-Wiring Regression Tests
 *
 * WHY THIS EXISTS
 * ---------------
 * The ash-tools router has a critical, non-obvious routing quirk:
 *
 *   Every route in `routes/ash-tools.ts` is REGISTERED under the
 *   `/ai-orchestrator/` prefix, NOT `/ash/`. This is because `app.ts` runs a
 *   URL-rewrite middleware BEFORE the router:
 *
 *       app.use((req, _res, next) => {
 *         if (req.url.startsWith("/api/ash/")) {
 *           req.url = req.url.replace("/api/ash/", "/api/ai-orchestrator/");
 *         }
 *         next();
 *       });
 *
 *   So a public `/api/ash/platform-context` request is rewritten to
 *   `/api/ai-orchestrator/platform-context` before Express matches it. If a
 *   future refactor of `app.ts` (middleware order, the rewrite itself, or route
 *   registration) breaks this alias, ALL platform tools silently 404 — exactly
 *   the bug documented in `.agents/memory/ash-tools-route-prefix.md`.
 *
 * These tests hit the PUBLIC `/api/ash/*` paths (the ones the frontend uses) as
 * an authenticated user and assert real 200s with the correct response shapes —
 * so any regression in the rewrite or route prefix fails loudly here instead of
 * silently in production.
 *
 * Covers:
 *  1. GET  /api/ash/platform-context — 200, shape has systems[]/businesses[]/creditBalance/etc.
 *  2. POST /api/ash/platform-action  — update_system_status / trigger_system_rebuild /
 *     create_business_note return 200 with { ok: true, tool, result }.
 *  3. Both the aliased `/api/ash/*` path AND the direct `/api/ai-orchestrator/*`
 *     path resolve to the same handler.
 *  4. Unauthenticated requests return 401 (not 404) — auth runs after the rewrite.
 *
 * Database:
 *  A unique test user (plus one system instance and one business) is created in
 *  beforeAll and deleted (cascade) in afterAll.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";

import app from "../app";
import {
  db,
  usersTable,
  systemInstancesTable,
  businessesTable,
  businessConnectionsTable,
} from "@workspace/db";

// ─── Test state ───────────────────────────────────────────────────────────────

let testUserId: number;
let authToken: string;
let systemInstanceId: number;
let businessId: number;

const TEST_EMAIL = `ash_platform_tools_${Date.now()}@test.internal`;
const TEST_PASSWORD = "AshPlatform1234!";

// ─── Lifecycle ────────────────────────────────────────────────────────────────

beforeAll(async () => {
  const reg = await request(app)
    .post("/api/auth/register")
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD, name: "ASH Platform Tools" });
  expect(reg.status, `Register failed: ${JSON.stringify(reg.body)}`).toBe(201);

  testUserId = Number((reg.body as { user?: { id: string } }).user?.id ?? 0);
  expect(testUserId).toBeGreaterThan(0);

  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
  expect(login.status, `Login failed: ${JSON.stringify(login.body)}`).toBe(200);

  authToken = (login.body as { token?: string }).token ?? "";
  expect(authToken).toBeTruthy();

  // Seed one system instance and one business owned by the test user so the
  // platform-context response and mutating tools have real rows to act on.
  const [instance] = await db
    .insert(systemInstancesTable)
    .values({ userId: testUserId, name: "Platform Tools Test System", buildStatus: "active" })
    .returning({ id: systemInstancesTable.id });
  systemInstanceId = instance.id;

  const [business] = await db
    .insert(businessesTable)
    .values({ ownerId: testUserId, name: "Platform Tools Test Business", businessType: "custom" })
    .returning({ id: businessesTable.id });
  businessId = business.id;
});

afterAll(async () => {
  if (testUserId) {
    // Cascade deletes system_instances, businesses, business_connections, etc.
    await db.delete(usersTable).where(eq(usersTable.id, testUserId));
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function auth() {
  return { Authorization: `Bearer ${authToken}` };
}

// ─── 1. GET /api/ash/platform-context ────────────────────────────────────────

describe("GET /api/ash/platform-context", () => {
  it("returns 200 (not 401/404) and the full platform snapshot shape via the /ash/ alias", async () => {
    const res = await request(app).get("/api/ash/platform-context").set(auth());

    // A 404 here means the /api/ash/ → /api/ai-orchestrator/ rewrite (or the
    // route prefix) is broken. A 401 means auth wiring regressed.
    expect(res.status, JSON.stringify(res.body)).toBe(200);

    const body = res.body as {
      systems: Array<{ id: number; name: string; status: string }>;
      businesses: Array<{ id: number; name: string }>;
      domains: unknown[];
      landingPages: unknown[];
      landingPageCount: number;
      emailSequences: unknown[];
      emailSequenceCount: number;
      socialAccounts: unknown[];
      creditBalance: number;
      fetchedAt: string;
    };

    expect(Array.isArray(body.systems)).toBe(true);
    expect(Array.isArray(body.businesses)).toBe(true);
    expect(Array.isArray(body.domains)).toBe(true);
    expect(Array.isArray(body.landingPages)).toBe(true);
    expect(Array.isArray(body.emailSequences)).toBe(true);
    expect(Array.isArray(body.socialAccounts)).toBe(true);
    expect(typeof body.creditBalance).toBe("number");
    expect(typeof body.fetchedAt).toBe("string");

    // Our seeded rows are present in the snapshot.
    const seededSystem = body.systems.find((s) => s.id === systemInstanceId);
    expect(seededSystem, "seeded system instance should appear in systems[]").toBeDefined();
    expect(seededSystem?.status).toBe("active");

    const seededBusiness = body.businesses.find((b) => b.id === businessId);
    expect(seededBusiness, "seeded business should appear in businesses[]").toBeDefined();
  });

  it("resolves identically via the direct /api/ai-orchestrator/ path", async () => {
    const res = await request(app).get("/api/ai-orchestrator/platform-context").set(auth());
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(Array.isArray((res.body as { systems: unknown[] }).systems)).toBe(true);
  });

  it("returns 401 (not 404) when unauthenticated — auth runs after the rewrite", async () => {
    const res = await request(app).get("/api/ash/platform-context");
    expect(res.status).toBe(401);
  });
});

// ─── 2. POST /api/ash/platform-action ────────────────────────────────────────

describe("POST /api/ash/platform-action", () => {
  it("update_system_status: pauses the seeded system and returns { ok, tool, result }", async () => {
    const res = await request(app)
      .post("/api/ash/platform-action")
      .set(auth())
      .send({ tool: "update_system_status", params: { id: systemInstanceId, status: "paused" } });

    expect(res.status, JSON.stringify(res.body)).toBe(200);

    const body = res.body as { ok: boolean; tool: string; result: { id: number; buildStatus: string } };
    expect(body.ok).toBe(true);
    expect(body.tool).toBe("update_system_status");
    expect(body.result.id).toBe(systemInstanceId);
    expect(body.result.buildStatus).toBe("paused");

    const [row] = await db
      .select({ buildStatus: systemInstancesTable.buildStatus })
      .from(systemInstancesTable)
      .where(eq(systemInstancesTable.id, systemInstanceId));
    expect(row.buildStatus).toBe("paused");
  });

  it("trigger_system_rebuild: sets buildStatus=building and returns { ok, tool, result }", async () => {
    const res = await request(app)
      .post("/api/ash/platform-action")
      .set(auth())
      .send({ tool: "trigger_system_rebuild", params: { id: systemInstanceId } });

    expect(res.status, JSON.stringify(res.body)).toBe(200);

    const body = res.body as { ok: boolean; tool: string; result: { buildStatus: string } };
    expect(body.ok).toBe(true);
    expect(body.tool).toBe("trigger_system_rebuild");
    expect(body.result.buildStatus).toBe("building");
  });

  it("create_business_note: attaches a note to the seeded business", async () => {
    const res = await request(app)
      .post("/api/ash/platform-action")
      .set(auth())
      .send({ tool: "create_business_note", params: { businessId, note: "ASH platform-tools regression note" } });

    expect(res.status, JSON.stringify(res.body)).toBe(200);

    const body = res.body as {
      ok: boolean;
      tool: string;
      result: { businessId: number; note: string; connectionId: number };
    };
    expect(body.ok).toBe(true);
    expect(body.tool).toBe("create_business_note");
    expect(body.result.businessId).toBe(businessId);
    expect(body.result.connectionId).toBeGreaterThan(0);

    const [conn] = await db
      .select({ metadata: businessConnectionsTable.metadata })
      .from(businessConnectionsTable)
      .where(eq(businessConnectionsTable.id, body.result.connectionId));
    expect(conn.metadata).toBe("ASH platform-tools regression note");
  });

  it("enforces resource ownership: 404 when the system belongs to another user", async () => {
    const res = await request(app)
      .post("/api/ash/platform-action")
      .set(auth())
      .send({ tool: "update_system_status", params: { id: -1, status: "active" } });
    expect(res.status).toBe(404);
  });

  it("returns 401 (not 404) when unauthenticated — auth runs after the rewrite", async () => {
    const res = await request(app)
      .post("/api/ash/platform-action")
      .send({ tool: "update_system_status", params: { id: systemInstanceId, status: "active" } });
    expect(res.status).toBe(401);
  });
});
