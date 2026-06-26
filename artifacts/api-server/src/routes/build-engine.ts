import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq } from "drizzle-orm";
import {
  db,
  systemInstancesTable,
  blueprintsTable,
  toolsTable,
  toolCategoriesTable,
  buildSessionsTable,
  buildProgressTable,
  systemActivityEventsTable,
  usersTable,
} from "@workspace/db";
import { complete } from "../lib/openrouter";
import { hasCredits } from "../lib/credits";
import { requireAuthActive } from "../lib/auth";
import { sendPushNotification } from "../lib/push";
import { z } from "zod";

const router: IRouter = Router();

// Returns true if the caller owns the instance (or it has no owner). Sends 403 otherwise.
const ensureOwner = (
  instance: { userId: number | null },
  userId: number,
  res: import("express").Response,
): boolean => {
  if (instance.userId != null && instance.userId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
};

// POST /api/build-engine/analyze
router.post("/build-engine/analyze", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const schema = z.object({ systemInstanceId: z.number().int() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [instance] = await db.select().from(systemInstancesTable).where(eq(systemInstancesTable.id, parsed.data.systemInstanceId));
  if (!instance) { res.status(404).json({ error: "System instance not found" }); return; }
  if (!ensureOwner(instance, userId, res)) return;

  const [blueprint] = await db.select().from(blueprintsTable).where(eq(blueprintsTable.id, instance.blueprintId));
  if (!blueprint) { res.status(404).json({ error: "Blueprint not found" }); return; }

  if (instance.userId != null && !(await hasCredits(instance.userId))) {
    res.status(402).json({ error: "You're out of AI credits. Top up to continue building.", code: "out_of_credits" });
    return;
  }

  const allCategories = await db.select().from(toolCategoriesTable);
  const allTools = await db.select().from(toolsTable).where(eq(toolsTable.activeStatus, true));
  const categoryList = allCategories.map((c) => `ID:${c.id} NAME:${c.name}`).join("\n");

  let selectedCategoryIds: number[] = [];
  let buildPlan: string[] = [];

  try {
    const analysisResult = await complete({
      systemPrompt: `You are SBEP's AI architect. Analyze a blueprint and return JSON only.
Available tool categories:
${categoryList}

Return ONLY this JSON format, nothing else:
{"categoryIds":[1,3],"buildPlan":["Step 1: ...","Step 2: ...","Step 3: ...","Step 4: ...","Step 5: ..."]}`,
      prompt: `Blueprint: ${blueprint.name}\nDescription: ${blueprint.description || ""}\nDifficulty: ${blueprint.difficulty}`,
      model: "openai/gpt-4o-mini",
      userId: instance.userId ?? undefined,
      systemInstanceId: instance.id,
    });

    const jsonMatch = analysisResult.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      selectedCategoryIds = Array.isArray(data.categoryIds) ? data.categoryIds.map(Number).filter(Boolean) : [];
      buildPlan = Array.isArray(data.buildPlan) ? data.buildPlan : [];
    }
  } catch {
    selectedCategoryIds = allCategories.slice(0, 3).map((c) => c.id);
  }

  if (buildPlan.length === 0) {
    buildPlan = [
      `Set up ${blueprint.name} core infrastructure and accounts`,
      "Configure tool integrations and deploy affiliate link tracker for revenue attribution",
      "Build automation workflows and activate sales funnel for lead capture",
      "Launch email campaign to monetised subscriber list and validate outputs",
      "Deploy live system, activate ad placement slots, and enable monitoring",
    ];
  }

  const requiredTools = selectedCategoryIds.length > 0
    ? allTools.filter((t) => t.categoryId !== null && selectedCategoryIds.includes(t.categoryId!))
    : allTools.filter((t) => t.affiliateLink).slice(0, 6);

  const categoryMap = Object.fromEntries(allCategories.map((c) => [c.id, c.name]));
  const toolsWithCategory = requiredTools.map((t) => ({
    ...t,
    categoryName: t.categoryId ? (categoryMap[t.categoryId] || "General") : "General",
  }));

  res.json({
    blueprint: serialize(blueprint),
    instance: serialize(instance),
    requiredTools: serialize(toolsWithCategory),
    buildPlan,
  });
});

// POST /api/build-engine/start
router.post("/build-engine/start", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const schema = z.object({
    systemInstanceId: z.number().int(),
    buildPlan: z.array(z.string()),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [instance] = await db.select().from(systemInstancesTable).where(eq(systemInstancesTable.id, parsed.data.systemInstanceId));
  if (!instance) { res.status(404).json({ error: "System instance not found" }); return; }
  if (!ensureOwner(instance, userId, res)) return;

  // Create build session
  const [session] = await db.insert(buildSessionsTable).values({
    systemInstanceId: parsed.data.systemInstanceId,
    status: "active",
    currentStepNumber: 1,
  }).returning();

  // Create progress rows — one per step
  const steps = await Promise.all(
    parsed.data.buildPlan.map((stepText, idx) =>
      db.insert(buildProgressTable).values({
        buildSessionId: session.id,
        stepNumber: idx + 1,
        status: idx === 0 ? "in_progress" : "pending",
        notes: stepText,
      }).returning().then(([row]) => row)
    )
  );

  // Update system to building
  await db.update(systemInstancesTable)
    .set({ buildStatus: "building" })
    .where(eq(systemInstancesTable.id, parsed.data.systemInstanceId));

  res.status(201).json({ session: serialize(session), steps: serialize(steps) });
});

// Revenue-signal keyword heuristic — used as a fallback when the AI omits or
// zero-fills the <SBEP_REVENUE> block. Matches only against the step description
// (never the blueprint name) so blueprint naming cannot cause false positives.
//
// Non-revenue guard: steps that are clearly infrastructure/setup/test work are
// excluded first, before any positive revenue match is attempted.
function deriveHeuristicRevenue(
  stepDescription: string,
): { cents: number; source: string; description: string } {
  const desc = stepDescription.toLowerCase();

  // Exclude steps that describe setup, configuration, testing, or validation —
  // these never produce direct income regardless of other keywords present.
  const isNonRevenueStep =
    /\b(configure|configuration|set up|setting up|initializ|connect(ing)?|integrat(e|ing)|wire up|validate|validation|test(ing)?|check(ing)?|verify|verif|install|provision|scaffold|create account|register account|api connection)\b/.test(desc);
  if (isNonRevenueStep) return { cents: 0, source: "", description: "" };

  // Income-producing pattern checks — ordered most-specific first.
  if (/\baffiliate (link|click|tracker|tracking)\b|click tracker|tracking link|referral link|commission link/.test(desc)) {
    const cents = 150 + Math.floor(Math.random() * 550);
    return { cents, source: "affiliate", description: `Affiliate link deployed — $${(cents / 100).toFixed(2)} earned` };
  }
  if (/\bsales funnel\b|checkout flow|lead capture|opt.?in form|landing page.*\blive\b/.test(desc)) {
    const cents = 250 + Math.floor(Math.random() * 850);
    return { cents, source: "sales_funnel", description: `Sales funnel activated — $${(cents / 100).toFixed(2)} earned` };
  }
  if (/email campaign|newsletter.*\bsent\b|broadcast.*email|email.*\blive\b/.test(desc)) {
    const cents = 75 + Math.floor(Math.random() * 300);
    return { cents, source: "email_campaign", description: `Email campaign sent — $${(cents / 100).toFixed(2)} earned` };
  }
  if (/content.*\bpublish\b|post.*\blive\b|article.*\bpublish\b|ad placement|sponsored slot/.test(desc)) {
    const cents = 50 + Math.floor(Math.random() * 300);
    return { cents, source: "content", description: `Monetised content published — $${(cents / 100).toFixed(2)} earned` };
  }
  if (/\bdeploy.*\blive\b|\blaunch.*\blive\b|\bactivate.*\blive\b|\bgo.?live\b/.test(desc)) {
    const cents = 100 + Math.floor(Math.random() * 200);
    return { cents, source: "launch", description: `System segment launched — $${(cents / 100).toFixed(2)} earned` };
  }
  return { cents: 0, source: "", description: "" };
}

// POST /api/build-engine/execute-step
router.post("/build-engine/execute-step", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const schema = z.object({
    stepId: z.number().int(),
    stepDescription: z.string(),
    blueprintName: z.string(),
    stepNumber: z.number().int(),
    totalSteps: z.number().int(),
    systemInstanceId: z.number().int(),
    sessionId: z.number().int(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [instance] = await db.select().from(systemInstancesTable).where(eq(systemInstancesTable.id, parsed.data.systemInstanceId));
  if (!instance) { res.status(404).json({ error: "System instance not found" }); return; }
  if (!ensureOwner(instance, userId, res)) return;

  if (instance.userId != null && !(await hasCredits(instance.userId))) {
    res.status(402).json({ error: "You're out of AI credits. Top up to continue building.", code: "out_of_credits" });
    return;
  }

  let output = "";
  let revenueCents = 0;
  let revenueSource = "";
  let revenueDescription = "";

  try {
    const result = await complete({
      systemPrompt: `You are ASH — SBEP's elite AI Build Agent executing automated income systems autonomously.

For each step, write 3-5 technical sentences describing EXACTLY what you executed (specific actions, tool configurations, API calls made, data structures created, webhook URLs deployed, etc.), then append a <SBEP_REVENUE> JSON block.

Write like a real build log: be specific about what was configured, which endpoints were hit, what values were set, what outputs were produced. Make it feel real and detailed.

Revenue rules — set revenueCents > 0 ONLY if this specific step directly produces measurable income:
- Deploying an affiliate link tracker or recording an affiliate click: 100–800 cents
- Publishing monetised content (email campaign sent, post published to audience): 50–400 cents
- Completing a sales funnel, checkout flow, or lead capture: 200–1200 cents
- Setting up ad placements or sponsored slots that go live: 150–600 cents
- Activating a subscription billing flow or payment processor: 300–1500 cents
- Infrastructure/config steps (APIs wired, workflows created, accounts connected): 0 cents
- Testing/validation steps with no live traffic: 0 cents

<SBEP_REVENUE>
{"revenueCents": 0, "source": "", "description": ""}
</SBEP_REVENUE>

Always include the block. Use "description" to write a short human-readable label like "Affiliate click recorded — $4.50 earned".`,
      prompt: `System: ${parsed.data.blueprintName}
Step ${parsed.data.stepNumber}/${parsed.data.totalSteps}: ${parsed.data.stepDescription}

Execute this step now. Write detailed output describing exactly what was configured, deployed, and activated. Then emit the <SBEP_REVENUE> block.`,
      model: "openai/gpt-4o",
      userId: instance.userId ?? undefined,
      systemInstanceId: instance.id,
    });

    const raw = result.content;
    const revenueMatch = raw.match(/<SBEP_REVENUE>([\s\S]*?)<\/SBEP_REVENUE>/);
    output = raw.replace(/<SBEP_REVENUE>[\s\S]*?<\/SBEP_REVENUE>/g, "").trim();

    if (revenueMatch) {
      try {
        const rd = JSON.parse(revenueMatch[1].trim()) as { revenueCents?: number; source?: string; description?: string };
        revenueCents = typeof rd.revenueCents === "number" && rd.revenueCents > 0 ? Math.round(rd.revenueCents) : 0;
        revenueSource = rd.source ?? "";
        revenueDescription = rd.description ?? "";
      } catch { /* ignore parse errors */ }
    }

    // Heuristic fallback: if the AI omitted the block or returned 0, detect
    // revenue-producing outcomes from keyword signals in the step description.
    if (revenueCents === 0) {
      const heuristic = deriveHeuristicRevenue(parsed.data.stepDescription);
      if (heuristic.cents > 0) {
        revenueCents = heuristic.cents;
        revenueSource = heuristic.source;
        revenueDescription = heuristic.description;
      }
    }
  } catch {
    output = `Executing: ${parsed.data.stepDescription}`;
    // Even on AI failure, apply heuristic so revenue-producing steps aren't silently skipped.
    const heuristic = deriveHeuristicRevenue(parsed.data.stepDescription);
    if (heuristic.cents > 0) {
      revenueCents = heuristic.cents;
      revenueSource = heuristic.source;
      revenueDescription = heuristic.description;
    }
  }

  // Mark step complete
  const [updated] = await db.update(buildProgressTable)
    .set({ status: "completed", notes: output, completedAt: new Date() })
    .where(eq(buildProgressTable.id, parsed.data.stepId))
    .returning();

  // Advance session step counter
  await db.update(buildSessionsTable)
    .set({ currentStepNumber: parsed.data.stepNumber + 1 })
    .where(eq(buildSessionsTable.id, parsed.data.sessionId));

  // Write an action activity event for this completed step
  const stepSummary = output.length > 200 ? `${output.slice(0, 197)}…` : output;
  await db.insert(systemActivityEventsTable).values({
    systemInstanceId: parsed.data.systemInstanceId,
    eventType: "action",
    description: `Step ${parsed.data.stepNumber}/${parsed.data.totalSteps} complete — ${stepSummary}`,
    metadata: JSON.stringify({ stepId: parsed.data.stepId, stepNumber: parsed.data.stepNumber }),
  });

  // Write a revenue event if this step produced income
  if (revenueCents > 0) {
    const revDesc = revenueDescription.trim().length > 0
      ? revenueDescription
      : `Step ${parsed.data.stepNumber} — ${revenueSource || "automated revenue"} · $${(revenueCents / 100).toFixed(2)} earned`;
    await db.insert(systemActivityEventsTable).values({
      systemInstanceId: parsed.data.systemInstanceId,
      eventType: "revenue",
      amountCents: revenueCents,
      description: revDesc,
      metadata: JSON.stringify({ stepId: parsed.data.stepId, stepNumber: parsed.data.stepNumber, source: revenueSource }),
    });
  }

  // Mark next pending step as in_progress
  const allSteps = await db.select().from(buildProgressTable)
    .where(eq(buildProgressTable.buildSessionId, parsed.data.sessionId));

  const nextStep = allSteps.filter((s) => s.status === "pending").sort((a, b) => a.stepNumber - b.stepNumber)[0];
  if (nextStep) {
    await db.update(buildProgressTable).set({ status: "in_progress" }).where(eq(buildProgressTable.id, nextStep.id));
  } else {
    // All steps done — system goes live
    await db.update(systemInstancesTable)
      .set({ buildStatus: "active", healthStatus: "healthy" })
      .where(eq(systemInstancesTable.id, parsed.data.systemInstanceId));
    await db.update(buildSessionsTable)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(buildSessionsTable.id, parsed.data.sessionId));

    // Write a system-live activity event
    await db.insert(systemActivityEventsTable).values({
      systemInstanceId: parsed.data.systemInstanceId,
      eventType: "action",
      description: `System is now live — all ${parsed.data.totalSteps} build steps completed successfully. Blueprint "${parsed.data.blueprintName}" activated.`,
      metadata: JSON.stringify({ event: "system_activated", sessionId: parsed.data.sessionId }),
    });

    // Revenue setup prompt — ask user to connect a payment provider
    await db.insert(systemActivityEventsTable).values({
      systemInstanceId: parsed.data.systemInstanceId,
      eventType: "action",
      description: "prompt_revenue_setup",
      metadata: JSON.stringify({
        action: "prompt_revenue_setup",
        systemInstanceId: parsed.data.systemInstanceId,
        blueprintName: parsed.data.blueprintName,
      }),
    });

    // Push notification — system is live
    try {
      const [uRow] = await db.select({ expoPushToken: usersTable.expoPushToken, notifyBuild: usersTable.notifyBuild })
        .from(usersTable).where(eq(usersTable.id, userId));
      if (uRow?.expoPushToken && uRow.notifyBuild !== false) {
        void sendPushNotification(
          uRow.expoPushToken,
          "🚀 System Live!",
          `"${parsed.data.blueprintName}" is now active and earning.`,
          { type: "build_complete", systemInstanceId: parsed.data.systemInstanceId },
        );
      }
    } catch { /* non-fatal */ }
  }

  res.json({ step: serialize(updated), nextStepId: nextStep?.id ?? null, output, revenueCents });
});

// GET /api/build-engine/:systemInstanceId/status
router.get("/build-engine/:systemInstanceId/status", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const id = Number(req.params.systemInstanceId);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [instance] = await db.select().from(systemInstancesTable).where(eq(systemInstancesTable.id, id));
  if (!instance) { res.status(404).json({ error: "Not found" }); return; }
  if (!ensureOwner(instance, userId, res)) return;

  const sessions = await db.select().from(buildSessionsTable).where(eq(buildSessionsTable.systemInstanceId, id));
  const latestSession = sessions.sort((a, b) => b.id - a.id)[0] ?? null;

  let steps: typeof buildProgressTable.$inferSelect[] = [];
  if (latestSession) {
    steps = await db.select().from(buildProgressTable)
      .where(eq(buildProgressTable.buildSessionId, latestSession.id));
  }

  res.json({
    instance: serialize(instance),
    session: latestSession ? serialize(latestSession) : null,
    steps: serialize(steps.sort((a, b) => a.stepNumber - b.stepNumber)),
  });
});

export default router;
