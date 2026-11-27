import { afterAll, beforeAll, expect, it, vi } from "vitest";
import request from "supertest";
import { and, eq, inArray } from "drizzle-orm";

const stripeMock = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  sessionsList: vi.fn(),
  paymentIntentsRetrieve: vi.fn(),
}));
vi.mock("../lib/stripe", () => ({
  getUncachableStripeClient: async () => ({
    webhooks: { constructEvent: stripeMock.constructEvent },
    checkout: { sessions: { list: stripeMock.sessionsList } },
    paymentIntents: { retrieve: stripeMock.paymentIntentsRetrieve },
  }),
}));

import app from "../app";
import { db, usersTable, blueprintsTable, blueprintPurchasesTable, creatorEarningsTable, processedStripeEventsTable } from "@workspace/db";

const tag = `bpr${Date.now()}`;
const eventIds: string[] = [];
let buyer = 0, author = 0, blueprintId = 0;

async function send(type: string, object: unknown) {
  const id = `evt_${tag}_${eventIds.length}`;
  eventIds.push(id);
  stripeMock.constructEvent.mockReturnValue({ id, type, data: { object } });
  return request(app).post("/api/stripe/webhook").set("stripe-signature", "t=1,v1=x")
    .set("Content-Type", "application/json").send("{}");
}

const checkout = (paymentIntent: string) => send("checkout.session.completed", {
  id: `cs_${paymentIntent}`, payment_intent: paymentIntent, mode: "payment", payment_status: "paid", amount_total: 2000,
  metadata: { kind: "blueprint_purchase", blueprintId: String(blueprintId), userId: String(buyer) },
});
const refund = (paymentIntent: string) => {
  stripeMock.sessionsList.mockResolvedValueOnce({ data: [{
    id: `cs_${paymentIntent}`, metadata: { kind: "blueprint_purchase", blueprintId: String(blueprintId), userId: String(buyer) },
  }] });
  return send("charge.refunded", { id: `ch_${paymentIntent}`, amount: 2000, amount_refunded: 2000, payment_intent: paymentIntent });
};
const purchases = () => db.select().from(blueprintPurchasesTable)
  .where(and(eq(blueprintPurchasesTable.blueprintId, blueprintId), eq(blueprintPurchasesTable.buyerUserId, buyer)));

beforeAll(async () => {
  process.env["STRIPE_WEBHOOK_SECRET"] = "whsec_test";
  const rows = await db.insert(usersTable).values([
    { email: `${tag}-buyer@test.dev` }, { email: `${tag}-author@test.dev` },
  ]).returning({ id: usersTable.id });
  [buyer, author] = rows.map((r) => r.id) as [number, number];
  const [bp] = await db.insert(blueprintsTable).values({
    slug: `${tag}-bp`, name: `${tag} blueprint`, authorUserId: author, priceCredits: 100,
  } as typeof blueprintsTable.$inferInsert).returning();
  blueprintId = bp!.id;
});

afterAll(async () => {
  delete process.env["STRIPE_WEBHOOK_SECRET"];
  if (eventIds.length) await db.delete(processedStripeEventsTable).where(inArray(processedStripeEventsTable.eventId, eventIds));
  await db.delete(blueprintsTable).where(eq(blueprintsTable.id, blueprintId));
  await db.delete(usersTable).where(inArray(usersTable.id, [buyer, author]));
});

it("refunding a duplicate blueprint payment keeps the access the first payment granted", async () => {
  stripeMock.paymentIntentsRetrieve.mockResolvedValue({ latest_charge: { refunded: false, disputed: false } });
  expect((await checkout(`pi_${tag}_first`)).status).toBe(200);
  stripeMock.paymentIntentsRetrieve.mockClear();
  expect((await checkout(`pi_${tag}_first`)).status).toBe(200);
  expect(stripeMock.paymentIntentsRetrieve).not.toHaveBeenCalled();
  expect((await checkout(`pi_${tag}_second`)).status).toBe(200);
  expect(await purchases()).toMatchObject([{ paymentRef: `pi_${tag}_first` }]);

  expect((await refund(`pi_${tag}_second`)).status).toBe(200);
  expect(await purchases()).toHaveLength(1);

  expect((await refund(`pi_${tag}_first`)).status).toBe(200);
  expect(await purchases()).toHaveLength(0);
  const earnings = await db.select().from(creatorEarningsTable).where(eq(creatorEarningsTable.buyerUserId, buyer));
  expect(earnings).toMatchObject([{ paymentRef: `pi_${tag}_first`, status: "reversed", amountCents: 1400 }]);
});

it("fulfills a held blueprint payment when the matching dispute is won", async () => {
  const paymentIntent = `pi_${tag}_dispute`;
  const charge = { id: `ch_${tag}_dispute`, payment_intent: paymentIntent, refunded: false, disputed: true };
  stripeMock.paymentIntentsRetrieve.mockResolvedValue({ latest_charge: charge });
  expect((await checkout(paymentIntent)).status).toBe(200);
  expect(await purchases()).toHaveLength(0);

  stripeMock.sessionsList.mockResolvedValueOnce({ data: [{
    id: `cs_${paymentIntent}`, payment_intent: paymentIntent, payment_status: "paid", amount_total: 2000,
    metadata: { kind: "blueprint_purchase", blueprintId: String(blueprintId), userId: String(buyer) },
  }] });
  expect((await send("charge.dispute.closed", { id: `dp_${tag}`, charge, status: "won", amount: 2000 })).status).toBe(200);
  expect(await purchases()).toMatchObject([{ paymentRef: paymentIntent }]);
  const earnings = await db.select().from(creatorEarningsTable).where(eq(creatorEarningsTable.paymentRef, paymentIntent));
  expect(earnings).toMatchObject([{ amountCents: 1400, status: "pending" }]);
  expect((await refund(paymentIntent)).status).toBe(200);
});

it("a refund that arrives before checkout completion doesn't grant access", async () => {
  expect((await refund(`pi_${tag}_early`)).status).toBe(200);
  stripeMock.paymentIntentsRetrieve.mockResolvedValueOnce({ latest_charge: { refunded: true, disputed: false } });
  expect((await checkout(`pi_${tag}_early`)).status).toBe(200);
  expect(await purchases()).toHaveLength(0);
  const [bp] = await db.select().from(blueprintsTable).where(eq(blueprintsTable.id, blueprintId));
  expect(bp!.salesCount).toBe(0);
});
