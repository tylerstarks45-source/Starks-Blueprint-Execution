import { logger } from "./logger";
import { db, usersTable } from "@workspace/db";
import { openrouterUsageTable, creditUsageEventsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getBalance, deductForUsage, creditsForTokens, OutOfCreditsError } from "./credits";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "openai/gpt-4o-mini";

interface CompletionRequest {
  model?: string;
  // Ordered best-first fallback chain. When provided, OpenRouter's native model
  // routing tries each in order and skips unavailable ones, so a deprecated or
  // rate-limited primary silently drops to the next-best model instead of failing.
  // Prefer this over `model` for user-facing calls (see lib/models.ts).
  models?: string[];
  prompt: string;
  systemPrompt?: string;
  userId?: number;
  systemInstanceId?: number;
  imageBase64?: string;
}

interface CompletionResult {
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: string | null;
}

// ─── Streaming completion (async generator) ──────────────────────────────────

export async function* streamCompletion(request: CompletionRequest): AsyncGenerator<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY environment variable is not set");

  const chain = request.models && request.models.length > 0 ? request.models : undefined;
  const model = chain?.[0] ?? request.model ?? DEFAULT_MODEL;
  const messages: Array<{ role: string; content: string }> = [];
  if (request.systemPrompt) messages.push({ role: "system", content: request.systemPrompt });
  messages.push({ role: "user", content: request.prompt });

  // Credit check — same logic as complete()
  if (request.userId != null) {
    const [userRow] = await db
      .select({ role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, request.userId));
    const isFounder = userRow?.role === "FOUNDER_ADMIN";
    if (!isFounder) {
      const bal = await getBalance(request.userId);
      if (bal.total <= 0) {
        logger.warn({ userId: request.userId }, "Blocked streaming call: out of credits");
        throw new OutOfCreditsError();
      }
    }
  }

  logger.info({ model, userId: request.userId, streaming: true }, "Sending streaming OpenRouter request");

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.APP_URL ?? "https://sbep.replit.app",
      "X-Title": "SBEP - Starks Blueprint Execution Platform",
    },
    body: JSON.stringify({ model, ...(chain ? { models: chain } : {}), messages, stream: true, stream_options: { include_usage: true } }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenRouter streaming error ${response.status}: ${errBody}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullContent = "";
  let finalUsage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null = null;
  // With a `models` chain OpenRouter may answer from a fallback; bill and log the model that served it.
  let servedModel: string | undefined;
  let success = true;
  let errorMessage: string | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") break;

        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>;
            model?: string;
            usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
          };

          if (parsed.model) servedModel = parsed.model;
          if (parsed.usage) finalUsage = parsed.usage;
          const delta = parsed.choices?.[0]?.delta?.content ?? "";
          if (delta) { fullContent += delta; yield delta; }
        } catch { /* skip malformed SSE lines */ }
      }
    }
  } catch (err) {
    success = false;
    errorMessage = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    try { reader.releaseLock(); } catch { /* ignore */ }

    const totalTokens = finalUsage?.total_tokens ?? Math.ceil(fullContent.length / 3);
    const billedModel = servedModel ?? model;

    if (request.userId != null && fullContent.length > 0) {
      try {
        await deductForUsage(request.userId, totalTokens, billedModel);
        // Phase 3: log granular credit usage event
        db.insert(creditUsageEventsTable).values({
          userId: request.userId,
          systemInstanceId: request.systemInstanceId ?? null,
          eventType: "ai_call",
          creditsConsumed: creditsForTokens(totalTokens),
          tokensUsed: totalTokens,
          model: billedModel,
        }).catch(() => { /* non-critical */ });
      } catch (err) {
        logger.error({ alert: "CREDIT_DEDUCTION_FAILED", err, userId: request.userId }, "Streaming credit deduction failed");
      }
    }

    try {
      await db.insert(openrouterUsageTable).values({
        userId: request.userId ?? null,
        systemInstanceId: request.systemInstanceId ?? null,
        model: billedModel,
        promptTokens: finalUsage?.prompt_tokens ?? 0,
        completionTokens: finalUsage?.completion_tokens ?? 0,
        totalTokens,
        estimatedCost: null,
        success: success ? "true" : "false",
        errorMessage,
      });
    } catch (logErr) {
      logger.error({ err: logErr }, "Failed to log streaming OpenRouter usage");
    }
  }
}

// ─── Non-streaming (original) ─────────────────────────────────────────────────

export async function complete(request: CompletionRequest): Promise<CompletionResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set");
  }

  const chain = request.models && request.models.length > 0 ? request.models : undefined;
  const model = chain?.[0] ?? request.model ?? DEFAULT_MODEL;
  const messages = [];

  if (request.systemPrompt) {
    messages.push({ role: "system", content: request.systemPrompt });
  }
  if (request.imageBase64) {
    messages.push({
      role: "user",
      content: [
        { type: "text", text: request.prompt },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${request.imageBase64}` } },
      ],
    });
  } else {
    messages.push({ role: "user", content: request.prompt });
  }

  // Enforce credit balance before spending tokens (only for attributed user calls).
  // FOUNDER_ADMIN bypasses the block so real-world testing is never interrupted,
  // but usage is still logged and deducted so analytics remain accurate.
  if (request.userId != null) {
    const [userRow] = await db
      .select({ role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, request.userId));
    const isFounder = userRow?.role === "FOUNDER_ADMIN";
    if (!isFounder) {
      const bal = await getBalance(request.userId);
      if (bal.total <= 0) {
        logger.warn({ userId: request.userId }, "Blocked OpenRouter call: out of credits");
        throw new OutOfCreditsError();
      }
    }
  }

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
      body: JSON.stringify({ model, ...(chain ? { models: chain } : {}), messages }),
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

    // Deduct credits for successful usage (failures already threw above).
    // deductForUsage retries internally; if it still fails we deliberately do NOT
    // fail the response (the AI call already succeeded and cost real money), but we
    // emit a CREDIT_DEDUCTION_FAILED alert marker carrying everything needed to reconcile.
    if (request.userId != null) {
      try {
        await deductForUsage(request.userId, result.totalTokens, result.model);
        // Phase 3: log granular credit usage event
        db.insert(creditUsageEventsTable).values({
          userId: request.userId,
          systemInstanceId: request.systemInstanceId ?? null,
          eventType: "ai_call",
          creditsConsumed: creditsForTokens(result.totalTokens),
          tokensUsed: result.totalTokens,
          model: result.model,
        }).catch(() => { /* non-critical */ });
      } catch (deductErr) {
        logger.error(
          {
            alert: "CREDIT_DEDUCTION_FAILED",
            err: deductErr,
            userId: request.userId,
            tokens: result.totalTokens,
            model: result.model,
            systemInstanceId: request.systemInstanceId ?? null,
          },
          "Credit deduction failed after AI usage — unbilled usage requires reconciliation",
        );
      }
    }

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
        model: result?.model ?? model,
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
