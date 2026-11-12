// ASH agent loop on OpenRouter native tool calling. Server tools are executed
// and fed back to the model; client tools are returned as the SBEP_DATA
// tool_calls the web app already knows how to run.
import { complete, type ChatMessage } from "../openrouter";
import { logger } from "../logger";
import { OutOfCreditsError } from "../credits";
import { ASH_TOOLS, getTool, checkToolArgs } from "./tools";
import { SPECIALISTS, SPECIALIST_MAX_STEPS, type SpecialistKey } from "./specialists";

export interface ClientToolCall {
  type: string;
  [key: string]: unknown;
}

export interface AgentStep {
  tool: string;
  ok: boolean;
  specialist?: string;
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
}): Promise<AgentResult> {
  const maxSteps = opts.maxSteps ?? 6;
  const allowed = opts.toolNames ? new Set(opts.toolNames) : null;
  const toolset = allowed ? ASH_TOOLS.filter((t) => allowed.has(t.function.name)) : ASH_TOOLS;
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
