import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { eq, inArray, and } from "drizzle-orm";

const stripeMock = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  sessionsList: vi.fn(),
  chargesRetrieve: vi.fn(),
  subscriptionsCancel: vi.fn(),
  invoicePaymentsList: vi.fn(),
  invoicesRetrieve: vi.fn(),
}));
vi.mock("../lib/stripe", () => ({
  getUncachableStripeClient: async () => ({
    webhooks: { constructEvent: stripeMock.constructEvent },
    checkout: { sessions: { list: stripeMock.sessionsList } },
    charges: { retrieve: stripeMock.chargesRetrieve },
    subscriptions: { cancel: stripeMock.subscriptionsCancel },
    invoicePayments: { list: stripeMock.invoicePaymentsList },
    invoices: { retrieve: stripeMock.invoicesRetrieve },
  }),
}));

import app from "../app";
import {
  db, usersTable, subscriptionsTable, blueprintsTable, blueprintPurchasesTable,
  processedStripeEventsTable, notificationsTable, creatorEarningsTable,
} from "@workspace/db";

const tag = `pl${Date.now()}`;
const eventIds: string[] = [];
let buyer = 0, author = 0, subscriber = 0, admin = 0, blueprintId = 0;

async function send(type: string, object: unknown) {
  const id = `evt_${tag}_${eventIds.length}`;
  eventIds.push(id);
  stripeMock.constructEvent.mockReturnValue({ id, type, data: { object } });
  return request(app).post("/api/stripe/webhook").set("stripe-signature", "t=1,v1=x")
    .set("Content-Type", "application/json").send("{}");
}
const user = async (id: number) => (await db.select().from(usersTable).where(eq(usersTable.id, id)))[0]!;
const adminAlerts = async () => {
  await new Promise((r) => setTimeout(r, 50));
  return db.select().from(notificationsTable).where(eq(notificationsTable.userId, admin));
};

beforeAll(async () => {
  process.env["STRIPE_WEBHOOK_SECRET"] = "whsec_test";
  const rows = await db.insert(usersTable).values([
    { email: `${tag}-buyer@test.dev`, walletBalance: 300 },
    { email: `${tag}-author@test.dev`, walletBalance: 50 },
    { email: `${tag}-sub@test.dev`, creditsBalance: 5000, membershipTier: "pro", membershipStatus: "active" },
    { email: `${tag}-admin@test.dev`, role: "SUPER_ADMIN" },
  ]).returning({ id: usersTable.id });
  [buyer, author, subscriber, admin] = rows.map((r) => r.id) as [number, number, number, number];
  await db.insert(subscriptionsTable).values({
    userId: subscriber, stripeCustomerId: `cus_${tag}`, stripeSubscriptionId: `sub_${tag}`, tier: "pro", status: "active",
  });
  const [bp] = await db.insert(blueprintsTable).values({
    slug: `${tag}-bp`, name: `${tag} blueprint`, authorUserId: author, priceCredits: 100, salesCount: 1,
  } as typeof blueprintsTable.$inferInsert).returning();
  blueprintId = bp!.id;
  await db.insert(blueprintPurchasesTable).values({
    blueprintId, buyerUserId: buyer, authorUserId: author, priceCredits: 100, creatorShareCredits: 70,
  });
});

afterAll(async () => {
  delete process.env["STRIPE_WEBHOOK_SECRET"];
  if (eventIds.length) await db.delete(processedStripeEventsTable).where(inArray(processedStripeEventsTable.eventId, eventIds));
  await db.delete(blueprintsTable).where(eq(blueprintsTable.id, blueprintId));
  await db.delete(usersTable).where(inArray(usersTable.id, [buyer, author, subscriber, admin]));
});

describe("Stripe refunds, chargebacks and failed renewals", () => {
  it("full refund of a wallet top-up takes the credits back without going negative", async () => {
    stripeMock.sessionsList.mockResolvedValueOnce({ data: [{ metadata: { kind: "wallet_purchase", credits: "500", userId: String(buyer) } }] });
    const res = await send("charge.refunded", { id: `ch_${tag}_w`, amount: 1000, amount_refunded: 1000, payment_intent: "pi_w" });
    expect(res.status).toBe(200);
    expect((await user(buyer)).walletBalance).toBe(0);
    expect((await adminAlerts()).some((n) => n.title.startsWith("Stripe refund"))).toBe(true);
  });

  it("partial refund leaves access alone and alerts admins", async () => {
    await db.update(usersTable).set({ walletBalance: 300 }).where(eq(usersTable.id, buyer));
    const res = await send("charge.refunded", { id: `ch_${tag}_p`, amount: 1000, amount_refunded: 400, payment_intent: "pi_p" });
    expect(res.status).toBe(200);
    expect(stripeMock.sessionsList).toHaveBeenCalledTimes(1);
    expect((await user(buyer)).walletBalance).toBe(300);
    expect((await adminAlerts()).some((n) => n.title.startsWith("Partial Stripe refund"))).toBe(true);
  });

  it("refunded blueprint purchase is revoked and the creator's share taken back", async () => {
    stripeMock.sessionsList.mockResolvedValueOnce({ data: [{ metadata: { kind: "blueprint_purchase", blueprintId: String(blueprintId), userId: String(buyer) } }] });
    const res = await send("charge.refunded", { id: `ch_${tag}_b`, amount: 2000, amount_refunded: 2000, payment_intent: "pi_b" });
    expect(res.status).toBe(200);
    const purchases = await db.select().from(blueprintPurchasesTable)
      .where(and(eq(blueprintPurchasesTable.blueprintId, blueprintId), eq(blueprintPurchasesTable.buyerUserId, buyer)));
    expect(purchases).toHaveLength(0);
    expect((await user(author)).walletBalance).toBe(0);
    const [bp] = await db.select().from(blueprintsTable).where(eq(blueprintsTable.id, blueprintId));
    expect(bp!.salesCount).toBe(0);
  });

  it("a failed standalone invoice leaves the current plan alone", async () => {
    expect((await send("invoice.payment_failed", { id: `in_${tag}_x`, customer: `cus_${tag}`, amount_due: 500, attempt_count: 1 })).status).toBe(200);
    const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, subscriber));
    expect(sub!.status).toBe("active");
    expect((await user(subscriber)).membershipStatus).toBe("active");
  });

  it("failed renewal marks the plan past due and tells the user and admins", async () => {
    const res = await send("invoice.payment_failed", { id: `in_${tag}`, customer: `cus_${tag}`, amount_due: 2900, attempt_count: 1,
      parent: { subscription_details: { subscription: `sub_${tag}` } } });
    expect(res.status).toBe(200);
    const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, subscriber));
    expect(sub!.status).toBe("past_due");
    expect((await user(subscriber)).membershipStatus).toBe("inactive");
    await new Promise((r) => setTimeout(r, 50));
    const mine = await db.select().from(notificationsTable).where(eq(notificationsTable.userId, subscriber));
    expect(mine.some((n) => n.title.includes("payment didn't go through"))).toBe(true);
  });

  it("dispute pauses membership; winning it restores access", async () => {
    const charge = { id: `ch_${tag}_d`, amount: 2900, customer: `cus_${tag}`, invoice: "in_x" };
    stripeMock.chargesRetrieve.mockResolvedValue(charge);
    stripeMock.sessionsList.mockResolvedValue({ data: [] });
    await db.update(usersTable).set({ membershipStatus: "active" }).where(eq(usersTable.id, subscriber));
    await send("charge.dispute.created", { id: `dp_${tag}`, charge: charge.id, amount: 2900, reason: "fraudulent", status: "needs_response" });
    expect(await user(subscriber)).toMatchObject({ membershipStatus: "inactive", membershipTier: "free" });
    await send("charge.dispute.closed", { id: `dp_${tag}`, charge: charge.id, amount: 2900, status: "won" });
    expect(await user(subscriber)).toMatchObject({ membershipStatus: "active", membershipTier: "pro" });
  });

  it("refunding a payment for an earlier subscription leaves the current plan alone", async () => {
    stripeMock.sessionsList.mockResolvedValueOnce({ data: [] });
    stripeMock.invoicePaymentsList.mockResolvedValueOnce({ data: [{ invoice: "in_old" }] });
    stripeMock.invoicesRetrieve.mockResolvedValueOnce({ id: "in_old", parent: { subscription_details: { subscription: "sub_old" } } });
    const before = await user(subscriber);
    const res = await send("charge.refunded", { id: `ch_${tag}_old`, amount: 2900, amount_refunded: 2900, customer: `cus_${tag}`, payment_intent: "pi_old" });
    expect(res.status).toBe(200);
    const after = await user(subscriber);
    expect(after).toMatchObject({ membershipTier: "pro", creditsBalance: before.creditsBalance });
    expect(stripeMock.subscriptionsCancel).not.toHaveBeenCalled();
  });

  it("losing a dispute on an earlier subscription's payment restores the current plan", async () => {
    const old = { id: `ch_${tag}_old2`, amount: 2900, customer: `cus_${tag}`, payment_intent: "pi_old2" };
    stripeMock.chargesRetrieve.mockResolvedValueOnce(old).mockResolvedValueOnce(old);
    stripeMock.sessionsList.mockResolvedValue({ data: [] });
    stripeMock.invoicePaymentsList.mockResolvedValueOnce({ data: [{ invoice: "in_old2" }] });
    stripeMock.invoicesRetrieve.mockResolvedValueOnce({ id: "in_old2", parent: { subscription_details: { subscription: "sub_old" } } });
    await send("charge.dispute.created", { id: `dp3_${tag}`, charge: old.id, amount: 2900, reason: "fraudulent", status: "needs_response" });
    expect(await user(subscriber)).toMatchObject({ membershipStatus: "inactive", membershipTier: "free" });
    expect((await send("charge.dispute.closed", { id: `dp3_${tag}`, charge: old.id, amount: 2900, status: "lost" })).status).toBe(200);
    expect(await user(subscriber)).toMatchObject({ membershipStatus: "active", membershipTier: "pro" });
    expect(stripeMock.subscriptionsCancel).not.toHaveBeenCalled();
  });

  it("lost chargeback on a subscription ends the plan, takes back credits and cancels in Stripe", async () => {
    stripeMock.subscriptionsCancel.mockResolvedValue({});
    stripeMock.invoicesRetrieve.mockResolvedValueOnce({ id: "in_x", parent: { subscription_details: { subscription: `sub_${tag}` } } });
    const res = await send("charge.dispute.closed", { id: `dp2_${tag}`, charge: `ch_${tag}_d`, amount: 2900, status: "lost" });
    expect(res.status).toBe(200);
    const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, subscriber));
    expect(sub).toMatchObject({ tier: "free", status: "inactive" });
    const u = await user(subscriber);
    expect(u.membershipTier).toBe("free");
    expect(u.creditsBalance).toBeLessThan(5000);
    await new Promise((r) => setTimeout(r, 50));
    expect(stripeMock.subscriptionsCancel).toHaveBeenCalledWith(`sub_${tag}`);
  });

  it("an open dispute holds the sale's creator earning; winning it releases the hold", async () => {
    const [e] = await db.insert(creatorEarningsTable).values({
      userId: author, buyerUserId: buyer, paymentRef: "pi_hold", grossCents: 1000, amountCents: 700, status: "available", availableAt: new Date(Date.now() - 1000),
    }).returning();
    const charge = { id: `ch_${tag}_h`, amount: 1000, payment_intent: "pi_hold" };
    stripeMock.sessionsList.mockResolvedValue({ data: [{ id: "cs_hold", metadata: { kind: "blueprint_purchase", userId: String(buyer), blueprintId: String(blueprintId) } }] });
    await send("charge.dispute.created", { id: `dph_${tag}`, charge, amount: 1000, status: "needs_response" });
    let [row] = await db.select().from(creatorEarningsTable).where(eq(creatorEarningsTable.id, e!.id));
    expect(row!.status).toBe("pending");
    expect(row!.availableAt.getUTCFullYear()).toBe(9999);
    await send("charge.dispute.closed", { id: `dph_${tag}`, charge, amount: 1000, status: "won" });
    [row] = await db.select().from(creatorEarningsTable).where(eq(creatorEarningsTable.id, e!.id));
    expect(row!.availableAt.getUTCFullYear()).toBeLessThan(3000);
    stripeMock.sessionsList.mockReset();
    await db.delete(creatorEarningsTable).where(eq(creatorEarningsTable.id, e!.id));
  });

  it("a retried event is applied once", async () => {
    stripeMock.sessionsList.mockResolvedValue({ data: [{ metadata: { kind: "wallet_purchase", credits: "100", userId: String(buyer) } }] });
    await db.update(usersTable).set({ walletBalance: 300 }).where(eq(usersTable.id, buyer));
    const id = `evt_${tag}_dup`;
    eventIds.push(id);
    stripeMock.constructEvent.mockReturnValue({ id, type: "charge.refunded", data: { object: { id: `ch_${tag}_dup`, amount: 500, amount_refunded: 500, payment_intent: "pi_d" } } });
    for (let i = 0; i < 2; i++) {
      await request(app).post("/api/stripe/webhook").set("stripe-signature", "t=1,v1=x").set("Content-Type", "application/json").send("{}");
    }
    expect((await user(buyer)).walletBalance).toBe(200);
  });
});
