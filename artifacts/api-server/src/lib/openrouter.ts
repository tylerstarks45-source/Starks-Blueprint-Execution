import { logger } from "./logger";
import { db } from "@workspace/db";
import { openrouterUsageTable } from "@workspace/db";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "openai/gpt-4o-mini";

interface CompletionRequest {
  model?: string;
  prompt: string;
  systemPrompt?: string;
  userId?: number;
  systemInstanceId?: number;
}

interface CompletionResult {
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: string | null;
}

export async function complete(request: CompletionRequest): Promise<CompletionResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set");
  }

  const model = request.model ?? DEFAULT_MODEL;
  const messages = [];

  if (request.systemPrompt) {
    messages.push({ role: "system", content: request.systemPrompt });
  }
  messages.push({ role: "user", content: request.prompt });

  logger.info({ model, userId: request.userId }, "Sending OpenRouter completion request");

  let success = true;
  let errorMessage: string | null = null;
  let result: CompletionResult | null = null;

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_URL ?? "https://sbep.replit.app",
        "X-Title": "SBEP - Starks Blueprint Execution Platform",
      },
      body: JSON.stringify({ model, messages }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`OpenRouter API error ${response.status}: ${errBody}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
      model: string;
      usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    const content = data.choices[0]?.message?.content ?? "";
    const usage = data.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    result = {
      content,
      model: data.model ?? model,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      estimatedCost: null,
    };

    logger.info({ model: result.model, totalTokens: result.totalTokens }, "OpenRouter completion succeeded");
    return result;
  } catch (err) {
    success = false;
    errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ err: errorMessage }, "OpenRouter completion failed");
    throw err;
  } finally {
    try {
      await db.insert(openrouterUsageTable).values({
        userId: request.userId ?? null,
        systemInstanceId: request.systemInstanceId ?? null,
        model,
        promptTokens: result?.promptTokens ?? 0,
        completionTokens: result?.completionTokens ?? 0,
        totalTokens: result?.totalTokens ?? 0,
        estimatedCost: result?.estimatedCost ?? null,
        success: success ? "true" : "false",
        errorMessage,
      });
    } catch (logErr) {
      logger.error({ err: logErr }, "Failed to log OpenRouter usage");
    }
  }
}
