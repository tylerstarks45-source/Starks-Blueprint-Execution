import { and, eq, sql } from "drizzle-orm";
import { db, systemActivityEventsTable } from "@workspace/db";

export interface RevenueSummary {
  todayCents: number;
  weekCents: number;
  monthCents: number;
  lifetimeCents: number;
  /** Number of revenue events in the last 7 days. */
  weekEvents: number;
  hasRevenue: boolean;
}

const EMPTY: RevenueSummary = {
  todayCents: 0,
  weekCents: 0,
  monthCents: 0,
  lifetimeCents: 0,
  weekEvents: 0,
  hasRevenue: false,
};

/**
 * Aggregate real revenue for a single system instance from the
 * system_activity_events ledger (event_type = 'revenue'). Used by the
 * revenue-aware improvement passes so ASH grounds its growth recommendations in
 * actual money, not guesses. Returns zeros for instances with no revenue.
 */
export async function getRevenueSummaryForInstance(
  systemInstanceId: number | null | undefined,
): Promise<RevenueSummary> {
  if (systemInstanceId == null) return { ...EMPTY };

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 6);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const base = and(
    eq(systemActivityEventsTable.systemInstanceId, systemInstanceId),
    eq(systemActivityEventsTable.eventType, "revenue"),
  );

  const [today, week, month, lifetime] = await Promise.all([
    db
      .select({ total: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)` })
      .from(systemActivityEventsTable)
      .where(and(base, sql`${systemActivityEventsTable.createdAt} >= ${startOfToday}`)),
    db
      .select({
        total: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(systemActivityEventsTable)
      .where(and(base, sql`${systemActivityEventsTable.createdAt} >= ${startOfWeek}`)),
    db
      .select({ total: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)` })
      .from(systemActivityEventsTable)
      .where(and(base, sql`${systemActivityEventsTable.createdAt} >= ${startOfMonth}`)),
    db
      .select({ total: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)` })
      .from(systemActivityEventsTable)
      .where(base),
  ]);

  const lifetimeCents = Number(lifetime[0]?.total ?? 0);
  const weekEvents = Number(week[0]?.count ?? 0);

  return {
    todayCents: Number(today[0]?.total ?? 0),
    weekCents: Number(week[0]?.total ?? 0),
    monthCents: Number(month[0]?.total ?? 0),
    lifetimeCents,
    weekEvents,
    hasRevenue: lifetimeCents > 0,
  };
}

/** Human-readable revenue context block for injection into an AI prompt. */
export function revenueContextLine(r: RevenueSummary): string {
  const d = (c: number): string => `$${(c / 100).toFixed(2)}`;
  if (!r.hasRevenue) {
    return "Real revenue tracked: none yet (no revenue events recorded from connected providers). Prioritize recommendations that unlock the FIRST dollar of revenue.";
  }
  return `Real revenue tracked from connected providers — today: ${d(r.todayCents)}, last 7 days: ${d(r.weekCents)} across ${r.weekEvents} event(s), this month: ${d(r.monthCents)}, lifetime: ${d(r.lifetimeCents)}. Ground revenue/marketing recommendations in these actuals; prioritize what will move this number.`;
}
