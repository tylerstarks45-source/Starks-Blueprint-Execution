// Adaptive strategy reviews: ASH compares an income mission's measured results (verified revenue,
// spend, milestones) with its target and proposes next steps. On Operator/Autopilot she adds them
// to the mission herself; otherwise the owner applies or dismisses them.
import { z } from "zod";
import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db, ashMissionsTable, strategyReviewsTable, type StrategyReview, type StrategyReviewMetrics } from "@workspace/db";
import { complete } from "../openrouter";
import { chainFor } from "../models";
import { getMissionDashboard } from "../income-missions";
import { decide, getEffectiveControl } from "../ash-control/policy";
import { logEntry, withLog } from "../ash-missions";
import { logger } from "../logger";

export const REVIEW_INTERVAL_MS = 7 * 86_400_000;
const MAX_ADJUSTMENTS = 5;
const MAX_MISSION_STEPS = 40;
const REVIEWABLE = ["running", "waiting_approval", "waiting_owner", "paused", "completed", "failed"];

const ReviewOut = z.object({
  verdict: z.enum(["on_track", "behind", "no_data"]),
  summary: z.string().min(1),
  adjustments: z.array(z.string().min(3)).default([]),
});

const jsonFrom = (s: string) => JSON.parse(s.slice(s.indexOf("{"), s.lastIndexOf("}") + 1));

export async function listStrategyReviews(userId: number, missionId: number, limit = 5) {
  return db.select().from(strategyReviewsTable)
    .where(and(eq(strategyReviewsTable.userId, userId), eq(strategyReviewsTable.missionId, missionId)))
    .orderBy(desc(strategyReviewsTable.createdAt), desc(strategyReviewsTable.id)).limit(limit);
}

/** Reviews one income mission now. Returns the saved review (applied already when ASH's level allows). */
type Failure = { error: string; status: number };

export async function reviewMission(userId: number, missionId: number): Promise<Failure | { review: StrategyReview; autoApplied: boolean }> {
  const d = await getMissionDashboard(userId, missionId);
  if (!d) return { error: "Mission not found", status: 404 } as const;
  if (!d.plan) return { error: "Strategy reviews are for income missions", status: 400 } as const;
  if (!REVIEWABLE.includes(d.mission.status)) return { error: `Can't review a ${d.mission.status} mission`, status: 409 } as const;
  const r = d.revenue;
  const metrics: StrategyReviewMetrics = {
    revenueTracked: r.revenueTracked, verifiedLast30Cents: r.verifiedLast30Cents, netLast30Cents: r.netLast30Cents,
    targetMonthlyRevenueCents: r.targetMonthlyRevenueCents, progressPct: r.progressPct,
    milestonesDone: d.milestones.done, milestonesTotal: d.milestones.total,
  };
  const usd = (c: number | null) => (c == null ? "unknown" : `$${(c / 100).toFixed(2)}`);
  const result = await complete({
    userId,
    models: chainFor("reasoning"),
    systemPrompt: [
      "You are ASH reviewing how one of the owner's businesses is doing against its income target. Use only the measured numbers given; never invent revenue.",
      "If revenue isn't tracked, the verdict is no_data and the first adjustment should be connecting a payment provider (unless that is already a blocker).",
      `Propose at most ${MAX_ADJUSTMENTS} concrete next steps ASH can carry out with platform tools (research, build pages/offers, launch on connected sites, campaigns, pricing changes), each one short imperative sentence. Don't repeat steps already pending.`,
      'Reply with JSON only: {"verdict":"on_track"|"behind"|"no_data","summary":"2-3 sentences","adjustments":["..."]}',
    ].join("\n"),
    prompt: [
      `Goal: ${d.mission.goal}`,
      `Plan: ${d.plan.plan.businessName}. Strategy: ${d.plan.plan.strategy}. Timeline: ${d.plan.plan.timeline}.`,
      `Target monthly revenue: ${usd(r.targetMonthlyRevenueCents)}. Revenue tracked: ${r.revenueTracked ? "yes" : "no"}. Verified revenue last 30 days: ${usd(r.verifiedLast30Cents)}. Action spend last 30 days: ${usd(r.recordedSpendLast30Cents)}. Net: ${usd(r.netLast30Cents)}.`,
      `Mission status: ${d.mission.status}. Milestones done: ${d.milestones.done}/${d.milestones.total}. Pending: ${d.nextActions.join("; ") || "none"}.`,
      `Blockers: ${d.blockers.join("; ") || "none"}. Assets: ${d.assets.length}.`,
    ].join("\n"),
  });
  let out: z.infer<typeof ReviewOut>;
  try {
    out = ReviewOut.parse(jsonFrom(result.content ?? ""));
  } catch (err) {
    logger.warn({ err, missionId }, "strategy review: unusable reply");
    return { error: "ASH couldn't produce a usable review. Try again.", status: 502 } as const;
  }
  const pending = new Set(d.mission.steps.filter((s) => s.status === "pending").map((s) => s.title.trim().toLowerCase()));
  const adjustments = [...new Set(out.adjustments.map((a) => a.trim().slice(0, 300)))]
    .filter((a) => !pending.has(a.toLowerCase())).slice(0, MAX_ADJUSTMENTS);
  const [review] = await db.insert(strategyReviewsTable).values({
    userId, missionId, businessId: d.mission.businessId, metrics, adjustments,
    verdict: r.revenueTracked ? out.verdict : "no_data", summary: out.summary.trim().slice(0, 2000),
  }).returning();
  // Operator/Autopilot apply on their own, unless the owner's settings require approval for building.
  const control = await getEffectiveControl(userId, d.mission.businessId);
  if (adjustments.length && (control.level === "operator" || control.level === "autopilot")
    && (await decide({ userId, businessId: d.mission.businessId, kind: "build", interactive: false })).decision === "allow") {
    const applied = await decideStrategyReview(userId, review!.id, "apply", "ASH");
    if ("review" in applied) return { review: applied.review, autoApplied: true } as const;
  }
  return { review: review!, autoApplied: false } as const;
}

/** Applies a proposed review (its steps join the mission, which runs again if it had finished) or dismisses it. */
export async function decideStrategyReview(userId: number, reviewId: number, action: "apply" | "dismiss", by: "owner" | "ASH" = "owner"): Promise<Failure | { review: StrategyReview }> {
  return db.transaction(async (tx) => {
    const [rev] = await tx.select().from(strategyReviewsTable)
      .where(and(eq(strategyReviewsTable.id, reviewId), eq(strategyReviewsTable.userId, userId))).for("update");
    if (!rev) return { error: "Not found", status: 404 } as const;
    if (rev.status !== "proposed") return { error: `This review was already ${rev.status}`, status: 409 } as const;
    if (action === "apply") {
      const [m] = await tx.select().from(ashMissionsTable)
        .where(and(eq(ashMissionsTable.id, rev.missionId), eq(ashMissionsTable.userId, userId))).for("update");
      if (!m || m.status === "cancelled") return { error: "The mission was cancelled", status: 409 } as const;
      // A step running now would write back its own copy of the steps and drop the new ones.
      if (m.leaseUntil && m.leaseUntil > new Date()) return { error: "ASH is working on a step of this mission. Try again in a few minutes.", status: 409 } as const;
      const room = Math.max(0, MAX_MISSION_STEPS - m.steps.length);
      const added = rev.adjustments.slice(0, room);
      if (!added.length) return { error: "The mission has no room for more steps", status: 409 } as const;
      const finished = m.status === "completed" || m.status === "failed";
      await tx.update(ashMissionsTable).set({
        steps: [...m.steps, ...added.map((title: string) => ({ title, status: "pending" as const }))],
        log: withLog(m.log, logEntry("plan", `${by === "ASH" ? "ASH" : "Owner"} applied a strategy review: added ${added.length} step${added.length > 1 ? "s" : ""}`)),
        ...(finished ? { status: "running", completedAt: null, waitingFor: null, failureCount: 0, nextRunAt: new Date(),
          maxStepRuns: m.stepRuns + Math.max(20, added.length * 3) } : {}),
        updatedAt: new Date(),
      }).where(eq(ashMissionsTable.id, m.id));
    }
    const [row] = await tx.update(strategyReviewsTable).set({ status: action === "apply" ? "applied" : "dismissed", decidedAt: new Date() })
      .where(eq(strategyReviewsTable.id, rev.id)).returning();
    return { review: row! } as const;
  });
}

/** Scheduler: reviews income missions whose last review (or start) is a week old. */
export async function runDueStrategyReviews(limit = 20): Promise<{ reviewed: number }> {
  const cutoff = new Date(Date.now() - REVIEW_INTERVAL_MS);
  const due = await db.select({ id: ashMissionsTable.id, userId: ashMissionsTable.userId }).from(ashMissionsTable)
    .where(and(isNotNull(ashMissionsTable.planId), inArray(ashMissionsTable.status, REVIEWABLE),
      sql`${ashMissionsTable.createdAt} < ${cutoff}`,
      sql`not exists (select 1 from ${strategyReviewsTable} r where r.mission_id = ${ashMissionsTable.id} and r.created_at >= ${cutoff})`))
    .orderBy(ashMissionsTable.id).limit(limit);
  let reviewed = 0;
  for (const m of due) {
    try {
      const r = await reviewMission(m.userId, m.id);
      if ("review" in r) reviewed++;
    } catch (err) {
      logger.warn({ err, missionId: m.id }, "strategy review failed");
    }
  }
  return { reviewed };
}
