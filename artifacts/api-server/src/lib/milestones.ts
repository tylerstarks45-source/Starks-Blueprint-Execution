import { db } from "@workspace/db";
import { systemActivityEventsTable, systemInstancesTable, usersTable, notificationsTable, milestoneEventsTable } from "@workspace/db";
import { eq, and, isNotNull, sql } from "drizzle-orm";
import { logger } from "./logger";
import { sendPushNotification } from "./push";

export const MILESTONE_THRESHOLDS = [100, 10000, 50000, 100000, 500000, 1000000, 5000000, 10000000];
export const MILESTONE_LABELS: Record<number, string> = {
  100: "$1", 10000: "$100", 50000: "$500",
  100000: "$1,000", 500000: "$5,000", 1000000: "$10,000",
  5000000: "$50,000", 10000000: "$100,000",
};

/**
 * Checks whether a user has crossed any new lifetime earning milestones
 * and, if so, records them in `milestone_events` and fires in-app notifications.
 *
 * Safe to call fire-and-forget — all errors are caught internally.
 *
 * @param userId                    User whose total lifetime earnings to recompute.
 * @param triggeringSystemInstanceId Optional: the system instance that just earned revenue,
 *                                   used to populate systemType/bestCategory on the event.
 */
export async function checkMilestones(userId: number, triggeringSystemInstanceId?: number): Promise<void> {
  try {
    const push = await db.transaction(async tx => {
      // Concurrent provider imports must read and update this user's awards in order.
      const [user] = await tx.select({
        milestonesReached: usersTable.milestonesReached,
        expoPushToken: usersTable.expoPushToken,
        notifyMilestone: usersTable.notifyMilestone,
      }).from(usersTable).where(eq(usersTable.id, userId)).for("update");
      if (!user) return;

      const [rev] = await tx
        .select({ total: sql<string>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)::bigint` })
        .from(systemActivityEventsTable)
        .innerJoin(systemInstancesTable, eq(systemActivityEventsTable.systemInstanceId, systemInstancesTable.id))
        .where(and(
          eq(systemInstancesTable.userId, userId),
          eq(systemActivityEventsTable.eventType, "revenue"),
          isNotNull(systemActivityEventsTable.revenueProvider),
        ));
      const totalCents = Number(rev?.total ?? 0);
      const current = (user.milestonesReached ?? []) as Array<{ amount: number; reachedAt: string }>;
      const reached = new Set(current.map(m => m.amount));
      const reachedAt = new Date().toISOString();
      const newMilestones = MILESTONE_THRESHOLDS
        .filter(amount => totalCents >= amount && !reached.has(amount))
        .map(amount => ({ amount, reachedAt, label: MILESTONE_LABELS[amount]! }));
      if (!newMilestones.length) return;

      const context = triggeringSystemInstanceId === undefined ? undefined : (await tx.execute<{
        blueprint_name: string | null;
        category_name: string | null;
      }>(sql`
        SELECT b.name AS blueprint_name, bc.name AS category_name
        FROM system_instances si
        JOIN blueprints b ON b.id = si.blueprint_id
        LEFT JOIN blueprint_categories bc ON bc.id = b.category_id
        WHERE si.id = ${triggeringSystemInstanceId} AND si.user_id = ${userId}
      `)).rows[0];

      await tx.update(usersTable)
        .set({ milestonesReached: [...current, ...newMilestones.map(({ amount, reachedAt }) => ({ amount, reachedAt }))] })
        .where(eq(usersTable.id, userId));
      await tx.insert(milestoneEventsTable).values(newMilestones.map(({ amount, label }) => ({
        userId,
        systemInstanceId: triggeringSystemInstanceId ?? null,
        amountCents: amount,
        milestoneLabel: label,
        systemType: context?.blueprint_name ?? null,
        bestCategory: context?.category_name ?? null,
      })));
      await tx.insert(notificationsTable).values(newMilestones.map(({ amount, label }) => ({
        userId,
        title: `🎉 You hit ${label} in total earnings!`,
        message: JSON.stringify({ amount, label }),
        notificationType: "milestone_reached",
      })));

      if (user.expoPushToken && user.notifyMilestone !== false) {
        return { token: user.expoPushToken, milestones: newMilestones };
      }
      return undefined;
    });
    if (!push) return;
    for (const { label } of push.milestones) {
      void sendPushNotification(
        push.token,
        "🎉 Milestone Reached!",
        `You hit ${label} in total earnings!`,
        { type: "milestone", systemInstanceId: triggeringSystemInstanceId ?? null },
      );
    }
  } catch (err) {
    logger.error({ err, userId, triggeringSystemInstanceId }, "checkMilestones failed");
  }
}
