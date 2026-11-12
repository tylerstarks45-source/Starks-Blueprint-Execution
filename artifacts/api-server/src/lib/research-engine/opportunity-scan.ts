// Daily web research on current ways to earn money online. Rotates through
// OPPORTUNITY_TOPICS (advancing only after a topic is saved), runs the existing research engine under the
// platform founder account, and keeps one refreshed Knowledge Memory entry per
// topic. ASH chat reads the newest entries when a request is about earning money.
import { db, usersTable, ashKnowledgeEntriesTable } from "@workspace/db";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { logger } from "../logger";
import { runResearchEngine } from "./index";
import { OPPORTUNITY_TAG_PREFIX, categoryForResearchType } from "./knowledge-lookup";

export const OPPORTUNITY_SCAN_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const OPPORTUNITY_SCAN_STATE_KEY = "opportunity_scan";
// Index of the next topic, kept in scheduler state so a failed or delayed day never skips a topic.
export const OPPORTUNITY_TOPIC_STATE_KEY = "opportunity_scan:topic";
// After an errored run, try again in an hour rather than every scheduler tick.
export const OPPORTUNITY_SCAN_RETRY_MS = 60 * 60 * 1000;

export const OPPORTUNITY_TOPICS = [
  { key: "digital_products", objective: "Online income: which digital products (templates, courses, ebooks, presets, printables) are selling well right now, on which marketplaces, at what prices, and what new niches are emerging." },
  { key: "ai_services", objective: "Online income: AI-powered services and automation agencies that small teams are profitably selling right now, typical pricing, how they find clients, and underserved niches." },
  { key: "micro_saas", objective: "Online income: micro-SaaS and no-code software products recently reaching profitable monthly revenue, the problems they solve, pricing, and how they acquired first customers." },
  { key: "ecommerce", objective: "Online income: current e-commerce opportunities (print-on-demand, dropshipping, Amazon, TikTok Shop, Etsy) — trending products, margins, platform rule changes, and saturated categories to avoid." },
  { key: "content_creator", objective: "Online income: creator-economy monetization right now — YouTube, newsletters, podcasts, short video, memberships, sponsorship rates and platform payout changes." },
  { key: "affiliate_lead_gen", objective: "Online income: affiliate marketing and lead generation — high-paying programs, niches with strong commissions, SEO and AI-search traffic changes affecting affiliate sites." },
  { key: "freelance_marketplaces", objective: "Online income: in-demand freelance and remote skills on Upwork, Fiverr and similar marketplaces right now, rates, and skills losing demand to AI." },
] as const;

export const topicAt = (index: number) => OPPORTUNITY_TOPICS[Math.abs(Math.trunc(index)) % OPPORTUNITY_TOPICS.length]!;
export const opportunityTag = (key: string) => `${OPPORTUNITY_TAG_PREFIX}${key}`;

async function founderUserId(): Promise<number | null> {
  const [row] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "FOUNDER_ADMIN")).orderBy(asc(usersTable.id)).limit(1);
  return row?.id ?? null;
}

export async function runOpportunityScan(opts: {
  now: number;
  lastRun: (key: string) => number;
  markRun: (key: string, ts: number) => Promise<void>;
}): Promise<{ ran: boolean; topic?: string; reason?: string }> {
  const previous = opts.lastRun(OPPORTUNITY_SCAN_STATE_KEY);
  if (opts.now - previous < OPPORTUNITY_SCAN_INTERVAL_MS) return { ran: false, reason: "not_due" };
  const userId = await founderUserId();
  if (!userId) return { ran: false, reason: "no_founder_account" };

  const topicIndex = opts.lastRun(OPPORTUNITY_TOPIC_STATE_KEY);
  const topic = topicAt(topicIndex);
  await opts.markRun(OPPORTUNITY_SCAN_STATE_KEY, opts.now);
  try {
    const result = await runResearchEngine({
      userId,
      projectId: null,
      researchType: "trend",
      objective: topic.objective,
      forceFresh: true,
      knowledgeTag: opportunityTag(topic.key),
    });
    if (result.knowledgeAction === "failed") throw new Error("research run failed");
    // A completed run advances the rotation even if its findings were too low-confidence to save
    // ("skipped"); repeating the same paid research would most likely skip again.
    // Monotonic counter (topicAt wraps it): the scheduler merges replicas' state with max(), so a value that wraps back to 0 would be lost.
    await opts.markRun(OPPORTUNITY_TOPIC_STATE_KEY, topicIndex + 1);
    return { ran: true, topic: topic.key, reason: result.knowledgeAction === "skipped" ? "low_confidence" : undefined };
  } catch (err) {
    await opts.markRun(OPPORTUNITY_SCAN_STATE_KEY, Math.max(previous, opts.now - OPPORTUNITY_SCAN_INTERVAL_MS + OPPORTUNITY_SCAN_RETRY_MS));
    logger.warn({ topic: topic.key, err: err instanceof Error ? err.message : String(err) }, "Opportunity scan failed");
    return { ran: false, topic: topic.key, reason: "failed" };
  }
}

const MONEY_INTENT = /\b(money|income|revenue|earn|earning|profit|wealth|rich|side hustle|monetiz\w*|opportunit\w*|business ideas?|passive)\b/i;

/** Prompt section with the newest opportunity research, only for money-related requests. */
export async function buildOpportunityResearchNote(goalText: string | null | undefined, limit = 3): Promise<string> {
  if (!goalText || !MONEY_INTENT.test(goalText)) return "";
  try {
    return await opportunityNote(limit);
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, "Opportunity research note unavailable");
    return "";
  }
}

async function opportunityNote(limit: number): Promise<string> {
  const userId = await founderUserId();
  if (!userId) return "";
  const rows = await db
    .select({ title: ashKnowledgeEntriesTable.title, content: ashKnowledgeEntriesTable.content, keyFindings: ashKnowledgeEntriesTable.keyFindings, updatedAt: ashKnowledgeEntriesTable.updatedAt })
    .from(ashKnowledgeEntriesTable)
    .where(and(
      eq(ashKnowledgeEntriesTable.userId, userId),
      eq(ashKnowledgeEntriesTable.category, categoryForResearchType("trend")),
      sql`EXISTS (SELECT 1 FROM jsonb_array_elements_text(${ashKnowledgeEntriesTable.tags}) t WHERE t LIKE ${`${OPPORTUNITY_TAG_PREFIX}%`})`,
    ))
    .orderBy(desc(ashKnowledgeEntriesTable.updatedAt))
    .limit(limit);
  if (rows.length === 0) return "";
  const blocks = rows.map((r) => {
    const findings = (Array.isArray(r.keyFindings) ? r.keyFindings : []).slice(0, 4).map((f) => `  • ${String(f)}`).join("\n");
    return `- ${r.title} (researched ${new Date(r.updatedAt).toISOString().slice(0, 10)}): ${r.content.slice(0, 400)}${findings ? `\n${findings}` : ""}`;
  });
  return `\n\n=== CURRENT ONLINE INCOME RESEARCH ===\nRecent web research on ways to earn online. Use it when relevant, cite the date, and say when something may have changed since.\n${blocks.join("\n")}`;
}
