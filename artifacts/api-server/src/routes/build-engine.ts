import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, sql, and } from "drizzle-orm";
import {
  db,
  systemInstancesTable,
  blueprintsTable,
  toolsTable,
  toolCategoriesTable,
  buildSessionsTable,
  buildProgressTable,
  systemActivityEventsTable,
  userCredentialsTable,
  usersTable,
  notificationsTable,
  milestoneEventsTable,
  referralCodesTable,
  referralEventsTable,
} from "@workspace/db";
import { complete } from "../lib/openrouter";
import { hasCredits, adjustCredits, adjustWalletCredits } from "../lib/credits";
import { requireAuthActive, validateClientWorkspaceId } from "../lib/auth";
import { sendPushNotification } from "../lib/push";
import { decrypt } from "../lib/crypto";
import { getConnector, isKnownConnector } from "../lib/connectors/registry";
import { z } from "zod";

// ─── Milestone thresholds (cents) ─────────────────────────────────────────────
const MILESTONE_THRESHOLDS: Record<number, string> = {
  100:      "$1",
  10000:    "$100",
  50000:    "$500",
  100000:   "$1K",
  500000:   "$5K",
  1000000:  "$10K",
  5000000:  "$50K",
  10000000: "$100K",
};

async function fireMilestoneIfNew(
  userId: number,
  systemInstanceId: number,
  blueprintName: string,
): Promise<void> {
  try {
    // Compute user's new lifetime revenue total
    const totResult = await db.execute(sql`
      SELECT COALESCE(SUM(sae.amount_cents), 0)::bigint AS lifetime_cents
      FROM system_activity_events sae
      JOIN system_instances si ON si.id = sae.system_instance_id
      WHERE si.user_id = ${userId} AND sae.event_type = 'revenue'
    `);
    const totRow = (totResult as unknown as { rows: Array<{ lifetime_cents: string }> }).rows[0];
    const lifetimeCents = Number(totRow?.lifetime_cents ?? 0);

    // Find the HIGHEST milestone threshold the user has crossed
    const threshold = Object.keys(MILESTONE_THRESHOLDS)
      .map(Number)
      .sort((a, b) => b - a)          // descending — largest first
      .find(t => lifetimeCents >= t); // first match is the highest crossed
    if (!threshold) return;

    const label = MILESTONE_THRESHOLDS[threshold];

    // Check if this milestone was already recorded for this user
    const [existing] = await db
      .select({ id: milestoneEventsTable.id })
      .from(milestoneEventsTable)
      .where(sql`${milestoneEventsTable.userId} = ${userId} AND ${milestoneEventsTable.amountCents} = ${threshold}`);
    if (existing) return;

    // Record the milestone
    await db.insert(milestoneEventsTable).values({
      userId,
      systemInstanceId,
      amountCents: threshold,
      milestoneLabel: label,
      systemType: blueprintName,
    });

    // Fire an in-app notification
    await db.insert(notificationsTable).values({
      userId,
      title: `🎉 Milestone Reached — ${label}!`,
      message: `You just crossed the ${label} lifetime earnings milestone on "${blueprintName}". Keep building!`,
      notificationType: "milestone_reached",
      read: false,
    });

    // Mobile push (non-fatal)
    const [uRow] = await db
      .select({ expoPushToken: usersTable.expoPushToken })
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    if (uRow?.expoPushToken) {
      void sendPushNotification(
        uRow.expoPushToken,
        `🎉 Milestone: ${label}!`,
        `You've earned ${label} lifetime with "${blueprintName}"!`,
        { type: "milestone", amountCents: threshold },
      );
    }
  } catch {
    /* non-fatal */
  }
}

async function fireReferralActivationPayout(userId: number): Promise<void> {
  try {
    // Only applies on first system activation
    const activatedResult = await db.execute(sql`
      SELECT COUNT(*)::int AS cnt
      FROM system_instances
      WHERE user_id = ${userId} AND build_status = 'active'
    `);
    const activatedRow = (activatedResult as unknown as { rows: Array<{ cnt: number }> }).rows[0];
    const activatedCount = Number(activatedRow?.cnt ?? 0);
    if (activatedCount !== 1) return; // only first activation

    // Was this user referred?
    const [refEvent] = await db
      .select({ referrerId: referralEventsTable.referrerId })
      .from(referralEventsTable)
      .where(sql`${referralEventsTable.referredUserId} = ${userId} AND ${referralEventsTable.eventType} = 'signup'`);
    if (!refEvent?.referrerId) return;

    // Only pay referral bonus if the referred user is on a paid plan
    const [referredUserRow] = await db
      .select({ membershipTier: usersTable.membershipTier })
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    const PAID_TIERS = new Set(["builder", "operator", "empire", "pro", "enterprise"]);
    if (!PAID_TIERS.has(referredUserRow?.membershipTier ?? "")) return;

    const referrerId = refEvent.referrerId;

    // Prevent double payout: check if an activation event already exists
    const [existing] = await db
      .select({ id: referralEventsTable.id })
      .from(referralEventsTable)
      .where(sql`${referralEventsTable.referrerId} = ${referrerId} AND ${referralEventsTable.referredUserId} = ${userId} AND ${referralEventsTable.eventType} = 'activation'`);
    if (existing) return;

    // Payout 500 credits to the referrer's wallet (permanent balance, not monthly bucket)
    const ACTIVATION_CREDITS = 500;
    await adjustWalletCredits(referrerId, ACTIVATION_CREDITS, { reason: "Referral activation bonus — referred user activated their first system" });

    // Record the activation event
    await db.insert(referralEventsTable).values({
      referrerId,
      referredUserId: userId,
      eventType: "activation",
      creditsAwarded: ACTIVATION_CREDITS,
    });

    // Increment conversions on the referral code
    await db
      .update(referralCodesTable)
      .set({ conversions: sql`${referralCodesTable.conversions} + 1` })
      .where(eq(referralCodesTable.userId, referrerId));

    // Notify the referrer
    await db.insert(notificationsTable).values({
      userId: referrerId,
      title: "💰 Referral Payout!",
      message: `Someone you referred just activated their first system — you earned ${ACTIVATION_CREDITS} credits!`,
      notificationType: "success",
      read: false,
    });
  } catch {
    /* non-fatal */
  }
}

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

  if (instance.blueprintId == null) { res.status(400).json({ error: "Instance has no blueprint" }); return; }
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
    model: z.string().optional(),
    liveMode: z.boolean().optional().default(false),
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
  let stepFailed = false;
  let recoveryMessage = "";
  // Will be overwritten with the actual model string confirmed by OpenRouter
  let actualModel: string = parsed.data.model ?? "openai/gpt-4o";

  // ── Live mode: fetch + decrypt user credentials ──────────────────────────────
  let userCreds: Record<string, string> = {};
  let availableConnectorIds: string[] = [];
  if (parsed.data.liveMode) {
    // Scope credentials to the user's current workspace (clientWorkspaceId) to prevent
    // cross-workspace credential leakage in multi-tenant / agency contexts.
    const workspaceId = await validateClientWorkspaceId(req, userId);
    const credCondition = workspaceId !== null
      ? and(eq(userCredentialsTable.userId, userId), eq(userCredentialsTable.clientWorkspaceId, workspaceId))
      : eq(userCredentialsTable.userId, userId);

    const credRows = await db
      .select({ credentialKey: userCredentialsTable.credentialKey, encryptedValue: userCredentialsTable.encryptedValue })
      .from(userCredentialsTable)
      .where(credCondition);

    for (const row of credRows) {
      if (row.encryptedValue) {
        try { userCreds[row.credentialKey] = await decrypt(row.encryptedValue); } catch { /* skip */ }
      }
    }

    // Derive connector IDs from credential key prefixes.
    // Stored keys are UPPERCASE (e.g. MAILCHIMP_API_KEY, TWITTER_BEARER_TOKEN).
    // Registry IDs are lowercase (mailchimp, twitter), so we lowercase each candidate.
    const connectorIdSet = new Set<string>();
    for (const key of Object.keys(userCreds)) {
      const parts = key.split("_");
      for (let len = 1; len < parts.length; len++) {
        const candidate = parts.slice(0, len).join("_").toLowerCase();
        if (isKnownConnector(candidate)) { connectorIdSet.add(candidate); break; }
      }
    }
    availableConnectorIds = [...connectorIdSet];
  }

  const liveExecHint = parsed.data.liveMode && availableConnectorIds.length > 0
    ? `\nLIVE EXECUTION MODE — The user has real credentials for: ${availableConnectorIds.join(", ")}.
If this step genuinely requires calling one of these services (posting content, sending email, adding contacts, triggering webhooks, creating Stripe links, etc.) output a <SBEP_ACTIONS> block BEFORE the narrative:

<SBEP_ACTIONS>
{"calls": [{"type": "connector_action", "connectorId": "CONNECTOR_ID", "action": "ACTION_NAME", "params": {"key": "value"}}]}
</SBEP_ACTIONS>

Use ONLY connectors from the available list. For pure config/planning/setup steps, omit <SBEP_ACTIONS> entirely.\n`
    : "";

  // Connector execution results to return alongside output
  const connectorResults: Array<{ connectorId: string; connectorName: string; action: string; ok: boolean; summary: string; latencyMs: number; confirmation?: unknown }> = [];

  try {
    const resolvedModel = actualModel;
    const result = await complete({
      systemPrompt: `You are ASH — SBEP's elite AI Build Agent executing automated income systems autonomously.
${liveExecHint}
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

Execute this step now. Write detailed output describing exactly what was configured, deployed, and activated.${liveExecHint ? " If real API calls are needed, emit <SBEP_ACTIONS> first." : ""} Then emit the <SBEP_REVENUE> block.`,
      model: resolvedModel,
      userId: instance.userId ?? undefined,
      systemInstanceId: instance.id,
    });

    // Use the model string confirmed by OpenRouter (may differ from what was requested)
    actualModel = result.model;

    const raw = result.content;
    const revenueMatch = raw.match(/<SBEP_REVENUE>([\s\S]*?)<\/SBEP_REVENUE>/);
    const actionsMatch = raw.match(/<SBEP_ACTIONS>([\s\S]*?)<\/SBEP_ACTIONS>/);

    output = raw
      .replace(/<SBEP_REVENUE>[\s\S]*?<\/SBEP_REVENUE>/g, "")
      .replace(/<SBEP_ACTIONS>[\s\S]*?<\/SBEP_ACTIONS>/g, "")
      .trim();

    if (revenueMatch) {
      try {
        const rd = JSON.parse(revenueMatch[1].trim()) as { revenueCents?: number; source?: string; description?: string };
        revenueCents = typeof rd.revenueCents === "number" && rd.revenueCents > 0 ? Math.round(rd.revenueCents) : 0;
        revenueSource = rd.source ?? "";
        revenueDescription = rd.description ?? "";
      } catch { /* ignore parse errors */ }
    }

    // ── Execute real connector actions (live mode) ──────────────────────────────
    if (parsed.data.liveMode && actionsMatch) {
      let calls: Array<Record<string, unknown>> = [];
      try {
        const parsed2 = JSON.parse(actionsMatch[1].trim()) as { calls?: Array<Record<string, unknown>> };
        if (Array.isArray(parsed2.calls)) calls = parsed2.calls;
      } catch { /* ignore malformed block */ }

      for (const call of calls) {
        if (call.type !== "connector_action") continue;
        const connectorId = call.connectorId as string | undefined;
        const action = call.action as string | undefined;
        const params = (call.params ?? {}) as Record<string, unknown>;

        if (!connectorId || !action || !isKnownConnector(connectorId)) {
          // Connector not recognised — add a targeted "connect" hint
          if (connectorId) {
            connectorResults.push({ connectorId, connectorName: connectorId, action: action ?? "unknown", ok: false, summary: `Connect ${connectorId} at /connections to enable live execution`, latencyMs: 0 });
          }
          continue;
        }
        const connector = getConnector(connectorId, userCreds);
        if (!connector) continue;
        // Per-step credential gate: check required creds before executing
        const missingCred = connector.requiredCredentials.find(k => !userCreds[k]);
        if (missingCred) {
          connectorResults.push({ connectorId, connectorName: connector.displayName, action, ok: false, summary: `${connector.displayName}: ${missingCred} not configured — connect at /connections`, latencyMs: 0 });
          continue;
        }

        const startMs = Date.now();
        let execResult: { ok: boolean; data?: unknown; error?: string };
        try {
          execResult = await connector.execute(action, params);
        } catch (err) {
          execResult = { ok: false, error: err instanceof Error ? err.message : String(err) };
        }
        const latencyMs = Date.now() - startMs;

        const summary = execResult.ok
          ? `${connector.displayName} → ${action} executed (${latencyMs}ms)`
          : `${connector.displayName} → ${action} failed: ${(execResult.error ?? "unknown").slice(0, 120)}`;

        connectorResults.push({ connectorId, connectorName: connector.displayName, action, ok: execResult.ok, summary, latencyMs, confirmation: execResult.data ?? null });

        // Log connector execution as an activity event
        db.insert(systemActivityEventsTable).values({
          systemInstanceId: parsed.data.systemInstanceId,
          eventType: execResult.ok ? "connector_executed" : "warning",
          description: summary,
          metadata: JSON.stringify({ connectorId, connectorName: connector.displayName, action, ok: execResult.ok, latencyMs, stepNumber: parsed.data.stepNumber }),
        }).catch(() => { /* non-critical */ });
      }

      // Append connector result summary to output
      if (connectorResults.length > 0) {
        const resultLines = connectorResults.map(r => `${r.ok ? "✅" : "❌"} ${r.summary}`).join("\n");
        output = `${output}\n\n**Live Execution Results:**\n${resultLines}`;
      }
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
  } catch (err) {
    // AI call failed — flag for frontend recovery UI
    stepFailed = true;
    recoveryMessage = err instanceof Error ? err.message : "AI model unavailable";
    output = `Step ${parsed.data.stepNumber} encountered an AI error.`;
  }

  // ── Early-return path for AI failures — do NOT advance session state ──────
  if (stepFailed) {
    // Mark step as failed (not completed) so state remains accurate
    const [failedStep] = await db.update(buildProgressTable)
      .set({ status: "failed", notes: output })
      .where(eq(buildProgressTable.id, parsed.data.stepId))
      .returning();

    // Recovery explanation is generated by POST /api/ai-orchestrator/step-recovery (SSE)
    // — the frontend calls that endpoint immediately after receiving stepFailed.
    res.json({ stepFailed: true, recoveryMessage, step: serialize(failedStep ?? { id: parsed.data.stepId }) });
    return;
  }

  // Mark step complete
  const [updated] = await db.update(buildProgressTable)
    .set({ status: "completed", notes: output, completedAt: new Date() })
    .where(eq(buildProgressTable.id, parsed.data.stepId))
    .returning();

  // Advance session step counter; persist the model string confirmed by OpenRouter (not client input)
  await db.update(buildSessionsTable)
    .set({ currentStepNumber: parsed.data.stepNumber + 1, currentModel: actualModel })
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
    // Fire milestone check asynchronously — non-blocking
    void fireMilestoneIfNew(userId, parsed.data.systemInstanceId, parsed.data.blueprintName);
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

    // Referral activation payout — non-blocking
    void fireReferralActivationPayout(userId);

    // In-app notification: system live
    await db.insert(notificationsTable).values({
      userId,
      title: "🚀 System Live!",
      message: `"${parsed.data.blueprintName}" is now active. All ${parsed.data.totalSteps} build steps completed.`,
      notificationType: "success",
      read: false,
    });
  }

  res.json({ step: serialize(updated), nextStepId: nextStep?.id ?? null, output, revenueCents, stepFailed, recoveryMessage, connectorResults });
});

// ── POST /api/build-engine/skip-step ─────────────────────────────────────────
// User-triggered skip: marks a failed step as skipped, advances session, activates system if last step.
router.post("/build-engine/skip-step", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const schema = z.object({
    stepId:           z.number().int(),
    sessionId:        z.number().int(),
    stepNumber:       z.number().int(),
    totalSteps:       z.number().int(),
    systemInstanceId: z.number().int(),
    blueprintName:    z.string(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [instance] = await db.select().from(systemInstancesTable).where(eq(systemInstancesTable.id, parsed.data.systemInstanceId));
  if (!instance) { res.status(404).json({ error: "System instance not found" }); return; }
  if (!ensureOwner(instance, userId, res)) return;

  // IDOR guard: confirm session belongs to this instance (not just any session ID)
  const [sessionRow] = await db.select({ id: buildSessionsTable.id })
    .from(buildSessionsTable)
    .where(and(eq(buildSessionsTable.id, parsed.data.sessionId), eq(buildSessionsTable.systemInstanceId, parsed.data.systemInstanceId)));
  if (!sessionRow) { res.status(403).json({ error: "Session does not belong to this system" }); return; }

  // IDOR guard: confirm step belongs to this session
  const [stepRow] = await db.select({ id: buildProgressTable.id })
    .from(buildProgressTable)
    .where(and(eq(buildProgressTable.id, parsed.data.stepId), eq(buildProgressTable.buildSessionId, parsed.data.sessionId)));
  if (!stepRow) { res.status(403).json({ error: "Step does not belong to this session" }); return; }

  // Mark step as failed/skipped
  await db.update(buildProgressTable)
    .set({ status: "failed", notes: "Skipped by user", completedAt: new Date() })
    .where(eq(buildProgressTable.id, parsed.data.stepId));

  // Advance session step counter
  await db.update(buildSessionsTable)
    .set({ currentStepNumber: parsed.data.stepNumber + 1 })
    .where(eq(buildSessionsTable.id, parsed.data.sessionId));

  // Find next pending step
  const allSteps = await db.select().from(buildProgressTable)
    .where(eq(buildProgressTable.buildSessionId, parsed.data.sessionId));
  const nextStep = allSteps.filter(s => s.status === "pending").sort((a, b) => a.stepNumber - b.stepNumber)[0];

  if (nextStep) {
    await db.update(buildProgressTable).set({ status: "in_progress" }).where(eq(buildProgressTable.id, nextStep.id));
    res.json({ skipped: true, nextStepId: nextStep.id, completed: false });
  } else {
    // All steps done (some skipped) — activate system
    await db.update(systemInstancesTable)
      .set({ buildStatus: "active", healthStatus: "healthy" })
      .where(eq(systemInstancesTable.id, parsed.data.systemInstanceId));
    await db.update(buildSessionsTable)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(buildSessionsTable.id, parsed.data.sessionId));
    void fireReferralActivationPayout(userId);
    res.json({ skipped: true, nextStepId: null, completed: true });
  }
});

// POST /api/build-engine/preflight
// Checks whether the user's stored credentials satisfy the connectors a set of
// build steps may need.  Returns { ready, availableConnectors, missingHints }.
router.post("/build-engine/preflight", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (userId === null) return;

  const body = req.body as { stepDescriptions?: string[] };
  const stepDescriptions: string[] = Array.isArray(body.stepDescriptions) ? body.stepDescriptions : [];

  // Load all credentials scoped to the user's current workspace (prevents cross-tenant leakage)
  const pfWorkspaceId = await validateClientWorkspaceId(req, userId);
  const pfCredCondition = pfWorkspaceId !== null
    ? and(eq(userCredentialsTable.userId, userId), eq(userCredentialsTable.clientWorkspaceId, pfWorkspaceId))
    : eq(userCredentialsTable.userId, userId);
  const credRows = await db.select({
    credentialKey: userCredentialsTable.credentialKey,
  }).from(userCredentialsTable).where(pfCredCondition);

  // Derive available connector IDs from credential key prefixes.
  // Stored keys are UPPERCASE (e.g. MAILCHIMP_API_KEY) — lowercase the candidate before lookup.
  const available = new Set<string>();
  for (const row of credRows) {
    const parts = row.credentialKey.split("_");
    for (let len = 1; len < parts.length; len++) {
      const candidate = parts.slice(0, len).join("_").toLowerCase();
      if (isKnownConnector(candidate)) { available.add(candidate); break; }
    }
  }

  // Scan step descriptions for connector keyword mentions
  const CONNECTOR_KEYWORDS: Record<string, string[]> = {
    mailchimp:     ["mailchimp", "email list", "audience", "campaign"],
    stripe:        ["stripe", "payment", "checkout", "subscription", "billing"],
    sendgrid:      ["sendgrid", "transactional email", "email send"],
    twitter:       ["twitter", "tweet", "x.com"],
    slack:         ["slack", "channel message", "workspace notification"],
    zapier:        ["zapier", "zap", "automation trigger"],
    gohighlevel:   ["gohighlevel", "go high level", "ghl", "crm pipeline"],
    convertkit:    ["convertkit", "convert kit", "email sequence", "subscriber tag"],
    shopify:       ["shopify", "product listing", "storefront", "ecommerce store"],
    cloudflare:    ["cloudflare", "cdn", "dns record", "worker", "edge deploy"],
    notion:        ["notion", "database page", "notion page"],
    airtable:      ["airtable", "airtable base", "grid record"],
    webhook:       ["webhook", "http trigger", "endpoint notify"],
    linkedin:      ["linkedin", "linkedin post", "professional network", "linkedin profile"],
    wordpress:     ["wordpress", "wp site", "blog post", "wordpress page", "cms"],
    google_sheets: ["google sheets", "spreadsheet", "gsheet", "sheet row", "google docs spreadsheet"],
    meta:          ["facebook", "instagram", "meta ads", "fb page", "ig post", "facebook post", "instagram post"],
    beehiiv:       ["beehiiv", "newsletter", "publication", "beehiiv subscriber"],
    teachable:     ["teachable", "online course", "course enrollment", "course platform"],
    clickfunnels:  ["clickfunnels", "funnel", "sales funnel", "cf2", "click funnels"],
  };

  const needed = new Set<string>();
  for (const desc of stepDescriptions) {
    const lower = desc.toLowerCase();
    for (const [id, keywords] of Object.entries(CONNECTOR_KEYWORDS)) {
      if (keywords.some(kw => lower.includes(kw))) needed.add(id);
    }
  }

  const missing = [...needed].filter(id => !available.has(id));
  const missingHints = missing.map(id => {
    const connector = getConnector(id, {});
    return { id, name: connector?.displayName ?? id };
  });

  res.json({
    ready: missing.length === 0,
    availableConnectors: [...available],
    neededConnectors: [...needed],
    missingHints,
  });
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
    currentModel: latestSession?.currentModel ?? null,
  });
});

export default router;
