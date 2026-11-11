import { Router, type IRouter } from "express";
import { and, desc, like } from "drizzle-orm";
import { db, userMemoryTable, blueprintsTable } from "@workspace/db";
import { requireAuthActive } from "../lib/auth";
import { complete, streamCompletion } from "../lib/openrouter";
import { MODELS } from "../lib/models";
import { z } from "zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const PERPLEXITY_MODEL = MODELS.research;
const ANALYSIS_MODEL = MODELS.utility;

// ─── Tool input schemas ───────────────────────────────────────────────────────

const toolSchemas = {
  niche_finder: z.object({ topic: z.string().min(1).max(200) }),
  competitor_spy: z.object({ target: z.string().min(1).max(300) }),
  keyword_goldmine: z.object({ niche: z.string().min(1).max(200) }),
  idea_validator: z.object({ idea: z.string().min(5).max(500) }),
  trend_radar: z.object({ category: z.string().optional().default("online business and AI automation") }),
  blueprint_matcher: z.object({
    goal: z.string().min(5).max(500),
    budget: z.string().optional().default("$100–$500/month"),
    timeframe: z.string().optional().default("3–6 months"),
  }),
} as const;

type ToolName = keyof typeof toolSchemas;

// ─── Search query generators ─────────────────────────────────────────────────

function getSearchQueries(tool: ToolName, input: Record<string, string>): string[] {
  switch (tool) {
    case "niche_finder":
      return [
        `${input.topic} most profitable sub-niches affiliate marketing opportunities 2024`,
        `${input.topic} niche competition level search volume monetization potential`,
      ];
    case "competitor_spy":
      return [
        `${input.target} business model pricing revenue funnel strategy`,
        `${input.target} marketing traffic sources content strategy affiliate program`,
      ];
    case "keyword_goldmine":
      return [
        `${input.niche} long tail keywords low competition affiliate blog content`,
        `best keywords for ${input.niche} search volume SEO ranking difficulty`,
      ];
    case "idea_validator":
      return [
        `${input.idea} market demand size competition 2024`,
        `${input.idea} monetization affiliate programs audience profitability`,
      ];
    case "trend_radar":
      return [
        `trending niches ${input.category} 2024 2025 rising opportunities`,
        `viral content formats ${input.category} social media marketing trends`,
      ];
    case "blueprint_matcher":
      return [
        `best way to achieve ${input.goal} online business realistic income`,
        `${input.goal} beginner strategy budget ${input.budget ?? "low budget"}`,
      ];
  }
}

// ─── System prompt builders ───────────────────────────────────────────────────

function buildSystemPrompt(
  tool: ToolName,
  input: Record<string, string>,
  searchData: string,
  blueprints: Array<{ name: string; slug: string; description: string | null; difficulty: string | null; estimatedCost: string | null; estimatedTime: string | null }>,
): string {
  switch (tool) {
    case "niche_finder":
      return `You are ASH, the world-class business research AI powering the Starks Blueprint Execution Platform. Generate a thorough, actionable niche intelligence report.

## Live Market Research Data:
${searchData}

Produce a detailed Markdown report for the topic: "${input.topic}"

# 🎯 Niche Intelligence Report: ${input.topic}

## Overview
[2-3 sentences about the market landscape for this topic]

---

## Top 10 Sub-Niches (Ranked by Opportunity)

For each sub-niche, use exactly this format:

### #1: [Sub-Niche Name]
- **Competition Level**: Low / Medium / High
- **Search Volume**: ~X,XXX–XX,XXX searches/month (estimate)
- **Revenue Potential**: $X,XXX–$X,XXX/month within 6–12 months
- **Best Affiliate Programs**: [Name] (X% commission), [Name] (X%), [Name] (X%)
- **Top Content Angle**: [The specific angle that wins in this niche]
- **Quick Win**: [The fastest path to the first commission]

[Repeat for all 10 sub-niches]

---

## 📊 Ranking Summary
| Rank | Sub-Niche | Competition | Revenue Potential | Ease of Entry |
|------|-----------|-------------|-------------------|---------------|
| 1 | ... | Low | $X–$X/mo | ⭐⭐⭐⭐⭐ |
[All 10 rows]

---

## 🚀 ASH Recommendation
**Best niche for a beginner**: [Name] — [1 sentence why]
**Best for highest earnings**: [Name] — [1 sentence why]
**Fastest to first dollar**: [Name] — [1 sentence why]

Be specific. Include real affiliate program names. Make every data point actionable.`;

    case "competitor_spy":
      return `You are ASH, an elite competitive intelligence AI. Analyze the research data and produce a comprehensive competitor intelligence report.

## Live Research Data:
${searchData}

Produce a detailed competitor intelligence report for: "${input.target}"

# 🕵️ Competitor Intelligence Report: ${input.target}

## Business Profile
- **Business Model**: [How they make money — be specific]
- **Target Audience**: [Who they serve, demographics, pain points]
- **Scale/Reach**: [Estimated size, traffic, revenue if known]
- **Core Product/Service**: [What they actually sell]

---

## 💰 Revenue & Pricing Strategy
[Detail their pricing tiers, upsells, subscriptions]
- **Entry Price**: [Lowest tier]
- **Core Offer**: [Main product/price]
- **High Ticket**: [Premium tier if any]
- **Recurring Revenue**: [Subscriptions, memberships?]

---

## 📣 Marketing & Traffic Sources
| Channel | Estimated % of Traffic | What Works for Them |
|---------|----------------------|---------------------|
| Organic Search | X% | ... |
| Social Media | X% | ... |
| Paid Ads | X% | ... |
| Email | X% | ... |
| Referral | X% | ... |

**Content Strategy**: [What type of content they produce and why it works]
**Ad Strategy**: [If they run ads, what platforms and what angles]

---

## 🔄 Funnel Breakdown
1. **Awareness**: [How they attract cold traffic]
2. **Lead Capture**: [How they build their list]
3. **Nurture**: [Email sequences, content, retargeting]
4. **Conversion**: [What drives the sale]
5. **Upsell/Retention**: [Post-purchase strategy]

---

## 🤝 Affiliate & Partner Program
- **Has Affiliate Program**: Yes/No
- **Commission Rate**: X%
- **Cookie Duration**: X days
- **Best Performing Affiliates**: [Types of affiliates that work for them]

---

## ⚔️ Weaknesses & Gaps
1. [Specific weakness you can exploit]
2. [Gap in their offering]
3. [Underserved audience segment they miss]

---

## 🎯 Counter-Strategy to Beat Them
[Specific, actionable strategy to compete with and win against this competitor]

Be specific with real data from the research. Make every finding actionable.`;

    case "keyword_goldmine":
      return `You are ASH, an expert SEO and keyword research AI. Generate a comprehensive keyword report with 50+ keywords.

## Live Research Data:
${searchData}

Produce a detailed keyword goldmine report for the niche: "${input.niche}"

# 🔑 Keyword Goldmine: ${input.niche}

## Market Overview
[1-2 sentences on keyword landscape for this niche]

---

## 🏆 Tier 1 — Low Competition, High Buying Intent (Target First)
| Keyword | Est. Monthly Searches | Difficulty | Buyer Intent | Best Affiliate Angle |
|---------|----------------------|------------|--------------|---------------------|
[15+ keywords — include specific long-tail buying intent keywords]

---

## 💎 Tier 2 — Medium Competition, High Value Keywords
| Keyword | Est. Monthly Searches | Difficulty | Content Type | Monetization |
|---------|----------------------|------------|--------------|--------------|
[15+ keywords — informational but monetizable]

---

## 🌱 Tier 3 — Long-tail Goldmine (Quick Ranking Wins)
| Keyword | Est. Monthly Searches | Difficulty | Article Idea |
|---------|----------------------|------------|--------------|
[20+ very specific long-tail keywords]

---

## 📝 Top 10 Content Ideas (Priority Order)
1. **[Article Title]** — Target keywords: [list] — Est. monthly traffic potential: X visits
2. ...
[10 content ideas based on keyword clusters]

---

## 🗺️ 30-Day Content Roadmap
**Week 1**: [Which 2-3 articles to write first and why]
**Week 2**: [Next set with internal linking strategy]
**Week 3-4**: [Higher competition targets]

---

## 💰 Monetization Map
For each keyword cluster, the best affiliate programs to promote:
- **[Cluster]**: [Affiliate Program] — X% commission — avg. order $X
[3-5 clusters with specific programs]

Provide real keyword data based on the research. Be specific with estimates.`;

    case "idea_validator":
      return `You are ASH, a rigorous business validation AI. Run a comprehensive 5-point validation analysis.

## Live Market Research:
${searchData}

Validate this business idea: "${input.idea}"

# ✅ Business Idea Validation Report

---

## 🎯 Overall Viability Score: [X/100]
**Verdict**: [STRONG GO / GO WITH MODIFICATIONS / MARGINAL / AVOID — one sentence why]

---

## 5-Point Validation Framework

### 1. 📈 Market Demand — [X/20 points]
**Evidence from Research**:
- [Specific data point 1]
- [Specific data point 2]
- [Specific data point 3]
**Verdict**: ✅ Pass / ⚠️ Marginal / ❌ Fail
**Key Insight**: [1 sentence]

### 2. ⚔️ Competition Analysis — [X/20 points]
**Evidence from Research**:
- [Main competitors and their weaknesses]
- [Market saturation level]
- [Your potential differentiator]
**Verdict**: ✅ Pass / ⚠️ Marginal / ❌ Fail
**Your Edge**: [How to stand out]

### 3. 💰 Monetization Potential — [X/20 points]
**Revenue Paths**:
1. [Primary monetization method] — Est. $X/month at X units
2. [Secondary monetization] — Est. $X/month
3. [Additional revenue stream]
**6-Month Revenue Projection**: Conservative $X/mo, Realistic $X/mo
**Verdict**: ✅ Pass / ⚠️ Marginal / ❌ Fail

### 4. 👥 Audience Accessibility — [X/20 points]
**Target Customer**: [Specific persona]
**Where to Find Them**: [Specific platforms and communities]
**Acquisition Cost Estimate**: ~$X per customer
**Verdict**: ✅ Pass / ⚠️ Marginal / ❌ Fail

### 5. ⚡ Effort-to-Return Ratio — [X/20 points]
**Time to First Revenue**: [Honest estimate]
**Required Skills**: [What you need to execute]
**Startup Cost**: ~$X/month
**Break-even Timeline**: [When it becomes profitable]
**Verdict**: ✅ Pass / ⚠️ Marginal / ❌ Fail

---

## 🔧 If You Proceed — 5 Critical Improvements
1. [Specific modification to maximize success]
2. [Differentiation tactic]
3. [Risk mitigation]
4. [Quick win to validate before going all-in]
5. [Scale trigger — what to do when it works]

---

## 🚦 ASH Final Verdict
[Decisive recommendation with the exact first step to take today]

Be honest and specific. Base every score on the research data.`;

    case "trend_radar":
      return `You are ASH, a real-time trend intelligence AI. Analyze current market data and produce a comprehensive trend report.

## Live Research Data (current as of ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}):
${searchData}

Produce a trend intelligence report for: "${input.category}"

# 📡 Trend Radar Report
*Category: ${input.category} | Date: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}*

---

## 🔥 Top 5 Hottest Trends Right Now
For each trend:

### 🔥🔥🔥 Trend #1: [Trend Name]
- **Heat Level**: 🔥🔥🔥 Exploding / 🔥🔥 Growing / 🔥 Rising
- **What's Driving It**: [Specific reason this is trending]
- **Revenue Opportunity**: $X–$X/month for a new entrant
- **Best Platform**: [Where this trend lives]
- **How to Enter TODAY**: [Step-by-step action]
- **Time Sensitivity**: [Act now / 3-6 months / Early stage]

[Repeat for all 5 trends]

---

## 📱 Viral Content Formats Winning Right Now
| Format | Platform | Avg Engagement | Revenue Potential | Ease |
|--------|----------|---------------|-------------------|------|
| ... | ... | ... | ... | ⭐⭐⭐ |
[8+ rows of specific formats]

---

## ⬆️ Rising Opportunities (Get In Early)
[3-5 trends that are growing but not yet saturated — early movers win big here]

### [Opportunity Name]
- **Current Stage**: Early / Growing
- **Why Act Now**: [The window that's open]
- **Potential**: [Revenue estimate at scale]
- **Action**: [What to do in the next 30 days]

---

## ⬇️ Fading Trends (Avoid Investing Here)
| Trend | Status | Why It's Declining | Pivot Opportunity |
|-------|--------|-------------------|-------------------|
[3-4 declining trends with pivot ideas]

---

## 🎯 ASH Top Pick This Month
**The single best opportunity to act on right now**: [Name]
**Why**: [Data-backed reason]
**Your first 3 steps**:
1. [Action today]
2. [Action this week]
3. [Action this month]

Ground everything in the research data. Be specific about platforms, niches, and income numbers.`;

    case "blueprint_matcher": {
      const bpList = blueprints.map(b =>
        `- **${b.name}** (slug: ${b.slug}) | ${b.description ?? "AI automation system"} | Difficulty: ${b.difficulty ?? "Medium"} | Cost: ${b.estimatedCost ?? "Varies"}/mo | Setup: ${b.estimatedTime ?? "2-4 hours"}`,
      ).join("\n");
      return `You are ASH, the expert system architect of the Starks Blueprint Execution Platform. Match the user's goal to the perfect blueprints and create a custom action plan.

## Available SBEP Blueprints:
${bpList}

## Market Research Data:
${searchData}

## User Goal: ${input.goal}
## Budget: ${input.budget ?? "$100–$500/month"}
## Timeframe: ${input.timeframe ?? "3–6 months"}

Produce a detailed blueprint matching report:

# 🧩 Blueprint Match Report

## Goal Analysis
[2-3 sentences analyzing what this person actually needs based on their goal, budget, and timeframe]

---

## 🥇 Match #1 — Best Fit: [Blueprint Name]
**Blueprint Slug**: [slug]
**Match Score**: [X/100] — [One sentence why this is the top match]
**Why It Fits**: [3 specific reasons this blueprint matches their goal]

### Expected Results for Your Goal
- **Month 1**: [What they'll have built / first income milestone]
- **Month 3**: Conservative $X/mo, Realistic $X/mo
- **Month 6**: Conservative $X/mo, Realistic $X/mo
- **Time to First Revenue**: [Honest estimate]

### Custom Action Plan — [Their Specific Goal]
1. **Week 1**: [Specific action using this blueprint]
2. **Week 2**: [Next step]
3. **Week 3–4**: [Milestone action]
4. **Month 2**: [Growth action]
5. **Month 3+**: [Scale action]

### Required Tools & Budget Breakdown
| Tool | Purpose | Monthly Cost |
|------|---------|--------------|
[3-5 tools with specific costs]
**Total Monthly Cost**: ~$X/month (within their budget: ${input.budget ?? "$100–$500/month"})

---

## 🥈 Match #2 — Strong Alternative: [Blueprint Name]
**Blueprint Slug**: [slug]
**Why Consider This**: [When this is actually better than #1]
**Best For**: [Specific type of person who should pick this instead]
**Expected Month 6 Income**: $X–$X/mo

---

## 🥉 Match #3 — High Upside / More Effort: [Blueprint Name]
**Blueprint Slug**: [slug]
**Why Consider This**: [Higher ceiling, more work]
**Best For**: [More ambitious / experienced person]
**Expected Month 6 Income**: $X–$X/mo (if executed well)

---

## 🎯 ASH Decision
**My recommendation for you**: [Blueprint Name]
**Reason**: [Direct, confident reasoning based on their specific budget (${input.budget ?? "$100–$500/month"}) and timeframe (${input.timeframe ?? "3–6 months"})]
**Start here today**: [Exact first action to take right now]

Be decisive and specific. Match blueprints only from the list above using exact slugs.`;
    }
  }
}

// ─── GET /api/research/history ────────────────────────────────────────────────

router.get("/research/history", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  try {
    const { eq } = await import("drizzle-orm");
    const rows = await db
      .select()
      .from(userMemoryTable)
      .where(and(
        eq(userMemoryTable.userId, userId),
        like(userMemoryTable.memoryKey, "research:%"),
      ))
      .orderBy(desc(userMemoryTable.createdAt))
      .limit(20);

    const history = rows.map(r => {
      try {
        const parsed = JSON.parse(r.memoryValue) as Record<string, unknown>;
        return { id: r.id, ...parsed, createdAt: r.createdAt };
      } catch {
        return { id: r.id, tool: "unknown", input: "", summary: r.memoryValue.slice(0, 100), createdAt: r.createdAt };
      }
    });

    res.json(history);
  } catch (err) {
    logger.error({ err }, "research/history failed");
    res.status(500).json({ error: "Failed to load history" });
  }
});

// ─── POST /api/research/:tool — SSE streaming research ───────────────────────

router.post("/research/:tool", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const toolName = req.params.tool as ToolName;
  if (!(toolName in toolSchemas)) {
    res.status(404).json({ error: `Unknown research tool: ${toolName}` });
    return;
  }

  const schema = toolSchemas[toolName];
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const input = parsed.data as Record<string, string>;

  // Set up SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let closed = false;
  req.on("close", () => { closed = true; });

  const sse = (data: Record<string, unknown>): boolean => {
    if (closed) return false;
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      return true;
    } catch {
      return false;
    }
  };

  try {
    // Phase 1: Perplexity web searches (parallel)
    const queries = getSearchQueries(toolName, input);
    sse({ type: "step", label: "Searching the web for real-time data…", step: 1, total: 3 });

    const searchResults = await Promise.all(
      queries.map(async (query) => {
        try {
          const result = await complete({
            prompt: query,
            model: PERPLEXITY_MODEL,
            userId,
          });
          return `### Research: "${query}"\n${result.content}`;
        } catch {
          return `### Research: "${query}"\n[Web search unavailable — using base knowledge]`;
        }
      }),
    );

    if (closed) return;
    const searchData = searchResults.join("\n\n");
    sse({ type: "step", label: "Processing research data with ASH…", step: 2, total: 3 });

    // Phase 2: Load blueprints if needed
    let blueprints: Array<{ name: string; slug: string; description: string | null; difficulty: string | null; estimatedCost: string | null; estimatedTime: string | null }> = [];
    if (toolName === "blueprint_matcher") {
      blueprints = await db
        .select({
          name: blueprintsTable.name,
          slug: blueprintsTable.slug,
          description: blueprintsTable.description,
          difficulty: blueprintsTable.difficulty,
          estimatedCost: blueprintsTable.estimatedCost,
          estimatedTime: blueprintsTable.estimatedTime,
        })
        .from(blueprintsTable);
    }

    if (closed) return;
    sse({ type: "step", label: "Generating your research report…", step: 3, total: 3 });

    // Phase 3: Stream the GPT-4o-mini analysis
    const systemPrompt = buildSystemPrompt(toolName, input, searchData, blueprints);
    let fullContent = "";

    for await (const chunk of streamCompletion({
      systemPrompt,
      prompt: "Generate the complete research report exactly as specified. Be thorough, specific, and data-driven. Every section must be fully filled out.",
      model: ANALYSIS_MODEL,
      userId,
    })) {
      if (closed) break;
      fullContent += chunk;
      sse({ type: "chunk", text: chunk });
    }

    // Phase 4: Persist to user_memory
    const toolLabels: Record<ToolName, string> = {
      niche_finder: "Niche Finder",
      competitor_spy: "Competitor Spy",
      keyword_goldmine: "Keyword Goldmine",
      idea_validator: "Idea Validator",
      trend_radar: "Trend Radar",
      blueprint_matcher: "Blueprint Matcher",
    };

    const inputSummary = Object.entries(input)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");

    try {
      await db.insert(userMemoryTable).values({
        userId,
        memoryKey: `research:${toolName}:${Date.now()}`,
        memoryValue: JSON.stringify({
          tool: toolName,
          toolLabel: toolLabels[toolName],
          input: inputSummary,
          summary: fullContent.slice(0, 400),
          completedAt: new Date().toISOString(),
        }),
      });
    } catch (memErr) {
      logger.warn({ memErr }, "Failed to save research to user_memory");
    }

    if (!closed) {
      sse({ type: "done", tool: toolName, inputSummary });
      res.end();
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Research failed";
    logger.error({ err, tool: toolName }, "Research tool error");
    if (!closed) {
      sse({ type: "error", message: msg });
      res.end();
    }
  }
});

export default router;
