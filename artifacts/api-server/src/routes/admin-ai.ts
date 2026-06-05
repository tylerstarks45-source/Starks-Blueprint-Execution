import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { desc, eq, sql } from "drizzle-orm";
import { db, openrouterUsageTable } from "@workspace/db";
import { complete } from "../lib/openrouter";
import { requireAdmin } from "../lib/auth";

const router: IRouter = Router();

const SUPPORTED_MODELS = [
  { id: "openai/gpt-4o-mini",            name: "GPT-4o Mini",          provider: "OpenAI",    context: 128000 },
  { id: "openai/gpt-4o",                 name: "GPT-4o",               provider: "OpenAI",    context: 128000 },
  { id: "anthropic/claude-3.5-sonnet",   name: "Claude 3.5 Sonnet",    provider: "Anthropic", context: 200000 },
  { id: "anthropic/claude-3-opus",       name: "Claude 3 Opus",        provider: "Anthropic", context: 200000 },
  { id: "openai/gpt-4-turbo",            name: "GPT-4 Turbo",          provider: "OpenAI",    context: 128000 },
  { id: "google/gemini-2.0-flash",       name: "Gemini 2.0 Flash",     provider: "Google",    context: 1000000 },
  { id: "deepseek/deepseek-r1",          name: "DeepSeek R1",          provider: "DeepSeek",  context: 65536 },
];

// GET /api/ai/openrouter/models
router.get("/ai/openrouter/models", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  res.json({ models: SUPPORTED_MODELS });
});

// GET /api/ai/openrouter/test-connection
router.get("/ai/openrouter/test-connection", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.json({ connected: false, error: "OPENROUTER_API_KEY not set" });
    return;
  }

  try {
    const start = Date.now();
    const result = await complete({
      prompt: "Reply with: OK",
      model: "openai/gpt-4o-mini",
    });
    res.json({
      connected: true,
      model: result.model,
      latencyMs: Date.now() - start,
      totalTokens: result.totalTokens,
    });
  } catch (err) {
    res.json({ connected: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/ai/openrouter/send-test-prompt
router.post("/ai/openrouter/send-test-prompt", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;

  const { prompt, model, systemPrompt } = req.body as {
    prompt?: string;
    model?: string;
    systemPrompt?: string;
  };

  if (!prompt?.trim()) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  try {
    const start = Date.now();
    const result = await complete({
      prompt,
      model: model ?? "openai/gpt-4o-mini",
      systemPrompt: systemPrompt ?? undefined,
    });
    res.json({
      content: result.content,
      model: result.model,
      usage: {
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        total: result.totalTokens,
      },
      responseTimeMs: Date.now() - start,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "OpenRouter request failed";
    res.status(400).json({ error: message });
  }
});

// POST /api/ai/openrouter/test-model
router.post("/ai/openrouter/test-model", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;

  const { model } = req.body as { model?: string };
  if (!model) {
    res.status(400).json({ error: "model is required" });
    return;
  }

  try {
    const start = Date.now();
    const result = await complete({ prompt: "Reply with: OK", model });
    res.json({
      model: result.model,
      success: true,
      latencyMs: Date.now() - start,
      totalTokens: result.totalTokens,
      content: result.content,
    });
  } catch (err) {
    res.json({
      model,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

// GET /api/ai/openrouter/usage
router.get("/ai/openrouter/usage", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;

  const rows = await db
    .select()
    .from(openrouterUsageTable)
    .orderBy(desc(openrouterUsageTable.createdAt))
    .limit(200);
  res.json({ rows: serialize(rows) });
});

// GET /api/ai/testing/request-history
router.get("/ai/testing/request-history", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;

  const rows = await db
    .select()
    .from(openrouterUsageTable)
    .where(eq(openrouterUsageTable.success, "true"))
    .orderBy(desc(openrouterUsageTable.createdAt))
    .limit(100);
  res.json({ rows: serialize(rows) });
});

// GET /api/ai/testing/error-history
router.get("/ai/testing/error-history", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;

  const rows = await db
    .select()
    .from(openrouterUsageTable)
    .where(eq(openrouterUsageTable.success, "false"))
    .orderBy(desc(openrouterUsageTable.createdAt))
    .limit(100);
  res.json({ rows: serialize(rows) });
});

// DELETE /api/ai/testing/clear-usage-stats
router.delete("/ai/testing/clear-usage-stats", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;

  await db.delete(openrouterUsageTable);
  res.json({ cleared: true });
});

// DELETE /api/ai/testing/clear-errors
router.delete("/ai/testing/clear-errors", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;

  await db
    .delete(openrouterUsageTable)
    .where(eq(openrouterUsageTable.success, "false"));
  res.json({ cleared: true });
});

// POST /api/ai/testing/test-all-models
router.post("/ai/testing/test-all-models", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;

  const results = await Promise.allSettled(
    SUPPORTED_MODELS.map(async (m) => {
      const start = Date.now();
      try {
        const r = await complete({ prompt: "Reply with: OK", model: m.id });
        return { model: m.id, success: true, latencyMs: Date.now() - start, content: r.content };
      } catch (err) {
        return { model: m.id, success: false, latencyMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
      }
    })
  );

  res.json({
    results: results.map((r) => (r.status === "fulfilled" ? r.value : { error: "unexpected" })),
  });
});

export default router;
