import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import jwt from "jsonwebtoken";
import request from "supertest";
import { db, usersTable } from "@workspace/db";
import app from "../app";

const stamp = Date.now();
const testerEmail = `rollout_tester_${stamp}@test.internal`;
const closedEmail = `rollout_closed_${stamp}@test.internal`;
let userId: number;

beforeAll(async () => {
  const [user] = await db.insert(usersTable).values({
    email: `rollout_buyer_${stamp}@test.internal`, role: "USER", membershipStatus: "active",
  }).returning({ id: usersTable.id });
  userId = user!.id;
});

afterEach(() => { vi.unstubAllEnvs(); });

afterAll(async () => {
  await db.delete(usersTable).where(inArray(usersTable.email, [testerEmail, closedEmail]));
  await db.delete(usersTable).where(eq(usersTable.id, userId));
});

it("keeps production signup and new checkouts closed until the public rollout opens", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("PUBLIC_ROLLOUT_OPEN", "");
  vi.stubEnv("ROLLOUT_ALLOWED_EMAILS", testerEmail.toUpperCase());
  const password = "Rollout-test-password-1";
  const register = (email: string) => request(app).post("/api/auth/register")
    .send({ email, password, name: "Rollout test" });
  const login = () => request(app).post("/api/auth/login").send({ email: testerEmail, password });

  expect((await register(closedEmail)).body).toMatchObject({ code: "rollout_closed" });

  // An allowlisted address only unlocks pre-launch access after its owner verifies it.
  const tester = await register(testerEmail);
  expect(tester.status).toBe(201);
  expect(tester.body.token).toBeUndefined();
  expect((await login()).body.code).toBe("email_unverified");
  const testerToken = jwt.sign({ sub: tester.body.user.id, role: "USER", tokenVersion: 1 }, process.env["SESSION_SECRET"]!);
  const unverifiedCheckout = await request(app).post("/api/subscriptions/checkout").auth(testerToken, { type: "bearer" }).send({ tier: "builder" });
  expect(unverifiedCheckout.body.code).toBe("rollout_closed");

  await db.update(usersTable).set({ emailVerified: true }).where(eq(usersTable.email, testerEmail));
  expect((await login()).body.token).toEqual(expect.any(String));
  const verifiedCheckout = await request(app).post("/api/subscriptions/checkout").auth(testerToken, { type: "bearer" }).send({ tier: "builder" });
  expect(verifiedCheckout.body.code).not.toBe("rollout_closed");

  const token = jwt.sign({ sub: userId, role: "USER", tokenVersion: 1 }, process.env["SESSION_SECRET"]!);
  for (const [path, body] of [
    ["/api/subscriptions/checkout", { tier: "builder" }],
    ["/api/credits/checkout/custom", { dollars: 10 }],
  ] as const) {
    const res = await request(app).post(path).auth(token, { type: "bearer" }).send(body);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("rollout_closed");
  }

  vi.stubEnv("PUBLIC_ROLLOUT_OPEN", "true");
  const opened = await request(app).post("/api/subscriptions/checkout").auth(token, { type: "bearer" }).send({ tier: "builder" });
  expect(opened.body.code).not.toBe("rollout_closed");
});
