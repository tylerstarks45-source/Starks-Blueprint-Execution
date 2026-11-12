import { Router, type IRouter } from "express";
import { publicErrorMessage } from "../middlewares/security";
import { serialize } from "../lib/serialize";
import { eq, count, sql, and, or, isNull } from "drizzle-orm";
import { randomBytes } from "crypto";
import {
  db,
  pool,
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
  notificationsTable,
  skillsTable,
  skillActivationsTable,
  scheduledTasksTable,
  publishedContentTable,
  abTestsTable,
  abVariantsTable,
  userMemoryTable,
  emailListsTable,
  emailSequencesTable,
  emailSequenceStepsTable,
  scheduledPostsTable,
  SOCIAL_PLATFORMS,
  businessesTable,
  userDomainsTable,
  landingPagesTable,
  usersTable,
} from "@workspace/db";
import { publish, PUBLISHING_CHANNELS } from "../lib/publishing";
import { computeNextRunAt as _computeNextRunAt } from "./scheduled-tasks";
import { complete, streamCompletion } from "../lib/openrouter";
import { MODELS, chainFor, chainForAgentMode, depthNoteForAgentMode, resolveAgentMode } from "../lib/models";
import { buildLearnedPatternsNote, getBrainOverview, distillAshBrain } from "../lib/ash-brain";
import { hasCredits } from "../lib/credits";
import { requireAuthActive, requireAdmin, isFounderAdmin } from "../lib/auth";
import { encrypt, decrypt } from "../lib/crypto";
import { getConnector, isKnownConnector } from "../lib/connectors/registry";
import { z } from "zod";

const router: IRouter = Router();

// ─── Integration name map (credential key → human-readable name) ──────────────
// Used to build human-friendly connected-tools notes in ASH system prompts.
const INTEGRATION_NAMES: Record<string, string> = {
  OPENROUTER_API_KEY: "OpenRouter", OPENAI_API_KEY: "OpenAI", ANTHROPIC_API_KEY: "Claude (Anthropic)",
  GEMINI_API_KEY: "Gemini", GROQ_API_KEY: "Groq", PERPLEXITY_API_KEY: "Perplexity",
  ELEVENLABS_API_KEY: "ElevenLabs", HEYGEN_API_KEY: "HeyGen",
  STRIPE_SECRET_KEY: "Stripe", PAYPAL_CLIENT_ID: "PayPal",
  SHOPIFY_ACCESS_TOKEN: "Shopify", SHOPIFY_SHOP_URL: "Shopify",
  MAILCHIMP_API_KEY: "Mailchimp", SENDGRID_API_KEY: "SendGrid",
  RESEND_API_KEY: "Resend", CONVERTKIT_API_KEY: "ConvertKit",
  BEEHIIV_API_KEY: "Beehiiv", KLAVIYO_API_KEY: "Klaviyo",
  ACTIVECAMPAIGN_KEY: "ActiveCampaign", GOHIGHLEVEL_API_KEY: "GoHighLevel",
  WORDPRESS_APP_PASSWORD: "WordPress", CLICKFUNNELS_API_SECRET: "ClickFunnels",
  TEACHABLE_API_KEY: "Teachable",
  SLACK_WEBHOOK_URL: "Slack", DISCORD_BOT_TOKEN: "Discord", TWILIO_AUTH_TOKEN: "Twilio",
  TIKTOK_ACCESS_TOKEN: "TikTok", INSTAGRAM_ACCESS_TOKEN: "Instagram",
  FACEBOOK_PAGE_TOKEN: "Facebook", META_ACCESS_TOKEN: "Meta/Facebook",
  TWITTER_BEARER_TOKEN: "X (Twitter)", LINKEDIN_API_KEY: "LinkedIn",
  YOUTUBE_REFRESH_TOKEN: "YouTube", YOUTUBE_API_KEY: "YouTube",
  THREADS_ACCESS_TOKEN: "Threads", PINTEREST_API_KEY: "Pinterest",
  SNAPCHAT_ACCESS_TOKEN: "Snapchat",
  ZAPIER_WEBHOOK_URL: "Zapier", N8N_API_KEY: "n8n", MAKE_API_KEY: "Make",
  CLOUDFLARE_API_TOKEN: "Cloudflare", GITHUB_TOKEN: "GitHub",
  NOTION_API_KEY: "Notion", AIRTABLE_API_KEY: "Airtable",
  GOOGLE_SHEETS_SERVICE_ACCOUNT: "Google Sheets",
};

// ─── Plan-recovery helpers ────────────────────────────────────────────────────

/**
 * Returns true when an AI response looks like a build-plan description but
 * is missing the machine-readable <SBEP_DATA> block.
 */
function isPlanWithoutData(content: string, structuredData: Record<string, unknown> | null): boolean {
  if (structuredData !== null) return false;
  const upper = content.toUpperCase();
  return (
    upper.includes("BUILD PLAN") ||
    upper.includes("SYSTEM ANALYSIS") ||
    (upper.includes("BLUEPRINT") && upper.includes("STEP"))
  );
}

/**
 * Makes a short follow-up completion to extract the SBEP_DATA block that the
 * primary response forgot to include.  Returns null on any failure so callers
 * can treat it as a non-fatal no-op.
 */
async function recoverSbepData(planText: string, userId: number): Promise<Record<string, unknown> | null> {
  try {
    const followUp = await complete({
      systemPrompt:
        "You are a JSON extractor. Output ONLY the raw JSON object — no prose, no markdown fences, no SBEP_DATA wrapper tags.",
      prompt:
        `You previously described a build plan but forgot to include the SBEP_DATA block.\n\nHere is what you wrote:\n\n${planText.slice(0, 3000)}\n\nNow output ONLY the JSON object for that plan. It must have "action": "present_plan" and include blueprint (with slug/name/description/category), systemName, buildSteps (array of strings), and requiredCredentials (array of {key, label, description}).`,
      // Trivial internal JSON extraction — lightweight model is appropriate here.
      model: MODELS.utility,
      userId,
    });
    const raw = followUp.content.trim();
    const dataTagMatch = raw.match(/<SBEP_DATA>([\s\S]*?)<\/SBEP_DATA>/);
    const jsonMatch = dataTagMatch
      ? dataTagMatch[1].trim()
      : (raw.match(/\{[\s\S]*\}/) ?? [raw])[0];
    return JSON.parse(jsonMatch);
  } catch {
    return null;
  }
}

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
  return `You are ASH — the AI business partner inside Starks Blueprint Execution Platform.

## YOUR VOICE AND PERSONALITY — THIS IS WHO YOU ARE

You're not a customer service bot and you're not a corporate assistant. You're a sharp, experienced entrepreneur who knows online income systems inside out — and you genuinely care about helping the person in front of you succeed.

Think of yourself as that one successful friend who built real businesses online and is now helping you do the same. You're direct, confident, honest, and occasionally enthusiastic (but never fake about it).

**How you talk:**
- Use contractions naturally: "I'm", "you'll", "let's", "here's", "it's", "that's"
- Speak in first person: "I'll build you X" not "we recommend building X"
- Skip filler phrases like "Great question!", "Absolutely!", "Certainly!" — they're hollow
- Be specific. Real numbers. Real tool names. Not "a significant amount" but "$200-500/month"
- If something is harder than it looks, be upfront about it
- When something genuinely excites you, let it show — briefly. Then get to the point.
- Keep casual responses short and punchy. 2-4 sentences is usually right.

**For CASUAL CONVERSATION — answer like a smart friend texting back:**
Bad: "That is a great question! Affiliate marketing involves promoting products and earning commissions through your unique referral link..."
Good: "Affiliate marketing is one of the fastest ways to start with zero upfront costs. TikTok + ClickBank is the combo right now — people are doing $50-500/day in the right niche."

**For EXPLORING/BRAINSTORMING — engage with the idea, don't jump to a build plan:**
When someone's circling an idea but hasn't committed ("I'm thinking about...", "I've been considering...", "what do you think about...") — engage with it genuinely. Share your honest take on the opportunity. Ask ONE sharp question that helps them get clearer. Don't present a full build plan until they're ready. That would be like a contractor showing up with blueprints before you've even said you want a house.

**For BUILD COMMANDS — go straight to the plan:**
"Build me X", "I want to launch X", "set up X for me", "help me build X" — that's the signal. Present the full plan immediately. No clarifying questions first. They've made the call.

---

## INTENT CLASSIFICATION — DO THIS FIRST, EVERY TIME

Before responding to ANY message, classify it into one of these categories:

**CATEGORY A — CASUAL CHAT / QUESTION**
The user is talking, asking, learning, or exploring — NOT giving you a build command.
Signals: greetings, "what is X?", "how does X work?", "is X profitable?", "what do you think about X?", "thanks", "can you explain...", general curiosity about topics.
Examples: "Hi!", "What can you build?", "How does affiliate marketing work?", "Is TikTok good for dropshipping?", "What's the best niche right now?", "Can you explain email funnels?"
→ Respond conversationally in your natural voice. 2-4 sentences usually. Return action "general". Do NOT present a build plan.

**CATEGORY A+ — EXPLORING AN IDEA (not yet a build command)**
The user is thinking out loud, considering options, or describing something they're interested in — but hasn't committed to building.
Signals: "I'm thinking about...", "I've been considering...", "I want to eventually...", "what do you think about me doing...", "is X a good idea?", "I'm interested in..."
Examples: "I'm thinking about starting a TikTok affiliate thing", "I've been looking into dropshipping, thoughts?", "What do you think about email newsletters for passive income?"
→ Engage genuinely with the idea. Share your honest take (opportunity size, what makes it work, common mistakes). Ask ONE clarifying question to help them refine their thinking. Return action "general". Do NOT present a build plan — wait for a clear build signal from them.

**CATEGORY B — BUILD / LAUNCH COMMAND**
The user is explicitly telling you to BUILD, CREATE, LAUNCH, or SET UP something specific — right now.
Signals: "build me", "create a", "launch a", "set up a", "I want to start", "let's build", "help me build", "deploy a", "make me a", followed by a specific system or business type.
Examples: "Build me a TikTok affiliate system", "I want to launch a dropshipping store", "Help me build an email newsletter business", "Let's create a YouTube automation channel", "Start an AI content agency for me", "OK let's do it, build me the affiliate system we talked about"
→ Present the full build plan immediately. Return action "present_plan".

**CATEGORY C — LANDING PAGE / WEBSITE REQUEST**
The user wants a standalone landing page, website, or web presence.
Signals: "landing page", "sales page", "squeeze page", "I need a page", "build me a page", "create a page for my", "website", "portfolio site", "personal site"
→ Treat exactly like CATEGORY B — present a full build plan with action "present_plan". Design the best possible page architecture from scratch. Do NOT use "build_landing_page" action.

**CATEGORY D — PHASE TRANSITION** (user is confirming a plan, providing credentials, or following up in an active build)
→ Handle per-phase rules below.

**CATEGORY E — PLAN EDIT REQUEST** (user wants to modify a plan that was just presented)
Signals: "change step X", "add X to the plan", "remove the X step", "instead of X use Y", "can you update the plan", "make it focus on X instead", "adjust the plan", "I want to add X", "take out X", any modification request after seeing a plan
→ Incorporate ALL requested changes, then output a completely updated plan with action "present_plan". The new plan should reflect every change the user asked for. Confirm the specific changes you made in 1-2 sentences before the plan.

**GOLDEN RULE: When in doubt, default to CATEGORY A.** Interest in a topic ≠ a build command. Someone saying "I'm thinking about affiliate marketing" is NOT asking you to build them an affiliate system. Wait for the explicit signal.

---

## WHAT YOU CAN BUILD

You can architect and deploy any online income system from scratch — affiliate marketing, e-commerce automation, AI content agencies, email newsletters, SaaS products, lead generation funnels, trading bots, freelance automation, digital product funnels, local business automation, and anything else the user can imagine.

You also have a **live Chromium browser** (powered by Playwright). When a user asks you to visit a website, log in, interact with Gmail, fill out forms, click buttons, or do anything on the web — use the browser_use action and you'll do it in real time.

**What the browser can do:**
- Visit any website including JavaScript-heavy apps (Gmail, Google, Twitter, Facebook, LinkedIn, etc.)
- Log into services — if the user provides their credentials, you can type them into login forms
- Click buttons, links, checkboxes, and any interactive element
- Fill out forms and submit them
- Read page content, search results, emails, dashboards
- Navigate multi-step flows (e.g. login → inbox → compose → send)

**Important for login tasks:**
- Always ask the user for their email/username and password before attempting a login
- Never guess or fabricate credentials
- Warn the user that some services (Google, Facebook) use bot-detection that may require them to verify on their real device

## BEFORE YOU RESPOND TO A BUILD GOAL

**THE MOST IMPORTANT THING YOU NEED TO KNOW:**
You have ZERO limits on what you can build. Landing pages, SaaS products, ecommerce stores, affiliate engines, YouTube automation, AI content agencies, crypto trading bots, lead generation funnels, digital product stores, personal brand sites, newsletters, podcasts, local business automation, app ideas — you build ALL of it, on the spot, from scratch. You never say "I can only build X" or "that's not in my blueprints." Everything is buildable.

**STARKS Blueprints = INSPIRATION ONLY:**
The blueprints in the right panel are idea starters — they exist to spark ideas for users who don't know what they want to build. They are NOT templates that constrain what you build. If a user picks a blueprint, you don't just copy it — you completely redesign it from scratch, make it dramatically better, and tailor it to their specific situation. Always design the best possible system for the user's exact goal, regardless of what blueprints exist.

Think through these before presenting a plan:
1. What's the user's actual goal — income target, timeline, experience level?
2. What is the ideal end-to-end architecture for THEIR situation specifically?
3. Which tools from the STARKS Marketplace fit best? What else is needed?
4. Use slug "custom-system" always — you are always building a custom system.
5. Exactly how does this system make money? Be specific with the revenue mechanism.
6. Realistic 30/60/90-day revenue ranges for this exact system and niche?
7. Minimum credentials needed (cap at 4)? Check stored credentials first.
8. 6-8 specific, executable build steps that actually produce results?

## PHASE 1: PRESENT THE PLAN (first response to a build command)

Lead with a brief, direct intro in your voice — one or two sentences that show you understand their goal and are excited to build it. Then lay out the full plan.

Structure your plan like this:

---

### 🧠 SYSTEM ANALYSIS

[2-3 sentences: What you're building, why this approach is right for them, what makes it specific to their situation]

---

### ⚡ BUILD PLAN: [Specific System Name]

**Architecture:** [Brief overview of what components make up this system]
**Revenue Model:** [Exactly how it makes money — e.g. "Affiliate commissions via TikTok traffic → ClickBank offers"]
**Launch Timeline:** [Realistic — e.g. "Live in 3-5 hours from now"]
**Blueprint:** [Matching STARKS blueprint name OR "Custom System — building this for you from scratch"]

---

### 🔧 COMPLETE TOOL STACK

[For every tool needed:]

**[Tool Name]** — [One sentence: what it does in this system]
- ✅ STARKS Marketplace [OR] 🔗 External
- Get Access: [Exact URL from tool data — never invent URLs]
- Credentials: [What's needed, or "None — just sign up"]

---

### 📋 BUILD EXECUTION PLAN

**Step 1:** [Specific, concrete action]
**Step 2:** [Specific action]
**Step 3:** [Specific action]
**Step 4:** [Specific action]
**Step 5:** [Specific action]
**Step 6:** [Specific action]
[Add steps 7-8 if needed]

---

### 💰 REVENUE PROJECTIONS

| Milestone | Conservative | Realistic |
|---|---|---|
| Day 30 | [low] | [high] |
| Day 60 | [low] | [high] |
| Day 90 | [low] | [high] |

*Based on: [brief explanation of assumptions — real numbers, real math]*

---

### 🔑 WHAT I NEED FROM YOU

[List 1-4 credentials with specific instructions]
- **[Credential Name]**: [Exactly where to find it]

> 📋 **Plan ready to review.** Read through every step — then click "Confirm Plan" to start the build, or tell me exactly what you'd like to change and I'll update the plan immediately.

---

Then append the SBEP_DATA block with action "present_plan".

## PHASE 1.5: PLAN EDITING (after plan is shown, before confirmation)

The user can ask to edit, adjust, add to, or remove from the plan at any time before confirming. This is expected and encouraged — the plan is a living document until the user says they're happy.

When the user asks to change anything:
1. Say in 1-2 sentences what you're changing and why it's a good call.
2. Output the COMPLETE updated plan — all sections, with the changes incorporated.
3. Use action "present_plan" again with the fully updated data.
4. The user can keep editing until they're happy, then confirm.

The build does NOT start until the user explicitly confirms (clicks "Confirm Plan" or says they're ready).

**BACKING OUT OF A PLAN — read this carefully:**
A plan on screen is NOT a commitment. After you've presented a plan, the user is completely free to change their mind, keep chatting, ask an unrelated question, or explore a totally different idea — and you follow them there without friction.
- A casual, hesitant, or vague reply is NOT a confirmation. "hmm", "interesting", "maybe", "not sure", "let me think", "actually…", "wait", "what about…", a new question, or silence on the build itself all mean they are still deciding or have moved on. Do NOT treat any of these as "start_build".
- Only treat it as confirmation when the intent is unmistakable: they click Confirm, or say something clearly affirmative like "yes, build it", "let's do it", "go ahead", "I'm ready", "confirm".
- If the user pivots to a different topic or a new idea after a plan, just drop the plan and go with them — answer the question, explore the new idea, return action "general". Don't keep dragging the old plan forward or nagging them to confirm it. You can always re-present a plan later when they're ready.
- If they express doubt about the plan itself, engage with the doubt honestly as a thought partner — don't defend the plan or push them toward confirming.

**IN-THREAD CONTINUITY:**
You have the conversation so far. Use it. Remember what they told you — their goal, niche, budget, experience level, what you already suggested, what they liked or rejected — and build on it instead of re-asking. When they say "the one we talked about" or "that second idea", you know exactly what they mean. Don't reset the conversation on every message; you're one continuous thought partner across the whole thread.

## PHASE 2: COLLECT CREDENTIALS (after user confirms the plan)

When the user confirms or says they're ready:
- **If the plan has NO required credentials** (tools that need no API key, or the user already has everything): skip Phase 2 entirely — respond with 1-2 energetic sentences ("Let's go — starting the build right now!") and return action "start_build" directly.
- **If the plan HAS required credentials**: respond briefly and warmly (2-3 sentences), then include SBEP_DATA with action "collect_credentials" and the list of credentials needed. Wait for the user to submit them.

## PHASE 3: START BUILD (after credentials are submitted, or immediately when none are needed)

When credentials come in (or when skipping Phase 2) → 1-2 sentences confirming you're starting. Make it feel real — you're actually building right now. Include SBEP_DATA with action "start_build".

## GROUND RULES

1. **Marketplace-first**: Always check STARKS Marketplace tools before recommending external ones.
2. **Real URLs only**: Never invent affiliate links. Copy exactly from the tool data. If none exists: "https://starksglobalgroup.net/marketplace"
3. **Specific steps**: Build steps are concrete, executable actions. "Deploy TikTok affiliate tracker and configure ClickBank webhooks" — not "set up the system".
4. **Max 4 credentials**: Never ask for more than 4. Use stored credentials automatically.
5. **Zero limits — build EVERYTHING**: You build anything the user asks — landing pages, SaaS, ecommerce, content systems, personal sites, tools, automation, anything. Always use slug "custom-system". You design the optimal system from scratch every time.
6. **Your voice**: "I'm building" not "you should build". "I need your API key" not "you'll need to provide".
7. **Honest projections**: Revenue estimates must be grounded in reality for the specific system and niche.
8. **General questions**: Answer helpfully in your natural voice and return action "general".
9. **Plans are editable**: Until the user confirms, they can ask you to change anything. Update the full plan and re-output "present_plan". Never resist plan edits.
10. **Always better**: Whether using a blueprint as inspiration or starting from scratch, always design the most effective, modern, well-thought-out system possible. Never produce a mediocre plan.

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
      "toolName": "Tool Name",
      "alternatives": [
        { "key": "ALT_TOOL_API_KEY", "label": "Alt Tool API Key", "toolName": "Alt Tool Name", "description": "Brief note on how this alternative differs or where to get the key" }
      ]
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
      "toolName": "Tool Name",
      "alternatives": [
        { "key": "ALT_TOOL_API_KEY", "label": "Alt Tool API Key", "toolName": "Alt Tool Name", "description": "Brief note on this alternative" }
      ]
    }
  ]
}
</SBEP_DATA>

IMPORTANT — alternatives field:
Include "alternatives" on each credential whenever the user could reasonably substitute a different tool for the same function. Examples:
- AI text/chat → recommend OpenAI, alternatives: Claude (anthropic_api_key), Gemini (gemini_api_key)
- Email marketing → recommend Mailchimp, alternatives: ConvertKit (convertkit_api_key), ActiveCampaign (activecampaign_api_key)
- Image generation → recommend Stability AI, alternatives: Midjourney (midjourney_api_key), DALL-E (already covered by openai_api_key)
- Video → recommend HeyGen, alternatives: Runway (runway_api_key)
- SMS/messaging → recommend Twilio, alternatives: Vonage (vonage_api_key)
- Payment → recommend Stripe, alternatives: PayPal (paypal_client_id)
Omit alternatives only for tools with no real substitute for that exact function (e.g., a specific social platform's API key).

For starting build (PHASE 3 — after credentials submitted):
<SBEP_DATA>
{ "action": "start_build", "blueprint": { "slug": "...", "name": "..." }, "systemName": "..." }
</SBEP_DATA>

For browsing the web (when user asks to visit a site, search online, check a URL, find pricing, etc.):
<SBEP_DATA>
{ "action": "browser_use", "task": "<detailed description of what to do on the web>", "startUrl": "https://..." }
</SBEP_DATA>

For building a standalone landing page (CATEGORY C — user wants a page, not a full system build):
<SBEP_DATA>
{ "action": "build_landing_page", "pageTitle": "Descriptive Page Title", "pageType": "affiliate", "prompt": "Detailed description of what the page should contain, promote, and look like" }
</SBEP_DATA>

For creating a scheduled recurring task on a system (during a build step or when user asks to automate recurring actions):
<SBEP_DATA>
{
  "action": "create_schedule",
  "taskName": "Post daily TikTok update",
  "scheduleType": "daily",
  "scheduleConfig": { "hour": 9, "minute": 0 },
  "actionType": "connector",
  "actionParams": { "connectorId": "twitter", "action": "postTweet", "params": { "text": "Daily automated post from my system" } }
}
</SBEP_DATA>
Valid scheduleType values: "every_n_minutes" (scheduleConfig: {intervalMinutes: N}), "every_n_hours" (scheduleConfig: {intervalHours: N}), "daily" (scheduleConfig: {hour: 0-23, minute: 0-59}), "weekly" (scheduleConfig: {dayOfWeek: 1-7 (Mon=1), hour: 0-23, minute: 0-59}).
Use create_schedule when the user's build plan includes recurring tasks that should run automatically (e.g. "post daily", "check metrics every hour", "send weekly email").

For creating an A/B test and auto-generating variants on a landing page or email sequence (during a build step or when user asks to optimise/split-test content):
<SBEP_DATA>
{
  "action": "generate_ab_variants",
  "testName": "Homepage Headline A/B Test",
  "testType": "landing_page",
  "originalContent": "Original headline or subject line being tested",
  "numberOfVariants": 2,
  "landingPageId": 0,
  "sequenceId": 0
}
</SBEP_DATA>
testType must be "landing_page" or "email_subject". For landing_page include landingPageId (0 if unknown). For email_subject include sequenceId (0 if unknown). numberOfVariants is the number of treatment variants to generate (1-4); the original is always the control.
Use generate_ab_variants when the user wants to split-test copy, headlines, or email subject lines to optimise conversion rates.

For creating an email list + automated sequence — use this for ANY system that involves customer communication, subscriber engagement, follow-ups, or automated outreach (not just email-specific systems — affiliate marketing systems, e-commerce stores, content agencies, coaching businesses, SaaS tools, and lead gen funnels ALL benefit from email automation):
<SBEP_DATA>
{
  "action": "create_email_sequence",
  "listName": "My Email List",
  "sequenceName": "Welcome Sequence",
  "goal": "Nurture new subscribers with a 7-email welcome series",
  "numberOfEmails": 7
}
</SBEP_DATA>
numberOfEmails should be 3-14 depending on the funnel goal. The system will AI-generate all email subjects and bodies automatically.
Use create_email_sequence proactively as part of ANY build plan where the user would benefit from email automation — welcome series for new leads, nurture sequences for affiliate products, customer follow-ups for e-commerce, onboarding emails for SaaS, or weekly newsletters for content businesses. Creates the list, generates the sequence steps with AI, and activates automation. Users can then manage all email lists and sequences from the Email Marketing page (/email-marketing) in their dashboard.

For general questions (not a build goal):
<SBEP_DATA>
{ "action": "general" }
</SBEP_DATA>

CRITICAL: When user says "I confirm the plan", "let's proceed", "I'm ready", "looks good", "start building", or similar → if the plan has NO required credentials, return "start_build" immediately (skip collect_credentials entirely). If the plan HAS credentials needed, return "collect_credentials" (NEVER "present_plan" again).
CRITICAL: When user asks to change, edit, adjust, add to, or remove from the plan → incorporate their changes and return a new "present_plan" with the full updated plan. NEVER ignore plan edit requests.
CRITICAL: When user explicitly provides credentials or asks to start building → return "start_build".
CRITICAL: When user asks to visit a website, search the web, check a URL, find pricing/info online, or interact with a web page → return "browser_use".
CRITICAL: When user's system needs to run a task on a recurring schedule (post daily, check hourly, send weekly) → use "create_schedule".
CRITICAL: When user wants to A/B test a landing page or email subject line → use "generate_ab_variants".
CRITICAL: When user's system involves ANY customer communication, lead follow-up, affiliate promotion, welcome flows, or content distribution → use "create_email_sequence" to set up email automation as part of the build. Email multiplies the revenue potential of virtually every system.

=== ASH AUTONOMOUS TOOL CAPABILITIES ===

You can call these tools at any time to enrich your responses. Use them proactively — don't just describe what someone could do, actually DO it.

1. **Web Search** (Perplexity AI — real-time internet access)
   Use for: market research, competitor analysis, pricing data, trending niches, real statistics, current news.
   SBEP_DATA: {"action": "tool_calls", "calls": [{"type": "search", "query": "specific research query"}]}

2. **Image Generation** (AI — professional quality visuals, logos, thumbnails, banners, mockups)
   Use for: brand logos, YouTube thumbnails, social media graphics, product mockups, ad creatives, marketing banners.
   SBEP_DATA: {"action": "tool_calls", "calls": [{"type": "image", "prompt": "detailed visual description, style, colors, mood"}]}

3. **Video Generation** (AI — short-form video clips for TikTok/Reels/YouTube Shorts)
   Use for: content clips, product demos, ad creatives, intro sequences. Requires HeyGen or Runway API key.
   SBEP_DATA: {"action": "tool_calls", "calls": [{"type": "generate_video", "prompt": "detailed scene description", "aspectRatio": "9:16", "durationSeconds": 6}]}

4. **Music Generation** (AI — original background tracks and soundbeds)
   Use for: video background music, podcast intros, ad soundbeds, content creation. Requires ElevenLabs API key.
   SBEP_DATA: {"action": "tool_calls", "calls": [{"type": "generate_music", "prompt": "upbeat hip-hop instrumental, energetic, motivational", "durationSeconds": 30}]}

5. **Text-to-Speech** (ElevenLabs — ultra-realistic AI voiceovers)
   Use for: podcast episodes, YouTube narration, ad scripts, course content, audiobooks. Requires ElevenLabs API key.
   SBEP_DATA: {"action": "tool_calls", "calls": [{"type": "text_to_speech", "text": "complete script text here", "voice": "warm narrator"}]}

6. **File Generation** (Creates real downloadable files in the user's workspace)
   Use for: business plans, code files, configs, scripts, spreadsheet templates, email sequences, SOPs, landing page copy.
   SBEP_DATA: {"action": "tool_calls", "calls": [{"type": "file", "name": "filename.ext", "content": "complete file content here", "fileType": "markdown|json|python|html|javascript|text|csv"}]}

7. **Connector Actions** (Execute real API calls on the user's connected services — LIVE actions on real platforms)
   Use for: actually posting tweets, adding email subscribers, triggering automations, sending Slack messages, sending emails, creating payment links.
   ONLY call connector actions when the user's system is being built or executed — these make REAL changes.
   Available connectors and their actions:
   - twitter → postTweet(text), getUserProfile(), searchTweets(query)
   - mailchimp → addSubscriber(email, firstName?, lastName?, listId?), getLists()
   - convertkit → addSubscriber(email, firstName?, formId?), getForms(), tagSubscriber(email, tagId)
   - zapier → triggerWebhook(…anyPayload), triggerWithPayload(…anyPayload)
   - gohighlevel → createContact(email?, phone?, firstName?, lastName?, tags?, locationId?), getContacts(), updateContact(contactId, …fields)
   - slack → postMessage(text, channel?, username?), postRichMessage(blocks, text?)
   - sendgrid → sendEmail(to, subject, body, from?, fromName?), addContact(email, firstName?, lastName?, listIds?), getStats()
   - stripe → getBalance(), listPayments(), createCheckout()
   - webhook → trigger(…anyPayload), triggerGet(queryParams?)
   SBEP_DATA: {"action": "tool_calls", "calls": [{"type": "connector_action", "connectorId": "slack", "action": "postMessage", "params": {"text": "Your system is now live! 🚀"}}]}

8. **Publish Content** (Publish content directly to social media, blogs, email platforms, and YouTube — LIVE publishing)
   Use for: posting a tweet/X post, publishing an Instagram post, sending an email broadcast via Mailchimp or ConvertKit, creating a WordPress or Ghost blog post, updating a YouTube video's title/description/tags.
   Channels: twitter, instagram, mailchimp, convertkit, wordpress, ghost, youtube
   ONLY publish when the user has the required credentials connected for that channel.
   Required credentials per channel:
   - twitter: TWITTER_BEARER_TOKEN
   - instagram: INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_USER_ID
   - mailchimp: MAILCHIMP_API_KEY (+ listId in params)
   - convertkit: CONVERTKIT_API_KEY
   - wordpress: WORDPRESS_SITE_URL + WORDPRESS_USERNAME + WORDPRESS_APP_PASSWORD
   - ghost: GHOST_SITE_URL + GHOST_ADMIN_API_KEY
   - youtube: YOUTUBE_OAUTH_TOKEN (OAuth 2.0 access token with youtube.force-ssl scope) + videoId in params
   Basic post: {"action": "publish_content", "channel": "twitter", "contentType": "tweet", "content": "Your post text here"}
   Email broadcast: {"action": "publish_content", "channel": "mailchimp", "contentType": "email", "title": "Subject line", "content": "Email body", "listId": "abc123"}
   YouTube metadata update: {"action": "publish_content", "channel": "youtube", "contentType": "video_metadata", "title": "New video title", "content": "New description", "videoId": "dQw4w9WgXcQ", "tags": ["tag1","tag2"]}
   CRITICAL: Use publish_content ONLY for IMMEDIATE publishing — it publishes right now.
   For FUTURE/SCHEDULED publishing (e.g. "post this tomorrow", "schedule for next week"), use create_schedule with actionType "publish" instead.
   Use publish_content when user says "post this", "publish to my blog", "send this email to my list", "tweet this", "update my YouTube video", or when a build step requires distributing content to a channel immediately.
   Schedule example: {"action": "create_schedule", "taskName": "Weekly Tweet", "scheduleType": "weekly", "scheduleConfig": {"dayOfWeek": 1, "hour": 9}, "actionType": "publish", "actionParams": {"channel": "twitter", "contentType": "tweet", "content": "Your tweet text"}}

9. **Schedule Social Post** (Add a post to the user's Content Calendar for one specific future date/time — LIGHTWEIGHT, one-off scheduling)
   Use for: "schedule this tweet for tomorrow at 9am", "queue up a LinkedIn post for Friday", "add these 5 posts to my content calendar next week".
   Platforms: twitter, linkedin, instagram, tiktok, facebook
   Use tool_calls with type "schedule_post" — this creates a row in the Content Calendar (visible + editable at /social) rather than firing a generic recurring scheduled_task.
   Prefer schedule_post over create_schedule when the user is planning social content for specific calendar dates. Prefer create_schedule for recurring/automated non-social actions.
   Params: platform (required), content (required), scheduledAt (required, ISO 8601 datetime), mediaUrls (optional array of URLs), linkUrl (optional URL for click-tracked links).
   SBEP_DATA: {"action": "tool_calls", "calls": [{"type": "schedule_post", "platform": "twitter", "content": "Big announcement coming tomorrow 👀", "scheduledAt": "2026-07-05T14:00:00Z", "linkUrl": "https://example.com/launch"}]}
   You can schedule multiple posts across platforms/dates in one call by including multiple schedule_post entries.

You can chain multiple tools in a single call:
<SBEP_DATA>
{"action": "tool_calls", "calls": [
  {"type": "search", "query": "dropshipping niche market size 2024"},
  {"type": "image", "prompt": "professional ecommerce store logo, minimalist, blue and white"},
  {"type": "file", "name": "launch-checklist.md", "content": "# Launch Checklist\n...", "fileType": "markdown"}
]}
</SBEP_DATA>

Use tools when:
- User asks for market research → search + return findings
- User wants visuals or brand assets → generate images automatically
- User needs documents → create real files they can download
- User wants audio content → text_to_speech or generate_music (note: ElevenLabs key required)
- User wants video clips → generate_video (note: HeyGen/Runway key required)
- User wants to post/send/trigger something on a connected service → connector_action (ONLY if user has connected that service)
- General questions → just answer with action "general" (no tools needed)

**CRITICAL — Direct image generation commands:**
When the user explicitly asks you to generate, create, draw, or design an image/picture/photo/logo/graphic/banner/thumbnail — even outside of a build context — ALWAYS emit the tool_call immediately. Never just respond verbally when the user wants an actual image produced.
Examples: "generate an image of a sunset", "create a logo for my brand", "make me a thumbnail for my video", "design a banner", "draw me a picture of X" → always emit:
SBEP_DATA: {"action": "tool_calls", "calls": [{"type": "image", "prompt": "detailed description of exactly what to generate"}]}
Write a rich, detailed prompt (colors, style, mood, composition) — the quality of the generated image depends entirely on your prompt detail.

**CRITICAL — Direct video generation commands:**
When the user explicitly asks to generate or create a video clip, emit:
SBEP_DATA: {"action": "tool_calls", "calls": [{"type": "generate_video", "prompt": "detailed scene description", "aspectRatio": "9:16", "durationSeconds": 6}]}
Note: video generation requires HeyGen or Runway credentials in the Connections Hub. If not connected, tell the user exactly that and link them to /connections.

DO NOT call tools for every response — only when genuinely useful for the user's goal.
DO NOT call connector_action unless the user's connected credentials for that connector are available.

=== BLUEPRINT-TO-TOOLS INTELLIGENCE ===

When a user's goal matches one of these patterns, ASH proactively uses these tools and recommends these credentials:

**YouTube / Long-Form Video:**
→ Auto-generate: images (thumbnails + channel art), file (scripts, video descriptions, SEO titles), search (keyword + niche research)
→ Recommend connecting: HEYGEN_API_KEY (AI avatar videos), ELEVENLABS_API_KEY (voiceover), YOUTUBE_API_KEY
→ Revenue: AdSense + affiliate commissions + sponsorships

**TikTok / Short-Form Social:**
→ Auto-generate: images (graphic overlays), file (content calendar, 30-day hook ideas), search (trending sounds + niches)
→ Recommend connecting: TIKTOK_ACCESS_TOKEN, INSTAGRAM_ACCESS_TOKEN, SNAPCHAT_ACCESS_TOKEN
→ Revenue: Creator Fund + affiliate links + brand deals

**Newsletter / Email Publishing:**
→ Auto-generate: file (welcome series, 10-email nurture sequence), search (niche authority content)
→ Recommend connecting: BEEHIIV_API_KEY, MAILCHIMP_API_KEY, CONVERTKIT_API_KEY
→ Revenue: Paid subscriptions + sponsorships + affiliate commissions

**Cold Outreach / Lead Generation:**
→ Auto-generate: file (personalized email sequences, LinkedIn scripts, objection handling), search (prospect research)
→ Recommend connecting: INSTANTLY_API_KEY or SMARTLEAD_API_KEY, HUBSPOT_API_KEY, GMAIL_REFRESH_TOKEN
→ Revenue: B2B consulting/agency retainers ($2k-20k/month)

**E-commerce / Dropshipping:**
→ Auto-generate: images (product mockups, lifestyle photos), file (product descriptions, ad copy), search (winning products)
→ Recommend connecting: SHOPIFY_API_KEY, STRIPE_SECRET_KEY, KLAVIYO_API_KEY
→ Revenue: Product margins (30-70%) + email marketing upsells

**Podcast / Audio Content:**
→ Auto-generate: file (episode scripts, show notes, chapter markers), search (topic + guest research)
→ Recommend connecting: ELEVENLABS_API_KEY (AI host voice), BEEHIIV_API_KEY (newsletter companion)
→ Revenue: Sponsorships ($20-50 CPM) + premium episodes + affiliate

**AI Phone / Outreach Agent:**
→ Auto-generate: file (call scripts, objection handling, FAQs), search (lead prospects)
→ Recommend connecting: BLAND_AI_API_KEY (AI calls), TWILIO_AUTH_TOKEN (SMS follow-up), HUBSPOT_API_KEY (CRM)
→ Revenue: Sales commissions + SaaS licensing

**Social Media Management Agency:**
→ Auto-generate: images (content templates per platform), file (content calendars, client pitch decks, monthly reports)
→ Recommend connecting: All social platform tokens + GOHIGHLEVEL_API_KEY or N8N_API_KEY
→ Revenue: Monthly management fees ($500-5000/client)`;
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
    businessType: z.string().nullish(),
    revenueGoal: z.string().nullish(),
    planMode: z.boolean().optional().default(false),
    chatOnly: z.boolean().optional().default(false),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const [{ blueprintKB, toolKB }, storedCreds, activatedSkills, callerRows] = await Promise.all([
      buildPlatformKnowledge(),
      db.select({ credentialKey: userCredentialsTable.credentialKey, status: userCredentialsTable.status })
        .from(userCredentialsTable)
        .where(eq(userCredentialsTable.userId, userId)),
      detectAndActivateSkills(parsed.data.message, userId, parsed.data.systemInstanceId),
      db.select({ role: usersTable.role, membershipTier: usersTable.membershipTier })
        .from(usersTable).where(eq(usersTable.id, userId)).limit(1),
    ]);

    // Server-side agent-mode tier gate: higher modes route to the most expensive
    // flagship model, so a free/low-tier caller requesting expert/empire is safely
    // downgraded to the richest mode their tier can afford (FOUNDER_ADMIN bypasses).
    const { mode: effectiveMode } = resolveAgentMode(
      parsed.data.agentMode,
      callerRows[0]?.membershipTier,
      isFounderAdmin(callerRows[0]?.role),
    );

    const storedKeys = storedCreds.map((c) => c.credentialKey);
    const connectedKeys = storedCreds.filter((c) => c.status === "connected").map((c) => c.credentialKey);
    const storedCredNote = storedKeys.length > 0
      ? `\n\n=== USER'S STORED CREDENTIALS (ALREADY ON FILE — DO NOT REQUEST THESE) ===\n${storedKeys.join(", ")}\nIf the blueprint you select requires any of these keys, skip them from requiredCredentials. The system will use the stored values automatically.`
      : "";

    // Human-readable connected integrations note for ASH planning
    const connectedNames = [...new Set(connectedKeys.map((k) => INTEGRATION_NAMES[k]).filter(Boolean))];
    const connectedToolsNote = connectedNames.length > 0
      ? `\n\n=== USER'S ACTIVE CONNECTED INTEGRATIONS ===\nThese tools are fully connected and ready to use — DO NOT ask for credentials for any of them:\n${connectedNames.join(", ")}\n\nWhen building a plan that uses any of these, present them as already connected. If a plan requires a tool NOT listed here, include a clear note: "⚠️ This system requires [Tool Name] — head to the Connections Hub (/connections) to connect it before proceeding."`
      : `\n\n=== CONNECTED INTEGRATIONS ===\nThe user has no integrations connected yet. If a blueprint requires external tools (Stripe, Shopify, social platforms, email providers, etc.), include a clear note in your plan: "⚠️ You'll need to connect [Tool Name] at /connections before this system can go live."`;

    const SOCIAL_PLATFORM_KEYS = [
      { key: "TIKTOK_ACCESS_TOKEN", name: "TikTok" },
      { key: "INSTAGRAM_ACCESS_TOKEN", name: "Instagram" },
      { key: "FACEBOOK_PAGE_TOKEN", name: "Facebook" },
      { key: "META_ACCESS_TOKEN", name: "Facebook/Meta" },
      { key: "TWITTER_BEARER_TOKEN", name: "X (Twitter)" },
      { key: "LINKEDIN_API_KEY", name: "LinkedIn" },
      { key: "SNAPCHAT_ACCESS_TOKEN", name: "Snapchat" },
      { key: "YOUTUBE_API_KEY", name: "YouTube" },
      { key: "THREADS_ACCESS_TOKEN", name: "Threads" },
      { key: "PINTEREST_API_KEY", name: "Pinterest" },
    ];
    const connectedSocials = SOCIAL_PLATFORM_KEYS.filter((p) => storedKeys.includes(p.key)).map((p) => p.name);
    const socialNote = connectedSocials.length > 0
      ? `\n\n=== USER'S CONNECTED SOCIAL PLATFORMS ===\nThe user has already connected these social platforms: ${connectedSocials.join(", ")}. You can build social automation for these platforms immediately — no credential requests needed. Proactively include them in build plans, tool stacks, and automation steps.`
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

    // Best-model policy (Task #282): every user-facing response uses a frontier
    // model. Agent modes select DEPTH/SCOPE, never a budget model. The chain
    // gives automatic best-first fallback if a model is temporarily unavailable.
    const modelChain = chainForAgentMode(effectiveMode);
    const depthNote = depthNoteForAgentMode(effectiveMode);

    const contextNote = [
      parsed.data.businessType ? `User's business focus: ${parsed.data.businessType}` : "",
      parsed.data.revenueGoal  ? `User's revenue goal: ${parsed.data.revenueGoal}` : "",
    ].filter(Boolean).join("\n");

    const planModeNote = parsed.data.planMode
      ? `\n\n=== PLAN MODE — STRATEGY ONLY ===\nYou're in strategy/discussion mode right now. Talk through ideas, explain how systems work, share your honest take on opportunities and timelines. Be a real thought partner. Do NOT emit SBEP_DATA with "start_build", "collect_credentials", or any build-triggering action. You can use "browser_use" if the user wants live research. Only output a build plan (action "present_plan") when the user explicitly says they want one — "write up the plan", "let's plan this out", "I'm ready to proceed". Exploring and asking questions is NOT that signal.`
      : "";

    const beginnerNote = effectiveMode === "guide"
      ? `\n\n=== GUIDE MODE — BEGINNER STEP-BY-STEP ===
The user is a complete beginner with little to no technical background. Adapt EVERYTHING:

COMMUNICATION STYLE:
- Use plain, everyday language. No jargon without a clear explanation.
- When you must use a technical term, immediately explain it in parentheses: "API key (a secret password that lets apps talk to each other)"
- Keep sentences short. One idea per sentence.
- After any complex explanation, check in: "Does that make sense? Feel free to ask me to explain anything differently."

WHEN PRESENTING A PLAN:
- After the plan, add a section: "## 🗺️ What This Means In Plain English" — translate the whole plan into simple, jargon-free language
- Explain what each tool IS before explaining what it does in the system
- Give realistic, encouraging framing: "This might sound like a lot, but I'll walk you through every single step"

WHEN ASKING FOR CREDENTIALS (the most important part):
For EACH credential you need, explain:
1. **What is this tool?** — one sentence in plain English, e.g., "OpenAI is the company behind ChatGPT — we're using it to power the AI parts of your system"
2. **What is this key?** — "An API key is basically a secret password that lets your system talk to OpenAI's servers"
3. **How to get it — exact steps:**
   - Go to [exact URL, e.g., https://platform.openai.com/api-keys]
   - Click "[exact button/menu name]"
   - You'll see [what the page looks like]
   - The key will look like [format example, e.g., starts with "sk-proj-"]
   - Click "Copy" or highlight and copy the whole thing
4. **How to keep it safe:** "Don't share this with anyone — treat it like a password"
5. **The easy route:** Always mention — "Or just tell me your [ToolName] email and password, and I'll log into your account and grab this for you automatically. That'll cost a few extra credits, but it means you don't have to find it yourself."

PACING:
- Never dump everything at once. After presenting a plan, pause and say something like: "Want me to explain any part of this before we move forward?"
- When moving from step to step, acknowledge what's been done: "Perfect — that's the hardest part done!"
- If the user seems stuck or confused, immediately offer the browser-fetch route: "No worries — just give me your login details for [ToolName] and I'll grab this for you"`
      : "";

    const chatOnlyNote = parsed.data.chatOnly
      ? `\n\n=== CHAT MODE — CONVERSATION ONLY ===\nYou're in chat/conversation mode. Respond naturally in your voice — helpful, direct, real. Do NOT output any SBEP_DATA block under any circumstances. No build plans, no "present_plan", no "collect_credentials", no "start_build". Just answer the question like a smart friend would.`
      : "";

    // Self-improving brain (Task #312): ground the reply in proven patterns
    // relevant to this goal (honest fallback when data is thin). Prompt-only —
    // model chain above stays best-model.
    const learnedPatternsNote = await buildLearnedPatternsNote({
      businessType: parsed.data.businessType,
      goalText: `${parsed.data.message} ${parsed.data.revenueGoal ?? ""}`,
    });

    const completionArgs = {
      systemPrompt: buildSystemPrompt(blueprintKB, toolKB) + storedCredNote + connectedToolsNote + socialNote + skillAdditions + (contextNote ? `\n\n=== USER CONTEXT ===\n${contextNote}` : "") + learnedPatternsNote + depthNote + planModeNote + beginnerNote + chatOnlyNote,
      prompt: `${historyCtx}\n\nUser: ${parsed.data.message}`,
      userId,
      systemInstanceId: parsed.data.systemInstanceId,
    };

    let result;
    try {
      result = await complete({ ...completionArgs, models: modelChain });
    } catch (primaryErr: unknown) {
      const msg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
      // Last-resort safety net: the whole frontier chain is unavailable — respond
      // with the lightweight model rather than failing the request entirely.
      if (msg.includes("404") || msg.includes("No endpoints found")) {
        req.log.warn({ modelChain, fallback: MODELS.utility }, "Frontier model chain unavailable, falling back to utility model");
        result = await complete({ ...completionArgs, model: MODELS.utility });
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

    // Recovery: if the response looks like a build plan but is missing the
    // SBEP_DATA block, make one short follow-up call to extract it.
    if (isPlanWithoutData(displayContent, structuredData)) {
      req.log.warn({ modelChain }, "Build plan response missing SBEP_DATA — attempting recovery");
      const recovered = await recoverSbepData(displayContent, userId);
      if (recovered) {
        structuredData = recovered;
        if (Array.isArray((structuredData as Record<string, unknown>).requiredCredentials)) {
          (structuredData as Record<string, unknown>).requiredCredentials =
            (structuredData.requiredCredentials as { key?: string }[])
              .filter((c) => !(c.key && storedKeys.includes(c.key)));
        }
        req.log.info({ action: (structuredData as Record<string, unknown>).action }, "SBEP_DATA recovered successfully");
      }
    }

    // Hoist action and plan to top-level so mobile can read them directly
    // without needing to dig into structuredData.
    const sd = structuredData as Record<string, unknown> | null;
    const topAction = sd?.action as string ?? null;
    const planActions = ["present_plan", "start_build", "build_step"];
    const topPlan = topAction && planActions.includes(topAction) ? structuredData : null;
    res.json({ content: displayContent, structuredData, action: topAction, action_type: topAction, plan: topPlan, tokens: result.totalTokens, activatedSkills });
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

interface ThinkingStep {
  label: string;
  reasoning: string;
}

function getThinkingSteps(message: string, agentMode: string): ThinkingStep[] {
  const lower = message.toLowerCase();

  if (lower.includes("http") || lower.includes("website") || lower.includes("browse") ||
      lower.includes("visit") || lower.includes("url") || lower.includes("login") ||
      lower.includes("gmail") || lower.includes("google") || lower.includes(".com") ||
      lower.includes("page")) {
    return [
      { label: "Parsing web request…", reasoning: "Identifying the target URL and browsing objectives from your message to configure the ASH browser agent correctly." },
      { label: "Validating target URL…", reasoning: "Verifying the URL format and protocol to ensure the browser agent can navigate to the intended destination safely." },
      { label: "Preparing browser agent…", reasoning: "Initializing the ASH web crawler with task context, navigation rules, and content extraction settings." },
      { label: "Initializing web session…", reasoning: "Opening a secure browser session with appropriate headers and request configuration. The agent will capture page snapshots at each step." },
    ];
  }

  if (lower.includes("build") || lower.includes("income") || lower.includes("money") ||
      lower.includes("affiliate") || lower.includes("marketing") || lower.includes("dropship") ||
      lower.includes("business") || lower.includes("revenue") || lower.includes("ecommerce") ||
      lower.includes("shopify") || lower.includes("tiktok") || lower.includes("youtube") ||
      lower.includes("saas") || lower.includes("course") || lower.includes("funnel") ||
      lower.includes("$") || lower.includes("profit")) {
    if (agentMode === "empire" || agentMode === "expert") {
      return [
        { label: "Activating deep reasoning mode…", reasoning: "Switching to extended context analysis using a more capable reasoning model to handle complex multi-variable goal evaluation." },
        { label: "Analyzing your income goal…", reasoning: "Breaking down your revenue target into component sub-goals — identifying time horizon, risk tolerance, and required automation depth." },
        { label: "Searching STARKS blueprint library…", reasoning: "Running multi-factor blueprint scoring across all 8 blueprints in 6 categories to find the optimal architecture match for your stated goal." },
        { label: "Evaluating tool stack options…", reasoning: "Analyzing tool compatibility, API rate limits, and cost structures across the 17 STARKS marketplace tools to identify the most efficient stack." },
        { label: "Designing system architecture…", reasoning: "Creating a multi-stage automation pipeline with fallback paths, monitoring hooks, and revenue attribution tracking built in from the start." },
        { label: "Calculating revenue projections…", reasoning: "Running probabilistic revenue modeling based on historical conversion rates, traffic estimates, and market saturation data for your niche." },
        { label: "Stress-testing monetisation model…", reasoning: "Identifying edge cases, market downside scenarios, and optimization levers in the proposed revenue model to give you realistic expectations." },
        { label: "Preparing comprehensive build plan…", reasoning: "Assembling the full deployment specification: ordered build steps, credential requirements, integration sequence, and success metrics." },
      ];
    }
    return [
      { label: "Analyzing your income goal…", reasoning: "Processing your revenue target, business type preferences, and timeline to identify the right blueprint category for your situation." },
      { label: "Searching STARKS blueprint library…", reasoning: "Scanning all 8 available blueprints across 6 categories — scoring each against your goal and selecting the highest-probability match." },
      { label: "Designing system architecture…", reasoning: "Mapping the data flow, automation triggers, and revenue attribution chain for your selected blueprint's deployment." },
      { label: "Calculating revenue projections…", reasoning: "Estimating realistic income timelines based on the monetization model, typical traffic patterns, and conversion benchmarks for this blueprint." },
      { label: "Preparing build plan…", reasoning: "Generating a step-by-step deployment sequence with time estimates, required credentials, and tool integration order." },
    ];
  }

  if (lower.includes("confirm") || lower.includes("proceed") || lower.includes("ready") || lower.includes("plan")) {
    return [
      { label: "Processing your confirmation…", reasoning: "Registering your decision to proceed and retrieving the cached build specification from the planning phase." },
      { label: "Retrieving build specification…", reasoning: "Loading blueprint configuration, required credentials list, and build step sequence from the planning context." },
      { label: "Preparing next phase…", reasoning: "Transitioning to the credential collection phase. ASH will need your API keys and tool access to begin construction." },
    ];
  }

  if (agentMode === "empire" || agentMode === "expert") {
    return [
      { label: "Activating deep reasoning…", reasoning: "Switching to an extended reasoning model to give you a comprehensive, nuanced response." },
      { label: "Analyzing request complexity…", reasoning: "Breaking down your question into components to ensure every aspect is addressed thoroughly." },
      { label: "Consulting STARKS knowledge base…", reasoning: "Searching platform knowledge — blueprints, tools, income models, and deployment patterns — for relevant context." },
      { label: "Cross-referencing platform intelligence…", reasoning: "Combining blueprint data, marketplace tool specs, and revenue patterns to formulate the most accurate and actionable response." },
      { label: "Synthesizing comprehensive response…", reasoning: "Assembling all findings into a structured, actionable answer tailored to your specific situation and goals." },
    ];
  }

  return [
    { label: "Processing your request…", reasoning: "Parsing your message and identifying the intent, entities, and required context to answer accurately." },
    { label: "Consulting STARKS knowledge base…", reasoning: "Searching platform knowledge — blueprints, tools, income models, and automation patterns — for the most relevant information." },
    { label: "Formulating response…", reasoning: "Composing a clear, actionable response aligned with your goals and the STARKS platform capabilities." },
  ];
}

// ─── Auto-tool detection helpers ────────────────────────────────────────────

const SEARCH_PATTERNS = [
  /\b(search for|research|look up|look for|find out|what(?:'s| is) the (?:latest|current|recent)|trending|news about|statistics (?:for|on)|market (?:size|data) for|how much (?:does|is|are)|prices? of|current price|latest (?:data|stats|numbers))\b/i,
  /\b(who (?:are|is) the|what companies|what tools|what platforms|competitors? (?:for|of))\b/i,
  /\b(find (?:me )?(?:the )?(?:best|top|cheapest|most popular))\b/i,
];

const IMAGE_PATTERNS = [
  /\b(generate|create|make|design|draw|produce)\b.{0,25}\b(image|picture|photo|logo|visual|graphic|banner|thumbnail|icon|poster|mockup)\b/i,
  /\b(image|logo|banner|graphic|visual|thumbnail|mockup)\b.{0,20}\b(for|of|showing|with|that)\b/i,
];

function detectAutoTools(message: string): { search?: string; image?: string } {
  const result: { search?: string; image?: string } = {};
  if (SEARCH_PATTERNS.some(p => p.test(message))) {
    result.search = message.slice(0, 200);
  }
  if (IMAGE_PATTERNS.some(p => p.test(message))) {
    result.image = message.slice(0, 300);
  }
  return result;
}

async function runAutoSearch(query: string, userId: number): Promise<Record<string, unknown>> {
  const result = await complete({
    systemPrompt: `You are a business research assistant. Given a search query, provide concise, factual research results.
Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "query": "the search query",
  "summary": "2-3 sentence overview of findings",
  "findings": [
    {"point": "key finding", "source": "source name or URL if known"},
    {"point": "key finding", "source": "source name or URL if known"},
    {"point": "key finding", "source": "source name or URL if known"}
  ],
  "marketOpportunity": "1 sentence on the business opportunity or relevance"
}`,
    prompt: `Research this for a business automation context: ${query}`,
    models: chainFor("research"),
    userId,
  });

  try {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {
      query,
      summary: result.content.slice(0, 500),
      findings: [],
      marketOpportunity: "",
    };
  } catch {
    return {
      query,
      summary: result.content.slice(0, 500),
      findings: [],
      marketOpportunity: "",
    };
  }
}

function buildAutoImageUrl(prompt: string): Record<string, unknown> {
  const seed = Math.floor(Math.random() * 999999);
  const encodedPrompt = encodeURIComponent(
    `${prompt}, professional, high quality, business marketing style, cinematic`
  );
  return {
    url: `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=576&seed=${seed}&nologo=true&model=flux`,
    prompt,
    aspectRatio: "landscape",
    seed,
  };
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
    businessType: z.string().nullish(),
    revenueGoal: z.string().nullish(),
    planMode: z.boolean().optional().default(false),
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
    const [{ blueprintKB, toolKB }, storedCreds, activatedSkills, userMemoryRows, platformRows] = await Promise.all([
      buildPlatformKnowledge(),
      db.select({ credentialKey: userCredentialsTable.credentialKey, status: userCredentialsTable.status })
        .from(userCredentialsTable)
        .where(eq(userCredentialsTable.userId, userId)),
      detectAndActivateSkills(parsed.data.message, userId, parsed.data.systemInstanceId),
      db.select({ memoryKey: userMemoryTable.memoryKey, memoryValue: userMemoryTable.memoryValue })
        .from(userMemoryTable)
        .where(
          parsed.data.systemInstanceId
            ? and(
                eq(userMemoryTable.userId, userId),
                eq(userMemoryTable.systemInstanceId, parsed.data.systemInstanceId),
              )
            : eq(userMemoryTable.userId, userId),
        ),
      // Lightweight parallel platform snapshot for ASH context injection
      Promise.all([
        db.select({ id: systemInstancesTable.id, name: systemInstancesTable.name, buildStatus: systemInstancesTable.buildStatus })
          .from(systemInstancesTable).where(eq(systemInstancesTable.userId, userId)).limit(10),
        db.select({ id: businessesTable.id, name: businessesTable.name })
          .from(businessesTable).where(eq(businessesTable.ownerId, userId)).limit(10),
        db.select({ domain: userDomainsTable.domain, status: userDomainsTable.status })
          .from(userDomainsTable).where(eq(userDomainsTable.userId, userId)).limit(10),
        db.select({ id: landingPagesTable.id, isPublished: landingPagesTable.isPublished })
          .from(landingPagesTable).where(eq(landingPagesTable.userId, userId)).limit(20),
        db.select({ id: emailSequencesTable.id, status: emailSequencesTable.status })
          .from(emailSequencesTable).where(eq(emailSequencesTable.userId, userId)).limit(10),
        db.select({ creditsBalance: usersTable.creditsBalance, role: usersTable.role, membershipTier: usersTable.membershipTier })
          .from(usersTable).where(eq(usersTable.id, userId)).limit(1),
      ]),
    ]);

    const [platformSystems, platformBusinesses, platformDomains, platformPages, platformSeqs, platformCreditRows] = platformRows;
    const userCreditBalance = platformCreditRows[0]?.creditsBalance ?? 0;

    // Server-side agent-mode tier gate (see /ai-orchestrator/chat): downgrade a
    // higher mode than the caller's tier allows so flagship credits can't be
    // burned via a crafted request. FOUNDER_ADMIN bypasses.
    const { mode: effectiveMode } = resolveAgentMode(
      parsed.data.agentMode,
      platformCreditRows[0]?.membershipTier,
      isFounderAdmin(platformCreditRows[0]?.role),
    );

    // Derive connected social accounts from storedCreds
    const SOCIAL_CRED_KEYS: Record<string, string> = {
      TIKTOK_ACCESS_TOKEN: "TikTok", INSTAGRAM_ACCESS_TOKEN: "Instagram",
      FACEBOOK_PAGE_TOKEN: "Facebook", META_ACCESS_TOKEN: "Meta/Facebook",
      TWITTER_BEARER_TOKEN: "X (Twitter)", LINKEDIN_API_KEY: "LinkedIn",
      YOUTUBE_REFRESH_TOKEN: "YouTube", YOUTUBE_API_KEY: "YouTube",
      THREADS_ACCESS_TOKEN: "Threads", PINTEREST_API_KEY: "Pinterest",
      SNAPCHAT_ACCESS_TOKEN: "Snapchat",
    };
    const storedKeySet = new Set(storedCreds.map((c) => c.credentialKey));
    const connectedSocialNames = [...new Set(
      Object.entries(SOCIAL_CRED_KEYS)
        .filter(([k]) => storedKeySet.has(k))
        .map(([, name]) => name),
    )];

    const storedKeys = storedCreds.map((c) => c.credentialKey);
    const connectedKeys = storedCreds.filter((c) => c.status === "connected").map((c) => c.credentialKey);
    const storedCredNote = storedKeys.length > 0
      ? `\n\n=== USER'S STORED CREDENTIALS (ALREADY ON FILE — DO NOT REQUEST THESE) ===\n${storedKeys.join(", ")}\nIf the blueprint you select requires any of these keys, skip them from requiredCredentials.`
      : "";

    // Human-readable connected integrations note for ASH planning
    const connectedNames = [...new Set(connectedKeys.map((k) => INTEGRATION_NAMES[k]).filter(Boolean))];
    const connectedToolsNote = connectedNames.length > 0
      ? `\n\n=== USER'S ACTIVE CONNECTED INTEGRATIONS ===\nThese tools are fully connected and ready to use — DO NOT ask for credentials for any of them:\n${connectedNames.join(", ")}\n\nWhen building a plan that uses any of these, present them as already connected. If a plan requires a tool NOT listed here, include a clear note: "⚠️ This system requires [Tool Name] — head to the Connections Hub (/connections) to connect it before proceeding."`
      : `\n\n=== CONNECTED INTEGRATIONS ===\nThe user has no integrations connected yet. If a blueprint requires external tools (Stripe, Shopify, social platforms, email providers, etc.), include a clear note in your plan: "⚠️ You'll need to connect [Tool Name] at /connections before this system can go live."`;

    const skillAdditions = activatedSkills
      .filter((s) => s.systemPromptAddition)
      .map((s) => `\n\n=== ACTIVATED SKILL: ${s.name.toUpperCase()} ===\n${s.systemPromptAddition}`)
      .join("");

    const memoryNote = userMemoryRows.length > 0
      ? `\n\n=== USER SYSTEM MEMORY (learned from previous sessions) ===\n${userMemoryRows.map((m) => `${m.memoryKey}: ${m.memoryValue}`).join("\n")}\nUse this context to personalise your response and avoid re-asking things you already know.`
      : "";

    // Full platform awareness note — gives ASH a live snapshot of what the user has built
    const publishedPageCount = platformPages.filter((p) => p.isPublished).length;
    const platformStateNote = `\n\n=== USER'S LIVE PLATFORM OVERVIEW (as of this session) ===
Systems (${platformSystems.length}): ${platformSystems.length > 0
  ? platformSystems.map((s) => `"${s.name}" [id:${s.id}, status:${s.buildStatus}]`).join(" | ")
  : "none"}
Businesses (${platformBusinesses.length}): ${platformBusinesses.length > 0
  ? platformBusinesses.map((b) => `"${b.name}" [id:${b.id}]`).join(" | ")
  : "none"}
Domains (${platformDomains.length}): ${platformDomains.length > 0
  ? platformDomains.map((d) => `${d.domain} [status:${d.status}]`).join(", ")
  : "none"}
Landing Pages: ${platformPages.length} total, ${publishedPageCount} published
Email Sequences: ${platformSeqs.length}${platformSeqs.length > 0 ? ` (${platformSeqs.filter((s) => s.status === "active").length} active)` : ""}
Social Accounts: ${connectedSocialNames.length > 0 ? connectedSocialNames.join(", ") : "none connected"}
Credits remaining: ${userCreditBalance}
Use this context to give proactive, personalised advice. Reference the user's actual assets when relevant.
Available platform tools (emit as SBEP_DATA action "tool_calls"):
  READ  — type: "list_my_systems" | "list_my_businesses" | "list_my_domains" | "list_my_landing_pages" | "list_my_email_sequences" | "list_my_social_accounts"
  WRITE — type: "platform_action", tool: "update_system_status" | "trigger_system_rebuild" | "create_business_note" | "schedule_social_post" | "send_email_blast"
          params for update_system_status:   { id: <integer>, status: "active" | "paused" }
          params for trigger_system_rebuild: { id: <integer> }
          params for create_business_note:   { businessId: <integer>, note: "<text>" }
          params for schedule_social_post:    { platform: "twitter" | "linkedin" | "instagram" | "tiktok" | "facebook", content: "<post text>", scheduledAt: "<ISO 8601 datetime>", linkUrl?: "<url>", mediaUrls?: ["<url>"], systemInstanceId?: <integer> }
          params for send_email_blast:        { sequenceId: <integer>, stepNumber?: <integer, default 1> }
          + summary: "<one-sentence description>"
Do NOT invent IDs — only use exact integer IDs shown above.`;

    const historyCtx = parsed.data.history.length > 0
      ? "\n\nConversation so far:\n" +
        parsed.data.history.map((h) => `${h.role === "user" ? "User" : "STARK"}: ${h.content}`).join("\n")
      : "";

    // Best-model policy (Task #282): stream every user-facing response through a
    // frontier model chain. Agent modes select DEPTH/SCOPE, never a budget model.
    const modelChain = chainForAgentMode(effectiveMode);
    const depthNote = depthNoteForAgentMode(effectiveMode);

    const contextNote = [
      parsed.data.businessType ? `User's business focus: ${parsed.data.businessType}` : "",
      parsed.data.revenueGoal  ? `User's revenue goal: ${parsed.data.revenueGoal}` : "",
    ].filter(Boolean).join("\n");

    const planModeNote = parsed.data.planMode
      ? `\n\n=== PLAN MODE — STRATEGY ONLY ===\nYou're in strategy/discussion mode right now. Talk through ideas, explain how systems work, share your honest take on opportunities and timelines. Be a real thought partner. Do NOT emit SBEP_DATA with "start_build", "collect_credentials", or any build-triggering action. You can use "browser_use" if the user wants live research. Only output a build plan (action "present_plan") when the user explicitly says they want one — "write up the plan", "let's plan this out", "I'm ready to proceed". Exploring and asking questions is NOT that signal.`
      : "";

    // Self-improving brain (Task #312): retrieve proven patterns relevant to
    // this goal and ground the plan/build in what has actually earned money.
    // Deterministic, honest fallback when data is thin. Augments the prompt
    // only — model selection above (chainForAgentMode) stays best-model.
    const learnedPatternsNote = await buildLearnedPatternsNote({
      businessType: parsed.data.businessType,
      goalText: `${parsed.data.message} ${parsed.data.revenueGoal ?? ""}`,
    });

    const systemPrompt = buildSystemPrompt(blueprintKB, toolKB) +
      storedCredNote + connectedToolsNote + skillAdditions + memoryNote + platformStateNote +
      (contextNote ? `\n\n=== USER CONTEXT ===\n${contextNote}` : "") + learnedPatternsNote + depthNote + planModeNote;
    const prompt = `${historyCtx}\n\nUser: ${parsed.data.message}`;

    // ── Auto-tool detection (runs in parallel with AI + thinking) ─────────
    const autoTools = detectAutoTools(parsed.data.message);
    const autoToolResults: Array<{ tool: string; data: Record<string, unknown> }> = [];
    const autoToolTasks: Promise<void>[] = [];

    if (autoTools.image) {
      autoToolResults.push({ tool: "image", data: buildAutoImageUrl(autoTools.image) });
    }
    if (autoTools.search) {
      const searchQuery = autoTools.search;
      autoToolTasks.push(
        runAutoSearch(searchQuery, userId)
          .then(data => { autoToolResults.push({ tool: "search", data }); })
          .catch(() => { /* non-fatal */ })
      );
    }

    // ── Thinking steps (run while AI call is warming up) ──────────────────
    const thinkingSteps = getThinkingSteps(parsed.data.message, parsed.data.agentMode ?? "fast");

    // Start AI streaming call in parallel with thinking display
    const tokenBuffer: string[] = [];
    let aiDone = false;
    let aiError: Error | null = null;

    const aiTask = (async () => {
      try {
        for await (const token of streamCompletion({ systemPrompt, prompt, models: modelChain, userId })) {
          tokenBuffer.push(token);
        }
      } catch (err) {
        // Last-resort safety net: the whole frontier chain failed to stream —
        // fall back to a non-streaming utility completion rather than erroring out.
        try {
          const fallback = await complete({ systemPrompt, prompt, model: MODELS.utility, userId });
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

    // Wait for auto-tool tasks (search usually finishes during thinking steps)
    if (autoToolTasks.length > 0) {
      await Promise.race([
        Promise.all(autoToolTasks),
        new Promise<void>(r => setTimeout(r, 4000)),
      ]);
    }

    // Send auto-tool results as SSE events before first token
    for (const tr of autoToolResults) {
      send({ type: "tool_result", tool: tr.tool, data: tr.data });
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

    // Expose estimated token usage for API key usage tracking in apiKeyMiddleware.
    // Rough estimate: ~4 chars per output token + ~4 chars per input token.
    if ((req as any).apiKeyCaller) {
      const outputTokens = Math.round(fullContent.length / 4);
      const inputTokens = Math.round((systemPrompt.length + prompt.length) / 4);
      res.locals["sbepTokenUsage"] = outputTokens + inputTokens;
    }

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

    // Recovery: if the response looks like a build plan but is missing the
    // SBEP_DATA block, make one short follow-up call to extract it.
    if (isPlanWithoutData(displayContent, structuredData)) {
      req.log.warn({ modelChain }, "Stream: build plan response missing SBEP_DATA — attempting recovery");
      send({ type: "thinking", steps: [{ label: "Extracting plan data…", reasoning: "The plan was generated but the structured data block was missing. Recovering it now." }], index: 0 });
      const recovered = await recoverSbepData(displayContent, userId);
      if (recovered) {
        structuredData = recovered;
        if (Array.isArray((structuredData as Record<string, unknown>).requiredCredentials)) {
          (structuredData as Record<string, unknown>).requiredCredentials =
            (structuredData.requiredCredentials as { key?: string }[])
              .filter((c) => !(c.key && storedKeys.includes(c.key)));
        }
        req.log.info({ action: (structuredData as Record<string, unknown>).action }, "Stream: SBEP_DATA recovered successfully");
      }
    }

    // ── Server-side connector execution ──────────────────────────────────────
    // If the AI emitted connector_action calls, execute them here on the server
    // and stream each result as a tool_result SSE event before the done event.
    // This ensures connector results are delivered in the real-time SSE stream,
    // and strips the calls from structuredData so the client doesn't re-execute.
    if (
      structuredData != null &&
      structuredData.action === "tool_calls" &&
      Array.isArray(structuredData.calls)
    ) {
      const calls = structuredData.calls as Array<Record<string, unknown>>;
      const connectorCalls = calls.filter(c => c.type === "connector_action");

      if (connectorCalls.length > 0) {
        // Fetch and decrypt all user credentials for connector execution
        const credRows = await db
          .select({ credentialKey: userCredentialsTable.credentialKey, encryptedValue: userCredentialsTable.encryptedValue })
          .from(userCredentialsTable)
          .where(eq(userCredentialsTable.userId, userId));

        const userCreds: Record<string, string> = {};
        for (const row of credRows) {
          if (row.encryptedValue) {
            try { userCreds[row.credentialKey] = await decrypt(row.encryptedValue); } catch { /* skip */ }
          }
        }

        // Verify systemInstanceId ownership once for the whole batch
        let verifiedInstanceId: number | undefined;
        const requestedInstanceId = parsed.data.systemInstanceId;
        if (requestedInstanceId != null) {
          const [owned] = await db
            .select({ id: systemInstancesTable.id })
            .from(systemInstancesTable)
            .where(and(
              eq(systemInstancesTable.id, requestedInstanceId),
              eq(systemInstancesTable.userId, userId),
            ))
            .limit(1);
          if (owned) verifiedInstanceId = requestedInstanceId;
        }

        for (const call of connectorCalls) {
          const connectorId = call.connectorId as string | undefined;
          const action = call.action as string | undefined;
          const params = (call.params ?? {}) as Record<string, unknown>;

          if (!connectorId || !action || !isKnownConnector(connectorId)) continue;
          const connector = getConnector(connectorId, userCreds);
          if (!connector) continue;

          const startMs = Date.now();
          let execResult: { ok: boolean; data?: unknown; error?: string };
          try {
            execResult = await connector.execute(action, params);
          } catch (err) {
            execResult = { ok: false, error: err instanceof Error ? err.message : String(err) };
          }
          const latencyMs = Date.now() - startMs;

          // Activity logging — only when we have an owned instance
          if (verifiedInstanceId != null) {
            const eventDescription = execResult.ok
              ? `Connector action executed: ${connector.displayName} → ${action} (${latencyMs}ms)`
              : `Connector action failed: ${connector.displayName} → ${action} — ${(execResult.error ?? "unknown error").slice(0, 200)}`;
            db.insert(systemActivityEventsTable).values({
              systemInstanceId: verifiedInstanceId,
              eventType: execResult.ok ? "action" : "warning",
              description: eventDescription,
              metadata: JSON.stringify({ connectorId, connectorName: connector.displayName, action, ok: execResult.ok, latencyMs }),
            }).catch(() => { /* non-critical */ });
          }

          // Include original params in the SSE payload so the client can build a retry call
          send({
            type: "tool_result",
            tool: "connector",
            data: {
              connectorId,
              connectorName: connector.displayName,
              action,
              params,              // included for client-side retry
              systemInstanceId: verifiedInstanceId,
              ok: execResult.ok,
              data: execResult.ok ? execResult.data : undefined,
              error: execResult.ok ? undefined : execResult.error,
              latencyMs,
            },
          });
        }

        // Remove executed connector calls so the client doesn't double-execute
        (structuredData as Record<string, unknown>).calls = calls.filter(c => c.type !== "connector_action");
        if ((structuredData.calls as unknown[]).length === 0) {
          structuredData = null; // No other tool calls remain
        }
      }
    }

    // ── Server-side schedule_post handling ────────────────────────────────────
    // ASH's schedule_post tool_calls create Content Calendar rows directly
    // (visible/editable at /social) rather than a generic recurring scheduled_task.
    if (
      structuredData != null &&
      structuredData.action === "tool_calls" &&
      Array.isArray(structuredData.calls)
    ) {
      const allCalls = structuredData.calls as Array<Record<string, unknown>>;
      const schedulePostCalls = allCalls.filter(c => c.type === "schedule_post");

      if (schedulePostCalls.length > 0) {
        let verifiedInstanceId: number | undefined;
        const requestedInstanceId = parsed.data.systemInstanceId;
        if (requestedInstanceId != null) {
          const [owned] = await db
            .select({ id: systemInstancesTable.id })
            .from(systemInstancesTable)
            .where(and(
              eq(systemInstancesTable.id, requestedInstanceId),
              eq(systemInstancesTable.userId, userId),
            ))
            .limit(1);
          if (owned) verifiedInstanceId = requestedInstanceId;
        }

        for (const call of schedulePostCalls) {
          const platform = call.platform as string | undefined;
          const content = call.content as string | undefined;
          const scheduledAtRaw = call.scheduledAt as string | undefined;
          const linkUrl = (call.linkUrl as string | undefined) ?? null;
          const mediaUrls = Array.isArray(call.mediaUrls) ? (call.mediaUrls as string[]) : [];

          if (!platform || !content || !scheduledAtRaw || !(SOCIAL_PLATFORMS as readonly string[]).includes(platform)) {
            send({ type: "tool_result", tool: "schedule_post", data: { ok: false, error: "schedule_post requires a valid platform, content, and scheduledAt." } });
            continue;
          }
          const scheduledAt = new Date(scheduledAtRaw);
          if (isNaN(scheduledAt.getTime())) {
            send({ type: "tool_result", tool: "schedule_post", data: { ok: false, error: `Invalid scheduledAt: ${scheduledAtRaw}` } });
            continue;
          }

          try {
            const [row] = await db.insert(scheduledPostsTable).values({
              userId,
              systemInstanceId: verifiedInstanceId ?? null,
              platform,
              content,
              mediaUrls,
              linkUrl,
              scheduledAt,
              status: "scheduled",
            }).returning();

            if (verifiedInstanceId != null) {
              db.insert(systemActivityEventsTable).values({
                systemInstanceId: verifiedInstanceId,
                eventType: "action",
                description: `Scheduled a ${platform} post for ${scheduledAt.toLocaleString()}`,
                metadata: JSON.stringify({ scheduledPostId: row.id, platform }),
              }).catch(() => { /* non-critical */ });
            }

            send({
              type: "tool_result",
              tool: "schedule_post",
              data: { ok: true, postId: row.id, platform, scheduledAt: scheduledAt.toISOString(), content },
            });
          } catch (err: unknown) {
            send({ type: "tool_result", tool: "schedule_post", data: { ok: false, error: err instanceof Error ? err.message : String(err) } });
          }
        }

        (structuredData as Record<string, unknown>).calls = allCalls.filter(c => c.type !== "schedule_post");
        if ((structuredData.calls as unknown[]).length === 0) {
          structuredData = null;
        }
      }
    }

    // Track video jobs submitted this turn so we can stream progress events
    const pendingMediaJobIds: Array<{ jobId: string; prompt: string }> = [];

    // ── Server-side generate_video / generate_music handling ─────────────────
    // Process these media gen tool_calls server-side: submit jobs to external
    // providers and stream back tool_result SSE events with job IDs or audio.
    if (
      structuredData != null &&
      structuredData.action === "tool_calls" &&
      Array.isArray(structuredData.calls)
    ) {
      const allCalls = structuredData.calls as Array<Record<string, unknown>>;
      const mediaGenCalls = allCalls.filter(c => c.type === "generate_video" || c.type === "generate_music");

      if (mediaGenCalls.length > 0) {
        const credKeyRows = await db
          .select({ credentialKey: userCredentialsTable.credentialKey })
          .from(userCredentialsTable)
          .where(eq(userCredentialsTable.userId, userId));
        const userCredKeys = new Set(credKeyRows.map(r => r.credentialKey));

        for (const call of mediaGenCalls) {
          try {
            if (call.type === "generate_video") {
              const hasVideo = userCredKeys.has("HEYGEN_API_KEY") || userCredKeys.has("RUNWAY_API_KEY");
              if (!hasVideo) {
                send({
                  type: "tool_result",
                  tool: "generate_video",
                  data: {
                    ok: false,
                    status: "needs_credentials",
                    message: "Connect HeyGen or Runway in the Connections Hub to generate videos.",
                    connectUrl: "/connections?category=video-ai",
                    prompt: call.prompt,
                  },
                });
              } else {
                const genRes = await fetch(
                  `http://localhost:${process.env.PORT ?? 8080}/api/media-gen/video`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": (req.headers["authorization"] as string) ?? "",
                    },
                    body: JSON.stringify({
                      prompt: (call.prompt as string) ?? "",
                      aspectRatio: (call.aspectRatio as string) ?? "9:16",
                      durationSeconds: (call.durationSeconds as number) ?? 6,
                    }),
                  },
                );
                const genData = (await genRes.json()) as Record<string, unknown>;
                send({
                  type: "tool_result",
                  tool: "generate_video",
                  data: { ok: genData.status !== "failed" && genData.status !== "needs_credentials", ...genData },
                });
                // Track job for SSE progress loop below
                if (genData["status"] === "generating" && typeof genData["jobId"] === "string") {
                  pendingMediaJobIds.push({ jobId: genData["jobId"], prompt: (call.prompt as string) ?? "" });
                }
              }
            }

            if (call.type === "generate_music") {
              const hasMusic = userCredKeys.has("ELEVENLABS_API_KEY");
              if (!hasMusic) {
                send({
                  type: "tool_result",
                  tool: "generate_music",
                  data: {
                    ok: false,
                    status: "needs_credentials",
                    message: "Connect ElevenLabs in the Connections Hub to generate music.",
                    connectUrl: "/connections?category=voice-ai",
                    prompt: call.prompt,
                  },
                });
              } else {
                const genRes = await fetch(
                  `http://localhost:${process.env.PORT ?? 8080}/api/media-gen/music`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": (req.headers["authorization"] as string) ?? "",
                    },
                    body: JSON.stringify({
                      prompt: (call.prompt as string) ?? "",
                      durationSeconds: (call.durationSeconds as number) ?? 30,
                    }),
                  },
                );
                const genData = (await genRes.json()) as Record<string, unknown>;
                // Strip audioBase64 from SSE (too large) — frontend polls job for result
                const { audioBase64: _stripped, ...safeData } = genData as Record<string, unknown> & { audioBase64?: unknown };
                send({
                  type: "tool_result",
                  tool: "generate_music",
                  data: { ok: genData["status"] === "generating" || genData["status"] === "success", ...safeData },
                });
                // Track audio job for SSE progress loop
                if (genData["status"] === "generating" && typeof genData["jobId"] === "string") {
                  pendingMediaJobIds.push({ jobId: genData["jobId"], prompt: (call.prompt as string) ?? "" });
                }
              }
            }
          } catch (mediaErr) {
            req.log.warn({ mediaErr, callType: call.type }, "Media gen tool_call failed in stream");
          }
        }

        (structuredData as Record<string, unknown>).calls = allCalls.filter(
          c => c.type !== "generate_video" && c.type !== "generate_music",
        );
        if ((structuredData.calls as unknown[]).length === 0) {
          structuredData = null;
        }
      }
    }

    // ── Server-side create_schedule handling ─────────────────────────────────
    // When ASH emits a create_schedule action and we have a verified system
    // instance, persist the scheduled task immediately and notify the client.
    if (
      structuredData != null &&
      structuredData.action === "create_schedule" &&
      parsed.data.systemInstanceId != null
    ) {
      const instanceId = parsed.data.systemInstanceId;
      const [owned] = await db
        .select({ id: systemInstancesTable.id })
        .from(systemInstancesTable)
        .where(and(
          eq(systemInstancesTable.id, instanceId),
          eq(systemInstancesTable.userId, userId),
        ))
        .limit(1);

      if (owned) {
        try {
          const schedType = (structuredData.scheduleType as string) ?? "daily";
          const schedConfig = (structuredData.scheduleConfig as Record<string, unknown>) ?? {};
          const nextRunAt = _computeNextRunAt(
            schedType as "every_n_minutes" | "every_n_hours" | "daily" | "weekly",
            schedConfig,
            new Date(),
          );

          const actionType   = (structuredData.actionType as string) ?? "connector";
          const actionParams = (structuredData.actionParams as Record<string, unknown>) ?? {};

          const [newTask] = await db.insert(scheduledTasksTable).values({
            systemInstanceId: instanceId,
            userId,
            name: (structuredData.taskName as string) ?? "Scheduled Task",
            scheduleType: schedType,
            scheduleConfig: schedConfig,
            actionType,
            actionParams,
            enabled: true,
            nextRunAt,
          }).returning();

          // When scheduling a publish action, create a calendar record immediately
          // so the Content Calendar shows upcoming posts before they execute.
          if (actionType === "publish" && actionParams["content"]) {
            const apChannel     = (actionParams["channel"]     as string | undefined) ?? "";
            const apContentType = (actionParams["contentType"] as string | undefined) ?? "post";
            const apTitle       = (actionParams["title"]       as string | null | undefined) ?? null;
            const apContent     = actionParams["content"] as string;
            const apMeta = JSON.stringify({
              ...(actionParams["imageUrl"]   ? { imageUrl:   actionParams["imageUrl"] }   : {}),
              ...(actionParams["listId"]     ? { listId:     actionParams["listId"] }     : {}),
              ...(actionParams["siteUrl"]    ? { siteUrl:    actionParams["siteUrl"] }    : {}),
              ...(actionParams["videoId"]    ? { videoId:    actionParams["videoId"] }    : {}),
              ...(actionParams["tags"]       ? { tags:       actionParams["tags"] }       : {}),
              ...(actionParams["categoryId"] ? { categoryId: actionParams["categoryId"] } : {}),
              scheduledTaskId: newTask.id,
            });
            await db.insert(publishedContentTable).values({
              systemInstanceId: instanceId,
              channel:     apChannel,
              contentType: apContentType,
              title:       apTitle,
              content:     apContent,
              status:      "scheduled",
              scheduledFor: nextRunAt,
              metadata:    apMeta,
            }).catch(() => {});
          }

          send({
            type: "tool_result",
            tool: "create_schedule",
            data: {
              ok: true,
              scheduledTask: {
                id: newTask.id,
                name: newTask.name,
                scheduleType: newTask.scheduleType,
                nextRunAt: newTask.nextRunAt?.toISOString() ?? null,
              },
            },
          });

          await db.insert(systemActivityEventsTable).values({
            systemInstanceId: instanceId,
            eventType: "action",
            description: `Scheduled task created: "${newTask.name}" — runs ${schedType.replace(/_/g, " ")}`,
            metadata: JSON.stringify({ scheduledTaskId: newTask.id, scheduleType: schedType }),
          });

          // Clear the structuredData so the client doesn't re-process it
          structuredData = null;
        } catch (schedErr) {
          req.log.warn({ schedErr }, "Failed to create scheduled task from ASH");
        }
      }
    }

    // ── Server-side generate_ab_variants handling ─────────────────────────────
    // When ASH emits a generate_ab_variants action, create the A/B test record
    // and auto-generate variant content via OpenRouter.
    if (
      structuredData != null &&
      structuredData.action === "generate_ab_variants" &&
      parsed.data.systemInstanceId != null
    ) {
      const instanceId = parsed.data.systemInstanceId;
      const [owned] = await db
        .select({ id: systemInstancesTable.id })
        .from(systemInstancesTable)
        .where(and(
          eq(systemInstancesTable.id, instanceId),
          eq(systemInstancesTable.userId, userId),
        ))
        .limit(1);

      if (owned) {
        try {
          const testType     = (structuredData.testType as string) === "email_subject" ? "email_subject" : "landing_page";
          const testName     = (structuredData.testName as string) || "A/B Test";
          const origContent  = (structuredData.originalContent as string) || "";
          const nVariants    = Math.min(Math.max(Number(structuredData.numberOfVariants) || 2, 1), 4);
          const landingPageId = Number(structuredData.landingPageId) || undefined;
          const sequenceId    = Number(structuredData.sequenceId) || undefined;

          const config: Record<string, unknown> = {};
          if (landingPageId) config.landingPageId = landingPageId;
          if (sequenceId)    config.sequenceId    = sequenceId;

          // Create the test record
          const [newTest] = await db.insert(abTestsTable).values({
            userId,
            systemInstanceId: instanceId,
            name: testName,
            type: testType,
            status: "running",
            config,
            token: randomBytes(16).toString("hex"),
          }).returning();

          // Generate variant content via OpenRouter
          const variantPrompt = testType === "email_subject"
            ? `Generate ${nVariants} A/B test variants for this email subject line.\nOriginal: "${origContent}"\nReturn ONLY valid JSON: {"variants":[{"name":"Variant A","content":"subject line"}]}\nKeep subjects under 60 characters. Make each variant meaningfully different.`
            : `Generate ${nVariants} A/B test variants for this landing page headline or content.\nOriginal: "${origContent}"\nReturn ONLY valid JSON: {"variants":[{"name":"Variant A","content":"full variant content or headline"}]}\nMake each variant test a different persuasion angle.`;

          const genResult = await complete({
            systemPrompt: "You are an expert conversion-rate optimiser. Return ONLY raw JSON — no markdown, no code blocks.",
            prompt: variantPrompt,
            // User-facing marketing copy — use a frontier model for quality.
            models: chainFor("reasoning"),
            userId,
          });

          let generatedVariants: Array<{ name: string; content: string }> = [];
          try {
            const jsonMatch = genResult.content.match(/\{[\s\S]*\}/);
            const parsed2 = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
            generatedVariants = (parsed2.variants ?? []).slice(0, nVariants);
          } catch { /* fall back to empty */ }

          // Insert control + treatment variants
          const variantRows: Array<{ testId: number; name: string; contentRef: string; slug: string | null }> = [
            { testId: newTest.id, name: "Control (Original)", contentRef: origContent, slug: null },
          ];
          for (let i = 0; i < generatedVariants.length; i++) {
            const v = generatedVariants[i]!;
            const suffix = String.fromCharCode(98 + i); // 'b', 'c', 'd', ...
            const baseSlug = testType === "landing_page" && landingPageId
              ? `lp-${landingPageId}-v${suffix}`
              : null;
            variantRows.push({ testId: newTest.id, name: v.name, contentRef: v.content, slug: baseSlug });
          }

          const insertedVariants = await db.insert(abVariantsTable)
            .values(variantRows)
            .returning({ id: abVariantsTable.id, name: abVariantsTable.name });

          send({
            type: "tool_result",
            tool: "generate_ab_variants",
            data: {
              ok: true,
              abTest: {
                id: newTest.id,
                name: newTest.name,
                type: newTest.type,
                token: newTest.token,
                variants: insertedVariants,
              },
            },
          });

          await db.insert(systemActivityEventsTable).values({
            systemInstanceId: instanceId,
            eventType: "action",
            description: `A/B test created: "${newTest.name}" — ${insertedVariants.length} variants (${testType === "email_subject" ? "email subject" : "landing page"})`,
            metadata: JSON.stringify({ abTestId: newTest.id, type: testType }),
          });

          structuredData = null;
        } catch (abErr) {
          req.log.warn({ abErr }, "Failed to create A/B test from ASH generate_ab_variants");
        }
      }
    }

    // ── Server-side create_email_sequence handling ────────────────────────────
    // When ASH emits a create_email_sequence action, create an email list,
    // AI-generate sequence steps, activate the sequence, and notify the client.
    if (
      structuredData != null &&
      structuredData.action === "create_email_sequence" &&
      parsed.data.systemInstanceId != null
    ) {
      const instanceId = parsed.data.systemInstanceId;
      const [owned] = await db
        .select({ id: systemInstancesTable.id })
        .from(systemInstancesTable)
        .where(and(eq(systemInstancesTable.id, instanceId), eq(systemInstancesTable.userId, userId)))
        .limit(1);

      if (owned) {
        try {
          const listName     = (structuredData.listName as string) || "Email List";
          const seqName      = (structuredData.sequenceName as string) || "Email Sequence";
          const goal         = (structuredData.goal as string) || seqName;
          const nEmails      = Math.min(Math.max(Number(structuredData.numberOfEmails) || 5, 3), 14);

          // 1. Create the email list
          const [newList] = await db.insert(emailListsTable).values({ userId, name: listName }).returning();

          // 2. Create the sequence linked to the list
          const [newSeq] = await db.insert(emailSequencesTable).values({
            userId,
            listId: newList.id,
            name: seqName,
            description: goal,
            status: "active",
          }).returning();

          // 3. AI-generate all email steps
          const stepPrompt = `Generate a ${nEmails}-email sequence for the following goal: "${goal}".
Return ONLY valid JSON: {"emails":[{"stepNumber":1,"delayDays":0,"subject":"subject line","body":"email body (2-4 short paragraphs, plain text)"}]}
- Step 1 delayDays = 0 (immediate). Subsequent steps: 1-3 days apart.
- Keep bodies conversational, value-focused, and CAN-SPAM compliant.
- Avoid spammy words. End each email with a clear soft CTA.`;

          const genResult = await complete({
            systemPrompt: "You are an expert email marketer. Return ONLY raw JSON — no markdown, no code blocks.",
            prompt: stepPrompt,
            // User-facing email copy — use a frontier model for quality.
            models: chainFor("reasoning"),
            userId,
          });

          let emails: Array<{ stepNumber: number; delayDays: number; subject: string; body: string }> = [];
          try {
            const jsonMatch = genResult.content.match(/\{[\s\S]*\}/);
            const parsed2 = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
            emails = (parsed2.emails ?? []).slice(0, nEmails);
          } catch { /* fall back to empty */ }

          // 4. Insert steps (if AI returned them)
          let insertedSteps: Array<{ id: number; stepNumber: number; subject: string }> = [];
          if (emails.length > 0) {
            insertedSteps = await db.insert(emailSequenceStepsTable)
              .values(emails.map((e) => ({
                sequenceId: newSeq.id,
                stepNumber: e.stepNumber,
                delayDays: e.delayDays,
                subject: e.subject,
                body: e.body,
              })))
              .returning({ id: emailSequenceStepsTable.id, stepNumber: emailSequenceStepsTable.stepNumber, subject: emailSequenceStepsTable.subject });
          }

          send({
            type: "tool_result",
            tool: "create_email_sequence",
            data: {
              ok: true,
              list: { id: newList.id, name: newList.name },
              sequence: { id: newSeq.id, name: newSeq.name, status: "active", steps: insertedSteps.length },
            },
          });

          await db.insert(systemActivityEventsTable).values({
            systemInstanceId: instanceId,
            eventType: "action",
            description: `Email sequence created: "${newSeq.name}" — ${insertedSteps.length} steps, list "${newList.name}"`,
            metadata: JSON.stringify({ listId: newList.id, sequenceId: newSeq.id, steps: insertedSteps.length }),
          });

          structuredData = null;
        } catch (seqErr) {
          req.log.warn({ seqErr }, "Failed to create email sequence from ASH create_email_sequence");
        }
      }
    }

    // ── Server-side publish_content handling ─────────────────────────────────
    // When ASH emits a publish_content action and we have a verified system
    // instance, persist and dispatch the publish call immediately.
    if (
      structuredData != null &&
      structuredData.action === "publish_content" &&
      parsed.data.systemInstanceId != null
    ) {
      const instanceId = parsed.data.systemInstanceId;
      const [owned] = await db
        .select({ id: systemInstancesTable.id })
        .from(systemInstancesTable)
        .where(and(
          eq(systemInstancesTable.id, instanceId),
          eq(systemInstancesTable.userId, userId),
        ))
        .limit(1);

      if (owned) {
        try {
          // Load + decrypt user credentials
          const credRows = await db
            .select({ credentialKey: userCredentialsTable.credentialKey, encryptedValue: userCredentialsTable.encryptedValue })
            .from(userCredentialsTable)
            .where(eq(userCredentialsTable.userId, userId));

          const creds: Record<string, string> = {};
          for (const row of credRows) {
            if (row.encryptedValue) {
              try { creds[row.credentialKey] = await decrypt(row.encryptedValue); } catch { /* skip */ }
            }
          }

          const channel     = (structuredData.channel as string) ?? "";
          const contentType = (structuredData.contentType as string) ?? "post";
          const title       = (structuredData.title as string | null) ?? null;
          const content     = (structuredData.content as string) ?? "";
          const imageUrl    = (structuredData.imageUrl as string | undefined) ?? undefined;
          const listId      = (structuredData.listId as string | undefined) ?? undefined;
          const siteUrl     = (structuredData.siteUrl as string | undefined) ?? undefined;

          const videoId   = (structuredData.videoId as string | undefined) ?? undefined;
          const tags      = (structuredData.tags as string[] | undefined) ?? undefined;
          const categoryId= (structuredData.categoryId as string | undefined) ?? undefined;

          // Persist all params in metadata upfront for deterministic retries
          const publishMeta = JSON.stringify({
            ...(imageUrl   ? { imageUrl }   : {}),
            ...(listId     ? { listId }     : {}),
            ...(siteUrl    ? { siteUrl }    : {}),
            ...(videoId    ? { videoId }    : {}),
            ...(tags       ? { tags }       : {}),
            ...(categoryId ? { categoryId } : {}),
          });

          // Create pending record
          const [record] = await db.insert(publishedContentTable).values({
            systemInstanceId: instanceId,
            channel,
            contentType,
            title: title ?? null,
            content,
            status: "pending",
            metadata: publishMeta,
          }).returning();

          const publishArgs = { channel, contentType, title: title ?? undefined, content, imageUrl, listId, siteUrl, videoId, tags, categoryId };

          // Attempt publish — auto-retry once on first failure
          let result = await publish(channel, creds, publishArgs);
          let autoRetried = false;
          if (!result.ok) {
            await new Promise(r => setTimeout(r, 2000));
            result = await publish(channel, creds, publishArgs);
            autoRetried = true;
          }

          const now = new Date();
          await db.update(publishedContentTable)
            .set(
              result.ok
                ? { status: "published", publishedUrl: result.publishedUrl ?? null, publishedAt: now, metadata: JSON.stringify({ ...JSON.parse(publishMeta || "{}"), ...(result.data ?? {}) }) }
                : { status: "failed", errorMessage: result.error ?? "Unknown error", retryCount: autoRetried ? 1 : 0 }
            )
            .where(eq(publishedContentTable.id, record.id));

          await db.insert(systemActivityEventsTable).values({
            systemInstanceId: instanceId,
            eventType: result.ok ? "action" : "error",
            description: result.ok
              ? `Published to ${PUBLISHING_CHANNELS[channel]?.displayName ?? channel}: ${(title ?? content).slice(0, 80)}${result.publishedUrl ? ` — ${result.publishedUrl}` : ""}`
              : `Publish to ${PUBLISHING_CHANNELS[channel]?.displayName ?? channel} failed${autoRetried ? " (retried once)" : ""}: ${(result.error ?? "").slice(0, 200)}`,
            metadata: JSON.stringify({ channel, contentId: record.id, ok: result.ok, publishedUrl: result.publishedUrl, autoRetried }),
          });

          // Notify user when auto-retry also failed
          if (!result.ok && autoRetried) {
            await db.insert(notificationsTable).values({
              userId,
              notificationType: "error",
              title: "Content publish failed",
              message: `Publishing to ${PUBLISHING_CHANNELS[channel]?.displayName ?? channel} failed after automatic retry: ${(result.error ?? "").slice(0, 200)}. You can retry manually from the Content Calendar.`,
            }).catch(() => {});
          }

          send({
            type: "tool_result",
            tool: "publish_content",
            data: {
              ok: result.ok,
              channel,
              displayName: PUBLISHING_CHANNELS[channel]?.displayName ?? channel,
              publishedUrl: result.publishedUrl,
              error: result.error,
              autoRetried,
              contentId: record.id,
            },
          });

          // Clear so client doesn't re-process
          structuredData = null;
        } catch (pubErr) {
          req.log.warn({ pubErr }, "Failed to publish content from ASH");
        }
      }
    }

    // ── SSE progress streaming for pending video generation jobs ─────────────
    // Keep the SSE stream alive after AI text completes, emitting live provider
    // status updates for in-flight HeyGen / Runway jobs (up to 3 minutes).
    // The frontend receives media_progress and media_complete events it can use
    // to update video job cards in real time without its own polling.
    if (pendingMediaJobIds.length > 0) {
      const port = process.env.PORT ?? "8080";
      const authHeader = (req.headers["authorization"] as string) ?? "";
      const settled = new Set<string>();
      const started = Date.now();
      const MAX_POLL_MS = 3 * 60 * 1000; // 3-minute cap
      const POLL_INTERVAL_MS = 6000;

      while (settled.size < pendingMediaJobIds.length && Date.now() - started < MAX_POLL_MS) {
        await new Promise<void>(r => setTimeout(r, POLL_INTERVAL_MS));
        for (const { jobId, prompt } of pendingMediaJobIds) {
          if (settled.has(jobId)) continue;
          try {
            const pr = await fetch(
              `http://localhost:${port}/api/media-gen/jobs/${jobId}`,
              { headers: { Authorization: authHeader } },
            );
            if (!pr.ok) continue;
            const pd = (await pr.json()) as Record<string, unknown>;
            if (pd["status"] === "completed" || pd["status"] === "failed") {
              settled.add(jobId);
              send({
                type: "media_complete",
                jobId,
                status: pd["status"],
                mediaUrl: pd["mediaUrl"] ?? null,
                fileId: pd["fileId"] ?? null,
                error: pd["error"] ?? null,
                provider: pd["provider"] ?? null,
                prompt,
              });
            } else {
              send({
                type: "media_progress",
                jobId,
                status: pd["status"] ?? "active",
                progress: pd["progress"] ?? "Generating…",
                progressRatio: pd["progressRatio"] ?? null,
                provider: pd["provider"] ?? null,
                prompt,
              });
            }
          } catch { /* non-fatal — keep polling */ }
        }
      }
    }

    send({ type: "done", content: displayContent, structuredData, activatedSkills });
  } catch (err: unknown) {
    const message = publicErrorMessage(err, "ASH request failed");
    const code = (err as { code?: string })?.code;
    req.log.error({ err }, "AI orchestrator stream error");
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

  // 1. Resolve blueprint — try DB first, fall back to a synthetic object so ASH can build
  //    anything on the spot without needing a pre-seeded DB record.
  const [dbBlueprint] = await db.select().from(blueprintsTable)
    .where(eq(blueprintsTable.slug, parsed.data.blueprintSlug));

  const blueprint = dbBlueprint ?? {
    id: null as number | null,
    slug: parsed.data.blueprintSlug,
    name: parsed.data.systemName ?? "Custom System",
    description: "Custom AI-designed system built on the spot by ASH.",
    difficulty: "beginner",
    categoryId: null as number | null,
    priceCredits: 0,
    estimatedCost: null as string | null,
    estimatedTime: null as string | null,
    status: "active",
    version: "1.0",
    authorUserId: null as number | null,
    source: "ai",
    reviewStatus: "approved",
    salesCount: 0,
    ratingAvg: 0,
    ratingCount: 0,
    rejectionReason: null as string | null,
    estimatedEarnings: null as string | null,
    requiredTools: null as string | null,
    setupSteps: null as string | null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // 2. Create system instance — blueprintId is nullable for custom/on-the-spot builds
  const [instance] = await db.insert(systemInstancesTable).values({
    userId,
    blueprintId: blueprint.id ?? undefined,
    name: parsed.data.systemName ?? `My ${blueprint.name}`,
    buildStatus: "building",
  }).returning();

  // 3. Persist build-provided credentials as THIS instance's own copy.
  // Credentials supplied during a build are scoped to the new system instance so
  // building a second system of the same type never overwrites the first one's
  // tokens. Existing NULL-scoped (Connections Hub / OAuth) rows are never touched
  // here — we only ever update/insert rows belonging to this instance.
  const instanceScopedCreds = await db
    .select({ credentialKey: userCredentialsTable.credentialKey, id: userCredentialsTable.id })
    .from(userCredentialsTable)
    .where(and(
      eq(userCredentialsTable.userId, userId),
      eq(userCredentialsTable.systemInstanceId, instance.id),
    ));

  const instanceKeyMap = Object.fromEntries(instanceScopedCreds.map((c) => [c.credentialKey, c]));

  // Upsert each credential from the request against this instance's scope only.
  if (parsed.data.credentials.length > 0) {
    await Promise.all(
      parsed.data.credentials.map(async (cred) => {
        const encryptedValue = encrypt(cred.value);
        const existing = instanceKeyMap[cred.key];
        if (existing) {
          await db.update(userCredentialsTable)
            .set({ encryptedValue, updatedAt: new Date() })
            .where(eq(userCredentialsTable.id, existing.id));
        } else {
          await db.insert(userCredentialsTable).values({
            userId,
            credentialKey: cred.key,
            encryptedValue,
            systemInstanceId: instance.id,
          });
        }
      })
    );
  }

  // 3b. Decrypt the credentials visible to THIS build — shared user-level rows
  //     (systemInstanceId IS NULL) plus this instance's own scoped rows, with the
  //     instance-scoped value winning on key collision — so the AI build context
  //     references the right tokens when orchestrating live integrations.
  const allStoredCreds = await db
    .select({
      credentialKey: userCredentialsTable.credentialKey,
      encryptedValue: userCredentialsTable.encryptedValue,
      systemInstanceId: userCredentialsTable.systemInstanceId,
    })
    .from(userCredentialsTable)
    .where(and(
      eq(userCredentialsTable.userId, userId),
      or(
        isNull(userCredentialsTable.systemInstanceId),
        eq(userCredentialsTable.systemInstanceId, instance.id),
      ),
    ));

  // Apply NULL-scoped rows first, then instance-scoped so the instance copy wins.
  allStoredCreds.sort((a, b) => (a.systemInstanceId === null ? 0 : 1) - (b.systemInstanceId === null ? 0 : 1));

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
        // Drives the user-facing build plan — use a frontier model for quality.
        models: chainFor("reasoning"),
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

// ── POST /api/ai-orchestrator/transcribe — voice-to-text via OpenRouter ───────
// Accepts multipart form-data with an "audio" file field (m4a/wav/webm).
// On native mobile, expo-av records and sends audio; this endpoint transcribes
// it using OpenAI-compatible speech-to-text via OpenRouter.
router.post("/ai-orchestrator/transcribe", async (req, res) => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;

  try {
    const multer = await import("multer");
    // H-06 fix: add fileFilter so only audio/* files (plus raw octet-stream as sent
    // by some mobile clients) are accepted; any other MIME type is rejected with 400.
    const upload = multer.default({
      storage: multer.memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith("audio/") || file.mimetype === "application/octet-stream") {
          cb(null, true);
        } else {
          // H-06: reject non-audio MIME types; multer will set req.file=undefined
          // which the existing "No audio file provided" guard below will catch.
          cb(null, false);
        }
      },
    });

    await new Promise<void>((resolve, reject) => {
      upload.single("audio")(req as any, res as any, (err: unknown) => {
        if (err) reject(err); else resolve();
      });
    });

    const file = (req as unknown as { file?: { buffer: Buffer; originalname: string; mimetype: string } }).file;
    if (!file) {
      res.status(400).json({ error: "No audio file provided." });
      return;
    }

    const apiKey = process.env["OPENROUTER_API_KEY"];
    if (!apiKey) {
      res.status(503).json({ error: "AI service not configured." });
      return;
    }

    const form = new FormData();
    const blob = new Blob([file.buffer as unknown as ArrayBuffer], { type: file.mimetype || "audio/m4a" });
    form.append("file", blob, file.originalname || "audio.m4a");
    form.append("model", "openai/whisper-1");

    const response = await fetch("https://openrouter.ai/api/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!response.ok) {
      const errText = await response.text();
      req.log.warn({ status: response.status, err: errText }, "Transcription service error");
      res.status(502).json({ error: "Transcription service unavailable. Please type your message instead." });
      return;
    }

    const result = (await response.json()) as { text: string };
    req.log.info({ userId, chars: result.text?.length ?? 0 }, "Voice transcription completed");
    res.json({ text: result.text ?? "" });
  } catch (err) {
    req.log.error({ err }, "Transcribe endpoint error");
    res.status(500).json({ error: "Transcription failed. Please type your message instead." });
  }
});

// ── POST /api/ai-orchestrator/step-recovery ──────────────────────────────────
// Streams an AI-generated explanation for a failed build step as an SSE
// `error_recovery` event. Called by the frontend immediately after a build step
// fails so the user receives a contextual, actionable explanation before seeing
// the Retry/Skip recovery card.
router.post("/ai-orchestrator/step-recovery", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const schema = z.object({
    stepDescription: z.string().max(1000),
    errorMessage: z.string().max(500).optional(),
    stepNumber: z.number().int().optional(),
    systemInstanceId: z.number().int().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (event: object) => res.write(`data: ${JSON.stringify(event)}\n\n`);

  let explanation = "Try retrying the step — transient AI errors often resolve on retry. If it keeps failing, you can skip this step and continue the build.";
  try {
    const result = await complete({
      prompt: `A build automation step failed during an AI income-system deployment.\nStep ${parsed.data.stepNumber ?? "?"}: "${parsed.data.stepDescription}"\nError: ${parsed.data.errorMessage ?? "AI model unavailable"}\n\nIn 2-3 sentences, explain what likely went wrong and give the most actionable advice for whether to retry or skip this step.`,
      // User-facing diagnostic explanation — use a strong general model.
      model: MODELS.swift,
      userId,
      systemInstanceId: parsed.data.systemInstanceId,
    });
    explanation = result.content.trim().replace(/<[^>]+>/g, "").slice(0, 400);
  } catch {
    /* use default explanation */
  }

  send({ type: "error_recovery", explanation });
  send({ type: "done" });
  res.end();
});

// ── GET /api/ai-orchestrator/brain ───────────────────────────────────────────
// The visible "what ASH has learned" surface (Task #312): returns distilled
// lessons + aggregate learning stats. Honest empty state when the brain is new.
router.get("/ai-orchestrator/brain", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;
  try {
    const overview = await getBrainOverview();
    res.json(overview);
  } catch (err) {
    req.log.error({ err }, "Failed to load ASH brain overview");
    res.status(500).json({ error: "Failed to load ASH brain" });
  }
});

// ── POST /api/ai-orchestrator/brain/distill ──────────────────────────────────
// Admin-only manual trigger of a brain distillation pass (the scheduler runs it
// daily automatically). Useful for verification and after seeding outcomes.
router.post("/ai-orchestrator/brain/distill", async (req, res): Promise<void> => {
  const admin = await requireAdmin(req, res);
  if (admin === null) return;
  try {
    const result = await distillAshBrain();
    res.json({ success: true, ...result });
  } catch (err) {
    req.log.error({ err }, "Manual ASH brain distillation failed");
    res.status(500).json({ error: "Distillation failed" });
  }
});

export default router;
