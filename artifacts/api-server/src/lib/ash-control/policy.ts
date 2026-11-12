// ASH Control: decides whether ASH may take an action herself, must queue it
// for the owner's approval, or may not do it at all, based on the owner's
// account-wide settings and any per-business override.
import {
  db, ashControlSettingsTable, ashSpendEventsTable,
  ASH_CONTROL_LEVELS, ASH_ACTION_KINDS, DEFAULT_APPROVAL_REQUIRED,
  type AshControlLevel, type AshActionKind,
} from "@workspace/db";
import { and, eq, gte, isNull, sql } from "drizzle-orm";

export type ToolActionKind = AshActionKind | "read";

// What each ASH tool does, for policy purposes. Unlisted tools are treated as
// "build" so a new tool is never silently ungated.
const TOOL_KINDS: Record<string, ToolActionKind> = {
  list_businesses: "read", get_business_context: "read", get_portfolio_summary: "read",
  get_empire_overview: "read", list_business_types: "read", research: "read",
  get_learned_patterns: "read", consult_specialist: "read", navigate: "read",
  get_ash_control: "read", list_missions: "read", start_mission: "read", request_owner_action: "read",
  create_business: "build", add_income_stream: "build", register_asset: "build",
  image: "build", generate_video: "build", generate_music: "build", text_to_speech: "build", file: "build",
  schedule_post: "publish", connector_action: "connect_service",
};

export function toolActionKind(tool: string): ToolActionKind {
  return TOOL_KINDS[tool] ?? "build";
}

export interface EffectiveControl {
  level: AshControlLevel;
  dailySpendLimitCents: number;
  monthlySpendLimitCents: number;
  approvalRequired: AshActionKind[];
  source: "business" | "account" | "default";
}

export const DEFAULT_CONTROL: Omit<EffectiveControl, "source"> = {
  level: "copilot",
  dailySpendLimitCents: 0,
  monthlySpendLimitCents: 0,
  approvalRequired: DEFAULT_APPROVAL_REQUIRED,
};

export const isLevel = (v: unknown): v is AshControlLevel => typeof v === "string" && (ASH_CONTROL_LEVELS as readonly string[]).includes(v);
export const isActionKind = (v: unknown): v is AshActionKind => typeof v === "string" && (ASH_ACTION_KINDS as readonly string[]).includes(v);

export async function getEffectiveControl(userId: number, businessId: number | null): Promise<EffectiveControl> {
  const rows = await db.select().from(ashControlSettingsTable).where(and(
    eq(ashControlSettingsTable.userId, userId),
    businessId != null
      ? sql`(${ashControlSettingsTable.businessId} is null or ${ashControlSettingsTable.businessId} = ${businessId})`
      : isNull(ashControlSettingsTable.businessId),
  ));
  const row = rows.find((r) => r.businessId != null) ?? rows.find((r) => r.businessId == null);
  if (!row) return { ...DEFAULT_CONTROL, source: "default" };
  return {
    level: isLevel(row.level) ? row.level : DEFAULT_CONTROL.level,
    dailySpendLimitCents: row.dailySpendLimitCents,
    monthlySpendLimitCents: row.monthlySpendLimitCents,
    approvalRequired: (row.approvalRequired ?? []).filter(isActionKind),
    source: row.businessId != null ? "business" : "account",
  };
}

export async function spentCents(userId: number, since: Date): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${ashSpendEventsTable.amountCents}), 0)::int` })
    .from(ashSpendEventsTable)
    .where(and(eq(ashSpendEventsTable.userId, userId), gte(ashSpendEventsTable.createdAt, since)));
  return Number(row?.total ?? 0);
}

export async function spendSummary(userId: number, now = new Date()) {
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [today, thisMonth] = await Promise.all([spentCents(userId, day), spentCents(userId, month)]);
  return { todayCents: today, monthCents: thisMonth };
}

export type Decision = { decision: "allow" | "approve" | "block"; reason: string };

/**
 * interactive: the owner asked for this in a live chat turn, which counts as
 * their go-ahead for building and publishing in co-pilot. Background work
 * (missions) gets no such allowance.
 */
export async function decide(opts: {
  userId: number;
  businessId: number | null;
  kind: ToolActionKind;
  interactive: boolean;
  clientTool?: boolean;
  costCents?: number;
}): Promise<Decision> {
  if (opts.kind === "read") return { decision: "allow", reason: "Read-only" };
  const c = await getEffectiveControl(opts.userId, opts.businessId);
  const queue = (reason: string): Decision => ({ decision: opts.clientTool ? "block" : "approve", reason });

  if (c.level === "advisor") return queue("ASH is set to Advisor: she suggests, you decide");
  if (opts.kind === "legal") return queue("Legal and identity steps always need the owner");
  if (c.approvalRequired.includes(opts.kind)) return queue(`Your settings require approval for ${opts.kind.replace("_", " ")}`);

  if (opts.kind === "spend") {
    if (c.level !== "autopilot") return queue("Spending needs approval below Autopilot");
    const cost = Math.max(0, opts.costCents ?? 0);
    if (c.dailySpendLimitCents <= 0 && c.monthlySpendLimitCents <= 0) return queue("No spending limit set");
    const s = await spendSummary(opts.userId);
    if (c.dailySpendLimitCents > 0 && s.todayCents + cost > c.dailySpendLimitCents) return queue("Over the daily spending limit");
    if (c.monthlySpendLimitCents > 0 && s.monthCents + cost > c.monthlySpendLimitCents) return queue("Over the monthly spending limit");
    return { decision: "allow", reason: "Within spending limits" };
  }

  if (c.level === "copilot") {
    if (opts.kind === "build") return { decision: "allow", reason: "Co-pilot builds inside your account" };
    if (opts.interactive && opts.kind !== "delete") return { decision: "allow", reason: "You asked for this" };
    return queue("Co-pilot asks before anything goes live");
  }
  return { decision: "allow", reason: c.level === "operator" ? "Operator, within your rules" : "Autopilot" };
}
