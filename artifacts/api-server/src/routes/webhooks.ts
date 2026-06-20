import { Router, type IRouter } from "express";
import crypto from "crypto";
import { eq, and, desc } from "drizzle-orm";
import { db, systemInstancesTable, webhookEndpointsTable, webhookLogsTable, systemActivityEventsTable, publishedContentTable } from "@workspace/db";
import { getActiveCallerPayload } from "../lib/auth";
import { serialize } from "../lib/serialize";
import { z } from "zod/v4";

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

// ─── ACTION DISPATCHER ────────────────────────────────────────────────────────
// All actions execute directly — no job queue dependency. Returns { status, message }.

async function dispatchWebhookAction(
  endpoint: { id: number; systemInstanceId: number; actionType: string; actionConfig: Record<string, unknown> },
  payload: Record<string, unknown>,
): Promise<{ status: number; message: string }> {
  const { actionType, actionConfig, systemInstanceId } = endpoint;

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
    // Logs an activity event capturing the prompt and payload so users can see
    // the trigger in their activity feed. Full ASH execution requires a live
    // request context and is initiated from the event log by the ASH scheduler.
    if (actionType === "run_ash_task") {
      const prompt = (actionConfig.prompt as string | undefined)
        ?? `Webhook triggered. Payload: ${JSON.stringify(payload).slice(0, 300)}`;
      await db.insert(systemActivityEventsTable).values({
        systemInstanceId,
        eventType: "action",
        description: `ASH task triggered via webhook: ${prompt.slice(0, 120)}`,
        metadata: JSON.stringify({ actionType: "run_ash_task", prompt, webhookPayload: payload, endpointId: endpoint.id }),
      });
      return { status: 202, message: "ASH task queued — check the activity feed" };
    }

    // ── send_email ───────────────────────────────────────────────────────────
    // Logs the email intent as an activity event. The email is dispatched by the
    // email marketing worker polling the activity table.
    if (actionType === "send_email") {
      const to = (actionConfig.to as string | undefined) ?? "user";
      const subject = (actionConfig.subject as string | undefined) ?? "Webhook notification";
      const body = (actionConfig.body as string | undefined)
        ?? `Webhook fired with payload: ${JSON.stringify(payload).slice(0, 500)}`;
      await db.insert(systemActivityEventsTable).values({
        systemInstanceId,
        eventType: "action",
        description: `Email queued to ${to}: "${subject}"`,
        metadata: JSON.stringify({ actionType: "send_email", to, subject, body, webhookPayload: payload, endpointId: endpoint.id }),
      });
      return { status: 202, message: `Email queued to ${to}` };
    }

    // ── publish_content ──────────────────────────────────────────────────────
    // Creates a pending published_content record. The publishing worker picks it
    // up on its next poll and sends it to the configured channel.
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
    // Logs the connector action intent as an activity event with full metadata so
    // the connector execution engine can process it from the feed.
    if (actionType === "connector_action") {
      const connectorId = (actionConfig.connectorId as string | undefined) ?? "unknown";
      const action = (actionConfig.action as string | undefined) ?? "trigger";
      const params = (actionConfig.params as Record<string, unknown> | undefined) ?? {};
      await db.insert(systemActivityEventsTable).values({
        systemInstanceId,
        eventType: "action",
        description: `Connector action triggered via webhook: ${connectorId}.${action}`,
        metadata: JSON.stringify({ actionType: "connector_action", connectorId, action, params, webhookPayload: payload, endpointId: endpoint.id }),
      });
      return { status: 202, message: `Connector action ${connectorId}.${action} dispatched` };
    }

    return { status: 400, message: `Unknown action type: ${actionType}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Dispatch error";
    return { status: 500, message: msg };
  }
}

// ─── PUBLIC RECEIVER ─────────────────────────────────────────────────────────
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

  const { status, message } = await dispatchWebhookAction(
    {
      id: endpoint.id,
      systemInstanceId: endpoint.systemInstanceId,
      actionType: endpoint.actionType,
      actionConfig: endpoint.actionConfig as Record<string, unknown>,
    },
    payload,
  );

  const processingMs = Date.now() - start;

  // Log the incoming request
  await db.insert(webhookLogsTable).values({
    endpointId: endpoint.id,
    payload,
    responseStatus: status,
    responseBody: message,
    processingMs,
    error: status >= 400 ? message : null,
  });

  // Update stats
  await db
    .update(webhookEndpointsTable)
    .set({
      lastFiredAt: new Date(),
      totalFires: endpoint.totalFires + 1,
      updatedAt: new Date(),
    })
    .where(eq(webhookEndpointsTable.id, endpoint.id));

  res.status(status).json({ ok: status < 400, message });
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
