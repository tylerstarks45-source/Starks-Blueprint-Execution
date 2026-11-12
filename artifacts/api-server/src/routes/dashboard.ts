import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, and, gte, sql, inArray } from "drizzle-orm";
import {
  db,
  blueprintsTable,
  toolsTable,
  toolCategoriesTable,
  systemInstancesTable,
  buildProgressTable,
  buildSessionsTable,
  systemActivityEventsTable,
  systemRevenueProvidersTable,
  publishedContentTable,
  openrouterUsageTable,
  chatSessionsTable,
  userCredentialsTable,
  usersTable,
} from "@workspace/db";
import { complete } from "../lib/openrouter";
import { requireAuthActive } from "../lib/auth";
import { hasCredits } from "../lib/credits";
import { z } from "zod";

const router: IRouter = Router();

// POST /api/dashboard/chat — blueprint + tool-aware AI chat for the user dashboard
router.post("/dashboard/chat", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  if (!(await hasCredits(userId))) {
    res.status(402).json({ error: "You're out of AI credits. Top up to continue.", code: "out_of_credits" });
    return;
  }

  const schema = z.object({
    message: z.string().min(1).max(2000),
    history: z.array(z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })).max(20).default([]),
    systemInstanceId: z.number().int().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Fetch blueprints catalog
  const blueprints = await db.select({
    id: blueprintsTable.id,
    name: blueprintsTable.name,
    description: blueprintsTable.description,
    difficulty: blueprintsTable.difficulty,
    estimatedCost: blueprintsTable.estimatedCost,
    estimatedTime: blueprintsTable.estimatedTime,
    slug: blueprintsTable.slug,
  }).from(blueprintsTable);

  // Fetch tools with categories and affiliate links
  const toolCategories = await db.select().from(toolCategoriesTable);
  const categoryMap = Object.fromEntries(toolCategories.map((c) => [c.id, c.name]));
  const tools = await db.select().from(toolsTable).where(eq(toolsTable.activeStatus, true));

  // Build context about user's current systems if systemInstanceId provided
  let userSystemContext = "";
  if (parsed.data.systemInstanceId) {
    const [instance] = await db
      .select()
      .from(systemInstancesTable)
      .where(and(
        eq(systemInstancesTable.id, parsed.data.systemInstanceId),
        eq(systemInstancesTable.userId, userId)
      ));
    if (instance) {
      const [bp] = instance.blueprintId != null
        ? await db.select().from(blueprintsTable).where(eq(blueprintsTable.id, instance.blueprintId))
        : [];
      const [session] = await db
        .select()
        .from(buildSessionsTable)
        .where(eq(buildSessionsTable.systemInstanceId, instance.id));
      let progress: typeof buildProgressTable.$inferSelect[] = [];
      if (session) {
        progress = await db
          .select()
          .from(buildProgressTable)
          .where(eq(buildProgressTable.buildSessionId, session.id));
      }
      const done = progress.filter((s) => s.status === "completed").length;
      userSystemContext = `
USER'S CURRENT SYSTEM CONTEXT:
- System Name: ${instance.name}
- Blueprint: ${bp?.name ?? "Unknown"}
- Build Status: ${instance.buildStatus}
- Health: ${instance.healthStatus}
- Progress: ${done}/${progress.length} steps completed
`;
    }
  }

  const blueprintCatalog = blueprints
    .map((b) => `• ${b.name} (${b.difficulty}, ~${b.estimatedCost ?? "varies"}, ~${b.estimatedTime ?? "varies"}): ${b.description ?? ""}`)
    .join("\n");

  const toolCatalog = tools
    .map((t) => {
      const cat = t.categoryId ? (categoryMap[t.categoryId] ?? "General") : "General";
      const link = t.affiliateLink ? ` | Signup: ${t.affiliateLink}` : "";
      const creds = t.requiredCredentials && t.requiredCredentials.length > 0
        ? ` | Requires: ${t.requiredCredentials.join(", ")}`
        : "";
      return `• [${cat}] ${t.name}: ${t.description ?? ""}${creds}${link}`;
    })
    .join("\n");

  const systemPrompt = `You are SBEP's AI Build Agent — the personal AI architect on the Starks Blueprint Execution Platform. You help users build automated income systems.

AVAILABLE BLUEPRINTS (these are the ONLY blueprints you can recommend — never invent others):
${blueprintCatalog}

MARKETPLACE TOOLS (always use these exact tools and their affiliate links — never make up tools):
${toolCatalog}
${userSystemContext}
YOUR RESPONSIBILITIES:
1. Help users pick the right blueprint for their goals
2. After blueprint selection → list EXACTLY which tools they need with their affiliate signup links
3. Answer "what credentials/info do I need for [tool]?" with the specific fields listed in Requires
4. Guide users through the build process step by step
5. Be honest about what the system will and won't do for them
6. Keep responses concise, specific, and actionable

RESPONSE FORMAT for tool recommendations:
**[Tool Name]** — [why needed for this blueprint]
🔗 Sign up: [exact affiliate link from catalog]
📋 You'll need: [required credentials]

If a tool has no affiliate link in the catalog, say "Available on marketplace" instead.`;

  try {
    // Format conversation history into the prompt so the AI has full context.
    const historyText = parsed.data.history.slice(-8)
      .map((h) => `${h.role === "user" ? "User" : "Agent"}: ${h.content}`)
      .join("\n");

    const prompt = historyText
      ? `CONVERSATION SO FAR:\n${historyText}\n\nUser: ${parsed.data.message}`
      : parsed.data.message;

    const result = await complete({
      systemPrompt,
      prompt,
      model: "openai/gpt-4o-mini",
      userId,
    });

    // Extract any tool recommendations from the response for structured display
    const recommendedTools = tools.filter((t) =>
      t.affiliateLink && result.content.toLowerCase().includes(t.name.toLowerCase())
    ).slice(0, 6).map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      affiliateLink: t.affiliateLink,
      category: t.categoryId ? (categoryMap[t.categoryId] ?? "General") : "General",
      requiredCredentials: t.requiredCredentials ?? [],
    }));

    res.json({
      content: result.content,
      recommendedTools,
      totalTokens: result.totalTokens,
    });
  } catch (err: any) {
    const code = (err as { code?: string })?.code;
    if (code === "out_of_credits") {
      res.status(402).json({ error: "Out of AI credits.", code });
      return;
    }
    if (code === "daily_ai_limit") {
      res.status(429).json({ error: err.message, code });
      return;
    }
    req.log.error({ err }, "Dashboard chat error");
    res.status(500).json({ error: "AI chat failed. Please try again." });
  }
});

// GET /api/dashboard/revenue-summary — aggregated earnings across all user systems
router.get("/dashboard/revenue-summary", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  // Get all system instance IDs for this user
  const userSystems = await db
    .select({ id: systemInstancesTable.id })
    .from(systemInstancesTable)
    .where(eq(systemInstancesTable.userId, userId));

  const makeEmptyDaily = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      return { date: d.toISOString().slice(0, 10), cents: 0 };
    });
  };

  if (userSystems.length === 0) {
    res.json({ todayCents: 0, weekCents: 0, monthCents: 0, lifetimeCents: 0, systemCount: 0, currency: "USD", daily: makeEmptyDaily() });
    return;
  }

  const systemIds = userSystems.map((s) => s.id);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 6);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  // Determine which systems have linked revenue providers so we don't double-count.
  // For systems WITH linked providers → sum only provider-tagged (real) events.
  // For systems WITHOUT linked providers → sum all revenue events (simulated).
  const linkedProviderRows = await db
    .select({ systemInstanceId: systemRevenueProvidersTable.systemInstanceId })
    .from(systemRevenueProvidersTable)
    .where(
      and(
        inArray(systemRevenueProvidersTable.systemInstanceId, systemIds),
        eq(systemRevenueProvidersTable.enabled, true),
      ),
    );
  const linkedSystemIds = [...new Set(linkedProviderRows.map((r) => r.systemInstanceId))];
  const unlinkedSystemIds = systemIds.filter((id) => !linkedSystemIds.includes(id));

  // Smart base: real-only for linked systems, all events for unlinked systems.
  const smartRevenueBase = (() => {
    if (linkedSystemIds.length === 0) {
      // No linked providers — use all revenue events as before
      return and(
        inArray(systemActivityEventsTable.systemInstanceId, systemIds),
        eq(systemActivityEventsTable.eventType, "revenue"),
      );
    }
    const realPart = and(
      inArray(systemActivityEventsTable.systemInstanceId, linkedSystemIds),
      eq(systemActivityEventsTable.eventType, "revenue"),
      sql`${systemActivityEventsTable.revenueProvider} is not null`,
    );
    if (unlinkedSystemIds.length === 0) return realPart;
    return sql`(
      ${systemActivityEventsTable.eventType} = 'revenue' AND (
        (${systemActivityEventsTable.systemInstanceId} = ANY(${sql.raw(`'{${linkedSystemIds.join(",")}}'::int[]`)}) AND ${systemActivityEventsTable.revenueProvider} IS NOT NULL)
        OR ${systemActivityEventsTable.systemInstanceId} = ANY(${sql.raw(`'{${unlinkedSystemIds.join(",")}}'::int[]`)})
      )
    )`;
  })();

  // realRevenueCents: platform-confirmed total across ALL linked systems (for UI badge)
  const realRevenueBase = and(
    inArray(systemActivityEventsTable.systemInstanceId, systemIds),
    eq(systemActivityEventsTable.eventType, "revenue"),
    sql`${systemActivityEventsTable.revenueProvider} is not null`,
  );

  const [todayRows, weekRows, monthRows, lifetimeRows, dailyRaw, realLifetimeRows] = await Promise.all([
    db
      .select({ total: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)` })
      .from(systemActivityEventsTable)
      .where(and(smartRevenueBase, gte(systemActivityEventsTable.createdAt, startOfToday))),
    db
      .select({ total: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)` })
      .from(systemActivityEventsTable)
      .where(and(smartRevenueBase, gte(systemActivityEventsTable.createdAt, startOfWeek))),
    db
      .select({ total: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)` })
      .from(systemActivityEventsTable)
      .where(and(smartRevenueBase, gte(systemActivityEventsTable.createdAt, startOfMonth))),
    db
      .select({ total: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)` })
      .from(systemActivityEventsTable)
      .where(smartRevenueBase),
    db
      .select({
        date: sql<string>`to_char(date_trunc('day', ${systemActivityEventsTable.createdAt}), 'YYYY-MM-DD')`,
        cents: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)`,
      })
      .from(systemActivityEventsTable)
      .where(and(smartRevenueBase, gte(systemActivityEventsTable.createdAt, sevenDaysAgo)))
      .groupBy(sql`date_trunc('day', ${systemActivityEventsTable.createdAt})`),
    db
      .select({ total: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)` })
      .from(systemActivityEventsTable)
      .where(realRevenueBase),
  ]);

  const daily: Array<{ date: string; cents: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(startOfToday);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const row = dailyRaw.find((r) => r.date === key);
    daily.push({ date: key, cents: row ? Number(row.cents) : 0 });
  }

  res.json({
    todayCents: Number(todayRows[0]?.total ?? 0),
    weekCents: Number(weekRows[0]?.total ?? 0),
    monthCents: Number(monthRows[0]?.total ?? 0),
    lifetimeCents: Number(lifetimeRows[0]?.total ?? 0),
    realRevenueCents: Number(realLifetimeRows[0]?.total ?? 0),
    connectedProviderCount: linkedSystemIds.length,
    systemCount: systemIds.length,
    currency: "USD",
    daily,
  });
});

// GET /api/dashboard/performance — unified health scores, 30-day trend, content/leads, needs-attention
router.get("/dashboard/performance", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const userSystems = await db
    .select()
    .from(systemInstancesTable)
    .where(eq(systemInstancesTable.userId, userId));

  if (userSystems.length === 0) {
    const emptyTrend = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      d.setHours(0, 0, 0, 0);
      return { date: d.toISOString().slice(0, 10), day: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), cents: 0, activity: 0 };
    });
    res.json({ systems: [], trendData: emptyTrend, contentPublished: 0, leadsCaptured: 0, topSystem: null, needsAttention: [] });
    return;
  }

  const systemIds = userSystems.map((s) => s.id);

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const [
    revenueBySystem,
    revenueTrend,
    activityTrend,
    errorsBySystem7d,
    lastActivityBySystem,
    weekRevBySystem,
    todayRevBySystem,
    contentPublishedRow,
    leadsRow,
  ] = await Promise.all([
    db.select({
      systemInstanceId: systemActivityEventsTable.systemInstanceId,
      lifetimeCents: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)`,
    })
    .from(systemActivityEventsTable)
    .where(and(inArray(systemActivityEventsTable.systemInstanceId, systemIds), eq(systemActivityEventsTable.eventType, "revenue")))
    .groupBy(systemActivityEventsTable.systemInstanceId),

    db.select({
      date: sql<string>`to_char(date_trunc('day', ${systemActivityEventsTable.createdAt}), 'YYYY-MM-DD')`,
      cents: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)`,
    })
    .from(systemActivityEventsTable)
    .where(and(inArray(systemActivityEventsTable.systemInstanceId, systemIds), eq(systemActivityEventsTable.eventType, "revenue"), gte(systemActivityEventsTable.createdAt, thirtyDaysAgo)))
    .groupBy(sql`date_trunc('day', ${systemActivityEventsTable.createdAt})`),

    db.select({
      date: sql<string>`to_char(date_trunc('day', ${systemActivityEventsTable.createdAt}), 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(systemActivityEventsTable)
    .where(and(inArray(systemActivityEventsTable.systemInstanceId, systemIds), gte(systemActivityEventsTable.createdAt, thirtyDaysAgo)))
    .groupBy(sql`date_trunc('day', ${systemActivityEventsTable.createdAt})`),

    db.select({
      systemInstanceId: systemActivityEventsTable.systemInstanceId,
      errorCount: sql<number>`count(*)::int`,
    })
    .from(systemActivityEventsTable)
    .where(and(inArray(systemActivityEventsTable.systemInstanceId, systemIds), eq(systemActivityEventsTable.eventType, "error"), gte(systemActivityEventsTable.createdAt, sevenDaysAgo)))
    .groupBy(systemActivityEventsTable.systemInstanceId),

    db.select({
      systemInstanceId: systemActivityEventsTable.systemInstanceId,
      lastAt: sql<string>`max(${systemActivityEventsTable.createdAt})`,
    })
    .from(systemActivityEventsTable)
    .where(inArray(systemActivityEventsTable.systemInstanceId, systemIds))
    .groupBy(systemActivityEventsTable.systemInstanceId),

    db.select({
      systemInstanceId: systemActivityEventsTable.systemInstanceId,
      cents: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)`,
    })
    .from(systemActivityEventsTable)
    .where(and(inArray(systemActivityEventsTable.systemInstanceId, systemIds), eq(systemActivityEventsTable.eventType, "revenue"), gte(systemActivityEventsTable.createdAt, sevenDaysAgo)))
    .groupBy(systemActivityEventsTable.systemInstanceId),

    db.select({
      systemInstanceId: systemActivityEventsTable.systemInstanceId,
      cents: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)`,
    })
    .from(systemActivityEventsTable)
    .where(and(inArray(systemActivityEventsTable.systemInstanceId, systemIds), eq(systemActivityEventsTable.eventType, "revenue"), gte(systemActivityEventsTable.createdAt, startOfToday)))
    .groupBy(systemActivityEventsTable.systemInstanceId),

    db.select({ count: sql<number>`count(*)::int` })
    .from(publishedContentTable)
    .where(and(inArray(publishedContentTable.systemInstanceId, systemIds), eq(publishedContentTable.status, "published"))),

    db.select({ count: sql<number>`count(*)::int` })
    .from(systemActivityEventsTable)
    .where(and(inArray(systemActivityEventsTable.systemInstanceId, systemIds), eq(systemActivityEventsTable.eventType, "lead"))),
  ]);

  const revenueMap = new Map<number, number>();
  for (const r of revenueBySystem) {
    if (r.systemInstanceId !== null) revenueMap.set(r.systemInstanceId, Number(r.lifetimeCents));
  }
  const errorMap = new Map<number, number>();
  for (const r of errorsBySystem7d) {
    if (r.systemInstanceId !== null) errorMap.set(r.systemInstanceId, Number(r.errorCount));
  }
  const lastActMap = new Map<number, Date>();
  for (const r of lastActivityBySystem) {
    if (r.systemInstanceId !== null && r.lastAt) lastActMap.set(r.systemInstanceId, new Date(r.lastAt));
  }
  const weekRevMap = new Map<number, number>();
  for (const r of weekRevBySystem) {
    if (r.systemInstanceId !== null) weekRevMap.set(r.systemInstanceId, Number(r.cents));
  }
  const todayRevMap = new Map<number, number>();
  for (const r of todayRevBySystem) {
    if (r.systemInstanceId !== null) todayRevMap.set(r.systemInstanceId, Number(r.cents));
  }

  const sevenDayMs = 7 * 24 * 60 * 60 * 1000;

  const systemsWithHealth = userSystems.map((s) => {
    let score = (() => {
      if (s.buildStatus === "active" || s.buildStatus === "completed" || s.healthStatus === "healthy") return 85;
      if (s.buildStatus === "building") return 55;
      if (s.buildStatus === "paused") return 30;
      if (s.healthStatus === "unhealthy" || s.buildStatus === "failed") return 5;
      return 20;
    })();
    const errCount = errorMap.get(s.id) ?? 0;
    score -= Math.min(40, errCount * 10);
    const lastAct = lastActMap.get(s.id);
    if (lastAct) {
      const msSince = Date.now() - lastAct.getTime();
      if (msSince > sevenDayMs) score -= 15;
      else if (msSince < 3_600_000) score += 10;
    }
    const rev = revenueMap.get(s.id) ?? 0;
    if (rev > 10_000) score += 10;
    score = Math.min(100, Math.max(0, score));
    return {
      id: s.id,
      name: s.name,
      buildStatus: s.buildStatus,
      healthStatus: s.healthStatus,
      healthScore: score,
      lifetimeCents: rev,
      todayCents: todayRevMap.get(s.id) ?? 0,
      weekRevCents: weekRevMap.get(s.id) ?? 0,
      lastActivityAt: lastAct ? lastAct.toISOString() : null,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  });

  const revTrendMap = new Map<string, number>();
  for (const r of revenueTrend) revTrendMap.set(r.date, Number(r.cents));
  const actTrendMap = new Map<string, number>();
  for (const r of activityTrend) actTrendMap.set(r.date, Number(r.count));

  const trendData = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    return {
      date: key,
      day: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      cents: revTrendMap.get(key) ?? 0,
      activity: actTrendMap.get(key) ?? 0,
    };
  });

  const topSystem = [...systemsWithHealth].sort((a, b) => b.lifetimeCents - a.lifetimeCents)[0] ?? null;

  const needsAttention = systemsWithHealth
    .filter((s) => {
      if (s.buildStatus === "paused") return true;
      if ((errorMap.get(s.id) ?? 0) > 0) return true;
      const isActive = s.buildStatus === "active" || s.buildStatus === "completed";
      if (isActive && (weekRevMap.get(s.id) ?? 0) === 0) {
        const lastAct = lastActMap.get(s.id);
        if (!lastAct || Date.now() - lastAct.getTime() > sevenDayMs) return true;
      }
      return false;
    })
    .map((s) => ({
      ...s,
      alertReason: s.buildStatus === "paused"
        ? "paused"
        : (errorMap.get(s.id) ?? 0) > 0
          ? "errors"
          : "inactive",
    }));

  res.json({
    systems: serialize(systemsWithHealth),
    trendData,
    contentPublished: Number(contentPublishedRow[0]?.count ?? 0),
    leadsCaptured: Number(leadsRow[0]?.count ?? 0),
    topSystem: topSystem ? serialize(topSystem) : null,
    needsAttention: serialize(needsAttention),
  });
});

// GET /api/dashboard/ai-activity — recent AI completions for the current user
router.get("/dashboard/ai-activity", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const limit = Math.min(Number(req.query.limit ?? 20), 100);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [rows, [totals]] = await Promise.all([
    db
      .select({
        id: openrouterUsageTable.id,
        model: openrouterUsageTable.model,
        totalTokens: openrouterUsageTable.totalTokens,
        estimatedCost: openrouterUsageTable.estimatedCost,
        success: openrouterUsageTable.success,
        createdAt: openrouterUsageTable.createdAt,
      })
      .from(openrouterUsageTable)
      .where(eq(openrouterUsageTable.userId, userId))
      .orderBy(sql`${openrouterUsageTable.createdAt} desc`)
      .limit(limit),
    db
      .select({
        totalCalls: sql<number>`count(*)::int`,
        totalTokens: sql<number>`coalesce(sum(${openrouterUsageTable.totalTokens}), 0)::int`,
        totalCost: sql<number>`coalesce(sum(${openrouterUsageTable.estimatedCost}::numeric), 0)`,
        successRate: sql<number>`round(100.0 * sum(case when ${openrouterUsageTable.success} = 'true' then 1 else 0 end) / nullif(count(*),0), 1)`,
      })
      .from(openrouterUsageTable)
      .where(and(eq(openrouterUsageTable.userId, userId), gte(openrouterUsageTable.createdAt, sevenDaysAgo))),
  ]);

  res.json({
    recentActivity: serialize(rows),
    stats: {
      totalCalls7d: Number(totals?.totalCalls ?? 0),
      totalTokens7d: Number(totals?.totalTokens ?? 0),
      totalCost7d: Number(totals?.totalCost ?? 0),
      successRate7d: Number(totals?.successRate ?? 100),
    },
  });
});

// GET /api/dashboard/onboarding-progress — 4-step onboarding checklist state for the current user
router.get("/dashboard/onboarding-progress", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const [user] = await db
    .select({ dismissed: usersTable.onboardingChecklistDismissed })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  const [[chatRow], [systemRow], [credentialRow], [buildRow]] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(chatSessionsTable)
      .where(and(eq(chatSessionsTable.userId, userId), sql`${chatSessionsTable.messageCount} > 0`)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(systemInstancesTable)
      .where(eq(systemInstancesTable.userId, userId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(userCredentialsTable)
      .where(eq(userCredentialsTable.userId, userId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(systemInstancesTable)
      .where(and(
        eq(systemInstancesTable.userId, userId),
        inArray(systemInstancesTable.buildStatus, ["active", "completed"]),
      )),
  ]);

  const steps = [
    {
      id: "chat",
      label: "Chat with ASH about your goal",
      description: "Tell ASH what kind of income system you want to build.",
      done: Number(chatRow?.count ?? 0) > 0,
      actionUrl: "/builder",
      actionLabel: "Open Builder",
    },
    {
      id: "system",
      label: "Create your first system",
      description: "Pick a blueprint or let ASH design one for you.",
      done: Number(systemRow?.count ?? 0) > 0,
      actionUrl: "/blueprints",
      actionLabel: "Browse Blueprints",
    },
    {
      id: "credential",
      label: "Connect a tool",
      description: "Link an account so ASH can operate on your behalf.",
      done: Number(credentialRow?.count ?? 0) > 0,
      actionUrl: "/connections",
      actionLabel: "Connect Tools",
    },
    {
      id: "build",
      label: "Launch your first build",
      description: "Complete a build so your system goes live.",
      done: Number(buildRow?.count ?? 0) > 0,
      actionUrl: "/systems",
      actionLabel: "View Systems",
    },
  ];

  res.json({
    steps,
    completedCount: steps.filter((s) => s.done).length,
    totalCount: steps.length,
    dismissed: user?.dismissed ?? false,
  });
});

// POST /api/dashboard/onboarding-progress/dismiss — hide the onboarding checklist card
router.post("/dashboard/onboarding-progress/dismiss", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  await db
    .update(usersTable)
    .set({ onboardingChecklistDismissed: true })
    .where(eq(usersTable.id, userId));

  res.json({ dismissed: true });
});

// GET /api/dashboard/blueprints — all published blueprints (no auth required)
router.get("/dashboard/blueprints", async (_req, res): Promise<void> => {
  const blueprints = await db
    .select()
    .from(blueprintsTable)
    .orderBy(blueprintsTable.name);
  res.json(serialize(blueprints));
});

export default router;
