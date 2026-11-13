// ─── ASH self-improving brain (task #312) ──────────────────────────────────
//
// A persistent, privacy-safe knowledge layer. It distills REAL outcomes
// (revenue, business health, tool stacks, niches, blueprint categories) into
// durable "lessons" — aggregate patterns, never a single user's private data.
// ASH then retrieves the most relevant proven patterns at plan / build /
// recommend time and grounds its reasoning in what actually earned money.
//
// Distillation is intentionally DETERMINISTIC (pure SQL aggregation, no LLM):
// the brain must never fabricate "proven" claims, and confidence must be an
// honest function of how much real data backs a pattern. Retrieval augments
// the prompt only — model selection stays in lib/models.ts (best-model policy).

import { db, ashLessonsTable, type AshLesson } from "@workspace/db";
import { pool } from "@workspace/db";
import { sql, inArray } from "drizzle-orm";
import { distillRecommendationLessons } from "./recommendation-outcomes";
import { logger } from "./logger";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TopTool {
  toolId: number;
  name: string;
  revenueCents: number;
  count: number;
}

export type LessonOutcome = "proven" | "promising" | "struggling" | "emerging";

interface SystemRow {
  system_id: number;
  business_type: string | null;
  category_name: string | null;
  revenue_cents: number;
  overall_health: number | null;
}

interface ToolRow {
  system_instance_id: number;
  tool_id: number;
  tool_name: string;
}

// A scope groups systems by a single dimension (niche, blueprint category, tool).
interface ScopeAccumulator {
  scopeType: "niche" | "blueprint_category" | "tool";
  scopeKey: string;
  scopeLabel: string;
  systemIds: Set<number>;
  successIds: Set<number>;
  totalRevenueCents: number;
  healthValues: number[];
  toolAgg: Map<number, TopTool>;
}

// ─── Confidence & outcome derivation ────────────────────────────────────────

// Confidence grows with BOTH how much data backs a pattern (volume) and how
// consistently it earned (success ratio). Thin data => low confidence, so ASH
// stays honest. Saturates near ~8 samples so a handful of consistent wins can
// still read as high-confidence without requiring hundreds of runs.
export function computeConfidence(sampleSize: number, successCount: number): number {
  if (sampleSize <= 0) return 0;
  const successRatio = successCount / sampleSize;
  const volumeFactor = Math.min(1, sampleSize / 8);
  const raw = 100 * volumeFactor * (0.35 + 0.65 * successRatio);
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function deriveOutcome(sampleSize: number, successCount: number, confidence: number): LessonOutcome {
  if (sampleSize < 3 || confidence < 25) return "emerging";
  const successRatio = successCount / sampleSize;
  if (successRatio >= 0.5) return "proven";
  if (successRatio > 0) return "promising";
  return "struggling";
}

function money(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

// Deterministic, honest one-paragraph lesson. Never claims "proven" unless the
// data supports it; always states the sample size so the reader can judge.
function buildSummary(acc: ScopeAccumulator, outcome: LessonOutcome, avgRevenueCents: number, topTools: TopTool[]): string {
  const n = acc.systemIds.size;
  const wins = acc.successIds.size;
  const plural = n === 1 ? "" : "s";
  const scopeNoun =
    acc.scopeType === "niche" ? `"${acc.scopeLabel}" business${n === 1 ? "" : "es"}`
    : acc.scopeType === "blueprint_category" ? `system${plural} in the "${acc.scopeLabel}" category`
    : `system${plural} using "${acc.scopeLabel}"`;
  const toolNames = topTools.slice(0, 3).map((t) => t.name);
  const toolPhrase = toolNames.length > 0 ? ` Top revenue-associated tools: ${toolNames.join(", ")}.` : "";

  switch (outcome) {
    case "proven":
      return `Across ${n} ${scopeNoun}, ${wins} earned real revenue (avg ${money(avgRevenueCents)} each, ${money(acc.totalRevenueCents)} total). This is a proven pattern — prefer it for similar goals.${toolPhrase}`;
    case "promising":
      return `${wins} of ${n} ${scopeNoun} earned revenue so far (avg ${money(avgRevenueCents)} among earners). An early positive signal, not yet fully proven — favor it cautiously.${toolPhrase}`;
    case "struggling":
      return `${n} ${scopeNoun} have run but ~none have earned revenue yet. Treat this pattern with caution and look for a stronger alternative or a clear differentiator.${toolPhrase}`;
    default:
      return `Only ${n} ${scopeNoun} tracked so far — too little data to draw a reliable conclusion. Use sound fundamentals; do not treat this as proven.${toolPhrase}`;
  }
}

// ─── Distillation ─────────────────────────────────────────────────────────────

/**
 * Read recent real outcomes and (re)build the ASH brain's lessons. Idempotent:
 * upserts one row per (scopeType, scopeKey). Never throws to callers that don't
 * await it — logs and returns a summary count. Safe to run on an empty platform
 * (produces zero lessons rather than failing).
 */
const DISTILL_LOCK_KEY = 831299312; // arbitrary constant mutex key for ASH distillation

export async function distillAshBrain(): Promise<{ lessons: number; scanned: number; skipped?: boolean }> {
  // Serialize distillation runs (scheduler + manual admin trigger) so the
  // upsert+prune critical section always operates on one consistent snapshot.
  // Uses a Postgres session-level advisory lock held on a dedicated pooled
  // client for the whole run; a concurrent run simply skips rather than racing.
  const lockClient = await pool.connect();
  try {
    const lockRes = await lockClient.query<{ locked: boolean }>(
      "SELECT pg_try_advisory_lock($1) AS locked",
      [DISTILL_LOCK_KEY],
    );
    if (!lockRes.rows[0]?.locked) {
      logger.info("ASH brain distillation: another run holds the lock, skipping");
      return { lessons: 0, scanned: 0, skipped: true };
    }
    try {
      return await runDistillation();
    } finally {
      await lockClient.query("SELECT pg_advisory_unlock($1)", [DISTILL_LOCK_KEY]);
    }
  } finally {
    lockClient.release();
  }
}

async function runDistillation(): Promise<{ lessons: number; scanned: number }> {
  // Per-system facts: niche (business_type), blueprint category, lifetime
  // revenue, and latest health. LEFT JOINs so systems without a business or
  // blueprint still count toward tool/category scopes where applicable.
  const systemsRes = await pool.query<SystemRow>(`
    SELECT
      si.id AS system_id,
      b.business_type AS business_type,
      bc.name AS category_name,
      COALESCE(rev.total_cents, 0)::bigint AS revenue_cents,
      hs.overall_health AS overall_health
    FROM system_instances si
    LEFT JOIN businesses b ON b.system_instance_id = si.id
    LEFT JOIN blueprints bp ON bp.id = si.blueprint_id
    LEFT JOIN blueprint_categories bc ON bc.id = bp.category_id
    LEFT JOIN (
      SELECT system_instance_id, SUM(amount_cents) AS total_cents
      FROM system_activity_events
      WHERE event_type = 'revenue'
      GROUP BY system_instance_id
    ) rev ON rev.system_instance_id = si.id
    LEFT JOIN LATERAL (
      SELECT overall_health
      FROM business_health_scores
      WHERE business_id = b.id
      ORDER BY created_at DESC
      LIMIT 1
    ) hs ON TRUE
  `);

  const systems = systemsRes.rows;
  if (systems.length === 0) {
    logger.info("ASH brain distillation: no systems yet — clearing any stale lessons");
  }

  const revenueBySystem = new Map<number, number>();
  for (const s of systems) revenueBySystem.set(s.system_id, Number(s.revenue_cents) || 0);

  // Tool stacks per system.
  const toolsRes = await pool.query<ToolRow>(`
    SELECT uts.system_instance_id, t.id AS tool_id, t.name AS tool_name
    FROM user_tool_selections uts
    JOIN tools t ON t.id = uts.tool_id
  `);
  const toolsBySystem = new Map<number, ToolRow[]>();
  for (const t of toolsRes.rows) {
    const arr = toolsBySystem.get(t.system_instance_id) ?? [];
    arr.push(t);
    toolsBySystem.set(t.system_instance_id, arr);
  }

  const scopes = new Map<string, ScopeAccumulator>();
  const getScope = (scopeType: ScopeAccumulator["scopeType"], key: string, label: string): ScopeAccumulator => {
    const id = `${scopeType}::${key.toLowerCase()}`;
    let acc = scopes.get(id);
    if (!acc) {
      acc = {
        scopeType, scopeKey: key, scopeLabel: label,
        systemIds: new Set(), successIds: new Set(),
        totalRevenueCents: 0, healthValues: [], toolAgg: new Map(),
      };
      scopes.set(id, acc);
    }
    return acc;
  };

  const addToScope = (acc: ScopeAccumulator, s: SystemRow) => {
    const rev = revenueBySystem.get(s.system_id) ?? 0;
    if (acc.systemIds.has(s.system_id)) return; // dedupe within a scope
    acc.systemIds.add(s.system_id);
    acc.totalRevenueCents += rev;
    if (rev > 0) acc.successIds.add(s.system_id);
    if (typeof s.overall_health === "number") acc.healthValues.push(s.overall_health);
    for (const t of toolsBySystem.get(s.system_id) ?? []) {
      const cur = acc.toolAgg.get(t.tool_id) ?? { toolId: t.tool_id, name: t.tool_name, revenueCents: 0, count: 0 };
      cur.revenueCents += rev;
      cur.count += 1;
      acc.toolAgg.set(t.tool_id, cur);
    }
  };

  for (const s of systems) {
    if (s.business_type) addToScope(getScope("niche", s.business_type, s.business_type), s);
    if (s.category_name) addToScope(getScope("blueprint_category", s.category_name, s.category_name), s);
    for (const t of toolsBySystem.get(s.system_id) ?? []) {
      addToScope(getScope("tool", t.tool_name, t.tool_name), s);
    }
  }

  let written = 0;
  const now = new Date();
  const writtenScopeIds: string[] = [];
  for (const acc of scopes.values()) {
    const sampleSize = acc.systemIds.size;
    if (sampleSize === 0) continue;
    writtenScopeIds.push(`${acc.scopeType}::${acc.scopeKey.toLowerCase()}`);
    const successCount = acc.successIds.size;
    const avgRevenueCents = Math.round(acc.totalRevenueCents / sampleSize);
    const avgHealth = acc.healthValues.length > 0
      ? Math.round(acc.healthValues.reduce((a, b) => a + b, 0) / acc.healthValues.length)
      : null;
    const confidence = computeConfidence(sampleSize, successCount);
    const outcome = deriveOutcome(sampleSize, successCount, confidence);
    const topTools = [...acc.toolAgg.values()]
      .sort((a, b) => b.revenueCents - a.revenueCents || b.count - a.count)
      .slice(0, 5);
    const summary = buildSummary(acc, outcome, avgRevenueCents, topTools);

    await db
      .insert(ashLessonsTable)
      .values({
        scopeType: acc.scopeType,
        scopeKey: acc.scopeKey,
        scopeLabel: acc.scopeLabel,
        sampleSize,
        successCount,
        totalRevenueCents: acc.totalRevenueCents,
        avgRevenueCents,
        avgHealth,
        topTools,
        outcome,
        summary,
        confidence,
        metrics: { successRatio: sampleSize > 0 ? Number((successCount / sampleSize).toFixed(3)) : 0, avgHealth },
        lastDistilledAt: now,
      })
      .onConflictDoUpdate({
        target: [ashLessonsTable.scopeType, ashLessonsTable.scopeKey],
        set: {
          scopeLabel: acc.scopeLabel,
          sampleSize,
          successCount,
          totalRevenueCents: acc.totalRevenueCents,
          avgRevenueCents,
          avgHealth,
          topTools,
          outcome,
          summary,
          confidence,
          metrics: { successRatio: sampleSize > 0 ? Number((successCount / sampleSize).toFixed(3)) : 0, avgHealth },
          lastDistilledAt: now,
          updatedAt: now,
        },
      });
    written++;
  }

  writtenScopeIds.push(...await distillRecommendationLessons(now));

  // Prune stale scopes: lessons whose underlying data no longer exists (e.g. a
  // deleted business) must not keep claiming "proven" forever. Delete any row
  // not (re)computed this pass. Uses a computed scope-id matching the unique key.
  let pruned = 0;
  const staleRows = await db
    .select({ id: ashLessonsTable.id, scopeType: ashLessonsTable.scopeType, scopeKey: ashLessonsTable.scopeKey })
    .from(ashLessonsTable);
  const keptSet = new Set(writtenScopeIds);
  const staleIds = staleRows
    .filter((r) => !keptSet.has(`${r.scopeType}::${r.scopeKey.toLowerCase()}`))
    .map((r) => r.id);
  if (staleIds.length > 0) {
    await db.delete(ashLessonsTable).where(inArray(ashLessonsTable.id, staleIds));
    pruned = staleIds.length;
  }

  logger.info({ lessons: written, scanned: systems.length, pruned }, "ASH brain distillation complete");
  return { lessons: written, scanned: systems.length };
}

// ─── Retrieval ────────────────────────────────────────────────────────────────

export interface RetrieveLessonsOptions {
  businessType?: string | null;
  blueprintCategory?: string | null;
  goalText?: string | null;
  limit?: number;
}

interface ScoredLesson {
  lesson: AshLesson;
  relevance: number;
}

// Rank lessons for a decision context. Exact niche/category matches win; a
// keyword overlap with the goal text is a softer signal; confidence breaks ties.
export async function retrieveRelevantLessons(opts: RetrieveLessonsOptions): Promise<AshLesson[]> {
  const limit = opts.limit ?? 5;
  const all = await db.select().from(ashLessonsTable);
  if (all.length === 0) return [];

  const bt = opts.businessType?.toLowerCase().trim() ?? "";
  const cat = opts.blueprintCategory?.toLowerCase().trim() ?? "";
  const goal = opts.goalText?.toLowerCase() ?? "";
  const goalWords = new Set(goal.split(/[^a-z0-9]+/).filter((w) => w.length >= 4));

  const scored: ScoredLesson[] = all.map((lesson) => {
    const key = lesson.scopeKey.toLowerCase();
    const label = (lesson.scopeLabel ?? lesson.scopeKey).toLowerCase();
    let relevance = 0;
    if (bt && (key === bt || label === bt)) relevance += 100;
    if (cat && lesson.scopeType === "blueprint_category" && (key === cat || label === cat)) relevance += 90;
    if (goalWords.size > 0) {
      if (goalWords.has(key) || goal.includes(key)) relevance += 40;
      if (goal.includes(label)) relevance += 30;
    }
    // Prefer higher-confidence, higher-signal lessons as a general prior.
    relevance += lesson.confidence / 10;
    if (lesson.outcome === "proven") relevance += 5;
    return { lesson, relevance };
  });

  const matched = scored.filter((s) => s.relevance > 0);
  // If nothing is contextually relevant, fall back to the strongest general
  // lessons so ASH still has SOME grounded signal (or none on an empty brain).
  const pool = matched.length > 0 ? matched : scored;
  return pool
    .sort((a, b) => b.relevance - a.relevance || b.lesson.confidence - a.lesson.confidence)
    .slice(0, limit)
    .map((s) => s.lesson);
}

// Format retrieved lessons for injection into a system prompt. Honest fallback
// when the brain is empty: explicitly tells ASH it has no proven data yet and
// must NOT invent proven claims.
export function formatLessonsForPrompt(lessons: AshLesson[]): string {
  if (lessons.length === 0) {
    return `\n\n=== ASH LEARNED PATTERNS ===\nASH has not yet accumulated enough real outcome data to cite proven patterns for this goal. Rely on sound fundamentals and the Marketplace catalog, and be honest that nothing is "proven" yet — do NOT fabricate past results or success rates.`;
  }
  const lines = lessons.map((l) => {
    const conf = `${l.confidence}% confidence`;
    return `- [${l.outcome.toUpperCase()}, ${conf}] ${l.summary}`;
  });
  return `\n\n=== ASH LEARNED PATTERNS (distilled from real outcomes across the platform) ===\nThese are patterns ASH has learned from actual businesses on this platform. Ground your plan in the higher-confidence ones and reference them explicitly ("this pattern has earned for similar goals"). Treat lower-confidence items as early signals, not guarantees. NEVER invent proven results beyond what is stated here.\n${lines.join("\n")}`;
}

// Convenience: retrieve + format in one call for prompt-injection sites.
export async function buildLearnedPatternsNote(opts: RetrieveLessonsOptions): Promise<string> {
  try {
    const lessons = await retrieveRelevantLessons(opts);
    return formatLessonsForPrompt(lessons);
  } catch (err) {
    logger.warn({ err }, "buildLearnedPatternsNote failed; continuing without brain injection");
    return "";
  }
}

// ─── Overview (for the visible "what ASH has learned" surface) ────────────────

export interface BrainOverview {
  learningActive: boolean;
  totalLessons: number;
  provenCount: number;
  promisingCount: number;
  avgConfidence: number;
  totalSampleSize: number;
  totalRevenueCents: number;
  lastDistilledAt: string | null;
  topLessons: Array<{
    scopeType: string;
    scopeKey: string;
    scopeLabel: string | null;
    outcome: string;
    confidence: number;
    sampleSize: number;
    successCount: number;
    avgRevenueCents: number;
    totalRevenueCents: number;
    avgHealth: number | null;
    topTools: TopTool[];
    summary: string;
  }>;
}

export async function getBrainOverview(limit = 20): Promise<BrainOverview> {
  const all = await db.select().from(ashLessonsTable).orderBy(sql`${ashLessonsTable.confidence} DESC`);
  const totalLessons = all.length;
  const provenCount = all.filter((l) => l.outcome === "proven").length;
  const promisingCount = all.filter((l) => l.outcome === "promising").length;
  const avgConfidence = totalLessons > 0 ? Math.round(all.reduce((a, l) => a + l.confidence, 0) / totalLessons) : 0;
  const totalSampleSize = all.reduce((a, l) => a + l.sampleSize, 0);
  const totalRevenueCents = all
    .filter((l) => l.scopeType === "niche")
    .reduce((a, l) => a + Number(l.totalRevenueCents), 0);
  const lastDistilledAt = all.reduce<Date | null>((latest, l) => {
    const d = l.lastDistilledAt instanceof Date ? l.lastDistilledAt : new Date(l.lastDistilledAt as unknown as string);
    return !latest || d > latest ? d : latest;
  }, null);

  return {
    learningActive: totalLessons > 0,
    totalLessons,
    provenCount,
    promisingCount,
    avgConfidence,
    totalSampleSize,
    totalRevenueCents,
    lastDistilledAt: lastDistilledAt ? lastDistilledAt.toISOString() : null,
    topLessons: all.slice(0, limit).map((l) => ({
      scopeType: l.scopeType,
      scopeKey: l.scopeKey,
      scopeLabel: l.scopeLabel,
      outcome: l.outcome,
      confidence: l.confidence,
      sampleSize: l.sampleSize,
      successCount: l.successCount,
      avgRevenueCents: l.avgRevenueCents,
      totalRevenueCents: Number(l.totalRevenueCents),
      avgHealth: l.avgHealth,
      topTools: (l.topTools as TopTool[]) ?? [],
      summary: l.summary,
    })),
  };
}
