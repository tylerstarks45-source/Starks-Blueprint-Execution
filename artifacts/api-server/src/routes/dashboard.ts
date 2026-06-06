import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, and, gte, sql, inArray } from "drizzle-orm";
import {
  db,
  blueprintsTable,
  toolsTable,
  toolCategoriesTable,
  systemInstancesTable,
  buildProgressTable,
  buildSessionsTable,
  systemActivityEventsTable,
} from "@workspace/db";
import { complete } from "../lib/openrouter";
import { requireAuthActive } from "../lib/auth";
import { hasCredits } from "../lib/credits";
import { z } from "zod";

const router: IRouter = Router();

// POST /api/dashboard/chat — blueprint + tool-aware AI chat for the user dashboard
router.post("/dashboard/chat", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  if (!(await hasCredits(userId))) {
    res.status(402).json({ error: "You're out of AI credits. Top up to continue.", code: "out_of_credits" });
    return;
  }

  const schema = z.object({
    message: z.string().min(1).max(2000),
    history: z.array(z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })).max(20).default([]),
    systemInstanceId: z.number().int().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Fetch blueprints catalog
  const blueprints = await db.select({
    id: blueprintsTable.id,
    name: blueprintsTable.name,
    description: blueprintsTable.description,
    difficulty: blueprintsTable.difficulty,
    estimatedCost: blueprintsTable.estimatedCost,
    estimatedTime: blueprintsTable.estimatedTime,
    slug: blueprintsTable.slug,
  }).from(blueprintsTable);

  // Fetch tools with categories and affiliate links
  const toolCategories = await db.select().from(toolCategoriesTable);
  const categoryMap = Object.fromEntries(toolCategories.map((c) => [c.id, c.name]));
  const tools = await db.select().from(toolsTable).where(eq(toolsTable.activeStatus, true));

  // Build context about user's current systems if systemInstanceId provided
  let userSystemContext = "";
  if (parsed.data.systemInstanceId) {
    const [instance] = await db
      .select()
      .from(systemInstancesTable)
      .where(and(
        eq(systemInstancesTable.id, parsed.data.systemInstanceId),
        eq(systemInstancesTable.userId, userId)
      ));
    if (instance) {
      const [bp] = await db.select().from(blueprintsTable).where(eq(blueprintsTable.id, instance.blueprintId));
      const [session] = await db
        .select()
        .from(buildSessionsTable)
        .where(eq(buildSessionsTable.systemInstanceId, instance.id));
      let progress: typeof buildProgressTable.$inferSelect[] = [];
      if (session) {
        progress = await db
          .select()
          .from(buildProgressTable)
          .where(eq(buildProgressTable.buildSessionId, session.id));
      }
      const done = progress.filter((s) => s.status === "completed").length;
      userSystemContext = `
USER'S CURRENT SYSTEM CONTEXT:
- System Name: ${instance.name}
- Blueprint: ${bp?.name ?? "Unknown"}
- Build Status: ${instance.buildStatus}
- Health: ${instance.healthStatus}
- Progress: ${done}/${progress.length} steps completed
`;
    }
  }

  const blueprintCatalog = blueprints
    .map((b) => `• ${b.name} (${b.difficulty}, ~${b.estimatedCost ?? "varies"}, ~${b.estimatedTime ?? "varies"}): ${b.description ?? ""}`)
    .join("\n");

  const toolCatalog = tools
    .map((t) => {
      const cat = t.categoryId ? (categoryMap[t.categoryId] ?? "General") : "General";
      const link = t.affiliateLink ? ` | Signup: ${t.affiliateLink}` : "";
      const creds = t.requiredCredentials && t.requiredCredentials.length > 0
        ? ` | Requires: ${t.requiredCredentials.join(", ")}`
        : "";
      return `• [${cat}] ${t.name}: ${t.description ?? ""}${creds}${link}`;
    })
    .join("\n");

  const systemPrompt = `You are SBEP's AI Build Agent — the personal AI architect on the Starks Blueprint Execution Platform. You help users build automated income systems.

AVAILABLE BLUEPRINTS (these are the ONLY blueprints you can recommend — never invent others):
${blueprintCatalog}

MARKETPLACE TOOLS (always use these exact tools and their affiliate links — never make up tools):
${toolCatalog}
${userSystemContext}
YOUR RESPONSIBILITIES:
1. Help users pick the right blueprint for their goals
2. After blueprint selection → list EXACTLY which tools they need with their affiliate signup links
3. Answer "what credentials/info do I need for [tool]?" with the specific fields listed in Requires
4. Guide users through the build process step by step
5. Be honest about what the system will and won't do for them
6. Keep responses concise, specific, and actionable

RESPONSE FORMAT for tool recommendations:
**[Tool Name]** — [why needed for this blueprint]
🔗 Sign up: [exact affiliate link from catalog]
📋 You'll need: [required credentials]

If a tool has no affiliate link in the catalog, say "Available on marketplace" instead.`;

  try {
    // Format conversation history into the prompt so the AI has full context.
    const historyText = parsed.data.history.slice(-8)
      .map((h) => `${h.role === "user" ? "User" : "Agent"}: ${h.content}`)
      .join("\n");

    const prompt = historyText
      ? `CONVERSATION SO FAR:\n${historyText}\n\nUser: ${parsed.data.message}`
      : parsed.data.message;

    const result = await complete({
      systemPrompt,
      prompt,
      model: "openai/gpt-4o-mini",
      userId,
    });

    // Extract any tool recommendations from the response for structured display
    const recommendedTools = tools.filter((t) =>
      t.affiliateLink && result.content.toLowerCase().includes(t.name.toLowerCase())
    ).slice(0, 6).map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      affiliateLink: t.affiliateLink,
      category: t.categoryId ? (categoryMap[t.categoryId] ?? "General") : "General",
      requiredCredentials: t.requiredCredentials ?? [],
    }));

    res.json({
      content: result.content,
      recommendedTools,
      totalTokens: result.totalTokens,
    });
  } catch (err: any) {
    const code = (err as { code?: string })?.code;
    if (code === "out_of_credits") {
      res.status(402).json({ error: "Out of AI credits.", code });
      return;
    }
    req.log.error({ err }, "Dashboard chat error");
    res.status(500).json({ error: "AI chat failed. Please try again." });
  }
});

// GET /api/dashboard/revenue-summary — aggregated earnings across all user systems
router.get("/dashboard/revenue-summary", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  // Get all system instance IDs for this user
  const userSystems = await db
    .select({ id: systemInstancesTable.id })
    .from(systemInstancesTable)
    .where(eq(systemInstancesTable.userId, userId));

  if (userSystems.length === 0) {
    res.json({ todayCents: 0, weekCents: 0, monthCents: 0, lifetimeCents: 0, systemCount: 0, currency: "USD" });
    return;
  }

  const systemIds = userSystems.map((s) => s.id);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 6);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const revenueBase = and(
    inArray(systemActivityEventsTable.systemInstanceId, systemIds),
    eq(systemActivityEventsTable.eventType, "revenue"),
  );

  const [todayRows, weekRows, monthRows, lifetimeRows] = await Promise.all([
    db
      .select({ total: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)` })
      .from(systemActivityEventsTable)
      .where(and(revenueBase, gte(systemActivityEventsTable.createdAt, startOfToday))),
    db
      .select({ total: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)` })
      .from(systemActivityEventsTable)
      .where(and(revenueBase, gte(systemActivityEventsTable.createdAt, startOfWeek))),
    db
      .select({ total: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)` })
      .from(systemActivityEventsTable)
      .where(and(revenueBase, gte(systemActivityEventsTable.createdAt, startOfMonth))),
    db
      .select({ total: sql<number>`coalesce(sum(${systemActivityEventsTable.amountCents}), 0)` })
      .from(systemActivityEventsTable)
      .where(revenueBase),
  ]);

  res.json({
    todayCents: Number(todayRows[0]?.total ?? 0),
    weekCents: Number(weekRows[0]?.total ?? 0),
    monthCents: Number(monthRows[0]?.total ?? 0),
    lifetimeCents: Number(lifetimeRows[0]?.total ?? 0),
    systemCount: systemIds.length,
    currency: "USD",
  });
});

// GET /api/dashboard/blueprints — all published blueprints (no auth required)
router.get("/dashboard/blueprints", async (_req, res): Promise<void> => {
  const blueprints = await db
    .select()
    .from(blueprintsTable)
    .orderBy(blueprintsTable.name);
  res.json(serialize(blueprints));
});

export default router;
