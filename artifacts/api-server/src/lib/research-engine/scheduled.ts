// Weekly market research for businesses whose owners turned on Operations Mode.
// Runs through the existing research engine, so it uses the owner's credits and
// writes to Knowledge Memory, where ASH's research tool reuses it.
import { db, businessesTable, businessOperationsSettingsTable, usersTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { logger } from "../logger";
import { OutOfCreditsError } from "../credits";
import { hasOperationsModeAccess } from "../operations-gate";
import { runResearchEngine } from "./index";

export const SCHEDULED_RESEARCH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PER_TICK = 25;

export const researchStateKey = (businessId: number) => `research:${businessId}`;

export function researchObjective(b: { name: string; businessType: string | null }): string {
  const kind = b.businessType ? ` (${b.businessType})` : "";
  return `Weekly update for ${b.name}${kind}: market trends, competitor moves, pricing changes and new opportunities from the last 7 days.`;
}

export async function runScheduledResearch(opts: {
  now: number;
  lastRun: (key: string) => number;
  markRun: (key: string, ts: number) => Promise<void>;
  limit?: number;
}): Promise<{ ran: number; failed: number }> {
  const rows = await db
    .select({
      id: businessesTable.id,
      ownerId: businessesTable.ownerId,
      name: businessesTable.name,
      businessType: businessesTable.businessType,
      tier: usersTable.membershipTier,
      role: usersTable.role,
    })
    .from(businessesTable)
    .innerJoin(businessOperationsSettingsTable, eq(businessOperationsSettingsTable.businessId, businessesTable.id))
    .innerJoin(usersTable, eq(usersTable.id, businessesTable.ownerId))
    .where(and(eq(businessesTable.status, "active"), eq(businessOperationsSettingsTable.enabled, true)));

  const due = rows
    .filter((b) => hasOperationsModeAccess(b.tier, b.role))
    .filter((b) => opts.now - opts.lastRun(researchStateKey(b.id)) >= SCHEDULED_RESEARCH_INTERVAL_MS)
    .slice(0, opts.limit ?? MAX_PER_TICK);

  let ran = 0;
  let failed = 0;
  for (const b of due) {
    const key = researchStateKey(b.id);
    const previous = opts.lastRun(key);
    // Mark first so a concurrent tick can't start the same business twice.
    await opts.markRun(key, opts.now);
    try {
      // forceFresh: a weekly update must gather new findings, and must not reuse
      // or overwrite knowledge from the owner's other businesses.
      const result = await runResearchEngine({ userId: b.ownerId, projectId: null, researchType: "market", objective: researchObjective(b), forceFresh: true });
      if (result.knowledgeAction === "failed") throw new Error("research run failed");
      ran++;
    } catch (err) {
      failed++;
      // Retry on the next daily tick instead of waiting a week.
      await opts.markRun(key, previous);
      if (err instanceof OutOfCreditsError) logger.info({ businessId: b.id }, "Scheduled research skipped: owner out of credits");
      else logger.warn({ businessId: b.id, err: err instanceof Error ? err.message : String(err) }, "Scheduled research failed");
    }
  }
  return { ran, failed };
}
