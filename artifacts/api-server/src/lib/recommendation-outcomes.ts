// Measured outcomes for applied recommendations. When a user applies a
// recommendation we store the business's current score for the metric the
// recommendation targets; after MEASURE_AFTER_MS the scheduler reads the score
// again and records whether it moved. Distillation turns those results into
// "recommendation_category" lessons so ASH favors what has measurably worked.
import { db, businessHealthScoresTable, businessRecommendationsTable, ashLessonsTable, type AshLesson, type BusinessRecommendation } from "@workspace/db";
import { and, asc, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { logger } from "./logger";
import { updateRecommendation } from "./governance/writes/recommendations-writes";
import { actorFor } from "./governance/types";
import { computeConfidence, deriveOutcome } from "./ash-brain";

export const MEASURE_AFTER_MS = 14 * 24 * 60 * 60 * 1000;
// Score points a metric must move before we call it a change rather than noise.
export const CHANGE_THRESHOLD = 3;
const MAX_PER_TICK = 200;
// Lessons are shared across all users, so a category needs results from this
// many different owners before one is published (no single account's trend).
export const MIN_OWNERS_PER_LESSON = 3;

type HealthMetric = "overallHealth" | "growthScore" | "seoScore" | "marketingScore" | "automationScore" | "contentScore";

export const CATEGORY_METRIC: Record<string, HealthMetric> = {
  conversion: "growthScore",
  revenue: "growthScore",
  seo: "seoScore",
  marketing: "marketingScore",
  automation: "automationScore",
  content: "contentScore",
  risk: "overallHealth",
};

export const metricFor = (category: string): HealthMetric => CATEGORY_METRIC[category] ?? "overallHealth";

export type OutcomeVerdict = "improved" | "unchanged" | "declined";

export interface RecommendationOutcome {
  metric: HealthMetric;
  baseline: number;
  baselineAt: string;
  result?: { value: number; delta: number; verdict: OutcomeVerdict; measuredAt: string };
}

export function verdictFor(delta: number): OutcomeVerdict {
  if (delta >= CHANGE_THRESHOLD) return "improved";
  if (delta <= -CHANGE_THRESHOLD) return "declined";
  return "unchanged";
}

async function latestScore(businessId: number, notBefore?: Date) {
  const [row] = await db
    .select()
    .from(businessHealthScoresTable)
    .where(notBefore
      ? and(eq(businessHealthScoresTable.businessId, businessId), gte(businessHealthScoresTable.createdAt, notBefore))
      : eq(businessHealthScoresTable.businessId, businessId))
    .orderBy(desc(businessHealthScoresTable.createdAt))
    .limit(1);
  return row ?? null;
}

/** Payload for a recommendation being applied now, with its baseline score (unchanged if the business has no score yet). */
export async function payloadWithBaseline(rec: BusinessRecommendation, now = new Date()): Promise<Record<string, unknown>> {
  const payload = (rec.payload ?? {}) as Record<string, unknown>;
  const score = await latestScore(rec.businessId);
  if (!score) return payload;
  const metric = metricFor(rec.category);
  const outcome: RecommendationOutcome = { metric, baseline: score[metric], baselineAt: now.toISOString() };
  return { ...payload, outcome };
}

/**
 * Record results for applied recommendations whose measurement window has
 * passed. Only a score taken at least MEASURE_AFTER_MS after the baseline counts,
 * and only recommendations that already have one are selected, so ones still
 * waiting for a score never crowd out ones that can be measured.
 */
export async function measureRecommendationOutcomes(now = new Date()): Promise<{ measured: number }> {
  const windowEnd = sql`(${businessRecommendationsTable.payload} -> 'outcome' ->> 'baselineAt')::timestamptz + make_interval(secs => ${MEASURE_AFTER_MS / 1000})`;
  const due = await db
    .select()
    .from(businessRecommendationsTable)
    .where(and(
      eq(businessRecommendationsTable.status, "applied"),
      sql`${businessRecommendationsTable.payload} ? 'outcome'`,
      isNull(sql`${businessRecommendationsTable.payload} -> 'outcome' -> 'result'`),
      sql`${windowEnd} <= ${now.toISOString()}::timestamptz`,
      sql`EXISTS (SELECT 1 FROM business_health_scores h WHERE h.business_id = ${businessRecommendationsTable.businessId} AND h.created_at >= ${windowEnd})`,
    ))
    .orderBy(asc(businessRecommendationsTable.id))
    .limit(MAX_PER_TICK);

  let measured = 0;
  for (const rec of due) {
    const payload = rec.payload as Record<string, unknown> & { outcome: RecommendationOutcome };
    const outcome = payload.outcome;
    const score = await latestScore(rec.businessId, new Date(new Date(outcome.baselineAt).getTime() + MEASURE_AFTER_MS));
    if (!score) continue;
    const value = score[outcome.metric];
    const delta = value - outcome.baseline;
    const result = { value, delta, verdict: verdictFor(delta), measuredAt: now.toISOString() };
    try {
      await updateRecommendation(db, {
        ownerUserId: rec.ownerUserId,
        sourceEngine: "business_intelligence.recommendation_outcomes",
        actor: actorFor("scheduler"),
        businessId: rec.businessId,
      }, rec, { payload: { ...payload, outcome: { ...outcome, result } } });
      measured++;
    } catch (err) {
      logger.warn({ err, recommendationId: rec.id }, "Recording recommendation outcome failed");
    }
  }
  return { measured };
}

interface CategoryRow { category: string; total: number; improved: number; declined: number; avg_delta: number }

/** Upsert one lesson per recommendation category from measured results. Returns the scope ids written. */
export async function distillRecommendationLessons(now = new Date()): Promise<string[]> {
  const rows = (await db.execute(sql`
    SELECT category,
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE payload -> 'outcome' -> 'result' ->> 'verdict' = 'improved')::int AS improved,
           COUNT(*) FILTER (WHERE payload -> 'outcome' -> 'result' ->> 'verdict' = 'declined')::int AS declined,
           COALESCE(AVG((payload -> 'outcome' -> 'result' ->> 'delta')::numeric), 0)::float AS avg_delta
    FROM business_recommendations
    WHERE status = 'applied' AND payload -> 'outcome' -> 'result' IS NOT NULL
    GROUP BY category
    HAVING COUNT(DISTINCT owner_user_id) >= ${MIN_OWNERS_PER_LESSON}
  `)).rows as unknown as CategoryRow[];

  const written: string[] = [];
  for (const r of rows) {
    if (r.total === 0) continue;
    const confidence = computeConfidence(r.total, r.improved);
    const outcome = deriveOutcome(r.total, r.improved, confidence);
    const avgDelta = Number(r.avg_delta.toFixed(1));
    const plural = r.total === 1 ? "" : "s";
    const summary = `${r.improved} of ${r.total} applied "${r.category}" recommendation${plural} measurably improved the business's ${metricFor(r.category)} within two weeks (${r.declined} declined; average change ${avgDelta >= 0 ? "+" : ""}${avgDelta} points). ${
      outcome === "proven" ? "Recommend this kind of change with confidence."
      : outcome === "promising" ? "Some evidence it helps; recommend it with a clear way to measure."
      : outcome === "struggling" ? "These have not moved the metric; prefer a different approach."
      : "Too few measured results to draw a conclusion yet."}`;
    const metrics = { avgDelta, improved: r.improved, declined: r.declined, metric: metricFor(r.category) };
    const values = {
      scopeLabel: `${r.category} recommendations`,
      sampleSize: r.total,
      successCount: r.improved,
      outcome,
      summary,
      confidence,
      metrics,
      lastDistilledAt: now,
    };
    await db
      .insert(ashLessonsTable)
      .values({ scopeType: "recommendation_category", scopeKey: r.category, ...values })
      .onConflictDoUpdate({ target: [ashLessonsTable.scopeType, ashLessonsTable.scopeKey], set: { ...values, updatedAt: now } });
    written.push(`recommendation_category::${r.category.toLowerCase()}`);
  }
  return written;
}

/** All measured-outcome lessons, keyed by recommendation category. */
export async function getRecommendationLessons(): Promise<Map<string, AshLesson>> {
  const rows = await db.select().from(ashLessonsTable).where(eq(ashLessonsTable.scopeType, "recommendation_category"));
  return new Map(rows.map((l) => [l.scopeKey, l]));
}

export interface ConfidenceCalibration {
  aiConfidence: number;
  confidence: number;
  lessonOutcome: string | null;
  measuredSuccessRate: number | null;
}

/**
 * Pull the model's confidence toward the measured success rate of its category.
 * The pull grows with the lesson's own confidence (max 50% weight), so thin
 * evidence barely moves it and "emerging" lessons (confidence < 25) never do.
 */
export function calibrateConfidence(aiConfidence: number, lesson: AshLesson | undefined): ConfidenceCalibration {
  if (!lesson || lesson.sampleSize === 0 || lesson.confidence < 25) {
    return { aiConfidence, confidence: aiConfidence, lessonOutcome: lesson?.outcome ?? null, measuredSuccessRate: null };
  }
  const successRate = lesson.successCount / lesson.sampleSize;
  const weight = Math.min(0.5, lesson.confidence / 200);
  const confidence = Math.max(0, Math.min(100, Math.round(aiConfidence * (1 - weight) + 100 * successRate * weight)));
  return { aiConfidence, confidence, lessonOutcome: lesson.outcome, measuredSuccessRate: Math.round(successRate * 100) };
}

export function formatRecommendationLessons(lessons: Map<string, AshLesson>): string {
  if (lessons.size === 0) return "";
  const lines = [...lessons.values()].map((l) => `- ${l.scopeKey} [${l.outcome.toUpperCase()}, ${l.confidence}% confidence]: ${l.summary}`);
  return `\n\n=== MEASURED RESULTS OF PAST RECOMMENDATIONS ===\nHow applied recommendations of each category actually moved business scores two weeks later, across the platform. Favor categories that measurably worked.\n${lines.join("\n")}`;
}
