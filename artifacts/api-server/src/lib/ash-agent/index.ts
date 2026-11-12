// ASH agent loop on OpenRouter native tool calling. Server tools are executed
// and fed back to the model; client tools are returned as the SBEP_DATA
// tool_calls the web app already knows how to run.
import { complete, type ChatMessage } from "../openrouter";
import { logger } from "../logger";
import { OutOfCreditsError } from "../credits";
import { ASH_TOOLS, ALL_TOOL_DEFS, getTool, checkToolArgs } from "./tools";
import { decide, toolActionKind } from "../ash-control/policy";
import { createPendingApproval } from "../approvals";
import { ownedBusinessIds } from "../empire/assets";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { chainForAgentMode, resolveAgentMode } from "../models";
import { isFounderAdmin } from "../auth";
import { SPECIALISTS, SPECIALIST_MAX_STEPS, type SpecialistKey } from "./specialists";

export interface ClientToolCall {
  type: string;
  [key: string]: unknown;
}

export interface AgentStep {
  tool: string;
  ok: boolean;
  specialist?: string;
  /** Set when ASH Control queued this call for the owner's approval. */
  approvalId?: number;
  note?: string;
}

export interface AgentControl {
  /** The owner asked for this in a live chat turn. */
  interactive: boolean;
  missionId?: number;
  businessId?: number | null;
}

function describeCall(tool: string, args: Record<string, unknown>): string {
  const q = (k: string) => (typeof args[k] === "string" ? `"${String(args[k]).slice(0, 80)}"` : "");
  switch (tool) {
    case "create_business": return `Create business ${q("name")}`;
    case "add_income_stream": return `Add income stream ${q("title")}`;
    case "register_asset": return `Save asset ${q("name")} to the vault`;
    case "schedule_post": return `Schedule a post on ${String(args["platform"] ?? "social")}`;
    case "connector_action": return `Run ${String(args["action"] ?? "an action")} on ${String(args["connectorId"] ?? "a connected service")}`;
    default: return `Run ${tool.replace(/_/g, " ")}`;
  }
}

/** Applies the owner's ASH Control settings to one tool call. */
async function gate(userId: number, control: AgentControl, spec: { name: string; kind: string }, args: Record<string, unknown>):
  Promise<{ allowed: true } | { allowed: false; result: unknown; step: AgentStep }> {
  const kind = toolActionKind(spec.name);
  if (kind === "read") return { allowed: true };
  const argBiz = Number.isInteger(args["businessId"]) ? Number(args["businessId"]) : null;
  const candidate = argBiz ?? control.businessId ?? null;
  const businessId = candidate != null && (await ownedBusinessIds(userId, [candidate])).has(candidate) ? candidate : null;
  const d = await decide({ userId, businessId, kind, interactive: control.interactive, clientTool: spec.kind === "client" });
  if (d.decision === "allow") return { allowed: true };
  if (d.decision === "block") {
    return { allowed: false, result: { status: "not_allowed", reason: d.reason, note: "Describe what you would do instead, or ask the owner to change ASH Control." }, step: { tool: spec.name, ok: false } };
  }
  const approval = await createPendingApproval({
    businessId,
    userId,
    category: "ashAction",
    riskLevel: kind === "spend" || kind === "delete" || kind === "legal" ? "high" : "low",
    title: describeCall(spec.name, args),
    description: d.reason,
    payload: { action: "ash_tool", tool: spec.name, args, ...(control.missionId != null ? { missionId: control.missionId } : {}) },
  });
  return {
    allowed: false,
    result: { status: "awaiting_approval", approvalId: approval!.id, reason: d.reason, note: "Queued in the owner's Approvals inbox. It runs when they approve." },
    step: { tool: spec.name, ok: true, approvalId: approval!.id },
  };
}

export interface AgentResult {
  content: string;
  clientCalls: ClientToolCall[];
  steps: AgentStep[];
  model: string;
}

const MAX_RESULT_CHARS = 12_000;

function toResult(value: unknown): string {
  const text = JSON.stringify(value) ?? "null";
  // Keep oversized results valid JSON: a cut-off object would be unparseable.
  return text.length > MAX_RESULT_CHARS ? JSON.stringify({ truncated: true, partial: text.slice(0, MAX_RESULT_CHARS) }) : text;
}

export async function runAshAgent(opts: {
  userId: number;
  systemPrompt: string;
  messages: ChatMessage[];
  models: string[];
  maxSteps?: number;
  /** Restrict the agent to these tools (used for specialists). */
  toolNames?: readonly string[];
  control?: AgentControl;
}): Promise<AgentResult> {
  const maxSteps = opts.maxSteps ?? 6;
  const control: AgentControl = opts.control ?? { interactive: true };
  const allowed = opts.toolNames ? new Set(opts.toolNames) : null;
  const toolset = allowed ? ALL_TOOL_DEFS.filter((t) => allowed.has(t.function.name)) : ASH_TOOLS;
  const messages: ChatMessage[] = [...opts.messages];
  const clientCalls: ClientToolCall[] = [];
  const steps: AgentStep[] = [];

  for (let round = 0; ; round++) {
    // Last round: no tools, so the model must answer with what it has.
    const tools = round < maxSteps && toolset.length ? toolset : undefined;
    const result = await complete({ systemPrompt: opts.systemPrompt, messages, tools, models: opts.models, userId: opts.userId });
    const calls = result.toolCalls ?? [];
    if (calls.length === 0) {
      return { content: result.content, clientCalls, steps, model: result.model };
    }

    messages.push({ role: "assistant", content: result.content || null, tool_calls: calls });
    for (const call of calls) {
      const spec = allowed && !allowed.has(call.function.name) ? undefined : getTool(call.function.name);
      let args: Record<string, unknown>;
      try {
        const parsed: unknown = JSON.parse(call.function.arguments || "{}");
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("not an object");
        args = parsed as Record<string, unknown>;
      } catch {
        messages.push({ role: "tool", tool_call_id: call.id, content: toResult({ error: "Arguments must be a JSON object" }) });
        steps.push({ tool: call.function.name, ok: false });
        continue;
      }
      if (!spec) {
        messages.push({ role: "tool", tool_call_id: call.id, content: toResult({ error: `Unknown tool ${call.function.name}` }) });
        steps.push({ tool: call.function.name, ok: false });
        continue;
      }
      if (spec.kind === "client") {
        // These run in the user's workspace, so only schema-valid, declared fields go out.
        const checked = checkToolArgs(spec.name, args);
        if (!checked.ok) {
          messages.push({ role: "tool", tool_call_id: call.id, content: toResult({ error: checked.error }) });
          steps.push({ tool: spec.name, ok: false });
          continue;
        }
        args = checked.args;
        const g = await gate(opts.userId, control, spec, args);
        if (!g.allowed) {
          messages.push({ role: "tool", tool_call_id: call.id, content: toResult(g.result) });
          steps.push(g.step);
          continue;
        }
        clientCalls.push(spec.toClientCall ? (spec.toClientCall(args) as ClientToolCall) : { ...args, type: spec.name });
        messages.push({ role: "tool", tool_call_id: call.id, content: toResult({ status: "queued", note: "Runs in the user's workspace after this reply." }) });
        steps.push({ tool: spec.name, ok: true });
        continue;
      }
      if (spec.kind === "delegate") {
        const checked = checkToolArgs(spec.name, args);
        const key = checked.ok ? (checked.args["specialist"] as SpecialistKey) : undefined;
        if (!checked.ok || !key) {
          messages.push({ role: "tool", tool_call_id: call.id, content: toResult({ error: checked.ok ? "Unknown specialist" : checked.error }) });
          steps.push({ tool: spec.name, ok: false });
          continue;
        }
        const specialist = SPECIALISTS[key];
        const businessId = checked.args["businessId"];
        try {
          const report = await runAshAgent({
            userId: opts.userId,
            systemPrompt: specialist.prompt,
            messages: [{ role: "user", content: `${String(checked.args["task"])}${businessId != null ? `\n(Business id: ${String(businessId)})` : ""}` }],
            models: opts.models,
            maxSteps: SPECIALIST_MAX_STEPS,
            toolNames: specialist.tools,
            control,
          });
          messages.push({ role: "tool", tool_call_id: call.id, content: toResult({ specialist: specialist.title, report: report.content }) });
          steps.push({ tool: spec.name, ok: true, specialist: key });
        } catch (err) {
          if (err instanceof OutOfCreditsError) throw err;
          logger.warn({ specialist: key, err: err instanceof Error ? err.message : String(err) }, "ASH specialist failed");
          messages.push({ role: "tool", tool_call_id: call.id, content: toResult({ error: "Specialist unavailable" }) });
          steps.push({ tool: spec.name, ok: false, specialist: key });
        }
        continue;
      }
      try {
        const checked = checkToolArgs(spec.name, args);
        if (!checked.ok) {
          messages.push({ role: "tool", tool_call_id: call.id, content: toResult({ error: checked.error }) });
          steps.push({ tool: spec.name, ok: false });
          continue;
        }
        args = checked.args;
        const g = await gate(opts.userId, control, spec, args);
        if (!g.allowed) {
          messages.push({ role: "tool", tool_call_id: call.id, content: toResult(g.result) });
          steps.push(g.step);
          continue;
        }
        const value = await spec.run!(opts.userId, args);
        messages.push({ role: "tool", tool_call_id: call.id, content: toResult(value) });
        steps.push({ tool: spec.name, ok: true, ...(spec.name === "request_owner_action" ? { note: String(args["message"] ?? "") } : {}) });
      } catch (err) {
        logger.warn({ tool: spec.name, err: err instanceof Error ? err.message : String(err) }, "ASH tool failed");
        messages.push({ role: "tool", tool_call_id: call.id, content: toResult({ error: "Tool failed" }) });
        steps.push({ tool: spec.name, ok: false });
      }
    }
  }
}

export const ASH_AGENT_PROMPT = `You are ASH, the AI business operator of the STARKS platform.
Use tools to ground every answer in the user's real data: call list_businesses / get_business_context / get_portfolio_summary before giving business-specific advice, and research for anything time-sensitive.
Never invent metrics; if a value isn't measured, say so.
For the user's empire (all businesses, income streams, assets, verified vs projected revenue) call get_empire_overview. When the user asks you to start a business, add an income stream or save an asset, do it with create_business / add_income_stream / register_asset instead of telling them how. Never present projected revenue as earned.
For multi-step goals the owner wants carried out over time ("build me 3 income streams", "launch a store"), call start_mission so you keep working on it in the background; list_missions shows progress. The owner controls how much you may do alone (get_ash_control). When a tool returns awaiting_approval, tell the owner it's waiting in their Approvals inbox; when it returns not_allowed, explain and suggest the steps instead.
For in-depth or cross-functional questions (a growth plan, pricing review, launch plan), call consult_specialist for the relevant specialists (finance, marketing, operations, research, strategy), then combine their reports into one answer.
Use navigate when the user asks to go to a page (e.g. "take me to my stats" → /stats).
Use workspace tools (image, file, schedule_post, connector_action, ...) only when the user asks for that output or clearly wants it produced.
Be direct and concise.`;

/** One ASH turn for a user, with the membership-tier gate on agent mode. */
export async function runAshTurn(opts: {
  userId: number;
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  mode?: string;
  systemPrompt?: string;
  toolNames?: readonly string[];
}): Promise<AgentResult> {
  // Higher modes use the flagship model, so gate them like /ai-orchestrator/chat.
  const [caller] = await db
    .select({ role: usersTable.role, membershipTier: usersTable.membershipTier })
    .from(usersTable)
    .where(eq(usersTable.id, opts.userId))
    .limit(1);
  const { mode } = resolveAgentMode(opts.mode, caller?.membershipTier, isFounderAdmin(caller?.role));
  return runAshAgent({
    userId: opts.userId,
    systemPrompt: opts.systemPrompt ?? ASH_AGENT_PROMPT,
    messages: [...opts.history, { role: "user", content: opts.message }],
    models: chainForAgentMode(mode),
    ...(opts.toolNames ? { toolNames: opts.toolNames } : {}),
  });
}
