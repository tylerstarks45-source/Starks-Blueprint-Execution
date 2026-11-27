/** Connector actions ASH proposes outside the agent loop follow the owner's ASH Control settings. */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app";
import { db, usersTable, ashControlSettingsTable, pendingApprovalsTable, businessesTable, systemInstancesTable, userCredentialsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { SlackConnector } from "../lib/connectors/slack-connector";
import { StripeConnector } from "../lib/connectors/stripe-connector";
import { encrypt } from "../lib/crypto";

let userId: number;
const auth = () => ({ Authorization: `Bearer ${jwt.sign({ sub: userId, email: "", role: "USER", tokenVersion: 1 }, process.env["SESSION_SECRET"]!)}` });

beforeAll(async () => {
  const [u] = await db.insert(usersTable).values({ email: `conn_auth_${Date.now()}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "starter" }).returning({ id: usersTable.id });
  userId = u!.id;
  await db.insert(ashControlSettingsTable).values({ userId, level: "advisor" });
}, 120_000);
afterAll(async () => { await db.delete(usersTable).where(eq(usersTable.id, userId)); });

describe("connector action authority", () => {
  it("queues a connector action for approval when ASH is set to Advisor", async () => {
    const res = await request(app).post("/api/ash/connector-action").set(auth()).send({ connectorId: "slack", action: "postMessage", params: { text: "hi" } });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: false, status: "awaiting_approval" });
    expect(res.body.error).toContain("Advisor");
  });

  it("queues it for approval when the owner requires approval for connected services", async () => {
    await db.update(ashControlSettingsTable).set({ level: "operator", approvalRequired: ["connect_service"] }).where(eq(ashControlSettingsTable.userId, userId));
    const res = await request(app).post("/api/ash/connector-action").set(auth()).send({ connectorId: "slack", action: "postMessage", params: { text: "hi" } });
    expect(res.body).toMatchObject({ ok: false, status: "awaiting_approval" });
    const [approval] = await db.select().from(pendingApprovalsTable).where(eq(pendingApprovalsTable.id, res.body.approvalId));
    expect(approval).toMatchObject({ userId, status: "pending" });
    expect(approval!.payload).toMatchObject({ action: "run_connector_action", connectorId: "slack", connectorAction: "postMessage", params: { text: "hi" } });

    const execute = vi.spyOn(SlackConnector.prototype, "execute").mockResolvedValue({ ok: true });
    try {
      const approve = () => request(app).post(`/api/approvals/${approval!.id}/approve`).set(auth());
      const [credential] = await db.insert(userCredentialsTable)
        .values({ userId, credentialKey: new SlackConnector({}).requiredCredentials[0]!, encryptedValue: encrypt("test-credential"), status: "disconnected" })
        .returning({ id: userCredentialsTable.id });
      expect((await approve()).status).toBe(400);
      expect(execute).not.toHaveBeenCalled();

      await db.update(userCredentialsTable).set({ status: "connected" }).where(eq(userCredentialsTable.id, credential!.id));
      expect((await approve()).body).toMatchObject({ status: "approved" });
      expect(execute).toHaveBeenCalledExactlyOnceWith("postMessage", { text: "hi" });
      expect((await approve()).status).toBe(400);
      expect(execute).toHaveBeenCalledTimes(1);
    } finally {
      execute.mockRestore();
      await db.delete(userCredentialsTable).where(eq(userCredentialsTable.userId, userId));
    }
  });

  it("uses the settings of the business linked to the system", async () => {
    const [instance] = await db.insert(systemInstancesTable).values({ userId, name: "Linked system" }).returning({ id: systemInstancesTable.id });
    const [business] = await db.insert(businessesTable).values({ ownerId: userId, name: "Linked biz", systemInstanceId: instance!.id }).returning({ id: businessesTable.id });
    await db.insert(ashControlSettingsTable).values({ userId, businessId: business!.id, level: "operator", approvalRequired: [] });
    const res = await request(app).post("/api/ash/connector-action").set(auth())
      .send({ connectorId: "slack", action: "postMessage", params: { text: "hi" }, systemInstanceId: instance!.id });
    // The account queues connector actions, but the linked business lets ASH run them, so it is attempted (and fails without a Slack key).
    expect(res.body).toMatchObject({ ok: false, error: expect.stringContaining("missing credentials") });
    expect(res.body.approvalId).toBeUndefined();

    await db.update(businessesTable).set({ status: "paused" }).where(eq(businessesTable.id, business!.id));
    const paused = await request(app).post("/api/ash/connector-action").set(auth())
      .send({ connectorId: "slack", action: "postMessage", systemInstanceId: instance!.id });
    expect(paused.body).toMatchObject({ ok: false, status: "not_allowed" });
  });

  it("rejects an unowned system instead of falling back to account settings", async () => {
    const res = await request(app).post("/api/ash/connector-action").set(auth())
      .send({ connectorId: "slack", action: "postMessage", systemInstanceId: 2147483647 });
    expect(res.status).toBe(404);
  });

  it("requires a connected tenant credential before running an approved Stripe action", async () => {
    const pending = await request(app).post("/api/ash/connector-action").set(auth())
      .send({ connectorId: "stripe", action: "getBalance" });
    expect(pending.body).toMatchObject({ status: "awaiting_approval" });
    const res = await request(app).post(`/api/approvals/${pending.body.approvalId}/approve`).set(auth());
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("missing credentials");
  });

  it("keeps the Stripe checkout link on the executed approval", async () => {
    const checkoutUrl = "https://checkout.stripe.com/c/pay/test-checkout";
    const [credential] = await db.insert(userCredentialsTable).values({
      userId, credentialKey: "STRIPE_SECRET_KEY", encryptedValue: encrypt("test-stripe-key"), status: "connected",
    }).returning({ id: userCredentialsTable.id });
    const execute = vi.spyOn(StripeConnector.prototype, "execute").mockResolvedValue({ ok: true, data: { checkoutUrl } });
    try {
      const pending = await request(app).post("/api/ash/connector-action").set(auth())
        .send({ connectorId: "stripe", action: "createCheckout" });
      expect(pending.body).toMatchObject({ status: "awaiting_approval" });
      const approved = await request(app).post(`/api/approvals/${pending.body.approvalId}/approve`).set(auth());
      expect(approved.status, JSON.stringify(approved.body)).toBe(200);
      expect(approved.body).toMatchObject({ status: "approved", checkoutUrl });
      const list = await request(app).get("/api/approvals?status=approved").set(auth());
      expect(list.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: pending.body.approvalId, checkoutUrl })]));
    } finally {
      execute.mockRestore();
      await db.delete(userCredentialsTable).where(eq(userCredentialsTable.id, credential!.id));
    }
  });

  it("requests a Stripe checkout without separate product or price writes", async () => {
    const stripe = {
      checkout: { sessions: { create: vi.fn().mockRejectedValue(new Error("Checkout rejected")) } },
      products: { create: vi.fn() },
      prices: { create: vi.fn() },
    };
    const connector = new StripeConnector({ STRIPE_SECRET_KEY: "test-stripe-key" });
    const getClient = vi.spyOn(connector as unknown as { getClient: () => Promise<typeof stripe> }, "getClient")
      .mockResolvedValue(stripe);
    try {
      const params = { productName: "Test product", amountCents: 1500 };
      for (let i = 0; i < 2; i++) expect(await connector.execute("createCheckout", params)).toMatchObject({ ok: false });
      expect(stripe.checkout.sessions.create).toHaveBeenCalledTimes(2);
      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
        line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: 1500, product_data: { name: "Test product" } } }],
      }));
      expect(stripe.products.create).not.toHaveBeenCalled();
      expect(stripe.prices.create).not.toHaveBeenCalled();
    } finally {
      getClient.mockRestore();
    }
  });

  it("accepts a replacement credential after the original expires", async () => {
    const credentialKey = new SlackConnector({}).requiredCredentials[0]!;
    const [expired] = await db.insert(userCredentialsTable).values({
      userId, credentialKey, encryptedValue: encrypt("expired-token"), status: "expired", expiresAt: new Date(0),
    }).returning({ id: userCredentialsTable.id });
    try {
      const replacement = await request(app).post("/api/user-credentials").set(auth())
        .send({ credentialKey, encryptedValue: Buffer.from("replacement-token").toString("base64") });
      expect(replacement.status).toBe(200);
      expect(replacement.body).toMatchObject({ id: expired!.id });
      const [stored] = await db.select().from(userCredentialsTable).where(eq(userCredentialsTable.id, expired!.id));
      expect(stored).toMatchObject({ status: "connected", expiresAt: null });
    } finally {
      await db.delete(userCredentialsTable).where(eq(userCredentialsTable.id, expired!.id));
    }
  });
});
