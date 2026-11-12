// Read-only insight endpoints (also reachable as /api/ash/* via the app alias) for the ASH Brain and Stats pages. Everything is
// scoped to the caller except ash_lessons (already privacy-safe aggregates)
// and the brain registry (architecture metadata, no user data).
import { Router, type IRouter } from "express";
import { and, eq, gte, inArray, sql, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import {
  db,
  usersTable,
  businessesTable,
  systemInstancesTable,
  userMemoryTable,
  ashKnowledgeEntriesTable,
  ashResearchSessionsTable,
  ashLessonsTable,
  ashProjectsTable,
  openrouterUsageTable,
  businessRecommendationsTable,
  scheduledPostsTable,
  generatedFilesTable,
} from "@workspace/db";
import { requireAuthActive } from "../lib/auth";
import { getCognitiveHealthReport } from "../lib/cognitive-foundation";
import { familiarity, loadStyleProfile } from "../lib/ash-agent/persona";

const router: IRouter = Router();
const DAY = 24 * 60 * 60 * 1000;

async function count(table: PgTable, where?: SQL): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(table).where(where);
  return row?.n ?? 0;
}

async function latest(column: unknown, table: PgTable, where?: SQL): Promise<string | null> {
  const [row] = await db.select({ at: sql<Date | null>`max(${column})` }).from(table).where(where);
  return row?.at ? new Date(row.at).toISOString() : null;
}

/** Activity level 0-100: last-7-day activity relative to a healthy weekly target. */
export const level = (weekly: number, target: number) => Math.min(100, Math.round((weekly / target) * 100));

async function ownedBusinessIds(userId: number): Promise<number[]> {
  const rows = await db.select({ id: businessesTable.id }).from(businessesTable).where(eq(businessesTable.ownerId, userId));
  return rows.map((r) => r.id);
}

router.get("/ai-orchestrator/brain-activity", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  try {
    const week = new Date(Date.now() - 7 * DAY);
    const bizIds = await ownedBusinessIds(userId);
    const recScope = bizIds.length ? inArray(businessRecommendationsTable.businessId, bizIds) : sql`false`;

    const [
      memTotal, memWeek, memLast,
      knTotal, knWeek, knLast,
      rsTotal, rsWeek, rsLast,
      lsTotal, lsWeek, lsLast,
      pjTotal, pjWeek, pjLast,
      aiTotal, aiWeek, aiLast,
      rcTotal, rcWeek, rcLast,
      health, style, daily,
    ] = await Promise.all([
      count(userMemoryTable, eq(userMemoryTable.userId, userId)),
      count(userMemoryTable, and(eq(userMemoryTable.userId, userId), gte(userMemoryTable.updatedAt, week))),
      latest(userMemoryTable.updatedAt, userMemoryTable, eq(userMemoryTable.userId, userId)),
      count(ashKnowledgeEntriesTable, eq(ashKnowledgeEntriesTable.userId, userId)),
      count(ashKnowledgeEntriesTable, and(eq(ashKnowledgeEntriesTable.userId, userId), gte(ashKnowledgeEntriesTable.updatedAt, week))),
      latest(ashKnowledgeEntriesTable.updatedAt, ashKnowledgeEntriesTable, eq(ashKnowledgeEntriesTable.userId, userId)),
      count(ashResearchSessionsTable, eq(ashResearchSessionsTable.userId, userId)),
      count(ashResearchSessionsTable, and(eq(ashResearchSessionsTable.userId, userId), gte(ashResearchSessionsTable.createdAt, week))),
      latest(ashResearchSessionsTable.createdAt, ashResearchSessionsTable, eq(ashResearchSessionsTable.userId, userId)),
      count(ashLessonsTable),
      count(ashLessonsTable, gte(ashLessonsTable.updatedAt, week)),
      latest(ashLessonsTable.updatedAt, ashLessonsTable),
      count(ashProjectsTable, eq(ashProjectsTable.userId, userId)),
      count(ashProjectsTable, and(eq(ashProjectsTable.userId, userId), gte(ashProjectsTable.createdAt, week))),
      latest(ashProjectsTable.createdAt, ashProjectsTable, eq(ashProjectsTable.userId, userId)),
      count(openrouterUsageTable, eq(openrouterUsageTable.userId, userId)),
      count(openrouterUsageTable, and(eq(openrouterUsageTable.userId, userId), gte(openrouterUsageTable.createdAt, week))),
      latest(openrouterUsageTable.createdAt, openrouterUsageTable, eq(openrouterUsageTable.userId, userId)),
      count(businessRecommendationsTable, recScope),
      count(businessRecommendationsTable, and(recScope, gte(businessRecommendationsTable.createdAt, week))),
      latest(businessRecommendationsTable.createdAt, businessRecommendationsTable, recScope),
      getCognitiveHealthReport(),
      loadStyleProfile(userId).catch(() => null),
      db
        .select({ day: sql<string>`to_char(date_trunc('day', ${openrouterUsageTable.createdAt}), 'YYYY-MM-DD')`, calls: sql<number>`count(*)::int`, tokens: sql<number>`coalesce(sum(${openrouterUsageTable.totalTokens}), 0)::int` })
        .from(openrouterUsageTable)
        .where(and(eq(openrouterUsageTable.userId, userId), gte(openrouterUsageTable.createdAt, week)))
        .groupBy(sql`1`)
        .orderBy(sql`1`),
    ]);

    const sub = (key: string, label: string, description: string, total: number, weekly: number, lastActiveAt: string | null, target: number) => ({
      key, label, description, total, weekly, lastActiveAt, level: level(weekly, target),
    });
    res.json({
      generatedAt: new Date().toISOString(),
      subsystems: [
        sub("reasoning", "Reasoning", "AI model calls ASH made for you", aiTotal, aiWeek, aiLast, 50),
        sub("memory", "Memory", "Facts and preferences ASH remembers about you", memTotal, memWeek, memLast, 10),
        sub("knowledge", "Knowledge", "Research findings saved to ASH's knowledge base", knTotal, knWeek, knLast, 5),
        sub("research", "Research", "Web research runs", rsTotal, rsWeek, rsLast, 5),
        sub("planning", "Planning", "Projects and plans ASH is tracking", pjTotal, pjWeek, pjLast, 3),
        sub("recommendations", "Recommendations", "Improvement ideas for your businesses", rcTotal, rcWeek, rcLast, 5),
        sub("learning", "Learning", "Lessons learned from measured results (platform-wide)", lsTotal, lsWeek, lsLast, 5),
      ],
      persona: { familiarity: style ? familiarity(style) : 0, messages: style?.messages ?? 0 },
      health: { generatedAt: health.generatedAt, overall: health.overall, counts: health.counts, brains: health.brains },
      dailyUsage: daily,
    });
  } catch (err) {
    req.log.error({ err: err instanceof Error ? err.message : String(err) }, "ASH brain activity failed");
    res.status(500).json({ error: "Failed to load ASH brain activity" });
  }
});

router.get("/ai-orchestrator/stats", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  try {
    const month = new Date(Date.now() - 30 * DAY);
    const bizIds = await ownedBusinessIds(userId);
    const recScope = bizIds.length ? inArray(businessRecommendationsTable.businessId, bizIds) : sql`false`;
    const [user] = await db.select({ credits: usersTable.creditsBalance, tier: usersTable.membershipTier }).from(usersTable).where(eq(usersTable.id, userId));
    const [ai] = await db
      .select({ calls: sql<number>`count(*)::int`, tokens: sql<number>`coalesce(sum(${openrouterUsageTable.totalTokens}), 0)::int` })
      .from(openrouterUsageTable)
      .where(and(eq(openrouterUsageTable.userId, userId), gte(openrouterUsageTable.createdAt, month)));
    const recByStatus = await db
      .select({ status: businessRecommendationsTable.status, n: sql<number>`count(*)::int` })
      .from(businessRecommendationsTable)
      .where(recScope)
      .groupBy(businessRecommendationsTable.status);
    const postsByStatus = await db
      .select({ status: scheduledPostsTable.status, n: sql<number>`count(*)::int` })
      .from(scheduledPostsTable)
      .where(eq(scheduledPostsTable.userId, userId))
      .groupBy(scheduledPostsTable.status);
    const [systems, memories, knowledge, research, projects, files] = await Promise.all([
      count(systemInstancesTable, eq(systemInstancesTable.userId, userId)),
      count(userMemoryTable, eq(userMemoryTable.userId, userId)),
      count(ashKnowledgeEntriesTable, eq(ashKnowledgeEntriesTable.userId, userId)),
      count(ashResearchSessionsTable, eq(ashResearchSessionsTable.userId, userId)),
      count(ashProjectsTable, eq(ashProjectsTable.userId, userId)),
      count(generatedFilesTable, eq(generatedFilesTable.userId, userId)),
    ]);
    res.json({
      generatedAt: new Date().toISOString(),
      account: { credits: user?.credits ?? 0, tier: user?.tier ?? null },
      portfolio: { businesses: bizIds.length, systems },
      ai: { calls30d: ai?.calls ?? 0, tokens30d: ai?.tokens ?? 0 },
      ash: { memories, knowledge, research, projects, files },
      recommendations: Object.fromEntries(recByStatus.map((r) => [r.status, r.n])),
      scheduledPosts: Object.fromEntries(postsByStatus.map((r) => [r.status, r.n])),
    });
  } catch (err) {
    req.log.error({ err: err instanceof Error ? err.message : String(err) }, "ASH stats failed");
    res.status(500).json({ error: "Failed to load stats" });
  }
});

export default router;
