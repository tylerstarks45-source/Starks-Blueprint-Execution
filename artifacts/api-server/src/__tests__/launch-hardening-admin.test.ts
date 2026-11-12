/**
 * requireAdmin is async. Calling it without `await` makes the check a no-op:
 * the caller gets a 401/403 but the handler still runs (launch-hardening did
 * this, so anonymous callers could trigger admin mutations).
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import request from "supertest";
import jwt from "jsonwebtoken";

const recalculate = vi.hoisted(() => vi.fn(async () => ({ updated: 0 })));
vi.mock("../lib/launch-hardening/lh-priority-engine", () => ({ recalculateAllPriorities: recalculate }));
vi.mock("../lib/openrouter", () => ({ complete: vi.fn(), streamCompletion: vi.fn() }));

import app from "../app";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

let userId: number;
beforeAll(async () => {
  const [u] = await db
    .insert(usersTable)
    .values({ email: `lh_user_${Date.now()}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "starter" })
    .returning({ id: usersTable.id });
  userId = u.id;
});
afterAll(async () => {
  await db.delete(usersTable).where(eq(usersTable.id, userId));
});

describe("launch-hardening admin guard", () => {
  it("does not run the handler for anonymous or non-admin callers", async () => {
    const anon = await request(app).post("/api/launch-hardening/recalculate");
    const token = jwt.sign({ sub: userId, email: "", role: "USER", tokenVersion: 1 }, process.env["SESSION_SECRET"]!);
    const user = await request(app).post("/api/launch-hardening/recalculate").set("Authorization", `Bearer ${token}`);
    await new Promise((r) => setTimeout(r, 200));
    expect(anon.status).toBe(401);
    expect(user.status).toBe(403);
    expect(recalculate).not.toHaveBeenCalled();
  });

  it("every async auth helper call in routes is awaited", () => {
    const dir = path.resolve(__dirname, "../routes");
    const unawaited = /(?<!(await|return)\s*\(?\s*)\b(requireAdmin|requireAuthActive|getActiveCallerPayload)\(req\b/;
    const offenders = readdirSync(dir, { recursive: true, encoding: "utf8" })
      .filter((f) => f.endsWith(".ts"))
      .flatMap((f) =>
        readFileSync(path.join(dir, f), "utf8")
          .split("\n")
          .map((line, i) => ({ where: `${f}:${i + 1}`, line }))
          .filter(({ line }) => unawaited.test(line)),
      )
      .map(({ where, line }) => `${where}: ${line.trim()}`);
    expect(offenders).toEqual([]);
  });
});
