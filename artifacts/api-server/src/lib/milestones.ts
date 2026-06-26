import { db } from "@workspace/db";
import { systemActivityEventsTable, systemInstancesTable, usersTable, notificationsTable, milestoneEventsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
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
    const [rev] = await db
      .select({ total: sql<string>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)::bigint` })
      .from(systemActivityEventsTable)
      .innerJoin(systemInstancesTable, eq(systemActivityEventsTable.systemInstanceId, systemInstancesTable.id))
      .where(and(
        eq(systemInstancesTable.userId, userId),
        eq(systemActivityEventsTable.eventType, "revenue"),
      ));

    const totalCents = Number(rev?.total ?? 0);
    if (totalCents === 0) return;

    const [userRow] = await db
      .select({ milestonesReached: usersTable.milestonesReached })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    const current = (userRow?.milestonesReached ?? []) as Array<{ amount: number; reachedAt: string }>;
    const reached = new Set(current.map(m => m.amount));

    const newMilestones: Array<{ amount: number; reachedAt: string }> = [];
    for (const threshold of MILESTONE_THRESHOLDS) {
      if (totalCents >= threshold && !reached.has(threshold)) {
        newMilestones.push({ amount: threshold, reachedAt: new Date().toISOString() });
      }
    }
    if (newMilestones.length === 0) return;

    await db.update(usersTable)
      .set({ milestonesReached: [...current, ...newMilestones] })
      .where(eq(usersTable.id, userId));

    // Resolve blueprint name + category for the triggering system (used in success wall)
    let systemType: string | null = null;
    let bestCategory: string | null = null;
    if (triggeringSystemInstanceId) {
      try {
        const [bpRow] = await db.execute(sql`
          SELECT b.name AS blueprint_name, bc.name AS category_name
          FROM system_instances si
          JOIN blueprints b ON b.id = si.blueprint_id
          LEFT JOIN blueprint_categories bc ON bc.id = b.category_id
          WHERE si.id = ${triggeringSystemInstanceId}
          LIMIT 1
        `).then(r => r.rows as Array<{ blueprint_name: string; category_name: string | null }>);
        systemType = bpRow?.blueprint_name ?? null;
        bestCategory = bpRow?.category_name ?? null;
      } catch (_err) { /* non-fatal */ }
    }

    for (const m of newMilestones) {
      const label = MILESTONE_LABELS[m.amount] ?? `$${Math.round(m.amount / 100).toLocaleString()}`;

      await db.insert(milestoneEventsTable).values({
        userId,
        systemInstanceId: triggeringSystemInstanceId ?? null,
        amountCents: m.amount,
        milestoneLabel: label,
        systemType,
        bestCategory,
      });

      await db.insert(notificationsTable).values({
        userId,
        title: `🎉 You hit ${label} in total earnings!`,
        message: JSON.stringify({ amount: m.amount, label }),
        notificationType: "milestone_reached",
      });

      // Push notification for milestone
      try {
        const [uRow] = await db.select({ expoPushToken: usersTable.expoPushToken, notifyMilestone: usersTable.notifyMilestone })
          .from(usersTable).where(eq(usersTable.id, userId));
        if (uRow?.expoPushToken && uRow.notifyMilestone !== false) {
          void sendPushNotification(uRow.expoPushToken, "🎉 Milestone Reached!", `You hit ${label} in total earnings!`);
        }
      } catch { /* non-fatal */ }
    }
  } catch (err) {
    logger.error({ err, userId, triggeringSystemInstanceId }, "checkMilestones failed");
  }
}
