import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql, eq } from "drizzle-orm";
import { milestoneEventsTable, platformSettingsTable } from "@workspace/db";
import { getTokenPayload } from "../lib/auth";

const router: IRouter = Router();

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "admin", "FOUNDER_ADMIN"]);

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
  ["lb", "sw", "sp_settings"].forEach(k => _cache.delete(k));
}

export const MILESTONE_LABELS: Record<number, string> = {
  100: "$1", 10000: "$100", 50000: "$500",
  100000: "$1K", 500000: "$5K", 1000000: "$10K",
  5000000: "$50K", 10000000: "$100K",
};

// Supported anonymization levels (stored in platform_settings key "social_proof_anon_level")
type AnonLevel = "full_anon" | "first_name" | "full_name";

function anonymize(userId: number): string {
  return `Empire Member #${(userId * 7 + 1013) % 9000 + 1000}`;
}

function displayName(userId: number, fullName: string | null, anonLevel: AnonLevel): string {
  if (anonLevel === "full_name" && fullName) return fullName;
  if (anonLevel === "first_name") {
    const first = fullName?.split(/\s+/)[0] ?? null;
    const suffix = `#${(userId * 7 + 1013) % 9000 + 1000}`;
    return first ? `${first} ${suffix}` : anonymize(userId);
  }
  return anonymize(userId); // full_anon (default)
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
    setCache("sp_settings", level, 60 * 1000); // 1-min cache
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

// ─── GET /api/leaderboard ─────────────────────────────────────────────────────
// Public — top 50 earners.  Own-rank derived from authenticated caller (JWT),
// not from query param, to avoid arbitrary user rank leakage.

router.get("/leaderboard", async (req, res): Promise<void> => {
  const caller = getTokenPayload(req); // nullable — public endpoint
  const anonLevel = await getAnonLevel();

  try {
    // Always re-query to mark isOwn (cannot cache with caller-aware rows)
    const result = await db.execute(sql`
      SELECT
        u.id,
        u.name,
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
      GROUP BY u.id, u.name, u.membership_tier
      ORDER BY lifetime_cents DESC
      LIMIT 50
    `);

    let ownRank: number | null = null;
    const leaderboard = (result.rows as Array<{
      id: number; name: string | null; membership_tier: string | null;
      lifetime_cents: string; monthly_cents: string; system_count: number;
      top_system_type: string | null; best_category: string | null;
    }>).map((r, i) => {
      const rank = i + 1;
      const isOwn = caller?.id === r.id;
      if (isOwn) ownRank = rank;
      return {
        rank,
        displayName: displayName(r.id, r.name, anonLevel),
        tier: tierLabel(r.membership_tier),
        lifetimeCents: Number(r.lifetime_cents),
        monthlyCents: Number(r.monthly_cents),
        systemCount: Number(r.system_count),
        topSystemType: r.top_system_type ?? null,
        bestCategory: r.best_category ?? null,
        isOwn,
      };
    });

    res.json({ leaderboard, ownRank });
  } catch (err) {
    req.log.error({ err }, "leaderboard query failed");
    res.json({ leaderboard: [], ownRank: null });
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
// Public — last 50 milestone events from dedicated table, globally ordered.

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
        me.reached_at,
        u.name,
        u.membership_tier,
        EXTRACT(DAY FROM (me.reached_at - u.created_at))::int AS days_since_signup
      FROM milestone_events me
      JOIN users u ON u.id = me.user_id
      ORDER BY me.featured DESC, me.reached_at DESC
      LIMIT 50
    `);

    const events = (result.rows as Array<{
      id: number; user_id: number; name: string | null;
      amount_cents: number; milestone_label: string;
      system_type: string | null; best_category: string | null;
      featured: boolean; reached_at: string;
      membership_tier: string | null; days_since_signup: number;
    }>).map(r => ({
      id: r.id,
      memberName: displayName(r.user_id, r.name, anonLevel),
      tier: tierLabel(r.membership_tier),
      milestoneAmount: r.amount_cents,
      milestoneLabel: r.milestone_label,
      systemType: r.system_type ?? null,
      bestCategory: r.best_category ?? null,
      featured: r.featured,
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

// ─── PATCH /api/leaderboard/events/:id/feature ────────────────────────────────
// Admin — toggle featured flag on a milestone event.

router.patch("/leaderboard/events/:id/feature", async (req, res): Promise<void> => {
  const caller = getTokenPayload(req);
  if (!caller || !ADMIN_ROLES.has(caller.role)) {
    res.status(caller ? 403 : 401).json({ error: caller ? "Forbidden" : "Unauthorized" });
    return;
  }

  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }

  const { featured } = req.body as { featured?: boolean };
  if (typeof featured !== "boolean") {
    res.status(400).json({ error: "featured (boolean) required" });
    return;
  }

  try {
    const [updated] = await db
      .update(milestoneEventsTable)
      .set({ featured })
      .where(eq(milestoneEventsTable.id, id))
      .returning({ id: milestoneEventsTable.id, featured: milestoneEventsTable.featured });

    if (!updated) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    clearLeaderboardCache();
    res.json({ ok: true, id: updated.id, featured: updated.featured });
  } catch (err) {
    req.log.error({ err }, "feature toggle failed");
    res.status(500).json({ error: "Internal error" });
  }
});

// ─── GET /api/admin/social-proof-settings ─────────────────────────────────────
// Admin — read current anonymization level and other social-proof config.

router.get("/admin/social-proof-settings", async (req, res): Promise<void> => {
  const caller = getTokenPayload(req);
  if (!caller || !ADMIN_ROLES.has(caller.role)) {
    res.status(caller ? 403 : 401).json({ error: caller ? "Forbidden" : "Unauthorized" });
    return;
  }

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
  const caller = getTokenPayload(req);
  if (!caller || !ADMIN_ROLES.has(caller.role)) {
    res.status(caller ? 403 : 401).json({ error: caller ? "Forbidden" : "Unauthorized" });
    return;
  }

  const { anonLevel } = req.body as { anonLevel?: string };
  if (!anonLevel || !VALID_ANON_LEVELS.includes(anonLevel as AnonLevel)) {
    res.status(400).json({ error: `anonLevel must be one of: ${VALID_ANON_LEVELS.join(", ")}` });
    return;
  }

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
