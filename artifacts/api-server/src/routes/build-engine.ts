import { Router, type IRouter } from "express";
import { serialize } from "../lib/serialize";
import { eq, sql, and, or, isNull } from "drizzle-orm";
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
  referralCodesTable,
  referralEventsTable,
} from "@workspace/db";
import { complete } from "../lib/openrouter";
import { MODELS, chainFor } from "../lib/models";
import { hasCredits, adjustCredits, adjustWalletCredits } from "../lib/credits";
import { requireAuthActive, validateClientWorkspaceId } from "../lib/auth";
import { sendPushNotification } from "../lib/push";
import { decrypt } from "../lib/crypto";
import { getConnector, isKnownConnector } from "../lib/connectors/registry";
import { logEvent } from "../lib/log-event";
import { z } from "zod";

// NOTE: real revenue milestones are recorded by lib/milestones.ts's
// checkMilestones(), invoked from the real revenue sync (lib/revenue/sync.ts).
// There is intentionally no build-step-driven milestone path here anymore —
// see task #272.

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
      // Drives the actual build plan the system executes — use a frontier model.
      models: chainFor("reasoning"),
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

// NOTE: this route intentionally does NOT fabricate revenue. A system's real
// revenue total is only ever incremented by the real revenue sync
// (lib/revenue/sync.ts, from connected Stripe/PayPal/Gumroad accounts) or by
// a verifiable connector action tied to an actual transaction/webhook.
// Build-step narration (including any AI commentary about "earning" money)
// is purely descriptive text and must never be parsed into a dollar amount
// written to systemActivityEventsTable — see task #272.
//
// Defense in depth: even though the AI is explicitly instructed never to
// claim a dollar amount was earned, models don't always comply. Any literal
// dollar-amount pattern (e.g. "$4.50 earned") appearing in the narrative
// text is stripped and replaced with a neutral, clearly-labeled placeholder
// before it is stored or shown to the user, so no unverified dollar figure
// can ever reach the UI outside of the real Revenue tab.
const UNVERIFIED_DOLLAR_AMOUNT_RE = /\$\s?\d[\d,]*(?:\.\d{1,2})?/g;
function stripUnverifiedMoneyClaims(text: string): string {
  return text.replace(UNVERIFIED_DOLLAR_AMOUNT_RE, "[verified earnings shown in the Revenue tab]");
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
  let stepFailed = false;
  let recoveryMessage = "";
  // Best-model policy (Task #282): build-step execution is the highest-stakes AI
  // work, so default to the flagship chain. Respect an explicit model only if the
  // caller deliberately sent one (agent-mode selection from the frontend).
  const explicitModel = parsed.data.model;
  const stepModelChain = chainFor("flagship");
  // Will be overwritten with the actual model string confirmed by OpenRouter
  let actualModel: string = explicitModel ?? stepModelChain[0] ?? MODELS.flagship;

  // ── Live mode: fetch + decrypt user credentials ──────────────────────────────
  let userCreds: Record<string, string> = {};
  let availableConnectorIds: string[] = [];
  if (parsed.data.liveMode) {
    // Scope credentials to the user's current workspace (clientWorkspaceId) to prevent
    // cross-workspace credential leakage in multi-tenant / agency contexts, AND to
    // this system instance: a running system uses its own instance-scoped tokens
    // (systemInstanceId = this instance) plus any shared user-level rows
    // (systemInstanceId IS NULL), with the instance-scoped copy winning on collision.
    const workspaceId = await validateClientWorkspaceId(req, userId);
    const instanceScope = or(
      eq(userCredentialsTable.systemInstanceId, parsed.data.systemInstanceId),
      isNull(userCredentialsTable.systemInstanceId),
    );
    const credCondition = workspaceId !== null
      ? and(eq(userCredentialsTable.userId, userId), eq(userCredentialsTable.clientWorkspaceId, workspaceId), instanceScope)
      : and(eq(userCredentialsTable.userId, userId), instanceScope);

    const credRows = await db
      .select({ credentialKey: userCredentialsTable.credentialKey, encryptedValue: userCredentialsTable.encryptedValue, systemInstanceId: userCredentialsTable.systemInstanceId })
      .from(userCredentialsTable)
      .where(credCondition);

    // Apply NULL-scoped rows first, then instance-scoped so the instance copy wins.
    credRows.sort((a, b) => (a.systemInstanceId === null ? 0 : 1) - (b.systemInstanceId === null ? 0 : 1));

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
    const result = await complete({
      systemPrompt: `You are ASH — SBEP's elite AI Build Agent executing automated income systems autonomously.
${liveExecHint}
For each step, write 3-5 technical sentences describing EXACTLY what you executed (specific actions, tool configurations, API calls made, data structures created, webhook URLs deployed, etc.).

Write like a real build log: be specific about what was configured, which endpoints were hit, what values were set, what outputs were produced. Make it feel real and detailed.

Do NOT claim or imply that this step generated real revenue or a specific dollar amount — actual earnings are only ever reported from real connected payment providers (Stripe/PayPal/Gumroad), never from build narration.`,
      prompt: `System: ${parsed.data.blueprintName}
Step ${parsed.data.stepNumber}/${parsed.data.totalSteps}: ${parsed.data.stepDescription}

Execute this step now. Write detailed output describing exactly what was configured, deployed, and activated.${liveExecHint ? " If real API calls are needed, emit <SBEP_ACTIONS> first." : ""}`,
      ...(explicitModel ? { model: explicitModel } : { models: stepModelChain }),
      userId: instance.userId ?? undefined,
      systemInstanceId: instance.id,
    });

    // Use the model string confirmed by OpenRouter (may differ from what was requested)
    actualModel = result.model;

    const raw = result.content;
    const actionsMatch = raw.match(/<SBEP_ACTIONS>([\s\S]*?)<\/SBEP_ACTIONS>/);

    output = stripUnverifiedMoneyClaims(
      raw
        .replace(/<SBEP_REVENUE>[\s\S]*?<\/SBEP_REVENUE>/g, "")
        .replace(/<SBEP_ACTIONS>[\s\S]*?<\/SBEP_ACTIONS>/g, "")
        .trim(),
    );

    // ── Execute real connector actions (live mode) ──────────────────────────────
    // Supports two formats:
    // 1. <SBEP_ACTIONS>{"calls":[...]} </SBEP_ACTIONS>  (primary tag format)
    // 2. ```json\n{"calls":[...]\n```  (JSON code block fallback for tool_call-style responses)
    if (parsed.data.liveMode && (actionsMatch || raw.includes('"connector_action"'))) {
      let calls: Array<Record<string, unknown>> = [];
      try {
        // Priority 1: dedicated XML tag
        if (actionsMatch) {
          const parsed2 = JSON.parse(actionsMatch[1].trim()) as { calls?: Array<Record<string, unknown>> };
          if (Array.isArray(parsed2.calls)) calls = parsed2.calls;
        }
        // Priority 2: JSON code blocks containing connector_action entries
        if (calls.length === 0) {
          const codeBlocks = raw.matchAll(/```(?:json)?\s*([\s\S]*?)```/g);
          for (const block of codeBlocks) {
            try {
              const parsed3 = JSON.parse(block[1].trim()) as { calls?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>;
              const items = Array.isArray(parsed3) ? parsed3 : (parsed3.calls ?? []);
              if (items.some(i => i.type === "connector_action")) { calls = items; break; }
            } catch { /* skip invalid block */ }
          }
        }
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

        // Unified log (best-effort)
        void logEvent({
          systemInstanceId: parsed.data.systemInstanceId,
          userId,
          category: "connection",
          severity: execResult.ok ? "info" : "error",
          component: connector.displayName,
          action,
          message: summary,
          metadata: { connectorId, action, ok: execResult.ok, latencyMs, stepNumber: parsed.data.stepNumber },
        });
      }

      // Append connector result summary to output
      if (connectorResults.length > 0) {
        const resultLines = connectorResults.map(r => `${r.ok ? "✅" : "❌"} ${r.summary}`).join("\n");
        output = `${output}\n\n**Live Execution Results:**\n${resultLines}`;
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

    void logEvent({
      systemInstanceId: parsed.data.systemInstanceId,
      userId,
      category: "error",
      severity: "error",
      component: "build-engine",
      action: "execute_step",
      message: `Step ${parsed.data.stepNumber}/${parsed.data.totalSteps} failed — ${recoveryMessage}`,
      metadata: { stepId: parsed.data.stepId, stepNumber: parsed.data.stepNumber, blueprintName: parsed.data.blueprintName },
    });

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

  void logEvent({
    systemInstanceId: parsed.data.systemInstanceId,
    userId,
    category: "build",
    severity: "info",
    component: "build-engine",
    action: "execute_step",
    message: `Step ${parsed.data.stepNumber}/${parsed.data.totalSteps} complete — ${stepSummary}`,
    metadata: { stepId: parsed.data.stepId, stepNumber: parsed.data.stepNumber, model: actualModel },
  });

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

    void logEvent({
      systemInstanceId: parsed.data.systemInstanceId,
      userId,
      category: "deploy",
      severity: "info",
      component: "build-engine",
      action: "system_activated",
      message: `System is now live — all ${parsed.data.totalSteps} build steps completed. Blueprint "${parsed.data.blueprintName}" activated.`,
      metadata: { event: "system_activated", sessionId: parsed.data.sessionId, blueprintName: parsed.data.blueprintName },
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

  res.json({ step: serialize(updated), nextStepId: nextStep?.id ?? null, output, stepFailed, recoveryMessage, connectorResults });
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
