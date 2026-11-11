// ASH agent loop on OpenRouter native tool calling. Server tools are executed
// and fed back to the model; client tools are returned as the SBEP_DATA
// tool_calls the web app already knows how to run.
import { complete, type ChatMessage } from "../openrouter";
import { logger } from "../logger";
import { ASH_TOOLS, getTool, checkToolArgs } from "./tools";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { chainForAgentMode, resolveAgentMode } from "../models";
import { isFounderAdmin } from "../auth";

export interface ClientToolCall {
  type: string;
  [key: string]: unknown;
}

export interface AgentStep {
  tool: string;
  ok: boolean;
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
}): Promise<AgentResult> {
  const maxSteps = opts.maxSteps ?? 6;
  const messages: ChatMessage[] = [...opts.messages];
  const clientCalls: ClientToolCall[] = [];
  const steps: AgentStep[] = [];

  for (let round = 0; ; round++) {
    // Last round: no tools, so the model must answer with what it has.
    const tools = round < maxSteps ? ASH_TOOLS : undefined;
    const result = await complete({ systemPrompt: opts.systemPrompt, messages, tools, models: opts.models, userId: opts.userId });
    const calls = result.toolCalls ?? [];
    if (calls.length === 0) {
      return { content: result.content, clientCalls, steps, model: result.model };
    }

    messages.push({ role: "assistant", content: result.content || null, tool_calls: calls });
    for (const call of calls) {
      const spec = getTool(call.function.name);
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
        clientCalls.push(spec.toClientCall ? (spec.toClientCall(args) as ClientToolCall) : { ...args, type: spec.name });
        messages.push({ role: "tool", tool_call_id: call.id, content: toResult({ status: "queued", note: "Runs in the user's workspace after this reply." }) });
        steps.push({ tool: spec.name, ok: true });
        continue;
      }
      try {
        const value = await spec.run!(opts.userId, args);
        messages.push({ role: "tool", tool_call_id: call.id, content: toResult(value) });
        steps.push({ tool: spec.name, ok: true });
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
Use workspace tools (image, file, schedule_post, connector_action, ...) only when the user asks for that output or clearly wants it produced.
Be direct and concise.`;

/** One ASH turn for a user, with the membership-tier gate on agent mode. */
export async function runAshTurn(opts: {
  userId: number;
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  mode?: string;
  systemPrompt?: string;
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
  });
}
