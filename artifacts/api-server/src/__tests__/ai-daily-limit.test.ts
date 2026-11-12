/**
 * Pre-flight AI spending checks (assertCanSpendAi): balance, per-user daily cap,
 * founder exemption. Runs against the real database.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db, usersTable, creditTransactionsTable } from "@workspace/db";
import {
  assertCanSpendAi,
  aiCreditsUsedToday,
  dailyAiCreditLimit,
  DailyAiLimitError,
  OutOfCreditsError,
  DEFAULT_DAILY_AI_CREDIT_LIMIT,
} from "../lib/credits";

const stamp = Date.now();
let userId: number;
let founderId: number;
let brokeId: number;

beforeAll(async () => {
  const rows = await db.insert(usersTable).values([
    { email: `ai-cap-user-${stamp}@test.local`, role: "USER", creditsBalance: 5000 },
    { email: `ai-cap-founder-${stamp}@test.local`, role: "FOUNDER_ADMIN", creditsBalance: 0 },
    { email: `ai-cap-broke-${stamp}@test.local`, role: "USER", creditsBalance: 0, walletBalance: 0 },
  ]).returning({ id: usersTable.id });
  [userId, founderId, brokeId] = rows.map((r) => r.id);
});

afterEach(() => { delete process.env.AI_DAILY_CREDIT_LIMIT; });

afterAll(async () => {
  const ids = [userId, founderId, brokeId].filter(Boolean);
  await db.delete(creditTransactionsTable).where(inArray(creditTransactionsTable.userId, ids));
  await db.delete(usersTable).where(inArray(usersTable.id, ids));
});

async function spend(id: number, credits: number, createdAt = new Date()) {
  await db.insert(creditTransactionsTable).values({
    userId: id, amount: -credits, balanceAfter: 0, type: "usage", reason: "test", model: "m", tokens: credits * 1000, createdAt,
  });
}

describe("dailyAiCreditLimit", () => {
  it("defaults, honours overrides, and allows 0 to disable", () => {
    expect(dailyAiCreditLimit()).toBe(DEFAULT_DAILY_AI_CREDIT_LIMIT);
    process.env.AI_DAILY_CREDIT_LIMIT = "50";
    expect(dailyAiCreditLimit()).toBe(50);
    process.env.AI_DAILY_CREDIT_LIMIT = "0";
    expect(dailyAiCreditLimit()).toBe(0);
    process.env.AI_DAILY_CREDIT_LIMIT = "nonsense";
    expect(dailyAiCreditLimit()).toBe(DEFAULT_DAILY_AI_CREDIT_LIMIT);
  });
});

describe("assertCanSpendAi", () => {
  it("blocks users with no credits", async () => {
    await expect(assertCanSpendAi(brokeId)).rejects.toBeInstanceOf(OutOfCreditsError);
  });

  it("counts only today's usage, then blocks at the daily cap", async () => {
    process.env.AI_DAILY_CREDIT_LIMIT = "100";
    await spend(userId, 500, new Date(Date.now() - 2 * 86_400_000)); // older usage doesn't count
    await spend(userId, 60);
    expect(await aiCreditsUsedToday(userId)).toBe(60);
    await expect(assertCanSpendAi(userId)).resolves.toBeUndefined();

    await spend(userId, 40);
    const err = await assertCanSpendAi(userId).catch((e) => e);
    expect(err).toBeInstanceOf(DailyAiLimitError);
    // Must not look like an empty balance: top-up prompts would be misleading.
    expect(err).not.toBeInstanceOf(OutOfCreditsError);
    expect(err.code).toBe("daily_ai_limit");

    process.env.AI_DAILY_CREDIT_LIMIT = "0";
    await expect(assertCanSpendAi(userId)).resolves.toBeUndefined();
  });

  it("never blocks the founder account", async () => {
    process.env.AI_DAILY_CREDIT_LIMIT = "1";
    await spend(founderId, 10);
    await expect(assertCanSpendAi(founderId)).resolves.toBeUndefined();
  });
});
