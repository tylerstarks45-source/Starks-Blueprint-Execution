import { Router, type IRouter } from "express";
import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { db, publishedContentTable, systemInstancesTable, userCredentialsTable, systemActivityEventsTable, notificationsTable } from "@workspace/db";
import { requireAuthActive, getActiveCallerPayload, isAdminRole } from "../lib/auth";
import { serialize } from "../lib/serialize";
import { decrypt } from "../lib/crypto";
import { publish, PUBLISHING_CHANNELS } from "../lib/publishing";

const router: IRouter = Router();

// ── Access guard ───────────────────────────────────────────────────────────────

async function checkAccess(instanceId: number, userId: number, role: string): Promise<boolean> {
  if (isAdminRole(role)) return true;
  const [row] = await db
    .select({ id: systemInstancesTable.id })
    .from(systemInstancesTable)
    .where(and(eq(systemInstancesTable.id, instanceId), eq(systemInstancesTable.userId, userId)))
    .limit(1);
  return !!row;
}

// ── GET /api/publishing/channels ──────────────────────────────────────────────

router.get("/publishing/channels", (_req, res): void => {
  res.json(
    Object.entries(PUBLISHING_CHANNELS).map(([id, meta]) => ({ id, ...meta }))
  );
});

// ── GET /api/system-instances/:id/published-content ───────────────────────────

router.get("/system-instances/:id/published-content", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const instanceId = Number(req.params["id"]);
  if (!Number.isInteger(instanceId)) { res.status(400).json({ error: "Invalid id" }); return; }

  if (!(await checkAccess(instanceId, caller.id, caller.role))) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const rows = await db
    .select()
    .from(publishedContentTable)
    .where(eq(publishedContentTable.systemInstanceId, instanceId))
    .orderBy(desc(publishedContentTable.createdAt))
    .limit(100);

  res.json(serialize(rows));
});

// ── POST /api/system-instances/:id/publish ────────────────────────────────────
// Publish content to a channel immediately.

router.post("/system-instances/:id/publish", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const instanceId = Number(req.params["id"]);
  if (!Number.isInteger(instanceId)) { res.status(400).json({ error: "Invalid id" }); return; }

  if (!(await checkAccess(instanceId, caller.id, caller.role))) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const schema = z.object({
    channel: z.string().min(1).max(64),
    contentType: z.string().optional().default("post"),
    title: z.string().max(500).optional(),
    content: z.string().min(1).max(50000),
    imageUrl: z.string().url().optional(),
    listId: z.string().optional(),
    siteUrl: z.string().optional(),
    videoId: z.string().optional(),
    tags: z.array(z.string()).optional(),
    categoryId: z.string().optional(),
    credentialKey: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { channel, contentType, title, content, imageUrl, listId, siteUrl, videoId, tags, categoryId } = parsed.data;

  if (!PUBLISHING_CHANNELS[channel]) {
    res.status(400).json({ error: `Unknown channel: ${channel}. Supported: ${Object.keys(PUBLISHING_CHANNELS).join(", ")}` });
    return;
  }

  // Persist all publish params in metadata so retries are deterministic
  const publishMeta = JSON.stringify({
    ...(imageUrl  ? { imageUrl }  : {}),
    ...(listId    ? { listId }    : {}),
    ...(siteUrl   ? { siteUrl }   : {}),
    ...(videoId   ? { videoId }   : {}),
    ...(tags      ? { tags }      : {}),
    ...(categoryId? { categoryId }: {}),
  });

  // Create a pending record first
  const [record] = await db.insert(publishedContentTable).values({
    systemInstanceId: instanceId,
    channel,
    contentType: contentType ?? "post",
    title: title ?? null,
    content,
    status: "pending",
    credentialKey: parsed.data.credentialKey ?? null,
    metadata: publishMeta,
  }).returning();

  // Load + decrypt user credentials
  const credRows = await db
    .select({ credentialKey: userCredentialsTable.credentialKey, encryptedValue: userCredentialsTable.encryptedValue })
    .from(userCredentialsTable)
    .where(eq(userCredentialsTable.userId, caller.id));

  const creds: Record<string, string> = {};
  for (const row of credRows) {
    if (row.encryptedValue) {
      try { creds[row.credentialKey] = await decrypt(row.encryptedValue); } catch { /* skip */ }
    }
  }

  // Attempt publish
  const result = await publish(channel, creds, { channel, contentType: contentType ?? "post", title, content, imageUrl, listId, siteUrl, videoId, tags, categoryId });

  // Update record with result
  const now = new Date();
  const [updated] = await db.update(publishedContentTable)
    .set(
      result.ok
        ? { status: "published", publishedUrl: result.publishedUrl ?? null, publishedAt: now, metadata: JSON.stringify({ ...JSON.parse(publishMeta || "{}"), ...(result.data ?? {}) }) }
        : { status: "failed", errorMessage: result.error ?? "Unknown error" }
    )
    .where(eq(publishedContentTable.id, record.id))
    .returning();

  // Log to activity feed
  await db.insert(systemActivityEventsTable).values({
    systemInstanceId: instanceId,
    eventType: result.ok ? "action" : "error",
    description: result.ok
      ? `Published to ${PUBLISHING_CHANNELS[channel]?.displayName ?? channel}: ${title ?? content.slice(0, 80)}${result.publishedUrl ? ` — ${result.publishedUrl}` : ""}`
      : `Publish to ${PUBLISHING_CHANNELS[channel]?.displayName ?? channel} failed: ${(result.error ?? "").slice(0, 200)}`,
    metadata: JSON.stringify({ channel, contentId: record.id, ok: result.ok, publishedUrl: result.publishedUrl }),
  }).catch(() => {});

  res.status(result.ok ? 201 : 422).json(serialize(updated));
});

// ── POST /api/system-instances/:id/published-content/:contentId/retry ─────────

router.post("/system-instances/:id/published-content/:contentId/retry", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const instanceId = Number(req.params["id"]);
  const contentId = Number(req.params["contentId"]);
  if (!Number.isInteger(instanceId) || !Number.isInteger(contentId)) {
    res.status(400).json({ error: "Invalid id" }); return;
  }

  if (!(await checkAccess(instanceId, caller.id, caller.role))) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const [existing] = await db
    .select()
    .from(publishedContentTable)
    .where(and(
      eq(publishedContentTable.id, contentId),
      eq(publishedContentTable.systemInstanceId, instanceId),
    ))
    .limit(1);

  if (!existing) { res.status(404).json({ error: "Content record not found" }); return; }
  if (existing.status === "published") { res.status(400).json({ error: "Content was already published successfully" }); return; }
  if (existing.retryCount >= 3) { res.status(400).json({ error: "Maximum retry attempts (3) reached" }); return; }

  // Load creds and retry
  const credRows = await db
    .select({ credentialKey: userCredentialsTable.credentialKey, encryptedValue: userCredentialsTable.encryptedValue })
    .from(userCredentialsTable)
    .where(eq(userCredentialsTable.userId, caller.id));

  const creds: Record<string, string> = {};
  for (const row of credRows) {
    if (row.encryptedValue) {
      try { creds[row.credentialKey] = await decrypt(row.encryptedValue); } catch { /* skip */ }
    }
  }

  let metadata: Record<string, unknown> = {};
  try { metadata = existing.metadata ? JSON.parse(existing.metadata) : {}; } catch { /* ignore */ }

  const result = await publish(existing.channel, creds, {
    channel: existing.channel,
    contentType: existing.contentType,
    title: existing.title ?? undefined,
    content: existing.content,
    imageUrl: (metadata["imageUrl"] as string | undefined),
    listId: (metadata["listId"] as string | undefined),
    siteUrl: (metadata["siteUrl"] as string | undefined),
  });

  const now = new Date();
  const [updated] = await db.update(publishedContentTable)
    .set(
      result.ok
        ? { status: "published", publishedUrl: result.publishedUrl ?? null, publishedAt: now, errorMessage: null }
        : { status: "failed", errorMessage: result.error ?? "Unknown error", retryCount: (existing.retryCount ?? 0) + 1 }
    )
    .where(eq(publishedContentTable.id, contentId))
    .returning();

  // Notify user if second retry also failed
  if (!result.ok && (existing.retryCount ?? 0) >= 1) {
    await db.insert(notificationsTable).values({
      userId: caller.id,
      notificationType: "error",
      title: "Content publish failed",
      message: `Publishing to ${PUBLISHING_CHANNELS[existing.channel]?.displayName ?? existing.channel} failed after ${(existing.retryCount ?? 0) + 1} attempts: ${(result.error ?? "").slice(0, 200)}`,
    }).catch(() => {});
  }

  res.json(serialize(updated));
});

// ── DELETE /api/system-instances/:id/published-content/:contentId ─────────────

router.delete("/system-instances/:id/published-content/:contentId", async (req, res): Promise<void> => {
  const caller = await getActiveCallerPayload(req, res);
  if (!caller) return;
  const instanceId = Number(req.params["id"]);
  const contentId = Number(req.params["contentId"]);
  if (!Number.isInteger(instanceId) || !Number.isInteger(contentId)) {
    res.status(400).json({ error: "Invalid id" }); return;
  }

  if (!(await checkAccess(instanceId, caller.id, caller.role))) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  await db.delete(publishedContentTable)
    .where(and(
      eq(publishedContentTable.id, contentId),
      eq(publishedContentTable.systemInstanceId, instanceId),
    ));

  res.status(204).end();
});

export default router;
