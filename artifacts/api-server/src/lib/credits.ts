import { sql, eq, desc } from "drizzle-orm";
import { db, usersTable, creditTransactionsTable } from "@workspace/db";

// ── Tier allotments (monthly credits that reset each billing cycle) ───────────
// These MUST match PricingPage.jsx and subscriptions.ts TIER_CONFIG exactly.
export const TIER_ALLOTMENTS: Record<string, number> = {
  free:     100,
  builder:  1000,
  operator: 5000,
  empire:   25000,
  // legacy aliases — map to canonical tiers
  pro:      1000,
  starter:  1000,
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
  operator: 10,
  empire:   10,
  // legacy aliases
  pro:      5,
  starter:  5,
};

export const SIGNUP_GRANT = 100; // credits granted to creditsBalance on new account creation

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
  ten:       { id: "ten",       name: "$10 Wallet Top-up",  dollarAmount: 10,  credits: 250,   priceCents: 1000,  saving: null },
  twentyfive: { id: "twentyfive", name: "$25 Wallet Top-up",  dollarAmount: 25,  credits: 700,   priceCents: 2500,  saving: "Save 13%" },
  fifty:     { id: "fifty",     name: "$50 Wallet Top-up",  dollarAmount: 50,  credits: 1500,  priceCents: 5000,  saving: "Save 25%" },
  hundred:   { id: "hundred",   name: "$100 Wallet Top-up", dollarAmount: 100, credits: 3500,  priceCents: 10000, saving: "Save 42%" },
  twofifty:  { id: "twofifty",  name: "$250 Wallet Top-up", dollarAmount: 250, credits: 10000, priceCents: 25000, saving: "Save 60%" },
};

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
): Promise<number> {
  const [updated] = await db
    .update(usersTable)
    .set({ creditsBalance: sql`${usersTable.creditsBalance} + ${delta}` })
    .where(eq(usersTable.id, userId))
    .returning({ b: usersTable.creditsBalance });

  const balanceAfter = updated?.b ?? 0;

  await db.insert(creditTransactionsTable).values({
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
): Promise<number> {
  const [updated] = await db
    .update(usersTable)
    .set({ walletBalance: sql`${usersTable.walletBalance} + ${delta}` })
    .where(eq(usersTable.id, userId))
    .returning({ w: usersTable.walletBalance });

  const walletAfter = updated?.w ?? 0;

  // Record as a purchase type so it appears in transaction history
  const [monthlyRow] = await db
    .select({ b: usersTable.creditsBalance })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  await db.insert(creditTransactionsTable).values({
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
export async function deductForUsage(userId: number, tokens: number, model: string): Promise<number> {
  const credits = creditsForTokens(tokens);
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
    super(`Your plan allows a maximum of ${limit} system${limit === 1 ? "" : "s"}. Upgrade to create more.`);
    this.name = "SystemLimitError";
    this.limit = limit;
  }
}
