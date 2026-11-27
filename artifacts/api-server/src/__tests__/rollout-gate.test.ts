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
  const register = (email: string) => request(app).post("/api/auth/register")
    .send({ email, password: "Rollout-test-password-1", name: "Rollout test" });

  expect((await register(closedEmail)).body).toMatchObject({ code: "rollout_closed" });
  expect((await register(testerEmail)).status).toBeLessThan(300);

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
