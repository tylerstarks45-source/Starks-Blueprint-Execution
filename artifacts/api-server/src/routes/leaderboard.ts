import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { milestoneEventsTable, platformSettingsTable } from "@workspace/db";
import { getTokenPayload, requireAdmin } from "../lib/auth";

const router: IRouter = Router();

// ─── Cache helpers ────────────────────────────────────────────────────────────

interface CacheEntry<T> { data: T; expiresAt: number }
const _cache = new Map<string, CacheEntry<unknown>>();
function getCache<T>(key: string): T | null {
  const e = _cache.get(key) as CacheEntry<T> | undefined;
  return e && Date.now() < e.expiresAt ? e.data : null;
}
function setCache<T>(key: string, data: T, ttlMs = 5 * 60 * 1000): void {
  _cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}
function clearLeaderboardCache(): void {
  for (const key of [..._cache.keys()]) {
    if (key.startsWith("lb") || key.startsWith("sw_") || key === "sp_settings") {
      _cache.delete(key);
    }
  }
}

// ─── Display name helpers ─────────────────────────────────────────────────────

export const MILESTONE_LABELS: Record<number, string> = {
  100: "$1", 10000: "$100", 50000: "$500",
  100000: "$1K", 500000: "$5K", 1000000: "$10K",
  5000000: "$50K", 10000000: "$100K",
};

type AnonLevel = "full_anon" | "first_name" | "full_name";

function anonymize(userId: number): string {
  return `Empire Member #${(userId * 7 + 1013) % 9000 + 1000}`;
}

/** Applies anonymization level. For full_name, consent gate is enforced by caller. */
function applyDisplayName(
  userId: number,
  fullName: string | null,
  anonLevel: AnonLevel,
  consentGiven: boolean,
): string {
  if (anonLevel === "full_name" && fullName && consentGiven) return fullName;
  if (anonLevel === "first_name") {
    const first = fullName?.trim().split(/\s+/)[0] ?? null;
    const suffix = `#${(userId * 7 + 1013) % 9000 + 1000}`;
    return first ? `${first} ${suffix}` : anonymize(userId);
  }
  return anonymize(userId);
}

async function getAnonLevel(): Promise<AnonLevel> {
  const cached = getCache<AnonLevel>("sp_settings");
  if (cached) return cached;
  try {
    const [row] = await db
      .select({ value: platformSettingsTable.value })
      .from(platformSettingsTable)
      .where(eq(platformSettingsTable.key, "social_proof_anon_level"));
    const level = (row?.value ?? "full_anon") as AnonLevel;
    setCache("sp_settings", level, 60 * 1000);
    return level;
  } catch {
    return "full_anon";
  }
}

function tierLabel(t: string | null | undefined): string {
  return (
    { free: "Free", builder: "Builder", operator: "Operator", empire: "Empire" } as Record<string, string>
  )[t ?? ""] ?? "Member";
}

// ─── Internal row type (cached; includes id for own-rank overlay) ─────────────

interface LbRow {
  _userId: number; // stripped before client response
  rank: number;
  displayName: string;
  tier: string;
  lifetimeCents: number;
  monthlyCents: number;
  systemCount: number;
  topSystemType: string | null;
  bestCategory: string | null;
}

// ─── GET /api/leaderboard ─────────────────────────────────────────────────────
// Public — top 50 earners, 5-min base dataset cache.
// isOwn + ownRank overlaid per-request from authenticated caller (JWT).
// For callers outside top 50, a separate RANK() query resolves their rank.

router.get("/leaderboard", async (req, res): Promise<void> => {
  const caller = getTokenPayload(req);
  const anonLevel = await getAnonLevel();

  // Use cached base dataset when available
  let baseRows = getCache<LbRow[]>(`lb_${anonLevel}`);
  if (!baseRows) {
    try {
      const result = await db.execute(sql`
        SELECT
          u.id,
          u.name,
          u.social_proof_consent,
          u.membership_tier,
          COALESCE(SUM(sae.amount_cents) FILTER (WHERE sae.event_type = 'revenue'), 0)::bigint AS lifetime_cents,
          COALESCE(SUM(sae.amount_cents) FILTER (WHERE sae.event_type = 'revenue'
            AND sae.created_at >= date_trunc('month', NOW())), 0)::bigint AS monthly_cents,
          COUNT(DISTINCT si.id)::int AS system_count,
          (
            SELECT b.name
            FROM system_instances si2
            JOIN blueprints b ON b.id = si2.blueprint_id
            JOIN system_activity_events sae2 ON sae2.system_instance_id = si2.id
            WHERE si2.user_id = u.id AND sae2.event_type = 'revenue'
            GROUP BY b.name
            ORDER BY SUM(sae2.amount_cents) DESC
            LIMIT 1
          ) AS top_system_type,
          (
            SELECT bc.name
            FROM system_instances si3
            JOIN blueprints b3 ON b3.id = si3.blueprint_id
            JOIN blueprint_categories bc ON bc.id = b3.category_id
            JOIN system_activity_events sae3 ON sae3.system_instance_id = si3.id
            WHERE si3.user_id = u.id AND sae3.event_type = 'revenue'
            GROUP BY bc.name
            ORDER BY SUM(sae3.amount_cents) DESC
            LIMIT 1
          ) AS best_category
        FROM users u
        JOIN system_instances si ON si.user_id = u.id
        JOIN system_activity_events sae ON sae.system_instance_id = si.id
        WHERE sae.event_type = 'revenue'
        GROUP BY u.id, u.name, u.social_proof_consent, u.membership_tier
        ORDER BY lifetime_cents DESC
        LIMIT 50
      `);

      baseRows = (result.rows as Array<{
        id: number; name: string | null; social_proof_consent: boolean;
        membership_tier: string | null;
        lifetime_cents: string; monthly_cents: string; system_count: number;
        top_system_type: string | null; best_category: string | null;
      }>).map((r, i) => ({
        _userId: r.id,
        rank: i + 1,
        displayName: applyDisplayName(r.id, r.name, anonLevel, r.social_proof_consent),
        tier: tierLabel(r.membership_tier),
        lifetimeCents: Number(r.lifetime_cents),
        monthlyCents: Number(r.monthly_cents),
        systemCount: Number(r.system_count),
        topSystemType: r.top_system_type ?? null,
        bestCategory: r.best_category ?? null,
      }));

      setCache(`lb_${anonLevel}`, baseRows); // 5-min TTL
    } catch (err) {
      req.log.error({ err }, "leaderboard query failed");
      res.json({ leaderboard: [], ownRank: null });
      return;
    }
  }

  // Overlay isOwn and compute ownRank
  let ownRank: number | null = null;
  const leaderboard = baseRows.map(r => {
    const isOwn = caller?.id === r._userId;
    if (isOwn) ownRank = r.rank;
    const { _userId, ...pub } = r;
    void _userId;
    return { ...pub, isOwn };
  });

  // If caller is authenticated but not in top 50, do a separate rank lookup
  if (caller && ownRank === null) {
    try {
      const rankResult = await db.execute(sql`
        SELECT rank FROM (
          SELECT u.id,
            RANK() OVER (ORDER BY COALESCE(SUM(sae.amount_cents) FILTER (WHERE sae.event_type = 'revenue'), 0) DESC) AS rank
          FROM users u
          JOIN system_instances si ON si.user_id = u.id
          JOIN system_activity_events sae ON sae.system_instance_id = si.id
          WHERE sae.event_type = 'revenue'
          GROUP BY u.id
        ) ranked
        WHERE id = ${caller.id}
      `);
      const row = rankResult.rows[0] as { rank: string } | undefined;
      ownRank = row ? Number(row.rank) : null;
    } catch (_err) { ownRank = null; }
  }

  res.json({ leaderboard, ownRank });
});

// ─── GET /api/leaderboard/stats ───────────────────────────────────────────────
// Public — platform-wide aggregate stats including monthly earnings + avg/system.

router.get("/leaderboard/stats", async (req, res): Promise<void> => {
  const cached = getCache<unknown>("lb_stats");
  if (cached) { res.json(cached); return; }
  try {
    const result = await db.execute(sql`
      SELECT
        COALESCE(SUM(sae.amount_cents), 0)::bigint AS total_earned_cents,
        COALESCE(SUM(sae.amount_cents) FILTER (WHERE sae.created_at >= date_trunc('month', NOW())), 0)::bigint AS monthly_earned_cents,
        (SELECT COUNT(*)::int FROM system_instances WHERE build_status = 'active') AS active_systems,
        (SELECT COUNT(*)::int FROM users WHERE active = true) AS total_members,
        (SELECT COUNT(*)::int FROM system_instances WHERE build_status = 'active') AS active_system_count
      FROM system_activity_events sae
      WHERE sae.event_type = 'revenue'
    `);
    const row = result.rows[0] as {
      total_earned_cents: string; monthly_earned_cents: string;
      active_systems: number; total_members: number; active_system_count: number;
    } | undefined;
    const activeSys = Number(row?.active_systems ?? 0);
    const totalCents = Number(row?.total_earned_cents ?? 0);
    const stats = {
      totalEarnedCents: totalCents,
      monthlyEarnedCents: Number(row?.monthly_earned_cents ?? 0),
      activeSystems: activeSys,
      totalMembers: Number(row?.total_members ?? 0),
      avgEarningsPerSystemCents: activeSys > 0 ? Math.round(totalCents / activeSys) : 0,
    };
    setCache("lb_stats", stats, 2 * 60 * 1000);
    res.json(stats);
  } catch (err) {
    req.log.error({ err }, "leaderboard/stats query failed");
    res.json({ totalEarnedCents: 0, monthlyEarnedCents: 0, activeSystems: 0, totalMembers: 0, avgEarningsPerSystemCents: 0 });
  }
});

// ─── GET /api/success-wall ────────────────────────────────────────────────────
// Public — last 50 milestone events, featured first, then by reachedAt DESC.

router.get("/success-wall", async (req, res): Promise<void> => {
  const anonLevel = await getAnonLevel();
  const cacheKey = `sw_${anonLevel}`;
  const cached = getCache<unknown[]>(cacheKey);
  if (cached) { res.json({ events: cached }); return; }
  try {
    const result = await db.execute(sql`
      SELECT
        me.id,
        me.user_id,
        me.amount_cents,
        me.milestone_label,
        me.system_type,
        me.best_category,
        me.featured,
        me.share_count,
        me.reached_at,
        u.name,
        u.social_proof_consent,
        u.membership_tier,
        EXTRACT(DAY FROM (me.reached_at - u.created_at))::int AS days_since_signup
      FROM milestone_events me
      JOIN users u ON u.id = me.user_id
      ORDER BY me.featured DESC, me.reached_at DESC
      LIMIT 50
    `);

    const events = (result.rows as Array<{
      id: number; user_id: number; name: string | null; social_proof_consent: boolean;
      amount_cents: number; milestone_label: string;
      system_type: string | null; best_category: string | null;
      featured: boolean; share_count: number; reached_at: string;
      membership_tier: string | null; days_since_signup: number;
    }>).map(r => ({
      id: r.id,
      memberName: applyDisplayName(r.user_id, r.name, anonLevel, r.social_proof_consent),
      tier: tierLabel(r.membership_tier),
      milestoneAmount: r.amount_cents,
      milestoneLabel: r.milestone_label,
      systemType: r.system_type ?? null,
      bestCategory: r.best_category ?? null,
      featured: r.featured,
      shareCount: r.share_count,
      reachedAt: r.reached_at,
      daysSinceSignup: Number(r.days_since_signup ?? 0),
    }));

    setCache(cacheKey, events);
    res.json({ events });
  } catch (err) {
    req.log.error({ err }, "success-wall query failed");
    res.json({ events: [] });
  }
});

// ─── POST /api/leaderboard/events/:id/share ───────────────────────────────────
// Public — increment share count for a milestone event.

router.post("/leaderboard/events/:id/share", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }
  try {
    const [updated] = await db
      .update(milestoneEventsTable)
      .set({ shareCount: sql`share_count + 1` })
      .where(eq(milestoneEventsTable.id, id))
      .returning({ id: milestoneEventsTable.id, shareCount: milestoneEventsTable.shareCount });
    if (!updated) { res.status(404).json({ error: "Event not found" }); return; }
    // Invalidate success-wall cache so share count shows up
    for (const k of [..._cache.keys()]) { if (k.startsWith("sw_")) _cache.delete(k); }
    res.json({ ok: true, shareCount: updated.shareCount });
  } catch (err) {
    req.log.error({ err }, "share increment failed");
    res.status(500).json({ error: "Internal error" });
  }
});

// ─── PATCH /api/leaderboard/events/:id/feature ────────────────────────────────
// Admin — toggle featured flag on a milestone event.

router.patch("/leaderboard/events/:id/feature", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }

  const parsed = z.object({ featured: z.boolean() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "featured (boolean) required" });
    return;
  }
  const { featured } = parsed.data;

  try {
    const [updated] = await db
      .update(milestoneEventsTable)
      .set({ featured })
      .where(eq(milestoneEventsTable.id, id))
      .returning({ id: milestoneEventsTable.id, featured: milestoneEventsTable.featured });

    if (!updated) { res.status(404).json({ error: "Event not found" }); return; }
    clearLeaderboardCache();
    res.json({ ok: true, id: updated.id, featured: updated.featured });
  } catch (err) {
    req.log.error({ err }, "feature toggle failed");
    res.status(500).json({ error: "Internal error" });
  }
});

// ─── GET /api/admin/social-proof-settings ─────────────────────────────────────
// Admin — read anonymization level config.

router.get("/admin/social-proof-settings", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  try {
    const [row] = await db
      .select({ value: platformSettingsTable.value })
      .from(platformSettingsTable)
      .where(eq(platformSettingsTable.key, "social_proof_anon_level"));
    res.json({ anonLevel: (row?.value ?? "full_anon") as AnonLevel });
  } catch (err) {
    req.log.error({ err }, "social-proof-settings get failed");
    res.json({ anonLevel: "full_anon" });
  }
});

// ─── PATCH /api/admin/social-proof-settings ───────────────────────────────────
// Admin — update anonymization level.

const VALID_ANON_LEVELS: AnonLevel[] = ["full_anon", "first_name", "full_name"];

router.patch("/admin/social-proof-settings", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const parsed = z.object({ anonLevel: z.enum(VALID_ANON_LEVELS) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: `anonLevel must be one of: ${VALID_ANON_LEVELS.join(", ")}` });
    return;
  }
  const { anonLevel } = parsed.data;

  try {
    await db.execute(sql`
      INSERT INTO platform_settings (key, value, updated_at)
      VALUES ('social_proof_anon_level', ${anonLevel}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
    `);
    clearLeaderboardCache();
    res.json({ ok: true, anonLevel });
  } catch (err) {
    req.log.error({ err }, "social-proof-settings patch failed");
    res.status(500).json({ error: "Internal error" });
  }
});

export default router;
