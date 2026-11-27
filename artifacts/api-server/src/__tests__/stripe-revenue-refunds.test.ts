import { expect, it, vi } from "vitest";

const list = vi.hoisted(() => vi.fn());
vi.mock("stripe", () => ({
  default: class {
    balanceTransactions = { list };
  },
}));

import { StripeRevenueProvider } from "../lib/revenue/stripe-provider";

it("imports Stripe refunds as negative revenue next to the payments they reverse", async () => {
  const tx = (id: string, amount: number) => ({ id, amount, currency: "usd", status: "available", created: 1_700_000_000, description: null });
  list.mockImplementation(async ({ type }: { type: string }) => ({
    has_more: false,
    data: type === "charge" ? [tx("txn_paid", 5000)] : type === "refund" ? [tx("txn_refund", -2000)] : [],
  }));

  const result = await new StripeRevenueProvider().fetchTransactions({ stripe_secret_key: "sk_test_x" });

  expect(result.ok).toBe(true);
  expect(result.transactions.map(t => [t.externalId, t.amountCents])).toEqual([
    ["stripe_txn_paid", 5000],
    ["stripe_txn_refund", -2000],
  ]);
  expect(list.mock.calls.map(([params]) => params.type)).toEqual(["charge", "payment", "refund", "payment_refund"]);
});
