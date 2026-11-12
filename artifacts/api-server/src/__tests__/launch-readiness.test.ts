import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import request from "supertest";
import app from "../app";
import { checkEnv } from "../lib/env-check";

let userId = 0;
let token = "";

beforeAll(async () => {
  const email = `launch-${Date.now()}@example.com`;
  const reg = await request(app).post("/api/auth/register").send({ email, password: "Launch-Test-Pass-123!", name: "Launch Test" });
  expect(reg.status).toBe(201);
  userId = Number(reg.body.user?.id ?? 0);
  token = reg.body.token ?? (await request(app).post("/api/auth/login").send({ email, password: "Launch-Test-Pass-123!" })).body.token;
});

afterAll(async () => {
  if (userId) await db.delete(usersTable).where(eq(usersTable.id, userId));
});

describe("launch readiness", () => {
  it("readyz reports the database as reachable", async () => {
    const res = await request(app).get("/api/readyz");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ready", db: "ok" });
  });

  it("unknown API routes return JSON 404", async () => {
    const res = await request(app).get("/api/zz-launch-check/does/not/exist/anywhere").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Not found" });
  });

  it("malformed JSON returns a JSON 400 without internals", async () => {
    const res = await request(app).post("/api/auth/login").set("Content-Type", "application/json").send("{bad json");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Malformed JSON body" });
  });

  it("disallowed CORS origin returns JSON 403", async () => {
    const res = await request(app).get("/api/healthz").set("Origin", "https://evil.example");
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "Origin not allowed" });
  });

  it("checkEnv flags missing and invalid required settings", () => {
    const r = checkEnv({ DATABASE_URL: "postgres://x", SESSION_SECRET: "short", CREDENTIAL_ENCRYPTION_KEY: "zz" } as NodeJS.ProcessEnv);
    expect(r.errors.some((e) => e.startsWith("SESSION_SECRET is invalid"))).toBe(true);
    expect(r.errors.some((e) => e.startsWith("CREDENTIAL_ENCRYPTION_KEY is invalid"))).toBe(true);
    expect(r.errors.some((e) => e.startsWith("OPENROUTER_API_KEY is not set"))).toBe(true);
    expect(r.warnings.some((w) => w.startsWith("STRIPE_SECRET_KEY"))).toBe(true);
    const ok = checkEnv({ DATABASE_URL: "x", SESSION_SECRET: "a".repeat(32), CREDENTIAL_ENCRYPTION_KEY: "a".repeat(64), OPENROUTER_API_KEY: "k" } as NodeJS.ProcessEnv);
    expect(ok.errors).toEqual([]);
  });
});
