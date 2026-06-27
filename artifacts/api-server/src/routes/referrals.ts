import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, sql, desc } from "drizzle-orm";
import { db, referralCodesTable, referralEventsTable, usersTable } from "@workspace/db";
import { z } from "zod/v4";
import { requireAuthActive } from "../lib/auth";
import crypto from "node:crypto";

const router: IRouter = Router();

function generateCode(): string {
  return crypto.randomBytes(5).toString("base64url").toUpperCase().slice(0, 8);
}

async function getOrCreateReferralCode(userId: number): Promise<string> {
  const [existing] = await db
    .select()
    .from(referralCodesTable)
    .where(eq(referralCodesTable.userId, userId));
  if (existing) return existing.code;

  let code = generateCode();
  for (let i = 0; i < 5; i++) {
    const [clash] = await db
      .select({ id: referralCodesTable.id })
      .from(referralCodesTable)
      .where(eq(referralCodesTable.code, code));
    if (!clash) break;
    code = generateCode();
  }

  const [created] = await db
    .insert(referralCodesTable)
    .values({ userId, code })
    .onConflictDoNothing()
    .returning();
  if (created) return created.code;

  const [refetched] = await db
    .select()
    .from(referralCodesTable)
    .where(eq(referralCodesTable.userId, userId));
  return refetched!.code;
}

// GET /api/referrals/my-code — get or create authenticated user's referral code + stats
router.get("/referrals/my-code", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const code = await getOrCreateReferralCode(userId);

  const [row] = await db
    .select()
    .from(referralCodesTable)
    .where(eq(referralCodesTable.userId, userId));

  const [earningsRow] = await db
    .select({ total: sql<number>`coalesce(sum(${referralEventsTable.creditsAwarded}), 0)::int` })
    .from(referralEventsTable)
    .where(eq(referralEventsTable.referrerId, userId));

  const [signupsRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(referralEventsTable)
    .where(
      sql`${referralEventsTable.referrerId} = ${userId} and ${referralEventsTable.eventType} = 'signup'`,
    );

  const [activationsRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(referralEventsTable)
    .where(
      sql`${referralEventsTable.referrerId} = ${userId} and ${referralEventsTable.eventType} = 'activation'`,
    );

  // Recent events for timeline display
  const recentEvents = await db
    .select({
      eventType: referralEventsTable.eventType,
      creditsAwarded: referralEventsTable.creditsAwarded,
      createdAt: referralEventsTable.createdAt,
    })
    .from(referralEventsTable)
    .where(eq(referralEventsTable.referrerId, userId))
    .orderBy(sql`${referralEventsTable.createdAt} DESC`)
    .limit(10);

  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  const baseUrl = domain ? `https://${domain}` : "http://localhost:80";

  res.json({
    code,
    link: `${baseUrl}/ref/${code}`,
    clicks: row?.clicks ?? 0,
    signups: signupsRow?.count ?? 0,
    activations: activationsRow?.count ?? 0,
    conversions: row?.conversions ?? 0,
    totalEarned: earningsRow?.total ?? 0,
    recentEvents: serialize(recentEvents),
  });
});

// POST /api/referrals/:code/click — track a referral link visit (no auth required)
router.post("/referrals/:code/click", async (req, res): Promise<void> => {
  const { code } = req.params;
  if (!code || code.length > 20) {
    res.status(400).json({ error: "Invalid code" });
    return;
  }

  await db
    .update(referralCodesTable)
    .set({ clicks: sql`${referralCodesTable.clicks} + 1` })
    .where(eq(referralCodesTable.code, code.toUpperCase()));

  res.json({ ok: true });
});

// GET /api/referrals/leaderboard — top referrers (anonymized)
router.get("/referrals/leaderboard", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      userId: referralCodesTable.userId,
      conversions: referralCodesTable.conversions,
      name: usersTable.name,
      email: usersTable.email,
    })
    .from(referralCodesTable)
    .leftJoin(usersTable, eq(usersTable.id, referralCodesTable.userId))
    .where(sql`${referralCodesTable.conversions} > 0`)
    .orderBy(desc(referralCodesTable.conversions))
    .limit(10);

  const leaderboard = rows.map((r, i) => {
    const displayName = r.name
      ? r.name.split(" ")[0] + (r.name.split(" ")[1] ? " " + r.name.split(" ")[1][0] + "." : "")
      : r.email
      ? r.email.split("@")[0].slice(0, 6) + "***"
      : "Referrer";
    return { rank: i + 1, displayName, conversions: r.conversions };
  });

  res.json({ leaderboard });
});

// GET /api/admin/referrals — admin analytics
router.get("/admin/referrals", async (req, res): Promise<void> => {
  const { requireAdmin } = await import("../lib/auth");
  if (!(await requireAdmin(req, res))) return;

  const [totals] = await db
    .select({
      totalCodes: sql<number>`count(*)::int`,
      totalClicks: sql<number>`coalesce(sum(${referralCodesTable.clicks}), 0)::int`,
      totalConversions: sql<number>`coalesce(sum(${referralCodesTable.conversions}), 0)::int`,
    })
    .from(referralCodesTable);

  const [creditsRow] = await db
    .select({ totalCreditsAwarded: sql<number>`coalesce(sum(${referralEventsTable.creditsAwarded}), 0)::int` })
    .from(referralEventsTable);

  const topReferrers = await db
    .select({
      userId: referralCodesTable.userId,
      code: referralCodesTable.code,
      clicks: referralCodesTable.clicks,
      conversions: referralCodesTable.conversions,
      name: usersTable.name,
      email: usersTable.email,
    })
    .from(referralCodesTable)
    .leftJoin(usersTable, eq(usersTable.id, referralCodesTable.userId))
    .orderBy(desc(referralCodesTable.conversions))
    .limit(20);

  const recentEvents = await db
    .select({
      id: referralEventsTable.id,
      eventType: referralEventsTable.eventType,
      creditsAwarded: referralEventsTable.creditsAwarded,
      createdAt: referralEventsTable.createdAt,
      referrerEmail: usersTable.email,
    })
    .from(referralEventsTable)
    .leftJoin(usersTable, eq(usersTable.id, referralEventsTable.referrerId))
    .orderBy(desc(referralEventsTable.createdAt))
    .limit(50);

  const totalClicks = totals?.totalClicks ?? 0;
  const totalConversions = totals?.totalConversions ?? 0;
  const conversionRate = totalClicks > 0 ? Math.round((totalConversions / totalClicks) * 1000) / 10 : 0;

  res.json(
    serialize({
      totalCodes: totals?.totalCodes ?? 0,
      totalClicks,
      totalConversions,
      conversionRate,
      totalCreditsAwarded: creditsRow?.totalCreditsAwarded ?? 0,
      topReferrers,
      recentEvents,
    }),
  );
});

export { getOrCreateReferralCode };
export default router;
