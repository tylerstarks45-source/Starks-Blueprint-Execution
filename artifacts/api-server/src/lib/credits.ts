import { sql, eq, desc } from "drizzle-orm";
import { db, usersTable, creditTransactionsTable } from "@workspace/db";

export const TIER_ALLOTMENTS: Record<string, number> = {
  starter: 50,
  builder: 500,
  operator: 2000,
  empire: 10000,
};

export const TIER_NAMES: Record<string, string> = {
  starter: "Starter",
  builder: "Builder",
  operator: "Operator",
  empire: "Empire",
};

export const TIER_PRICES: Record<string, number> = {
  starter: 0,
  builder: 2900,
  operator: 9900,
  empire: 49900,
};

export const SIGNUP_GRANT = TIER_ALLOTMENTS.starter;

export const CREDIT_PACKS: Record<string, { id: string; name: string; credits: number; priceCents: number }> = {
  small: { id: "small", name: "100 Credits", credits: 100, priceCents: 1000 },
  medium: { id: "medium", name: "500 Credits", credits: 500, priceCents: 4000 },
  large: { id: "large", name: "2,000 Credits", credits: 2000, priceCents: 12000 },
};

export type CreditTxType = "signup_grant" | "tier_grant" | "purchase" | "usage" | "admin_adjust";

export function creditsForTokens(tokens: number): number {
  return Math.max(1, Math.ceil(tokens / 1000));
}

export function tierAllotment(tier: string | null | undefined): number {
  return TIER_ALLOTMENTS[tier ?? "starter"] ?? TIER_ALLOTMENTS.starter;
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
