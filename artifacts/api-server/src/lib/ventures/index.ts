// Venture Factory: every business gets a workspace, business memory, a team of AI employees (ASH's
// specialists) and a ledger. Setup is idempotent: it runs when a business is created and again
// lazily for businesses created before this existed.
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import {
  db, businessesTable, businessWorkspaces, businessMemoryTable, businessTeamTable, businessExpensesTable,
  ashMissionsTable, ashSpendEventsTable, revenueStreams, type IncomePlanDetail,
} from "@workspace/db";
import { getOrCreateBusinessMemory, mergeBusinessMemory } from "../memory-engine/business-memory";
import { getEmpireOverview } from "../empire/overview";
import { ownedBusinessIds } from "../empire/assets";
import { SPECIALISTS, type SpecialistKey } from "../ash-agent/specialists";
import { logger } from "../logger";

const DAY = 86_400_000;
export const DEFAULT_TEAM: { role: SpecialistKey; focus: string }[] = [
  { role: "strategy", focus: "Priorities, growth bets and sequencing" },
  { role: "research", focus: "Market, competitors and demand" },
  { role: "marketing", focus: "Positioning, channels, content and conversion" },
  { role: "operations", focus: "Processes, automation and fulfilment" },
  { role: "finance", focus: "Pricing, margins, spend and cash flow" },
];
export const EXPENSE_CATEGORIES = ["software", "advertising", "contractors", "inventory", "fees", "hosting", "other"] as const;

/** Creates whatever the business is missing. Safe to call repeatedly and concurrently. */
export async function ensureVenture(userId: number, businessId: number, ctx: { plan?: IncomePlanDetail; goal?: string } = {}) {
  const [biz] = await db.select({ name: businessesTable.name }).from(businessesTable)
    .where(and(eq(businessesTable.id, businessId), eq(businessesTable.ownerId, userId)));
  if (!biz) return false;
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`venture:${businessId}`}))`);
    const [ws] = await tx.select({ id: businessWorkspaces.id }).from(businessWorkspaces)
      .where(and(eq(businessWorkspaces.userId, userId), eq(businessWorkspaces.businessId, businessId))).limit(1);
    if (!ws) await tx.insert(businessWorkspaces).values({ userId, businessId, workspaceName: biz.name, workspaceType: "business", configuration: { createdBy: "venture_factory" } });
    await tx.insert(businessTeamTable).values(DEFAULT_TEAM.map((m) => ({ userId, businessId, ...m }))).onConflictDoNothing();
  });
  // Two setups can race to create the memory row (unique per business); the loser retries and merges.
  for (let attempt = 0; attempt < 2; attempt++) try {
    if (ctx.plan) {
      await mergeBusinessMemory(businessId, {
        businessModel: ctx.plan.newType?.description || ctx.plan.typeKey.replace(/_/g, " "),
        customers: ctx.plan.market ? [ctx.plan.market.slice(0, 300)] : [],
        revenueGoals: ctx.goal?.slice(0, 500),
        marketingStrategy: ctx.plan.strategy.slice(0, 2000),
      });
    } else {
      await getOrCreateBusinessMemory(businessId);
    }
    break;
  } catch (err) {
    if (attempt === 1) logger.warn({ err, businessId }, "venture: business memory setup failed (non-fatal)");
  }
  return true;
}

/** True when the owner paused this AI employee for the business. */
export async function isTeamMemberPaused(userId: number, businessId: number, role: string) {
  const [m] = await db.select({ status: businessTeamTable.status }).from(businessTeamTable)
    .where(and(eq(businessTeamTable.userId, userId), eq(businessTeamTable.businessId, businessId), eq(businessTeamTable.role, role)));
  return m?.status === "paused";
}

export async function recordTeamActivity(userId: number, businessId: number, role: string, task: string) {
  await db.update(businessTeamTable).set({ lastTask: task.slice(0, 300), lastActiveAt: new Date() })
    .where(and(eq(businessTeamTable.userId, userId), eq(businessTeamTable.businessId, businessId), eq(businessTeamTable.role, role)));
}

export async function setTeamMemberStatus(userId: number, businessId: number, role: string, status: "active" | "paused") {
  const [row] = await db.update(businessTeamTable).set({ status })
    .where(and(eq(businessTeamTable.userId, userId), eq(businessTeamTable.businessId, businessId), eq(businessTeamTable.role, role))).returning();
  return row ?? null;
}

export async function listTeam(userId: number, businessId: number) {
  const rows = await db.select().from(businessTeamTable)
    .where(and(eq(businessTeamTable.userId, userId), eq(businessTeamTable.businessId, businessId))).orderBy(businessTeamTable.id);
  return rows.map((r) => ({ ...r, title: SPECIALISTS[r.role as SpecialistKey]?.title ?? r.role }));
}

export async function addExpense(userId: number, businessId: number, input: { amountCents: number; category: string; description: string; occurredAt?: Date; streamId?: number | null }) {
  if (!(await ownedBusinessIds(userId, [businessId])).has(businessId)) return { error: "Not found", status: 404 } as const;
  if (input.streamId != null) {
    const [s] = await db.select({ id: revenueStreams.id }).from(revenueStreams)
      .where(and(eq(revenueStreams.id, input.streamId), eq(revenueStreams.userId, userId), eq(revenueStreams.businessId, businessId)));
    if (!s) return { error: "That income stream isn't part of this business", status: 400 } as const;
  }
  const [row] = await db.insert(businessExpensesTable).values({ userId, businessId, ...input, streamId: input.streamId ?? null }).returning();
  return { expense: row! };
}

export async function deleteExpense(userId: number, businessId: number, id: number) {
  const [row] = await db.delete(businessExpensesTable).where(and(eq(businessExpensesTable.id, id),
    eq(businessExpensesTable.userId, userId), eq(businessExpensesTable.businessId, businessId))).returning();
  return row ?? null;
}

/** Workspace, memory, team, ledger and missions for one business. Revenue is provider-verified only. */
export async function getVenture(userId: number, businessId: number) {
  if (!(await ensureVenture(userId, businessId))) return null;
  const now = new Date();
  const since = new Date(now.getTime() - 30 * DAY);
  const [workspace, memory, team, overview, spend, expenses, expenseTotal, missions] = await Promise.all([
    db.select({ id: businessWorkspaces.id, name: businessWorkspaces.workspaceName, status: businessWorkspaces.status }).from(businessWorkspaces)
      .where(and(eq(businessWorkspaces.userId, userId), eq(businessWorkspaces.businessId, businessId))).limit(1),
    db.select({ businessModel: businessMemoryTable.businessModel, revenueGoals: businessMemoryTable.revenueGoals, marketingStrategy: businessMemoryTable.marketingStrategy, customers: businessMemoryTable.customers })
      .from(businessMemoryTable).where(eq(businessMemoryTable.businessId, businessId)),
    listTeam(userId, businessId),
    getEmpireOverview(userId),
    db.select({ cents: sql<number>`coalesce(sum(${ashSpendEventsTable.amountCents}), 0)::int` }).from(ashSpendEventsTable)
      .where(and(eq(ashSpendEventsTable.userId, userId), eq(ashSpendEventsTable.businessId, businessId), gte(ashSpendEventsTable.createdAt, since))),
    db.select().from(businessExpensesTable).where(and(eq(businessExpensesTable.userId, userId), eq(businessExpensesTable.businessId, businessId)))
      .orderBy(desc(businessExpensesTable.occurredAt)).limit(50),
    db.select({ cents: sql<number>`coalesce(sum(${businessExpensesTable.amountCents}), 0)::int` }).from(businessExpensesTable)
      .where(and(eq(businessExpensesTable.userId, userId), eq(businessExpensesTable.businessId, businessId), gte(businessExpensesTable.occurredAt, since), lte(businessExpensesTable.occurredAt, now))),
    db.select({ id: ashMissionsTable.id, goal: ashMissionsTable.goal, status: ashMissionsTable.status, steps: ashMissionsTable.steps }).from(ashMissionsTable)
      .where(and(eq(ashMissionsTable.userId, userId), eq(ashMissionsTable.businessId, businessId))).orderBy(desc(ashMissionsTable.createdAt)).limit(10),
  ]);
  const verified = overview.businesses.find((b) => b.id === businessId)?.verifiedRevenueCents ?? null;
  const spendCents = Number(spend[0]?.cents ?? 0);
  const expenseCents = Number(expenseTotal[0]?.cents ?? 0);
  const activeMission = missions.find((m) => !["completed", "failed", "cancelled"].includes(m.status));
  return {
    businessId,
    setup: { workspace: workspace.length > 0, memory: memory.length > 0, team: team.length > 0, ledger: true, mission: activeMission != null },
    workspace: workspace[0] ?? null,
    memory: memory[0] ?? null,
    team,
    ledger: {
      revenueTracked: verified != null,
      verifiedRevenueLast30Cents: verified?.last30 ?? null,
      ashSpendLast30Cents: spendCents,
      expensesLast30Cents: expenseCents,
      netLast30Cents: verified != null ? verified.last30 - spendCents - expenseCents : null,
      expenses,
    },
    missions: missions.map((m) => ({ id: m.id, goal: m.goal.split("\n")[0]!.slice(0, 200), status: m.status,
      done: m.steps.filter((s) => s.status === "done").length, total: m.steps.length })),
  };
}
