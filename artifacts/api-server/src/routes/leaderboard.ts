import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

interface CacheEntry<T> { data: T; expiresAt: number }
const _cache = new Map<string, CacheEntry<unknown>>();
function getCache<T>(key: string): T | null {
  const e = _cache.get(key) as CacheEntry<T> | undefined;
  return e && Date.now() < e.expiresAt ? e.data : null;
}
function setCache<T>(key: string, data: T, ttlMs = 5 * 60 * 1000): void {
  _cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export const MILESTONE_LABELS: Record<number, string> = {
  100: "$1", 10000: "$100", 50000: "$500",
  100000: "$1K", 500000: "$5K", 1000000: "$10K",
  5000000: "$50K", 10000000: "$100K",
};

function anonymize(userId: number): string {
  return `Empire Member #${(userId * 7 + 1013) % 9000 + 1000}`;
}
function tierLabel(t: string | null | undefined): string {
  return (
    { free: "Free", builder: "Builder", operator: "Operator", empire: "Empire" } as Record<string, string>
  )[t ?? ""] ?? "Member";
}

// ─── GET /api/leaderboard ─────────────────────────────────────────────────────
// Public — top 50 earners, fully anonymized, 5-min cache.

router.get("/leaderboard", async (req, res): Promise<void> => {
  const cached = getCache<unknown[]>("lb");
  if (cached) { res.json({ leaderboard: cached }); return; }
  try {
    const result = await db.execute(sql`
      SELECT u.id, u.membership_tier,
        COALESCE(SUM(sae.amount_cents) FILTER (WHERE sae.event_type = 'revenue'), 0)::bigint AS lifetime_cents,
        COALESCE(SUM(sae.amount_cents) FILTER (WHERE sae.event_type = 'revenue'
          AND sae.created_at >= date_trunc('month', NOW())), 0)::bigint AS monthly_cents,
        COUNT(DISTINCT si.id)::int AS system_count
      FROM users u
      JOIN system_instances si ON si.user_id = u.id
      JOIN system_activity_events sae ON sae.system_instance_id = si.id
      WHERE sae.event_type = 'revenue'
      GROUP BY u.id, u.membership_tier
      ORDER BY lifetime_cents DESC
      LIMIT 50
    `);
    const leaderboard = (result.rows as Array<{
      id: number; membership_tier: string | null;
      lifetime_cents: string; monthly_cents: string; system_count: number;
    }>).map((r, i) => ({
      rank: i + 1,
      displayName: anonymize(r.id),
      tier: tierLabel(r.membership_tier),
      lifetimeCents: Number(r.lifetime_cents),
      monthlyCents: Number(r.monthly_cents),
      systemCount: Number(r.system_count),
    }));
    setCache("lb", leaderboard);
    res.json({ leaderboard });
  } catch (err) {
    req.log.error({ err }, "leaderboard query failed");
    res.json({ leaderboard: [] });
  }
});

// ─── GET /api/leaderboard/stats ───────────────────────────────────────────────
// Public — platform-wide aggregate stats, 2-min cache.

router.get("/leaderboard/stats", async (req, res): Promise<void> => {
  const cached = getCache<unknown>("lb_stats");
  if (cached) { res.json(cached); return; }
  try {
    const result = await db.execute(sql`
      SELECT
        COALESCE(SUM(sae.amount_cents), 0)::bigint AS total_earned_cents,
        (SELECT COUNT(*)::int FROM system_instances WHERE build_status = 'active') AS active_systems,
        (SELECT COUNT(*)::int FROM users WHERE active = true) AS total_members
      FROM system_activity_events sae
      WHERE sae.event_type = 'revenue'
    `);
    const row = result.rows[0] as {
      total_earned_cents: string; active_systems: number; total_members: number;
    } | undefined;
    const stats = {
      totalEarnedCents: Number(row?.total_earned_cents ?? 0),
      activeSystems: Number(row?.active_systems ?? 0),
      totalMembers: Number(row?.total_members ?? 0),
    };
    setCache("lb_stats", stats, 2 * 60 * 1000);
    res.json(stats);
  } catch (err) {
    req.log.error({ err }, "leaderboard/stats query failed");
    res.json({ totalEarnedCents: 0, activeSystems: 0, totalMembers: 0 });
  }
});

// ─── GET /api/success-wall ────────────────────────────────────────────────────
// Public — last 50 milestone events, fully anonymized, 5-min cache.

router.get("/success-wall", async (req, res): Promise<void> => {
  const cached = getCache<unknown[]>("sw");
  if (cached) { res.json({ events: cached }); return; }
  try {
    const result = await db.execute(sql`
      SELECT id, membership_tier, milestones_reached,
        EXTRACT(DAY FROM (NOW() - created_at))::int AS days_since_signup
      FROM users
      WHERE milestones_reached IS NOT NULL
        AND jsonb_array_length(milestones_reached::jsonb) > 0
      ORDER BY updated_at DESC
      LIMIT 100
    `);

    const events: Array<{
      memberName: string; tier: string; milestoneAmount: number;
      milestoneLabel: string; reachedAt: string; daysSinceSignup: number;
    }> = [];

    for (const row of result.rows as Array<{
      id: number; membership_tier: string | null;
      milestones_reached: Array<{ amount: number; reachedAt: string }>;
      days_since_signup: number;
    }>) {
      const milestones = Array.isArray(row.milestones_reached) ? row.milestones_reached : [];
      for (const m of [...milestones].reverse().slice(0, 3)) {
        events.push({
          memberName: anonymize(row.id),
          tier: tierLabel(row.membership_tier),
          milestoneAmount: m.amount,
          milestoneLabel: MILESTONE_LABELS[m.amount] ?? `$${Math.round(m.amount / 100).toLocaleString()}`,
          reachedAt: m.reachedAt,
          daysSinceSignup: Number(row.days_since_signup ?? 0),
        });
        if (events.length >= 50) break;
      }
      if (events.length >= 50) break;
    }

    setCache("sw", events);
    res.json({ events });
  } catch (err) {
    req.log.error({ err }, "success-wall query failed");
    res.json({ events: [] });
  }
});

export default router;
