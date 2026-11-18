// Income missions: the owner states an income goal ("make $5,000 a month"), ASH researches and compares
// opportunities and drafts a plan. Approving it creates the business and a mission that works the
// plan's milestones in the background. Revenue shown against the target is provider-verified only.
import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  db, incomePlansTable, ashMissionsTable, customBusinessTypesTable, ashSpendEventsTable, canonicalAssets, pendingApprovalsTable,
  type IncomeObjective, type IncomePlan,
} from "@workspace/db";
import { complete } from "../openrouter";
import { chainFor } from "../models";
import { listBusinessTypes, slugifyKey, BUILTIN_BUSINESS_TYPES, STREAM_TYPES } from "../empire/business-types";
import { createEmpireBusiness } from "../empire/actions";
import { getEmpireOverview } from "../empire/overview";
import { logEntry } from "../ash-missions";

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
const PlannerOut = z.object({
  options: z.array(z.object({
    name: z.string().min(1).max(120), typeKey: z.string().min(1).max(60), newType: z.boolean().default(false),
    summary: z.string().max(600).default(""), startupCostCents: cents, monthlyCostCents: cents,
    monthsToTarget: z.coerce.number().int().min(0).max(120).nullable().default(null),
    score: z.coerce.number().min(0).max(100), why: z.string().max(600).default(""),
  })).min(2).max(6),
  selectedIndex: z.coerce.number().int().min(0),
  plan: z.object({
    businessName: z.string().min(1).max(120),
    newType: z.object({ name: z.string().min(1).max(80), category: z.string().max(40).default("custom"), description: z.string().max(400).default(""), streamTypes: z.array(z.string()).max(6).default([]) }).nullable().default(null),
    market: z.string().max(2000), strategy: z.string().max(3000), timeline: z.string().max(1000),
    risks: z.array(z.string().max(300)).max(10), permissions: z.array(z.string().max(300)).max(10),
    milestones: z.array(z.string().min(3).max(300)).min(3).max(10),
  }),
});

const jsonFrom = (s: string) => {
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  return start >= 0 && end > start ? JSON.parse(s.slice(start, end + 1)) : null;
};

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
      'Reply with JSON only: {"options":[{"name","typeKey","newType","summary","startupCostCents","monthlyCostCents","monthsToTarget","score","why"}],"selectedIndex":0,"plan":{"businessName","newType":null|{"name","category","description","streamTypes"},"market","strategy","timeline","risks":[],"permissions":[],"milestones":[]}}. Give 3 to 5 options; score 0-100.',
    ].join("\n"),
    prompt: `Owner's goal: ${text}\nTarget monthly revenue: ${usd(objective.targetMonthlyRevenueCents)}\nStartup budget: ${usd(objective.budgetCents)}\nTimeline: ${objective.timelineMonths ? `${objective.timelineMonths} months` : "not stated"}\nConstraints: ${objective.constraints.join("; ") || "none stated"}`,
  });
  let parsed: z.infer<typeof PlannerOut>;
  try {
    parsed = PlannerOut.parse(jsonFrom(result.content ?? ""));
  } catch {
    return { error: "ASH couldn't produce a usable plan. Try again or add more detail." };
  }
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
    plan: { ...parsed.plan, typeKey: chosen.typeKey, newType, startupCostCents: chosen.startupCostCents, monthlyCostCents: chosen.monthlyCostCents },
  }).returning();
  return { plan: row! };
}

export async function getIncomePlan(userId: number, id: number) {
  const [p] = await db.select().from(incomePlansTable).where(and(eq(incomePlansTable.id, id), eq(incomePlansTable.userId, userId)));
  return p ?? null;
}

export const listIncomePlans = (userId: number) =>
  db.select().from(incomePlansTable).where(eq(incomePlansTable.userId, userId)).orderBy(desc(incomePlansTable.createdAt)).limit(20);

/** Owner approved: create the business (registering a new type if the plan needs one) and the mission. */
export async function approveIncomePlan(userId: number, id: number): Promise<{ plan: IncomePlan } | { error: string; status: number }> {
  // Claim first, so a double click can't build twice.
  const [claimed] = await db.update(incomePlansTable).set({ status: "approving" })
    .where(and(eq(incomePlansTable.id, id), eq(incomePlansTable.userId, userId), eq(incomePlansTable.status, "draft"))).returning();
  if (!claimed) {
    const existing = await getIncomePlan(userId, id);
    return existing ? { error: `This plan is already ${existing.status}`, status: 409 } : { error: "Not found", status: 404 };
  }
  try {
    const p = claimed.plan;
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
    const [mission] = await db.insert(ashMissionsTable).values({
      userId, businessId: created.business.id, planId: claimed.id,
      goal: `${claimed.goal}\n\nApproved plan: ${p.strategy.slice(0, 1200)}`,
      status: "running", steps: p.milestones.map((title) => ({ title, status: "pending" as const })),
      log: [logEntry("status", "Mission created from your approved income plan"),
        logEntry("plan", `Plan: ${p.milestones.map((t, i) => `${i + 1}. ${t}`).join(" ")}`)],
    }).returning();
    const [row] = await db.update(incomePlansTable)
      .set({ status: "approved", businessId: created.business.id, missionId: mission!.id, decidedAt: new Date() })
      .where(eq(incomePlansTable.id, id)).returning();
    return { plan: row! };
  } catch (err) {
    await db.update(incomePlansTable).set({ status: "draft" }).where(eq(incomePlansTable.id, id));
    return { error: err instanceof Error ? err.message : "Could not start the plan", status: 400 };
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
    db.select({ total: sql<number>`coalesce(sum(${ashSpendEventsTable.amountCents}), 0)::int` }).from(ashSpendEventsTable)
      .where(and(eq(ashSpendEventsTable.userId, userId), eq(ashSpendEventsTable.missionId, m.id))),
    db.select({ id: pendingApprovalsTable.id, title: pendingApprovalsTable.title }).from(pendingApprovalsTable)
      .where(and(eq(pendingApprovalsTable.userId, userId), eq(pendingApprovalsTable.status, "pending"), sql`${pendingApprovalsTable.payload}->>'missionId' = ${String(m.id)}`)),
  ]);
  const biz = overview.businesses.find((b) => b.id === m.businessId) ?? null;
  const verified = biz?.verifiedRevenueCents?.last30 ?? null;
  const expenses = Number(spend[0]?.total ?? 0);
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
      recordedSpendCents: expenses,
      netLast30Cents: verified == null ? null : verified - expenses,
      targetMonthlyRevenueCents: target,
      progressPct: verified != null && target ? Math.min(100, Math.round((verified / target) * 100)) : null,
    },
    milestones: { done: m.steps.filter((s) => s.status === "done").length, total: m.steps.length },
    nextActions: m.steps.filter((s) => s.status !== "done").slice(0, 3).map((s) => s.title),
    blockers: [...(m.waitingFor ? [m.waitingFor] : []), ...approvals.map((a) => `Approval needed: ${a.title}`)],
  };
}
