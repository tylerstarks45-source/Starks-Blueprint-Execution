/** Connector actions ASH proposes outside the agent loop follow the owner's ASH Control settings. */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app";
import { db, usersTable, ashControlSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

let userId: number;
const auth = () => ({ Authorization: `Bearer ${jwt.sign({ sub: userId, email: "", role: "USER", tokenVersion: 1 }, process.env["SESSION_SECRET"]!)}` });

beforeAll(async () => {
  const [u] = await db.insert(usersTable).values({ email: `conn_auth_${Date.now()}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "starter" }).returning({ id: usersTable.id });
  userId = u!.id;
}, 120_000);
afterAll(async () => { await db.delete(usersTable).where(eq(usersTable.id, userId)); });

describe("connector action authority", () => {
  it("does not run a connector action when ASH is set to Advisor", async () => {
    await db.insert(ashControlSettingsTable).values({ userId, level: "advisor" });
    const res = await request(app).post("/api/ash/connector-action").set(auth()).send({ connectorId: "slack", action: "postMessage", params: { text: "hi" } });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: false, status: "not_allowed" });
    expect(res.body.error).toContain("Advisor");
  });

  it("does not run it when the owner requires approval for connected services", async () => {
    await db.update(ashControlSettingsTable).set({ level: "operator", approvalRequired: ["connect_service"] }).where(eq(ashControlSettingsTable.userId, userId));
    const res = await request(app).post("/api/ash/connector-action").set(auth()).send({ connectorId: "slack", action: "postMessage", params: { text: "hi" } });
    expect(res.body).toMatchObject({ ok: false, status: "not_allowed" });
  });
});
