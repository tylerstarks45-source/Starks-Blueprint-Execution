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
  userCredentialsTable,
  buildSessionsTable,
  buildProgressTable,
  openrouterUsageTable,
  systemActivityEventsTable,
  skillsTable,
  skillActivationsTable,
} from "@workspace/db";
import { complete } from "../lib/openrouter";
import { hasCredits } from "../lib/credits";
import { requireAuthActive } from "../lib/auth";
import { encrypt, decrypt } from "../lib/crypto";
import { z } from "zod";

const router: IRouter = Router();

// ─── Skill Engine ─────────────────────────────────────────────────────────────

async function detectAndActivateSkills(
  userMessage: string,
  userId: number,
  systemInstanceId?: number
): Promise<Array<{ slug: string; name: string; category: string; icon: string; systemPromptAddition: string | null }>> {
  const allSkills = await db
    .select()
    .from(skillsTable)
    .where(eq(skillsTable.activeStatus, true));

  const msgLower = userMessage.toLowerCase();

  const matched = allSkills.filter((skill) => {
    const keywords: string[] = Array.isArray(skill.keywords) ? skill.keywords as string[] : [];
    return keywords.some((kw) => msgLower.includes(kw.toLowerCase()));
  });

  if (matched.length > 0) {
    await Promise.all(
      matched.map((skill) =>
        db.insert(skillActivationsTable).values({
          skillId: skill.id,
          userId,
          systemInstanceId: systemInstanceId ?? null,
        })
      )
    );
  }

  return matched.map((s) => ({
    slug: s.slug,
    name: s.name,
    category: s.category,
    icon: s.icon,
    systemPromptAddition: s.systemPromptAddition,
  }));
}

// ─── Platform Knowledge Base ─────────────────────────────────────────────────

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
    `BLUEPRINT: ${b.name} (slug: ${b.slug})
  Category: ${b.categoryId ? (bpCatMap[b.categoryId] ?? "General") : "General"}
  Description: ${b.description ?? "AI automation system"}
  Difficulty: ${b.difficulty} | Cost: ${b.estimatedCost ?? "Varies"}/mo | Setup: ${b.estimatedTime ?? "2-4 hours"}`
  ).join("\n\n");

  const toolKB = tools.map((t) =>
    `TOOL: ${t.name}
  Category: ${t.categoryId ? (catMap[t.categoryId] ?? "General") : "General"}
  Purpose: ${t.description ?? ""}
  Credentials Needed: ${Array.isArray(t.requiredCredentials) && t.requiredCredentials.length > 0 ? (t.requiredCredentials as string[]).join(", ") : "None — sign up and connect"}
  Affiliate Link: ${t.affiliateLink ?? t.signupUrl ?? "https://starksglobalgroup.net/marketplace"}
  Get Access: ${t.signupUrl ?? t.affiliateLink ?? "https://starksglobalgroup.net/marketplace"}`
  ).join("\n\n");

  return { blueprints, tools, toolCategories, blueprintKB, toolKB };
}

// ─── STARK Autonomous Builder System Prompt ──────────────────────────────────

function buildSystemPrompt(blueprintKB: string, toolKB: string) {
  return `You are ASH (Autonomous System Handler) — the elite AI agent powering the Starks Blueprint Execution Platform.

## IDENTITY & ROLE

You are not a chatbot. You are a **fully autonomous build agent** — the same class as Replit's AI agent, Devin, and similar autonomous code/system builders. When a user gives you an income goal, you:
1. **Plan** the exact system architecture (think step-by-step before responding)
2. **Select** the optimal blueprint from the platform knowledge base
3. **Identify** the minimum credentials needed (never ask for more than 4)
4. **Execute** the full build autonomously

You think like a senior systems architect AND a hands-on builder simultaneously.

## THINKING PROTOCOL

Before EVERY response, internally work through these steps (do NOT show this thinking to the user — only show the output):
- Step 1: What is the user's true goal (income target, business type, timeframe)?
- Step 2: Which blueprint best matches? Why?
- Step 3: What are the MINIMUM credentials truly needed to run this?
- Step 4: What are the first 3 concrete actions I would take to build this?
- Step 5: What would the user's revenue look like in 30/60/90 days?

## COMMUNICATION STYLE

- Be **confident and direct** — never say "you should" or "you could try". Say "I'm building this for you."
- Be **specific** — quote exact tool names, exact blueprint names, exact credential keys.
- Be **actionable** — every message moves the build forward. No filler.
- Use **concise markdown** — headers, bullets, bold for key terms. Keep it scannable.
- When you've analyzed a goal, ALWAYS show a revenue projection. Make it specific (e.g. "$800–$2,400/month by day 60").

## OUTPUT STYLE

Write responses like a top-tier AI agent working log:
✅ Confirmed: [what you know]
🔍 Analyzing: [what you're figuring out]  
⚡ Building: [what you're doing next]
📊 Projection: [revenue timeline]

Then include your Required Tools block and SBEP_DATA.

NEVER say "you need to set up X" or "here's how to do Y". Say "I'm building X for you" and "I need your Y credential to proceed."

=== PLATFORM KNOWLEDGE BASE ===

--- BLUEPRINTS ---
${blueprintKB}

--- TOOL STACK (STARKS MARKETPLACE) ---
${toolKB}

=== MARKETPLACE-FIRST TOOL RECOMMENDATION PROTOCOL ===

RULE: When determining which tools a system needs, you MUST check the STARKS Marketplace tool stack above FIRST.

STEP 1 — Identify the tool category needed (e.g. Email Delivery, AI Chat, CRM, Payments, Automation).
STEP 2 — Check if a Marketplace tool covers that category. If yes → recommend that tool. Do NOT suggest an external tool when a Marketplace equivalent exists.
STEP 3 — If NO Marketplace tool exists for the category → recommend the best external alternative, but state: "I checked the STARKS Marketplace — no equivalent tool is available for [category], recommending [External Tool] instead."

REQUIRED TOOLS SECTION: Every time you plan or respond to a build goal, include a Required Tools block in your message using this exact format for EACH tool:

🔧 REQUIRED TOOLS

**[Tool Name]** — [One-sentence purpose]
- Status: ✅ STARKS Marketplace
- Credentials Needed: [List from the tool's "Credentials Needed" above, or "None — sign up and connect"]
- 🔗 Get Access: [paste the exact Affiliate Link from the tool data above — NEVER make up a URL]

If a tool is external (not in Marketplace):
**[Tool Name]** — [One-sentence purpose]
- Status: 🔗 External (not in STARKS Marketplace)
- Credentials Needed: [what's needed]
- 🔗 Get Access: [official tool website]

AFFILIATE LINK RULE: You MUST always paste the exact affiliate link from the tool data above. Never shorten, modify, or omit these links. These are real monetized URLs that generate revenue for the platform. If the tool data shows an Affiliate Link, that is the link you display — always.

MARKETPLACE REVENUE GOAL: Every build should route users toward Marketplace tools first. Prioritize Marketplace tools even if a popular external alternative exists, as long as the Marketplace tool meets the system's requirements.

=== EXECUTION PROTOCOL ===

STEP 1 — When user states a goal:
- Instantly select the best matching blueprint
- Determine which tools are required (Marketplace-First — always check Marketplace tools above first)
- Show the Required Tools section in your response
- Identify the minimum credentials needed (only what is truly required)
- Return action: "collect_credentials" with exactly those credentials listed

STEP 2 — When user confirms credentials are provided:
- Do NOT ask for anything else
- Return action: "start_build" immediately

STEP 3 — For general questions (not a build goal):
- Answer briefly
- Return action: "general"

=== CREDENTIAL REFERENCE ===
Common credentials by tool type:
- AI tools (OpenRouter, etc): API key from provider dashboard
- Email tools (Resend, SendGrid): API key
- Automation (Make.com, Zapier): API key or webhook URL
- Social (TikTok, YouTube, Meta): Account cookie or OAuth token
- Commerce (Shopify, Stripe): API key + secret
- Analytics (Google): Service account JSON or API key

=== RESPONSE FORMAT ===
Write 1-2 confident sentences, show the Required Tools section, then close with a <SBEP_DATA> block.

<SBEP_DATA>
{
  "action": "collect_credentials",
  "blueprint": { "slug": "exact-slug-from-blueprints-above", "name": "Blueprint Name" },
  "systemName": "Descriptive name for this user's system",
  "requiredCredentials": [
    {
      "key": "UNIQUE_ENV_KEY",
      "label": "Human Readable Label",
      "description": "Where to get this credential and why it's needed",
      "credentialType": "api_key",
      "toolName": "Tool Name"
    }
  ]
}
</SBEP_DATA>

For general responses:
<SBEP_DATA>
{ "action": "general" }
</SBEP_DATA>

For confirming build start (after credentials submitted):
<SBEP_DATA>
{ "action": "start_build", "blueprint": { "slug": "...", "name": "..." }, "systemName": "..." }
</SBEP_DATA>

IMPORTANT: Only request credentials that are strictly necessary for the selected blueprint's core functionality. Never request more than 4 credentials. Less is better.`;
}

function defaultBuildPlan(blueprintName: string): string[] {
  return [
    `Initialize ${blueprintName} core infrastructure and validate service connections`,
    `Configure AI engine and deploy affiliate link tracker for revenue attribution`,
    `Build automation workflows and activate sales funnel for lead capture`,
    `Launch email campaign to monetised subscriber list and validate outputs`,
    `Deploy live system, activate ad placement slots, and enable monitoring`,
  ];
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
    agentMode: z.string().optional().default("fast"),
    businessType: z.string().optional(),
    revenueGoal: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const [{ blueprintKB, toolKB }, storedCreds, activatedSkills] = await Promise.all([
      buildPlatformKnowledge(),
      db.select({ credentialKey: userCredentialsTable.credentialKey })
        .from(userCredentialsTable)
        .where(eq(userCredentialsTable.userId, userId)),
      detectAndActivateSkills(parsed.data.message, userId, parsed.data.systemInstanceId),
    ]);

    const storedKeys = storedCreds.map((c) => c.credentialKey);
    const storedCredNote = storedKeys.length > 0
      ? `\n\n=== USER'S STORED CREDENTIALS (ALREADY ON FILE — DO NOT REQUEST THESE) ===\n${storedKeys.join(", ")}\nIf the blueprint you select requires any of these keys, skip them from requiredCredentials. The system will use the stored values automatically.`
      : "";

    // Inject activated skill additions into the system prompt
    const skillAdditions = activatedSkills
      .filter((s) => s.systemPromptAddition)
      .map((s) => `\n\n=== ACTIVATED SKILL: ${s.name.toUpperCase()} ===\n${s.systemPromptAddition}`)
      .join("");

    const historyCtx = parsed.data.history.length > 0
      ? "\n\nConversation so far:\n" +
        parsed.data.history.map((h) => `${h.role === "user" ? "User" : "STARK"}: ${h.content}`).join("\n")
      : "";

    const modelMap: Record<string, string> = {
      fast:     "openai/gpt-4o-mini",
      business: "openai/gpt-4o",
      expert:   "anthropic/claude-3.5-sonnet",
      empire:   "anthropic/claude-3-opus",
    };
    const model = modelMap[parsed.data.agentMode ?? "fast"] ?? "openai/gpt-4o-mini";

    const contextNote = [
      parsed.data.businessType ? `User's business focus: ${parsed.data.businessType}` : "",
      parsed.data.revenueGoal  ? `User's revenue goal: ${parsed.data.revenueGoal}` : "",
    ].filter(Boolean).join("\n");

    const result = await complete({
      systemPrompt: buildSystemPrompt(blueprintKB, toolKB) + storedCredNote + skillAdditions + (contextNote ? `\n\n=== USER CONTEXT ===\n${contextNote}` : ""),
      prompt: `${historyCtx}\n\nUser: ${parsed.data.message}`,
      model,
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
        // Server-side deterministic enforcement: strip already-stored credential keys
        // from requiredCredentials so the frontend never asks for keys on file.
        if (structuredData && Array.isArray((structuredData as Record<string, unknown>).requiredCredentials)) {
          (structuredData as Record<string, unknown>).requiredCredentials =
            (structuredData.requiredCredentials as { key?: string }[])
              .filter((c) => !(c.key && storedKeys.includes(c.key)));
        }
      } catch { /* ignored */ }
    }

    res.json({ content: displayContent, structuredData, tokens: result.totalTokens, activatedSkills });
  } catch (err) {
    const message = err instanceof Error ? err.message : "STARK request failed";
    if ((err as { code?: string })?.code === "out_of_credits") {
      res.status(402).json({ error: message, code: "out_of_credits" });
      return;
    }
    req.log.error({ err }, "AI orchestrator chat error");
    res.status(500).json({ error: message });
  }
});

// ─── POST /api/ai-orchestrator/execute ──────────────────────────────────────
// Creates system instance, stores credentials, generates build plan, creates session/steps.
// Returns everything the frontend needs to auto-execute each build step.

router.post("/ai-orchestrator/execute", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const schema = z.object({
    blueprintSlug: z.string().min(1),
    systemName: z.string().min(1).optional(),
    credentials: z.array(z.object({
      key: z.string().min(1),
      value: z.string().min(1),
      toolName: z.string().optional(),
    })).default([]),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // 1. Resolve blueprint
  const [blueprint] = await db.select().from(blueprintsTable)
    .where(eq(blueprintsTable.slug, parsed.data.blueprintSlug));
  if (!blueprint) {
    res.status(404).json({ error: `Blueprint "${parsed.data.blueprintSlug}" not found` });
    return;
  }

  // 2. Create system instance
  const [instance] = await db.insert(systemInstancesTable).values({
    userId,
    blueprintId: blueprint.id,
    name: parsed.data.systemName ?? `My ${blueprint.name}`,
    buildStatus: "building",
  }).returning();

  // 3. Persist credentials + merge with stored vault credentials
  // Fetch already-stored credentials for this user
  const storedVaultCreds = await db
    .select({ credentialKey: userCredentialsTable.credentialKey, encryptedValue: userCredentialsTable.encryptedValue, id: userCredentialsTable.id })
    .from(userCredentialsTable)
    .where(eq(userCredentialsTable.userId, userId));

  const storedKeyMap = Object.fromEntries(storedVaultCreds.map((c) => [c.credentialKey, c]));

  // Upsert each credential from the request
  if (parsed.data.credentials.length > 0) {
    await Promise.all(
      parsed.data.credentials.map(async (cred) => {
        const encryptedValue = encrypt(cred.value);
        const existing = storedKeyMap[cred.key];
        if (existing) {
          await db.update(userCredentialsTable)
            .set({ encryptedValue, updatedAt: new Date() })
            .where(eq(userCredentialsTable.id, existing.id));
        } else {
          await db.insert(userCredentialsTable).values({
            userId,
            credentialKey: cred.key,
            encryptedValue,
          });
        }
      })
    );
  }

  // 3b. Decrypt all stored credentials for this user (including pre-stored vault keys) so the
  //     AI build context can reference the decrypted values when orchestrating live integrations.
  const allStoredCreds = await db
    .select({ credentialKey: userCredentialsTable.credentialKey, encryptedValue: userCredentialsTable.encryptedValue })
    .from(userCredentialsTable)
    .where(eq(userCredentialsTable.userId, userId));

  const decryptedCredMap: Record<string, string> = {};
  for (const c of allStoredCreds) {
    try {
      decryptedCredMap[c.credentialKey] = decrypt(c.encryptedValue);
    } catch {
      // If decryption fails for a row, skip it rather than aborting the build
    }
  }

  // 4. Generate build plan via AI (fall back to defaults if out of credits)
  const allCategories = await db.select().from(toolCategoriesTable);
  const allTools = await db.select().from(toolsTable).where(eq(toolsTable.activeStatus, true));
  const categoryList = allCategories.map((c) => `ID:${c.id} NAME:${c.name}`).join("\n");

  let buildPlan: string[] = [];
  let selectedCategoryIds: number[] = [];

  const creditsOk = await hasCredits(userId);
  if (creditsOk) {
    try {
      const planResult = await complete({
        systemPrompt: `You are SBEP's build planner. Return ONLY valid JSON — no prose.
Available tool categories:
${categoryList}

Step naming rules — step descriptions must use explicit revenue-signal language where applicable:
- If a step deploys affiliate tracking links or records referral clicks, use the phrase "affiliate link tracker" or "affiliate click" in the description.
- If a step builds a sales funnel, checkout flow, or lead capture form, use the phrase "sales funnel" or "lead capture" in the description.
- If a step sends an email campaign or publishes monetised content, use the phrase "email campaign" or "content publish" in the description.
- If a step places ads or activates sponsored slots, use the phrase "ad placement" in the description.
- For infrastructure/setup steps that don't produce direct income, use neutral language (e.g. "configure", "integrate", "connect").

Return: {"categoryIds":[1,3],"buildPlan":["Step 1: ...","Step 2: ...","Step 3: ...","Step 4: ...","Step 5: ..."]}`,
        prompt: `Blueprint: ${blueprint.name}\nDescription: ${blueprint.description ?? ""}\nDifficulty: ${blueprint.difficulty}\nGenerate a specific 5-step autonomous build plan. At least 2 steps must be revenue-producing actions (affiliate, funnel, campaign, or content) that produce real income.`,
        model: "openai/gpt-4o-mini",
        userId,
        systemInstanceId: instance.id,
      });

      const jm = planResult.content.match(/\{[\s\S]*\}/);
      if (jm) {
        const d = JSON.parse(jm[0]);
        selectedCategoryIds = Array.isArray(d.categoryIds) ? d.categoryIds.map(Number).filter(Boolean) : [];
        buildPlan = Array.isArray(d.buildPlan) ? d.buildPlan : [];
      }
    } catch { /* fall through to defaults */ }
  }

  if (buildPlan.length === 0) buildPlan = defaultBuildPlan(blueprint.name);

  // 5. Determine required tools
  const categoryMap = Object.fromEntries(allCategories.map((c) => [c.id, c.name]));
  const requiredTools = selectedCategoryIds.length > 0
    ? allTools.filter((t) => t.categoryId != null && selectedCategoryIds.includes(t.categoryId!))
    : allTools.filter((t) => t.affiliateLink).slice(0, 6);
  const toolsWithCategory = requiredTools.map((t) => ({
    ...t,
    categoryName: t.categoryId ? (categoryMap[t.categoryId] ?? "General") : "General",
  }));

  // 6. Create build session + progress steps
  const [session] = await db.insert(buildSessionsTable).values({
    systemInstanceId: instance.id,
    status: "active",
    currentStepNumber: 1,
  }).returning();

  const steps = await Promise.all(
    buildPlan.map((stepText, idx) =>
      db.insert(buildProgressTable).values({
        buildSessionId: session.id,
        stepNumber: idx + 1,
        status: idx === 0 ? "in_progress" : "pending",
        notes: stepText,
      }).returning().then(([row]) => row)
    )
  );

  // Write an initial activity event marking the build start
  await db.insert(systemActivityEventsTable).values({
    systemInstanceId: instance.id,
    eventType: "action",
    description: `Build initiated — STARK AI is configuring "${blueprint.name}" across ${buildPlan.length} steps.`,
    metadata: JSON.stringify({ event: "build_started", blueprintSlug: blueprint.slug, sessionId: session.id }),
  });

  req.log.info({ userId, instanceId: instance.id, blueprint: blueprint.slug }, "Autonomous build initiated");

  res.status(201).json({
    instanceId: instance.id,
    sessionId: session.id,
    steps: serialize(steps),
    blueprint: serialize(blueprint),
    requiredTools: serialize(toolsWithCategory),
    buildPlan,
    credentialKeys: Object.keys(decryptedCredMap),
  });
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
    stripeConnected: !!(process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_PUBLISHABLE_KEY ?? process.env.stripe_publishable_key),
    databaseConnected: true,
    aiRequestsMade: myUsage?.count ?? 0,
  };

  const missing: string[] = [];
  if (!caps.openrouterConnected) missing.push("OpenRouter API Key");

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
      description: "AI completion & autonomous build engine",
    },
    database: { name: "Database", status: "operational", description: "PostgreSQL — all tables healthy" },
    stripe: {
      name: "Stripe",
      status: (process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_PUBLISHABLE_KEY ?? process.env.stripe_publishable_key) ? "operational" : "not_configured",
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
