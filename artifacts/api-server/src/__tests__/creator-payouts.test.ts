import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { eq, inArray } from "drizzle-orm";

const stripeMock = vi.hoisted(() => ({
  transfersCreate: vi.fn(),
  accountsCreate: vi.fn(),
  accountLinksCreate: vi.fn(),
  accountsRetrieve: vi.fn(),
}));
vi.mock("../lib/stripe", () => ({
  getUncachableStripeClient: async () => ({
    transfers: { create: stripeMock.transfersCreate },
    accounts: { create: stripeMock.accountsCreate, retrieve: stripeMock.accountsRetrieve },
    accountLinks: { create: stripeMock.accountLinksCreate },
  }),
}));

import app from "../app";
import { db, usersTable, blueprintsTable, creatorEarningsTable, creatorPayoutsTable, creatorPayoutAccountsTable } from "@workspace/db";
import { reverseCardSaleEarning } from "../lib/creator-payouts";

const tag = `cp${Date.now()}`;
let creator = 0, other = 0, blueprintId = 0, tokenCreator = "", tokenOther = "";
const sign = (id: number, email: string) =>
  jwt.sign({ sub: id, email, role: "USER", tokenVersion: 1 }, process.env["SESSION_SECRET"]!);
const earn = (amountCents: number, status: "pending" | "available", extra: Partial<typeof creatorEarningsTable.$inferInsert> = {}) =>
  db.insert(creatorEarningsTable).values({
    userId: creator, amountCents, grossCents: Math.round(amountCents / 0.7), status,
    availableAt: status === "pending" ? new Date(Date.now() + 86_400_000) : new Date(Date.now() - 1000), ...extra,
  });

beforeAll(async () => {
  const rows = await db.insert(usersTable).values([
    { email: `${tag}-c@test.dev`, membershipStatus: "active", emailVerified: true },
    { email: `${tag}-o@test.dev`, membershipStatus: "active", emailVerified: true },
  ]).returning({ id: usersTable.id, email: usersTable.email });
  [creator, other] = rows.map((r) => r.id) as [number, number];
  tokenCreator = sign(creator, rows[0]!.email);
  tokenOther = sign(other, rows[1]!.email);
  const [bp] = await db.insert(blueprintsTable).values({
    slug: `${tag}-bp`, name: `${tag} bp`, authorUserId: creator, priceCredits: 100,
  } as typeof blueprintsTable.$inferInsert).returning();
  blueprintId = bp!.id;
});

afterAll(async () => {
  await db.delete(usersTable).where(inArray(usersTable.id, [creator, other]));
});

const get = (t: string) => request(app).get("/api/creator/payouts").set("Authorization", `Bearer ${t}`);
const post = (path: string, t: string) => request(app).post(`/api/creator/payouts/${path}`).set("Authorization", `Bearer ${t}`);

describe("creator payouts (Stripe Connect)", () => {
  it("requires sign-in", async () => {
    expect((await request(app).get("/api/creator/payouts")).status).toBe(401);
  });

  it("onboarding creates one Express account and returns Stripe's link", async () => {
    stripeMock.accountsCreate.mockResolvedValue({ id: `acct_${tag}` });
    stripeMock.accountLinksCreate.mockResolvedValue({ url: "https://connect.stripe.com/setup/x" });
    const a = await post("onboard", tokenCreator);
    expect(a.status).toBe(200);
    expect(a.body.url).toContain("stripe.com");
    await post("onboard", tokenCreator);
    expect(stripeMock.accountsCreate).toHaveBeenCalledTimes(1);
  });

  it("withdraw is refused until Stripe enables payouts", async () => {
    await earn(5000, "available");
    const res = await post("withdraw", tokenCreator);
    expect(res.status).toBe(400);
    expect(stripeMock.transfersCreate).not.toHaveBeenCalled();
  });

  it("shows balances only to their owner and releases matured earnings", async () => {
    await earn(3000, "pending");
    stripeMock.accountsRetrieve.mockResolvedValue({ id: `acct_${tag}`, payouts_enabled: true, details_submitted: true });
    const mine = await post("refresh", tokenCreator);
    expect(mine.body.account).toMatchObject({ connected: true, payoutsEnabled: true });
    expect(mine.body.balances).toMatchObject({ availableCents: 5000, pendingCents: 3000 });
    const theirs = await get(tokenOther);
    expect(theirs.body.balances).toMatchObject({ availableCents: 0, pendingCents: 0 });
    expect(theirs.body.earnings).toHaveLength(0);
  });

  it("pays the available balance once, even when two withdrawals race", async () => {
    stripeMock.transfersCreate.mockResolvedValue({ id: `tr_${tag}` });
    const [a, b] = await Promise.all([post("withdraw", tokenCreator), post("withdraw", tokenCreator)]);
    expect([a.status, b.status].sort()).toEqual([200, 400]);
    expect(stripeMock.transfersCreate).toHaveBeenCalledTimes(1);
    expect(stripeMock.transfersCreate.mock.calls[0]![0]).toMatchObject({ amount: 5000, destination: `acct_${tag}` });
    const after = await get(tokenCreator);
    expect(after.body.balances).toMatchObject({ availableCents: 0, pendingCents: 3000, paidCents: 5000 });
  });

  it("a failed transfer leaves the balance available", async () => {
    await earn(2000, "available");
    stripeMock.transfersCreate.mockRejectedValueOnce(new Error("insufficient platform balance"));
    const res = await post("withdraw", tokenCreator);
    expect(res.status).toBe(502);
    const after = await get(tokenCreator);
    expect(after.body.balances.availableCents).toBe(2000);
    const failed = await db.select().from(creatorPayoutsTable).where(eq(creatorPayoutsTable.userId, creator));
    expect(failed.some((p) => p.status === "failed")).toBe(true);
  });

  it("refunds void unpaid earnings and claw back paid ones from the next payout", async () => {
    await db.delete(creatorEarningsTable).where(eq(creatorEarningsTable.userId, creator));
    await earn(700, "pending", { buyerUserId: other, blueprintId });
    await db.insert(creatorEarningsTable).values({
      userId: creator, amountCents: 1400, grossCents: 2000, status: "paid", availableAt: new Date(), buyerUserId: other, blueprintId,
    });
    expect(await db.transaction((tx) => reverseCardSaleEarning(tx, blueprintId, other, "Refund"))).toBe(true);
    const rows = await db.select().from(creatorEarningsTable).where(eq(creatorEarningsTable.userId, creator));
    expect(rows.find((r) => r.amountCents === 700)?.status).toBe("reversed");
    expect(rows.find((r) => r.amountCents === -1400)?.status).toBe("available");
    expect(await db.transaction((tx) => reverseCardSaleEarning(tx, blueprintId, creator, "Refund"))).toBe(false);
  });
});

afterAll(async () => {
  await db.delete(blueprintsTable).where(eq(blueprintsTable.id, blueprintId));
  await db.delete(creatorPayoutAccountsTable).where(eq(creatorPayoutAccountsTable.userId, creator));
});
