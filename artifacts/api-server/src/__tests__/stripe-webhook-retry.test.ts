import { describe, it, expect, vi, afterAll } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";

const constructEvent = vi.fn();
vi.mock("../lib/stripe", () => ({
  getUncachableStripeClient: async () => ({ webhooks: { constructEvent } }),
}));

import app from "../app";
import { db, processedStripeEventsTable } from "@workspace/db";

const eventId = `evt_retry_${Date.now()}`;
process.env["STRIPE_WEBHOOK_SECRET"] = "whsec_test";

afterAll(async () => {
  await db.delete(processedStripeEventsTable).where(eq(processedStripeEventsTable.eventId, eventId));
  delete process.env["STRIPE_WEBHOOK_SECRET"];
});

const claimed = async () =>
  (await db.select().from(processedStripeEventsTable).where(eq(processedStripeEventsTable.eventId, eventId))).length;

describe("Stripe webhook retries", () => {
  it("releases the event claim when processing fails so Stripe's retry is applied", async () => {
    // data missing → handler throws after the event id was claimed
    constructEvent.mockReturnValue({ id: eventId, type: "checkout.session.completed" });
    const res = await request(app).post("/api/stripe/webhook").set("stripe-signature", "t=1,v1=x").set("Content-Type", "application/json").send("{}");
    expect(res.status).toBe(500);
    expect(await claimed()).toBe(0);
  });

  it("still ignores true duplicates after a successful run", async () => {
    constructEvent.mockReturnValue({ id: eventId, type: "some.unhandled.event", data: { object: {} } });
    const first = await request(app).post("/api/stripe/webhook").set("stripe-signature", "t=1,v1=x").set("Content-Type", "application/json").send("{}");
    expect(first.status).toBe(200);
    const second = await request(app).post("/api/stripe/webhook").set("stripe-signature", "t=1,v1=x").set("Content-Type", "application/json").send("{}");
    expect(second.body).toMatchObject({ duplicate: true });
  });

  it("rejects a bad signature with 400 and claims nothing", async () => {
    constructEvent.mockImplementation(() => { throw new Error("bad sig"); });
    const res = await request(app).post("/api/stripe/webhook").set("stripe-signature", "bad").set("Content-Type", "application/json").send("{}");
    expect(res.status).toBe(400);
  });
});
