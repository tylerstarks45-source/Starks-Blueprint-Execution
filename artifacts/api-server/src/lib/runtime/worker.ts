import { claimNextJob, completeJob, failJob, upsertConnectorStatus, resetOrphanedJobs } from "./jobs";
import { getConnector } from "../connectors/registry";
import {
  db, pool, systemInstancesTable, userCredentialsTable, systemActivityEventsTable, usersTable,
  businessesTable, businessHealthScoresTable, businessRecommendationsTable, toolsTable, toolCategoriesTable,
  type RecommendationCategory,
} from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { decrypt } from "../crypto";
import { logger } from "../logger";
import { complete } from "../openrouter";
import { sendPushNotification } from "../push";
import { fetchPage } from "../browser/crawler";
import { isBlockedUrl } from "../connectors/ssrf-guard";
import { computeSystemHealth } from "../health-monitor";
import { attemptSelfHeal } from "../self-healing";
import { logEvent } from "../log-event";

const POLL_INTERVAL_MS = 5_000;
let running = false;

// Decrypt credentials for a system instance's tools.
// `user_credentials.user_id` references the owning platform user (usersTable.id),
// NOT the system instance id, so we must resolve the instance's owner first.
export async function loadCredentials(systemInstanceId: number): Promise<Record<string, string>> {
  const [instance] = await db
    .select({ userId: systemInstancesTable.userId })
    .from(systemInstancesTable)
    .where(eq(systemInstancesTable.id, systemInstanceId));

  if (!instance) return {};

  const rows = await db
    .select()
    .from(userCredentialsTable)
    .where(eq(userCredentialsTable.userId, instance.userId));

  const creds: Record<string, string> = {};
  for (const row of rows) {
    if (row.encryptedValue) {
      try {
        creds[row.credentialKey] = await decrypt(row.encryptedValue);
      } catch {
        // Skip malformed entries — don't crash the worker
      }
    }
  }
  return creds;
}

// ─── Job Handlers ─────────────────────────────────────────────────────────────

async function handleConnectorTest(payload: Record<string, unknown>): Promise<unknown> {
  const connectorId = payload["connectorId"] as string;
  const systemInstanceId = payload["systemInstanceId"] as number | undefined;
  const rawCreds = (payload["credentials"] as Record<string, string>) ?? {};

  const connector = getConnector(connectorId, rawCreds);
  if (!connector) throw new Error(`Unknown connector: ${connectorId}`);

  const result = await connector.testConnection();

  if (systemInstanceId) {
    await upsertConnectorStatus(
      systemInstanceId,
      connectorId,
      result.ok ? "connected" : "error",
      result.ok ? null : result.message,
    );

    // Event-triggered recompute + self-heal on connector failure (Task #246).
    if (!result.ok) {
      (async () => {
        try {
          await computeSystemHealth(systemInstanceId);
          await attemptSelfHeal(systemInstanceId, loadCredentials);
        } catch (healErr) {
          logger.warn({ healErr, systemInstanceId }, "Event-triggered health recompute failed");
        }
      })();
    }
  }

  return result;
}

async function handleSystemStartup(payload: Record<string, unknown>): Promise<unknown> {
  const systemInstanceId = payload["systemInstanceId"] as number;

  await db
    .update(systemInstancesTable)
    .set({ buildStatus: "running", healthStatus: "healthy" })
    .where(eq(systemInstancesTable.id, systemInstanceId));

  logger.info({ systemInstanceId }, "System started — marked running");
  return { started: true, systemInstanceId };
}

async function handleHealthCheck(payload: Record<string, unknown>): Promise<unknown> {
  const systemInstanceId = payload["systemInstanceId"] as number;
  const connectorIds = (payload["connectors"] as string[]) ?? [];

  const creds = await loadCredentials(systemInstanceId);
  const results: Record<string, boolean> = {};
  let allOk = true;

  for (const connectorId of connectorIds) {
    const connector = getConnector(connectorId, creds);
    if (!connector) continue;

    try {
      const res = await connector.testConnection();
      results[connectorId] = res.ok;
      if (!res.ok) allOk = false;
      await upsertConnectorStatus(
        systemInstanceId,
        connectorId,
        res.ok ? "connected" : "degraded",
        res.ok ? null : res.message,
      );
    } catch (err: unknown) {
      results[connectorId] = false;
      allOk = false;
      await upsertConnectorStatus(systemInstanceId, connectorId, "error", String(err));
    }
  }

  const health = allOk ? "healthy" : "degraded";
  await db
    .update(systemInstancesTable)
    .set({ healthStatus: health })
    .where(eq(systemInstancesTable.id, systemInstanceId));

  return { health, connectors: results };
}

// ─── Credential loader ────────────────────────────────────────────────────────

async function loadUserCredentialsByUserId(userId: number): Promise<Record<string, string>> {
  const rows = await pool.query<{ credential_key: string; encrypted_value: string | null }>(
    `SELECT credential_key, encrypted_value FROM user_credentials WHERE user_id = $1`,
    [userId],
  );
  const creds: Record<string, string> = {};
  for (const row of rows.rows) {
    if (row.encrypted_value) {
      try { creds[row.credential_key] = await decrypt(row.encrypted_value); } catch { /* skip malformed */ }
    }
  }
  return creds;
}

// ─── ash_task handler ─────────────────────────────────────────────────────────
// Calls the OpenRouter LLM with the provided prompt and logs the AI response
// as a system activity event so it surfaces in the user's activity feed.

async function handleAshTask(payload: Record<string, unknown>): Promise<unknown> {
  const systemInstanceId = payload["systemInstanceId"] as number;
  const userId = payload["userId"] as number | undefined;
  const prompt = (payload["prompt"] as string | undefined) ?? "Process this webhook-triggered task.";

  const result = await complete({
    prompt,
    systemPrompt:
      "You are ASH, an AI automation assistant. A webhook has triggered a task for the user's automation system. " +
      "Process the request concisely and report what you did or recommend.",
    model: "openai/gpt-4o-mini",
    userId,
  });

  const response = result.content?.slice(0, 1000) ?? "(no response)";

  await db.insert(systemActivityEventsTable).values({
    systemInstanceId,
    eventType: "action",
    description: `ASH task completed (webhook): ${response.slice(0, 200)}`,
    metadata: JSON.stringify({ triggeredBy: "webhook_ash_task", prompt, response }),
  });

  return { ok: true, response };
}

// ─── send_email handler ───────────────────────────────────────────────────────
// Loads user credentials and calls the sendgrid or email connector to deliver
// the message. Falls back to logging the intent if no API key is configured.

async function handleSendEmail(payload: Record<string, unknown>): Promise<unknown> {
  const systemInstanceId = payload["systemInstanceId"] as number;
  const userId = payload["userId"] as number | undefined;
  const to = (payload["to"] as string | undefined) ?? "";
  const subject = (payload["subject"] as string | undefined) ?? "Webhook notification";
  const body = (payload["body"] as string | undefined) ?? "Webhook triggered this email.";

  if (!to) throw new Error("send_email job missing required field: to");

  const creds = userId != null ? await loadUserCredentialsByUserId(userId) : {};

  // Prefer SendGrid when the user has a key configured; otherwise use the
  // EmailConnector which calls Resend via the RESEND_API_KEY env var.
  const hasSendGrid = !!(creds["SENDGRID_API_KEY"] ?? creds["sendgrid_api_key"]);
  const preferredId = hasSendGrid ? "sendgrid" : "email";
  const connector = getConnector(preferredId, creds);
  if (!connector) throw new Error(`No email connector available (tried ${preferredId})`);

  const result = await connector.execute("sendEmail", { to, subject, body, html: body });

  await db.insert(systemActivityEventsTable).values({
    systemInstanceId,
    eventType: result.ok ? "action" : "error",
    description: result.ok
      ? `Email sent to ${to}: "${subject}"`
      : `Email to ${to} failed: ${(result.error ?? "unknown").slice(0, 150)}`,
    metadata: JSON.stringify({ triggeredBy: "webhook_send_email", to, subject, result: result.data ?? result.error }),
  });

  if (!result.ok) throw new Error(result.error ?? "Email send failed");
  return { ok: true, to, subject };
}

// ─── business_health_analysis handler ────────────────────────────────────────
// Runs an ASH analysis pass over a business: optionally fetches the live
// website via the browser crawler, then asks OpenRouter for a structured JSON
// health score (overall + 5 sub-scores, opportunities/risks/recommendations),
// and writes a fresh business_health_scores row.

interface HealthAnalysisPayload {
  businessId: number;
  userId: number;
}

interface HealthAnalysisJson {
  overallHealth: number;
  automationScore: number;
  growthScore: number;
  marketingScore: number;
  seoScore: number;
  contentScore: number;
  summary: string;
  revenueOpportunities: string[];
  operationalRisks: string[];
  missingIntegrations: string[];
  recommendations: string[];
  estimatedGrowthPotential: string;
}

function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string").slice(0, 12);
}

async function handleBusinessHealthAnalysis(payload: Record<string, unknown>): Promise<unknown> {
  const { businessId, userId } = payload as unknown as HealthAnalysisPayload;

  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, businessId));
  if (!business) throw new Error(`Business ${businessId} not found`);

  let siteContext = "No website URL is on file for this business.";
  if (business.websiteUrl && isBlockedUrl(business.websiteUrl)) {
    siteContext = `The website URL on file (${business.websiteUrl}) targets a private, loopback, or reserved address and was not fetched. Treat this as a data-quality issue — ask the user to provide a real public URL.`;
  } else if (business.websiteUrl) {
    try {
      const page = await fetchPage(business.websiteUrl);
      if (page.error) {
        siteContext = `Attempted to load ${business.websiteUrl} but failed: ${page.error}. Treat this as a strong operational risk (site may be down or unreachable).`;
      } else {
        siteContext = `Live site check of ${page.finalUrl} — Title: "${page.title}" (HTTP ${page.statusCode}).\nVisible text (first 2000 chars):\n${page.text.slice(0, 2000)}\nLinks found: ${page.links.length}. Forms found: ${page.forms.length}.`;
      }
    } catch (err) {
      siteContext = `Could not check the live site (${business.websiteUrl}): ${err instanceof Error ? err.message : String(err)}.`;
    }
  }

  const prompt = `Analyze this business and produce a Business Health Score.

Business name: ${business.name}
Business type: ${business.businessType}
Revenue model: ${business.revenueModel ?? "unknown"}
Origin: ${business.origin === "built" ? "Built on SBEP by ASH" : "Imported from an existing business"}
Status: ${business.status}
Notes: ${business.notes ?? "(none)"}

${siteContext}

Respond with ONLY a single JSON object (no markdown, no prose) with this exact shape:
{
  "overallHealth": <0-100 integer>,
  "automationScore": <0-100 integer, how automated/hands-off the business is>,
  "growthScore": <0-100 integer, growth trajectory/momentum>,
  "marketingScore": <0-100 integer, marketing presence/effectiveness>,
  "seoScore": <0-100 integer, SEO/discoverability>,
  "contentScore": <0-100 integer, content quality/freshness>,
  "summary": "<1-2 sentence plain-English explanation of the overall score>",
  "revenueOpportunities": ["<short concrete opportunity>", ...up to 5],
  "operationalRisks": ["<short concrete risk>", ...up to 5],
  "missingIntegrations": ["<tool/platform that would help but isn't connected>", ...up to 5],
  "recommendations": ["<short concrete next step>", ...up to 5],
  "estimatedGrowthPotential": "<short phrase, e.g. 'High — untapped SEO traffic'>"
}`;

  const result = await complete({
    prompt,
    systemPrompt:
      "You are ASH, an AI business analyst for the SBEP platform. You objectively score businesses on automation, " +
      "growth, marketing, SEO, and content, then surface concrete, actionable opportunities and risks. Be honest — " +
      "score low when evidence is thin or the site is unreachable. Always respond with strictly valid JSON matching the requested shape.",
    model: "openai/gpt-4o-mini",
    userId,
  });

  let parsed: Partial<HealthAnalysisJson>;
  try {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : result.content);
  } catch {
    throw new Error("ASH returned a non-JSON health analysis response");
  }

  const [row] = await db
    .insert(businessHealthScoresTable)
    .values({
      businessId,
      overallHealth: clampScore(parsed.overallHealth),
      automationScore: clampScore(parsed.automationScore),
      growthScore: clampScore(parsed.growthScore),
      marketingScore: clampScore(parsed.marketingScore),
      seoScore: clampScore(parsed.seoScore),
      contentScore: clampScore(parsed.contentScore),
      summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 500) : null,
      revenueOpportunities: toStringArray(parsed.revenueOpportunities),
      operationalRisks: toStringArray(parsed.operationalRisks),
      missingIntegrations: toStringArray(parsed.missingIntegrations),
      recommendations: toStringArray(parsed.recommendations),
      estimatedGrowthPotential:
        typeof parsed.estimatedGrowthPotential === "string" ? parsed.estimatedGrowthPotential.slice(0, 200) : null,
    })
    .returning();

  logger.info({ businessId, overallHealth: row.overallHealth }, "Business health analysis completed");
  return { ok: true, businessId, healthScoreId: row.id, overallHealth: row.overallHealth };
}

// ─── business_improvement_pass handler (Task #248) ─────────────────────────
// Scheduled AI Improvement Engine pass: analyzes the business + live site,
// checks the Marketplace catalog first for any tool recommendations, and
// produces categorized, confidence-scored recommendations stored in
// business_recommendations for the Growth Recommendations panel.

interface ImprovementPassPayload {
  businessId: number;
}

interface RawRecommendation {
  category: string;
  title: string;
  description: string;
  confidence: number;
  suggestedToolSlug?: string | null;
}

const RECOMMENDATION_CATEGORY_SET = new Set<RecommendationCategory>([
  "conversion", "seo", "marketing", "automation", "revenue", "content", "risk",
]);

async function handleBusinessImprovementPass(payload: Record<string, unknown>): Promise<unknown> {
  const { businessId } = payload as unknown as ImprovementPassPayload;

  const [business] = await db.select().from(businessesTable).where(eq(businessesTable.id, businessId));
  if (!business) throw new Error(`Business ${businessId} not found`);

  await logEvent({
    businessId,
    category: "optimization",
    severity: "info",
    component: "improvement-engine",
    action: "pass_started",
    message: `Improvement pass started for business "${business.name}"`,
  });

  let siteContext = "No website URL is on file for this business.";
  if (business.websiteUrl && isBlockedUrl(business.websiteUrl)) {
    siteContext = `The website URL on file (${business.websiteUrl}) targets a private/reserved address and was not fetched.`;
  } else if (business.websiteUrl) {
    try {
      const page = await fetchPage(business.websiteUrl);
      siteContext = page.error
        ? `Attempted to load ${business.websiteUrl} but failed: ${page.error}.`
        : `Live site check of ${page.finalUrl} — Title: "${page.title}" (HTTP ${page.statusCode}).\nVisible text (first 1500 chars):\n${page.text.slice(0, 1500)}\nLinks found: ${page.links.length}. Forms found: ${page.forms.length}.`;
    } catch (err) {
      siteContext = `Could not check the live site: ${err instanceof Error ? err.message : String(err)}.`;
    }
  }

  // Marketplace-first: load the active tool catalog so the AI recommends
  // tools we already sell/support before ever suggesting an external one.
  const marketplaceTools = await db
    .select({
      id: toolsTable.id,
      name: toolsTable.name,
      description: toolsTable.description,
      category: toolCategoriesTable.name,
    })
    .from(toolsTable)
    .leftJoin(toolCategoriesTable, eq(toolsTable.categoryId, toolCategoriesTable.id))
    .where(eq(toolsTable.activeStatus, true));

  const marketplaceContext = marketplaceTools.length
    ? marketplaceTools.map((t) => `- "${t.name}" (${t.category ?? "uncategorized"}): ${t.description ?? "no description"}`).join("\n")
    : "(Marketplace catalog is currently empty.)";

  const prompt = `You are running a scheduled AI Improvement Engine pass for a business on the SBEP platform.

Business name: ${business.name}
Business type: ${business.businessType}
Revenue model: ${business.revenueModel ?? "unknown"}
Status: ${business.status}
Notes: ${business.notes ?? "(none)"}

${siteContext}

Our Marketplace already sells/curates these tools — ALWAYS check this list first and prefer recommending one of these by exact name over any external tool:
${marketplaceContext}

Produce 3-6 concrete, categorized improvement recommendations. Respond with ONLY a JSON array (no markdown, no prose), each item shaped exactly like:
{
  "category": "<one of: conversion, seo, marketing, automation, revenue, content, risk>",
  "title": "<short actionable title, <= 80 chars>",
  "description": "<1-3 sentences explaining the recommendation and why it matters>",
  "confidence": <0-100 integer, how confident you are this is a real, worthwhile opportunity>,
  "suggestedToolSlug": "<exact Marketplace tool name from the list above if one directly helps, else null>"
}`;

  const result = await complete({
    prompt,
    systemPrompt:
      "You are ASH, an AI growth analyst for the SBEP platform. You produce specific, actionable recommendations " +
      "grounded in the evidence given — never generic filler. You always check the Marketplace tool list first and " +
      "only suggest an external tool (by leaving suggestedToolSlug null and naming it in the description) when nothing " +
      "in the Marketplace fits. Always respond with strictly valid JSON matching the requested shape.",
    model: "openai/gpt-4o-mini",
    userId: business.ownerId,
  });

  let parsed: unknown;
  try {
    const jsonMatch = result.content.match(/\[[\s\S]*\]/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : result.content);
  } catch {
    throw new Error("ASH returned a non-JSON improvement pass response");
  }
  if (!Array.isArray(parsed)) throw new Error("ASH improvement pass response was not a JSON array");

  const raw = parsed as RawRecommendation[];
  const toolByName = new Map(marketplaceTools.map((t) => [t.name.toLowerCase(), t.id]));

  // Supersede the previous pass's unactioned recommendations instead of
  // letting them pile up forever — dismissed/applied history is preserved.
  await db
    .update(businessRecommendationsTable)
    .set({ status: "stale", resolvedAt: new Date() })
    .where(
      and(
        eq(businessRecommendationsTable.businessId, businessId),
        eq(businessRecommendationsTable.sourceType, "improvement_pass"),
        eq(businessRecommendationsTable.status, "new"),
      ),
    );

  let inserted = 0;
  let marketplaceMatches = 0;
  for (const item of raw.slice(0, 8)) {
    if (typeof item?.title !== "string" || typeof item?.description !== "string") continue;
    const category: RecommendationCategory = RECOMMENDATION_CATEGORY_SET.has(item.category as RecommendationCategory)
      ? (item.category as RecommendationCategory)
      : "automation";
    const confidence = Math.max(0, Math.min(100, Math.round(Number(item.confidence) || 50)));
    const suggestedToolId = item.suggestedToolSlug
      ? (toolByName.get(item.suggestedToolSlug.toLowerCase()) ?? null)
      : null;
    if (suggestedToolId) marketplaceMatches++;

    await db.insert(businessRecommendationsTable).values({
      businessId,
      category,
      title: item.title.slice(0, 200),
      description: item.description.slice(0, 1000),
      confidence,
      status: "new",
      sourceType: "improvement_pass",
      suggestedToolId,
      payload: { rawSuggestedToolSlug: item.suggestedToolSlug ?? null },
    });
    inserted++;
  }

  await logEvent({
    businessId,
    category: "optimization",
    severity: "info",
    component: "improvement-engine",
    action: "pass_completed",
    message: `Improvement pass completed for "${business.name}": ${inserted} recommendation(s), ${marketplaceMatches} matched to Marketplace tools`,
    metadata: { inserted, marketplaceMatches },
  });

  logger.info({ businessId, inserted, marketplaceMatches }, "Business improvement pass completed");
  return { ok: true, businessId, inserted, marketplaceMatches };
}

// ─── Main Worker Loop ─────────────────────────────────────────────────────────

async function processJob(): Promise<void> {
  const job = await claimNextJob();
  if (!job) return;

  logger.info({ jobId: job.jobId, jobType: job.jobType, attempt: job.attempt }, "Worker claimed job");

  try {
    const payload = (job.payload ?? {}) as Record<string, unknown>;
    let result: unknown;

    switch (job.jobType) {
      case "connector_test":
        result = await handleConnectorTest(payload);
        break;
      case "system_startup":
        result = await handleSystemStartup(payload);
        break;
      case "health_check":
        result = await handleHealthCheck(payload);
        break;
      case "ash_task":
        result = await handleAshTask(payload);
        break;
      case "send_email":
        result = await handleSendEmail(payload);
        break;
      case "business_health_analysis":
        result = await handleBusinessHealthAnalysis(payload);
        break;
      case "business_improvement_pass":
        result = await handleBusinessImprovementPass(payload);
        break;
      default:
        throw new Error(`Unknown job type: ${job.jobType}`);
    }

    await completeJob(job.jobId, result);
    logger.info({ jobId: job.jobId, jobType: job.jobType }, "Job completed");
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    await failJob(job.jobId, error, job.attempt, job.maxAttempts);
    logger.warn({ jobId: job.jobId, error, attempt: job.attempt }, "Job failed");

    // Push notification when all retries are exhausted and job has a system owner
    const finalFailure = job.attempt >= job.maxAttempts;
    if (finalFailure && job.systemInstanceId) {
      (async () => {
        try {
          const [instance] = await db
            .select({ userId: systemInstancesTable.userId, name: systemInstancesTable.name })
            .from(systemInstancesTable)
            .where(eq(systemInstancesTable.id, job.systemInstanceId!))
            .limit(1);
          if (!instance) return;
          const [user] = await db
            .select({ expoPushToken: usersTable.expoPushToken, notifyBuild: usersTable.notifyBuild })
            .from(usersTable)
            .where(eq(usersTable.id, instance.userId))
            .limit(1);
          if (user?.notifyBuild && user.expoPushToken) {
            await sendPushNotification(
              user.expoPushToken,
              "⚠️ System Error",
              `${instance.name ?? "Your system"} encountered an error: ${error.slice(0, 100)}`,
              { type: "system_error", systemInstanceId: job.systemInstanceId, jobType: job.jobType },
            );
          }
        } catch { /* non-fatal */ }
      })();
    }

    // Event-triggered recompute + self-heal on final failure (Task #246).
    if (finalFailure && job.systemInstanceId) {
      (async () => {
        try {
          await computeSystemHealth(job.systemInstanceId!);
          await attemptSelfHeal(job.systemInstanceId!, loadCredentials);
        } catch (healErr) {
          logger.warn({ healErr, systemInstanceId: job.systemInstanceId }, "Event-triggered health recompute failed");
        }
      })();
    }
  }
}

async function recoverOrphanedJobs(): Promise<void> {
  const count = await resetOrphanedJobs();
  if (count > 0) {
    logger.warn({ count }, "Reset orphaned active jobs to queued on startup");
  }
}

export function startWorker(): void {
  if (running) return;
  running = true;

  async function loop(): Promise<void> {
    try {
      await processJob();
    } catch (err) {
      logger.error({ err }, "Worker loop error");
    } finally {
      if (running) setTimeout(loop, POLL_INTERVAL_MS);
    }
  }

  // Recover before polling
  recoverOrphanedJobs()
    .then(() => loop())
    .catch((err) => {
      logger.error({ err }, "Worker startup recovery failed");
      loop();
    });

  logger.info({ pollIntervalMs: POLL_INTERVAL_MS }, "Runtime worker started");
}

export function stopWorker(): void {
  running = false;
  logger.info("Runtime worker stopped");
}
