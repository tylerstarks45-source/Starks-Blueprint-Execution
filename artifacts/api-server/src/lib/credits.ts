import { sql, eq, desc } from "drizzle-orm";
import { db, usersTable, creditTransactionsTable } from "@workspace/db";

export const TIER_ALLOTMENTS: Record<string, number> = {
  free:     50,
  pro:      1000,
  empire:   5000,
  // legacy aliases — map to new tiers
  starter:  1000,
  builder:  1000,
  operator: 5000,
};

export const TIER_NAMES: Record<string, string> = {
  free:     "Free",
  pro:      "Pro",
  empire:   "Empire",
  starter:  "Pro",
  builder:  "Pro",
  operator: "Empire",
};

export const TIER_PRICES: Record<string, number> = {
  free:     0,
  pro:      4900,   // $49/mo
  empire:   19900,  // $199/mo
  starter:  4900,
  builder:  4900,
  operator: 19900,
};

// Maximum number of systems a user on each tier can own simultaneously.
export const TIER_SYSTEM_LIMITS: Record<string, number> = {
  free:     1,
  pro:      25,
  empire:   999999, // unlimited
  starter:  25,
  builder:  25,
  operator: 999999,
};

export const SIGNUP_GRANT = 50; // free-trial credits on signup

export const CREDIT_PACKS: Record<string, { id: string; name: string; credits: number; priceCents: number }> = {
  starter: { id: "starter", name: "Starter Pack",  credits: 100,   priceCents:  900 }, // $9
  growth:  { id: "growth",  name: "Growth Pack",   credits: 500,   priceCents: 3900 }, // $39
  builder: { id: "builder", name: "Builder Pack",  credits: 1000,  priceCents: 6900 }, // $69
  pro:     { id: "pro",     name: "Pro Pack",      credits: 5000,  priceCents: 24900 }, // $249
  empire:  { id: "empire",  name: "Empire Pack",   credits: 10000, priceCents: 44900 }, // $449
};

export type CreditTxType = "signup_grant" | "tier_grant" | "purchase" | "usage" | "admin_adjust";

export function creditsForTokens(tokens: number): number {
  return Math.max(1, Math.ceil(tokens / 1000));
}

export function tierAllotment(tier: string | null | undefined): number {
  return TIER_ALLOTMENTS[tier ?? "pro"] ?? TIER_ALLOTMENTS.pro;
}

export function tierSystemLimit(tier: string | null | undefined): number {
  return TIER_SYSTEM_LIMITS[tier ?? "pro"] ?? TIER_SYSTEM_LIMITS.pro;
}

export async function getBalance(userId: number): Promise<number> {
  const [row] = await db
    .select({ b: usersTable.creditsBalance })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  return row?.b ?? 0;
}

export async function hasCredits(userId: number): Promise<boolean> {
  return (await getBalance(userId)) > 0;
}

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

export async function deductForUsage(userId: number, tokens: number, model: string): Promise<number> {
  const credits = creditsForTokens(tokens);
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await adjustCredits(userId, -credits, "usage", { model, tokens, reason: `AI usage (${model})` });
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
  constructor(message = "You have run out of AI credits. Please top up to continue.") {
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
