// ASH agent loop on OpenRouter native tool calling. Server tools are executed
// and fed back to the model; client tools are returned as the SBEP_DATA
// tool_calls the web app already knows how to run.
import { complete, type ChatMessage } from "../openrouter";
import { logger } from "../logger";
import { ASH_TOOLS, getTool } from "./tools";

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
        args = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
      } catch {
        messages.push({ role: "tool", tool_call_id: call.id, content: toResult({ error: "Arguments were not valid JSON" }) });
        steps.push({ tool: call.function.name, ok: false });
        continue;
      }
      if (!spec) {
        messages.push({ role: "tool", tool_call_id: call.id, content: toResult({ error: `Unknown tool ${call.function.name}` }) });
        steps.push({ tool: call.function.name, ok: false });
        continue;
      }
      if (spec.kind === "client") {
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
