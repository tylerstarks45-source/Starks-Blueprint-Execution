/**
 * Authorization sweep: enumerates every mutating route registered on the app and
 * checks that anonymous callers are rejected (401/403) unless the route is on the
 * explicit public allowlist, and that a plain USER cannot call admin-only routes.
 * A new mutating route that forgets its auth check fails this test.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";

vi.mock("../lib/openrouter", () => ({ complete: vi.fn(), streamCompletion: vi.fn() }));

type Route = { method: string; path: string };
const MUTATING = new Set(["post", "put", "patch", "delete"]);

// Intentionally public mutating routes (auth flows, inbound webhooks, tracking pixels, form submits).
const PUBLIC_ROUTES = new Set([
  "POST /api/auth/register",
  "POST /api/auth/login",
  "POST /api/auth/logout",
  "POST /api/auth/request-reset",
  "POST /api/auth/reset-password",
  "POST /api/auth/resend-verification",
  "POST /api/auth/admin-bootstrap", // token-gated; 404 unless ADMIN_BOOTSTRAP_TOKEN is set
  "POST /api/contact",
  "POST /api/affiliate-links/:id/click",
  "POST /api/stripe/webhook", // Stripe signature
  "POST /api/affiliate/:linkId/conversion",
  "POST /api/landing-pages/:id/submit",
  "POST /api/pages/:id/submit",
  "POST /api/webhooks/:token", // per-webhook secret token
  "POST /api/webhooks/sendgrid", // SendGrid signature
  "POST /api/email/webhooks/sendgrid",
  "POST /api/public/ab-tests/:token/convert",
  "POST /api/referrals/:code/click",
  "POST /api/leaderboard/events/:id/share",
]);

// Admin-only routes whose path does not contain "/admin".
const ADMIN_ONLY_EXTRA: Route[] = [
  { method: "post", path: "/api/tools" },
  { method: "patch", path: "/api/tools/:id" },
  { method: "delete", path: "/api/tools/:id" },
  { method: "post", path: "/api/tool-categories" },
  { method: "delete", path: "/api/tool-categories/:id" },
  { method: "post", path: "/api/blueprint-categories" },
  { method: "delete", path: "/api/blueprint-categories/:id" },
  { method: "post", path: "/api/affiliate-links" },
  { method: "delete", path: "/api/affiliate-links/:id" },
  { method: "patch", path: "/api/users/:id" },
  { method: "delete", path: "/api/users/:id" },
  { method: "patch", path: "/api/leaderboard/events/:id/feature" },
];

// Record each router's mount path so routes can be enumerated with full URLs.
// express.Router() returns a function whose prototype is a Router instance, so
// the shared prototype is one level further up.
const routerProto = Object.getPrototypeOf(Object.getPrototypeOf(express.Router()));
const originalUse = routerProto.use;
routerProto.use = function (this: unknown, ...args: any[]) {
  const mount = typeof args[0] === "string" ? args[0] : Array.isArray(args[0]) ? args[0][0] : "";
  for (const a of args) if (typeof a === "function" && Array.isArray(a.stack)) a.__mount = mount;
  return originalUse.apply(this, args);
};

function collect(stack: any[], prefix: string, out: Route[]): void {
  for (const layer of stack) {
    if (layer.route) {
      const paths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
      for (const p of paths) {
        for (const m of Object.keys(layer.route.methods)) {
          if (MUTATING.has(m)) out.push({ method: m, path: prefix + p });
        }
      }
    } else if (Array.isArray(layer.handle?.stack)) {
      collect(layer.handle.stack, prefix + (layer.handle.__mount ?? ""), out);
    }
  }
}

const key = (r: Route) => `${r.method.toUpperCase()} ${r.path}`;
const concrete = (path: string) => path.replace(/:[A-Za-z_]+/g, "999999999");

let app: express.Express;
const routes: Route[] = [];
let userId: number;
let userToken: string;

beforeAll(async () => {
  // The sweep fires hundreds of anonymous requests; keep the AI rate limiter from masking missing auth with 429s.
  process.env["AI_RATE_LIMIT_PER_MINUTE"] = "100000";
  app = (await import("../app")).default;
  routerProto.use = originalUse;
  collect((app as any).router.stack, "", routes);

  const { db, usersTable } = await import("@workspace/db");
  const [u] = await db
    .insert(usersTable)
    .values({ email: `auth_sweep_${Date.now()}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "starter" })
    .returning({ id: usersTable.id });
  userId = u.id;
  userToken = jwt.sign({ sub: userId, email: "", role: "USER", tokenVersion: 1 }, process.env["SESSION_SECRET"]!);
  // Importing the whole app is slow on a cold transform cache.
}, 120_000);

afterAll(async () => {
  const { db, usersTable } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");
  await db.delete(usersTable).where(eq(usersTable.id, userId));
});

describe("route authorization sweep", () => {
  it("enumerates the app's mutating routes", () => {
    expect(routes.length).toBeGreaterThan(300);
    expect(routes.some((r) => r.path === "/api/businesses" && r.method === "post")).toBe(true);
  });

  it("serves the Build 011-024 engines under /api/<engine> (legacy /api/api/<engine> still works)", async () => {
    for (const url of ["/api/business-graph/businesses/1/nodes", "/api/api/business-graph/businesses/1/nodes"]) {
      const res = await request(app).post(url).send({});
      expect(res.status, url).toBe(401);
    }
  });

  it("rejects anonymous callers on every non-public mutating route", async () => {
    const open: string[] = [];
    for (const r of routes) {
      if (PUBLIC_ROUTES.has(key(r))) continue;
      const res = await (request(app) as any)[r.method](concrete(r.path)).send({});
      if (res.status !== 401 && res.status !== 403) open.push(`${key(r)} -> ${res.status}`);
    }
    expect(open).toEqual([]);
  }, 300_000);

  it("rejects a plain USER on admin-only routes", async () => {
    const adminRoutes = [...routes.filter((r) => /\/admin(\/|-)/.test(r.path) && !PUBLIC_ROUTES.has(key(r))), ...ADMIN_ONLY_EXTRA];
    expect(adminRoutes.length).toBeGreaterThan(20);
    const allowed: string[] = [];
    for (const r of adminRoutes) {
      const res = await (request(app) as any)[r.method](concrete(r.path)).set("Authorization", `Bearer ${userToken}`).send({});
      if (res.status !== 403 && res.status !== 401) allowed.push(`${key(r)} -> ${res.status}`);
    }
    expect(allowed).toEqual([]);
  }, 300_000);

  it("keeps business-graph data scoped to the business owner", async () => {
    const { db, usersTable, businessesTable } = await import("@workspace/db");
    const { eq, inArray } = await import("drizzle-orm");
    const [owner] = await db
      .insert(usersTable)
      .values({ email: `auth_sweep_owner_${Date.now()}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "starter" })
      .returning({ id: usersTable.id });
    const ownerToken = jwt.sign({ sub: owner.id, email: "", role: "USER", tokenVersion: 1 }, process.env["SESSION_SECRET"]!);
    const [biz] = await db.insert(businessesTable).values({ ownerId: owner.id, name: "Graph Owner Co", businessType: "saas" }).returning({ id: businessesTable.id });
    try {
      const asOwner = (method: "get" | "post" | "patch", url: string) => (request(app) as any)[method](url).set("Authorization", `Bearer ${ownerToken}`);
      const asOther = (method: "get" | "post" | "patch", url: string) => (request(app) as any)[method](url).set("Authorization", `Bearer ${userToken}`);

      const node = await asOwner("post", `/api/business-graph/businesses/${biz.id}/nodes`).send({ nodeType: "product", name: "Core product" });
      expect(node.status).toBe(201);
      const kpi = await asOwner("post", `/api/business-graph/businesses/${biz.id}/kpis`).send({ name: "MRR", kpiType: "revenue" });
      expect(kpi.status).toBe(201);
      const nodeId = node.body.node.id;
      const kpiId = kpi.body.kpi.id;

      expect((await asOwner("get", `/api/business-graph/businesses/${biz.id}/nodes`)).status).toBe(200);
      expect((await asOwner("get", `/api/business-graph/nodes/${nodeId}`)).status).toBe(200);
      expect((await asOwner("get", `/api/business-graph/kpis/${kpiId}/history`)).status).toBe(200);

      for (const [method, url] of [
        ["get", `/api/business-graph/businesses/${biz.id}/nodes`],
        ["get", `/api/business-graph/businesses/${biz.id}/kpis`],
        ["get", `/api/business-graph/businesses/${biz.id}/edges`],
        ["get", `/api/business-graph/businesses/${biz.id}/snapshots`],
        ["post", `/api/business-graph/businesses/${biz.id}/kpis`],
        ["get", `/api/business-graph/nodes/${nodeId}`],
        ["patch", `/api/business-graph/nodes/${nodeId}`],
        ["get", `/api/business-graph/kpis/${kpiId}/history`],
        ["post", `/api/business-graph/kpis/${kpiId}/record`],
        ["get", `/api/api/business-graph/businesses/${biz.id}/nodes`],
        ["get", `/api/business-graph/businesses/${biz.id}.0/nodes`],
        ["get", `/api/business-graph/businesses/${biz.id}abc/nodes`],
      ] as const) {
        const res = await asOther(method, url).send({ name: "x", kpiType: "revenue", value: 1 });
        expect(res.status, `${method.toUpperCase()} ${url}`).toBe(404);
      }
    } finally {
      await db.delete(businessesTable).where(eq(businessesTable.id, biz.id));
      await db.delete(usersTable).where(inArray(usersTable.id, [owner.id]));
    }
  });
});
