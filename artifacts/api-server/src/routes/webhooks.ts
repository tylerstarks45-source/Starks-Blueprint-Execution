import { Router, type IRouter } from "express";
import crypto from "crypto";
import { eq, and, desc } from "drizzle-orm";
import { db, pool, systemInstancesTable, webhookEndpointsTable, webhookLogsTable, systemActivityEventsTable, publishedContentTable } from "@workspace/db";
import { getActiveCallerPayload } from "../lib/auth";
import { serialize } from "../lib/serialize";
import { z } from "zod/v4";
import { enqueue } from "../lib/runtime/jobs";
import { getConnector } from "../lib/connectors/registry";
import { decrypt } from "../lib/crypto";
import { handleSendGridWebhook } from "./email-marketing";

const router: IRouter = Router();

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "admin"]);

const ACTION_TYPES = ["run_ash_task", "send_email", "publish_content", "connector_action", "log_event"] as const;

// ─── helpers ─────────────────────────────────────────────────────────────────

async function requireSystemOwner(
  req: import("express").Request,
  res: import("express").Response,
  systemId: number,
) {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return null;

  const [instance] = await db
    .select({ id: systemInstancesTable.id, userId: systemInstancesTable.userId })
    .from(systemInstancesTable)
    .where(eq(systemInstancesTable.id, systemId));

  if (!instance) { res.status(404).json({ error: "System not found" }); return null; }

  const isAdmin = ADMIN_ROLES.has(caller.role);
  if (!isAdmin && instance.userId !== caller.id) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return { caller, instance };
}

// Generate a short URL-safe token
function generateToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

// ─── CREDENTIAL LOADER ────────────────────────────────────────────────────────

async function loadUserCredentials(userId: number): Promise<Record<string, string>> {
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

// ─── ACTION DISPATCHER ────────────────────────────────────────────────────────
// Called fire-and-forget after the receiver has already responded 202.
// Logs a "webhook fired" activity event for every action so the feed always shows it.

async function dispatchWebhookAction(
  endpoint: { id: number; systemInstanceId: number; actionType: string; actionConfig: Record<string, unknown> },
  payload: Record<string, unknown>,
  userId: number | null,
): Promise<{ status: number; message: string }> {
  const { actionType, actionConfig, systemInstanceId } = endpoint;

  // Always record that the webhook fired — visible in activity feed immediately.
  await db.insert(systemActivityEventsTable).values({
    systemInstanceId,
    eventType: "action",
    description: `Webhook fired [${actionType}]: ${JSON.stringify(payload).slice(0, 120)}`,
    metadata: JSON.stringify({ source: "webhook", actionType, endpointId: endpoint.id, payload }),
  }).catch(() => { /* non-fatal */ });

  try {
    // ── log_event ────────────────────────────────────────────────────────────
    if (actionType === "log_event") {
      const description = (actionConfig.description as string | undefined)
        ?? `Webhook fired: ${JSON.stringify(payload).slice(0, 120)}`;
      await db.insert(systemActivityEventsTable).values({
        systemInstanceId,
        eventType: "action",
        description,
        metadata: JSON.stringify({ webhookPayload: payload, endpointId: endpoint.id }),
      });
      return { status: 200, message: "Event logged" };
    }

    // ── run_ash_task ─────────────────────────────────────────────────────────
    // Enqueues an ash_task job — the worker calls the OpenRouter LLM with the
    // prompt and logs the response as a system activity event.
    if (actionType === "run_ash_task") {
      const prompt = (actionConfig.prompt as string | undefined)
        ?? `Webhook triggered. Payload: ${JSON.stringify(payload).slice(0, 300)}`;
      const jobId = await enqueue("ash_task", {
        systemInstanceId,
        userId: userId ?? undefined,
        prompt,
        webhookPayload: payload,
        endpointId: endpoint.id,
      }, { systemInstanceId });
      return { status: 202, message: `ASH task enqueued (job ${jobId})` };
    }

    // ── send_email ───────────────────────────────────────────────────────────
    // Enqueues a send_email job — the worker loads credentials and calls the
    // email/sendgrid connector to deliver the message.
    if (actionType === "send_email") {
      const to = (actionConfig.to as string | undefined) ?? "";
      const subject = (actionConfig.subject as string | undefined) ?? "Webhook notification";
      const body = (actionConfig.body as string | undefined)
        ?? `Webhook fired with payload: ${JSON.stringify(payload).slice(0, 500)}`;
      const jobId = await enqueue("send_email", {
        systemInstanceId,
        userId: userId ?? undefined,
        to,
        subject,
        body,
        webhookPayload: payload,
        endpointId: endpoint.id,
      }, { systemInstanceId });
      return { status: 202, message: `Email to "${to}" enqueued (job ${jobId})` };
    }

    // ── publish_content ──────────────────────────────────────────────────────
    // Creates a pending published_content record. The publishing scheduler picks
    // it up and calls the appropriate channel connector.
    if (actionType === "publish_content") {
      const channel = (actionConfig.channel as string | undefined) ?? "twitter";
      const content = (actionConfig.content as string | undefined)
        ?? JSON.stringify(payload).slice(0, 500);
      await db.insert(publishedContentTable).values({
        systemInstanceId,
        channel,
        contentType: "post",
        content,
        status: "pending",
        metadata: JSON.stringify({ triggeredBy: "webhook", webhookPayload: payload, endpointId: endpoint.id }),
      });
      return { status: 202, message: `Content queued for publishing to ${channel}` };
    }

    // ── connector_action ─────────────────────────────────────────────────────
    // Executes the connector action inline: load user credentials, call
    // connector.execute(action, params), and log the result.
    if (actionType === "connector_action") {
      const connectorId = (actionConfig.connectorId as string | undefined) ?? "";
      const action = (actionConfig.action as string | undefined) ?? "";
      const params = (actionConfig.params as Record<string, unknown> | undefined) ?? {};

      if (!connectorId || !action) {
        return { status: 400, message: "connector_action requires connectorId and action in actionConfig" };
      }

      const creds = userId != null ? await loadUserCredentials(userId) : {};
      const connector = getConnector(connectorId, creds);
      if (!connector) {
        return { status: 400, message: `Unknown connector: ${connectorId}` };
      }

      const result = await connector.execute(action, { ...params, payload });

      await db.insert(systemActivityEventsTable).values({
        systemInstanceId,
        eventType: result.ok ? "action" : "error",
        description: result.ok
          ? `Connector ${connectorId}.${action} executed via webhook`
          : `Connector ${connectorId}.${action} failed: ${(result.error ?? "unknown").slice(0, 150)}`,
        metadata: JSON.stringify({ connectorId, action, params, result: result.data ?? result.error, endpointId: endpoint.id }),
      }).catch(() => { /* non-fatal */ });

      if (result.ok) return { status: 200, message: `${connectorId}.${action} executed` };
      return { status: 500, message: result.error ?? `${connectorId}.${action} failed` };
    }

    return { status: 400, message: `Unknown action type: ${actionType}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Dispatch error";
    return { status: 500, message: msg };
  }
}

// ─── PUBLIC RECEIVER ─────────────────────────────────────────────────────────

// SendGrid alias — must be registered before /webhooks/:token so the literal
// path wins over the wildcard.
router.post("/webhooks/sendgrid", handleSendGridWebhook);

// POST /api/webhooks/:token — no auth, accepts any JSON payload
router.post("/webhooks/:token", async (req, res): Promise<void> => {
  const start = Date.now();
  const { token } = req.params as { token: string };

  const [endpoint] = await db
    .select()
    .from(webhookEndpointsTable)
    .where(eq(webhookEndpointsTable.token, token));

  if (!endpoint) {
    res.status(404).json({ error: "Webhook not found" });
    return;
  }

  if (!endpoint.enabled) {
    res.status(403).json({ error: "Webhook disabled" });
    return;
  }

  const payload = (req.body ?? {}) as Record<string, unknown>;

  // Look up userId for credential loading (needed by connector_action / send_email)
  const [sysRow] = await db
    .select({ userId: systemInstancesTable.userId })
    .from(systemInstancesTable)
    .where(eq(systemInstancesTable.id, endpoint.systemInstanceId));
  const userId = sysRow?.userId ?? null;

  // Write initial webhook log and update stats synchronously so they're visible
  // immediately — then return 202 and dispatch in the background.
  const [logRow] = await db
    .insert(webhookLogsTable)
    .values({
      endpointId: endpoint.id,
      payload,
      responseStatus: 202,
      responseBody: "accepted",
      processingMs: Date.now() - start,
      error: null,
    })
    .returning({ id: webhookLogsTable.id });

  await db
    .update(webhookEndpointsTable)
    .set({ lastFiredAt: new Date(), totalFires: endpoint.totalFires + 1, updatedAt: new Date() })
    .where(eq(webhookEndpointsTable.id, endpoint.id));

  // Respond immediately — caller is not blocked on action execution.
  res.status(202).json({ ok: true, message: "accepted" });

  // Dispatch action asynchronously; update log with final status when done.
  const endpointSnap = {
    id: endpoint.id,
    systemInstanceId: endpoint.systemInstanceId,
    actionType: endpoint.actionType,
    actionConfig: endpoint.actionConfig as Record<string, unknown>,
  };
  setImmediate(() => {
    dispatchWebhookAction(endpointSnap, payload, userId)
      .then(({ status, message }) => {
        const processingMs = Date.now() - start;
        return db
          .update(webhookLogsTable)
          .set({ responseStatus: status, responseBody: message, processingMs, error: status >= 400 ? message : null })
          .where(eq(webhookLogsTable.id, logRow!.id));
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        req.log?.warn({ err, endpointId: endpoint.id }, "Webhook dispatch error");
        return db
          .update(webhookLogsTable)
          .set({ responseStatus: 500, responseBody: msg, error: msg })
          .where(eq(webhookLogsTable.id, logRow!.id));
      });
  });
});

// ─── MANAGEMENT API ───────────────────────────────────────────────────────────

// GET /api/system-instances/:id/webhooks — list all webhook endpoints for a system
router.get("/system-instances/:id/webhooks", async (req, res): Promise<void> => {
  const systemId = Number(req.params["id"]);
  const ctx = await requireSystemOwner(req, res, systemId);
  if (!ctx) return;

  const endpoints = await db
    .select()
    .from(webhookEndpointsTable)
    .where(eq(webhookEndpointsTable.systemInstanceId, systemId))
    .orderBy(desc(webhookEndpointsTable.createdAt));

  res.json(serialize(endpoints));
});

// POST /api/system-instances/:id/webhooks — create a new webhook endpoint
const CreateWebhookBody = z.object({
  name: z.string().min(1).max(120),
  actionType: z.enum(ACTION_TYPES).default("log_event"),
  actionConfig: z.record(z.string(), z.unknown()).default({}),
  enabled: z.boolean().default(true),
});

router.post("/system-instances/:id/webhooks", async (req, res): Promise<void> => {
  const systemId = Number(req.params["id"]);
  const ctx = await requireSystemOwner(req, res, systemId);
  if (!ctx) return;

  const parsed = CreateWebhookBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [row] = await db
    .insert(webhookEndpointsTable)
    .values({
      systemInstanceId: systemId,
      token: generateToken(),
      name: parsed.data.name,
      actionType: parsed.data.actionType,
      actionConfig: parsed.data.actionConfig,
      enabled: parsed.data.enabled,
    })
    .returning();

  res.status(201).json(serialize(row));
});

// PATCH /api/system-instances/:id/webhooks/:webhookId — update an endpoint
const UpdateWebhookBody = z.object({
  name: z.string().min(1).max(120).optional(),
  actionType: z.enum(ACTION_TYPES).optional(),
  actionConfig: z.record(z.string(), z.unknown()).optional(),
  enabled: z.boolean().optional(),
});

router.patch("/system-instances/:id/webhooks/:webhookId", async (req, res): Promise<void> => {
  const systemId = Number(req.params["id"]);
  const webhookId = Number(req.params["webhookId"]);
  const ctx = await requireSystemOwner(req, res, systemId);
  if (!ctx) return;

  const parsed = UpdateWebhookBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [existing] = await db
    .select()
    .from(webhookEndpointsTable)
    .where(and(eq(webhookEndpointsTable.id, webhookId), eq(webhookEndpointsTable.systemInstanceId, systemId)));

  if (!existing) { res.status(404).json({ error: "Webhook not found" }); return; }

  const [updated] = await db
    .update(webhookEndpointsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(webhookEndpointsTable.id, webhookId))
    .returning();

  res.json(serialize(updated));
});

// DELETE /api/system-instances/:id/webhooks/:webhookId
router.delete("/system-instances/:id/webhooks/:webhookId", async (req, res): Promise<void> => {
  const systemId = Number(req.params["id"]);
  const webhookId = Number(req.params["webhookId"]);
  const ctx = await requireSystemOwner(req, res, systemId);
  if (!ctx) return;

  const [existing] = await db
    .select({ id: webhookEndpointsTable.id })
    .from(webhookEndpointsTable)
    .where(and(eq(webhookEndpointsTable.id, webhookId), eq(webhookEndpointsTable.systemInstanceId, systemId)));

  if (!existing) { res.status(404).json({ error: "Webhook not found" }); return; }

  await db.delete(webhookEndpointsTable).where(eq(webhookEndpointsTable.id, webhookId));
  res.sendStatus(204);
});

// POST /api/system-instances/:id/webhooks/:webhookId/regenerate — rotate token
router.post("/system-instances/:id/webhooks/:webhookId/regenerate", async (req, res): Promise<void> => {
  const systemId = Number(req.params["id"]);
  const webhookId = Number(req.params["webhookId"]);
  const ctx = await requireSystemOwner(req, res, systemId);
  if (!ctx) return;

  const [existing] = await db
    .select({ id: webhookEndpointsTable.id })
    .from(webhookEndpointsTable)
    .where(and(eq(webhookEndpointsTable.id, webhookId), eq(webhookEndpointsTable.systemInstanceId, systemId)));

  if (!existing) { res.status(404).json({ error: "Webhook not found" }); return; }

  const [updated] = await db
    .update(webhookEndpointsTable)
    .set({ token: generateToken(), updatedAt: new Date() })
    .where(eq(webhookEndpointsTable.id, webhookId))
    .returning();

  res.json(serialize(updated));
});

// POST /api/system-instances/:id/webhooks/:webhookId/test — send a sample payload
router.post("/system-instances/:id/webhooks/:webhookId/test", async (req, res): Promise<void> => {
  const systemId = Number(req.params["id"]);
  const webhookId = Number(req.params["webhookId"]);
  const ctx = await requireSystemOwner(req, res, systemId);
  if (!ctx) return;

  const [endpoint] = await db
    .select()
    .from(webhookEndpointsTable)
    .where(and(eq(webhookEndpointsTable.id, webhookId), eq(webhookEndpointsTable.systemInstanceId, systemId)));

  if (!endpoint) { res.status(404).json({ error: "Webhook not found" }); return; }

  const testPayload: Record<string, unknown> = {
    event: "test",
    source: "sbep_ui",
    timestamp: new Date().toISOString(),
    ...(req.body ?? {}),
  };

  const start = Date.now();
  const { status, message } = await dispatchWebhookAction(
    {
      id: endpoint.id,
      systemInstanceId: endpoint.systemInstanceId,
      actionType: endpoint.actionType,
      actionConfig: endpoint.actionConfig as Record<string, unknown>,
    },
    testPayload,
    ctx.caller.id,
  );
  const processingMs = Date.now() - start;

  // Log the test fire
  await db.insert(webhookLogsTable).values({
    endpointId: endpoint.id,
    payload: testPayload,
    responseStatus: status,
    responseBody: `[TEST] ${message}`,
    processingMs,
    error: status >= 400 ? message : null,
  });

  res.json({ ok: status < 400, status, message, payload: testPayload, processingMs });
});

// GET /api/system-instances/:id/webhooks/:webhookId/logs — recent 50 logs
router.get("/system-instances/:id/webhooks/:webhookId/logs", async (req, res): Promise<void> => {
  const systemId = Number(req.params["id"]);
  const webhookId = Number(req.params["webhookId"]);
  const ctx = await requireSystemOwner(req, res, systemId);
  if (!ctx) return;

  const [endpoint] = await db
    .select({ id: webhookEndpointsTable.id })
    .from(webhookEndpointsTable)
    .where(and(eq(webhookEndpointsTable.id, webhookId), eq(webhookEndpointsTable.systemInstanceId, systemId)));

  if (!endpoint) { res.status(404).json({ error: "Webhook not found" }); return; }

  const logs = await db
    .select()
    .from(webhookLogsTable)
    .where(eq(webhookLogsTable.endpointId, webhookId))
    .orderBy(desc(webhookLogsTable.receivedAt))
    .limit(50);

  res.json(serialize(logs));
});

export default router;
