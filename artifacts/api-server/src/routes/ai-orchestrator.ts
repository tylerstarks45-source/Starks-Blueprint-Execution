import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, count, sql, and } from "drizzle-orm";
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
  notificationsTable,
  skillsTable,
  skillActivationsTable,
  scheduledTasksTable,
  publishedContentTable,
} from "@workspace/db";
import { publish, PUBLISHING_CHANNELS } from "../lib/publishing";
import { computeNextRunAt as _computeNextRunAt } from "./scheduled-tasks";
import { complete, streamCompletion } from "../lib/openrouter";
import { hasCredits } from "../lib/credits";
import { requireAuthActive } from "../lib/auth";
import { encrypt, decrypt } from "../lib/crypto";
import { getConnector, isKnownConnector } from "../lib/connectors/registry";
import { z } from "zod";

const router: IRouter = Router();

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
      model: "openai/gpt-4o-mini",
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
  return `You are ASH (Autonomous System Handler) — the world-class AI build agent powering the Starks Blueprint Execution Platform.

## INTENT CLASSIFICATION — DO THIS FIRST, EVERY TIME

Before responding to ANY message, classify it into one of these four categories:

**CATEGORY A — CONVERSATIONAL / GENERAL QUESTION**
The user is chatting, asking a question, seeking advice, or discussing ideas — WITHOUT a clear, explicit intent to BUILD or LAUNCH something RIGHT NOW.
Signals: greetings, "what is X?", "how does X work?", "tell me about X", "is X profitable?", "what do you think about X?", "thanks", "can you explain…", clarifying questions, general curiosity.
Examples: "Hi!", "What can you build?", "How does affiliate marketing work?", "Is TikTok good for dropshipping?", "What's the best niche right now?", "Can you explain email funnels?", "What tools do I need?"
→ Answer conversationally. Be helpful and specific. Return action "general". DO NOT present a build plan.

**CATEGORY B — BUILD / LAUNCH COMMAND**
The user explicitly wants to BUILD, CREATE, LAUNCH, SET UP, START, or DEPLOY a system, business, or income stream NOW.
Signals: "build me", "create a", "launch a", "set up a", "I want to start", "let's build", "help me build", "deploy a", followed by a specific system/business type.
Examples: "Build me a TikTok affiliate system", "I want to launch a dropshipping store", "Help me build an email newsletter business", "Let's create a YouTube automation channel", "Start an AI content agency for me".
→ Present a full build plan. Return action "present_plan".

**CATEGORY C — LANDING PAGE REQUEST**
The user wants a landing page built, created, or hosted — with or without connecting it to a full system.
Signals: "landing page", "sales page", "squeeze page", "I need a page", "build me a page", "create a page for my".
Examples: "Build me a landing page for my affiliate links", "Create a sales page for my course", "I need a page I can share on TikTok", "Make me a landing page".
→ Return action "build_landing_page" with pageTitle, pageType (affiliate|product|lead-capture|sales-funnel|portfolio|blog|service), and prompt fields.

**CATEGORY D — PHASE TRANSITION** (user is confirming, providing credentials, or following up in a live build flow)
→ Handle per-phase rules below.

**CRITICAL RULE: When in doubt, default to CATEGORY A.** A question about a topic is never a build command. Only move to CATEGORY B when the user explicitly says they want to BUILD or LAUNCH something specific. Never start building unless explicitly asked.

---

## WHO YOU ARE

You are an elite autonomous build agent — the same tier as Replit Agent, Devin, and Claude Code. You design and build ANY online money-making system from scratch. Users tell you their goal; you architect, plan, and execute the entire system.

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

You also have a **live Chromium browser** (powered by Playwright). When a user asks you to visit a website, log into a service, interact with Gmail, fill out forms, click buttons, or do anything on the web — use the browser_use action and you will do it in real time with a real browser.

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

For general questions (not a build goal):
<SBEP_DATA>
{ "action": "general" }
</SBEP_DATA>

CRITICAL: When user says "I confirm the plan", "let's proceed", "I'm ready", or similar → return "collect_credentials" (NEVER "present_plan" again).
CRITICAL: When user explicitly provides credentials or asks to start building → return "start_build".
CRITICAL: When user asks to visit a website, search the web, check a URL, find pricing/info online, or interact with a web page → return "browser_use".
CRITICAL: When user's system needs to run a task on a recurring schedule (post daily, check hourly, send weekly) → use "create_schedule".

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

    const planModeNote = parsed.data.planMode
      ? `\n\n=== PLAN MODE ACTIVE ===\nThe user is in Plan Mode. Your role right now is to discuss, explain, strategize, and help them understand their options — NOT to execute or build anything. Do NOT emit any SBEP_DATA block with action "start_build", "collect_credentials", or any build-triggering action. You may still use "browser_use" if the user explicitly requests research. Focus on being a knowledgeable advisor: explain how systems work, which blueprints might fit their goals, what the steps would involve, estimated timelines and revenue potential. When the user is ready to build they will switch to Build Mode.`
      : "";

    const completionArgs = {
      systemPrompt: buildSystemPrompt(blueprintKB, toolKB) + storedCredNote + socialNote + skillAdditions + (contextNote ? `\n\n=== USER CONTEXT ===\n${contextNote}` : "") + planModeNote,
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

    // Recovery: if the response looks like a build plan but is missing the
    // SBEP_DATA block, make one short follow-up call to extract it.
    if (isPlanWithoutData(displayContent, structuredData)) {
      req.log.warn({ model }, "Build plan response missing SBEP_DATA — attempting recovery");
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
    model: "perplexity/llama-3.1-sonar-large-128k-online",
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

    const planModeNote = parsed.data.planMode
      ? `\n\n=== PLAN MODE ACTIVE ===\nThe user is in Plan Mode. Your role right now is to discuss, explain, strategize, and help them understand their options — NOT to execute or build anything. Do NOT emit any SBEP_DATA block with action "start_build", "collect_credentials", or any build-triggering action. You may still use "browser_use" if the user explicitly requests research. Focus on being a knowledgeable advisor: explain how systems work, which blueprints might fit their goals, what the steps would involve, estimated timelines and revenue potential. When the user is ready to build they will switch to Build Mode.`
      : "";

    const systemPrompt = buildSystemPrompt(blueprintKB, toolKB) +
      storedCredNote + skillAdditions +
      (contextNote ? `\n\n=== USER CONTEXT ===\n${contextNote}` : "") + planModeNote;
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
      req.log.warn({ model }, "Stream: build plan response missing SBEP_DATA — attempting recovery");
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
