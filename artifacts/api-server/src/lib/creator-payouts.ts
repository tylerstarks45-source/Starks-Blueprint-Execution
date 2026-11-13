import { and, eq, lte, sql, desc, inArray } from "drizzle-orm";
import {
  db, usersTable, creatorPayoutAccountsTable, creatorEarningsTable, creatorPayoutsTable,
} from "@workspace/db";
import type { DbExecutor } from "./credits";
import { getUncachableStripeClient } from "./stripe";
import { notifyAdmins } from "./admin-alerts";
import { notifyUser } from "./notify";
import { logger } from "./logger";

/** Creator's cut of a card sale. */
export const CREATOR_SHARE = 0.7;
/** Earnings stay pending this long so refunds and most chargebacks land before money leaves. */
export const HOLD_DAYS = Number(process.env["CREATOR_PAYOUT_HOLD_DAYS"] ?? 14);
export const MIN_PAYOUT_CENTS = Number(process.env["CREATOR_MIN_PAYOUT_CENTS"] ?? 1000);

type StripeClient = Awaited<ReturnType<typeof getUncachableStripeClient>>;

export async function recordCardSaleEarning(tx: DbExecutor, opts: {
  creatorId: number; blueprintId: number; buyerUserId: number; paymentRef: string | null; grossCents: number;
}): Promise<number> {
  const amountCents = Math.floor(opts.grossCents * CREATOR_SHARE);
  if (amountCents <= 0) return 0;
  await tx.insert(creatorEarningsTable).values({
    userId: opts.creatorId,
    blueprintId: opts.blueprintId,
    buyerUserId: opts.buyerUserId,
    paymentRef: opts.paymentRef,
    grossCents: opts.grossCents,
    amountCents,
    status: "pending",
    availableAt: new Date(Date.now() + HOLD_DAYS * 86_400_000),
    note: "Blueprint card sale",
  });
  return amountCents;
}

/**
 * Reverse the creator's earning for a refunded/charged-back sale. Unpaid earnings are voided;
 * already-paid ones get a negative row that comes out of the creator's next payout.
 * Returns false when the sale has no cash earning (legacy credit-based creator share).
 */
export async function reverseCardSaleEarning(tx: DbExecutor, blueprintId: number, buyerUserId: number, why: string): Promise<boolean> {
  const rows = await tx.select().from(creatorEarningsTable).where(and(
    eq(creatorEarningsTable.blueprintId, blueprintId),
    eq(creatorEarningsTable.buyerUserId, buyerUserId),
    sql`${creatorEarningsTable.amountCents} > 0`,
  )).for("update");
  if (!rows.length) return false;
  for (const e of rows) {
    if (e.status === "pending" || e.status === "available") {
      await tx.update(creatorEarningsTable).set({ status: "reversed", note: why }).where(eq(creatorEarningsTable.id, e.id));
    } else if (e.status === "paid") {
      await tx.insert(creatorEarningsTable).values({
        userId: e.userId, blueprintId: e.blueprintId, buyerUserId: e.buyerUserId, paymentRef: e.paymentRef,
        grossCents: -e.grossCents, amountCents: -e.amountCents, status: "available", availableAt: new Date(), note: why,
      });
    }
  }
  return true;
}

async function releaseMatured(tx: DbExecutor, userId: number): Promise<void> {
  await tx.update(creatorEarningsTable).set({ status: "available" }).where(and(
    eq(creatorEarningsTable.userId, userId),
    eq(creatorEarningsTable.status, "pending"),
    lte(creatorEarningsTable.availableAt, new Date()),
  ));
}

export async function payoutSummary(userId: number) {
  await releaseMatured(db, userId);
  const [account] = await db.select().from(creatorPayoutAccountsTable).where(eq(creatorPayoutAccountsTable.userId, userId));
  const totals = await db.select({
    status: creatorEarningsTable.status,
    cents: sql<number>`coalesce(sum(${creatorEarningsTable.amountCents}), 0)::int`,
  }).from(creatorEarningsTable)
    .where(and(eq(creatorEarningsTable.userId, userId), sql`${creatorEarningsTable.payoutId} is null`))
    .groupBy(creatorEarningsTable.status);
  const [paid] = await db.select({ cents: sql<number>`coalesce(sum(${creatorPayoutsTable.amountCents}), 0)::int` })
    .from(creatorPayoutsTable).where(and(eq(creatorPayoutsTable.userId, userId), eq(creatorPayoutsTable.status, "paid")));
  const by = (s: string) => totals.find((t) => t.status === s)?.cents ?? 0;
  const earnings = await db.select().from(creatorEarningsTable).where(eq(creatorEarningsTable.userId, userId))
    .orderBy(desc(creatorEarningsTable.id)).limit(50);
  const payouts = await db.select().from(creatorPayoutsTable).where(eq(creatorPayoutsTable.userId, userId))
    .orderBy(desc(creatorPayoutsTable.id)).limit(20);
  return {
    account: account
      ? { connected: true, payoutsEnabled: account.payoutsEnabled, detailsSubmitted: account.detailsSubmitted }
      : { connected: false, payoutsEnabled: false, detailsSubmitted: false },
    balances: { pendingCents: by("pending"), availableCents: by("available"), paidCents: paid?.cents ?? 0 },
    minimumCents: MIN_PAYOUT_CENTS,
    holdDays: HOLD_DAYS,
    earnings,
    payouts,
  };
}

/** Create (once) the creator's Express account and return a Stripe-hosted onboarding link. */
export async function onboardingLink(userId: number, baseUrl: string, stripe?: StripeClient): Promise<string> {
  const client = stripe ?? await getUncachableStripeClient();
  let [account] = await db.select().from(creatorPayoutAccountsTable).where(eq(creatorPayoutAccountsTable.userId, userId));
  if (!account) {
    const [u] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, userId));
    const created = await client.accounts.create({
      type: "express",
      email: u?.email,
      capabilities: { transfers: { requested: true } },
      metadata: { userId: String(userId) },
    }, { idempotencyKey: `creator-account-${userId}` });
    [account] = await db.insert(creatorPayoutAccountsTable)
      .values({ userId, stripeAccountId: created.id })
      .onConflictDoNothing()
      .returning();
    if (!account) [account] = await db.select().from(creatorPayoutAccountsTable).where(eq(creatorPayoutAccountsTable.userId, userId));
  }
  const link = await client.accountLinks.create({
    account: account!.stripeAccountId,
    refresh_url: `${baseUrl}/creator-payouts?onboarding=refresh`,
    return_url: `${baseUrl}/creator-payouts?onboarding=done`,
    type: "account_onboarding",
  });
  return link.url;
}

export async function syncAccountStatus(stripeAccount: { id: string; payouts_enabled?: boolean; details_submitted?: boolean }, exec: DbExecutor = db) {
  await exec.update(creatorPayoutAccountsTable).set({
    payoutsEnabled: Boolean(stripeAccount.payouts_enabled),
    detailsSubmitted: Boolean(stripeAccount.details_submitted),
    updatedAt: new Date(),
  }).where(eq(creatorPayoutAccountsTable.stripeAccountId, stripeAccount.id));
}

export async function refreshAccount(userId: number, stripe?: StripeClient) {
  const [account] = await db.select().from(creatorPayoutAccountsTable).where(eq(creatorPayoutAccountsTable.userId, userId));
  if (!account) return;
  const client = stripe ?? await getUncachableStripeClient();
  const remote = await client.accounts.retrieve(account.stripeAccountId);
  await syncAccountStatus(remote);
}

export class PayoutError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

/**
 * Pay the creator's whole available balance to their Connect account. The account row lock
 * serializes withdrawals, and the earnings are claimed before the transfer, so a balance is
 * never paid twice. A failed transfer releases the earnings back to "available".
 */
export async function withdraw(userId: number, stripe?: StripeClient) {
  const claim = await db.transaction(async (tx) => {
    const [account] = await tx.select().from(creatorPayoutAccountsTable)
      .where(eq(creatorPayoutAccountsTable.userId, userId)).for("update");
    if (!account) throw new PayoutError("Connect a payout account first.");
    if (!account.payoutsEnabled) throw new PayoutError("Finish setting up your payout account with Stripe first.");
    await releaseMatured(tx, userId);
    const rows = await tx.select({ id: creatorEarningsTable.id, amountCents: creatorEarningsTable.amountCents })
      .from(creatorEarningsTable)
      .where(and(eq(creatorEarningsTable.userId, userId), eq(creatorEarningsTable.status, "available"), sql`${creatorEarningsTable.payoutId} is null`))
      .for("update");
    const total = rows.reduce((s, r) => s + r.amountCents, 0);
    if (total < MIN_PAYOUT_CENTS) {
      throw new PayoutError(`You need at least $${(MIN_PAYOUT_CENTS / 100).toFixed(2)} available to withdraw.`);
    }
    const [payout] = await tx.insert(creatorPayoutsTable).values({ userId, amountCents: total }).returning();
    await tx.update(creatorEarningsTable).set({ status: "paid", payoutId: payout!.id })
      .where(inArray(creatorEarningsTable.id, rows.map((r) => r.id)));
    return { payout: payout!, destination: account.stripeAccountId, ids: rows.map((r) => r.id) };
  });

  try {
    const client = stripe ?? await getUncachableStripeClient();
    const transfer = await client.transfers.create({
      amount: claim.payout.amountCents,
      currency: "usd",
      destination: claim.destination,
      metadata: { creatorPayoutId: String(claim.payout.id), userId: String(userId) },
    }, { idempotencyKey: `creator-payout-${claim.payout.id}` });
    const [done] = await db.update(creatorPayoutsTable)
      .set({ status: "paid", stripeTransferId: transfer.id, completedAt: new Date() })
      .where(eq(creatorPayoutsTable.id, claim.payout.id)).returning();
    void notifyUser({
      userId, notificationType: "success", title: "Payout sent",
      message: `$${(claim.payout.amountCents / 100).toFixed(2)} is on its way to your bank via Stripe.`,
      linkUrl: "/creator-payouts",
    });
    return done!;
  } catch (err) {
    const message = String((err as Error)?.message ?? err).slice(0, 300);
    await db.transaction(async (tx) => {
      await tx.update(creatorEarningsTable).set({ status: "available", payoutId: null }).where(inArray(creatorEarningsTable.id, claim.ids));
      await tx.update(creatorPayoutsTable).set({ status: "failed", error: message, completedAt: new Date() })
        .where(eq(creatorPayoutsTable.id, claim.payout.id));
    });
    logger.error({ userId, payoutId: claim.payout.id, err: message }, "Creator payout transfer failed");
    void notifyAdmins({
      title: "Creator payout failed",
      message: `Payout #${claim.payout.id} of $${(claim.payout.amountCents / 100).toFixed(2)} to user #${userId} failed: ${message}`,
      dedupeKey: `creator_payout_fail_${claim.payout.id}`, linkUrl: "/admin/stripe",
    });
    throw new PayoutError("Stripe couldn't send this payout. Your balance is unchanged; try again later.", 502);
  }
}
