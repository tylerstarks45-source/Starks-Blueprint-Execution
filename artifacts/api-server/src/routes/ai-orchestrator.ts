import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, count, sql } from "drizzle-orm";
import {
  db,
  blueprintsTable,
  blueprintCategoriesTable,
  toolsTable,
  toolCategoriesTable,
  systemInstancesTable,
  openrouterUsageTable,
} from "@workspace/db";
import { complete } from "../lib/openrouter";
import { requireAuthActive } from "../lib/auth";
import { z } from "zod";

const router: IRouter = Router();

// ─── Knowledge Base Builder ─────────────────────────────────────────────────

async function buildPlatformKnowledge() {
  const [blueprints, tools, toolCategories, blueprintCategories] = await Promise.all([
    db.select().from(blueprintsTable),
    db.select().from(toolsTable).where(eq(toolsTable.activeStatus, true)),
    db.select().from(toolCategoriesTable),
    db.select().from(blueprintCategoriesTable),
  ]);

  const catMap = Object.fromEntries(toolCategories.map((c) => [c.id, c.name]));
  const bpCatMap = Object.fromEntries(blueprintCategories.map((c) => [c.id, c.name]));

  const blueprintKB = blueprints.map((b) =>
    `BLUEPRINT: ${b.name} (slug: ${b.slug})\n  Category: ${b.categoryId ? (bpCatMap[b.categoryId] ?? "General") : "General"}\n  Description: ${b.description ?? "AI automation system"}\n  Difficulty: ${b.difficulty}\n  Cost: ${b.estimatedCost ?? "Varies"}/mo\n  Setup Time: ${b.estimatedTime ?? "2-4 hours"}`
  ).join("\n\n");

  const toolKB = tools.map((t) =>
    `TOOL: ${t.name}\n  Category: ${t.categoryId ? (catMap[t.categoryId] ?? "General") : "General"}\n  Description: ${t.description ?? ""}\n  Pricing: ${t.pricing ?? "See site"}\n  Credentials: ${t.requiredCredentials?.join(", ") ?? "API Key"}`
  ).join("\n\n");

  return { blueprints, tools, toolCategories, blueprintKB, toolKB };
}

// ─── STARK Orchestrator System Prompt ───────────────────────────────────────

function buildSystemPrompt(blueprintKB: string, toolKB: string) {
  return `You are STARK — the AI Orchestrator powering the Starks Blueprint Execution Platform (SBEP).

You are NOT a chatbot. You are the operating system that powers automated income systems for users.

Your mission: analyze user goals → match blueprints → define tool stacks → guide step-by-step builds.

=== PLATFORM KNOWLEDGE BASE ===

--- BLUEPRINTS ---
${blueprintKB}

--- TOOL STACK ---
${toolKB}

=== RESPONSE RULES ===
1. Always analyze the user's goal and recommend the BEST matching blueprint from the list above
2. Always include a <SBEP_DATA> block with structured JSON so the UI can render action cards
3. Be direct, confident, and enterprise-grade — no fluff
4. Recommend concrete next steps and specific tools with their credential requirements
5. Match income goals to blueprints using the descriptions above

=== STRUCTURED OUTPUT FORMAT ===
Wrap JSON in <SBEP_DATA>...</SBEP_DATA> at the end of every response:

<SBEP_DATA>
{
  "type": "recommendation",
  "recommendation": {
    "blueprintSlug": "exact-slug-from-above",
    "blueprintName": "Blueprint Name",
    "matchScore": 92,
    "reasoning": "Why this blueprint fits the goal",
    "estimatedCost": "$47/mo",
    "estimatedTime": "3 hours setup"
  },
  "requiredTools": [
    { "name": "Tool Name", "purpose": "What it does in this system", "credentialRequired": "API Key" }
  ],
  "nextSteps": [
    "Step 1: Connect OpenRouter API",
    "Step 2: Set up Make.com account",
    "Step 3: Launch automation"
  ],
  "cta": {
    "label": "Build This Blueprint",
    "blueprintSlug": "exact-slug-from-above"
  }
}
</SBEP_DATA>

If the user is asking a general question (not about a specific goal), set "type": "general" and omit "recommendation" and "cta".`;
}

// ─── POST /api/ai-orchestrator/chat ─────────────────────────────────────────

router.post("/ai-orchestrator/chat", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const schema = z.object({
    message: z.string().min(1).max(2000),
    history: z.array(z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })).optional().default([]),
    systemInstanceId: z.number().int().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const { blueprintKB, toolKB } = await buildPlatformKnowledge();

    const historyCtx = parsed.data.history.length > 0
      ? "\n\n--- CONVERSATION HISTORY ---\n" +
        parsed.data.history.map((h) => `${h.role === "user" ? "User" : "STARK"}: ${h.content}`).join("\n")
      : "";

    const result = await complete({
      systemPrompt: buildSystemPrompt(blueprintKB, toolKB),
      prompt: `${historyCtx}\n\nUser: ${parsed.data.message}`,
      model: "openai/gpt-4o-mini",
      userId,
      systemInstanceId: parsed.data.systemInstanceId,
    });

    const raw = result.content;
    const dataMatch = raw.match(/<SBEP_DATA>([\s\S]*?)<\/SBEP_DATA>/);
    let structuredData: Record<string, unknown> | null = null;
    const displayContent = raw.replace(/<SBEP_DATA>[\s\S]*?<\/SBEP_DATA>/g, "").trim();

    if (dataMatch) {
      try {
        structuredData = JSON.parse(dataMatch[1].trim());
      } catch {
        // structured parse failed — UI will just show plain text
      }
    }

    res.json({ content: displayContent, structuredData, tokens: result.totalTokens });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Orchestrator request failed";
    if ((err as { code?: string })?.code === "out_of_credits") {
      res.status(402).json({ error: message, code: "out_of_credits" });
      return;
    }
    req.log.error({ err }, "AI orchestrator chat error");
    res.status(500).json({ error: message });
  }
});

// ─── POST /api/ai-orchestrator/recommend ────────────────────────────────────

router.post("/ai-orchestrator/recommend", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const schema = z.object({ goal: z.string().min(1).max(1000) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const { blueprintKB, toolKB, blueprints } = await buildPlatformKnowledge();

    const result = await complete({
      systemPrompt: `You are SBEP's recommendation engine. Return ONLY valid JSON — no prose, no markdown.

Platform blueprints:
${blueprintKB}

Platform tools:
${toolKB}`,
      prompt: `User goal: "${parsed.data.goal}"

Return JSON matching this schema exactly:
{
  "blueprintSlug": "exact-slug",
  "blueprintName": "name",
  "matchScore": 0-100,
  "reasoning": "one sentence why this fits",
  "requiredTools": [{"name":"...","purpose":"...","credentialRequired":"..."}],
  "buildSteps": ["Step 1: ...","Step 2: ...","Step 3: ...","Step 4: ...","Step 5: ..."],
  "estimatedCost": "$/mo",
  "estimatedSetupTime": "X hours",
  "expectedOutcome": "concrete result"
}`,
      model: "openai/gpt-4o-mini",
      userId,
    });

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      res.status(500).json({ error: "AI returned unparseable response" });
      return;
    }

    const recommendation = JSON.parse(jsonMatch[0]);
    const matchedBlueprint = blueprints.find((b) => b.slug === recommendation.blueprintSlug);

    res.json({ ...recommendation, blueprint: matchedBlueprint ? serialize(matchedBlueprint) : null });
  } catch (err) {
    req.log.error({ err }, "AI orchestrator recommend error");
    res.status(500).json({ error: err instanceof Error ? err.message : "Recommendation failed" });
  }
});

// ─── GET /api/ai-orchestrator/readiness ─────────────────────────────────────

router.get("/ai-orchestrator/readiness", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const [[bpCount], [toolCount], [myUsage]] = await Promise.all([
    db.select({ count: count() }).from(blueprintsTable),
    db.select({ count: count() }).from(toolsTable),
    db.select({ count: count() }).from(openrouterUsageTable).where(eq(openrouterUsageTable.userId, userId)),
  ]);

  const caps = {
    blueprintCount: bpCount?.count ?? 0,
    toolCount: toolCount?.count ?? 0,
    openrouterConnected: !!process.env.OPENROUTER_API_KEY,
    stripeConnected: !!(process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_PUBLISHABLE_KEY),
    databaseConnected: true,
    aiRequestsMade: myUsage?.count ?? 0,
  };

  const missing: string[] = [];
  if (!caps.openrouterConnected) missing.push("OpenRouter API Key — required for all AI features");

  res.json({
    capabilities: caps,
    missing,
    score: missing.length === 0 ? 100 : Math.max(0, 100 - missing.length * 25),
    status: missing.length === 0 ? "fully_operational" : "partial",
  });
});

// ─── GET /api/ai-orchestrator/platform-stats ────────────────────────────────

router.get("/ai-orchestrator/platform-stats", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const [instances, blueprints, [usageSummary]] = await Promise.all([
    db.select().from(systemInstancesTable).where(eq(systemInstancesTable.userId, userId)),
    db.select().from(blueprintsTable),
    db.select({
      totalRequests: sql<number>`count(*)::int`,
      totalTokens: sql<number>`coalesce(sum(${openrouterUsageTable.totalTokens}), 0)::int`,
      successRate: sql<number>`round(count(*) filter (where ${openrouterUsageTable.success} = 'true') * 100.0 / greatest(count(*), 1))::int`,
    }).from(openrouterUsageTable).where(eq(openrouterUsageTable.userId, userId)),
  ]);

  const bpMap = Object.fromEntries(blueprints.map((b) => [b.id, b]));

  const systemStats = {
    total: instances.length,
    active: instances.filter((s) => s.healthStatus === "healthy" || s.buildStatus === "active").length,
    building: instances.filter((s) => s.buildStatus === "building").length,
    paused: instances.filter((s) => s.buildStatus === "paused").length,
    failed: instances.filter((s) => s.healthStatus === "unhealthy").length,
  };

  const systemsWithBlueprint = instances.map((s) => ({
    ...serialize(s),
    blueprint: s.blueprintId ? serialize(bpMap[s.blueprintId] ?? null) : null,
  }));

  const toolHealth = {
    openrouter: {
      name: "OpenRouter AI",
      status: process.env.OPENROUTER_API_KEY ? "operational" : "degraded",
      description: "AI completion & orchestration engine",
    },
    database: {
      name: "Database",
      status: "operational",
      description: "PostgreSQL — all tables healthy",
    },
    stripe: {
      name: "Stripe",
      status: (process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_PUBLISHABLE_KEY)
        ? "operational"
        : "not_configured",
      description: "Payments & subscription management",
    },
  };

  res.json({
    systemStats,
    systems: systemsWithBlueprint,
    aiActivity: serialize(usageSummary ?? { totalRequests: 0, totalTokens: 0, successRate: 100 }),
    toolHealth,
  });
});

export default router;
