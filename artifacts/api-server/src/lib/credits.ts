import { sql, eq, desc } from "drizzle-orm";
import { db, usersTable, creditTransactionsTable } from "@workspace/db";

export const TIER_ALLOTMENTS: Record<string, number> = {
  starter: 500,
  builder: 500,   // legacy alias — same as starter
  operator: 2500,
  empire: 10000,
};

export const TIER_NAMES: Record<string, string> = {
  starter: "Starter",
  builder: "Starter",   // legacy alias
  operator: "Operator",
  empire: "Empire",
};

export const TIER_PRICES: Record<string, number> = {
  starter: 2900,    // $29/mo
  builder: 2900,    // legacy alias
  operator: 9900,   // $99/mo
  empire: 29900,    // $299/mo
};

// Maximum number of systems a user on each tier can own simultaneously.
// builder is a legacy alias mapping to the starter limit.
export const TIER_SYSTEM_LIMITS: Record<string, number> = {
  starter: 3,
  builder: 3,
  operator: 15,
  empire: 999999,  // effectively unlimited
};

export const SIGNUP_GRANT = 50; // free-trial buffer granted on signup

export const CREDIT_PACKS: Record<string, { id: string; name: string; credits: number; priceCents: number }> = {
  small:  { id: "small",  name: "Small Pack",  credits: 100,  priceCents: 1000  }, // $10
  medium: { id: "medium", name: "Medium Pack", credits: 300,  priceCents: 2500  }, // $25
  large:  { id: "large",  name: "Large Pack",  credits: 700,  priceCents: 5000  }, // $50
  xl:     { id: "xl",     name: "XL Pack",     credits: 1500, priceCents: 10000 }, // $100
};

export type CreditTxType = "signup_grant" | "tier_grant" | "purchase" | "usage" | "admin_adjust";

export function creditsForTokens(tokens: number): number {
  return Math.max(1, Math.ceil(tokens / 1000));
}

export function tierAllotment(tier: string | null | undefined): number {
  return TIER_ALLOTMENTS[tier ?? "starter"] ?? TIER_ALLOTMENTS.starter;
}

export function tierSystemLimit(tier: string | null | undefined): number {
  return TIER_SYSTEM_LIMITS[tier ?? "starter"] ?? TIER_SYSTEM_LIMITS.starter;
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

// Deduct credits for AI usage. Retries a few times because the AI call has already
// succeeded by this point — dropping the charge on a transient DB blip is revenue leakage.
// Throws after exhausting retries so callers can surface CREDIT_DEDUCTION_FAILED for alerting.
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
