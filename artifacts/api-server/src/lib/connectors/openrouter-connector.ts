import { BaseConnector, TestResult, ExecResult } from "./base";
import { complete } from "../openrouter";

export class OpenRouterConnector extends BaseConnector {
  readonly id = "openrouter";
  readonly displayName = "OpenRouter AI";
  readonly category = "ai";
  readonly authType = "api_key" as const;
  readonly requiredCredentials = ["api_key"];
  readonly actions = ["generateText", "getModels"];

  async testConnection(): Promise<TestResult> {
    const start = Date.now();
    try {
      if (!process.env["OPENROUTER_API_KEY"]) {
        return { ok: false, latencyMs: 0, message: "OPENROUTER_API_KEY not configured" };
      }
      const result = await complete({
        prompt: "Reply with the single word: pong",
        model: "openai/gpt-4o-mini",
      });
      const latencyMs = Date.now() - start;
      return {
        ok: true,
        latencyMs,
        message: "OpenRouter connection verified",
        details: { model: result.model, tokens: result.totalTokens },
      };
    } catch (err: unknown) {
      return { ok: false, latencyMs: Date.now() - start, message: String(err) };
    }
  }

  async execute(action: string, params: Record<string, unknown>): Promise<ExecResult> {
    if (action === "generateText") {
      try {
        const prompt = (params["prompt"] as string) ?? "";
        const systemPrompt = (params["systemPrompt"] as string) ?? undefined;
        const model = (params["model"] as string) ?? "openai/gpt-4o-mini";
        const userId = (params["userId"] as number) ?? undefined;
        const systemInstanceId = (params["systemInstanceId"] as number) ?? undefined;

        const result = await complete({ prompt, model, systemPrompt, userId, systemInstanceId });
        return {
          ok: true,
          data: { text: result.content, tokens: result.totalTokens, model: result.model },
        };
      } catch (err: unknown) {
        return { ok: false, error: String(err) };
      }
    }
    return { ok: false, error: `Unknown action: ${action}` };
  }
}
