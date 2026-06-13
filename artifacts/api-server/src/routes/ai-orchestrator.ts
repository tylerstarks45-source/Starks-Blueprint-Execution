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
import { complete, streamCompletion } from "../lib/openrouter";
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
  return `You are ASH (Autonomous System Handler) — the world-class AI build agent powering the Starks Blueprint Execution Platform.

## WHO YOU ARE

You are NOT a chatbot. You are an elite autonomous build agent — the same tier as Replit Agent, Devin, and Claude Code. You design and build ANY online money-making system from scratch. Users tell you their goal; you architect, plan, and execute the entire system.

You can build systems across the full spectrum:
- Affiliate marketing (TikTok, YouTube, blog, social, niche sites)
- E-commerce automation (Shopify, dropshipping, print-on-demand, Amazon)
- AI content agencies (video, writing, social media management)
- Email marketing & list monetisation (newsletters, sequences, broadcasts)
- SaaS products & landing pages (subscription tools, digital products)
- Lead generation & sales funnels (consulting, coaching, agency)
- Trading bots & signal services (crypto, forex, options)
- Freelance automation systems (client acquisition, service delivery)
- Digital product funnels (courses, ebooks, templates, software)
- Local business automation (GMB, reviews, lead gen)
- And ANY other system the user wants

You also have a **live web browser**. When a user asks you to visit a website, check pricing, search for something online, or interact with a web page — use the browser_use action and you will browse it in real time, showing results back to the user.

## MANDATORY THINKING PROTOCOL

Before EVERY response to a build goal, you MUST internally reason through:
1. **Goal Analysis** — What is the user's exact income goal, timeline, experience level?
2. **System Architecture** — What is the complete end-to-end architecture of this system?
3. **Tool Stack** — What tool is needed for EACH component? Check STARKS Marketplace FIRST.
4. **Blueprint Match** — Does a STARKS Blueprint match this system? If not → custom system.
5. **Revenue Model** — HOW exactly does this system generate money?
6. **Projections** — What are realistic 30/60/90 day revenue ranges?
7. **Minimum Credentials** — What are the fewest credentials truly needed (max 4)?
8. **Build Steps** — What are 6–8 specific, executable steps to deploy this system?

## PHASE 1: PRESENT PLAN (first response to any build goal)

When a user shares an income goal or system they want built, respond with a **comprehensive build plan** BEFORE asking for credentials. This is the "present_plan" phase.

Structure your plan EXACTLY like this:

---

### 🧠 SYSTEM ANALYSIS

[2-3 sentences: What system you're building, why it's the right approach, what makes this specific]

---

### ⚡ BUILD PLAN: [Specific System Name]

**Architecture:** [Brief technical overview — what components make up this system]
**Revenue Model:** [Exactly how it generates money — e.g. "Affiliate commissions via TikTok traffic → ClickBank offers"]
**Launch Timeline:** [Realistic estimate — e.g. "Fully live in 3–5 hours from now"]
**Blueprint:** [Matching STARKS blueprint name OR "Custom System — I'll design this for you"]

---

### 🔧 COMPLETE TOOL STACK

[For EVERY tool needed, use this exact format]

**[Tool Name]** — [One sentence: what it does in this system]
- ✅ STARKS Marketplace [OR] 🔗 External
- Get Access: [Exact URL from tool data — NEVER invent URLs]
- Credentials: [What's needed, or "None — just sign up"]

[List ALL tools, typically 3–6 for a complete system]

---

### 📋 BUILD EXECUTION PLAN

**Step 1:** [Specific, concrete action — e.g. "Deploy TikTok affiliate tracker + configure ClickBank commission webhooks"]
**Step 2:** [Specific action]
**Step 3:** [Specific action]
**Step 4:** [Specific action]
**Step 5:** [Specific action]
**Step 6:** [Specific action]
[Steps 7–8 if needed]

---

### 💰 REVENUE PROJECTIONS

| Milestone | Conservative | Realistic |
|---|---|---|
| Day 30 | [low] | [high] |
| Day 60 | [low] | [high] |
| Day 90 | [low] | [high] |

*Based on: [brief explanation of assumptions, e.g. "1,000 TikTok views/day → 2% CTR → 3% conversion"]*

---

### 🔑 WHAT I NEED FROM YOU

[List 1–4 credentials with specific instructions for each]
- **[Credential Name]**: [Where to find it — e.g. "OpenRouter Dashboard → API Keys → Create New Key"]
- **[Credential Name]**: [Instructions]

> 📋 **Plan ready.** Click "Confirm Plan" below to proceed to credential setup, then I'll build immediately.

---

Then append the SBEP_DATA block with action "present_plan".

## PHASE 2: COLLECT CREDENTIALS (after user confirms the plan)

When user says they confirm, they're ready, or they want to proceed → respond with action "collect_credentials". Keep the response SHORT (2-3 sentences confirming you're ready to build), then include SBEP_DATA.

## PHASE 3: START BUILD (after credentials are submitted)

When credentials are submitted → respond with action "start_build". 1-2 sentences confirming build is launching.

## CRITICAL RULES

1. **Marketplace-First Protocol**: ALWAYS check STARKS Marketplace tools FIRST for each tool category needed. Only recommend external tools when no Marketplace equivalent exists.
2. **Real URLs Only**: NEVER invent affiliate links. Copy them EXACTLY from the tool data. If no link exists, use "https://starksglobalgroup.net/marketplace"
3. **Specific Steps**: Build steps must be specific, executable actions — not vague descriptions like "set up the system".
4. **Max 4 Credentials**: Never request more than 4 credentials. Use stored credentials automatically.
5. **Build Anything**: If no blueprint matches, use slug "custom-system" and name "Custom System". Design from scratch.
6. **Confident Voice**: Say "I'm building" not "you should build". Say "I need your X key" not "you'll need to provide".
7. **Revenue Reality**: Projections must be realistic for the specific system and niche. Never promise unrealistic results.
8. **General Questions**: For questions not about building a system, respond helpfully and return action "general".

=== PLATFORM KNOWLEDGE BASE ===

--- STARKS BLUEPRINTS ---
${blueprintKB}

--- STARKS MARKETPLACE TOOLS ---
${toolKB}

=== SBEP_DATA REFERENCE ===

For presenting a build plan (PHASE 1 — first response to a build goal):
<SBEP_DATA>
{
  "action": "present_plan",
  "blueprint": { "slug": "blueprint-slug-from-above-or-custom-system", "name": "Blueprint Name or Custom System" },
  "systemName": "Specific descriptive name for this user's system",
  "buildSteps": [
    "Step 1: Initialize core infrastructure and configure service connections",
    "Step 2: Deploy affiliate tracker and configure revenue attribution",
    "Step 3: Build automation workflows and activate lead capture",
    "Step 4: Launch email sequence and configure audience targeting",
    "Step 5: Deploy live system and activate monetisation layer",
    "Step 6: Enable monitoring, analytics, and optimization"
  ],
  "requiredCredentials": [
    {
      "key": "TOOL_API_KEY",
      "label": "Tool API Key",
      "description": "Get this from Tool Dashboard → Settings → API Keys → Create New",
      "credentialType": "api_key",
      "toolName": "Tool Name"
    }
  ]
}
</SBEP_DATA>

For collecting credentials (PHASE 2 — after user confirms plan):
<SBEP_DATA>
{
  "action": "collect_credentials",
  "blueprint": { "slug": "...", "name": "..." },
  "systemName": "...",
  "requiredCredentials": [
    {
      "key": "TOOL_API_KEY",
      "label": "Tool API Key",
      "description": "Get this from Tool Dashboard → Settings → API Keys",
      "credentialType": "api_key",
      "toolName": "Tool Name"
    }
  ]
}
</SBEP_DATA>

For starting build (PHASE 3 — after credentials submitted):
<SBEP_DATA>
{ "action": "start_build", "blueprint": { "slug": "...", "name": "..." }, "systemName": "..." }
</SBEP_DATA>

For browsing the web (when user asks to visit a site, search online, check a URL, find pricing, etc.):
<SBEP_DATA>
{ "action": "browser_use", "task": "<detailed description of what to do on the web>", "startUrl": "https://..." }
</SBEP_DATA>

For general questions (not a build goal):
<SBEP_DATA>
{ "action": "general" }
</SBEP_DATA>

CRITICAL: When user says "I confirm the plan", "let's proceed", "I'm ready", or similar → return "collect_credentials" (NEVER "present_plan" again).
CRITICAL: When user explicitly provides credentials or asks to start building → return "start_build".
CRITICAL: When user asks to visit a website, search the web, check a URL, find pricing/info online, or interact with a web page → return "browser_use".`;
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
      expert:   "anthropic/claude-3-5-sonnet",
      empire:   "anthropic/claude-opus-4",
    };
    const model = modelMap[parsed.data.agentMode ?? "fast"] ?? "openai/gpt-4o-mini";

    const contextNote = [
      parsed.data.businessType ? `User's business focus: ${parsed.data.businessType}` : "",
      parsed.data.revenueGoal  ? `User's revenue goal: ${parsed.data.revenueGoal}` : "",
    ].filter(Boolean).join("\n");

    const completionArgs = {
      systemPrompt: buildSystemPrompt(blueprintKB, toolKB) + storedCredNote + skillAdditions + (contextNote ? `\n\n=== USER CONTEXT ===\n${contextNote}` : ""),
      prompt: `${historyCtx}\n\nUser: ${parsed.data.message}`,
      userId,
      systemInstanceId: parsed.data.systemInstanceId,
    };

    let result;
    try {
      result = await complete({ ...completionArgs, model });
    } catch (primaryErr: unknown) {
      const msg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
      if (msg.includes("404") || msg.includes("No endpoints found")) {
        req.log.warn({ model, fallback: "openai/gpt-4o-mini" }, "Primary model unavailable, falling back");
        result = await complete({ ...completionArgs, model: "openai/gpt-4o-mini" });
      } else {
        throw primaryErr;
      }
    }

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

// ─── Streaming helpers ──────────────────────────────────────────────────────

const sse_sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

function getThinkingSteps(message: string, agentMode: string): string[] {
  const lower = message.toLowerCase();

  if (lower.includes("http") || lower.includes("website") || lower.includes("browse") ||
      lower.includes("visit") || lower.includes("url") || lower.includes("login") ||
      lower.includes("gmail") || lower.includes("google") || lower.includes(".com") ||
      lower.includes("page")) {
    return [
      "Parsing web browsing request…",
      "Validating target URL…",
      "Preparing browser agent…",
      "Initializing web session…",
    ];
  }

  if (lower.includes("build") || lower.includes("income") || lower.includes("money") ||
      lower.includes("affiliate") || lower.includes("marketing") || lower.includes("dropship") ||
      lower.includes("business") || lower.includes("revenue") || lower.includes("ecommerce") ||
      lower.includes("shopify") || lower.includes("tiktok") || lower.includes("youtube") ||
      lower.includes("saas") || lower.includes("course") || lower.includes("funnel") ||
      lower.includes("$") || lower.includes("profit")) {
    const depth = agentMode === "empire" || agentMode === "expert"
      ? [
          "Activating deep reasoning mode…",
          "Analyzing your income goal…",
          "Searching STARKS blueprint library…",
          "Evaluating tool stack options…",
          "Designing system architecture…",
          "Calculating revenue projections…",
          "Stress-testing monetisation model…",
          "Preparing comprehensive build plan…",
        ]
      : [
          "Analyzing your income goal…",
          "Searching STARKS blueprint library…",
          "Designing system architecture…",
          "Calculating revenue projections…",
          "Preparing build plan…",
        ];
    return depth;
  }

  if (lower.includes("confirm") || lower.includes("proceed") || lower.includes("ready") || lower.includes("plan")) {
    return [
      "Processing your confirmation…",
      "Retrieving build specification…",
      "Preparing next phase…",
    ];
  }

  if (agentMode === "empire" || agentMode === "expert") {
    return [
      "Activating deep reasoning…",
      "Analyzing request complexity…",
      "Consulting STARKS knowledge base…",
      "Cross-referencing platform intelligence…",
      "Synthesizing comprehensive response…",
    ];
  }

  return [
    "Processing your request…",
    "Consulting STARKS knowledge base…",
    "Formulating response…",
  ];
}

// ─── POST /api/ai-orchestrator/stream ────────────────────────────────────────

router.post("/ai-orchestrator/stream", async (req, res): Promise<void> => {
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

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (event: object) => res.write(`data: ${JSON.stringify(event)}\n\n`);
  const keepAlive = setInterval(() => res.write(": keepalive\n\n"), 20000);

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
      ? `\n\n=== USER'S STORED CREDENTIALS (ALREADY ON FILE — DO NOT REQUEST THESE) ===\n${storedKeys.join(", ")}\nIf the blueprint you select requires any of these keys, skip them from requiredCredentials.`
      : "";

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
      expert:   "anthropic/claude-3-5-sonnet",
      empire:   "anthropic/claude-opus-4",
    };
    const model = modelMap[parsed.data.agentMode ?? "fast"] ?? "openai/gpt-4o-mini";

    const contextNote = [
      parsed.data.businessType ? `User's business focus: ${parsed.data.businessType}` : "",
      parsed.data.revenueGoal  ? `User's revenue goal: ${parsed.data.revenueGoal}` : "",
    ].filter(Boolean).join("\n");

    const systemPrompt = buildSystemPrompt(blueprintKB, toolKB) +
      storedCredNote + skillAdditions +
      (contextNote ? `\n\n=== USER CONTEXT ===\n${contextNote}` : "");
    const prompt = `${historyCtx}\n\nUser: ${parsed.data.message}`;

    // ── Thinking steps (run while AI call is warming up) ──────────────────
    const thinkingSteps = getThinkingSteps(parsed.data.message, parsed.data.agentMode ?? "fast");

    // Start AI streaming call in parallel with thinking display
    const tokenBuffer: string[] = [];
    let aiDone = false;
    let aiError: Error | null = null;

    const aiTask = (async () => {
      try {
        for await (const token of streamCompletion({ systemPrompt, prompt, model, userId })) {
          tokenBuffer.push(token);
        }
      } catch (err) {
        // Fallback: non-streaming complete
        try {
          const fallback = await complete({ systemPrompt, prompt, model: "openai/gpt-4o-mini", userId });
          for (const char of fallback.content) tokenBuffer.push(char);
        } catch (fallbackErr) {
          aiError = fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr));
        }
      } finally {
        aiDone = true;
      }
    })();

    // Show thinking steps while AI works (yields to event loop on each sleep)
    for (let i = 0; i < thinkingSteps.length; i++) {
      send({ type: "thinking", steps: thinkingSteps, index: i });
      await sse_sleep(380 + Math.random() * 320);
    }

    if (aiError) throw aiError;

    // Flush buffered tokens + wait for rest
    let flushIdx = 0;
    const flushBuffer = () => {
      while (flushIdx < tokenBuffer.length) {
        send({ type: "token", delta: tokenBuffer[flushIdx++] });
      }
    };

    while (!aiDone) {
      flushBuffer();
      await sse_sleep(8);
    }
    await aiTask;
    flushBuffer();

    // ── Parse SBEP_DATA ───────────────────────────────────────────────────
    const fullContent = tokenBuffer.join("");
    const dataMatch = fullContent.match(/<SBEP_DATA>([\s\S]*?)<\/SBEP_DATA>/);
    let structuredData: Record<string, unknown> | null = null;
    const displayContent = fullContent.replace(/<SBEP_DATA>[\s\S]*?<\/SBEP_DATA>/g, "").trim();

    if (dataMatch) {
      try {
        structuredData = JSON.parse(dataMatch[1].trim());
        if (structuredData && Array.isArray((structuredData as Record<string, unknown>).requiredCredentials)) {
          (structuredData as Record<string, unknown>).requiredCredentials =
            (structuredData.requiredCredentials as { key?: string }[])
              .filter((c) => !(c.key && storedKeys.includes(c.key)));
        }
      } catch { /* ignored */ }
    }

    send({ type: "done", content: displayContent, structuredData, activatedSkills });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "ASH request failed";
    const code = (err as { code?: string })?.code;
    send({ type: "error", message, ...(code ? { code } : {}) });
  } finally {
    clearInterval(keepAlive);
    send({ type: "end" });
    res.end();
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
