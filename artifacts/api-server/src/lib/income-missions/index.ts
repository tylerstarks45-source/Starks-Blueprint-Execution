// Income missions: the owner states an income goal ("make $5,000 a month"), ASH researches and compares
// opportunities and drafts a plan. Approving it creates the business and a mission that works the
// plan's milestones in the background. Revenue shown against the target is provider-verified only.
import { z } from "zod";
import { and, desc, eq, lt, or, sql } from "drizzle-orm";
import {
  db, incomePlansTable, ashMissionsTable, businessesTable, customBusinessTypesTable, ashSpendEventsTable, canonicalAssets, pendingApprovalsTable,
  type IncomeObjective, type IncomePlan,
  capabilityRequestsTable,
} from "@workspace/db";
import { complete } from "../openrouter";
import { chainFor } from "../models";
import { listBusinessTypes, slugifyKey, BUILTIN_BUSINESS_TYPES, STREAM_TYPES } from "../empire/business-types";
import { createEmpireBusiness } from "../empire/actions";
import { getEmpireOverview } from "../empire/overview";
import { logEntry } from "../ash-missions";
import { ownedBusinessIds } from "../empire/assets";
import { logger } from "../logger";
import { CAPABILITIES, capabilitiesForPlan, requestMissingCapabilities, checkCapabilities } from "../capabilities";

const STALE_CLAIM_MS = 10 * 60_000;

const money = (s: string) => {
  const m = s.replace(/,/g, "").match(/^\$?\s*(\d+(?:\.\d+)?)\s*(k|thousand)?/i);
  if (!m) return null;
  return Math.round(Number(m[1]) * (m[2] ? 1000 : 1) * 100);
};
const AMOUNT = String.raw`\$\s?\d[\d,]*(?:\.\d+)?\s?(?:k|thousand)?`;

/** Reads the target, budget and timeline from the owner's words. Unstated values stay null. */
export function parseIncomeGoal(text: string): IncomeObjective {
  const t = text.toLowerCase();
  const target = t.match(new RegExp(`(${AMOUNT})\\s*(?:usd\\s*)?(?:a|per|\\/|each)\\s*(?:month|mo)\\b|(${AMOUNT})\\s*(?:usd\\s*)?monthly`, "i"));
  // The lookahead also rules out a shorter prefix of the amount ("$50" of "$500 a month"); monthly amounts aren't a startup budget.
  const budget = t.match(new RegExp(`(?:with|budget(?: of)?|invest(?:ing)?|start(?:ing)? with|spend(?: up to)?|only have)\\s*(?:about|around|up to)?\\s*(${AMOUNT})(?![\\d,.]|\\s?(?:k|thousand)|\\s*(?:usd\\s*)?(?:a|per|\\/|each)\\s*(?:month|mo)\\b|\\s*monthly)`, "i"));
  const months = t.match(/(?:in|within)\s+(\d{1,2})\s+months?/) ?? t.match(/(\d{1,2})[-\s]months?\s+(?:timeline|timeframe)/);
  const years = t.match(/(?:in|within)\s+(\d)\s+years?/);
  const constraints = [
    /don'?t care what kind|any kind of business|any business/.test(t) ? "Any legitimate business model" : null,
    /no (?:inventory|physical)/.test(t) ? "No physical inventory" : null,
    /part[- ]time|few hours/.test(t) ? "Owner has limited time" : null,
  ].filter((x): x is string => !!x);
  return {
    targetMonthlyRevenueCents: target ? money((target[1] ?? target[2])!.trim()) : null,
    budgetCents: budget ? money(budget[1]!.trim()) : null,
    timelineMonths: months ? Number(months[1]) : years ? Number(years[1]) * 12 : null,
    constraints,
  };
}

const cents = z.coerce.number().min(0).max(1e10).transform((n) => Math.round(n));
// Research models don't always keep to the requested shape (arrays for prose, objects for list items,
// overlong text), so the reply is normalized rather than rejected.
const toText = (v: unknown): string => {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map(toText).filter(Boolean).join("\n");
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    const head = o.title ?? o.name ?? o.step ?? o.milestone ?? o.phase;
    const body = o.description ?? o.detail ?? o.details;
    if (head != null || body != null) return [head, body].filter((x) => x != null).map(toText).join(": ");
    return JSON.stringify(v);
  }
  return v == null ? "" : String(v);
};
const noCites = (t: string) => t.replace(/\s*(?:\[\d+\])+/g, "");
const prose = (max: number) => z.unknown().transform((v) => noCites(toText(v)).trim().slice(0, max));
const list = (items: number, max: number) => z.unknown().transform((v) =>
  (Array.isArray(v) ? v : typeof v === "string" ? v.split(/\n+/) : v == null ? [] : [v])
    .map((x) => noCites(toText(x)).replace(/^\s*(?:[-*\u2022]|\d+[.)])\s*/, "").trim().slice(0, max)).filter(Boolean).slice(0, items));
const PlannerOut = z.object({
  options: z.array(z.object({
    name: prose(120).pipe(z.string().min(1)), typeKey: prose(60).pipe(z.string().min(1)), newType: z.unknown().transform(() => false), // recomputed against the registry
    summary: prose(600), startupCostCents: cents, monthlyCostCents: cents,
    monthsToTarget: z.coerce.number().min(0).max(120).transform((n) => Math.round(n)).nullable().default(null),
    score: z.coerce.number().min(0).max(100), why: prose(600),
  })).min(2),
  selectedIndex: z.coerce.number().int().min(0).default(0),
  plan: z.object({
    businessName: prose(120).pipe(z.string().min(1)),
    newType: z.object({ name: prose(80).pipe(z.string().min(1)), category: prose(40).default("custom"), description: prose(400), streamTypes: list(6, 40) }).nullable().default(null),
    market: prose(2000), strategy: prose(3000), timeline: prose(1000),
    risks: list(10, 300), permissions: list(10, 300),
    milestones: list(10, 300).pipe(z.array(z.string()).min(3)),
    capabilities: list(16, 60),
  }),
}).transform((out) => {
  // Keep at most 6 options without dropping the one the plan was written for.
  const sel = Math.min(out.selectedIndex, out.options.length - 1);
  if (out.options.length <= 6) return { ...out, selectedIndex: sel };
  const options = out.options.slice(0, 6);
  if (sel < 6) return { ...out, options, selectedIndex: sel };
  options[5] = out.options[sel]!;
  return { ...out, options, selectedIndex: 5 };
});

const jsonFrom = (s: string) => {
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  const body = s.slice(start, end + 1);
  try {
    return JSON.parse(body);
  } catch {
    // Web-search models append citation markers to JSON values: "...text."[3][2]" or "...text."[1],
    return JSON.parse(body.replace(/"((?:\[\d+\])+)"/g, '"').replace(/"((?:\[\d+\])+)(?=\s*[,}\]])/g, '"'));
  }
};

const PLAN_SHAPE = '{"options":[{"name","typeKey","newType","summary","startupCostCents","monthlyCostCents","monthsToTarget","score","why"}],"selectedIndex":0,"plan":{"businessName","newType":null|{"name","category","description","streamTypes"},"market","strategy","timeline","risks":[],"permissions":[],"milestones":[],"capabilities":[]}}';

/** Researches opportunities for the goal and saves a draft plan for the owner to approve. */
export async function draftIncomePlan(userId: number, goal: string): Promise<{ plan: IncomePlan } | { error: string }> {
  const text = goal.trim().slice(0, 2000);
  if (text.length < 8) return { error: "Describe the income goal" };
  const objective = parseIncomeGoal(text);
  const types = await listBusinessTypes(userId);
  const usd = (c: number | null) => (c == null ? "not stated" : `$${(c / 100).toLocaleString("en-US")}`);
  const result = await complete({
    userId,
    models: chainFor("research"),
    systemPrompt: [
      "You are ASH, an AI that builds and runs online businesses for the owner. Research current, real opportunities for the owner's income goal and compare them honestly.",
      `Known business types (typeKey: name): ${types.map((t) => `${t.key}: ${t.name}`).join("; ")}.`,
      "You are not limited to these: if a better opportunity isn't listed, use a new snake_case typeKey, set newType true, and describe it in plan.newType.",
      `Income stream types: ${STREAM_TYPES.join(", ")}.`,
      "Revenue is not profit. Never promise the target will be reached. Costs are estimates in US cents. Milestones are concrete steps ASH can work through (research, build inside the platform, prepare launches that need the owner's accounts).",
      "Permissions lists what the owner must connect or approve (e.g. Stripe account, domain purchase, ad budget).",
      `Capabilities lists what running the plan needs, using these keys where they fit: ${CAPABILITIES.map((c) => c.key).join(", ")}; anything else as a short snake_case key.`,
      `Reply with JSON only: ${PLAN_SHAPE}. Give 3 to 5 options; score 0-100.`,
    ].join("\n"),
    prompt: `Owner's goal: ${text}\nTarget monthly revenue: ${usd(objective.targetMonthlyRevenueCents)}\nStartup budget: ${usd(objective.budgetCents)}\nTimeline: ${objective.timelineMonths ? `${objective.timelineMonths} months` : "not stated"}\nConstraints: ${objective.constraints.join("; ") || "none stated"}`,
  });
  const tryParse = (content: string): { ok: z.infer<typeof PlannerOut> | null; err: unknown } => {
    try {
      return { ok: PlannerOut.parse(jsonFrom(content)), err: null };
    } catch (err) {
      return { ok: null, err };
    }
  };
  let attempt = tryParse(result.content ?? "");
  if (!attempt.ok && (result.content ?? "").includes("{")) {
    // Web-search replies sometimes break JSON (citation markers, stray quotes); a cheap model reformats the same research.
    logger.warn({ err: attempt.err }, "income plan: reformatting planner reply");
    const fixed = await complete({
      userId,
      models: chainFor("utility"),
      systemPrompt: `Rewrite the plan below as valid JSON only, in exactly this shape: ${PLAN_SHAPE}. Keep every value; drop citation markers like [1]. Costs are US cents.`,
      prompt: (result.content ?? "").slice(0, 16000),
    });
    attempt = tryParse(fixed.content ?? "");
  }
  if (!attempt.ok) {
    logger.warn({ err: attempt.err, reply: (result.content ?? "").slice(0, 4000) }, "income plan: unusable planner reply");
    return { error: "ASH couldn't produce a usable plan. Try again or add more detail." };
  }
  const parsed = attempt.ok;
  const known = new Set(types.map((t) => t.key));
  const options = parsed.options.map((o) => {
    const key = slugifyKey(o.typeKey) || "custom";
    return { ...o, typeKey: key, newType: !known.has(key) };
  });
  const chosen = options[Math.min(parsed.selectedIndex, options.length - 1)]!;
  const newType = chosen.newType
    ? { name: parsed.plan.newType?.name ?? chosen.name, category: parsed.plan.newType?.category ?? "custom",
      description: parsed.plan.newType?.description ?? chosen.summary,
      streamTypes: (parsed.plan.newType?.streamTypes ?? []).filter((s) => (STREAM_TYPES as readonly string[]).includes(s)) }
    : null;
  const [row] = await db.insert(incomePlansTable).values({
    userId, goal: text, objective, options,
    plan: { ...parsed.plan, capabilities: capabilitiesForPlan(parsed.plan), typeKey: chosen.typeKey, newType, startupCostCents: chosen.startupCostCents, monthlyCostCents: chosen.monthlyCostCents },
  }).returning();
  return { plan: row! };
}

export async function getIncomePlan(userId: number, id: number) {
  const [p] = await db.select().from(incomePlansTable).where(and(eq(incomePlansTable.id, id), eq(incomePlansTable.userId, userId)));
  return p ?? null;
}

/** The newest plans plus every draft still waiting for the owner's decision. */
export async function listIncomePlans(userId: number) {
  const [recent, drafts] = await Promise.all([
    db.select().from(incomePlansTable).where(eq(incomePlansTable.userId, userId)).orderBy(desc(incomePlansTable.createdAt)).limit(20),
    db.select().from(incomePlansTable).where(and(eq(incomePlansTable.userId, userId), eq(incomePlansTable.status, "draft"))),
  ]);
  const seen = new Set(recent.map((p) => p.id));
  return [...recent, ...drafts.filter((p) => !seen.has(p.id))].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/** Owner approved: create the business (registering a new type if the plan needs one) and the mission. */
export async function approveIncomePlan(userId: number, id: number): Promise<{ plan: IncomePlan } | { error: string; status: number }> {
  // Claim first, so a double click can't build twice. A claim older than STALE_CLAIM_MS was cut off
  // (e.g. a restart) and may be taken again; a business it already created is reused, not duplicated.
  const [claimed] = await db.update(incomePlansTable).set({ status: "approving", decidedAt: new Date() })
    .where(and(eq(incomePlansTable.id, id), eq(incomePlansTable.userId, userId), or(
      eq(incomePlansTable.status, "draft"),
      and(eq(incomePlansTable.status, "approving"), lt(incomePlansTable.decidedAt, new Date(Date.now() - STALE_CLAIM_MS))),
    ))).returning();
  if (!claimed) {
    const existing = await getIncomePlan(userId, id);
    return existing ? { error: `This plan is already ${existing.status}`, status: 409 } : { error: "Not found", status: 404 };
  }
  let createdBusinessId: number | null = null;
  try {
    const p = claimed.plan;
    let businessId = claimed.businessId != null && (await ownedBusinessIds(userId, [claimed.businessId])).has(claimed.businessId)
      ? claimed.businessId : null;
    if (businessId == null) {
      let typeKey = p.typeKey;
      if (p.newType) {
        typeKey = slugifyKey(p.newType.name) || p.typeKey;
        if (BUILTIN_BUSINESS_TYPES.some((b) => b.key === typeKey)) typeKey = `${typeKey}_custom`;
        await db.insert(customBusinessTypesTable).values({
          ownerId: userId, key: typeKey, name: p.newType.name, description: p.newType.description, category: p.newType.category || "custom",
          streamTypes: p.newType.streamTypes, assetClasses: [],
        }).onConflictDoNothing();
      }
      const created = await createEmpireBusiness(userId, {
        name: p.businessName, typeKey, createDefaultStreams: true,
        notes: `Created by ASH for the income goal: ${claimed.goal.slice(0, 500)}`,
      });
      if ("error" in created) throw new Error(created.error);
      businessId = createdBusinessId = created.business.id;
      await db.update(incomePlansTable).set({ businessId }).where(eq(incomePlansTable.id, id));
    }
    const plan = await db.transaction(async (tx) => {
      const [m] = await tx.insert(ashMissionsTable).values({
        userId, businessId, planId: claimed.id,
        goal: `${claimed.goal}\n\nApproved plan: ${p.strategy.slice(0, 1200)}`,
        status: "running", steps: p.milestones.map((title) => ({ title, status: "pending" as const })),
        log: [logEntry("status", "Mission created from your approved income plan"),
          logEntry("plan", `Plan: ${p.milestones.map((t, i) => `${i + 1}. ${t}`).join(" ")}`)],
      }).returning();
      const [row] = await tx.update(incomePlansTable)
        .set({ status: "approved", businessId, missionId: m!.id, decidedAt: new Date() })
        .where(eq(incomePlansTable.id, id)).returning();
      return row!;
    });
    await requestMissingCapabilities(userId, plan.plan.capabilities ?? capabilitiesForPlan(plan.plan), { planId: plan.id, missionId: plan.missionId })
      .catch((err) => logger.warn({ err, planId: plan.id }, "income plan: capability requests failed"));
    return { plan };
  } catch (err) {
    logger.error({ err, planId: id }, "Income plan approval failed");
    if (createdBusinessId != null) await db.delete(businessesTable).where(eq(businessesTable.id, createdBusinessId)).catch(() => undefined);
    await db.update(incomePlansTable).set({ status: "draft", decidedAt: null, ...(createdBusinessId != null ? { businessId: null } : {}) })
      .where(eq(incomePlansTable.id, id));
    return { error: "Couldn't start the plan. Try approving again.", status: 500 };
  }
}

export async function rejectIncomePlan(userId: number, id: number) {
  const [row] = await db.update(incomePlansTable).set({ status: "rejected", decidedAt: new Date() })
    .where(and(eq(incomePlansTable.id, id), eq(incomePlansTable.userId, userId), eq(incomePlansTable.status, "draft"))).returning();
  return row ?? null;
}

/** Everything the mission dashboard shows. Revenue is provider-verified only; null = no revenue source connected. */
export async function getMissionDashboard(userId: number, missionId: number) {
  const [m] = await db.select().from(ashMissionsTable).where(and(eq(ashMissionsTable.id, missionId), eq(ashMissionsTable.userId, userId)));
  if (!m) return null;
  const [plan, overview, assets, spend, approvals] = await Promise.all([
    m.planId != null ? getIncomePlan(userId, m.planId) : Promise.resolve(null),
    getEmpireOverview(userId),
    m.businessId != null
      ? db.select({ id: canonicalAssets.id, name: canonicalAssets.canonicalName, classKey: canonicalAssets.classKey, status: canonicalAssets.status })
        .from(canonicalAssets).where(and(eq(canonicalAssets.userId, userId), eq(canonicalAssets.businessId, m.businessId), sql`${canonicalAssets.status} <> 'deleted'`))
        .orderBy(desc(canonicalAssets.createdAt)).limit(50)
      : Promise.resolve([]),
    db.select({ last30: sql<number>`coalesce(sum(${ashSpendEventsTable.amountCents}) filter (where ${ashSpendEventsTable.createdAt} >= ${new Date(Date.now() - 30 * 86_400_000)}), 0)::int` }).from(ashSpendEventsTable)
      .where(and(eq(ashSpendEventsTable.userId, userId), eq(ashSpendEventsTable.missionId, m.id))),
    db.select({ id: pendingApprovalsTable.id, title: pendingApprovalsTable.title }).from(pendingApprovalsTable)
      .where(and(eq(pendingApprovalsTable.userId, userId), eq(pendingApprovalsTable.status, "pending"), sql`${pendingApprovalsTable.payload}->>'missionId' = ${String(m.id)}`)),
  ]);
  // Live check, so blockers follow connections even if a request row was never written or is shared with another plan.
  const capabilities = plan ? await checkCapabilities(userId, plan.plan.capabilities ?? capabilitiesForPlan(plan.plan)) : [];
  // Owner-only and missing capabilities the owner dismissed stop counting as blockers; connections stay live.
  const dismissed = new Set((await db.select({ c: capabilityRequestsTable.capability }).from(capabilityRequestsTable)
    .where(and(eq(capabilityRequestsTable.userId, userId), eq(capabilityRequestsTable.status, "dismissed")))).map((r) => r.c));
  const biz = overview.businesses.find((b) => b.id === m.businessId) ?? null;
  const verified = biz?.verifiedRevenueCents?.last30 ?? null;
  const expenses = Number(spend[0]?.last30 ?? 0);
  const target = plan?.objective.targetMonthlyRevenueCents ?? null;
  return {
    mission: m,
    plan,
    business: biz,
    assets,
    revenue: {
      verifiedLast30Cents: verified,
      revenueTracked: biz?.revenueTracked ?? false,
      projectedMonthlyUsd: biz?.projectedMonthlyUsd ?? 0,
      recordedSpendLast30Cents: expenses,
      netLast30Cents: verified == null ? null : verified - expenses,
      targetMonthlyRevenueCents: target,
      progressPct: verified != null && target ? Math.min(100, Math.round((verified / target) * 100)) : null,
    },
    milestones: { done: m.steps.filter((s) => s.status === "done").length, total: m.steps.length },
    nextActions: m.steps.filter((s) => s.status !== "done").slice(0, 3).map((s) => s.title),
    blockers: [...(m.waitingFor ? [m.waitingFor] : []), ...approvals.map((a) => `Approval needed: ${a.title}`),
      ...capabilities.filter((c) => c.status !== "ready" && (c.status === "connect" || !dismissed.has(c.key))).map((c) => `${c.status === "connect" ? "Connect" : c.status === "manual" ? "Your step" : "ASH can't do yet"}: ${c.name}`)],
    capabilities,
  };
}
