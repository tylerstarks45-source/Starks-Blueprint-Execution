import { sql, eq, desc } from "drizzle-orm";
import { db, usersTable, creditTransactionsTable } from "@workspace/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DbExecutor = typeof db | Tx;

// ── Tier allotments (monthly credits that reset each billing cycle) ───────────
// Temporary Phase 1 allocations — final pricing to be set after real-usage data.
export const TIER_ALLOTMENTS: Record<string, number> = {
  free:     250,
  builder:  2500,
  operator: 10000,
  empire:   50000,
  // legacy aliases — map to canonical tiers
  pro:      2500,
  starter:  2500,
};

export const TIER_NAMES: Record<string, string> = {
  free:     "Free",
  builder:  "Builder",
  operator: "Operator",
  empire:   "Empire",
  // legacy aliases
  pro:      "Builder",
  starter:  "Builder",
};

export const TIER_PRICES: Record<string, number> = {
  free:     0,
  builder:  2900,   // $29/mo
  operator: 9900,   // $99/mo
  empire:   49900,  // $499/mo
  // legacy aliases
  pro:      2900,
  starter:  2900,
};

export const TIER_SYSTEM_LIMITS: Record<string, number> = {
  free:     1,
  builder:  5,
  operator: 20,
  empire:   999,  // effectively unlimited
  // legacy aliases
  pro:      5,
  starter:  5,
};

export const SIGNUP_GRANT = 250; // credits granted to creditsBalance on new account creation

// ── Credit rate for custom top-ups ────────────────────────────────────────────
// Base rate: $10 = 500 credits → 50 credits per dollar.
// Preset tiers offer bonus credits for larger purchases.
export const BASE_CREDITS_PER_DOLLAR = 50;
export const MIN_CUSTOM_PURCHASE_DOLLARS = 10;

// ── Credit Wallet Tiers ───────────────────────────────────────────────────────
// Dollar-amount-based wallet top-ups. Purchased credits go to walletBalance
// and NEVER expire. Monthly subscription credits reset each billing cycle.
export const WALLET_TIERS: Record<string, {
  id: string;
  name: string;
  dollarAmount: number;
  credits: number;
  priceCents: number;
  saving: string | null;
}> = {
  ten:       { id: "ten",       name: "$10 Wallet Top-up",  dollarAmount: 10,  credits: 500,   priceCents: 1000,  saving: null },
  twentyfive: { id: "twentyfive", name: "$25 Wallet Top-up",  dollarAmount: 25,  credits: 1500,  priceCents: 2500,  saving: "Save 20%" },
  fifty:     { id: "fifty",     name: "$50 Wallet Top-up",  dollarAmount: 50,  credits: 3500,  priceCents: 5000,  saving: "Save 40%" },
  hundred:   { id: "hundred",   name: "$100 Wallet Top-up", dollarAmount: 100, credits: 8000,  priceCents: 10000, saving: "Save 60%" },
  twofifty:  { id: "twofifty",  name: "$250 Wallet Top-up", dollarAmount: 250, credits: 25000, priceCents: 25000, saving: "Save 100%" },
};

/**
 * Calculate how many credits a custom dollar amount earns.
 * Uses base rate (50 cr/$). Preset tiers already offer bonuses above this.
 */
export function creditsForDollars(dollars: number): number {
  return Math.floor(dollars) * BASE_CREDITS_PER_DOLLAR;
}

export type CreditTxType = "signup_grant" | "tier_grant" | "purchase" | "wallet_purchase" | "usage" | "admin_adjust";

export function creditsForTokens(tokens: number): number {
  return Math.max(1, Math.ceil(tokens / 1000));
}

export function tierAllotment(tier: string | null | undefined): number {
  return TIER_ALLOTMENTS[tier ?? "free"] ?? TIER_ALLOTMENTS.free;
}

export function tierSystemLimit(tier: string | null | undefined): number {
  return TIER_SYSTEM_LIMITS[tier ?? "free"] ?? TIER_SYSTEM_LIMITS.free;
}

export async function getBalance(userId: number): Promise<{ monthly: number; wallet: number; total: number }> {
  const [row] = await db
    .select({ monthly: usersTable.creditsBalance, wallet: usersTable.walletBalance })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  const monthly = row?.monthly ?? 0;
  const wallet  = row?.wallet  ?? 0;
  return { monthly, wallet, total: monthly + wallet };
}

// FOUNDER_ADMIN always has credits — usage still tracked, just never blocked.
export async function hasCredits(userId: number): Promise<boolean> {
  const [row] = await db
    .select({ monthly: usersTable.creditsBalance, wallet: usersTable.walletBalance, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (row?.role === "FOUNDER_ADMIN") return true;
  const total = (row?.monthly ?? 0) + (row?.wallet ?? 0);
  return total > 0;
}

// Adjust monthly credits (creditsBalance). Delta may be negative.
export async function adjustCredits(
  userId: number,
  delta: number,
  type: CreditTxType,
  opts?: { reason?: string; model?: string; tokens?: number },
  exec?: DbExecutor,
): Promise<number> {
  if (!exec) return db.transaction((tx) => adjustCredits(userId, delta, type, opts, tx));
  const [updated] = await exec
    .update(usersTable)
    .set({ creditsBalance: sql`${usersTable.creditsBalance} + ${delta}` })
    .where(eq(usersTable.id, userId))
    .returning({ b: usersTable.creditsBalance });

  const balanceAfter = updated?.b ?? 0;

  await exec.insert(creditTransactionsTable).values({
    userId,
    amount: delta,
    balanceAfter,
    type,
    reason: opts?.reason ?? null,
    model: opts?.model ?? null,
    tokens: opts?.tokens ?? null,
  });

  return balanceAfter;
}

// Adjust permanent wallet credits (walletBalance). Delta may be negative.
export async function adjustWalletCredits(
  userId: number,
  delta: number,
  opts?: { reason?: string },
  exec?: DbExecutor,
): Promise<number> {
  if (!exec) return db.transaction((tx) => adjustWalletCredits(userId, delta, opts, tx));
  const [updated] = await exec
    .update(usersTable)
    .set({ walletBalance: sql`${usersTable.walletBalance} + ${delta}` })
    .where(eq(usersTable.id, userId))
    .returning({ w: usersTable.walletBalance });

  const walletAfter = updated?.w ?? 0;

  // Record as a purchase type so it appears in transaction history
  const [monthlyRow] = await exec
    .select({ b: usersTable.creditsBalance })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  await exec.insert(creditTransactionsTable).values({
    userId,
    amount: delta,
    balanceAfter: (monthlyRow?.b ?? 0) + walletAfter,
    type: "wallet_purchase",
    reason: opts?.reason ?? `Wallet top-up (${delta > 0 ? "+" : ""}${delta} credits)`,
    model: null,
    tokens: null,
  });

  return walletAfter;
}

// Deduct credits for AI usage: consumes monthly credits first, wallet second.
export function creditsForUsd(usd: number): number {
  return Math.max(1, Math.ceil(usd * BASE_CREDITS_PER_DOLLAR));
}

export async function deductForUsage(userId: number, tokens: number, model: string, creditsOverride?: number): Promise<number> {
  const credits = creditsOverride ?? creditsForTokens(tokens);
  let lastErr: unknown;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // Read current balances
      const [row] = await db
        .select({ monthly: usersTable.creditsBalance, wallet: usersTable.walletBalance })
        .from(usersTable)
        .where(eq(usersTable.id, userId));

      const monthly = row?.monthly ?? 0;
      const wallet  = row?.wallet  ?? 0;

      // Deduct from monthly first, then wallet
      const fromMonthly = Math.min(credits, Math.max(0, monthly));
      const fromWallet  = credits - fromMonthly;

      if (fromMonthly > 0 || fromWallet > 0) {
        const patch: Record<string, unknown> = {};
        if (fromMonthly > 0) patch.creditsBalance = sql`${usersTable.creditsBalance} - ${fromMonthly}`;
        if (fromWallet  > 0) patch.walletBalance  = sql`${usersTable.walletBalance}  - ${fromWallet}`;
        await db.update(usersTable).set(patch).where(eq(usersTable.id, userId));
      }

      const balanceAfter = Math.max(0, monthly - fromMonthly) + Math.max(0, wallet - fromWallet);

      await db.insert(creditTransactionsTable).values({
        userId,
        amount: -credits,
        balanceAfter,
        type: "usage",
        reason: `AI usage (${model})`,
        model,
        tokens,
      });

      return balanceAfter;
    } catch (err) {
      lastErr = err;
      if (attempt < 3) await new Promise((r) => setTimeout(r, 100 * attempt));
    }
  }
  throw lastErr;
}

export async function listTransactions(userId: number, limit = 100) {
  return db
    .select()
    .from(creditTransactionsTable)
    .where(eq(creditTransactionsTable.userId, userId))
    .orderBy(desc(creditTransactionsTable.createdAt))
    .limit(limit);
}

export class OutOfCreditsError extends Error {
  code = "out_of_credits" as const;
  constructor(message = "You have run out of AI credits. Please top up your wallet to continue.") {
    super(message);
    this.name = "OutOfCreditsError";
  }
}

export class SystemLimitError extends Error {
  code = "system_limit_reached" as const;
  limit: number;
  constructor(limit: number) {
    const displayLimit = limit >= 999 ? "unlimited" : String(limit);
    super(`Your plan allows a maximum of ${displayLimit} system${limit === 1 ? "" : "s"}. Upgrade to create more.`);
    this.name = "SystemLimitError";
    this.limit = limit;
  }
}
